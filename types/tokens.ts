
export enum TokenType {
  IDENTIFIER = 'IDENTIFIER',
  KEYWORD = 'KEYWORD',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  COMMA = 'COMMA',
  SEMICOLON = 'SEMICOLON',
  COLON = 'COLON',
  ASSIGNMENT = 'ASSIGNMENT',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  MULTIPLY_ASSIGN = 'MULTIPLY_ASSIGN',
  DIVIDE_ASSIGN = 'DIVIDE_ASSIGN',
  COMPARISON = 'COMPARISON',
  ARROW = 'ARROW',
  PLUS = 'PLUS',
  MOD = 'MOD',
  MINUS = 'MINUS',
  BIT_AND = '&',
  BIT_OR = '|',
  BIT_XOR = '^',
  BIT_NOT = '~',
  BIT_LSHIFT = '<<',
  BIT_RSHIFT = '>>',
  BIT_U_RSHIFT = '>>>', // unsigned right bit shift
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
  ASTERISK = 'ASTERISK',
  SLASH = 'SLASH',
  DOT = 'DOT',
  LOGICAL_AND = 'LOGICAL_AND',
  LOGICAL_OR = 'LOGICAL_OR',
  LOGICAL_NOT = 'LOGICAL_NOT',
  QUESTION = 'QUESTION',
  UNKNOWN = 'UNKNOWN',
  EOF = 'EOF',
  PIPE_FORWARD = 'PIPE_FORWARD',
  DOT_DOT = 'DOT_DOT',
  DOT_DOT_DOT = 'DOT_DOT_DOT',
  NULL = "NULL",
  UNDEFINED = "UNDEFINED",
  NAN = "NAN",
}

export class Token {
  public type: TokenType;
  public value: string;
  public pos: number;
  public line: number;
  public col: number;

  constructor(type: TokenType, value: string, pos: number, line: number, col: number) {
    this.type = type;
    this.value = value;
    this.pos = pos;
    this.line = line;
    this.col = col;
  }

  toString(): string {
    return String(this.value);
  }
}
