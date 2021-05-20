import { PrintColors } from "./print-colors";

export function cprint(color: PrintColors, message: string): void {
    console.log(`${color}${message}\x1b[0m`);
}