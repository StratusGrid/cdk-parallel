import * as fs from 'fs';
import {CdkSynth} from "./cdk-synth";
import { DependencyGraph } from './types/dependency-graph';
import { EnvironmentDeclaration } from './types/environment-declaration';

export class StackDependencies {
    /**
     * Generates a dependency graph from a given AWS CDK application.
     * It firstly synthesizes the application and then analyzes the
     * manifest.json file to build a dependency tree.
     *
     * @param path
     * @param environment
     */
    public static async generateGraph(
        path?: string,
        environment?: EnvironmentDeclaration,
    ): Promise<DependencyGraph> {
        await CdkSynth.execute(path, environment);

        const file = fs.readFileSync(`${path}/cdk.out/manifest.json`, 'utf-8');
        const data = JSON.parse(file);

        const stacks: string[] = [];
        Object.keys(data.artifacts).forEach((key: string) => {
            const artifact = data.artifacts[key];

            if (artifact["type"] === "aws:cloudformation:stack") {
                stacks.push(key);
            }
        });

        const stackDependencyGraph: DependencyGraph = {};
        Object.keys(data.artifacts).forEach((key: string) => {
            const artifact = data.artifacts[key];

            if (artifact["type"] === "aws:cloudformation:stack") {
                const dependencies: string[] = artifact["dependencies"] ?? [];
                stackDependencyGraph[key] = dependencies.filter((d: string) => stacks.includes(d));
            }
        });

        return stackDependencyGraph;
    }

    /**
     * Removes a given stack from the dependency graph. This function does not
     * return anything. It rather has a "side effect" that modifies the
     * supplied stack dependency graph.
     *
     * @param stack
     * @param stackDependencyGraph
     */
    public static removeDependency(
        stack: string,
        stackDependencyGraph: DependencyGraph,
    ): void {
        if (stackDependencyGraph.hasOwnProperty(stack)) {
            delete stackDependencyGraph[stack];
        }

        Object.keys(stackDependencyGraph).forEach(value => {
            const dependencies = stackDependencyGraph[value];
            if (dependencies.includes(stack)) {
                stackDependencyGraph[value] = dependencies.filter((value1 => {
                    return value1 !== stack;
                }));
            }
        });
    }

    public static getDeployableStacks(
        stackDependencyGraph: DependencyGraph,
        options: { maxStacks: number },
    ): string[] {
        return Object.keys(stackDependencyGraph)
            .filter((stack) => !stackDependencyGraph[stack].length) // deployable stacks have no dependencies
            .splice(0, options.maxStacks); // return no more that maxStacks
    }
}