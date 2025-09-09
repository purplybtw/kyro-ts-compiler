import { SourceLocation } from "../ast/nodes";
import { FileInput } from "./errors";
import { getFileContent } from "./any";
import chalk from "chalk";

const CONTEXT_LINES = 2;
const MAX_WARNING_LINE_LENGTH = 120;

export const warningNames = [
  "UnusedExpression", // a; 5 + 5;
  "UnusedDeclaration", // let x = 5; and x remains unused
  "UnusedParameters", // func x(a: int, b: int) return a; and b remains unused
  "UnreachableCode", // if(true) { return 5; } return 10; the second return is unreachable
  "UnusedImport", // import x from "./x"; and x remains unused
] as const;

type WarningName = (typeof warningNames)[number];
type WarningType = "warning" | "info"

export interface Warning {
  name: WarningName,
  type: WarningType,
  message: string,
  source: SourceLocation,
  file: FileInput
}

export class BaseWarning {
  public readonly name: WarningName;

  constructor(name: string) {
    this.name = name as WarningName;
  }

  public throw (type: WarningType, message: string, source: SourceLocation, file: FileInput) {
    this.notifyListeners({
      name: this.name,
      type,
      message,
      source,
      file
    });

    return this;
  }

  private listeners: ListenerCallback[] = [];

  public addListener(listener: ListenerCallback) {
    this.listeners.push(listener);
  }

  protected notifyListeners(err: Warning) {
    for (let listener of this.listeners) {
      listener(err, this);
    }
  }
}

type LocalWarningsSetup = Record<string, BaseWarning>;
export type ListenerCallback = (warning: Warning, warningClass: BaseWarning) => void;
export type LocalWarnings = Record<WarningName, BaseWarning>;

export function addListenerToAll(localWarnings: LocalWarnings, listener: ListenerCallback) {
  let v = Object.values(localWarnings);

  for(let i = 0; i < v.length; i++) {
    v[i].addListener(listener);
  }
}

export function getWarningLog(warning: Warning): string {
  const lines = getFileContent(warning.file.path).split('\n');
  const warningLine = warning.source.line - 1;
  const warningCol = warning.source.col - 1;
  
  // Get context lines around the warning
  const startLine = Math.max(0, warningLine - CONTEXT_LINES);
  const endLine = Math.min(lines.length - 1, warningLine + CONTEXT_LINES);
  
  // Calculate line number width for proper alignment
  const lineNumWidth = Math.max(3, String(endLine + 1).length);
  
  const warningDetails = `\n${chalk.yellow.bold(warning.name)}: ${chalk.white(warning.message)}`;
  const location = chalk.gray(` at line ${warning.source.line}, column ${warning.source.col}`);
  
  let contextOutput = '\n';
  
  for (let i = startLine; i <= endLine; i++) {
    const lineNum = (i + 1).toString().padStart(lineNumWidth, ' ');
    const fullLineContent = lines[i] || '';
    const isWarningLine = i === warningLine;
    
    let lineContent = fullLineContent;
    let adjustedWarningCol = warningCol;
    
    if (isWarningLine && fullLineContent.length > MAX_WARNING_LINE_LENGTH - 4) {
      // Calculate center point around warning column
      const centerPoint = warningCol;
      const halfWidth = Math.floor((MAX_WARNING_LINE_LENGTH - 4) / 2);
      const lineStart = Math.max(0, centerPoint - halfWidth);
      const lineEnd = Math.min(fullLineContent.length, lineStart + MAX_WARNING_LINE_LENGTH - 4);
      
      // Adjust start if we're near the end of the line
      const actualStart = Math.max(0, lineEnd - (MAX_WARNING_LINE_LENGTH - 4));
      
      let prefix = '';
      let suffix = '';
      
      if (actualStart > 0) {
        prefix = '..';
      }
      if (lineEnd < fullLineContent.length) {
        suffix = '..';
      }
      
      lineContent = prefix + fullLineContent.slice(actualStart, lineEnd) + suffix;
      adjustedWarningCol = (warningCol - actualStart) + prefix.length;
    }
    
    if (isWarningLine) {
      // Highlight the warning line
      contextOutput += `${chalk.yellow('>')} ${chalk.cyan(lineNum)} ${chalk.gray('|')} ${chalk.white(lineContent)}\n`;
      
      // Add warning pointer
      const pointerPadding = ' '.repeat(lineNumWidth + adjustedWarningCol - 2);
      contextOutput += `  ${chalk.gray(' '.repeat(lineNumWidth))} ${chalk.gray('|')} ${chalk.gray(pointerPadding)}${chalk.yellow.bold('^')}\n`;
    } else {
      contextOutput += `  ${chalk.cyan(lineNum)} ${chalk.gray('|')} ${chalk.gray(lineContent)}\n`;
    }
  }
  
  const warningPrint = `${warningDetails}${location}${contextOutput}\n`;
  return warningPrint;
}

// local setup error object will be generated on each session and passed through constructors and classes, to support multiple instances of the programming language to run at the same time.
export function setup(listener: ListenerCallback | null = null) {
  let x: LocalWarningsSetup = {};

  for(let i = 0; i < warningNames.length; i++) {
    x[warningNames[i]] = new BaseWarning(warningNames[i]);
  }

  if(listener) addListenerToAll(x as LocalWarnings, listener);

  return x as LocalWarnings;
}

export default {
  setup,
  addListenerToAll,
  getWarningLog,
  BaseWarning
};