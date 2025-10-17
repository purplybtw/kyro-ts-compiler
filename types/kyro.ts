import { FileInput, WaiterListenerCallback } from '../util/errors';
import { ListenerCallback } from '../util/warnings';
import { Program } from '../ast/nodes';

export type MemoryType = "variable" | "function" | "class" | "object"
// no types because they will be classes under the hood

export interface ExportedSymbol {
  name: string;
  alias?: string;
  type: MemoryType;
  memoryLocation: string; // path in memory (e.g., "functions.sqrt", "variables.PI")
  visibility?: "public" | "private";
}

export interface ImportedFile { 
  memoryRef: MemoryState,
  file: FileInput,
  exportedSymbols: ExportedSymbol[],
  defaultExport?: ExportedSymbol; // separate handling for default
}

// <path, metadata>;
export type Imports = Map<string, ImportedFile> 

export type SymbolCache = Map<string, { source: string, value: any }>;

export interface MemoryState {};
/*{
  imports: JV_MImports,
  variables: JV_MVariables,
  functions: JV_MFunctions,
  classes: JV_MClasses,
  stack: JV_MStack,
  heap: JV_MHeap,
  symbolCache: JV_MSymbolCache
};*/

export type InstanceType = "process" | "sandbox";
export interface Handlers {
  onError: WaiterListenerCallback,
  onWarning: ListenerCallback | null,
}
export interface File {
  file: FileInput,
  ast: Program,
  memory: MemoryState
};