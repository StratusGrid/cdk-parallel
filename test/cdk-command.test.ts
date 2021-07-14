import * as cp from "child_process";
import {CdkCommand} from "../lib/cdk-command";
import {DeploymentType} from "../lib";

describe(`Testing deploy command class`, () => {
    beforeEach(() => {
        jest.spyOn(process.stdin, 'pipe');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test(``, () => {
        // @ts-ignore
        const thing = jest.spyOn(cp, 'spawn')
            .mockImplementation(function (
                this: cp.ChildProcess,
                command: string,
                args?: readonly string[],
                options?: cp.SpawnOptions
            ): cp.ChildProcess {
                return this;
            });

        const actual = new CdkCommand({
            stack: "test-stack",
            type: DeploymentType.DEPLOY,
            verboseMode: false
        });
        actual.execute();

        /*expect(cp.spawn).toBeCalledWith("cdk", [
            "deploy --app 'cdk.out/' test-stack",
            "--output=./cdk_stacks/test-stack",
            "--progress events --require-approval never"
        ]);*/
    });
});