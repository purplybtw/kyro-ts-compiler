
export enum ArithmeticOperators {
  PLUS = "+",
  MINUS = "-",
  MULTIPLY = "*",
  DIVIDE = "/",
  MOD = "%",
  UNARY_PLUS = "+x",
  UNARY_MINUS = "-x"
}

export enum ComparisonOperators {
  EQUAL = "==",
  NOT_EQUAL = "!=",
  LESS_THAN = "<",
  GREATER_THAN = ">",
  LESS_EQUAL = "<=",
  GREATER_EQUAL = ">="
}

export enum LogicalOperators {
  AND = "&&",
  OR = "||",
  NOT = "!"
}

export enum BitwiseOperators {
  BIT_AND = "&",
  BIT_OR = "|",
  BIT_NOT = "~",
  BIT_XOR = "^",
  BIT_LSHIFT = "<<",
  BIT_RSHIFT = ">>",
  BIT_U_RSHIFT = ">>>"
}

export enum OtherOperators {
  INDEX = "[]",
  INCREMENT = "++",
  DECREMENT = "--"
}

export type OperatorType = ArithmeticOperators | ComparisonOperators | LogicalOperators | OtherOperators | BitwiseOperators;

import { Token, TokenType } from './tokens';

export function isOperator(token: Token): boolean {
  switch (token.type) {
    // Arithmetic operators
    case TokenType.PLUS:
    case TokenType.MINUS:
    case TokenType.ASTERISK:
    case TokenType.SLASH:
    case TokenType.MOD:
    // Comparison operators
    case TokenType.COMPARISON:
    // Logical operators
    case TokenType.LOGICAL_AND:
    case TokenType.LOGICAL_OR:
    case TokenType.LOGICAL_NOT:
    case TokenType.INCREMENT:
    case TokenType.DECREMENT:
    // Bitwise operators
    case TokenType.BIT_AND:
    case TokenType.BIT_OR:
    case TokenType.BIT_XOR:
    case TokenType.BIT_NOT:
    case TokenType.BIT_LSHIFT:
    case TokenType.BIT_RSHIFT:
    case TokenType.BIT_U_RSHIFT:
      return true;
    default:
      return false;
  }
}

export function comparisonValueToOperator(value: string): ComparisonOperators | null {
  switch (value) {
    case '==': return ComparisonOperators.EQUAL;
    case '!=': return ComparisonOperators.NOT_EQUAL;
    case '<': return ComparisonOperators.LESS_THAN;
    case '>': return ComparisonOperators.GREATER_THAN;
    case '<=': return ComparisonOperators.LESS_EQUAL;
    case '>=': return ComparisonOperators.GREATER_EQUAL;
    default: return null;
  }
}
