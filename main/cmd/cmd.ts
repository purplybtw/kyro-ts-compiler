import path from "path";
import fs from "fs";
import { renderFileInput } from "../../util/errors";
import config from "../config/config";
import KyroCompiler from "../init";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: kyro <file> [--out <output>]");
    process.exit(1);
}

const file = args[0];
let outputPath: undefined | string;
let logProcess: boolean = false;;

for (let i = 1; i < args.length; i++) {
    if (args[i] === "--out" && args[i + 1]) {
        outputPath = args[i + 1];
        i++;
    }

    if(args[i] === "--log") logProcess = true;
}

const cwd = process.cwd();
const inputPath = path.resolve(cwd, file);

if (!inputPath) {
    console.error("Invalid input path");
    process.exit(1);
}

const outPath = path.resolve(
    outputPath ? outputPath : path.dirname(inputPath)
);

if (!inputPath.endsWith("." + config.file_ext)) {
    console.error("Input file must have the " + config.file_ext + " extension.");
    process.exit(1);
}

if (!fs.existsSync(inputPath)) {
    console.error("Input file does not exist");
    process.exit(1);
}

const outFile = path.basename(outPath);
const outIsDir = outFile.lastIndexOf(".") <= 0;

if (!outIsDir && !outFile.endsWith("." + config.c_file_ext)) {
    console.error("Output file must have the " + config.c_file_ext + " extension.");
    process.exit(1);
}

const ensureDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
        console.log("Created output directory:", dir);
        fs.mkdirSync(dir, { recursive: true });
    }
};

if (outIsDir) {
    ensureDir(outPath);
} else {
    ensureDir(path.dirname(outPath));
}

const baseName = path.basename(inputPath, "." + config.file_ext);
const finalOut = outIsDir
    ? path.join(outPath, baseName + "." + config.c_file_ext)
    : outPath;

const kyro = new KyroCompiler(
    renderFileInput(inputPath),
    renderFileInput(finalOut),
    "process",
    null
);

kyro.run(true);
