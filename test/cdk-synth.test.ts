import { CdkSynth } from "../lib/cdk-synth";
import * as cp from 'child_process';

describe(`Execute CDK synth`, () => {

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test(`error returned from exec process`, async () => {
        let execCallback: (error: cp.ExecException | null, stdout: string, stderr: string) => void;
        // @ts-ignore
        jest.spyOn(cp, 'exec')
            .mockImplementation(function(
                this: cp.ChildProcess,
                command: string,
                options: any,
                callback?: (error: cp.ExecException | null, stdout: string, stderr: string) => void
            ): cp.ChildProcess {
                if (callback) {
                    execCallback = callback;
                }
                return this;
            });

        const actual = CdkSynth.execute();
        execCallback!(new Error('some error happened'), '', '');

        await expect(actual).rejects.toThrowError('some error happened');
        expect(cp.exec).toBeCalledWith("cdk synth \"*\"", {"cwd": undefined, "env": undefined}, execCallback!);
    });

    test(`exec process returns correctly`, async () => {
        let execCallback: (error: cp.ExecException | null, stdout: string, stderr: string) => void;
        // @ts-ignore
        jest.spyOn(cp, 'exec')
            .mockImplementation(function(
                this: cp.ChildProcess,
                command: string,
                options: any,
                callback?: (error: cp.ExecException | null, stdout: string, stderr: string) => void
            ): cp.ChildProcess {
                if (callback) {
                    execCallback = callback;
                }
                return this;
            });

        const actual = CdkSynth.execute();
        execCallback!(null, 'statement', '');

        await expect(actual).resolves.toBe('statement');
        expect(cp.exec).toBeCalledWith("cdk synth \"*\"", {"cwd": undefined, "env": undefined}, execCallback!);
    });

});

