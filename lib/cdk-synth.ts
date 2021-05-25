import { exec } from "child_process";

export class CdkSynth {

    /**
     * Synthesizes AWS CDK application and produces cdk.out directory.
     *
     * @param path
     * @param environment
     *
     * @return void
     */
    public static async execute(path?: string, environment?: { [key: string]: string | undefined }) {
        await new Promise(((resolve, reject) => {
            exec("cdk synth \"*\"", {
                cwd: path,
                env: environment
            }, ((error, stdout, stderr) => {
                if (error) {
                    reject(error);
                }
                resolve(stdout);
            }));
        }));
    }
}