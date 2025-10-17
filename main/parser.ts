import { Token, TokenType } from "../types/tokens";
import { OperatorType, isOperator, ArithmeticOperators, ComparisonOperators, BitwiseOperators, LogicalOperators, OtherOperators } from "../types/operators";
import { DataTypes, ControlFlow, Structures, Others, Execution, ComparisonKeywords } from "../types/keywords";
import {
  Nodes,
  Program,
  buildSourceLocation,
  Node,
  NodeTypes,
  SourceLocation,
  Expression,
  TypeReferenceKind,
  ImportSpecifier,
  LogicalExpression,
} from "../ast/nodes";
import { accessModifiers, allModifiers, immutabilityModifiers, Modifiers } from "../ast/modifiers";
import { LocalErrors, BaseError, FileInput } from "../util/errors";
import type { MainConfig } from "../types/global";
import { LocalWarnings } from "../util/warnings";
import { ModifierFlags, ModifierName } from "../ast/modifiers";

/* MISSING IMPLEMENTATIONS TO COMPLETE:
x- Implement missing control flow (for, while, functions)
x- Implement control flow interaction (break, return, continue, function calling)
x- Implement array nodes (int[], type[] indentifier = ...)
x- Implement classes and class-only keywords
x- Implement property access (class.prop, array.[0])
x- Param rest operator (...)
7- Import statements at beginning of file, inside parseInitialStatements() instead of parseStatement()
x- Bitwise operations (>>, <<, &, |, ^)
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
  private maxRecursionDepth = 1000;
  private current: Token = this.tokens[0];

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
      token = this.current;
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
    this.current = this.tokens[0];
    const body: Node[] = [];
    let hasErrors = false;

    while (this.current && this.current.type != TokenType.EOF) {
      const statement = this.parseInitialStatement();

      if (statement instanceof BaseError) {
        hasErrors = true;
        this.synchronize();
        
        if(this.withinBounds(this.pos+1)) {
          continue;
        } else {
          break;
        }
      }

      if (statement === null) break;

      body.push(statement);
    }

    while (this.current && this.current.type != TokenType.EOF) {
      const statement = this.parseStatement();

      if (statement instanceof BaseError) {
        hasErrors = true;
        this.synchronize();
        
        if(this.withinBounds(this.pos+1)) {
          continue;
        } else {
          break;
        }
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

      const current = this.current;
      if (current.type === TokenType.KEYWORD) {
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

      if (
        //current.type === TokenType.IDENTIFIER || // removed because return too many errors
        current.type === TokenType.EOF ||

        current.type === TokenType.LBRACE ||
        current.type === TokenType.RBRACE
      ) {
        return;
      }

      this.advance();
    }
  }

  private parseInitialStatement(): ParseResult<Node> | null {
    while (
      this.current &&
      this.current.type === TokenType.KEYWORD && 
      this.current.value === Others.IMPORT
    ) {
      // parse imports

      /*
      import myDefaultClass from "./test.ky";
      import myDefaultClass as Default, { myPublicClass as aliasForPublicClass } from "./test.ky";
      import std from "kyro";
      import std as standard from "kyro";
      import { myPublicClass } from "./test.ky";
      */
      const importToken = this.current;
      this.advance();

      const isNative = this.consumeValue(TokenType.IDENTIFIER, "native");

      // typescript thinks current is still the last token so we need to redeclare
      this.current = this.current; 

      let defaultImport: NodeTypes["Identifier"] | ParseResult<NodeTypes["Identifier"]> | null = null;
        
      if(this.current.type === TokenType.IDENTIFIER) {
        defaultImport = this.parseIdentifier();

        if(defaultImport instanceof BaseError) return defaultImport;
      };

      const namedImports: ImportSpecifier[] = [];

      if((defaultImport != null && this.consume(TokenType.COMMA)) || defaultImport === null) {
        if(!this.consume(TokenType.LBRACE)) {
          return this.errors.SyntaxError.throw(
            "Expected '{'",
            this.file,
            this.getSource()
          )
        }

        while(this.current.type != TokenType.RBRACE && this.current.type != TokenType.EOF) {

          if(namedImports.length > 1) {
            if(!this.consume(TokenType.COMMA)) {
              return this.errors.SyntaxError.throw(
                "Expected ',' before named import",
                this.file,
                this.getSource()
              )
            }
          }

          const namedImport = this.parseIdentifier();

          if(namedImport instanceof BaseError) return namedImport;

          if(this.consumeValue(TokenType.KEYWORD, Others.AS)) {
            const importAlias = this.parseIdentifier();

            if(importAlias instanceof BaseError) return importAlias;

            namedImports.push({
              importedName: namedImport,
              localName: importAlias
            });
          } else {
            namedImports.push({
              importedName: namedImport,
              localName: null
            });
          }
        }

        if(!this.consume(TokenType.RBRACE)) {
          return this.errors.SyntaxError.throw(
            "Expected '}'",
            this.file,
            this.getSource()
          )
        }
      }

      if(!this.consumeValue(TokenType.KEYWORD, Others.FROM)) {
        return this.errors.SyntaxError.throw(
          "Expected 'from' keyword",
          this.file,
          this.getSource()
        )
      }

      if(this.current.type != TokenType.STRING) {
        return this.errors.SyntaxError.throw(
          "Expected a source string",
          this.file,
          this.getSource()
        )
      }

      const source = new Nodes.StringLiteral(
        this.getSource(),
        this.current.value
      );

      this.advance();

      if(!this.consume(TokenType.SEMICOLON)) {
        return this.errors.SyntaxError.throw(
          "Expected ';'",
          this.file,
          this.getSource()
        )
      }

      return new Nodes.ImportDeclaration(
        this.getSource(importToken),
        isNative,
        defaultImport,
        namedImports,
        source
      );
    }
    
    return null;
  }

  private parseStatement(): ParseResult<Node> | null {
    while (
      this.current &&
      this.current.type != TokenType.UNKNOWN &&
      this.current.type != TokenType.EOF
    ) {
      const current = this.current;

      switch (current.type) {
        case TokenType.SEMICOLON: {
          this.advance();
          continue;
        }
        case TokenType.KEYWORD: {
          // Variables

          if (
            current.value === Others.CONST ||
            current.value === DataTypes.INFER ||
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
          if (current.value === Structures.THIS) {
            return this.parsePropertyStatement();
          }

          // Modifiers

          const modifiers = this.parseModifiers(allModifiers);

          if(modifiers instanceof BaseError) return modifiers;

          const newCurrent = this.current;

          // Structures

          if (newCurrent.value === Structures.FUNC) {
            return this.parseFuncDeclaration(modifiers);
          }

          if (newCurrent.value === Structures.CLASS) {
            return this.parseClassDeclaration(modifiers);
          }

          /*
          if (current.value === Structures.TYPE) {
            return this.parseTypeDeclaration();
          }*/

          if(current.value === Structures.MATCH) {
            return this.errors.SyntaxError.throw(
              "Match expressions cannot be statements",
              this.file,
              this.getSource()
            )
          }

          return this.errors.UnexpectedTokenError.throw(
            `Unexpected keyword '${current.value}'`,
            this.file,
            this.getSource(current),
          );
        }

        case TokenType.IDENTIFIER: {
          let nextType = this.next()?.type;

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

          const currentType = this.current.type;
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
          this.current = this.tokens[this.pos];

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

        case TokenType.LBRACE: {
          return this.parseBlock();
        }

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

    if (!this.current || this.current.type === TokenType.EOF) {
      return null;
    }

    return this.errors.UnexpectedTokenError.throw(
      `Unknown token '${this.current.value}'`,
      this.file,
      this.getSource(),
    );
  }

  private parseBlock(): ParseResult<NodeTypes["Block"]> {
    const recursionError = this.enterRecursion();
    if (recursionError) return recursionError;
    
    const first = this.current;

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
      this.current &&
      this.current.type !== TokenType.RBRACE &&
      this.current.type !== TokenType.EOF
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
    const elifToken = this.current;
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
    const first = this.current;
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
    const first = this.current;
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
    const ifToken = this.current;
    this.advance();

    let condition = this.parseExpression();
    if (condition instanceof BaseError) return condition;

    const thenBranch = this.parseBlock();
    if (thenBranch instanceof BaseError) return thenBranch;

    const elifStatements: NodeTypes["ElseIfStatement"][] | undefined = [];
    let elseBlock: NodeTypes["Block"] | undefined = undefined;

    while (
      this.current.type === TokenType.KEYWORD &&
      this.current.value === "elif"
    ) {
      const newElif = this.parseElseIfStatement();
      if (newElif instanceof BaseError) return newElif;

      elifStatements.push(newElif);
    }

    if (
      this.current.type === TokenType.KEYWORD &&
      this.current.value === "else"
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
    const catchToken = this.current;
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
    const throwToken = this.current;
    this.advance();

    const newExp = this.parseNewExpression();
    if (newExp instanceof BaseError) return newExp;

    return new Nodes.ThrowStatement(this.getSource(throwToken), newExp);
  }

  private parseFinallyClause(): ParseResult<NodeTypes["FinallyClause"]> {
    const finallyToken = this.current;
    this.advance();

    const finallyBlock = this.parseBlock();
    if (finallyBlock instanceof BaseError) return finallyBlock;

    return new Nodes.FinallyClause(this.getSource(finallyToken), finallyBlock);
  }

  private parseTryStatement(): ParseResult<NodeTypes["TryStatement"]> {
    const tryToken = this.current;
    this.advance();

    const tryBlock = this.parseBlock();
    if (tryBlock instanceof BaseError) return tryBlock;

    const clauses: NodeTypes["CatchClause"][] = [];

    while(this.consumeValue(TokenType.KEYWORD, ControlFlow.CATCH)) {
      const catchClause = this.parseCatchClause();
      if (catchClause instanceof BaseError) return catchClause;

      clauses.push(catchClause);
    }

    if(clauses.length === 0) {
      return this.errors.SyntaxError.throw(
        "Expected a catch clause",
        this.file,
        this.getSource()
      )
    }

    const finallyClause = this.parseFinallyClause();
    if (finallyClause instanceof BaseError) return finallyClause;

    return new Nodes.TryStatement(
      this.getSource(tryToken),
      tryBlock,
      clauses,
      finallyClause,
    );
  }

  private parseWhileStatement(): ParseResult<NodeTypes["WhileStatement"]> {
    const whileToken = this.current;
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
    const forToken = this.current;
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

    if (this.current.type !== TokenType.RPAREN) {
      const leftExpr = this.parseLeftHandSideExpression();
      if (leftExpr instanceof BaseError) return leftExpr;

      const current = this.current;
      if (
        current.type === TokenType.ASSIGNMENT ||
        current.type === TokenType.PLUS_ASSIGN ||
        current.type === TokenType.MINUS_ASSIGN ||
        current.type === TokenType.MULTIPLY_ASSIGN ||
        current.type === TokenType.DIVIDE_ASSIGN
      ) {
        const assignmentToken = this.current;
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
        current.type === TokenType.INCREMENT ||
        current.type === TokenType.DECREMENT
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
    const startLoc = this.getSource();

    const isRest = this.consume(TokenType.DOT_DOT_DOT);

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

    return new Nodes.Parameter(startLoc, paramIdentifier, paramType, isRest);
  }

  private parseLiteralPattern(): ParseResult<NodeTypes["LiteralPattern"]> {
    const patternToken = this.current;
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
    const startToken = this.current;
    this.advance();

    if (!this.consume(TokenType.DOT_DOT)) {
      return this.errors.SyntaxError.throw(
        `Expected '..' in range pattern`,
        this.file,
        this.getSource(),
      );
    }

    const endToken = this.current;

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
    const patternToken = this.current;

    // Check for range pattern FIRST (1..5)
    if (
      patternToken?.type === TokenType.NUMBER &&
      this.next()?.type  === TokenType.DOT_DOT &&
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

    while (this.current && this.current.type === TokenType.BIT_OR) {
      this.advance();
      const pattern = this.parsePattern(allowGuards);
      if (pattern instanceof BaseError) return pattern;
      patterns.push(pattern);
    }

    return patterns;
  }

  private parseCaseBlock(): ParseResult<NodeTypes["Block"]> {
    const recursionError = this.enterRecursion();
    if (recursionError) return recursionError;
    
    const first = this.current;

    const startedWithBrace = this.consume(TokenType.LBRACE);

    let statements: Node[] = [];

    while (
      this.current &&
      this.current.type !== TokenType.EOF &&
      (
        (startedWithBrace && this.current.type !== TokenType.RBRACE) ||
        (!startedWithBrace && !this.checkToken(TokenType.KEYWORD, ControlFlow.CASE))
      )
    ) {    
      const statement = this.parseStatement();
      if (statement instanceof BaseError) return statement;
      if (statement === null) break;
      statements.push(statement);
    }

    this.consume(TokenType.RBRACE)

    this.exitRecursion();
    return new Nodes.Block(this.getSource(first), statements);
  }

  private parseSwitchStatement(): ParseResult<NodeTypes["SwitchStatement"]> {
    const switchToken = this.current;
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
      this.current &&
      this.current.type !== TokenType.RBRACE &&
      this.current.type !== TokenType.EOF
    ) {
      const caseToken = this.current;

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

        const caseBlock = this.parseCaseBlock();
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

  private parseModifiers(allowed: Set<ModifierName>): ParseResult<typeof Modifiers> {
    const parsed = Modifiers.clone();
  
    while (this.current.type === TokenType.KEYWORD) {
      const mod = this.current.value.toUpperCase() as ModifierName;
      // to uppercase being used here doesn't matter because KEYWORD 
      // token type only accepts the specific lower case versions of the keywords.

      if (!allowed.has(mod)) break;

      if (accessModifiers.has(mod as any) && parsed.hasAnySet(accessModifiers)) {
        const conflictingMod = parsed.getActiveFlags().find(flag => accessModifiers.has(flag as any));
        return this.errors.SyntaxError.throw(
          `Modifier '${mod.toLowerCase()}'${
            conflictingMod ? " conflicts with '"+conflictingMod.toLowerCase()+"'" : "conflicts with another modifier"}`,
          this.file,
          this.getSource(),
        );
      }
      
      if (immutabilityModifiers.has(mod as any) && parsed.hasAnySet(immutabilityModifiers)) {
        const conflictingMod = parsed.getActiveFlags().find(flag => immutabilityModifiers.has(flag as any));
        return this.errors.SyntaxError.throw(
          `Conflicting modifier '${mod}' with '${conflictingMod}'`,
          this.file,
          this.getSource(),
        );
      }

      parsed.set(mod);
      this.advance();
    }
  
    return parsed;
  }
  
  private parseOperator(): OperatorType | null {
    switch (this.current.type) {
      // Arithmetic
      case TokenType.PLUS:       this.advance(); return ArithmeticOperators.PLUS;
      case TokenType.MINUS:      this.advance(); return ArithmeticOperators.MINUS;
      case TokenType.ASTERISK:   this.advance(); return ArithmeticOperators.MULTIPLY;
      case TokenType.SLASH:      this.advance(); return ArithmeticOperators.DIVIDE;
      case TokenType.MOD:        this.advance(); return ArithmeticOperators.MOD;
  
      // Comparison
      case TokenType.COMPARISON: {
        switch (this.current.value) {
          case "==": this.advance(); return ComparisonOperators.EQUAL;
          case "!=": this.advance(); return ComparisonOperators.NOT_EQUAL;
          case "<":  this.advance(); return ComparisonOperators.LESS_THAN;
          case ">":  this.advance(); return ComparisonOperators.GREATER_THAN;
          case "<=": this.advance(); return ComparisonOperators.LESS_EQUAL;
          case ">=": this.advance(); return ComparisonOperators.GREATER_EQUAL;
        }
        return null;
      }
  
      // Logical
      case TokenType.LOGICAL_AND: this.advance(); return LogicalOperators.AND;
      case TokenType.LOGICAL_OR:  this.advance(); return LogicalOperators.OR;
      case TokenType.LOGICAL_NOT: this.advance(); return LogicalOperators.NOT;
  
      // Bitwise
      case TokenType.BIT_AND:     this.advance(); return BitwiseOperators.BIT_AND;
      case TokenType.BIT_OR:      this.advance(); return BitwiseOperators.BIT_OR;
      case TokenType.BIT_XOR:     this.advance(); return BitwiseOperators.BIT_XOR;
      case TokenType.BIT_NOT:     this.advance(); return BitwiseOperators.BIT_NOT;
      case TokenType.BIT_LSHIFT:  this.advance(); return BitwiseOperators.BIT_LSHIFT;
      case TokenType.BIT_RSHIFT:  this.advance(); return BitwiseOperators.BIT_RSHIFT;
      case TokenType.BIT_U_RSHIFT:this.advance(); return BitwiseOperators.BIT_U_RSHIFT;
  
      // Other
      case TokenType.INCREMENT:   this.advance(); return OtherOperators.INCREMENT;
      case TokenType.DECREMENT:   this.advance(); return OtherOperators.DECREMENT;
      case TokenType.LBRACKET: {
        if (this.next().type === TokenType.RBRACKET) {
          this.advance(); // LBRACKET
          this.advance(); // RBRACKET
          return OtherOperators.INDEX;
        }
        return null;
      }
  
      default:
        return null;
    }
  }  

  private parseClassMember(
    classIdentifier: NodeTypes["Identifier"]
  ): ParseResult<NodeTypes["ClassMember"]> {
    const memberToken = this.current;

    let memberModifiers = this.parseModifiers(allModifiers);

    if(memberModifiers instanceof BaseError) return memberModifiers;      
    
    if (
      memberModifiers.has("OPERATOR")
    ) {
      if(memberModifiers.hasAny("ASYNC")) {
        this.errors.SyntaxError.throw(
          "Operator overloads can't be asynchronous",
          this.file,
          this.getSource()
        )
      } else if(memberModifiers.has("READONLY")) {
        this.errors.SyntaxError.throw(
          "Operator overloads can't be readonly",
          this.file,
          this.getSource()
        )
      } else if(memberModifiers.has("DEFAULT")) {
        this.errors.SyntaxError.throw(
          "Operator overloads can't have the default modifier",
          this.file,
          this.getSource()
        )
      }

      let operator = this.parseOperator();

      if(operator === null) {
        return this.errors.SyntaxError.throw(
          "Invalid operator",
          this.file,
          this.getSource(operator)
        )
      }

      const generics = this.parseGenerics();

      if(generics instanceof BaseError) return generics;

      const parameters = this.parseParameterList();

      if(parameters instanceof BaseError) return parameters;

      if (parameters.length === 0) {
        switch (operator) {
          case ArithmeticOperators.PLUS:
            operator = ArithmeticOperators.UNARY_PLUS;
            break;
          case ArithmeticOperators.MINUS:
            operator = ArithmeticOperators.UNARY_MINUS;
            break;
          case LogicalOperators.NOT:
            operator = LogicalOperators.NOT;
            break;
          case BitwiseOperators.BIT_NOT:
            operator = BitwiseOperators.BIT_NOT;
            break;
          case OtherOperators.INCREMENT:
            operator = OtherOperators.INCREMENT;
            break;
          case OtherOperators.DECREMENT:
            operator = OtherOperators.DECREMENT;
            break;
        }
      } else if(parameters.length > 1) {
        return this.errors.SyntaxError.throw(
          `Invalid number of parameters for operator ${operator}`,
          this.file,
          this.getSource()
        );
      }

      if(!this.consume(TokenType.COLON)) {
        return this.errors.SyntaxError.throw(
          "Expected ':' before return type",
          this.file,
          this.getSource()
        )
      }

      const returnType = this.parseTypeReference(TypeReferenceKind.ANY, true);
        
      if (returnType instanceof BaseError) return returnType;

      const body = this.parseBlock();

      if(body instanceof BaseError) return body;

      return new Nodes.OperatorDefinition(
        this.getSource(),
        memberModifiers.getNumberValue(),
        operator,
        parameters,
        returnType,
        body
      )
    } else if (
      this.current.type === TokenType.IDENTIFIER && (
        this.next()?.type === TokenType.LPAREN || this.next()?.type === TokenType.COMPARISON
      )
    ) {
      // parse method
      if(memberModifiers.has("READONLY")) {
        this.errors.SyntaxError.throw(
          "Class methods can't be readonly",
          this.file,
          this.getSource()
        )
      }

      let identifier = this.parseIdentifier();

      if(identifier instanceof BaseError) return identifier;

      const generics = this.parseGenerics();

      if(generics instanceof BaseError) return generics;

      const parameters = this.parseParameterList();

      if(parameters instanceof BaseError) return parameters;

      if(identifier.name === classIdentifier.name) {
        // Constructor parsing
        if(memberModifiers.has("ASYNC")) {
          this.errors.SyntaxError.throw(
            "Constructors can't be asynchronous",
            this.file,
            this.getSource()
          )
        }

        const body = this.parseBlock();

        if(body instanceof BaseError) return body;

        return new Nodes.Constructor(
          this.getSource(),
          memberModifiers.getNumberValue(),
          parameters,
          body
        )
      } else {
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

        if(body instanceof BaseError) return body;

        return new Nodes.MethodDefinition(
          this.getSource(),
          memberModifiers.getNumberValue(),
          identifier,
          generics,
          parameters,
          returnType,
          body
        )
      }
    } else if (
      this.current.value === DataTypes.INFER ||
      Object.values(DataTypes).includes(this.current.value as any) ||
      (this.current.type === TokenType.IDENTIFIER && this.next().type === TokenType.IDENTIFIER)
    ) {
      // parse property
  
      const varType = this.parseVariableType();

      if (varType instanceof BaseError) return varType;

      let identifier = this.parseIdentifier();

      if(identifier instanceof BaseError) return identifier;

      let initializer: Node | undefined = undefined;

      if (this.current.type === TokenType.ASSIGNMENT) {
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

      return new Nodes.PropertyDefinition(
        this.getSource(memberToken),
        memberModifiers.getNumberValue(),
        varType,
        identifier,
        initializer,
      );
    } else {
      return this.errors.SyntaxError.throw(
        "Unexpected token for class member definition",
        this.file,
        this.getSource()
      )
    }
  }

  private parseClassBody(
    classIdentifier: NodeTypes["Identifier"]
  ): ParseResult<{
    properties: NodeTypes["PropertyDefinition"][], 
    methods: NodeTypes["MethodDefinition"][], 
    operators: NodeTypes["OperatorDefinition"][], 
    ctor: NodeTypes["Constructor"] | null
  }> {
    if (!this.consume(TokenType.LBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '{'`,
        this.file,
        this.getSource(),
      );
    }

    let constructor: NodeTypes["Constructor"] | null = null;
    const properties: NodeTypes["PropertyDefinition"][] = [];
    const methods: NodeTypes["MethodDefinition"][] = [];
    const operators: NodeTypes["OperatorDefinition"][] = [];
    
    while (this.current && this.current.type !== TokenType.RBRACE && this.current.type !== TokenType.EOF) {
      const member = this.parseClassMember(classIdentifier);
      if (member instanceof BaseError) return member;

      if(member instanceof Nodes.Constructor) {
        if(constructor === null) {
          constructor = member;
        } else {
          return this.errors.SyntaxError.throw(
            "A class can only have one constructor.",
            this.file,
            member.loc
          )
        }
      } else if (member instanceof Nodes.PropertyDefinition) {
        properties.push(member);
      } else if (member instanceof Nodes.MethodDefinition) {
        methods.push(member);
      } else if (member instanceof Nodes.OperatorDefinition) {
        operators.push(member);
      }
    }
  
    if (!this.consume(TokenType.RBRACE)) {
      return this.errors.SyntaxError.throw(
        `Expected '}'`,
        this.file,
        this.getSource(),
      );
    }
  
    return {operators, properties, methods, ctor: constructor};
  }

  private parseClassDeclaration(modifiers: typeof Modifiers): ParseResult<
    BaseError | NodeTypes["ClassDeclaration"]
  > {
    const classToken = this.current;
    this.advance();

    const identifier = this.parseIdentifier();
    if (identifier instanceof BaseError) return identifier;

    let extending: NodeTypes["TypeReference"] | null = null;
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

    const classBody = this.parseClassBody(identifier);

    if (classBody instanceof BaseError) return classBody;

    return new Nodes.ClassDeclaration(
      this.getSource(classToken),
      modifiers.getNumberValue(),
      identifier,
      extending,
      implementing,
      classBody.ctor,
      classBody.properties,
      classBody.methods,
      classBody.operators
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

    while (this.current.type != TokenType.EOF && this.current.type != TokenType.RPAREN) {
      const parameter = this.parseParameter();
      if (parameter instanceof BaseError) return parameter;

      parameters.push(parameter);

      if (parameter.isRest) {
        // tell typescript current is a new Token since parseParameter advanced for us.
        if (this.current.type as TokenType != TokenType.RPAREN) {
          return this.errors.SyntaxError.throw(
            "A rest parameter must be last in a parameter list.",
            this.file,
            parameter.loc
          );
        }

        break;
      }

      if (this.current.type === TokenType.COMMA) {
        this.advance();
      }
    }

    if (!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ',' or ')' in parameter list`,
        this.file,
        this.getSource(),
      );
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
    while (this.current && this.current.type !== TokenType.RPAREN) {
      const parameter = this.parseExpression();
      if (parameter instanceof BaseError) return parameter;

      parameters.push(parameter);

      if (this.current.type === TokenType.COMMA) {
        this.advance();
      }
    }

    if(!this.consume(TokenType.RPAREN)) {
      return this.errors.SyntaxError.throw(
        `Expected ',' or ')' in parameter list`,
        this.file,
        this.getSource(),
      );
    }

    return parameters;
  }

  private parseFuncDeclaration(modifiers: typeof Modifiers): ParseResult<
    NodeTypes["FunctionDeclaration"]
  > {
    const funcToken = this.current;
    this.advance();

    const identifier = this.parseIdentifier();
    if (identifier instanceof BaseError) return identifier;

    let generics: NodeTypes["TypeReference"][] = [];
    if (
      this.current.type === TokenType.COMPARISON &&
      this.current.value === "<"
    ) {
      const parsedGenerics = this.parseGenerics();
      if (parsedGenerics instanceof BaseError) return parsedGenerics;
      generics = parsedGenerics;
    }

    const parameters = this.parseParameterList();
    if (parameters instanceof BaseError) return parameters;

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
    const calleeToken = this.current;
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
      this.current.type === TokenType.COMPARISON &&
      this.current.value === "<"
    ) {
      const parsedGenerics = this.parseGenerics();

      if (parsedGenerics instanceof BaseError) return parsedGenerics;

      generics = [...parsedGenerics];
    }

    const parameters = this.parseCallParameterList();
    if (parameters instanceof BaseError) return parameters;

    return new Nodes.CallExpression(
      this.getSource(calleeToken),
      identifier,
      generics,
      parameters,
    );
  }

  private parseReturnStatement(): ParseResult<NodeTypes["ReturnStatement"]> {
    const returnToken = this.current;
    this.advance();

    let argument: Node | undefined = undefined;

    if (
      this.current.type !== TokenType.SEMICOLON &&
      this.current.type !== TokenType.EOF
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
    const assignmentToken = this.current;

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
    | NodeTypes["NullLiteral"] | NodeTypes["UndefinedLiteral"]
  > {
    const current = this.current;

    if (current.type === TokenType.KEYWORD && current.value === DataTypes.VOID) {
      this.advance();
      return new Nodes.VoidType(this.getSource(current));
    } else if(current.type === TokenType.NULL) {
      this.advance();
      return new Nodes.NullLiteral(this.getSource(current));
    } else if(current.type === TokenType.UNDEFINED) {
      this.advance();
      return new Nodes.UndefinedLiteral(this.getSource(current));
    }
    return this.parseTypeReference(TypeReferenceKind.ANY, true);
  }

  private parseGenerics(): ParseResult<NodeTypes["TypeReference"][]> {
    const generics: NodeTypes["TypeReference"][] = [];
    if (!this.consumeValue(TokenType.COMPARISON, "<")) {
      return [];
    }
    while (
      !this.checkToken(TokenType.COMPARISON, ">")
    ) {
      const generic = this.parseTypeReference(TypeReferenceKind.ANY, true);
      if (generic instanceof BaseError) return generic;

      if (generic instanceof Nodes.ArrayType) {
        generics.push(generic.elementType);
      } else generics.push(generic);

      if (this.current.type === TokenType.COMMA) this.advance();
    }

    if (!this.consume(TokenType.COMPARISON) && this.current.value === ">") {
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
    const current = this.current;
    let baseType: NodeTypes["TypeReference"];

    if (
      current.type === TokenType.KEYWORD &&
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
    } else if (current.type === TokenType.IDENTIFIER) {
      this.advance();
      const generics =
        this.current.type === TokenType.COMPARISON &&
        this.current.value === "<"
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
      this.current.type === TokenType.LBRACKET &&
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
    const current = this.current;

    if (current.type === TokenType.IDENTIFIER) {
      this.advance();
      return new Nodes.Identifier(this.getSource(current), current.value);
    }

    return this.errors.SyntaxError.throw(
      `Expected an identifier`,
      this.file,
      this.getSource(current),
    );
  }

  private parseVariableType(): ParseResult<
    NodeTypes["TypeReference"]
    | NodeTypes["InferType"]
    | NodeTypes["ArrayType"]
    | NodeTypes["NullLiteral"]
    | NodeTypes["UndefinedLiteral"]
  > {
    let type:
      NodeTypes["TypeReference"]
      | NodeTypes["InferType"]
      | NodeTypes["ArrayType"]
      | NodeTypes["NullLiteral"]
      | NodeTypes["UndefinedLiteral"]
      | null = null;

    if (this.checkToken(TokenType.KEYWORD, DataTypes.INFER)) {
      type = new Nodes.InferType(this.getSource());
      this.advance();
    } else if(this.current.type === TokenType.NULL) {
      type = new Nodes.NullLiteral(this.getSource());
      this.advance();
    } else if(this.current.type === TokenType.UNDEFINED) {
      type = new Nodes.UndefinedLiteral(this.getSource());
      this.advance();
    } else {
      const parsedType = this.parseTypeReference(TypeReferenceKind.ANY, true);
      if (parsedType instanceof BaseError) return parsedType;
      type = parsedType;
    }

    return type;
  }

  private parseVariableDeclaration(): ParseResult<
    NodeTypes["VariableDeclaration"]
  > {
    const first = this.current;

    const isConstant = this.consumeValue(TokenType.KEYWORD, Others.CONST);

    let type = this.parseVariableType();

    if(type instanceof BaseError) return type;

    const identifiers: NodeTypes["Identifier"][] = [];

    const firstIdentifier = this.parseIdentifier();
    if (firstIdentifier instanceof BaseError) return firstIdentifier;
    identifiers.push(firstIdentifier);

    while (this.current.type === TokenType.COMMA) {
      this.advance();
      const nextIdentifier = this.parseIdentifier();
      if (nextIdentifier instanceof BaseError) return nextIdentifier;
      identifiers.push(nextIdentifier);
    }

    let initializer: Node | undefined = undefined;

    if (this.current.type === TokenType.ASSIGNMENT) {
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

  private parseMatchPattern(): ParseResult<NodeTypes["Pattern"]> {
    const patternToken = this.current;

    /*
    match x {
      0 => "zero";                       // LiteralPattern
      ERROR => "error";                  // IdentifierPattern
      std.MAX_INT => "max";              // MemberPattern
      1..5 => "small";                   // RangePattern
      as y : y > 10 => "big";            // BindingPattern + GuardedPattern
      default => "other";                      // WildcardPattern
    }
    */

    let pattern: ParseResult<NodeTypes["Pattern"]> | undefined = undefined;
    const next = this.next();

    if(this.current.type === TokenType.IDENTIFIER) {
      let expr = this.parseLeftHandSideExpression(false); // dont allow computed

      if(expr instanceof BaseError) return expr;

      if(expr instanceof Nodes.Identifier) {
        pattern = new Nodes.IdentifierPattern(
          this.getSource(),
          expr
        )
      } else {
        pattern = new Nodes.MemberPattern(
          this.getSource(),
          expr.object,
          expr.property
        )
      }
    } else if (this.current.type === TokenType.KEYWORD) {
      if (this.current.value === Others.AS) {
        if (next.type === TokenType.IDENTIFIER) {
          pattern = new Nodes.BindingPattern(
            this.getSource(),
            new Nodes.Identifier(
              this.getSource(next),
              next.value
            )
          )
          this.advance();
          this.advance();
        } else {
          return this.errors.SyntaxError.throw(
            "Expected identifier",
            this.file,
            this.getSource()
          );
        }
      } else if (this.current.value === ControlFlow.DEFAULT) {
        this.advance();
        return new Nodes.WildcardPattern(this.getSource(this.previous()));
      } else {
        return this.errors.SyntaxError.throw(
          "Expected a pattern keyword",
          this.file,
          this.getSource()
        );
      }
    } else if (
      patternToken.type === TokenType.NUMBER &&
      next.type  === TokenType.DOT_DOT &&
      this.next(1)?.type === TokenType.NUMBER
    ) {
      pattern = this.parseRangePattern();
    } else if (
      patternToken.type === TokenType.STRING ||
      patternToken.type === TokenType.NUMBER ||
      patternToken.type === TokenType.BOOLEAN
    ) {
      pattern = this.parseLiteralPattern();
    } else {
      return this.errors.SyntaxError.throw(
        "Expected a pattern",
        this.file,
        this.getSource(patternToken)
      )
    }

    if(pattern instanceof BaseError) return pattern;

    if(this.consume(TokenType.COLON)) {
      // parse guard for pattern and guard it

      const expr = this.parseExpression();

      if(expr instanceof BaseError) return expr;

      pattern = new Nodes.GuardedPattern(
        this.getSource(),
        pattern as NodeTypes["Pattern"],
        expr
      );
    }

    return pattern as NodeTypes["Pattern"];
  }

  private parseMatchArm(): ParseResult<NodeTypes["MatchArm"]> {
    let pattern = this.parseMatchPattern();

    if(pattern instanceof BaseError) return pattern;

    if(!this.consume(TokenType.ARROW)) {
      return this.errors.SyntaxError.throw(
        "Expected '=>' after pattern",
        this.file,
        this.getSource()
      )
    }

    let consequence = this.parseExpression();

    if(consequence instanceof BaseError) return consequence;

    if(!this.consume(TokenType.SEMICOLON)) {
      return this.errors.SyntaxError.throw(
        "Expected ';'",
        this.file,
        this.getSource()
      )
    }

    return new Nodes.MatchArm(
      pattern.loc,
      pattern,
      consequence
    )
  }

  private parseMatchExpression(): ParseResult<NodeTypes["MatchExpression"]> {
    const matchToken = this.current;
    this.advance();

    const expr = this.parseExpression();
    if(expr instanceof BaseError) return expr;

    if(!this.consume(TokenType.LBRACE)) {
      return this.errors.SyntaxError.throw(
        "Expected '{'",
        this.file,
        this.getSource()
      )
    }

    const arms: NodeTypes["MatchArm"][] = [];
    let hasDefaultArm = false;

    while(this.current.type != TokenType.RBRACE && this.current.type != TokenType.EOF) {
      const arm = this.parseMatchArm();
      if(arm instanceof BaseError) return arm;
      if(arm.pattern instanceof Nodes.WildcardPattern) {
        if(hasDefaultArm) {
          return this.errors.SyntaxError.throw(
            "Default arm for match expected",
            this.file,
            arm.pattern.loc
          )
        } else hasDefaultArm = true;
      }
      arms.push(arm);
    }

    if(!this.consume(TokenType.RBRACE)) {
      return this.errors.SyntaxError.throw(
        "Expected '}'",
        this.file,
        this.getSource()
      )
    }

    return new Nodes.MatchExpression(
      this.getSource(matchToken),
      expr,
      arms,
    )
  }

  private parseLeftHandSideExpression(allowComputed: boolean = true): ParseResult<
    | NodeTypes["Identifier"]
    | NodeTypes["MemberExpression"]
  > {
    let expr = this.parseIdentifier() as ParseResult<
      NodeTypes["Identifier"] | NodeTypes["MemberExpression"]
    >;
    if (expr instanceof BaseError) return expr;

    while (true) {
      const current = this.current;

      if (current.type === TokenType.DOT) {
        this.advance();
        const property = this.parseIdentifier();
        if (property instanceof BaseError) return property;

        expr = new Nodes.MemberExpression(
          this.getSource(),
          expr,
          property,
          false,
        );
      } else if (current.type === TokenType.LBRACKET) {
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

        if(!allowComputed) {
          return this.errors.SyntaxError.throw(
            "Computed member access is not allowed in this context.",
            this.file,
            this.getSource(current)
          )
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

    console.log("Parsing expression ", this.current)
    
    const result = this.parseConditionalExpression() as Expression;
    this.exitRecursion();
    return result;
  }

  private parseConditionalExpression(): ParseResult<Node> {
    let expr = this.parseLogicalOrExpression();
    if (expr instanceof BaseError) return expr;

    if (this.current.type === TokenType.QUESTION) {
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

    while (this.current.type === TokenType.LOGICAL_OR) {
      const operator = this.current;
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
    let left = this.parseBitwiseOrExpression();
    if (left instanceof BaseError) return left;

    while (this.current.type === TokenType.LOGICAL_AND) {
      const operator = this.current;
      this.advance();

      const right = this.parseBitwiseOrExpression();
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
    let left = this.parseIsExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current.type === TokenType.COMPARISON &&
      (this.current.value === "==" || this.current.value === "!=")
    ) {
      const operator = this.current;
      this.advance();

      const right = this.parseIsExpression();
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

  private parseIsExpression(): ParseResult<Node> {
    let left = this.parseRelationalExpression();
    if (left instanceof BaseError) return left;
  
    while (this.consumeValue(TokenType.KEYWORD, ComparisonKeywords.IS)) {  
      if (
        this.current.type != TokenType.KEYWORD || (
          this.current.value != ComparisonKeywords.ANY &&
          this.current.value != ComparisonKeywords.ALL &&
          this.current.value != ComparisonKeywords.NONE
        )
      ) {
        return this.errors.SyntaxError.throw(
          "Expected 'any', 'all', or 'none'",
          this.file,
          this.getSource()
        );
      }
      const mode = this.current.value;
      this.advance();
  
      // Expect "of"
      if (!this.consumeValue(TokenType.KEYWORD, ComparisonKeywords.OF)) {
        return this.errors.SyntaxError.throw(
          'Expected "of" after mode in "is" expression',
          this.file,
          this.getSource()
        );
      }

      let values: NodeTypes["Identifier"] | NodeTypes["ArrayExpression"];
  
      if(this.current.type as TokenType === TokenType.IDENTIFIER) {
        let id = this.parseIdentifier();

        if(id instanceof BaseError) return id;

        values = id;
      } else {
        let arr = this.parseArrayExpression();

        if(arr instanceof BaseError) return arr;

        values = arr;
      }
  
      left = new Nodes.IsExpression(left, mode, values);
    }
  
    return left;
  }  

  private parseRelationalExpression(): ParseResult<Node> {
    let left = this.parseBitwiseShiftExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current.type === TokenType.COMPARISON &&
      ["<", ">", "<=", ">="].includes(this.current.value || "")
    ) {
      const operator = this.current;
      this.advance();

      const right = this.parseBitwiseShiftExpression();
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
      this.current.type === TokenType.PLUS ||
      this.current.type === TokenType.MINUS
    ) {
      const operator = this.current;
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
      this.current.type === TokenType.ASTERISK ||
      this.current.type === TokenType.SLASH ||
      this.current.type === TokenType.MOD
    ) {
      const operator = this.current;
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

  private parseBitwiseOrExpression(): ParseResult<Node> {
    let left = this.parseBitwiseXorExpression();
    if (left instanceof BaseError) return left;

    while (this.current.type === TokenType.BIT_OR) {
      const operator = this.current;
      this.advance();

      const right = this.parseBitwiseXorExpression();
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

  private parseBitwiseXorExpression(): ParseResult<Node> {
    let left = this.parseBitwiseAndExpression();
    if (left instanceof BaseError) return left;

    while (this.current.type === TokenType.BIT_XOR) {
      const operator = this.current;
      this.advance();

      const right = this.parseBitwiseAndExpression();
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

  private parseBitwiseAndExpression(): ParseResult<Node> {
    let left = this.parseEqualityExpression();
    if (left instanceof BaseError) return left;

    while (this.current.type === TokenType.BIT_AND) {
      const operator = this.current;
      this.advance();

      const right = this.parseEqualityExpression();
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

  private parseBitwiseShiftExpression(): ParseResult<Node> {
    let left = this.parseAdditionExpression();
    if (left instanceof BaseError) return left;

    while (
      this.current.type === TokenType.BIT_LSHIFT ||
      this.current.type === TokenType.BIT_RSHIFT ||
      this.current.type === TokenType.BIT_U_RSHIFT
    ) {
      const operator = this.current;
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

  private parseUnaryExpression(): ParseResult<Node> {
    const current = this.current;
    if (
      current.type === TokenType.INCREMENT ||
      current.type === TokenType.DECREMENT
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
      current.type === TokenType.LOGICAL_NOT ||
      current.type === TokenType.BIT_NOT ||
      current.type === TokenType.MINUS
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

    if (
      current.type === TokenType.KEYWORD &&
      current.value === Execution.AWAIT
    ) {
      this.advance();
      const operand = this.parseUnaryExpression();
      if (operand instanceof BaseError) return operand;

      return new Nodes.AwaitExpression(
        this.getSource(current),
        operand
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

    return this.current.type === type && this.current.value === value;
  }

  private parsePropertyStatement(): ParseResult<Node> {
    const left = this.parsePostfixExpression();
    if (left instanceof BaseError) return left;
    
    if (this.current?.type === TokenType.ASSIGNMENT) {
      const assignmentToken = this.current;
      const isCompound = assignmentToken.type !== TokenType.ASSIGNMENT;
      
      this.advance();
      const right = this.parseExpression();
      if (right instanceof BaseError) return right;
      
      return new Nodes.Assignment(
        this.getSource(),
        left as NodeTypes["Identifier"] | NodeTypes["MemberExpression"] | NodeTypes["ArrayExpression"],
        right
      );
    } else {
      return new Nodes.ExpressionStatement(this.getSource(), left);
    }
  }

  private parsePostfixExpression(): ParseResult<Node> {
    let expr = this.parsePrimaryExpression();
    if (expr instanceof BaseError) return expr;

    console.log("Checking postfix exp")

    while (this.current && this.current.type !== TokenType.EOF) {
      const current = this.current;

      if (current.type === TokenType.DOT) {
        this.advance();
        const property = this.parseIdentifier();
        if (property instanceof BaseError) return property;

        expr = new Nodes.MemberExpression(
          this.getSource(),
          expr,
          property,
          false,
        );
      } else if (current.type === TokenType.LBRACKET) {
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

        const parameters = this.parseCallParameterList();
        if (parameters instanceof BaseError) return parameters;

        expr = new Nodes.CallExpression(
          this.getSource(),
          expr,
          parsedGenerics,
          parameters,
        );
      } else if (current.type === TokenType.LPAREN) {
        const parameters = this.parseCallParameterList();
        if (parameters instanceof BaseError) return parameters;

        expr = new Nodes.CallExpression(this.getSource(), expr, [], parameters);
      } else if (
        current.type === TokenType.INCREMENT ||
        current.type === TokenType.DECREMENT
      ) {
        console.log("detected postfix op")
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
    const first = this.current;
    this.advance();

    const elements: Node[] = [];

    while (this.current.type != TokenType.RBRACKET) {
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
    const current = this.current;

    switch (current.type) {
      case TokenType.LBRACKET:
        return this.parseArrayExpression();

      case TokenType.BOOLEAN:
        this.advance();
        return new Nodes.BooleanLiteral(
          this.getSource(current),
          current.value === "true",
        );

      case TokenType.UNDEFINED:
        this.advance();
        return new Nodes.UndefinedLiteral(
          this.getSource(current)
        );
      
      case TokenType.NULL:
        this.advance();
        return new Nodes.NullLiteral(
          this.getSource(current)
        );

      case TokenType.NAN:
        this.advance();
        return new Nodes.NaNLiteral(
          this.getSource(current)
        );

      case TokenType.NUMBER:
        this.advance();
        return new Nodes.NumberLiteral(
          this.getSource(current),
          parseFloat(current.value),
        );

      case TokenType.STRING:
        this.advance();
        return new Nodes.StringLiteral(this.getSource(current), current.value);

      case TokenType.KEYWORD:
        switch (current.value) {
          case Structures.NEW:
            return this.parseNewExpression();
          case Structures.THIS:
            this.advance();
            return new Nodes.ThisReference(this.getSource(current));
          case Structures.MATCH:
            return this.parseMatchExpression();
          default:
            break;
        }
        break;

      case TokenType.IDENTIFIER:
        if (
          this.next().type === TokenType.LPAREN ||
          this.isGenericPattern(this.pos + 1)
        ) {
          return this.parseCallExpression();
        }
        this.advance();
        return new Nodes.Identifier(this.getSource(current), current.value);

      case TokenType.LPAREN: {
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
    }

    return this.errors.SyntaxError.throw(
      `Unexpected token in expression`,
      this.file,
      this.getSource(current),
    );
  }

  private parseNewExpression(): ParseResult<NodeTypes["NewExpression"]> {
    const newToken = this.current;
    this.advance();

    const callee = this.parseIdentifier();
    if (callee instanceof BaseError) return callee;

    const args = this.parseCallParameterList();
    if (args instanceof BaseError) return args;

    return new Nodes.NewExpression(this.getSource(newToken), callee, args);
  }

  private withinBounds(pos: number = this.pos) {
    return pos >= 0 && pos < this.tokens.length;
  }
  private outOfBounds(pos: number = this.pos) {
    return pos < 0 || pos >= this.tokens.length;
  }
  private updateCurrent() {
    this.current = this.tokens[this.pos];
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
    if (this.withinBounds(this.pos+1)) {
      this.pos++;
      this.updateCurrent();
    };
  }
  private backtrack() {
    if (this.pos > 0) {
      this.pos--;
      this.updateCurrent();
    };
  }
  private backtrackUntil(type: TokenType) {
    for (let i = this.pos; i > 0; i--) {
      if (this.tokens[i].type === type) {
        this.pos = i;
        this.updateCurrent();
        return this.tokens[i];
      }
    }
  }
  private advanceUntil(type: TokenType) {
    for (let i = this.pos; i < this.tokens.length; i++) {
      if (this.tokens[i].type === type) {
        this.pos = i;
        this.updateCurrent();
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
    if (this.current.type === expected && this.withinBounds()) {
      this.advance();
      return true;
    } else return false;
  }
  private consumeValue(expected: TokenType, value: string) {
    if (
      this.withinBounds() &&
      this.current.type === expected &&
      this.current.value === value
    ) {
      this.advance();
      return true;
    } else return false;
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
