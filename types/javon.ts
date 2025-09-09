import { FileInput, WaiterListenerCallback } from '../util/errors';
import { ListenerCallback } from '../util/warnings';
import { Program } from '../ast/nodes';

export type JV_MemoryType = "variable" | "function" | "class" | "object"
// no types because they will be classes under the hood

export interface JV_RunnerArguments {
  builtNative: "skipped" | "built"
}

export interface JV_ExportedSymbol {
  name: string;
  alias?: string;
  type: JV_MemoryType;
  memoryLocation: string; // path in memory (e.g., "functions.sqrt", "variables.PI")
  visibility?: "public" | "private";
}

export interface JV_MImportedFile { 
  memoryRef: JV_MemoryState,
  file: FileInput,
  exportedSymbols: JV_ExportedSymbol[],
  defaultExport?: JV_ExportedSymbol; // separate handling for default
}

// <path, metadata>;
export type JV_MImports = Map<string, JV_MImportedFile> 

export type JV_MSymbolCache = Map<string, { source: string, value: any }>;

export interface JV_MemoryState {};
/*{
  imports: JV_MImports,
  variables: JV_MVariables,
  functions: JV_MFunctions,
  classes: JV_MClasses,
  stack: JV_MStack,
  heap: JV_MHeap,
  symbolCache: JV_MSymbolCache
};*/

export type JV_InstanceType = "process" | "sandbox";
export interface JV_Handlers {
  onError: WaiterListenerCallback,
  onWarning: ListenerCallback | null,
}
export interface JV_File {
  file: FileInput,
  ast: Program,
  memory: JV_MemoryState
};