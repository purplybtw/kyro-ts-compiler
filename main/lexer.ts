import { TokenType, Token } from '../types/tokens';
import { KEYWORDS, type Keyword } from '../types/keywords';
import { BaseError, LocalErrors, FileInput } from '../util/errors';
import { buildSourceLocation } from '../ast/nodes';
import { MainConfig } from '../types/global';
import { LocalWarnings } from '../util/warnings';
import { getFileContent } from '../util/any';
export { TokenType, Token };
export { KEYWORDS, Keyword };

export class Lexer {
  private input: string = '';
  private line: number = 1;
  private col: number = 0;
  private pos: number = 0;
  private errors: LocalErrors;
  private file: FileInput;
  private warn: LocalWarnings;

  constructor(c: MainConfig){
    this.errors = c.errors;
    this.warn = c.warn;
    this.file = c.file;
  };

  public tokenize(): Token[] | BaseError {
    const tokens = [];
    this.input = getFileContent(this.file.path);
    let hasErrors = false;
    while (this.pos < this.input.length) {
      const token = this.nextToken();
      if(token instanceof BaseError) {
        hasErrors = true;
        this.synchronize();
        continue;
      };
      if (token != null) {
        tokens.push(token);
      }
    }
    if(hasErrors) return this.errors.ProgramParsingError.throw(
      "Failed to parse program", this.file, buildSourceLocation(0, 0, 0)
    )
    return tokens;
  }

  private nextToken(): Token | BaseError | null {
    const char = this.input[this.pos];

    if (this.pos >= this.input.length) {
      return new Token(TokenType.EOF, "", this.pos, this.line, this.col);
    }

    if (this.isWhitespace(char)) {
      this.advance();
      return null;
    }

    if (this.isDigit(char)) {
      return this.number();
    }

    if (char === '.' && this.isDigit(this.next())) {
      return this.number();
    }

    if (this.isAlpha(char)) {
      return this.identifier();
    }

    if (char === '"' || char == "'") {
      return this.string(char);
    }

    if(this.match("//")) {
      this.advance(2);
      while(!this.match("\n") && this.current() !== '\0') {
        this.advance();
      }
      return null;
    } else if (this.match("/*")) {
      const startLoc = buildSourceLocation(this.pos, this.line, this.col)
      this.advance(2);
      while(!this.match("*/") && this.current() !== '\0') {
        this.advance();
      }
      if (this.pos < this.input.length) {
        this.advance(2);
      } else {
        return this.errors.SyntaxError.throw(
          `Unterminated block comment`,
          this.file,
          startLoc
        )
      }
      return null;
    }

    let current = this.current();
    let next = this.next();
    let prevLine = this.line;
    let prevCol = this.col;

    if (current === "&" && next === "&") {
      this.advance(2);
      return new Token(TokenType.LOGICAL_AND, "&&", this.pos - 2, prevLine, prevCol);
    }

    if (current === "|" && next === ">") {
      this.advance(2);
      return new Token(TokenType.PIPE_FORWARD, "|>", this.pos - 2, prevLine, prevCol);
    }

    if (current === "|" && next === "|") {
      this.advance(2);
      return new Token(TokenType.LOGICAL_OR, "||", this.pos - 2, prevLine, prevCol);
    }

    if (current === "+" && next === "+") {
      this.advance(2);
      return new Token(TokenType.INCREMENT, "++", this.pos - 2, prevLine, prevCol);
    }

    if (current === "-" && next === "-") {
      this.advance(2);
      return new Token(TokenType.DECREMENT, "--", this.pos - 2, prevLine, prevCol);
    }

    if (current === "+" && next === "=") {
      this.advance(2);
      return new Token(TokenType.PLUS_ASSIGN, "+=", this.pos - 2, prevLine, prevCol);
    }

    if (current === "-" && next === "=") {
      this.advance(2);
      return new Token(TokenType.MINUS_ASSIGN, "-=", this.pos - 2, prevLine, prevCol);
    }

    if (current === "*" && next === "=") {
      this.advance(2);
      return new Token(TokenType.MULTIPLY_ASSIGN, "*=", this.pos - 2, prevLine, prevCol);
    }

    if (current === "/" && next === "=") {
      this.advance(2);
      return new Token(TokenType.DIVIDE_ASSIGN, "/=", this.pos - 2, prevLine, prevCol);
    }

    if (current === "." && next === ".") {
      this.advance(2);
      return new Token(TokenType.DOT_DOT, "..", this.pos - 2, prevLine, prevCol);
    }

    if (
      (
        (current === ">"
        || current === "<"
        || current === "!")
        && next === "="
      ) ||
      (current === "=" && next === "=")
    ) {
      this.advance(2);
      return new Token(TokenType.COMPARISON, current+next, this.pos - 2, prevLine, prevCol);
    } else if (current === ">" || current === "<") {
      this.advance();
      return new Token(TokenType.COMPARISON, current, this.pos - 1, prevLine, prevCol);
    }

    if (current === "=" && next === ">") {
      this.advance(2);
      return new Token(TokenType.ARROW, '=>', this.pos - 2, prevLine, prevCol);
    }

    switch (char) {
      case '(': {
        this.advance();
        return new Token(TokenType.LPAREN, '(', this.pos - 1, prevLine, prevCol);
      }
      case ')': {
        this.advance();
        return new Token(TokenType.RPAREN, ')', this.pos - 1, prevLine, prevCol);
      }
      case '{': {
        this.advance();
        return new Token(TokenType.LBRACE, '{', this.pos - 1, prevLine, prevCol);
      }
      case '}': {
        this.advance();
        return new Token(TokenType.RBRACE, '}', this.pos - 1, prevLine, prevCol);
      }
      case '[': {
        this.advance();
        return new Token(TokenType.LBRACKET, '[', this.pos - 1, prevLine, prevCol);
      }
      case ']': {
        this.advance();
        return new Token(TokenType.RBRACKET, ']', this.pos - 1, prevLine, prevCol);
      }
      case ',': {
        this.advance();
        return new Token(TokenType.COMMA, ',', this.pos - 1, prevLine, prevCol);
      }
      case ';': {
        this.advance();
        return new Token(TokenType.SEMICOLON, ';', this.pos - 1, prevLine, prevCol);
      }
      case '|': {
        this.advance();
        return new Token(TokenType.PIPE, '|', this.pos - 1, prevLine, prevCol);
      }
      case ':': {
        this.advance();
        return new Token(TokenType.COLON, ':', this.pos - 1, prevLine, prevCol);
      }
      case '=': {
        this.advance();
        return new Token(TokenType.ASSIGNMENT, '=', this.pos - 1, prevLine, prevCol);
      }
      case '+': {
        this.advance();
        return new Token(TokenType.PLUS, '+', this.pos - 1, prevLine, prevCol);
      }
      case '-': {
        this.advance();
        return new Token(TokenType.MINUS, '-', this.pos - 1, prevLine, prevCol);
      }
      case '*': {
        this.advance();
        return new Token(TokenType.ASTERISK, '*', this.pos - 1, prevLine, prevCol);
      }
      case '/': {
        this.advance();
        return new Token(TokenType.SLASH, '/', this.pos - 1, prevLine, prevCol);
      }
      case '.': {
        this.advance();
        return new Token(TokenType.DOT, '.', this.pos - 1, prevLine, prevCol);
      }
      case '!': {
        this.advance();
        return new Token(TokenType.LOGICAL_NOT, '!', this.pos - 1, prevLine, prevCol);
      }
      case '?': {
        this.advance();
        return new Token(TokenType.QUESTION, '?', this.pos - 1, prevLine, prevCol);
      }
    }

    this.advance();
    return new Token(TokenType.UNKNOWN, char, this.pos - 1, prevLine, prevCol);
  }

  private match(expected: string): boolean {
    if (this.pos + expected.length > this.input.length) {
      return false;
    }
    return this.input.substring(this.pos, this.pos + expected.length) === expected;
  }

  private current(): string {
    if (this.pos >= this.input.length) {
      return '\0';
    }
    return this.input[this.pos];
  }

  private next(): string {
    if (this.pos >= this.input.length) {
      return '\0';
    }
    return this.input[this.pos+1];
  }

  private advance(amount: number = 1) {
    if(this.current() === "\n") {
      this.line++;
      this.col = 0;
    } else {
      this.col++;
    };
    this.pos += amount;
  }

  private backtrack(amount: number = 1) {
    while (amount > 0) {
      this.pos--;
      if(this.current() === "\n" || this.pos < 0) {
        this.line--;
        this.col = this.input.slice(0, this.pos).lastIndexOf("\n") == -1
          ? this.pos
          : this.pos - this.input.slice(0, this.pos).lastIndexOf("\n") - 1;
      } else {
        this.col--;
      };
      amount--;
    }
  }

  private number(): Token {
    const start = this.pos;
    const prevLine = this.line;
    const prevCol = this.col;

    let isDecimal = false;
    let parsed: string = '';
    
    // Handle leading decimal point
    if (this.current() === '.') {
      parsed += '0.';
      isDecimal = true;
      this.advance();
    }
    
    while(
      (this.pos < this.input.length && this.isDigit(this.current()))
      || (this.current() === '.' && !isDecimal && this.next() !== '.' && (isDecimal = true))
    ) {
      parsed += this.current();
      this.advance();
    }
    return new Token(TokenType.NUMBER, parsed, start, prevLine, prevCol);
  }

  private string(startQuote: "'" | '"'): Token | BaseError {
    const start = this.pos;
    const prevLine = this.line;
    const prevCol = this.col;

    this.advance();
    let parsed: string = '';

    while(this.pos < this.input.length && this.current() != startQuote) {
      if (this.current() === '\\') {
        this.advance();
        if (this.pos < this.input.length) {
          const escaped = this.current();
          switch (escaped) {
            case 'n': parsed += '\n'; break;
            case 't': parsed += '\t'; break;
            case 'r': parsed += '\r'; break;
            case '\\': parsed += '\\'; break;
            default: parsed += escaped; break;
          }
          this.advance();
        }
      } else {
        parsed += this.current();
        this.advance();
      }
    }

    if(startQuote !== this.current())
      return this.errors.SyntaxError.throw(
        `Unterminated string literal`, 
        this.file,
        buildSourceLocation(start, prevLine, prevCol)
      );

    if (this.pos < this.input.length) {
      this.advance();
    }

    return new Token(TokenType.STRING, parsed, start, prevLine, prevCol);
  }

  private identifier(): Token {
    const startPos = this.pos;
    const prevLine = this.line;
    const prevCol = this.col;

    let value = '';

    while (this.pos < this.input.length && (this.isAlphaNumeric(this.current()) || this.current() === '_')) {
      value += this.current();
      this.advance();
    }

    if (value === 'true' || value === 'false') {
      return new Token(TokenType.BOOLEAN, value, startPos, prevLine, prevCol);
    } else if (this.isKeyword(value)) {
      return new Token(TokenType.KEYWORD, value, startPos, prevLine, prevCol);
    }

    return new Token(TokenType.IDENTIFIER, value, startPos, prevLine, prevCol);
  }

  private isKeyword(value: string): boolean {
    return KEYWORDS.includes(value as Keyword);
  }

  private isWhitespace(char: string): boolean {
    return /\s/.test(char);
  }

  private isDigit(char: string): boolean {
    return /\d/.test(char);
  }

  private isAlpha(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }

  private synchronize(): void {
    this.advance();

    while (this.pos < this.input.length) {
      const char = this.current();
      
      if (this.isWhitespace(char) || char === '\n') {
        return;
      }
      
      if (this.isAlpha(char) || this.isDigit(char) || char === '"' || char === "'") {
        return;
      }
      
      if (['{', '}', '(', ')', '[', ']', ';'].includes(char)) {
        return;
      }

      this.advance();
    }
  }
}