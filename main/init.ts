import { Lexer, TokenType } from './lexer';
import { Parser } from './parser';
import { visualizeAST } from '../visualizer/ast-visualizer';
import Errors, { BaseError, FileInput, LocalErrors, renderFileInput } from '../util/errors';
import Warnings, { LocalWarnings, ListenerCallback } from '../util/warnings';
import { File, Handlers, InstanceType } from "../types/kyro";
import Logger from '../util/logger';

export default class KyroCompiler {
  public errors: LocalErrors;
  public warn: LocalWarnings;
  private files: Map<string, File> = new Map();
  
  constructor(
    public entrypoint: FileInput,
    public output: FileInput, 
    public type: InstanceType, 
    handlers: Handlers | null = null
  ) {
    if(type === "sandbox") {
      if(handlers === null || typeof handlers.onError != "function")
        throw new Error("Handlers must be provided for instanced Javon instances");

      this.errors = Errors.setup();
      this.warn = Warnings.setup(handlers.onWarning);
      Errors.MainQueue(this.errors, handlers.onError);
    } else {
      this.errors = Errors.setup();
      this.warn = Warnings.setup((warning, warningClass) => {
        console.warn(Warnings.getWarningLog(warning));
      });

      Errors.MainQueue(this.errors, (mainError, errorClass, errorQueue) => {
        console.error(Errors.getQueueLog(errorQueue));
        process.exit(1);
      });
    }
  }

  public run() {
    this.exec(this.entrypoint);
  }

  private exec(fileInput: FileInput) {
    let startTime = Date.now();
    const lexer = new Lexer({
      warn: this.warn,
      errors: this.errors,
      file: fileInput
    });
    const test = lexer.tokenize();

    if(test instanceof BaseError) return;

    console.log(`Tokenized after ${Date.now()-startTime}ms:`, test);

    const parser = new Parser({
      warn: this.warn,
      errors: this.errors,
      file: fileInput
    });
    const ast = parser.parse(test);

    if(ast instanceof BaseError) return;

    //if(ast.body.length === 1) console.log(evaluateExpression(ast.body[0]));

    console.log('\nAST (Abstract Syntax Tree)\n');
    console.log(`Parsed AST after ${Date.now()-startTime}ms:`, ast);
    console.log('\nFull AST\n');
    console.log(Logger.log(ast));

    console.log('\nChecking semantics\n');
  }
}