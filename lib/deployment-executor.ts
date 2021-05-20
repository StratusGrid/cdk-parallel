import { DeploymentType } from "./deployment-type";
import { cprint } from "./color-print";
import { PrintColors } from "./print-colors";
import { StackDependencies } from "./stack-dependencies";
import { DeployCommand } from "./deploy-command";

export class DeploymentExecutor {
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: { [key: string]: string | undefined }
    private readonly maxParallelDeployments: number

    constructor(type: DeploymentType, path?: string, environment?: { [key: string]: string | undefined }, maxParallelDeployments: number = 100) {
        this.type = type;
        this.path = path;
        this.environment = environment;
        this.maxParallelDeployments = maxParallelDeployments;
    }

    public run(stackDependencyGraph?: { [key: string]: string[] }): void {
        if (stackDependencyGraph !== undefined && Object.keys(stackDependencyGraph).length) {
            cprint(PrintColors.FG_BLUE, 'No more stacks to deploy. Exiting...');
            return;
        }

        const sdg = stackDependencyGraph === undefined ? StackDependencies.generateGraph(this.path, this.environment) : stackDependencyGraph;
        cprint(PrintColors.FG_BLUE, `Stack dependency graph:\n${JSON.stringify(stackDependencyGraph, null, 4)}.`);

        const deployableStacks: string[] = [];
        Object.keys(sdg).forEach(stack => {
            const dependency = sdg[stack];
            if (dependency.length === 0) {
                cprint(PrintColors.FG_BLUE, `Stack ${stack} has no dependencies, deploying...`)
                deployableStacks.push(stack);
                (new DeployCommand(stack, this.type, this.path, this.environment)).execute()
            }
        })

        deployableStacks.forEach(stack => {
            cprint(PrintColors.FG_BLUE, `Removing stack ${stack} from the graph as it was successfully deployed...`)
            StackDependencies.removeDependency(stack, stackDependencyGraph ?? {})
        });

        this.run(stackDependencyGraph);
    }
}