import { BaseVisitor, Program, Visitor } from "./nodes";

type VoidVisitor = Visitor<void>;
export class SymbolCollector extends Visitor<void> {
    default: VoidVisitor["visitNumberLiteral"] = (node) => {
    }

    visitNumberLiteral: VoidVisitor["visitNumberLiteral"] = (node) => {
    }
  
    visitStringLiteral: VoidVisitor["visitStringLiteral"] = (node) => {
    }
}

export const SemanticVisitors = {
    SymbolCollector
} as const;