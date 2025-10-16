// semantic/SemanticAnalyzer.ts
import * as Nodes from "../ast/nodes";
import type { NodeTypes, Visitor } from "../ast/nodes";
import { BaseError } from "../util/errors";
import { BaseWarning, LocalWarnings } from "../util/warnings";
import { SemanticVisitors } from "../ast/visitors";
import { MainConfig } from "../types/global";
import { Modifiers } from "../ast/modifiers";
import { OperatorType } from "../types/operators";

/* -------------------------
   Type and symbol model
   ------------------------- */

export type TypeKind = 
  "primitive" | "class" | "object" | "special" | "logical";

/* Base type interface */
export interface BaseType {
  readonly kind: TypeKind;
  readonly id: string;         // e.g., "number", "array", "MyClass"
  readonly metadata: {};
}

/* Primitive types */
export interface IntType extends BaseType {
  readonly kind: "primitive";
  readonly id: "int";
  readonly metadata: {
    value?: number
  };
}

export interface StringLiteralType extends BaseType {
  readonly kind: "primitive";
  readonly id: "string";
  readonly metadata: {
    value?: string
  };
}

export interface FloatType extends BaseType {
  readonly kind: "primitive";
  readonly id: "float";
  readonly metadata: {
    value?: number
  };
}

export interface BooleanType extends BaseType {
  readonly kind: "primitive";
  readonly id: "boolean";
  readonly metadata: {
    value?: boolean
  };
}

/* Reference types */
export interface ArrayType extends BaseType {
  readonly kind: "object";
  readonly id: "array";
  readonly metadata: { elementType: BaseType };
}

export interface StructType extends BaseType {
  readonly kind: "object";
  readonly id: "struct";
  readonly metadata: { 
    elementTypes: Map<string, BaseType>,
    generics: BaseType[]
  };
}

export interface ClassType extends BaseType {
  readonly kind: "class";
  readonly metadata: { 
    extending?: ClassType,
    implementing?: StructType,
    generics?: BaseType[]
  };
}

export interface FunctionType extends BaseType {
  readonly kind: "object";
  readonly id: "function";
  readonly metadata: {
    params: BaseType[],
    returnType: BaseType,
    generics: BaseType[]
  };
}

/* Type unions and intersections */
export interface TypeUnion {
  readonly kind: "logical";
  readonly left: BaseType;
  readonly right: BaseType;
}

export interface TypeIntersection {
  readonly kind: "logical";
  readonly left: BaseType;
  readonly right: BaseType;
}

/* Union type of all types for the analyzer */
export type Type =
  | IntType
  | FloatType
  | BooleanType
  | ArrayType
  | StructType
  | ClassType
  | FunctionType
  | TypeUnion
  | TypeIntersection
  | StringLiteralType;

export type SymbolKind = "variable" | "parameter" | "function" | "class" | "type";

export interface SymbolEntryBase {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: Type;
  readonly isConstant: boolean;
  readonly isInitialized: boolean;
  readonly loc: Nodes.SourceLocation | undefined;
  readonly node: Nodes.Node | undefined;
}

export interface VariableSymbol extends SymbolEntryBase {
  readonly kind: "variable" | "parameter";
  readonly isCaptured?: boolean;
}

export interface FunctionSymbol extends SymbolEntryBase {
  readonly kind: "function";
  readonly params: ReadonlyArray<{ readonly name: string; readonly type: Type | null; readonly loc?: Nodes.Node["loc"] }>;
  readonly returnType: Type | null;
  readonly isAsync?: boolean;
}

export interface ClassSymbol extends SymbolEntryBase {
  readonly kind: "class";
  readonly fields: ReadonlyMap<string, VariableSymbol>;
  readonly methods: ReadonlyMap<string, FunctionSymbol>;
  readonly superClass?: string | null;
}

export type SymbolEntry = VariableSymbol | FunctionSymbol | ClassSymbol | SymbolEntryBase;

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

interface Feedback {
    errors: BaseError[],
    warnings: BaseWarning[]
}

/* -------------------------
   SemanticAnalyzer skeleton
   ------------------------- */

export class SemanticAnalyzer {
  private readonly program: NodeTypes["Program"];
  private readonly globalScope: Scope;
  private readonly types = new Map<TypeId, Type>();
  private readonly warns: MainConfig["warn"];
  private readonly errors: MainConfig["errors"];
  private readonly file: MainConfig["file"];
  private state: AnalysisState;
  private visitors = SemanticVisitors;
  private hasErrors = false;

  public constructor(program: NodeTypes["Program"], config: MainConfig) {
    this.warns = config.warn;
    this.errors = config.errors;
    this.file = config.file;

    this.program = program;
    this.globalScope = new Scope(null);
    this.state = {
      currentFunction: null,
      currentClass: null,
      currentScope: this.globalScope,
      insideLoop: 0,
      insideSwitch: 0,
    };

    this.bootstrapBuiltinTypes();
    this.bootstrapBuiltinSymbols();
  }

  public analyze(): void | BaseError {
    // start
    if(this.hasErrors) {
      return this.errors.ProgramParsingError.throw(
        "Failed to parse program",
        this.file,
        Nodes.buildSourceLocation(0, 0, 0),
      );
    }
  }

  /* -------------------------
     bootstrapping helpers
     ------------------------- */

  private bootstrapBuiltinTypes(): void {
    this.registerType({ kind: "primitive", id: "int" });
    this.registerType({ id: "float", displayName: "float" });
    this.registerType({ id: "bool", displayName: "bool" });
    this.registerType({ id: "char", displayName: "char" });
    this.registerType({ id: "void", displayName: "void" });
    this.registerType({ id: "undefined", displayName: "undefined" });
    this.registerType({ id: "null", displayName: "null" });
    this.registerType({ id: "NaN", displayName: "NaN" });
  }

  private bootstrapBuiltinSymbols(): void {
    const printFn: FunctionSymbol = {
      name: "print",
      kind: "function",
      type: null,
      params: [{ name: "v", type: this.getType("string"), loc: undefined }],
      returnType: this.getType("void"),
      isAsync: false,
      loc: undefined,
      node: undefined,
    };
    this.globalScope.define(printFn);
  }

  /* -------------------------
     type registry helpers
     ------------------------- */

  public registerType(t: Type): void {
    this.types.set(t.id, t);
  }

  public getType(id: TypeId): Type | null {
    return this.types.get(id) ?? null;
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
      this.errors.TypeError.throw(
        `Duplicate declaration of '${sym.name}'`, 
        this.file,
        sym.loc
      );
      return false;
    }
    this.state.currentScope.define(sym);
    return true;
  }

  public declareFunction(sym: FunctionSymbol): boolean {
    if (this.state.currentScope.hasLocal(sym.name)) {
      this.errors.TypeError.throw(
        `Duplicate declaration of '${sym.name}'`, 
        this.file,
        sym.loc || Nodes.buildSourceLocation(0,0,0)
      );
      return false;
    }
    this.state.currentScope.define(sym);
    return true;
  }

  public declareClass(sym: ClassSymbol): boolean {
    if (this.state.currentScope.hasLocal(sym.name)) {
      new BaseError(`Duplicate declaration of class '${sym.name}'`, sym.loc));
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
        type: p.type,
        loc: p.loc,
        node: undefined,
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

}