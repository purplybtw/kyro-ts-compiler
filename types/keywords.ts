export enum ControlFlow {
  IF = "if",
  ELIF = "elif",
  ELSE = "else",
  FOR = "for",
  WHILE = "while",
  RETURN = "return",
  BREAK = "break",
  CONTINUE = "continue",
  TRY = "try",
  CATCH = "catch",
  THROW = "throw",
  FINALLY = "finally",
  SWITCH = "switch",
  CASE = "case",
  DEFAULT = "default"
}

export enum DataTypes {
  INT = "int",
  FLOAT = "float",
  CHAR = "char",
  BOOL = "bool",
  VOID = "void",
  INFER = "infer",
}

export enum Structures {
  CLASS = "class",
  TYPE = "type",
  NEW = "new",
  MATCH = "match",
  CHECK = "check",
  FUNC = "func",
  IMPLEMENTS = "implements",
  EXTENDS = "extends",
  PRIVATE = "private",
  PUBLIC = "public",
  STATIC = "static",
  OPERATOR = "operator",
  PROTECTED = "protected",
  READONLY = "readonly",
  FINAL = "final",
  ABSTRACT = "abstract",
  THIS = "this"
}

export enum Others {
  CONST = "const",
  AS = "as",
  IMPORT = "import",
  FROM = "from"
}

export enum Execution {
  ASYNC = "async",
  AWAIT = "await"
}

export const KEYWORDS = [
  ...Object.values(DataTypes),
  ...Object.values(ControlFlow),
  ...Object.values(Structures),
  ...Object.values(Others),
  ...Object.values(Execution)
] as const;

export type Keyword = typeof KEYWORDS[number];

export interface Keywords {
  ControlFlow: typeof ControlFlow;
  DataTypes: typeof DataTypes;
  Structures: typeof Structures;
  Others: typeof Others;
}