import {DeploymentType} from "./types/deployment-type";
import {cprint} from "./color-print";
import {PrintColors} from "./types/print-colors";
import {StackDependencies} from "./stack-dependencies";
import {CdkCommand} from "./cdk-command";
import { EnvironmentDeclaration } from "./types/environment-declaration";
import { DependencyGraph } from "./types/dependency-graph";

/** Manages parallel cdk deployments. The cdk-toolkit cli must be installed on the host machine. */
export class DeploymentExecutor {
    /** Whether or not the executor is currently managing active deployments. */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: EnvironmentDeclaration

    private readonly maxParallelDeployments: number
    private readonly verboseMode: boolean

    private _isRunning = false;

    /**
     * @param type The type of the deployment
     * @param path The path to the cdk project root, defaults to CWD
     * @param environment Map of environment variables that will be exposed to the cdk app
     * @param maxParallelDeployments The maximum number of simultaneous deployments
     * @param verboseMode Enbles verbose logging
     */
    constructor(
        type: DeploymentType,
        path?: string,
        environment?: EnvironmentDeclaration,
        maxParallelDeployments: number = 100,
        verboseMode: boolean = false,
    ) {
        this.type = type;
        this.path = path;
        this.environment = environment;
        this.maxParallelDeployments = maxParallelDeployments;
        this.verboseMode = verboseMode;
    }

    /**
     * Executes cdk deployments in parallel.
     *
     * If any deployment fails, current deployments will run to completion or
     * error, but no new deployments will start.
     *
     * NOTE: It is an error to call this method while this DeploymentExecutor is
     * currently running. If the state of the executor is uncertain, check the
     * `isRunning` member
     *
     * @param stackDependencyGraph Optional graph of specific stacks to deploy
     *   and their dependencies, defaults to all stacks in the app
     *
     * @returns A promise that resolves when all deployments successfully finish
     * or is rejected when any deployment fails and ongoing deployments remain
     */
    public async run(stackDependencyGraph?: DependencyGraph): Promise<void> {
        if (this.isRunning) throw new Error('Deployment(s) already in progress.');
        this._isRunning = true;
        const sdg = stackDependencyGraph ?? await this.makeFullDependencyGraph();
        const deploymentsMap: Map<string, Promise<string>> = new Map();
        const deployedStacks: string[] = [];

        cprint(PrintColors.FG_BLUE, `Stack dependency graph:\n${JSON.stringify(sdg, null, 4)}.`);

        try {
            while (Object.keys(sdg).length) {
                const deployableStacks = StackDependencies.getDeployableStacks(sdg, {
                    maxStacks: Math.max(this.maxParallelDeployments - deploymentsMap.size, 0),
                });

                deployableStacks.forEach((stack) => {
                    if (!deploymentsMap.has(stack)) {
                        deploymentsMap.set(stack, this.deployStack(stack).catch((reason) => {
                            console.error(reason);
                            throw new Error(`Failed to deploy stack: ${stack}`);
                        }));
                    }
                });

                const deployedStack = await Promise.race(deploymentsMap.values());

                cprint(PrintColors.FG_BLUE, `Removing stack ${deployedStack} from the graph as it was successfully deployed...`);
                StackDependencies.removeDependency(deployedStack, sdg);
                deploymentsMap.delete(deployedStack);
                deployedStacks.push(deployedStack);
            }

            cprint(PrintColors.FG_BLUE, 'No more stacks to deploy. Exiting...');
        } catch (error) {
            console.error(error);
            console.log('Error encountered. Allowing in-progress deployments to continue, but preventing further deployments.');
            await Promise.all([ ...deploymentsMap.values() ].map((deployment) => deployment.catch(console.error)));
            throw new Error('One or more stacks failed to deploy.');
        } finally {
            this._isRunning = false;
        }
    }

    private async makeFullDependencyGraph(): Promise<DependencyGraph> {
        return StackDependencies.generateGraph(this.path, this.environment);
    }

    private readonly deployStack = (stack: string): Promise<string> => {
        cprint(PrintColors.FG_BLUE, `Stack ${stack} has no dependencies, deploying...`);

        const command = new CdkCommand({
            stack,
            type: this.type,
            path: this.path,
            environment: this.environment,
            verboseMode: this.verboseMode,
            deployOpts: {
                outputsFile: (this.type === DeploymentType.DEPLOY)
                    ? `./cdk-outputs.json`
                    : undefined,
            },
        });

        return command.execute().then(() => stack);
    };
}
