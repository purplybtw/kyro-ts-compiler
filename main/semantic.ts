// semantic/SemanticAnalyzer.ts
import * as Nodes from "../ast/nodes";
import type { NodeTypes, Visitor } from "../ast/nodes";
import { BaseError } from "../util/errors";
import { BaseWarning, LocalWarnings } from "../util/warnings";
import { SemanticVisitors } from "../ast/visitors";
import { MainConfig } from "../types/global";
import { Modifiers } from "../ast/modifiers";
import { OperatorType } from "../types/operators";
import { Types, TypesMap, BaseType, TypeClasses } from "./config/types";
import { SymbolEntry, VariableSymbol, FunctionSymbol, ClassSymbol } from "./config/symbols";
import NativeConfig from "./config/native";
import type { SwitchProperty } from "../util/any";
import path from 'path';
import fs from 'fs';
import KyroCompiler from './init';
import { renderFileInput } from '../util/errors';

/* -------------------------
   Scope (symbol table)
   ------------------------- */

export class Scope {
  private readonly symbols = new Map<string, SymbolEntry>();
  public readonly parent: Scope | null;

  public constructor(parent: Scope | null = null) {
    this.parent = parent;
  }

  public define(sym: SymbolEntry): void {
    this.symbols.set(sym.name, sym);
  }

  public hasLocal(name: string): boolean {
    return this.symbols.has(name);
  }

  public lookupLocal(name: string): SymbolEntry | null {
    return this.symbols.get(name) ?? null;
  }

  public lookup(name: string): SymbolEntry | null {
    let cur: Scope | null = this;
    while (cur !== null) {
      const s = cur.lookupLocal(name);
      if (s !== null) return s;
      cur = cur.parent;
    }
    return null;
  }

  public entries(): IterableIterator<[string, SymbolEntry]> {
    return this.symbols.entries();
  }
}

/* -------------------------
   Analysis state
   ------------------------- */

export interface AnalysisState {
  currentFunction: FunctionSymbol | null;
  currentClass: ClassSymbol | null;
  currentScope: Scope;
  insideLoop: number;
  insideSwitch: number;
}

type NativeModule = keyof typeof NativeConfig;
type NativeModuleSymbol = (typeof NativeConfig)[NativeModule]

interface Feedback {
    errors: BaseError[],
    warnings: BaseWarning[]
}

/* -------------------------
   SemanticAnalyzer skeleton
   ------------------------- */

export class SemanticAnalyzer {
  private readonly ast: NodeTypes["Program"];
  private readonly globalScope: Scope;
  private readonly warns: MainConfig["warn"];
  private readonly errors: MainConfig["errors"];
  private readonly file: MainConfig["file"];
  private state: AnalysisState;
  private visitors = SemanticVisitors;
  private hasErrors = false;
  private static processingFiles: Set<string> = new Set();
  private static fileExportsCache: Map<string, Map<string, SymbolEntry>> = new Map();

  private reportTypeError(message: string, loc: Nodes.SourceLocation): BaseError {
    this.hasErrors = true;
    return this.errors.TypeError.throw(
      message,
      this.file,
      loc,
    );
  }

  private reportCriticalTypeError(
    message: string,
    loc: Nodes.SourceLocation = Nodes.buildSourceLocation(0,0,0)
  ): BaseError {
    this.hasErrors = true;
    return this.errors.ProgramSemanticError.throw(
      message,
      this.file,
      loc,
    );
  }

  public constructor(ast: NodeTypes["Program"], config: MainConfig) {
    this.warns = config.warn;
    this.errors = config.errors;
    this.file = config.file;
    this.ast = ast;
    this.globalScope = new Scope(null);
    this.state = {
      currentFunction: null,
      currentClass: null,
      currentScope: this.globalScope,
      insideLoop: 0,
      insideSwitch: 0,
    };
    this.bootstrapImports(ast.imports);
  }

  public analyze(): void | BaseError {
    // start
    if (this.hasErrors) {
      return this.reportCriticalTypeError(
        "Failed to parse program",
        Nodes.buildSourceLocation(0, 0, 0),
      );
    }
  }

  private bootstrapImports(imports: Nodes.ImportDeclaration[]): void {
    for (const imp of imports) {
      if(imp.isNative) {
        this.bootstrapNativeImport(imp);
      } else {
        this.bootstrapFileImport(imp);
      }
    }
    console.log(this.globalScope)
  }

  private bootstrapFileImport(_import: NodeTypes["ImportDeclaration"]): void {
    if(_import.isNative) {
      this.reportCriticalTypeError(
        `Module '${_import.source.value}' attempted to bootstrap as dynamic while being a native import`
      );
      return;
    }

    const importedPath = _import.source.value;
    const currentDir = path.dirname(this.file.path);
    const resolvedPath = path.resolve(currentDir, importedPath);
    const normalizedPath = path.normalize(resolvedPath);

    if (SemanticAnalyzer.processingFiles.has(normalizedPath)) {
      const importChain = Array.from(SemanticAnalyzer.processingFiles);
      importChain.push(this.file.path);
      importChain.push(normalizedPath);
      this.reportCriticalTypeError(
        `Circular import detected: ${importChain.join(' → ')}`
      );
      return;
    }

    if (!fs.existsSync(normalizedPath)) {
      this.reportTypeError(
        `File '${importedPath}' not found`,
        _import.source.loc
      );
      return;
    }

    let exportedSymbols: Map<string, SymbolEntry> | null = null;
    let importedAst: NodeTypes["Program"] | null = null;
    
    if (SemanticAnalyzer.fileExportsCache.has(normalizedPath)) {
      exportedSymbols = SemanticAnalyzer.fileExportsCache.get(normalizedPath)!;
      const importedFileInput = renderFileInput(normalizedPath);
      const parsedAst = KyroCompiler.parseFile(
        importedFileInput,
        this.errors,
        this.warns
      );
      if (!(parsedAst instanceof BaseError)) {
        importedAst = parsedAst;
      }
    } else {
      SemanticAnalyzer.processingFiles.add(normalizedPath);
      try {
        const importedFileInput = renderFileInput(normalizedPath);
        const parsedAst = KyroCompiler.parseFile(
          importedFileInput,
          this.errors,
          this.warns
        );
        
        if (parsedAst instanceof BaseError) {
          this.reportTypeError(
            `Failed to parse imported file '${importedPath}'`,
            _import.source.loc
          );
          return;
        }

        importedAst = parsedAst;

        const importedSemantics = new SemanticAnalyzer(
          importedAst,
          { errors: this.errors, warn: this.warns, file: importedFileInput }
        );

        const analysisResult = importedSemantics.analyze();
        if (analysisResult instanceof BaseError) {
          this.reportTypeError(
            `Failed to analyze imported file '${importedPath}'`,
            _import.source.loc
          );
          return;
        }

        exportedSymbols = this.extractExportedSymbols(importedSemantics, importedAst);
        SemanticAnalyzer.fileExportsCache.set(normalizedPath, exportedSymbols);
      } finally {
        SemanticAnalyzer.processingFiles.delete(normalizedPath);
      }
    }

    if (!exportedSymbols || !importedAst) {
      return;
    }

    const { defaultMemberPtr } = importedAst.metadata;
    const imp = Object.fromEntries(exportedSymbols);

    if(_import.defaultImport === "*") {
      for(const defImport of Object.values(imp)) {
        this.globalScope.define(defImport);
      }
    } else if (_import.defaultImport != null) {
      if (defaultMemberPtr !== undefined && defaultMemberPtr < importedAst.body.length) {
        const defaultStatement = importedAst.body[defaultMemberPtr];
        const defaultSymbol = this.extractSymbolFromStatement(defaultStatement);
        
        if (defaultSymbol) {
          const symbol = Array.isArray(defaultSymbol) ? defaultSymbol[0] : defaultSymbol;
          const localName = _import.defaultImport.name;
          const defaultImportSymbol: SymbolEntry = {
            ...symbol,
            name: localName,
          };
          this.globalScope.define(defaultImportSymbol);
        } else {
          this.reportTypeError(
            `Default export not found in module '${importedPath}'`,
            _import.source.loc
          );
        }
      } else {
        this.reportTypeError(
          `No default export found in module '${importedPath}'`,
          _import.source.loc
        );
      }
    }

    for(const namedImport of _import.namedImports) {
      const key = namedImport.importedName.name;
      if (key in imp) {
        const importRef = (imp as Record<string, SymbolEntry>)[key];
        const symbolCopy = { ...importRef };
        if(namedImport.localName != null) {
          (symbolCopy as any).name = namedImport.localName.name;
          this.globalScope.define(symbolCopy as SymbolEntry);
        } else {
          this.globalScope.define(importRef);
        }
      } else {
        this.reportTypeError(
          `Exported symbol '${key}' not found in module '${importedPath}'`,
          namedImport.importedName.loc
        );
      }
    }
  }
  private bootstrapNativeImport(_import: NodeTypes["ImportDeclaration"]): void {
    if(!_import.isNative) {
      this.reportCriticalTypeError(
        `Module '${_import.source.value}' attempted to bootstrap as native while being a dynamic import`
      );
      return
    };

    const src = _import.source.value as NativeModule;
    const imp = NativeConfig[src];

    if (!imp) {
      this.reportTypeError(
        `Native module '${src}' not found`,
        _import.source.loc
      );
      return;
    }

    if(_import.defaultImport === "*") {
      for(const defImport of Object.values(imp)) {
        this.globalScope.define(defImport);
      }
    } else if (_import.defaultImport != null) {
      // build struct type with all symbols from the native module
      const structFields = new Map<string, BaseType>();
      
      for (const [key, symbol] of Object.entries(imp)) {
        structFields.set(key, symbol.type);
      }
      
      const structType = new TypeClasses.struct(structFields);
      
      const localName = _import.defaultImport.name;
      
      // Create a variable symbol representing the struct
      const defaultImportSymbol: VariableSymbol = {
        name: localName,
        kind: "variable",
        type: structType,
        loc: _import.loc,
        node: _import,
        isInitialized: true,
        isConstant: true,
        modifiers: 0,
      };
      
      this.globalScope.define(defaultImportSymbol);
    }

    for(const namedImport of _import.namedImports) {
      const key = namedImport.importedName.name;
      if (key in imp) {
        const importRef = (imp as Record<string, SymbolEntry>)[key];
        if(namedImport.localName != null) {
          (importRef as any).name = namedImport.localName.name;
          this.globalScope.define(importRef);
        } else {
          this.globalScope.define(importRef);
        }
      }
    }

/*
    const nativeSymbols = Object.values(NativeConfig[imp]);

    for (const sym of nativeSymbols) {
      this.globalScope.define(sym);
    }*/
  }

  /* -------------------------
     scope helpers
     ------------------------- */

  public enterScope(): void {
    const s = new Scope(this.state.currentScope);
    this.state.currentScope = s;
  }

  public exitScope(): void {
    const parent = this.state.currentScope.parent;
    if (parent === null) {
      throw new Error("Cannot exit global scope");
    }
    this.state.currentScope = parent;
  }

  public declareVariable(sym: VariableSymbol): boolean {
    if (this.state.currentScope.hasLocal(sym.name)) {
      this.reportTypeError(
        `Duplicate declaration of '${sym.name}'`, 
        sym.loc || Nodes.buildSourceLocation(0,0,0)
      );
      return false;
    }
    this.state.currentScope.define(sym);
    return true;
  }

  public declareFunction(sym: FunctionSymbol): boolean {
    if (this.state.currentScope.hasLocal(sym.name)) {
      this.reportTypeError(
        `Duplicate declaration of '${sym.name}'`, 
        sym.loc || Nodes.buildSourceLocation(0,0,0)
      );
      return false;
    }
    this.state.currentScope.define(sym);
    return true;
  }

  public declareClass(sym: ClassSymbol): boolean {
    if (this.state.currentScope.hasLocal(sym.name)) {
      this.reportTypeError(
        `Duplicate declaration of class '${sym.name}'`, 
        sym.loc || Nodes.buildSourceLocation(0,0,0)
      );
      return false;
    }
    this.state.currentScope.define(sym);
    return true;
  }

  public resolve(name: string): SymbolEntry | null {
    return this.state.currentScope.lookup(name);
  }

  /* -------------------------
     context push/pop helpers
     ------------------------- */

  public pushFunctionContext(fn: FunctionSymbol): void {
    this.state.currentFunction = fn;
    this.enterScope();
    for (const p of fn.params) {
      const vs: VariableSymbol = {
        name: p.name,
        kind: "parameter",
        type: p.type || Types.void,
        loc: p.loc,
        node: undefined,
        isConstant: false,
        modifiers: 0,
        isInitialized: true,
      };
      this.declareVariable(vs);
    }
  }

  public popFunctionContext(): void {
    this.exitScope();
    this.state.currentFunction = null;
  }

  public pushClassContext(cls: ClassSymbol): void {
    this.state.currentClass = cls;
    this.enterScope();
    for (const f of cls.fields.values()) {
      this.state.currentScope.define(f);
    }
    for (const m of cls.methods.values()) {
      this.state.currentScope.define(m);
    }
  }

  public popClassContext(): void {
    this.exitScope();
    this.state.currentClass = null;
  }

  public getGlobalScope(): Scope {
    return this.globalScope;
  }

  private extractExportedSymbols(
    importedSemantics: SemanticAnalyzer,
    importedAst: NodeTypes["Program"]
  ): Map<string, SymbolEntry> {
    const exportedSymbols = new Map<string, SymbolEntry>();
    const { exportMembersPtr } = importedAst.metadata;

    exportMembersPtr.forEach(index => {
      if (index < 0 || index >= importedAst.body.length) {
        return;
      }

      const statement = importedAst.body[index];
      const symbol = this.extractSymbolFromStatement(statement);
      
      if (symbol) {
        if (Array.isArray(symbol)) {
          symbol.forEach(s => exportedSymbols.set(s.name, s));
        } else {
          exportedSymbols.set(symbol.name, symbol);
        }
      }
    });

    return exportedSymbols;
  }

  private extractSymbolFromStatement(statement: NodeTypes["FunctionDeclaration"] | NodeTypes["ClassDeclaration"] | NodeTypes["VariableDeclaration"] | NodeTypes["Program"]["body"][number]): SymbolEntry | SymbolEntry[] | null {
    if (statement.type === "FunctionDeclaration") {
      const fn = statement as NodeTypes["FunctionDeclaration"];
      const returnType = this.resolveTypeReference(fn.returnType) || Types.void;
      const functionSymbol: FunctionSymbol = {
        name: fn.identifier.name,
        kind: "function",
        params: fn.parameters.map(p => ({
          name: p.identifier.name,
          type: this.resolveTypeReference(p.paramType) || Types.void,
          loc: p.loc
        })),
        modifiers: 0,
        loc: fn.loc,
        node: fn,
        isAsync: false,
        type: new TypeClasses.function(
          fn.parameters.map(p => this.resolveTypeReference(p.paramType) || Types.void),
          returnType,
          []
        )
      };
      return functionSymbol;
    } else if (statement.type === "ClassDeclaration") {
      const cls = statement as NodeTypes["ClassDeclaration"];
      const fields = new Map<string, VariableSymbol>();
      const methods = new Map<string, FunctionSymbol>();
      
      for (const prop of cls.properties) {
        const fieldSymbol: VariableSymbol = {
          name: prop.identifier.name,
          kind: "variable",
          type: this.resolveTypeReference(prop.varType) || Types.void,
          loc: prop.loc,
          node: prop,
          isInitialized: prop.initializer != null,
          isConstant: false,
          modifiers: (prop.modifiers as any)?.getNumberValue?.() ?? 0
        };
        fields.set(prop.identifier.name, fieldSymbol);
      }
      
      for (const method of cls.methods) {
        const methodReturnType = this.resolveTypeReference(method.returnType) || Types.void;
        const methodSymbol: FunctionSymbol = {
          name: method.identifier.name,
          kind: "function",
          params: method.parameters.map(p => ({
            name: p.identifier.name,
            type: this.resolveTypeReference(p.paramType) || Types.void,
            loc: p.loc
          })),
          modifiers: (method.modifiers as any)?.getNumberValue?.() ?? 0,
          loc: method.loc,
          node: method,
          isAsync: false,
          type: new TypeClasses.function(
            method.parameters.map(p => this.resolveTypeReference(p.paramType) || Types.void),
            methodReturnType,
            []
          )
        };
        methods.set(method.identifier.name, methodSymbol);
      }
      
      const classSymbol: ClassSymbol = {
        name: cls.identifier.name,
        kind: "class",
        fields: fields,
        methods: methods,
        superClass: cls.extending?.name || null,
        modifiers: (cls.modifiers as any)?.getNumberValue?.() ?? 0,
        loc: cls.loc,
        node: cls,
        type: new TypeClasses.class(cls.identifier.name, {
          extending: cls.extending ? new TypeClasses.class(cls.extending.name, {}) : undefined
        })
      };
      return classSymbol;
    } else if (statement.type === "VariableDeclaration") {
      const varDecl = statement as NodeTypes["VariableDeclaration"];
      const symbols: VariableSymbol[] = [];
      for (const identifier of varDecl.identifiers) {
        const variableSymbol: VariableSymbol = {
          name: identifier.name,
          kind: "variable",
          type: this.resolveTypeReference(varDecl.varType) || Types.void,
          loc: identifier.loc,
          node: varDecl,
          isInitialized: varDecl.initializer != null,
          isConstant: varDecl.isConstant,
          modifiers: 0
        };
        symbols.push(variableSymbol);
      }
      return symbols;
    }

    return null;
  }

  private resolveTypeReference(
    typeNode: NodeTypes["TypeReference"] | NodeTypes["ArrayType"] | NodeTypes["VoidType"] | NodeTypes["NullLiteral"] | NodeTypes["UndefinedLiteral"] | NodeTypes["InferType"]
  ): BaseType | null {
    if (!typeNode) return null;
    
    if (typeNode.type === "TypeReference") {
      const typeRef = typeNode as NodeTypes["TypeReference"];
      const typeName = typeRef.name;
      if (typeName === "int") return Types.int;
      if (typeName === "float") return Types.float;
      if (typeName === "bool" || typeName === "boolean") return Types.boolean;
      if (typeName === "string") return Types.string;
      if (typeName === "char") return Types.char;
      if (typeName === "void") return Types.void;
      return new TypeClasses.class(typeName, {});
    } else if (typeNode.type === "ArrayType") {
      const arrayType = typeNode as NodeTypes["ArrayType"];
      const elementType = this.resolveTypeReference(arrayType.elementType);
      if (elementType) {
        return new TypeClasses.array(elementType);
      }
    } else if (typeNode.type === "VoidType") {
      return Types.void;
    } else if (typeNode.type === "NullLiteral") {
      return Types.null;
    } else if (typeNode.type === "UndefinedLiteral") {
      return Types.undefined;
    }
    
    return null;
  }

}