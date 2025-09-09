
export enum ArithmeticOperators {
  PLUS = "+",
  MINUS = "-",
  MULTIPLY = "*",
  DIVIDE = "/"
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

export type OperatorType = ArithmeticOperators | ComparisonOperators | LogicalOperators;

import { TokenType } from './tokens';

export function tokenTypeToOperator(tokenType: TokenType): OperatorType | null {
  switch (tokenType) {
    case TokenType.PLUS: return ArithmeticOperators.PLUS;
    case TokenType.MINUS: return ArithmeticOperators.MINUS;
    case TokenType.ASTERISK: return ArithmeticOperators.MULTIPLY;
    case TokenType.SLASH: return ArithmeticOperators.DIVIDE;
    default: return null;
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
