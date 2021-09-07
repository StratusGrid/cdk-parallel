import {spawn} from "child_process";

import {DeploymentType} from "./deployment-type";
import {cprint} from "./color-print";
import {PrintColors} from "./print-colors";

export interface CdkCommandProps {
    stack: string
    type: DeploymentType
    verboseMode: boolean
    path?: string
    environment?: { [key: string]: string | undefined }
    deployOpts?: DeployOptions
}

export interface DeployOptions {
    outputsFile?: string
}

export class CdkCommand {
    private readonly stack: string
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: { [key: string]: string | undefined }
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

        commands.push(`--output=./cdk_stacks/${this.stack}`, `--progress events --require-approval never`)

        cprint(PrintColors.FG_BLUE, `Executing command: cdk ${commands.join(' ')}.`);

        const child = spawn('cdk', commands, {
            cwd: this.path,
            shell: 'bash',
            env: this.environment
        });

        process.stdin.pipe(child.stdin);
        child.stdout.pipe(process.stdout);
        child.stderr.pipe(process.stderr);

        child.stdout.on('data', (data) => {
            console.log(`child stdout:\n${data}`);
        });

        return new Promise(((resolve, reject) => {
            child.on('error', reject)

            child.on('close', code => {
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