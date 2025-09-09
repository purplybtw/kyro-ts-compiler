# General TODO

1. Finish parser
2. Build Semantic Analyzer
3. Build interpreter with the visitors API
4. Integrate testing framework
5. Build the JSE (Javon Sandbox Environment)
6. Build Javon LSP

## Parser

1. Implement parsers:
- TRY = "try",
- CATCH = "catch",
- THROW = "throw",
- FINALLY = "finally",
- SWITCH = "switch",
- CASE = "case",
- DEFAULT = "default",
- CLASS = "class"
- Allow function and operator overloading in AST structure.

if (current.value === ControlFlow.TRY) {
  return this.parseTryStatement();
}
if (current.value === ControlFlow.THROW) {
  return this.parseThrowStatement();
}
if (current.value === ControlFlow.CLASS) {
  return this.parseClassStatement();
}
if (current.value === ControlFlow.SWITCH) {
  return this.parseSwitchStatement();
}