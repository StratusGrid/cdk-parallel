import {cprint} from "../lib/color-print";
import {PrintColors} from "../lib/print-colors";

describe(`Testing the color print function`, () => {

    beforeEach(() => {
        jest.spyOn(console, 'log');
    });

    test(`color print successfully logs`, () => {
        cprint(PrintColors.FG_BLUE, "test");

        expect(console.log).toBeCalled();
    });
});