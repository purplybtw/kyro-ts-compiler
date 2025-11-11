import { Structures } from "../types/keywords";
import { OperatorType } from "../types/operators";

export abstract class Visitor<T> implements BaseVisitor<T> {
  abstract default(node: Node): T;

  visitNode(node: Node): T {
    switch (node.type) {
        case "NumberLiteral": return this.visitNumberLiteral(node as NumberLiteral);
        case "StringLiteral": return this.visitStringLiteral(node as StringLiteral);
        case "BooleanLiteral": return this.visitBooleanLiteral(node as BooleanLiteral);
        case "Identifier": return this.visitIdentifier(node as Identifier);
        case "BinaryExpression": return this.visitBinaryExpression(node as BinaryExpression);
        case "LogicalExpression": return this.visitLogicalExpression(node as LogicalExpression);
        case "ConditionalExpression": return this.visitConditionalExpression(node as ConditionalExpression);
        case "UnaryExpression": return this.visitUnaryExpression(node as UnaryExpression);
        case "UpdateExpression": return this.visitUpdateExpression(node as UpdateExpression);
        case "CallExpression": return this.visitCallExpression(node as CallExpression);
        case "MemberExpression": return this.visitMemberExpression(node as MemberExpression);
        case "ArrayExpression": return this.visitArrayExpression(node as ArrayExpression);
        case "VariableDeclaration": return this.visitVariableDeclaration(node as VariableDeclaration);
        case "Assignment": return this.visitAssignment(node as Assignment);
        case "ExpressionStatement": return this.visitExpressionStatement(node as ExpressionStatement);
        case "Block": return this.visitBlock(node as Block);
        case "IfStatement": return this.visitIfStatement(node as IfStatement);
        case "ElseIfStatement": return this.visitElseIfStatement(node as ElseIfStatement);
        case "WhileStatement": return this.visitWhileStatement(node as WhileStatement);
        case "ForStatement": return this.visitForStatement(node as ForStatement);
        case "ReturnStatement": return this.visitReturnStatement(node as ReturnStatement);
        case "BreakStatement": return this.visitBreakStatement(node as BreakStatement);
        case "ContinueStatement": return this.visitContinueStatement(node as ContinueStatement);
        case "FunctionDeclaration": return this.visitFunctionDeclaration(node as FunctionDeclaration);
        case "StructDeclaration": return this.visitStructDeclaration(node as StructDeclaration);
        case "Parameter": return this.visitParameter(node as Parameter);
        case "TypeReference": return this.visitTypeReference(node as TypeReference);
        case "ArrayType": return this.visitArrayType(node as ArrayType);
        case "UnionType": return this.visitUnionType(node as UnionType);
        case "IntersectionType": return this.visitIntersectionType(node as IntersectionType);
        case "Program": return this.visitProgram(node as Program);
        case "NewExpression": return this.visitNewExpression(node as NewExpression);
        case "ObjectExpression": return this.visitObjectExpression(node as ObjectExpression);
        case "Property": return this.visitProperty(node as Property);
        case "MatchExpression": return this.visitMatchExpression(node as MatchExpression);
        case "MatchArm": return this.visitMatchArm(node as MatchArm);
        case "SwitchStatement": return this.visitSwitchStatement(node as SwitchStatement);
        case "SwitchCase": return this.visitSwitchCase(node as SwitchCase);
        case "LiteralPattern": return this.visitLiteralPattern(node as LiteralPattern);
        case "RangePattern": return this.visitRangePattern(node as RangePattern);
        case "IdentifierPattern": return this.visitIdentifierPattern(node as IdentifierPattern);
        case "BindingPattern": return this.visitBindingPattern(node as BindingPattern);
        case "GuardedPattern": return this.visitGuardedPattern(node as GuardedPattern);
        case "CheckExpression": return this.visitCheckExpression(node as CheckExpression);
        case "CheckComparison": return this.visitCheckComparison(node as CheckComparison);
        case "RangeExpression": return this.visitRangeExpression(node as RangeExpression);
        case "InferType": return this.visitInferType(node as InferType);
        case "VoidType": return this.visitVoidType(node as VoidType);
        case "ThrowStatement": return this.visitThrowStatement(node as ThrowStatement);
        case "TryStatement": return this.visitTryStatement(node as TryStatement);
        case "CatchClause": return this.visitCatchClause(node as CatchClause);
        case "FinallyClause": return this.visitFinallyClause(node as FinallyClause);
        case "ClassDeclaration": return this.visitClassDeclaration(node as ClassDeclaration);
        case "MethodDefinition": return this.visitMethodDefinition(node as MethodDefinition);
        case "PropertyDefinition": return this.visitPropertyDefinition(node as PropertyDefinition);
        case "Constructor": return this.visitConstructor(node as Constructor);
        case "Super": return this.visitSuper(node as Super);
        case "ThisReference": return this.visitThisReference(node as ThisReference);
        case "WildcardPattern": return this.visitWildcardPattern(node as WildcardPattern);
        case "MemberPattern": return this.visitMemberPattern(node as MemberPattern);
        case "OperatorDefinition": return this.visitOperatorDefinition(node as OperatorDefinition);
        case "AwaitExpression": return this.visitAwaitExpression(node as AwaitExpression);
        case "ImportDeclaration": return this.visitImportDeclaration(node as ImportDeclaration);
        case "UndefinedLiteral": return this.visitUndefinedLiteral(node as UndefinedLiteral);
        case "NaNLiteral": return this.visitNaNLiteral(node as NaNLiteral);
        case "NullLiteral": return this.visitNullLiteral(node as NullLiteral);
        case "IsExpression": return this.visitIsExpression(node as IsExpression);
        default: return this.default(node); // fallback for unhandled nodes
    }
  }
  traverse(program: Program): void {
    const visitChildren = (node: Node) => {
      this.visitNode(node);

      for (const key in node) {
        const value = (node as any)[key];

        if (value instanceof Node) {
          visitChildren(value);
        } else if (Array.isArray(value)) {
          value.forEach(v => v instanceof Node && visitChildren(v));
        }
      }
    };

    visitChildren(program);
  }
  visitNumberLiteral(node: NumberLiteral): T { return this.default(node); }
  visitStringLiteral(node: StringLiteral): T { return this.default(node); }
  visitBooleanLiteral(node: BooleanLiteral): T { return this.default(node); }
  visitIdentifier(node: Identifier): T { return this.default(node); }
  visitBinaryExpression(node: BinaryExpression): T { return this.default(node); }
  visitLogicalExpression(node: LogicalExpression): T { return this.default(node); }
  visitConditionalExpression(node: ConditionalExpression): T { return this.default(node); }
  visitUnaryExpression(node: UnaryExpression): T { return this.default(node); }
  visitUpdateExpression(node: UpdateExpression): T { return this.default(node); }
  visitCallExpression(node: CallExpression): T { return this.default(node); }
  visitMemberExpression(node: MemberExpression): T { return this.default(node); }
  visitArrayExpression(node: ArrayExpression): T { return this.default(node); }
  visitVariableDeclaration(node: VariableDeclaration): T { return this.default(node); }
  visitAssignment(node: Assignment): T { return this.default(node); }
  visitExpressionStatement(node: ExpressionStatement): T { return this.default(node); }
  visitBlock(node: Block): T { return this.default(node); }
  visitIfStatement(node: IfStatement): T { return this.default(node); }
  visitElseIfStatement(node: ElseIfStatement): T { return this.default(node); }
  visitWhileStatement(node: WhileStatement): T { return this.default(node); }
  visitForStatement(node: ForStatement): T { return this.default(node); }
  visitReturnStatement(node: ReturnStatement): T { return this.default(node); }
  visitBreakStatement(node: BreakStatement): T { return this.default(node); }
  visitContinueStatement(node: ContinueStatement): T { return this.default(node); }
  visitFunctionDeclaration(node: FunctionDeclaration): T { return this.default(node); }
  visitStructDeclaration(node: StructDeclaration): T { return this.default(node); }
  visitParameter(node: Parameter): T { return this.default(node); }
  visitTypeReference(node: TypeReference): T { return this.default(node); }
  visitArrayType(node: ArrayType): T { return this.default(node); }
  visitProgram(node: Program): T { return this.default(node); }
  visitNewExpression(node: NewExpression): T { return this.default(node); }
  visitObjectExpression(node: ObjectExpression): T { return this.default(node); }
  visitProperty(node: Property): T { return this.default(node); }
  visitUnionType(node: UnionType): T { return this.default(node); }
  visitIntersectionType(node: IntersectionType): T { return this.default(node); }
  visitMatchExpression(node: MatchExpression): T { return this.default(node); }
  visitMatchArm(node: MatchArm): T { return this.default(node); }
  visitSwitchStatement(node: SwitchStatement): T { return this.default(node); }
  visitSwitchCase(node: SwitchCase): T { return this.default(node); }
  visitLiteralPattern(node: LiteralPattern): T { return this.default(node); }
  visitRangePattern(node: RangePattern): T { return this.default(node); }
  visitIdentifierPattern(node: IdentifierPattern): T { return this.default(node); }
  visitBindingPattern(node: BindingPattern): T { return this.default(node); }
  visitMemberPattern(node: MemberPattern): T { return this.default(node); }
  visitWildcardPattern(node: WildcardPattern): T { return this.default(node); }
  visitGuardedPattern(node: GuardedPattern): T { return this.default(node); }
  visitCheckExpression(node: CheckExpression): T { return this.default(node); }
  visitCheckComparison(node: CheckComparison): T { return this.default(node); }
  visitRangeExpression(node: RangeExpression): T { return this.default(node); }
  visitThrowStatement(node: ThrowStatement): T { return this.default(node); }
  visitTryStatement(node: TryStatement): T { return this.default(node); }
  visitCatchClause(node: CatchClause): T { return this.default(node); }
  visitFinallyClause(node: FinallyClause): T { return this.default(node); }
  visitClassDeclaration(node: ClassDeclaration): T { return this.default(node); }
  visitMethodDefinition(node: MethodDefinition): T { return this.default(node); }
  visitPropertyDefinition(node: PropertyDefinition): T { return this.default(node); }
  visitConstructor(node: Constructor): T { return this.default(node); }
  visitSuper(node: Super): T { return this.default(node); }
  visitInferType(node: InferType): T { return this.default(node); }
  visitVoidType(node: VoidType): T { return this.default(node); }
  visitThisReference(node: ThisReference): T { return this.default(node); }
  visitOperatorDefinition(node: OperatorDefinition): T { return this.default(node); }
  visitNullLiteral(node: NullLiteral): T { return this.default(node); }
  visitUndefinedLiteral(node: UndefinedLiteral): T { return this.default(node); }
  visitNaNLiteral(node: NaNLiteral): T { return this.default(node); }
  visitAwaitExpression(node: AwaitExpression): T { return this.default(node); }
  visitImportDeclaration(node: ImportDeclaration): T { return this.default(node); }
  visitIsExpression(node: IsExpression): T { return this.default(node); }
}
export interface BaseVisitor<T> {
  visitNumberLiteral(node: NumberLiteral): T
  visitStringLiteral(node: StringLiteral): T
  visitBooleanLiteral(node: BooleanLiteral): T
  visitIdentifier(node: Identifier): T
  visitBinaryExpression(node: BinaryExpression): T
  visitIsExpression(node: IsExpression): T
  visitLogicalExpression(node: LogicalExpression): T
  visitConditionalExpression(node: ConditionalExpression): T
  visitUnaryExpression(node: UnaryExpression): T
  visitUpdateExpression(node: UpdateExpression): T
  visitCallExpression(node: CallExpression): T
  visitMemberExpression(node: MemberExpression): T
  visitArrayExpression(node: ArrayExpression): T
  visitVariableDeclaration(node: VariableDeclaration): T
  visitAssignment(node: Assignment): T
  visitExpressionStatement(node: ExpressionStatement): T
  visitBlock(node: Block): T
  visitIfStatement(node: IfStatement): T
  visitElseIfStatement(node: ElseIfStatement): T
  visitWhileStatement(node: WhileStatement): T
  visitForStatement(node: ForStatement): T
  visitReturnStatement(node: ReturnStatement): T
  visitBreakStatement(node: BreakStatement): T
  visitContinueStatement(node: ContinueStatement): T
  visitFunctionDeclaration(node: FunctionDeclaration): T
  visitStructDeclaration(node: StructDeclaration): T
  visitParameter(node: Parameter): T
  visitTypeReference(node: TypeReference): T
  visitArrayType(node: ArrayType): T
  visitProgram(node: Program): T
  visitNewExpression(node: NewExpression): T
  visitObjectExpression(node: ObjectExpression): T
  visitProperty(node: Property): T
  visitUnionType(node: UnionType): T
  visitIntersectionType(node: IntersectionType): T
  visitMatchExpression(node: MatchExpression): T
  visitMatchArm(node: MatchArm): T
  visitSwitchStatement(node: SwitchStatement): T
  visitSwitchCase(node: SwitchCase): T
  visitLiteralPattern(node: LiteralPattern): T
  visitRangePattern(node: RangePattern): T
  visitIdentifierPattern(node: IdentifierPattern): T
  visitBindingPattern(node: BindingPattern): T
  visitMemberPattern(node: MemberPattern): T
  visitWildcardPattern(node: WildcardPattern): T
  visitGuardedPattern(node: GuardedPattern): T
  visitCheckExpression(node: CheckExpression): T
  visitCheckComparison(node: CheckComparison): T
  visitRangeExpression(node: RangeExpression): T
  visitInferType(node: InferType): T
  visitThrowStatement(node: ThrowStatement): T
  visitTryStatement(node: TryStatement): T
  visitCatchClause(node: CatchClause): T
  visitFinallyClause(node: FinallyClause): T
  visitClassDeclaration(node: ClassDeclaration): T
  visitMethodDefinition(node: MethodDefinition): T
  visitPropertyDefinition(node: PropertyDefinition): T
  visitVoidType(node: VoidType): T
  visitThisReference(node: ThisReference): T
  visitConstructor(node: Constructor): T
  visitSuper(node: Super): T
  visitOperatorDefinition(node: OperatorDefinition): T
  visitNumberLiteral(node: NumberLiteral): T
  visitOperatorDefinition(node: OperatorDefinition): T
  visitNullLiteral(node: NullLiteral): T
  visitUndefinedLiteral(node: UndefinedLiteral): T
  visitNaNLiteral(node: NaNLiteral): T
  visitAwaitExpression(node: AwaitExpression): T
  visitImportDeclaration(node: ImportDeclaration): T
}

export class SourceLocation {
  constructor(
    public pos: number,
    public line: number,
    public col: number
  ) {}
}

export function buildSourceLocation(pos: number, line: number, col: number): SourceLocation {
  return new SourceLocation(pos, line, col)
}

export abstract class Node {
  constructor(public loc: SourceLocation) {}
  abstract type: NodeType
  abstract accept<T>(visitor: BaseVisitor<T>): T
}

export class NumberLiteral extends Node {
  type = "NumberLiteral" as const
  constructor(loc: SourceLocation, public value: number) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitNumberLiteral(this)
  }
}

export class StringLiteral extends Node {
  type = "StringLiteral" as const
  constructor(loc: SourceLocation, public value: string) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitStringLiteral(this)
  }
}

export class BooleanLiteral extends Node {
  type = "BooleanLiteral" as const
  constructor(loc: SourceLocation, public value: boolean) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitBooleanLiteral(this)
  }
}

export class Identifier extends Node {
  type = "Identifier" as const
  constructor(loc: SourceLocation, public name: string) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitIdentifier(this)
  }
}

export class BinaryExpression extends Node {
  type = "BinaryExpression" as const
  constructor(loc: SourceLocation, public left: Node, public operator: string, public right: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitBinaryExpression(this)
  }
}

export class LogicalExpression extends Node {
  type = "LogicalExpression" as const
  constructor(loc: SourceLocation, public left: Node, public operator: string, public right: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitLogicalExpression(this)
  }
}

export class ConditionalExpression extends Node {
  type = "ConditionalExpression" as const
  constructor(loc: SourceLocation, public test: Node, public consequent: Node, public alternate: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitConditionalExpression(this)
  }
}

export class UnaryExpression extends Node {
  type = "UnaryExpression" as const
  constructor(loc: SourceLocation, public operator: string, public operand: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitUnaryExpression(this)
  }
}

export class UpdateExpression extends Node {
  type = "UpdateExpression" as const
  constructor(loc: SourceLocation, public operator: string, public operand: Node, public prefix: boolean) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitUpdateExpression(this)
  }
}

export class CallExpression extends Node {
  type = "CallExpression" as const
  constructor(loc: SourceLocation, public callee: Node, public generics: TypeReference[], public args: Node[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitCallExpression(this)
  }
}

export class MemberExpression extends Node {
  type = "MemberExpression" as const
  constructor(loc: SourceLocation, public object: Node, public property: Node, public computed: boolean) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitMemberExpression(this)
  }
}

export class ArrayExpression extends Node {
  type = "ArrayExpression" as const
  constructor(loc: SourceLocation, public elements: Node[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitArrayExpression(this)
  }
}

export class VariableDeclaration extends Node {
  type = "VariableDeclaration" as const
  constructor(loc: SourceLocation, public isConstant: boolean, public varType: TypeReference | InferType | ArrayType | NullLiteral | UndefinedLiteral, public identifiers: Identifier[], public initializer?: Node) {
    super(loc)
  }

  get identifier(): Identifier {
    return this.identifiers[0];
  }

  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitVariableDeclaration(this)
  }
}

export class Assignment extends Node {
  type = "Assignment" as const
  constructor(loc: SourceLocation, public left: Identifier | MemberExpression | ArrayExpression, public right: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitAssignment(this)
  }
}

export class ExpressionStatement extends Node {
  type = "ExpressionStatement" as const
  constructor(loc: SourceLocation, public expression: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitExpressionStatement(this)
  }
}

export class ThrowStatement extends Node {
  type = "ThrowStatement" as const
  constructor(loc: SourceLocation, public expression: NewExpression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitThrowStatement(this)
  }
}

export class TryStatement extends Node {
  type = "TryStatement" as const
  constructor(loc: SourceLocation, public body: Block, public catchClauses: CatchClause[], public finallyClause: FinallyClause) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitTryStatement(this)
  }
}

export class CatchClause extends Node {
  type = "CatchClause" as const
  constructor(loc: SourceLocation, public paramType: TypeReference, public param: Identifier, public body: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitCatchClause(this)
  }
}

export class FinallyClause extends Node {
  type = "FinallyClause" as const
  constructor(loc: SourceLocation, public body: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitFinallyClause(this)
  }
}

export class Block extends Node {
  type = "Block" as const
  constructor(loc: SourceLocation, public statements: Node[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitBlock(this)
  }
}

export class IfStatement extends Node {
  type = "IfStatement" as const
  constructor(loc: SourceLocation, public condition: Node, public thenBranch: Block, public elifBranches?: ElseIfStatement[], public elseBranch?: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitIfStatement(this)
  }
}

export class ElseIfStatement extends Node {
  type = "ElseIfStatement" as const
  constructor(loc: SourceLocation, public condition: Node, public thenBranch: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitElseIfStatement(this)
  }
}

export class WhileStatement extends Node {
  type = "WhileStatement" as const
  constructor(loc: SourceLocation, public condition: Node, public body: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitWhileStatement(this)
  }
}

export class ForStatement extends Node {
  type = "ForStatement" as const
  constructor(loc: SourceLocation, public init?: VariableDeclaration, public condition?: Expression, public update?: UpdateExpression | Assignment, public body?: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitForStatement(this)
  }
}

export class ReturnStatement extends Node {
  type = "ReturnStatement" as const
  constructor(loc: SourceLocation, public argument?: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitReturnStatement(this)
  }
}

export class BreakStatement extends Node {
  type = "BreakStatement" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitBreakStatement(this)
  }
}

export class ContinueStatement extends Node {
  type = "ContinueStatement" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitContinueStatement(this)
  }
}

export class FunctionDeclaration extends Node {
  type = "FunctionDeclaration" as const
  constructor(loc: SourceLocation, public returnType: TypeReference | ArrayType | VoidType | NullLiteral | UndefinedLiteral, public identifier: Identifier, public parameters: Parameter[], public body: Block, public generics: TypeReference[] = []) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitFunctionDeclaration(this)
  }
}

export class StructDeclaration extends Node {
  type = "StructDeclaration" as const
  constructor(loc: SourceLocation, public identifier: Identifier, public fields: {identifier: Identifier, type: TypeReference | ArrayType, initializer?: Node}[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitStructDeclaration(this)
  }
}

export class Parameter extends Node {
  type = "Parameter" as const
  constructor(loc: SourceLocation, public identifier: Identifier, public paramType: TypeReference | ArrayType, public isRest: boolean) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitParameter(this)
  }
}

export class NullLiteral extends Node {
  type = "NullLiteral" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitNullLiteral(this)
  }
}

export class UndefinedLiteral extends Node {
  type = "UndefinedLiteral" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitUndefinedLiteral(this)
  }
}

export class NaNLiteral extends Node {
  type = "NaNLiteral" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitNaNLiteral(this)
  }
}

export class AwaitExpression extends Node {
  type = "AwaitExpression" as const
  constructor(loc: SourceLocation, public expression: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitAwaitExpression(this)
  }
}

export interface ImportSpecifier {
  importedName: Identifier  // what the module exports
  localName: Identifier | null     // how it’s used locally
}

export class ImportDeclaration extends Node {
  type = "ImportDeclaration" as const
  constructor(
    loc: SourceLocation,
    public isNative: boolean,
    public defaultImport: Identifier | "*" | null,
    public namedImports: ImportSpecifier[],
    public source: StringLiteral
  ) {
    super(loc)
  }

  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitImportDeclaration(this)
  }
}

export enum TypeReferenceKind {
  CLASS = "class",
  INTERFACE = "interface",
  TYPE = "type",
  PRIMITIVE = "primitive",
  ANY = "any"
}

export class TypeReference extends Node {
  type = "TypeReference" as const
  constructor(loc: SourceLocation, public name: string, public generics: TypeReference[], public kind: TypeReferenceKind) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitTypeReference(this)
  }
}

export class ArrayType extends Node {
  type = "ArrayType" as const
  constructor(loc: SourceLocation, public elementType: TypeReference | ArrayType) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitArrayType(this)
  }
}

export class UnionType extends Node {
  type = "UnionType" as const
  constructor(loc: SourceLocation, public left: TypeReference, public right: TypeReference) {
    super(loc);
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitUnionType(this);
  }
}

export class IntersectionType extends Node {
  type = "IntersectionType" as const
  constructor(loc: SourceLocation, public left: TypeReference, public right: TypeReference) {
    super(loc);
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitIntersectionType(this);
  }
}

interface ProgramMetadata {
  defaultMemberPtr: number | undefined,
  exportMembersPtr: number[],
}

export class Program extends Node {
  type = "Program" as const
  constructor(loc: SourceLocation, public body: Node[], public imports: ImportDeclaration[], public metadata: ProgramMetadata) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitProgram(this)
  }
}

export class NewExpression extends Node {
  type = "NewExpression" as const
  constructor(loc: SourceLocation, public callee: Node, public args: Node[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitNewExpression(this)
  }
}

export class ObjectExpression extends Node {
  type = "ObjectExpression" as const
  constructor(loc: SourceLocation, public properties: Property[]) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitObjectExpression(this)
  }
}

export class Property extends Node {
  type = "Property" as const
  constructor(loc: SourceLocation, public key: Identifier, public value: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitProperty(this)
  }
}

export class MatchExpression extends Node {
  type = "MatchExpression" as const
  constructor(loc: SourceLocation, public scrutinee: Expression, public arms: MatchArm[], public defaultArm?: Expression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitMatchExpression(this)
  }
}

export class MatchArm extends Node {
  type = "MatchArm" as const
  constructor(loc: SourceLocation, public pattern: Pattern, public consequence: Expression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitMatchArm(this)
  }
}

export class SwitchStatement extends Node {
  type = "SwitchStatement" as const
  constructor(loc: SourceLocation, public scrutinee: Expression, public cases: SwitchCase[], public defaultCase?: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitSwitchStatement(this)
  }
}

export class SwitchCase extends Node {
  type = "SwitchCase" as const
  constructor(loc: SourceLocation, public patterns: Pattern[], public body: Block) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitSwitchCase(this)
  }
}

export abstract class Pattern extends Node {
  constructor(loc: SourceLocation) {
    super(loc)
  }
}

export class LiteralPattern extends Pattern {
  type = "LiteralPattern" as const
  constructor(loc: SourceLocation, public value: NumberLiteral | StringLiteral | BooleanLiteral) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitLiteralPattern(this)
  }
}

export class MemberPattern extends Pattern {
  type = "MemberPattern" as const
  constructor(loc: SourceLocation, public object: Node, public property: Node) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitMemberPattern(this)
  }
}

export class WildcardPattern extends Pattern {
  type = "WildcardPattern" as const;
  constructor(loc: SourceLocation) {
    super(loc);
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitWildcardPattern(this);
  }
}

export class RangePattern extends Pattern {
  type = "RangePattern" as const
  constructor(loc: SourceLocation, public start: NumberLiteral, public end: NumberLiteral) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitRangePattern(this)
  }
}

export class IdentifierPattern extends Pattern {
  type = "IdentifierPattern" as const
  constructor(loc: SourceLocation, public identifier: Identifier) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitIdentifierPattern(this)
  }
}

export class BindingPattern extends Pattern {
  type = "BindingPattern" as const
  constructor(loc: SourceLocation, public identifier: Identifier) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitBindingPattern(this)
  }
}

export class GuardedPattern extends Pattern {
  type = "GuardedPattern" as const
  constructor(loc: SourceLocation, public pattern: Pattern, public guard: Expression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitGuardedPattern(this)
  }
}

export class CheckExpression extends Node {
  type = "CheckExpression" as const
  constructor(loc: SourceLocation, public subject: Expression, public checks: CheckComparison[], public any: boolean = false) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitCheckExpression(this)
  }
}

export class CheckComparison extends Node {
  type = "CheckComparison" as const
  constructor(loc: SourceLocation, public operator: string, public value: Expression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitCheckComparison(this)
  }
}

export class RangeExpression extends Node {
  type = "RangeExpression" as const
  constructor(loc: SourceLocation, public start: Expression, public end: Expression) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitRangeExpression(this)
  }
}

export class InferType extends Node {
  type = "InferType" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitInferType(this)
  }
}

export class VoidType extends Node {
  type = "VoidType" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitVoidType(this)
  }
}

export class ThisReference extends Node {
  type = "ThisReference" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitThisReference(this)
  }
}

export class ClassDeclaration extends Node {
  type = "ClassDeclaration" as const
  constructor(
    loc: SourceLocation, 
    public modifiers: Modifiers,
    public identifier: Identifier, 
    public extending: TypeReference | null, 
    public interfaces: TypeReference[], 
    public ctor: Constructor | null,
    public properties: PropertyDefinition[] = [],
    public methods: MethodDefinition[] = [],
    public operators: OperatorDefinition[] = [],
  ) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitClassDeclaration(this)
  }
}

export abstract class ClassMember extends Node {
  constructor(loc: SourceLocation, public modifiers: Modifiers) {
    super(loc)
  }
}

export class MethodDefinition extends ClassMember {
  type = "MethodDefinition" as const
  constructor(
    loc: SourceLocation, 
    public modifiers: Modifiers, 
    public identifier: Identifier, 
    public generics: TypeReference[],
    public parameters: Parameter[], 
    public returnType: TypeReference | ArrayType | VoidType | NullLiteral | UndefinedLiteral,
    public body: Block
  ) {
    super(loc, modifiers)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitMethodDefinition(this)
  }
}

export class OperatorDefinition extends ClassMember {
  type = "OperatorDefinition" as const;
  constructor(
    loc: SourceLocation,
    public modifiers: Modifiers,
    public operator: OperatorType,
    public parameters: Parameter[],
    public returnType: TypeReference | ArrayType,
    public body: Block
  ) {
    super(loc, modifiers);
  }

  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitOperatorDefinition(this);
  }
}

export class PropertyDefinition extends ClassMember {
  type = "PropertyDefinition" as const
  constructor(
    loc: SourceLocation, 
    public modifiers: Modifiers,
    public varType: TypeReference | ArrayType | InferType | NullLiteral | UndefinedLiteral, 
    public identifier: Identifier, 
    public initializer?: Node,
  ) {
    super(loc, modifiers)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitPropertyDefinition(this)
  }
}

export class Constructor extends ClassMember {
  type = "Constructor" as const
  constructor(
    loc: SourceLocation, 
    public modifiers: Modifiers,
    public parameters: Parameter[], 
    public body: Block,
  ) {
    super(loc, modifiers)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitConstructor(this)
  }
}

export class Super extends Node {
  type = "Super" as const
  constructor(loc: SourceLocation) {
    super(loc)
  }
  accept<T>(visitor: BaseVisitor<T>): T {
    return visitor.visitSuper(this)
  }
}

class IsExpression extends Node {
  type = "IsExpression" as const;
  constructor(
    public expression: Node,
    public mode: "any" | "all" | "none",
    public values: Identifier | ArrayExpression
  ) { super(expression.loc); }

  accept<T>(visitor: Visitor<T>): T {
    return visitor.visitIsExpression(this);
  }
}

export const Nodes = {
  NumberLiteral,
  StringLiteral,
  BooleanLiteral,
  Identifier,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
  UnaryExpression,
  UpdateExpression,
  CallExpression,
  MemberExpression,
  ArrayExpression,
  VariableDeclaration,
  Assignment,
  ExpressionStatement,
  Block,
  IfStatement,
  ElseIfStatement,
  WhileStatement,
  ForStatement,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  FunctionDeclaration,
  StructDeclaration,
  Parameter,
  TypeReference,
  ArrayType,
  UnionType,
  IntersectionType,
  Program,
  NewExpression,
  ObjectExpression,
  Property,
  MatchExpression,
  MatchArm,
  SwitchStatement,
  SwitchCase,
  Pattern,
  LiteralPattern,
  RangePattern,
  IdentifierPattern,
  BindingPattern,
  GuardedPattern,
  CheckExpression,
  CheckComparison,
  RangeExpression,
  InferType,
  VoidType,
  ThrowStatement,
  TryStatement,
  CatchClause,
  FinallyClause,
  ClassDeclaration,
  ClassMember,
  MethodDefinition,
  PropertyDefinition,
  Constructor,
  Super,
  ThisReference,
  WildcardPattern,
  MemberPattern,
  OperatorDefinition,
  AwaitExpression,
  ImportDeclaration,
  UndefinedLiteral,
  NaNLiteral,
  NullLiteral,
  IsExpression
}

export type NodeTypes = {
  [K in keyof typeof Nodes]: InstanceType<typeof Nodes[K]>
};

type Modifiers = number;

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | Identifier
  | BinaryExpression
  | LogicalExpression
  | ConditionalExpression
  | UnaryExpression
  | UpdateExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression
  | NewExpression
  | ObjectExpression
  | MatchExpression
  | CheckExpression
  | RangeExpression;

//type NodeType = NodeTypes[keyof NodeTypes]; // classes
export type NodeType = keyof typeof Nodes; // strings