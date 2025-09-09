import { Token, TokenType } from "../types/tokens";
import { tokenTypeToOperator, OperatorType } from "../types/operators";
import { DataTypes, ControlFlow, Structures, Others } from "../types/keywords";
import {
  Nodes,
  Program,
  buildSourceLocation,
  Node,
  NodeTypes,
  SourceLocation,
  Expression,
  TypeReferenceKind,
  ClassModifiers,
} from "../ast/nodes";
import { LocalErrors, BaseError, FileInput } from "../util/errors";
import type { MainConfig } from "../types/global";
import { LocalWarnings } from "../util/warnings";

/* MISSING IMPLEMENTATIONS TO COMPLETE:
x- Implement missing control flow (for, while, functions)
x- Implement control flow interaction (break, return, continue, function calling)
x- Implement array nodes (int[], type[] indentifier = ...)
4- Implement classes and class-only keywords
5- Implement property access (class.prop, array.[0])
6- Array spread operator (...)
7- Bitwise operations (>>, <<, &, |, ^)
*/

// Parser Method Return Type
type ParseResult<T = Node> = T | BaseError;

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;
  private errors: LocalErrors;
  private warn: LocalWarnings;
  private file: FileInput;
  private recursionDepth = 0;
  private maxRecursionDepth = 1000; // Configurable limit

  constructor(c: MainConfig) {
    this.errors = c.errors;
    this.warn = c.warn;
    this.file = c.file;
  }

  private enterRecursion(): BaseError | null {
    this.recursionDepth++;
    if (this.recursionDepth > this.maxRecursionDepth) {
      return this.errors.SyntaxError.throw(
        `Maximum recursion depth exceeded (${this.maxRecursionDepth}). Expression or statement nesting is too deep.`,
        this.file,
        this.getSource()
      );
    }
    return null;
  }

  private exitRecursion(): void {
    this.recursionDepth--;
  }

  private getSource(token: Token | null = null): SourceLocation {
    if (!token) {
      token = this.current();
    }

    if (!token) {
      const lastPos =
        this.tokens.length > 0 ? this.tokens[this.tokens.length - 1] : null;
      if (lastPos) {
        return buildSourceLocation(
          lastPos.pos + lastPos.value.length,
          lastPos.line,
          lastPos.col + lastPos.value.length,
        );
      }
      return buildSourceLocation(0, 1, 1);
    }

    return buildSourceLocation(token.pos, token.line, token.col);
  }

  parse(tokens: Token[]): Program | BaseError {
    this.tokens = tokens;
    const body: Node[] = [];
    let hasErrors = false;

    while (this.current() && this.current()?.type !== TokenType.EOF) {
      const statement = this.parseStatement();

      if (statement instanceof BaseError) {
        hasErrors = true;
        this.synchronize();
        continue;
      }

      if (statement === null) break;

      body.push(statement);
    }

    if (hasErrors)
      return this.errors.ProgramParsingError.throw(
        "Failed to parse program",
        this.file,
        buildSourceLocation(0, 0, 0),
      );

    return new Program(buildSourceLocation(0, 1, 1), body);
  }

  private synchronize(): void {
    this.advance();

    while (!this.outOfBounds()) {
      if (this.previous()?.type === TokenType.SEMICOLON) return;

      const current = this.current();
      if (current?.type === TokenType.KEYWORD) {
        switch (current.value) {
          case "class":
          case "func":
          case "if":
          case "while":
          case "for":
          case "return":
          case "const":
          case "int":
          case "float":
          case "bool":
          case "char":
            return;
        }
      }

      // Also synchronize on identifiers that could start new statements
      if (current?.type === TokenType.IDENTIFIER) {
        return;
      }

      if (
        current?.type === TokenType.LBRACE ||
        current?.type === TokenType.RBRACE
      ) {
        return;
      }

      this.advance();
    }
  }

  private parseStatement(): ParseResult<Node> | null {
    while (
      this.current() &&
      this.current()?.type != TokenType.UNKNOWN &&
      this.current()?.type != TokenType.EOF
    ) {
      const current = this.current();

      switch (current?.type) {
        case TokenType.SEMICOLON: {
          this.advance();
          continue;
        }
        case TokenType.KEYWORD: {
          if (
            current.value === Others.CONST ||
            current.value === Others.INFER ||
            Object.values(DataTypes).includes(current.value as any)
          ) {
            const varDecl = this.parseVariableDeclaration();
            if (varDecl instanceof BaseError) {
              return varDecl; // Let the main parse loop handle recovery
            }
            return varDecl;
          }

          // Control Flow

          if (current.value === ControlFlow.IF) {
            const ifStmt = this.parseIfStatement();
            if (ifStmt instanceof BaseError) {
              return ifStmt; // Let the main parse loop handle recovery
            }
            return ifStmt;
          }
          if (current.value === ControlFlow.WHILE) {
            return this.parseWhileStatement();
          }
          if (current.value === ControlFlow.FOR) {
            return this.parseForStatement();
          }
          if (current.value === ControlFlow.RETURN) {
            return this.parseReturnStatement();
          }
          if (current.value === ControlFlow.CONTINUE) {
            return this.parseContinueStatement();
          }
          if (current.value === ControlFlow.BREAK) {
            return this.parseBreakStatement();
          }
          if (current.value === ControlFlow.TRY) {
            return this.parseTryStatement();
          }
          if (current.value === ControlFlow.THROW) {
            return this.parseThrowStatement();
          }
          if (current.value === ControlFlow.SWITCH) {
            return this.parseSwitchStatement();
          }

          // Structures

          if (current.value === Structures.FUNC) {
            return this.parseFuncDeclaration();
          }

          if (current.value === Structures.CLASS) {
            return this.parseClassDeclaration();
          }

          /*
          if (current.value === Structures.TYPE) {
            return this.parseTypeDeclaration();
          }*/

          return this.errors.UnexpectedTokenError.throw(
            `Unexpected keyword '${current.value}'`,
            this.file,
            this.getSource(current),
          );
        }

        case TokenType.IDENTIFIER: {
          let nextType = this.next()?.type;

          if (nextType === TokenType.LPAREN) {
            const callExpr = this.parseCallExpression();
            if (callExpr instanceof BaseError) return callExpr;

            if (!this.consume(TokenType.SEMICOLON)) {
              return this.errors.SyntaxError.throw(
                `Expected ';' after call expression`,
                this.file,
                this.getSource(),
              );
            }

            return new Nodes.ExpressionStatement(
              this.getSource(current),
              callExpr,
            );
          }

          if (
            nextType === TokenType.IDENTIFIER ||
            (nextType === TokenType.LBRACKET &&
              this.next(1)?.type === TokenType.RBRACKET &&
              this.next(2)?.type === TokenType.IDENTIFIER)
          ) {
            return this.handleTypeDeclarationOrError();
          }

          const startPos = this.pos;
          const left = this.parseLeftHandSideExpression();
          if (left instanceof BaseError) return left;

          const currentType = this.current()?.type;
          if (
            currentType === TokenType.ASSIGNMENT ||
            currentType === TokenType.PLUS_ASSIGN ||
            currentType === TokenType.MINUS_ASSIGN ||
            currentType === TokenType.MULTIPLY_ASSIGN ||
            currentType === TokenType.DIVIDE_ASSIGN
          ) {
            const assignment = this.parseAssignment(left);
            if (assignment instanceof BaseError) return assignment;

            if (!this.consume(TokenType.SEMICOLON)) {
              return this.errors.SyntaxError.throw(
                `Expected ';' after assignment`,
                this.file,
                this.getSource(),
              );
            }

            return assignment;
          }

          this.pos = startPos;
          const parsed = this.parseExpression();
          if (parsed instanceof BaseError) return parsed;

          if (!this.consume(TokenType.SEMICOLON)) {
            return this.errors.SyntaxError.throw(
              `Expected ';' after expression statement`,
              this.file,
              this.getSource(),
            );
          }

          return new Nodes.ExpressionStatement(this.getSource(current), parsed);
        }

        case TokenType.LBRACE:
        case TokenType.RBRACE: {
          return this.errors.UnexpectedTokenError.throw(
            `Unexpected token '${current.value}'`,
            this.file,
            this.getSource(),
          );
        }

        default: {
          const parsed = this.parseExpression();

          if (parsed instanceof BaseError) return parsed;

          if (!this.consume(TokenType.SEMICOLON)) {
            return this.errors.SyntaxError.throw(
              `Expected ';' after expression statement`,
              this.file,
              this.getSource(),
            );
          }

          return new Nodes.ExpressionStatement(this.getSource(current), parsed);
        }
      }
    }

    if (!this.current() || this.current()?.type === TokenType.EOF) {
      return null;
    }

    return this.errors.UnexpectedTokenError.throw(
      `Unknown token '${this.current().value}'`,
      this.file,
      this.getSource(),
    );
  }

  private parseBlock(): ParseResult<NodeTypes["Block"]> {
    const recursionError = this.enterRecursion();
    if (recursionError) return recursionError;
    
    const first = this.current();

    if (!this.consume(TokenType.LBRACE)) {
      this.exitRecursion();
      return this.errors.SyntaxError.throw(
        `Expected '{'`,
        this.file,
        this.getSource(),
      );
    }

    let statements: Node[] = [];

    while (
      this.current() &&
      this.current()?.type !== TokenType.RBRACE &&
      this.current()?.type !== TokenType.EOF
    ) {
      const statement = this.parseStatement();
      if (statement instanceof BaseError) return statement;
      if (statement === null) break;
      statements.push(statement);
    }

    if (!this.consume(TokenType.RBRACE)) {
      this.exitRecursion();
      return this.errors.SyntaxError.throw(
        `Expected '}'`,
        this.file,
        this.getSource(),
      );
    }

    this.exitRecursion();
    return new Nodes.Block(this.getSource(first), statements);
  }

  private parseElseIfStatement(): ParseResult<NodeTypes["ElseIfStatement"]> {
    const elifToken = this.current();
    this.advance();

    let condition = this.parseExpression();
    if (condition instanceof BaseError) return condition;

    const thenBranch = this.parseBlock();
    if (thenBranch instanceof BaseError) return thenBranch;

    return new Nodes.ElseIfStatement(
      this.getSource(elifToken),
      condition,
      thenBranch,
    );
  }

  private parseBreakStatement(): ParseResult<NodeTypes["BreakStatement"]> {
    const first = this.current();
    this.advance();

    if (!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ';' after break statement`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.BreakStatement(this.getSource(first));
  }

  private parseContinueStatement(): ParseResult<
    NodeTypes["ContinueStatement"]
  > {
    const first = this.current();
    this.advance();

    if (!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ';' after continue statement`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.ContinueStatement(this.getSource(first));
  }

  private parseIfStatement(): ParseResult<NodeTypes["IfStatement"]> {
    const ifToken = this.current();
    this.advance();

    let condition = this.parseExpression();
    if (condition instanceof BaseError) return condition;

    const thenBranch = this.parseBlock();
    if (thenBranch instanceof BaseError) return thenBranch;

    const elifStatements: NodeTypes["ElseIfStatement"][] | undefined = [];
    let elseBlock: NodeTypes["Block"] | undefined = undefined;

    while (
      this.current().type === TokenType.KEYWORD &&
      this.current().value === "elif"
    ) {
      const newElif = this.parseElseIfStatement();
      if (newElif instanceof BaseError) return newElif;

      elifStatements.push(newElif);
    }

    if (
      this.current().type === TokenType.KEYWORD &&
      this.current().value === "else"
    ) {
      this.advance();
      const evalElseBlock = this.parseBlock();
      if (evalElseBlock instanceof BaseError) return evalElseBlock;

      elseBlock = evalElseBlock;
    }

    this.consume(TokenType.SEMICOLON); // semicolon not enforced for braces.

    return new Nodes.IfStatement(
      this.getSource(ifToken),
      condition,
      thenBranch,
      elifStatements,
      elseBlock,
    );
  }

  private parseCatchClause(): ParseResult<NodeTypes["CatchClause"]> {
    const catchToken = this.current();
    this.advance();

    this.consume(TokenType.LPAREN);

    const paramType = this.parseTypeReference(TypeReferenceKind.CLASS, false);
    if (paramType instanceof BaseError) return paramType;

    if (paramType instanceof Nodes.ArrayType) {
      return this.errors.SyntaxError.throw(
        `Expected non-array type in catch expression`,
        this.file,
        this.getSource(),
      );
    }

    const param = this.parseIdentifier();
    if (param instanceof BaseError) return param;

    this.consume(TokenType.RPAREN);

    const catchBlock = this.parseBlock();
    if (catchBlock instanceof BaseError) return catchBlock;

    return new Nodes.CatchClause(
      this.getSource(catchToken),
      paramType,
      param,
      catchBlock,
    );
  }

  private parseThrowStatement(): ParseResult<NodeTypes["ThrowStatement"]> {
    const throwToken = this.current();
    this.advance();

    const newExp = this.parseNewExpression();
    if (newExp instanceof BaseError) return newExp;

    return new Nodes.ThrowStatement(this.getSource(throwToken), newExp);
  }

  private parseFinallyClause(): ParseResult<NodeTypes["FinallyClause"]> {
    const finallyToken = this.current();
    this.advance();

    const finallyBlock = this.parseBlock();
    if (finallyBlock instanceof BaseError) return finallyBlock;

    return new Nodes.FinallyClause(this.getSource(finallyToken), finallyBlock);
  }

  private parseTryStatement(): ParseResult<NodeTypes["TryStatement"]> {
    const tryToken = this.current();
    this.advance();

    const tryBlock = this.parseBlock();
    if (tryBlock instanceof BaseError) return tryBlock;

    const catchClause = this.parseCatchClause();
    if (catchClause instanceof BaseError) return catchClause;

    const finallyClause = this.parseFinallyClause();
    if (finallyClause instanceof BaseError) return finallyClause;

    return new Nodes.TryStatement(
      this.getSource(tryToken),
      tryBlock,
      catchClause,
      finallyClause,
    );
  }

  private parseWhileStatement(): ParseResult<NodeTypes["WhileStatement"]> {
    const whileToken = this.current();
    this.advance();

    let condition = this.parseExpression();
    if (condition instanceof BaseError) return condition;

    const body = this.parseBlock();
    if (body instanceof BaseError) return body;

    this.consume(TokenType.SEMICOLON); // semicolon not enforced for braces.

    return new Nodes.WhileStatement(
      this.getSource(whileToken),
      condition,
      body,
    );
  }

  private parseForStatement(): ParseResult<NodeTypes["ForStatement"]> {
    const forToken = this.current();
    this.advance();

    if (!this.consume(TokenType.LPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected '(' after 'for'`,
        this.file,
        this.getSource(),
      );
    }

    let variable = this.parseVariableDeclaration();
    if (variable instanceof BaseError) return variable;

    let condition = this.parseExpression();
    if (condition instanceof BaseError) return condition;

    if (!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ';' after for condition`,
        this.file,
        this.getSource(),
      );
    }

    let update:
      | NodeTypes["UpdateExpression"]
      | NodeTypes["Assignment"]
      | undefined = undefined;

    if (this.current()?.type !== TokenType.RPAREN) {
      const leftExpr = this.parseLeftHandSideExpression();
      if (leftExpr instanceof BaseError) return leftExpr;

      const current = this.current();
      if (
        current?.type === TokenType.ASSIGNMENT ||
        current?.type === TokenType.PLUS_ASSIGN ||
        current?.type === TokenType.MINUS_ASSIGN ||
        current?.type === TokenType.MULTIPLY_ASSIGN ||
        current?.type === TokenType.DIVIDE_ASSIGN
      ) {
        const assignmentToken = this.current();
        const isCompound = assignmentToken.type !== TokenType.ASSIGNMENT;

        this.advance();
        let right = this.parseExpression();
        if (right instanceof BaseError) return right;

        if (isCompound) {
          const operator = assignmentToken.value.slice(0, -1);
          right = new Nodes.BinaryExpression(
            this.getSource(assignmentToken),
            leftExpr,
            operator,
            right,
          );
        }

        update = new Nodes.Assignment(
          this.getSource(assignmentToken),
          leftExpr,
          right,
        );
      } else if (
        current?.type === TokenType.INCREMENT ||
        current?.type === TokenType.DECREMENT
      ) {
        this.advance();
        update = new Nodes.UpdateExpression(
          this.getSource(current),
          current.value,
          leftExpr,
          false,
        );
      } else {
        this.backtrack();
        const updateExpr = this.parseUnaryExpression();
        if (updateExpr instanceof BaseError) return updateExpr;

        if (updateExpr instanceof Nodes.UpdateExpression) {
          update = updateExpr;
        } else {
          return this.errors.SyntaxError.throw(
            `Expected assignment or update expression in for loop`,
            this.file,
            this.getSource(),
          );
        }
      }
    }

    if (!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ')' after for statement`,
        this.file,
        this.getSource(),
      );
    }

    const body = this.parseBlock();
    if (body instanceof BaseError) return body;

    this.consume(TokenType.SEMICOLON); // semicolon not enforced for braces.

    return new Nodes.ForStatement(
      this.getSource(forToken),
      variable,
      condition,
      update,
      body,
    );
  }

  private parseParameter(): ParseResult<NodeTypes["Parameter"]> {
    const paramIdentifier = this.parseIdentifier();
    if (paramIdentifier instanceof BaseError) return paramIdentifier;

    if (!this.consume(TokenType.COLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ':' after parameter name`,
        this.file,
        this.getSource(),
      );
    }

    const paramType = this.parseTypeReference(TypeReferenceKind.ANY, true);
    if (paramType instanceof BaseError) return paramType;

    return new Nodes.Parameter(this.getSource(), paramIdentifier, paramType);
  }

  private parseLiteralPattern(): ParseResult<NodeTypes["LiteralPattern"]> {
    const patternToken = this.current();
    this.advance();

    if (patternToken?.type === TokenType.STRING) {
      return new Nodes.LiteralPattern(
        this.getSource(patternToken),
        new Nodes.StringLiteral(
          this.getSource(patternToken),
          patternToken.value,
        ),
      );
    } else if (patternToken?.type === TokenType.NUMBER) {
      return new Nodes.LiteralPattern(
        this.getSource(patternToken),
        new Nodes.NumberLiteral(
          this.getSource(patternToken),
          parseFloat(patternToken.value),
        ),
      );
    } else if (patternToken?.type === TokenType.BOOLEAN) {
      return new Nodes.LiteralPattern(
        this.getSource(patternToken),
        new Nodes.BooleanLiteral(
          this.getSource(patternToken),
          patternToken.value === "true",
        ),
      );
    }

    return this.errors.SyntaxError.throw(
      `Expected literal pattern`,
      this.file,
      this.getSource(patternToken),
    );
  }

  private parseRangePattern(): ParseResult<NodeTypes["RangePattern"]> {
    const startToken = this.current();
    this.advance();

    if (!this.consume(TokenType.DOT_DOT)) {
      return this.errors.SyntaxError.throw(
        `Expected '..' in range pattern`,
        this.file,
        this.getSource(),
      );
    }

    const endToken = this.current();

    if (
      startToken?.type === TokenType.NUMBER &&
      endToken?.type === TokenType.NUMBER
    ) {
      this.advance();
      return new Nodes.RangePattern(
        this.getSource(startToken),
        new Nodes.NumberLiteral(
          this.getSource(startToken),
          parseFloat(startToken.value),
        ),
        new Nodes.NumberLiteral(
          this.getSource(endToken),
          parseFloat(endToken.value),
        ),
      );
    }

    return this.errors.SyntaxError.throw(
      `Expected number range pattern`,
      this.file,
      this.getSource(startToken),
    );
  }

  private parsePattern(
    allowGuards: boolean = true,
  ): ParseResult<NodeTypes["Pattern"]> {
    const patternToken = this.current();

    // Check for range pattern FIRST (1..5)
    if (
      patternToken?.type === TokenType.NUMBER &&
      this.next()?.type === TokenType.DOT_DOT &&
      this.next(1)?.type === TokenType.NUMBER
    ) {
      return this.parseRangePattern();
    }

    // Then check for literal patterns
    if (
      patternToken?.type === TokenType.STRING ||
      patternToken?.type === TokenType.NUMBER ||
      patternToken?.type === TokenType.BOOLEAN
    ) {
      return this.parseLiteralPattern();
    }

    return this.errors.SyntaxError.throw(
      `Expected pattern`,
      this.file,
      this.getSource(patternToken),
    );
  }

  private parsePatternList(
    allowGuards: boolean = true,
  ): ParseResult<NodeTypes["Pattern"][]> {
    const patterns: NodeTypes["Pattern"][] = [];

    const firstPattern = this.parsePattern(allowGuards);
    if (firstPattern instanceof BaseError) return firstPattern;
    patterns.push(firstPattern);

    while (this.current() && this.current()?.type === TokenType.PIPE) {
      this.advance();
      const pattern = this.parsePattern(allowGuards);
      if (pattern instanceof BaseError) return pattern;
      patterns.push(pattern);
    }

    return patterns;
  }

  private parseSwitchStatement(): ParseResult<NodeTypes["SwitchStatement"]> {
    const switchToken = this.current();
    this.advance();

    const scrutinee = this.parseExpression();
    if (scrutinee instanceof BaseError) return scrutinee;

    if (!this.consume(TokenType.LBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '{' after switch scrutinee`,
        this.file,
        this.getSource(),
      );
    }

    const cases: NodeTypes["SwitchCase"][] = [];
    let defaultCase: NodeTypes["Block"] | undefined = undefined;

    while (
      this.current() &&
      this.current()?.type !== TokenType.RBRACE &&
      this.current()?.type !== TokenType.EOF
    ) {
      const caseToken = this.current();

      if (this.checkToken(TokenType.KEYWORD, ControlFlow.CASE, caseToken)) {
        this.advance();

        const patterns = this.parsePatternList(false);
        if (patterns instanceof BaseError) return patterns;

        if (!this.consume(TokenType.COLON)) {
          return this.errors.SyntaxError.throw(
            `Expected ':'`,
            this.file,
            this.getSource(),
          );
        }

        const caseBlock = this.parseBlock();
        if (caseBlock instanceof BaseError) return caseBlock;

        cases.push(
          new Nodes.SwitchCase(this.getSource(caseToken), patterns, caseBlock),
        );
      } else if (
        this.checkToken(TokenType.KEYWORD, ControlFlow.DEFAULT, caseToken)
      ) {
        this.advance();

        if (!this.consume(TokenType.COLON)) {
          return this.errors.SyntaxError.throw(
            `Expected ':'`,
            this.file,
            this.getSource(),
          );
        }

        const defaultBlock = this.parseBlock();
        if (defaultBlock instanceof BaseError) return defaultBlock;

        defaultCase = defaultBlock;
      } else {
        break;
      }
    }

    if (!this.consume(TokenType.RBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '}' after switch block`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.SwitchStatement(
      this.getSource(switchToken),
      scrutinee,
      cases,
      defaultCase,
    );
  }

  private parseAccessModifier(): ParseResult<ClassModifiers["access"]> {
    const memberToken = this.current();
    
    if (
      !this.consume(TokenType.KEYWORD)
    ) {
      return this.errors.SyntaxError.throw(
        `Expected access modifier`,
        this.file,
        this.getSource(),
      )
    }

    switch(memberToken.value) {
      case Structures.PRIVATE:   return Structures.PRIVATE;
      case Structures.PUBLIC:    return Structures.PUBLIC;
      case Structures.PROTECTED: return Structures.PROTECTED;
      default:
        return this.errors.SyntaxError.throw(
          `Expected access modifier`,
          this.file,
          this.getSource(),
        )
    }
  }

  private parseImmutableType(): ParseResult<ClassModifiers["immutable"]> {
    if(this.consumeValue(TokenType.KEYWORD, Structures.READONLY))
      return Structures.READONLY;

    if(this.consumeValue(TokenType.KEYWORD, Structures.FINAL))
      return Structures.FINAL;

    return null;
  }

  private parseClassMember(
    classIdentifier: NodeTypes["Identifier"]
  ): ParseResult<NodeTypes["ClassMember"]> {
    const memberToken = this.current();

    let access = this.parseAccessModifier();

    if(access instanceof BaseError) return access;

    let isStatic = this.consumeValue(TokenType.KEYWORD, Structures.STATIC);

    let immutableType = this.parseImmutableType();

    if(immutableType instanceof BaseError) return immutableType;

    if(
      this.checkToken(TokenType.IDENTIFIER, classIdentifier.name) && this.next()?.type === TokenType.LPAREN
    ) {
      // Constructor parsing
      
    }
  }

  private parseClassBody(
    classIdentifier: NodeTypes["Identifier"]
  ): ParseResult<NodeTypes["ClassMember"][]> {
    const members: NodeTypes["ClassMember"][] = [];

    /*while (this.current() && this.current()?.type !== TokenType.RBRACE) {
      
    }*/
    return this.errors.SyntaxError.throw(
      `class body not implemented`,
      this.file,
      this.getSource(),
    )
  }

  private parseClassDeclaration(): ParseResult<
    BaseError | NodeTypes["ClassDeclaration"]
  > {
    const classToken = this.current();
    this.advance();

    const identifier = this.parseIdentifier();
    if (identifier instanceof BaseError) return identifier;

    let extending: NodeTypes["TypeReference"] | undefined;
    let implementing: NodeTypes["TypeReference"][] = [];

    if (this.checkToken(TokenType.KEYWORD, Structures.EXTENDS)) {
      this.advance();
      const extendsIdentifier = this.parseTypeReference(
        TypeReferenceKind.CLASS,
        false,
      ); // pass expected kind and do not allow arrays
      if (extendsIdentifier instanceof BaseError) return extendsIdentifier;

      extending = extendsIdentifier;
    }

    if (this.checkToken(TokenType.KEYWORD, Structures.IMPLEMENTS)) {
      this.advance();
      let isFirstPass = true;
      while (isFirstPass || this.consume(TokenType.COMMA)) {
        const implementsIdentifier = this.parseTypeReference(
          TypeReferenceKind.INTERFACE,
          false,
        ); // pass expected kind and do not allow arrays

        if (implementsIdentifier instanceof BaseError)
          return implementsIdentifier;

        implementing.push(implementsIdentifier);

        isFirstPass = false;
      }
    }

    if (this.checkToken(TokenType.KEYWORD, Structures.EXTENDS)) {
      this.errors.SyntaxError.throw(
        `Extend must precede implements`,
        this.file,
        this.getSource(),
      );
    }

    if (!this.consume(TokenType.LBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '{'`,
        this.file,
        this.getSource(),
      );
    }

    const classBody = this.parseClassBody(identifier);

    if (classBody instanceof BaseError) return classBody;

    if (!this.consume(TokenType.RBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '}'`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.ClassDeclaration(
      this.getSource(classToken),
      identifier,
      extending,
      implementing,
    );
  }

  private parseParameterList(): ParseResult<NodeTypes["Parameter"][]> {
    if (!this.consume(TokenType.LPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected '(' after function name`,
        this.file,
        this.getSource(),
      );
    }

    const parameters: NodeTypes["Parameter"][] = [];
    while (this.current() && this.current()?.type !== TokenType.RPAREN) {
      const parameter = this.parseParameter();
      if (parameter instanceof BaseError) return parameter;

      parameters.push(parameter);

      if (this.current()?.type === TokenType.COMMA) {
        this.advance();
      } else if (this.current()?.type !== TokenType.RPAREN) {
        return this.errors.SyntaxError.throw(
          `Expected ',' or ')' in parameter list`,
          this.file,
          this.getSource(),
        );
      }
    }
    return parameters;
  }

  private parseCallParameterList(): ParseResult<Node[]> {
    if (!this.consume(TokenType.LPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected '(' after call expression`,
        this.file,
        this.getSource(),
      );
    }

    const parameters: Node[] = [];
    while (this.current() && this.current()?.type !== TokenType.RPAREN) {
      const parameter = this.parseExpression();
      if (parameter instanceof BaseError) return parameter;

      parameters.push(parameter);

      if (this.current()?.type === TokenType.COMMA) {
        this.advance();
      } else if (this.current()?.type !== TokenType.RPAREN) {
        return this.errors.SyntaxError.throw(
          `Expected ',' or ')' in parameter list`,
          this.file,
          this.getSource(),
        );
      }
    }
    return parameters;
  }

  private parseFuncDeclaration(): ParseResult<
    NodeTypes["FunctionDeclaration"]
  > {
    const funcToken = this.current();
    this.advance();

    const identifier = this.parseIdentifier();
    if (identifier instanceof BaseError) return identifier;

    let generics: NodeTypes["TypeReference"][] = [];
    if (
      this.current()?.type === TokenType.COMPARISON &&
      this.current()?.value === "<"
    ) {
      const parsedGenerics = this.parseGenerics();
      if (parsedGenerics instanceof BaseError) return parsedGenerics;
      generics = parsedGenerics;
    }

    const parameters = this.parseParameterList();
    if (parameters instanceof BaseError) return parameters;

    if (!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ')' after parameter list`,
        this.file,
        this.getSource(),
      );
    }

    if (!this.consume(TokenType.COLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ':' after parameter list in func declaration`,
        this.file,
        this.getSource(),
      );
    }

    const returnType = this.parseFunctionTypeReference();
    if (returnType instanceof BaseError) return returnType;

    const body = this.parseBlock();
    if (body instanceof BaseError) return body;

    return new Nodes.FunctionDeclaration(
      this.getSource(funcToken),
      returnType,
      identifier,
      parameters,
      body,
      generics,
    );
  }

  private parseCallExpression(
    memberContext: NodeTypes["MemberExpression"] | null = null,
  ): ParseResult<NodeTypes["CallExpression"]> {
    const calleeToken = this.current();
    let identifier: Node;

    if (memberContext === null) {
      const tempIdentifier = this.parseIdentifier();

      if (tempIdentifier instanceof BaseError) return tempIdentifier;

      identifier = tempIdentifier;
    } else {
      identifier = memberContext;
    }

    let generics: NodeTypes["TypeReference"][] = [];

    if (
      this.current().type === TokenType.COMPARISON &&
      this.current().value === "<"
    ) {
      const parsedGenerics = this.parseGenerics();

      if (parsedGenerics instanceof BaseError) return parsedGenerics;

      generics = [...parsedGenerics];
    }

    const parameters = this.parseCallParameterList();
    if (parameters instanceof BaseError) return parameters;

    if (!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ')' after call expression`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.CallExpression(
      this.getSource(calleeToken),
      identifier,
      generics,
      parameters,
    );
  }

  private parseReturnStatement(): ParseResult<NodeTypes["ReturnStatement"]> {
    const returnToken = this.current();
    this.advance();

    let argument: Node | undefined = undefined;

    if (
      this.current()?.type !== TokenType.SEMICOLON &&
      this.current()?.type !== TokenType.EOF
    ) {
      const expr = this.parseExpression();
      if (expr instanceof BaseError) return expr;
      argument = expr;
    }

    if (!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ';' after return statement`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.ReturnStatement(this.getSource(returnToken), argument);
  }

  private parseAssignment(
    left:
      | NodeTypes["Identifier"]
      | NodeTypes["MemberExpression"]
      | NodeTypes["ArrayExpression"],
  ): ParseResult<NodeTypes["Assignment"]> {
    const assignmentToken = this.current();

    const isCompound =
      assignmentToken.type === TokenType.PLUS_ASSIGN ||
      assignmentToken.type === TokenType.MINUS_ASSIGN ||
      assignmentToken.type === TokenType.MULTIPLY_ASSIGN ||
      assignmentToken.type === TokenType.DIVIDE_ASSIGN;

    if (!this.consume(assignmentToken.type)) {
      return this.errors.SyntaxError.throw(
        `Expected assignment operator`,
        this.file,
        this.getSource(),
      );
    }

    let right = this.parseExpression();
    if (right instanceof BaseError) return right;

    if (isCompound) {
      const operator = assignmentToken.value.slice(0, -1);
      right = new Nodes.BinaryExpression(
        this.getSource(assignmentToken),
        left,
        operator,
        right,
      );
    }

    // Removed semicolon consumption here as it's handled in parseStatement
    // if (!this.consume(TokenType.SEMICOLON)) {
    //   return this.errors.SyntaxError.throw(
    //     `Expected ';' after assignment`,
    //     this.file,
    //     this.getSource(),
    //   );
    // }

    return new Nodes.Assignment(this.getSource(assignmentToken), left, right);
  }

  private parseFunctionTypeReference(): ParseResult<
    NodeTypes["TypeReference"] | NodeTypes["ArrayType"] | NodeTypes["VoidType"]
  > {
    const current = this.current();
    if (current?.type === TokenType.KEYWORD && current.value === Others.VOID) {
      this.advance();
      return new Nodes.VoidType(this.getSource(current));
    }
    return this.parseTypeReference(TypeReferenceKind.ANY, true);
  }

  private parseGenerics(): ParseResult<NodeTypes["TypeReference"][]> {
    const generics: NodeTypes["TypeReference"][] = [];
    if (!this.consume(TokenType.COMPARISON) && this.current().value === "<") {
      return this.errors.SyntaxError.throw(
        `Expected '<' before generic definition`,
        this.file,
        this.getSource(),
      );
    }

    while (
      this.current() &&
      this.current()?.type !== TokenType.COMPARISON &&
      this.current().value !== ">"
    ) {
      const generic = this.parseTypeReference(TypeReferenceKind.ANY, true);
      if (generic instanceof BaseError) return generic;

      if (generic instanceof Nodes.ArrayType) {
        generics.push(generic.elementType);
      } else generics.push(generic);

      if (this.current()?.type === TokenType.COMMA) this.advance();
    }

    if (!this.consume(TokenType.COMPARISON) && this.current().value === ">") {
      return this.errors.SyntaxError.throw(
        `Expected '>' after generic definition`,
        this.file,
        this.getSource(),
      );
    }

    return generics;
  }

  private parseTypeReference(
    kind: TypeReferenceKind,
    allowArrays: boolean,
  ): ParseResult<NodeTypes["TypeReference"]>;
  private parseTypeReference(
    kind: TypeReferenceKind.ANY,
    allowArrays: true,
  ): ParseResult<NodeTypes["TypeReference"] | NodeTypes["ArrayType"]>;
  private parseTypeReference(
    kind: TypeReferenceKind,
    allowArrays: boolean = true,
  ): ParseResult<NodeTypes["TypeReference"] | NodeTypes["ArrayType"]> {
    const current = this.current();
    let baseType: NodeTypes["TypeReference"];

    if (
      current?.type === TokenType.KEYWORD &&
      Object.values(DataTypes).includes(current.value as any)
    ) {
      if (
        kind !== TypeReferenceKind.ANY &&
        kind !== TypeReferenceKind.PRIMITIVE
      ) {
        return this.errors.TypeError.throw(
          `Expected ${kind} type`,
          this.file,
          this.getSource(current),
        );
      }
      this.advance();

      baseType = new Nodes.TypeReference(
        this.getSource(current),
        current.value,
        [],
        kind,
      );
    } else if (current?.type === TokenType.IDENTIFIER) {
      this.advance();
      const generics =
        this.current()?.type === TokenType.COMPARISON &&
        this.current().value === "<"
          ? this.parseGenerics()
          : [];

      if (generics instanceof BaseError) return generics;

      baseType = new Nodes.TypeReference(
        this.getSource(current),
        current.value,
        generics,
        kind,
      );
    } else {
      return this.errors.TypeError.throw(
        `Invalid type '${current.value}'`,
        this.file,
        this.getSource(current),
      );
    }

    if (
      this.current()?.type === TokenType.LBRACKET &&
      this.next()?.type === TokenType.RBRACKET
    ) {
      if (!allowArrays) {
        return this.errors.SyntaxError.throw(
          `Expected non-array type`,
          this.file,
          this.getSource(current),
        );
      }

      this.advance();
      this.advance();

      return new Nodes.ArrayType(this.getSource(current), baseType);
    }

    return baseType;
  }

  private parseIdentifier(): ParseResult<NodeTypes["Identifier"]> {
    const current = this.current();

    if (current?.type === TokenType.IDENTIFIER) {
      this.advance();
      return new Nodes.Identifier(this.getSource(current), current.value);
    }

    return this.errors.SyntaxError.throw(
      `Expected identifier`,
      this.file,
      this.getSource(current),
    );
  }

  private parseVariableDeclaration(): ParseResult<
    NodeTypes["VariableDeclaration"]
  > {
    const first = this.current();

    const isConstant = this.consumeValue(TokenType.KEYWORD, Others.CONST);

    let type:
      | NodeTypes["TypeReference"]
      | NodeTypes["InferType"]
      | NodeTypes["ArrayType"]
      | null = null;

    if (this.isCurrent(TokenType.KEYWORD, Others.INFER)) {
      type = new Nodes.InferType(this.getSource());
      this.advance();
    } else {
      const parsedType = this.parseTypeReference(TypeReferenceKind.ANY, true);
      if (parsedType instanceof BaseError) return parsedType;
      type = parsedType;
    }

    const identifiers: NodeTypes["Identifier"][] = [];

    const firstIdentifier = this.parseIdentifier();
    if (firstIdentifier instanceof BaseError) return firstIdentifier;
    identifiers.push(firstIdentifier);

    while (this.current()?.type === TokenType.COMMA) {
      this.advance();
      const nextIdentifier = this.parseIdentifier();
      if (nextIdentifier instanceof BaseError) return nextIdentifier;
      identifiers.push(nextIdentifier);
    }

    let initializer: Node | undefined = undefined;

    if (this.current()?.type === TokenType.ASSIGNMENT) {
      this.advance();
      const expr = this.parseExpression();
      if (expr instanceof BaseError) return expr;
      initializer = expr;
    }

    if (!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        `Expected ';' after variable declaration`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.VariableDeclaration(
      this.getSource(first),
      isConstant,
      type,
      identifiers,
      initializer,
    );
  }

  private parseLeftHandSideExpression(): ParseResult<
    | NodeTypes["Identifier"]
    | NodeTypes["MemberExpression"]
    | NodeTypes["ArrayExpression"]
  > {
    let expr = this.parseIdentifier() as ParseResult<
      NodeTypes["Identifier"] | NodeTypes["MemberExpression"]
    >;
    if (expr instanceof BaseError) return expr;

    while (true) {
      const current = this.current();

      if (current?.type === TokenType.DOT) {
        this.advance();
        const property = this.parseIdentifier();
        if (property instanceof BaseError) return property;

        expr = new Nodes.MemberExpression(
          this.getSource(),
          expr,
          property,
          false,
        );
      } else if (current?.type === TokenType.LBRACKET) {
        this.advance();
        const index = this.parseExpression();
        if (index instanceof BaseError) return index;

        if (!this.consume(TokenType.RBRACKET)) {
          return this.errors.SyntaxError.throw(
            `Expected ']' after array index`,
            this.file,
            this.getSource(),
          );
        }

        expr = new Nodes.MemberExpression(this.getSource(), expr, index, true);
      } else {
        break;
      }
    }

    return expr;
  }

  private parseExpression(): ParseResult<Expression> {
    const recursionError = this.enterRecursion();
    if (recursionError) return recursionError;
    
    const result = this.parseConditionalExpression() as Expression;
    this.exitRecursion();
    return result;
  }

  private parseConditionalExpression(): ParseResult<Node> {
    let expr = this.parseLogicalOrExpression();
    if (expr instanceof BaseError) return expr;

    if (this.current()?.type === TokenType.QUESTION) {
      this.advance();
      const consequent = this.parseExpression();
      if (consequent instanceof BaseError) return consequent;

      if (!this.consume(TokenType.COLON)) {
        return this.errors.SyntaxError.throw(
          `Expected ':' in ternary expression`,
          this.file,
          this.getSource(),
        );
      }

      const alternate = this.parseExpression();
      if (alternate instanceof BaseError) return alternate;

      return new Nodes.ConditionalExpression(
        this.getSource(),
        expr,
        consequent,
        alternate,
      );
    }

    return expr;
  }

  private parseLogicalOrExpression(): ParseResult<Node> {
    let left = this.parseLogicalAndExpression();
    if (left instanceof BaseError) return left;

    while (this.current()?.type === TokenType.LOGICAL_OR) {
      const operator = this.current();
      this.advance();

      const right = this.parseLogicalAndExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.LogicalExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseLogicalAndExpression(): ParseResult<Node> {
    let left = this.parseEqualityExpression();
    if (left instanceof BaseError) return left;

    while (this.current()?.type === TokenType.LOGICAL_AND) {
      const operator = this.current();
      this.advance();

      const right = this.parseEqualityExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.LogicalExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseEqualityExpression(): ParseResult<Node> {
    let left = this.parseRelationalExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current()?.type === TokenType.COMPARISON &&
      (this.current()?.value === "==" || this.current()?.value === "!=")
    ) {
      const operator = this.current();
      this.advance();

      const right = this.parseRelationalExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.BinaryExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseRelationalExpression(): ParseResult<Node> {
    let left = this.parseAdditionExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current()?.type === TokenType.COMPARISON &&
      ["<", ">", "<=", ">="].includes(this.current()?.value || "")
    ) {
      const operator = this.current();
      this.advance();

      const right = this.parseAdditionExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.BinaryExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseAdditionExpression(): ParseResult<Node> {
    let left = this.parseMultiplicationExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current()?.type === TokenType.PLUS ||
      this.current()?.type === TokenType.MINUS
    ) {
      const operator = this.current();
      this.advance();

      const right = this.parseMultiplicationExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.BinaryExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseMultiplicationExpression(): ParseResult<Node> {
    let left = this.parseUnaryExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current()?.type === TokenType.ASTERISK ||
      this.current()?.type === TokenType.SLASH
    ) {
      const operator = this.current();
      this.advance();

      const right = this.parseUnaryExpression();
      if (right instanceof BaseError) return right;

      left = new Nodes.BinaryExpression(
        this.getSource(operator),
        left,
        operator.value,
        right,
      );
    }

    return left;
  }

  private parseUnaryExpression(): ParseResult<Node> {
    const current = this.current();

    if (
      current?.type === TokenType.INCREMENT ||
      current?.type === TokenType.DECREMENT
    ) {
      this.advance();
      const operand = this.parseLeftHandSideExpression();
      if (operand instanceof BaseError) return operand;

      return new Nodes.UpdateExpression(
        this.getSource(current),
        current.value,
        operand,
        true,
      );
    }

    if (
      current?.type === TokenType.LOGICAL_NOT ||
      current?.type === TokenType.MINUS
    ) {
      this.advance();
      const operand = this.parseUnaryExpression();
      if (operand instanceof BaseError) return operand;

      return new Nodes.UnaryExpression(
        this.getSource(current),
        current.value,
        operand,
      );
    }

    return this.parsePostfixExpression();
  }

  private getToken(pos: number) {
    return this.tokens[pos];
  }

  private isGenericPattern(pos: number = this.pos): boolean {
    return (
      this.checkToken(TokenType.COMPARISON, "<", this.getToken(pos)) &&
      (this.getToken(pos + 1)?.type === TokenType.IDENTIFIER ||
        this.getToken(pos + 1)?.type === TokenType.KEYWORD) &&
      (this.getToken(pos + 2)?.type === TokenType.COMMA ||
        this.checkToken(TokenType.COMPARISON, ">", this.getToken(pos + 2)))
    );
  }

  private checkToken(
    type: TokenType,
    value: string,
    token: Token | null = null,
  ): boolean {
    if (token != null) return token.type === type && token.value === value;

    return this.current()?.type === type && this.current()?.value === value;
  }

  /** Expressions that can be followed by a postfix operator (++, --, ., [], ())
   */
  private parsePostfixExpression(): ParseResult<Node> {
    let expr = this.parsePrimaryExpression();
    if (expr instanceof BaseError) return expr;

    while (this.current() && this.current()?.type !== TokenType.EOF) {
      const current = this.current();

      if (current?.type === TokenType.DOT) {
        this.advance();
        const property = this.parseIdentifier();
        if (property instanceof BaseError) return property;

        expr = new Nodes.MemberExpression(
          this.getSource(),
          expr,
          property,
          false,
        );
      } else if (current?.type === TokenType.LBRACKET) {
        this.advance();
        const index = this.parseExpression();
        if (index instanceof BaseError) return index;

        if (!this.consume(TokenType.RBRACKET)) {
          return this.errors.SyntaxError.throw(
            `Expected ']' after array index`,
            this.file,
            this.getSource(),
          );
        }

        expr = new Nodes.MemberExpression(this.getSource(), expr, index, true);
      } else if (this.isGenericPattern()) {
        const parsedGenerics = this.parseGenerics();
        if (parsedGenerics instanceof BaseError) return parsedGenerics;

        if (this.current()?.type !== TokenType.LPAREN) {
          return this.errors.SyntaxError.throw(
            `Expected '(' after generics in call expression`,
            this.file,
            this.getSource(),
          );
        }

        const parameters = this.parseCallParameterList();
        if (parameters instanceof BaseError) return parameters;

        if (!this.consume(TokenType.RPAREN)) {
          return this.errors.SyntaxError.throw(
            `Expected ')' after call expression`,
            this.file,
            this.getSource(),
          );
        }

        expr = new Nodes.CallExpression(
          this.getSource(),
          expr,
          parsedGenerics,
          parameters,
        );
      } else if (current?.type === TokenType.LPAREN) {
        const parameters = this.parseCallParameterList();
        if (parameters instanceof BaseError) return parameters;

        if (!this.consume(TokenType.RPAREN)) {
          return this.errors.SyntaxError.throw(
            `Expected ')' after call expression`,
            this.file,
            this.getSource(),
          );
        }

        expr = new Nodes.CallExpression(this.getSource(), expr, [], parameters);
      } else if (
        current?.type === TokenType.INCREMENT ||
        current?.type === TokenType.DECREMENT
      ) {
        if (
          !(
            expr instanceof Nodes.Identifier ||
            expr instanceof Nodes.MemberExpression
          )
        ) {
          return this.errors.SyntaxError.throw(
            `Invalid left-hand side in postfix operation`,
            this.file,
            this.getSource(current),
          );
        }

        this.advance();
        return new Nodes.UpdateExpression(
          this.getSource(current),
          current.value,
          expr,
          false,
        );
      } else {
        break;
      }
    }

    return expr;
  }

  private parseArrayExpression(): ParseResult<NodeTypes["ArrayExpression"]> {
    const first = this.current();
    this.advance();

    const elements: Node[] = [];

    while (this.current()?.type != TokenType.RBRACKET) {
      const element = this.parseExpression();
      if (element instanceof BaseError) return element;
      elements.push(element);
      if (!this.consume(TokenType.COMMA)) break;
    }

    if (!this.consume(TokenType.RBRACKET)) {
      this.errors.SyntaxError.throw(
        "Expected ']' after array expression",
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.ArrayExpression(this.getSource(first), elements);
  }

  private parsePrimaryExpression(): ParseResult<Node> {
    const current = this.current();

    if (current?.type === TokenType.LBRACKET) {
      return this.parseArrayExpression();
    }

    if (current?.type === TokenType.BOOLEAN) {
      this.advance();
      return new Nodes.BooleanLiteral(
        this.getSource(current),
        current.value === "true",
      );
    }

    if (current?.type === TokenType.NUMBER) {
      this.advance();
      return new Nodes.NumberLiteral(
        this.getSource(current),
        parseFloat(current.value),
      );
    }

    if (current?.type === TokenType.STRING) {
      this.advance();
      return new Nodes.StringLiteral(this.getSource(current), current.value);
    }

    if (this.checkToken(TokenType.KEYWORD, "new", current)) {
      return this.parseNewExpression();
    }

    if (current?.type === TokenType.IDENTIFIER) {
      if (
        this.next()?.type === TokenType.LPAREN ||
        this.isGenericPattern(this.pos + 1)
      ) {
        return this.parseCallExpression();
      }

      this.advance();
      return new Nodes.Identifier(this.getSource(current), current.value);
    }

    if (current?.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseExpression();
      if (expr instanceof BaseError) return expr;

      if (!this.consume(TokenType.RPAREN)) {
        return this.errors.SyntaxError.throw(
          `Expected ')' after expression`,
          this.file,
          this.getSource(),
        );
      }

      return expr;
    }

    return this.errors.SyntaxError.throw(
      `Unexpected token in expression`,
      this.file,
      this.getSource(current),
    );
  }

  private parseNewExpression(): ParseResult<NodeTypes["NewExpression"]> {
    const newToken = this.current();
    this.advance();

    const callee = this.parseIdentifier();
    if (callee instanceof BaseError) return callee;

    const args = this.parseCallParameterList();
    if (args instanceof BaseError) return args;

    if (!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ')' after new expression arguments`,
        this.file,
        this.getSource(),
      );
    }

    return new Nodes.NewExpression(this.getSource(newToken), callee, args);
  }

  private withinBounds(pos: number = this.pos) {
    return pos >= 0 && pos < this.tokens.length;
  }
  private outOfBounds(pos: number = this.pos) {
    return pos < 0 || pos >= this.tokens.length;
  }
  private current() {
    return this.tokens[this.pos];
  }
  private previous() {
    return this.withinBounds(this.pos - 1)
      ? this.tokens[this.pos - 1]
      : this.tokens[this.pos];
  }
  private next(offset: number = 0) {
    return this.withinBounds(this.pos + offset + 1)
      ? this.tokens[this.pos + offset + 1]
      : this.tokens[this.pos + offset];
  }
  private advance() {
    if (this.withinBounds()) this.pos++;
  }
  private backtrack() {
    if (this.pos > 0) this.pos--;
  }
  private backtrackUntil(type: TokenType) {
    for (let i = this.pos; i > 0; i--) {
      if (this.tokens[i].type === type) {
        this.pos = i;
        return this.tokens[i];
      }
    }
  }
  private advanceUntil(type: TokenType) {
    for (let i = this.pos; i < this.tokens.length; i++) {
      if (this.tokens[i].type === type) {
        this.pos = i;
        return this.tokens[i];
      }
    }
  }
  private matchSequence(expected: (TokenType | TokenType[])[]) {
    for (let i = 0; i < expected.length; i++) {
      const tokenIndex = this.pos + i;
      if (tokenIndex >= this.tokens.length) {
        return false;
      }

      const currentToken = this.tokens[tokenIndex];
      if (Array.isArray(expected[i])) {
        if (!expected[i].includes(currentToken.type)) {
          return false;
        }
      } else if (currentToken.type !== expected[i]) {
        return false;
      }
    }
    return true;
  }
  private match(expected: TokenType) {
    return this.next()?.type === expected;
  }
  private consume(expected: TokenType) {
    if (this.withinBounds() && this.current().type === expected) {
      this.advance();
      return true;
    } else return false;
  }
  private consumeValue(expected: TokenType, value: string) {
    if (
      this.withinBounds() &&
      this.current().type === expected &&
      this.current().value === value
    ) {
      this.advance();
      return true;
    } else return false;
  }
  private isCurrent(expected: TokenType, value: string) {
    return (
      this.withinBounds() &&
      this.current().type === expected &&
      this.current().value === value
    );
  }
  private expectToken(expected: TokenType) {
    let next = this.next();
    if (next?.type === expected) {
      return true;
    } else
      this.errors.SyntaxError.throw(
        `Expected ${expected.toLowerCase()} token`,
        this.file,
        this.getSource(),
      );
  }

  private handleTypeDeclarationOrError(): ParseResult<Node> {
    return this.parseVariableDeclaration();
  }
}
