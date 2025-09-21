
export enum ArithmeticOperators {
  PLUS = "+",
  MINUS = "-",
  MULTIPLY = "*",
  DIVIDE = "/",
  MOD = "%"
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

export function tokenToOperator(
  token: Token,
  next: Token,
  next_next: Token
): OperatorType | null {
  switch (token.type) {
    // Arithmetic
    case TokenType.PLUS:
      return ArithmeticOperators.PLUS;
    case TokenType.MINUS:
      return ArithmeticOperators.MINUS;
    case TokenType.ASTERISK:
      return ArithmeticOperators.MULTIPLY;
    case TokenType.SLASH:
      return ArithmeticOperators.DIVIDE;
    case TokenType.MOD:
      return ArithmeticOperators.MOD;

    // Comparison (must check token.value)
    case TokenType.COMPARISON:
      switch (token.value) {
        case "==": return ComparisonOperators.EQUAL;
        case "!=": return ComparisonOperators.NOT_EQUAL;
        case "<":  return ComparisonOperators.LESS_THAN;
        case ">":  return ComparisonOperators.GREATER_THAN;
        case "<=": return ComparisonOperators.LESS_EQUAL;
        case ">=": return ComparisonOperators.GREATER_EQUAL;
        default: return null;
      }

    // Logical
    case TokenType.LOGICAL_AND:
      return LogicalOperators.AND;
    case TokenType.LOGICAL_OR:
      return LogicalOperators.OR;
    case TokenType.LOGICAL_NOT:
      return LogicalOperators.NOT;

    // Bitwise
    case TokenType.BIT_AND:
      return BitwiseOperators.BIT_AND;
    case TokenType.BIT_OR:
      return BitwiseOperators.BIT_OR;
    case TokenType.BIT_XOR:
      return BitwiseOperators.BIT_XOR;
    case TokenType.BIT_NOT:
      return BitwiseOperators.BIT_NOT;
    case TokenType.BIT_LSHIFT:
      return BitwiseOperators.BIT_LSHIFT;
    case TokenType.BIT_RSHIFT:
      return BitwiseOperators.BIT_RSHIFT;
    case TokenType.BIT_U_RSHIFT:
      return BitwiseOperators.BIT_U_RSHIFT;

    // Other
    case TokenType.INCREMENT:
      return OtherOperators.INCREMENT;
    case TokenType.DECREMENT:
      return OtherOperators.DECREMENT;
    case TokenType.LBRACKET:
      if (next?.type === TokenType.RBRACKET) {
        return OtherOperators.INDEX;
      }
      return null;

    default:
      return null;
  }
}

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
