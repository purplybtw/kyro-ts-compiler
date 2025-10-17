#!/usr/bin/env node
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tsCliPath = path.join(__dirname, "cmd.ts");

// Determine the correct local tsx binary for the platform
const tsxBase = path.resolve(__dirname, "../../node_modules/.bin");
const tsxBin = path.join(tsxBase, process.platform === "win32" ? "tsx.cmd" : "tsx");

const args = [tsCliPath, ...process.argv.slice(2)];

// Ensure executable exists
const spawnTarget = fs.existsSync(tsxBin)
  ? tsxBin
  : (process.platform === "win32" ? "tsx.cmd" : "tsx"); // fallback if user has global install

  const child = spawn(spawnTarget, args, {
    stdio: "inherit",
    shell: process.platform === "win32"
  });
  
  child.on("close", (code) => {
    process.exit(code ?? 0);
  });

child.on("close", (code) => {
  process.exit(code ?? 0);
});