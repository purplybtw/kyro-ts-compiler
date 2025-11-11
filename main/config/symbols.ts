import type { BaseType } from "./types";
import type * as Nodes from "../../ast/nodes";

export type SymbolKind = "variable" | "parameter" | "function" | "class" | "type";

export interface SymbolEntryBase {
  readonly name: string;
  readonly kind: SymbolKind;
  readonly type: BaseType;
  readonly loc: Nodes.SourceLocation | undefined;
  readonly node: Nodes.Node | undefined;
}

export interface VariableSymbol extends SymbolEntryBase {
  readonly kind: "variable" | "parameter";
  readonly isCaptured?: boolean;
  readonly isInitialized: boolean;
  readonly isConstant: boolean;
  readonly modifiers: number;
}

export interface FunctionSymbol extends SymbolEntryBase {
  readonly kind: "function";
  readonly params: ReadonlyArray<{ readonly name: string; readonly type: BaseType | null; readonly loc?: Nodes.Node["loc"] }>;
  readonly isAsync?: boolean;
  readonly modifiers: number;
}

export interface ClassSymbol extends SymbolEntryBase {
  readonly kind: "class";
  readonly fields: ReadonlyMap<string, VariableSymbol>;
  readonly methods: ReadonlyMap<string, FunctionSymbol>;
  readonly superClass?: string | null;
  readonly modifiers: number;
}

export type SymbolEntry = VariableSymbol | FunctionSymbol | ClassSymbol | SymbolEntryBase;
