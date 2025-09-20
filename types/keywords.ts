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
  BOOL = "bool"
}

export enum Structures {
  CLASS = "class",
  TYPE = "type",
  NEW = "new",
  ASYNC = "async",
  AWAIT = "await",
  MATCH = "match",
  CHECK = "check",
  FUNC = "func",
  IMPLEMENTS = "implements",
  EXTENDS = "extends",
  PRIVATE = "private",
  PUBLIC = "public",
  STATIC = "static",
  PROTECTED = "protected",
  READONLY = "readonly",
  FINAL = "final",
  ABSTRACT = "abstract",
  THIS = "this"
}

export enum Others {
  VOID = "void",
  CONST = "const",
  NULL = "null",
  AS = "as",
  INFER = "infer",
  UNDEFINED = "undefined",
  OPERATOR = "operator"
}

export const KEYWORDS = [
  ...Object.values(DataTypes),
  ...Object.values(ControlFlow),
  ...Object.values(Structures),
  ...Object.values(Others)
] as const;

export type Keyword = typeof KEYWORDS[number];

export interface Keywords {
  ControlFlow: typeof ControlFlow;
  DataTypes: typeof DataTypes;
  Structures: typeof Structures;
  Others: typeof Others;
}