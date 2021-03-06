import { spawn } from "child_process";

import { DeploymentType } from "./types/deployment-type";
import { cprint } from "./color-print";
import { PrintColors } from "./types/print-colors";
import { EnvironmentDeclaration } from "./types/environment-declaration";

export interface CdkCommandProps {
    stack: string
    type: DeploymentType
    verboseMode: boolean
    path?: string
    environment?: EnvironmentDeclaration
    deployOpts?: DeployOptions
}

export interface DeployOptions {
    outputsFile?: string
}

export class CdkCommand {
    private readonly stack: string
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: EnvironmentDeclaration
    private readonly verboseMode: boolean
    private readonly deployOpts?: DeployOptions

    constructor(props: CdkCommandProps) {
        this.stack = props.stack;
        this.type = props.type;
        this.path = props.path;
        this.environment = props.environment;
        this.verboseMode = props.verboseMode;
        this.deployOpts = props.deployOpts;
    }

    /**
     * Executes the CDK deployment command.
     *
     * @return void
     */
    public execute(): Promise<void> {
        const appStack = `--app 'cdk.out/' ${this.stack}`;

        const commands: string[] = [];
        if (this.type === DeploymentType.DEPLOY) {
            commands.push(`deploy ${appStack}`);

            if (this.deployOpts?.outputsFile !== undefined) {
                commands.push(`--outputs-file ${this.deployOpts.outputsFile}`)
            }
        } else if (this.type === DeploymentType.DESTROY) {
            commands.push(`destroy ${appStack}`);
        } else {
            throw new Error("Invalid enum value.");
        }

        if (this.verboseMode) {
            commands.push(`-v`);
        }

        commands.push(`--output=./cdk_stacks/${this.stack}`, `--progress events --require-approval never --ci`)

        cprint(PrintColors.FG_BLUE, `Executing command: cdk ${commands.join(' ')}.`);

        const child = spawn('cdk', commands, {
            cwd: this.path,
            shell: 'bash',
            env: this.environment
        });

        var stdout = ""
        var stderr = ""

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        }
        );

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        }
        );

        return new Promise(((resolve, reject) => {
            child.on('error', (error) => {
                reject(error);
                console.log(stdout);
                console.error(stderr);
            });
            child.on('close', (code) => {
                console.log(stdout);
                console.error(stderr);
                if (code === 0) {
                    resolve()
                } else {
                    const err = new Error(`child exited with code ${code}`);
                    reject(err)
                }
            })
        }));
    }
}