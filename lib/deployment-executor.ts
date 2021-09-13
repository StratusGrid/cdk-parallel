import {DeploymentType} from "./types/deployment-type";
import {cprint} from "./color-print";
import {PrintColors} from "./types/print-colors";
import {StackDependencies} from "./stack-dependencies";
import {CdkCommand} from "./cdk-command";
import { EnvironmentDeclaration } from "./types/environment-declaration";
import { DependencyGraph } from "./types/dependency-graph";

export class DeploymentExecutor {
    public get isRunning(): boolean {
        return this._isRunning;
    }

    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: EnvironmentDeclaration

    private readonly maxParallelDeployments: number
    private readonly verboseMode: boolean

    private _isRunning = false;

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

    public async run(stackDependencyGraph?: DependencyGraph): Promise<void> {
        if (this.isRunning) throw new Error('Deployment(s) already in progress.');
        this._isRunning = true;
        const sdg = stackDependencyGraph ?? await this.makeFullDependencyGraph();
        const deployments: Promise<DeploymentData>[] = [];
        const deployedStacks: string[] = [];

        cprint(PrintColors.FG_BLUE, `Stack dependency graph:\n${JSON.stringify(sdg, null, 4)}.`);

        try {
            while (Object.keys(sdg).length) {
                const deployableStacks = StackDependencies.getDeployableStacks(sdg, {
                    maxStacks: Math.max(this.maxParallelDeployments - deployments.length, 0),
                });

                deployments.push(...deployableStacks.map((stack) => this.deployStack(stack).catch((reason) => {
                    console.error(reason);
                    throw new Error(`Failed to deploy stack: ${stack}`);
                })));

                const {
                    deployment: resolvedDeployment,
                    stack: deployedStack,
                } = await Promise.race(deployments);

                cprint(PrintColors.FG_BLUE, `Removing stack ${deployedStack} from the graph as it was successfully deployed...`);
                StackDependencies.removeDependency(deployedStack, sdg);
                deployments.splice(deployments.indexOf(resolvedDeployment), 1);
                deployedStacks.push(deployedStack);
            }

            cprint(PrintColors.FG_BLUE, 'No more stacks to deploy. Exiting...');
        } catch (error) {
            console.log('Error encountered. Allowing in-progress deployments to continue, but preventing further deployments.');
            await Promise.all(deployments.map((deployment) => deployment.catch(console.error)));
            throw new Error('One or more stacks failed to deploy.');
        } finally {
            this._isRunning = false;
        }
    }

    private async makeFullDependencyGraph(): Promise<DependencyGraph> {
        return StackDependencies.generateGraph(this.path, this.environment);
    }

    private readonly deployStack = (stack: string): Promise<DeploymentData> => {
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

        const deployment: Promise<DeploymentData> = command.execute()
            .then(() => ({
                deployment,
                stack,
            }));

        return deployment;
    };
}

interface DeploymentData {
    deployment: Promise<DeploymentData>,
    stack: string,
}
