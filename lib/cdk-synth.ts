import {exec, ExecException} from "child_process";

export class CdkSynth {

    /**
     * Synthesizes AWS CDK application and produces cdk.out directory.
     *
     * @param path
     * @param environment
     *
     * @return void
     */
    public static async execute(path?: string, environment?: { [key: string]: string | undefined }): Promise<string> {
        return new Promise((resolve, reject) => {
            exec("cdk synth \"*\"", {
                cwd: path,
                env: environment
            }, (error: ExecException | null, stdout: string, stderr: string) => {
                if (error) {
                    reject(error);
                }
                resolve(stdout);
            });
        });
    }
}