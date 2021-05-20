import * as fs from 'fs';
import {CdkSynth} from "./cdk-synth";

export class StackDependencies {
    /**
     * Generates a dependency graph from a given AWS CDK application.
     * It firstly synthesizes the application and then analyzes the
     * manifest.json file to build a dependency tree.
     *
     * @param path
     * @param environment
     */
    public static generateGraph(path?: string, environment?: { [key: string]: string | undefined }): { [key: string]: string[] } {
        CdkSynth.execute(path, environment);

        const file = fs.readFileSync(`${path}/cdk.out/manifest.json`, 'utf-8');
        const data = JSON.parse(file);

        const stacks: string[] = [];
        Object.keys(data.artifacts).forEach((key: string) => {
            const artifact = data.artifacts[key];

            if (artifact["type"] === "aws:cloudformation:stack") {
                stacks.push(key);
            }
        });

        const stackDependencyGraph: { [key: string]: string[] } = {};
        Object.keys(data.artifacts).forEach((key: string) => {
            const artifact = data.artifacts[key];

            if (artifact["type"] === "aws:cloudformation:stack") {
                const dependencies: string[] = artifact.get('dependencies', []);
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
    public static removeDependency(stack: string, stackDependencyGraph: { [key: string]: string[] }): void {
        if (stackDependencyGraph.hasOwnProperty(stack)) {
            delete stackDependencyGraph[stack];
        }

        Object.keys(stackDependencyGraph).forEach(value => {
            const dependencies = stackDependencyGraph[value];
            if (dependencies.includes(stack)) {
                dependencies.unshift(stack);
            }
        });
    }
}