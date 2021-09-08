import {DeploymentType} from "./deployment-type";
import {cprint} from "./color-print";
import {PrintColors} from "./print-colors";
import {StackDependencies} from "./stack-dependencies";
import {CdkCommand} from "./cdk-command";
import { EnvironmentDeclaration } from "./types/environment-declaration";
import { DependencyGraph } from "./types/dependency-graph";

export class DeploymentExecutor {
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: EnvironmentDeclaration

    private readonly maxParallelDeployments: number
    private readonly verboseMode: boolean

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
        if (stackDependencyGraph !== undefined && Object.keys(stackDependencyGraph).length === 0) {
            cprint(PrintColors.FG_BLUE, 'No more stacks to deploy. Exiting...');
            return;
        }

        const sdg = (stackDependencyGraph === undefined)
            ? await StackDependencies.generateGraph(this.path, this.environment)
            : stackDependencyGraph;
        cprint(PrintColors.FG_BLUE, `Stack dependency graph:\n${JSON.stringify(stackDependencyGraph, null, 4)}.`);

        let childCount: number = 0;
        const deployableStacks: string[] = [];
        const childPromises = Object.keys(sdg).map((stack): Promise<void> => {
            const dependency = sdg[stack];

            if (dependency.length === 0) {
                cprint(PrintColors.FG_BLUE, `Stack ${stack} has no dependencies, deploying...`);
                deployableStacks.push(stack);
                childCount++;

                const child = new CdkCommand({
                    stack: stack,
                    type: this.type,
                    path: this.path,
                    environment: this.environment,
                    verboseMode: this.verboseMode,
                    deployOpts: (this.type === DeploymentType.DEPLOY)
                        ? {
                            outputsFile: `./cdk-outputs.json`
                        }
                        : undefined,
                });

                return child.execute()
                    .then(async () => {
                        childCount--;
                        if (childCount <= 0) {
                            deployableStacks.forEach(dStack => {
                                cprint(PrintColors.FG_BLUE, `Removing stack ${dStack} from the graph as it was successfully deployed...`);
                                StackDependencies.removeDependency(dStack, sdg ?? {});
                            });

                            await this.run(sdg);
                        }
                    });
            } else {
                return Promise.resolve();
            }
        });

        await Promise.all(childPromises);
    }
}