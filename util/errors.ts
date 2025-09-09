import { SourceLocation } from "../ast/nodes";
import chalk from "chalk";
import { filterMatches, getFileContent } from "./any";
import fs from "fs";

export const errorNames = [
  "SyntaxError",
  "TypeError", 
  "ReferenceError",
  "RedeclarationError",
  "UnexpectedTokenError",
  "UnterminatedStringError",
  "InvalidNumberError",
  "UndeclaredVariableError",
  "FunctionNotFoundError",
  "ArgumentCountMismatchError",
  "ReturnTypeMismatchError",
  "ArrayIndexOutOfBoundsError",
  "PropertyNotFoundError",
  "InvalidAssignmentError",
  "DivisionByZeroError",


  // Special main errors
  "ProgramParsingError",
  "ProgramLexingError"
] as const;

const mainErrors: typeof errorNames[number][] = [
  "ProgramParsingError",
  "ProgramLexingError"
] as const;

function isMainError(err: ErrorResponse | BaseError): boolean {
  switch(err.name) {
      case "ProgramParsingError":
      case "ProgramLexingError":
        return true;
      default:
        return false;
  }
}

export class BaseError {
  public readonly name: ErrorName;

  constructor(name: string) {
    this.name = name as ErrorName;
  }

  public throw (message: string, input: FileInput, source: SourceLocation) {
    this.notifyListeners({
      name: this.name,
      message,
      input,
      source
    });

    return this;
  }

  private listeners: ListenerCallback[] = [];

  public addListener(listener: ListenerCallback) {
    this.listeners.push(listener);
  }

  public removeListener(listener: ListenerCallback): number | null {
    const i = this.listeners.findIndex(
      (existingListener) => existingListener === listener
    );
    
    if (i !== -1) {
      this.listeners.splice(i, 1);
      return i;
    } return null;
  }

  protected notifyListeners(err: ErrorResponse) {
    for (let listener of this.listeners) {
      listener(err, this);
    }
  }
}

type ErrorName = typeof errorNames[number];
type LocalErrorsSetup = Record<string, BaseError>;
type ErrorQueue = ErrorResponse[];
export type ListenerCallback = (error: ErrorResponse, errorClass: BaseError) => void;
export type WaiterListenerCallback = (error: ErrorResponse, errorClass: BaseError, queue: ErrorQueue) => void;
export type LocalErrors = Record<ErrorName, BaseError>;
export interface FileInput {
  filename: string,
  pathname: string,
  path: string
}
export interface ErrorResponse {
  name: ErrorName,
  message: string,
  input: FileInput,
  source: SourceLocation
}

export function renderFileInput(path: string) {
  return {
    filename: path.split('/').pop() || '<unknown>',
    pathname: path.split('/').slice(0, -1).join('/'),
    path: path
  }
}

export function addListenerToAll(localErrors: LocalErrors, listener: ListenerCallback) {
  let v = Object.values(localErrors);

  for(let i = 0; i < v.length; i++) {
    v[i].addListener(listener);
  }
}

export function addListenerTo(errors: BaseError[], listener: ListenerCallback) {
  for(let i = 0; i < errors.length; i++) {
    errors[i].addListener(listener);
  }
}
export function removeListenerFrom(errors: BaseError[], listener: ListenerCallback) {
  for(let i = 0; i < errors.length; i++) {
    errors[i].removeListener(listener);
  }
}

const MAX_ERROR_LINE_LENGTH = 60;
const CONTEXT_LINES = 2;

export function getErrorHTML(error: ErrorResponse): string {
  const lines = getFileContent(error.input.path).split('\n');
  const errorLine = error.source.line - 1;
  const errorCol = error.source.col - 1;
  
  const startLine = Math.max(0, errorLine - CONTEXT_LINES);
  const endLine = Math.min(lines.length - 1, errorLine + CONTEXT_LINES);
  
  const lineNumWidth = Math.max(3, String(endLine + 1).length);
  
  let html = `<div class="error-header">`;
  html += `<span class="error-name">${error.name}</span>: `;
  html += `<span class="error-message">${error.message}</span>`;
  html += `<span class="error-location"> at line ${error.source.line}, column ${error.source.col}</span>`;
  html += `</div>\n\n`;
  
  html += `<div class="error-context">`;
  
  for (let i = startLine; i <= endLine; i++) {
    const lineNum = (i + 1).toString().padStart(lineNumWidth, ' ');
    const fullLineContent = lines[i] || '';
    const isErrorLine = i === errorLine;
    
    let lineContent = fullLineContent;
    let adjustedErrorCol = errorCol;
    
    if (isErrorLine && fullLineContent.length > MAX_ERROR_LINE_LENGTH - 4) {
      const centerPoint = errorCol;
      const halfWidth = Math.floor((MAX_ERROR_LINE_LENGTH - 4) / 2);
      const lineStart = Math.max(0, centerPoint - halfWidth);
      const lineEnd = Math.min(fullLineContent.length, lineStart + MAX_ERROR_LINE_LENGTH - 4);
      const actualStart = Math.max(0, lineEnd - (MAX_ERROR_LINE_LENGTH - 4));
      
      let prefix = '';
      let suffix = '';
      
      if (actualStart > 0) {
        prefix = '..';
      }
      if (lineEnd < fullLineContent.length) {
        suffix = '..';
      }
      
      lineContent = prefix + fullLineContent.slice(actualStart, lineEnd) + suffix;
      adjustedErrorCol = (errorCol - actualStart) + prefix.length;
    }
    
    if (isErrorLine) {
      html += `<div class="code-line error-line">`;
      html += `<span class="line-marker error-marker">></span> `;
      html += `<span class="line-number">${lineNum}</span> `;
      html += `<span class="line-separator">|</span> `;
      html += `<span class="line-content error-content">${lineContent}</span>`;
      html += `</div>`;
      
      const pointerPadding = ' '.repeat(lineNumWidth + adjustedErrorCol - 2);
      html += `<div class="code-line pointer-line">`;
      html += `<span class="line-marker"></span> `;
      html += `<span class="line-number-space">${' '.repeat(lineNumWidth)}</span> `;
      html += `<span class="line-separator">|</span> `;
      html += `<span class="pointer-padding">${pointerPadding}</span>`;
      html += `<span class="error-pointer">^</span>`;
      html += `</div>`;
    } else {
      html += `<div class="code-line">`;
      html += `<span class="line-marker"></span> `;
      html += `<span class="line-number">${lineNum}</span> `;
      html += `<span class="line-separator">|</span> `;
      html += `<span class="line-content">${lineContent}</span>`;
      html += `</div>`;
    }
  }
  
  html += `</div>`;
  
  let hint = '';
  switch (error.name) {
    case 'SyntaxError':
      if (error.message.includes('Expected')) {
        hint = `<div class="error-hint"><span class="hint-icon">💡 Hint:</span> <span class="hint-text">Check for missing punctuation or incorrect syntax</span></div>`;
      }
      break;
    case 'TypeError':
      hint = `<div class="error-hint"><span class="hint-icon">💡 Hint:</span> <span class="hint-text">Check variable types and function signatures</span></div>`;
      break;
    case 'ReferenceError':
      hint = `<div class="error-hint"><span class="hint-icon">💡 Hint:</span> <span class="hint-text">Make sure variables are declared before use</span></div>`;
      break;
  }
  
  if (hint) {
    html += `\n${hint}`;
  }
  
  return html;
}

export function getErrorLog(error: ErrorResponse): string {
  const lines = getFileContent(error.input.path).split('\n');
  const errorLine = error.source.line - 1;
  const errorCol = error.source.col - 1;
  
  // Get context lines around the error
  const startLine = Math.max(0, errorLine - CONTEXT_LINES);
  const endLine = Math.min(lines.length - 1, errorLine + CONTEXT_LINES);
  
  // Calculate line number width for proper alignment
  const lineNumWidth = Math.max(3, String(endLine + 1).length);
  
  const errorDetails = `\n${chalk.red.bold(error.name)}: ${chalk.white(error.message)}`;
  const location = chalk.gray(` at line ${error.source.line}, column ${error.source.col}`);
  
  let contextOutput = '\n';
  
  for (let i = startLine; i <= endLine; i++) {
    const lineNum = (i + 1).toString().padStart(lineNumWidth, ' ');
    const fullLineContent = lines[i] || '';
    const isErrorLine = i === errorLine;
    
    let lineContent = fullLineContent;
    let adjustedErrorCol = errorCol;
    
    if (isErrorLine && fullLineContent.length > MAX_ERROR_LINE_LENGTH - 4) {
      // Calculate center point around error column
      const centerPoint = errorCol;
      const halfWidth = Math.floor((MAX_ERROR_LINE_LENGTH - 4) / 2);
      const lineStart = Math.max(0, centerPoint - halfWidth);
      const lineEnd = Math.min(fullLineContent.length, lineStart + MAX_ERROR_LINE_LENGTH - 4);
      
      // Adjust start if we're near the end of the line
      const actualStart = Math.max(0, lineEnd - (MAX_ERROR_LINE_LENGTH - 4));
      
      let prefix = '';
      let suffix = '';
      
      if (actualStart > 0) {
        prefix = '..';
      }
      if (lineEnd < fullLineContent.length) {
        suffix = '..';
      }
      
      lineContent = prefix + fullLineContent.slice(actualStart, lineEnd) + suffix;
      adjustedErrorCol = (errorCol - actualStart) + prefix.length;
    }
    
    if (isErrorLine) {
      // Highlight the error line
      contextOutput += `${chalk.red('>')} ${chalk.cyan(lineNum)} ${chalk.gray('|')} ${chalk.white(lineContent)}\n`;
      
      // Add error pointer
      const pointerPadding = ' '.repeat(lineNumWidth + adjustedErrorCol - 2);
      contextOutput += `  ${chalk.gray(' '.repeat(lineNumWidth))} ${chalk.gray('|')} ${chalk.gray(pointerPadding)}${chalk.red.bold('^')}\n`;
    } else {
      contextOutput += `  ${chalk.cyan(lineNum)} ${chalk.gray('|')} ${chalk.gray(lineContent)}\n`;
    }
  }
  
  const errorPrint = `${errorDetails}${location}${contextOutput}\n`;
  return errorPrint;
}

// local setup error object will be generated on each session and passed through constructors and classes, to support multiple instances of the programming language to run at the same time.
export function setup(listener: ListenerCallback | null = null) {
  let x: LocalErrorsSetup = {};

  for(let i = 0; i < errorNames.length; i++) {
    x[errorNames[i]] = new BaseError(errorNames[i]);
  }

  if(listener) addListenerToAll(x as LocalErrors, listener);

  return x as LocalErrors;
}

export function getQueueLog(queue: ErrorQueue): string {
  const errorMap: [string, ErrorResponse[]][] = [];

  for (let i = 0; i < queue.length; i++) {
    const errorPath = queue[i].input.filename;
    const existingEntry = errorMap.find(([path]) => path === errorPath);

    if (existingEntry) {
      existingEntry[1].push(queue[i]);
    } else {
      errorMap.push([errorPath, [queue[i]]]);
    }
  }

  let stdout = "";

  for (const [path, errors] of errorMap) {
    stdout += `\n${chalk.bold(errors.length)} error${errors.length === 1 ? "" : "s"} found in ${chalk.bold(path)}:\n`;
    for (const error of errors) {
      stdout += `${getErrorLog(error)}`;
    }
  }

  return stdout;
}

export function Queue(localErrors: LocalErrors, errors: ErrorName[], execListener: WaiterListenerCallback) {
  let errQueue: ErrorQueue = [];
  const v = Object.values(localErrors);

  const { matches: main, nonMatches: other } = filterMatches<BaseError>(
    v, (e) => errors.includes(e.name)
  );
  
  const queueListener = (err: ErrorResponse, errClass: BaseError) => {
    errQueue.push(err);
  }

  const mainListener = (err: ErrorResponse, errClass: BaseError) => {
    errQueue = [];
    execListener(err, errClass, errQueue);
    removeListenerFrom(main, mainListener);
    removeListenerFrom(other, queueListener);
  }

  addListenerTo(main, mainListener);
  addListenerTo(other, queueListener);
}

export function MainQueue(localErrors: LocalErrors, execListener: WaiterListenerCallback) {
  let errQueue: ErrorQueue = [];
  const v = Object.values(localErrors);

  const { matches: main, nonMatches: other } = filterMatches<BaseError>(
    v, isMainError
  );

  const queueListener = (err: ErrorResponse, errClass: BaseError) => {
    errQueue.push(err);
  }

  const mainListener = (err: ErrorResponse, errClass: BaseError) => {
    execListener(err, errClass, errQueue);
    removeListenerFrom(main, mainListener);
    removeListenerFrom(other, queueListener);
    errQueue = [];
  }

  addListenerTo(main, mainListener);
  addListenerTo(other, queueListener);
}

export default {
  setup,
  addListenerToAll,
  getErrorLog,
  getQueueLog,
  getErrorHTML,
  BaseError,
  Queue,
  MainQueue
};