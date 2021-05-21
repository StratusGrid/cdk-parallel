import { spawn } from "child_process";

import { DeploymentType } from "./deployment-type";
import { cprint } from "./color-print";
import { PrintColors } from "./print-colors";

export class DeployCommand {
    private readonly stack: string
    private readonly type: DeploymentType
    private readonly path?: string
    private readonly environment?: { [key: string]: string | undefined }

    constructor(stack: string, type: DeploymentType, path?: string, environment?: { [key: string]: string | undefined }) {
        this.stack = stack;
        this.type = type;
        this.path = path;
        this.environment = environment;
    }

    /**
     * Executes the CDK deployment command.
     *
     * @return void
     */
    public execute(): void {
        const appStack = `--app "cdk.out/" "${this.stack}"`;

        let command: string = "";
        if (this.type === DeploymentType.DEPLOY) {
            command = `cdk deploy ${appStack}`;
        } else if (this.type === DeploymentType.DESTROY) {
            command = `cdk destroy ${appStack}`;
        } else {
            throw new Error("Invalid enum value.");
        }

        command += ` --output=./cdk_stacks/${this.stack}`;
        command += ` --progress events --require-approval never`;

        cprint(PrintColors.FG_BLUE, `Executing command: ${command}.`);

        const child = spawn(command);

        process.stdin.pipe(child.stdin)

        child.stdout.on('data', (data) => {
            console.log(`child stdout:\n${data}`);
        });
    }
}