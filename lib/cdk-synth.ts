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
    public static execute(path?: string, environment?: { [key: string]: string | undefined }): void {
        exec("cdk synth *", {
            cwd: path,
            env: environment
        });
    }
}