import util from "util";

export default class Logger {
    public static log(...args: any[]) {
        for (const arg of args) {
            if (typeof arg === "object") {
                console.log(util.inspect(arg, { depth: null, colors: true }));
            } else {
                console.log(arg);
            }
        }
    }

    public static error(...args: any[]) {
        for (const arg of args) {
            if (typeof arg === "object") {
                console.error(util.inspect(arg, { depth: null, colors: true }));
            } else {
                console.error(arg);
            }
        }
    }
}