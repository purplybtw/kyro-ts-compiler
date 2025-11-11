import { Lexer, TokenType } from './lexer';
import { Parser } from './parser';
import Errors, { BaseError, FileInput, LocalErrors, renderFileInput } from '../util/errors';
import Warnings, { LocalWarnings, ListenerCallback } from '../util/warnings';
import { File, Handlers, InstanceType } from "../types/kyro";
import { SemanticAnalyzer } from './semantic';
import readline from 'readline'
import { NodeTypes } from '../ast/nodes';
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

  public run(logProcess = false) {
    this.exec(this.entrypoint, this.output, logProcess);
  }

  public async runAwait(logProcess = false) {
    await this.exec(this.entrypoint, this.output, logProcess);
  }

  public static parseFile(
    fileInput: FileInput, 
    errors: LocalErrors, 
    warn: LocalWarnings
  ): NodeTypes["Program"] | BaseError {
    const lexer = new Lexer({ warn, errors, file: fileInput });
    const tokens = lexer.tokenize();
    if (tokens instanceof BaseError) return tokens;
    
    const parser = new Parser({ warn, errors, file: fileInput });
    const ast = parser.parse(tokens);
    
    return ast;
  }

  private async exec(fileInput: FileInput, fileOutput: FileInput, logProcess: boolean = false) {
    const stages = [
      'Tokenizing code',
      'Parsing and building AST',
      'Semantic analysis',
      'Bytecode compilation'
    ]
  
    const barLength = 30
    let startTime = performance.now();
    let logsCount = 0

    // Only define formatting/log routines if logProcess is enabled
    const formatBar = (progress: number, stage: string) => {
      const p = Math.max(0, Math.min(1, progress))
      const filled = Math.floor(p * barLength)
      const bar = '█'.repeat(filled) + '-'.repeat(barLength - filled)
      const percent = Math.floor(p * 100)
      return `[${bar}] ${percent}% — ${stage}`
    }

    const moveUpToBar = () => readline.moveCursor(process.stdout, 0, -(logsCount + 1))
    const moveBackToLogs = () => readline.moveCursor(process.stdout, 0, logsCount)

    const renderBar = (progress: number, stage: string) => {
      if (!logProcess) return
      moveUpToBar()
      readline.clearLine(process.stdout, 0)
      readline.cursorTo(process.stdout, 0)
      process.stdout.write(formatBar(progress, stage) + '\n')
      moveBackToLogs()
    }

    const completeStage = (name: string, timeTakenMs: number, completedIndex: number) => {
      if (logProcess) {
        renderBar((completedIndex + 1) / stages.length, name)
        console.log(`✔ ${name} completed in ${timeTakenMs.toFixed(2)}ms`)
        logsCount++
      }
    }

    if (logProcess) {
      process.stdout.write(formatBar(0, stages[0]) + '\n')
    }

    let stageStart = performance.now()

    const lexer = new Lexer({ warn: this.warn, errors: this.errors, file: fileInput })
    const tokens = lexer.tokenize()
    if (tokens instanceof BaseError) return;
    completeStage(stages[0], performance.now() - stageStart, 0)
    stageStart = performance.now()
  
    const parser = new Parser({ warn: this.warn, errors: this.errors, file: fileInput })
    const ast = parser.parse(tokens)
    if (ast instanceof BaseError) return;
    completeStage(stages[1], performance.now() - stageStart, 1)
    stageStart = performance.now()
  
    const semantics = new SemanticAnalyzer(ast, { errors: this.errors, warn: this.warn, file: fileInput })
    const semanticResults = semantics.analyze();
    if (semanticResults instanceof BaseError) return;
    completeStage(stages[2], performance.now() - stageStart, 2)
    stageStart = performance.now()
  
    completeStage(stages[3], performance.now() - stageStart, 3)
  
    const totalTime = performance.now() - startTime
    if (logProcess) {
      renderBar(1, 'Done')
      process.stdout.write(`\nCompiled ${fileInput.filename} to ${fileOutput.filename} in ${totalTime.toFixed(2)}ms\n`)
    } else {
      process.stdout.write(`\nCompiled ${fileInput.filename} to ${fileOutput.filename} in ${totalTime.toFixed(2)}ms\n`)
    }
  }

}