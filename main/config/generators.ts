// generators.ts

import {
    SymbolEntry,
    VariableSymbol,
    FunctionSymbol,
    ClassSymbol,
  } from "./symbols";
  import {
    BaseType,
    FunctionType,
    ClassType,
    StructType,
    Types,
    VoidType,
  } from "./types";
  import type * as Nodes from "../../ast/nodes";
  
  export function generateVariable(
    name: string,
    type: BaseType,
    options: {
      modifiers?: number;
      isConstant?: boolean;
      isInitialized?: boolean;
      isCaptured?: boolean;
      loc?: Nodes.SourceLocation;
      node?: Nodes.Node;
    } = {}
  ): VariableSymbol {
    const {
      modifiers = 0,
      isConstant = false,
      isInitialized = false,
      isCaptured = false,
      loc = undefined,
      node = undefined,
    } = options;
  
    return {
      kind: "variable",
      name,
      type,
      modifiers,
      isConstant,
      isInitialized,
      isCaptured,
      loc,
      node,
    };
  }
  
  export function generateFunction(
    name: string,
    params: ReadonlyArray<{ name: string; type: BaseType | null }>,
    returnType: BaseType = new VoidType(),
    options: {
      modifiers?: number;
      isAsync?: boolean;
      loc?: Nodes.SourceLocation;
      node?: Nodes.Node;
    } = {}
  ): FunctionSymbol {
    const { modifiers = 0, isAsync = false, loc = undefined, node = undefined } = options;
  
    const type = new FunctionType(
      params.map(p => p.type ?? Types.undefined),
      returnType
    );
  
    return {
      kind: "function",
      name,
      type,
      params,
      isAsync,
      modifiers,
      loc,
      node,
    };
  }
  
  export function generateClass(
    name: string,
    members: {
      fields?: VariableSymbol[];
      methods?: FunctionSymbol[];
    } = {},
    options: {
      modifiers?: number;
      superClass?: string | null;
      loc?: Nodes.SourceLocation;
      node?: Nodes.Node;
    } = {}
  ): ClassSymbol {
    const {
      modifiers = 0,
      superClass = null,
      loc = undefined,
      node = undefined,
    } = options;
  
    const fieldsMap = new Map<string, VariableSymbol>();
    const methodsMap = new Map<string, FunctionSymbol>();
  
    members.fields?.forEach(field => fieldsMap.set(field.name, field));
    members.methods?.forEach(method => methodsMap.set(method.name, method));
  
    const type = new ClassType(name, {});
  
    return {
      kind: "class",
      name,
      type,
      fields: fieldsMap,
      methods: methodsMap,
      superClass,
      modifiers,
      loc,
      node,
    };
  }
  
  export function generateStruct(
    name: string,
    fields: { name: string; type: BaseType }[],
    options: {
      modifiers?: number;
      generics?: BaseType[];
      loc?: Nodes.SourceLocation;
      node?: Nodes.Node;
    } = {}
  ): SymbolEntry {
    const { modifiers = 0, generics = [], loc = undefined, node = undefined } = options;
  
    const fieldMap = new Map<string, BaseType>();
    for (const field of fields) fieldMap.set(field.name, field.type);
  
    const type = new StructType(fieldMap, generics);
  
    return {
      kind: "type",
      name,
      type,
      loc,
      node,
    };
  }
  