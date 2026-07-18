import type { Token } from './types';

export class Lexer {
  private inputText: string;
  private tokens: Token[];
  private currentIndex: number;
  private errors: string[];
  private line: number;
  private column: number;

  constructor(inputText: string) {
    this.inputText = inputText;
    this.tokens = [];
    this.currentIndex = 0;
    this.errors = [];
    this.line = 1;
    this.column = 1;
  }

  advance() {
    const char = this.inputText[this.currentIndex];
    this.currentIndex++;
    if (char === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return char;
  }

  atEnd() {
    return this.currentIndex >= this.inputText.length;
  }

  peek() {
    return this.inputText[this.currentIndex];
  }

  skipwhites() {
    while (!this.atEnd() && /\s/.test(this.inputText[this.currentIndex])) {
      this.currentIndex++;
    }
  }

  readcommand() {
    let command = ""
    while (!this.atEnd() && /[a-zA-Z]/.test(this.peek())) {
      command = command + this.advance();
    }
    return command;
  }

  tokenize() {
    try {
      while (!this.atEnd()) {
        this.skipwhites();
        if (this.atEnd()) break;

        const char = this.peek();

        if (char === '\\') {
          // Handle command names
          this.advance(); // Consume '\'
          if (this.peek() === '$') {
            this.advance();
            if (this.peek() === '$') {
              this.advance();
              this.tokens.push({ type: 'MATH_DIS', value: '$$', line: this.line, column: this.column });
            }
            else {
              this.tokens.push({ type: 'MATH_IN', value: '$', line: this.line, column: this.column });
            }
          } else {
            const commandName = this.readcommand();
            this.tokens.push({ type: 'COMMAND', value: commandName, line: this.line, column: this.column });
          }
        } else if (char === '{') {
          // Handle left brace
          this.advance();
          this.tokens.push({ type: 'LBRACE', value: '{', line: this.line, column: this.column });
        } else if (char === '}') {
          // Handle right brace
          this.advance();
          this.tokens.push({ type: 'RBRACE', value: '}', line: this.line, column: this.column });
        } else if (char === '[') {
          // Handle left bracket
          this.advance();
          this.tokens.push({ type: 'LBRACKET', value: '[', line: this.line, column: this.column });
        } else if (char === ']') {
          // Handle right bracket
          this.advance();
          this.tokens.push({ type: 'RBRACKET', value: ']', line: this.line, column: this.column });
        } else if (char === '$') {
          this.advance();
          if (this.peek() === '$') {
            this.advance();
            this.tokens.push({ type: 'MATH_DIS', value: '$$', line: this.line, column: this.column });
          }
          else {
            this.tokens.push({ type: 'MATH_IN', value: '$', line: this.line, column: this.column });
          }
        } else if (char === '\n' || char === '\r') {
          this.advance();
          this.tokens.push({ type: 'NEWLINE', value: ' ', line: this.line, column: this.column });
        }
        else {
          // Handle content
          let content = "";
          const startLine = this.line;
          const startColumn = this.column;

          while (!this.atEnd() && !'\\{}[]$'.includes(this.peek())) {
            content += this.advance();
          }

          if (content.length > 0) {
            content = content.trim();
            if (content.length > 0) {
              this.tokens.push({ type: 'CONTENT', value: content, line: startLine, column: startColumn });
            }
          }
        }
      }
      this.tokens.push({ type: 'EOF', line: this.line, column: this.column });

      const result = {
        tokens: this.tokens,
        errors: this.errors,
        hasErrors: this.errors.length > 0
      };

      return JSON.stringify(result.hasErrors ? result : this.tokens, null, 2);
    } catch (error) {
      console.error('Lexer error:', error);
      this.errors.push(`Lexer error: ${error}`);
      return JSON.stringify({
        tokens: this.tokens,
        errors: this.errors,
        hasErrors: true,
        criticalError: true
      }, null, 2);
    }
  }
}

