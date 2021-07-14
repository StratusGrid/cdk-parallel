import {DeploymentType} from "./deployment-type";
import {cprint} from "./color-print";
import {PrintColors} from "./print-colors";
import {StackDependencies} from "./stack-dependencies";
import {CdkCommand} from "./cdk-command";

export class DeploymentExecutor {
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: { [key: string]: string | undefined }

    private readonly maxParallelDeployments: number
    private readonly verboseMode: boolean

    constructor(type: DeploymentType, path?: string, environment?: { [key: string]: string | undefined }, maxParallelDeployments: number = 100, verboseMode: boolean = false) {
        this.type = type;
        this.path = path;
        this.environment = environment;
        this.maxParallelDeployments = maxParallelDeployments;
        this.verboseMode = verboseMode;
    }

    public async run(stackDependencyGraph?: { [key: string]: string[] }) {
        if (stackDependencyGraph !== undefined && Object.keys(stackDependencyGraph).length === 0) {
            cprint(PrintColors.FG_BLUE, 'No more stacks to deploy. Exiting...');
            return;
        }

        const sdg = stackDependencyGraph === undefined ? await StackDependencies.generateGraph(this.path, this.environment) : stackDependencyGraph;
        cprint(PrintColors.FG_BLUE, `Stack dependency graph:\n${JSON.stringify(stackDependencyGraph, null, 4)}.`);

        let children: number = 0;
        const deployableStacks: string[] = [];
        Object.keys(sdg).forEach(stack => {
            const dependency = sdg[stack];
            if (dependency.length === 0) {
                cprint(PrintColors.FG_BLUE, `Stack ${stack} has no dependencies, deploying...`);
                deployableStacks.push(stack);
                children++;

                const child = new CdkCommand({
                    stack: stack,
                    type: this.type,
                    path: this.path,
                    environment: this.environment,
                    verboseMode: this.verboseMode,
                    deployOpts: this.type === DeploymentType.DEPLOY ? {
                        outputsFile: `./cdk-outputs/${stack}`
                    } : undefined
                });
                child.execute()
                    .then(async () => {
                        children--;
                        if (children <= 0) {
                            deployableStacks.forEach(dStack => {
                                cprint(PrintColors.FG_BLUE, `Removing stack ${dStack} from the graph as it was successfully deployed...`);
                                StackDependencies.removeDependency(dStack, sdg ?? {});
                            });

                            await this.run(sdg);
                        }
                    })
                    .catch((e) => {
                        throw e;
                    });
            }
        });
    }
}