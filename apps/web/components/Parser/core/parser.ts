import type { Token } from './types';

export class Parser {
    tokens: Token[];
    current: number;
    errors: string[];

    constructor(tokens: Token[]) {
        this.tokens = tokens;
        this.current = 0;
        this.errors = [];
    }

peek (offset = 0) {
    const index = this.current + offset;

    if(index < 0) {
        return this.tokens[0] || {type: 'EOF', value: ''};
    }

    if(index >= this.tokens.length){
        return this.tokens[this.tokens.length - 1] || {type: 'EOF', value:''};
    }

    return this.tokens[index];
}

isAtEnd() {
    return this.peek().type === 'EOF';
}

advance(): Token {
    const tok = this.tokens[this.current];
    if(!this.isAtEnd()){
        this.current++;
    }
    return tok;
}

check (...types: string[]): boolean {
    if(this.isAtEnd()){
        return false;
    }

    const currentType = this.peek().type;
    return types.includes(currentType);
}

checkValue(type: string, value: string): boolean {
    if(this.isAtEnd()){
        return false;
    }

    const token = this.peek();
    return token.type === type && token.value === value;
}

checkSequence(types: string[]): boolean {
    for(let i = 0; i < types.length; i++){
        if(this.peek(i).type !== types[i]){
            return false;
        }
    }
    return true;
}

match(...types: string[]): boolean {
    if(this.check(...types)){
        this.advance();
        return true;
    }
    return false;
}

matchValue(type: string, value: string): boolean {
    if(this.checkValue(type,value)){
        this.advance();
        return true;
    }
    return false;
}

consume(type: string, message?: string) {
    try {
        if(this.check(type)){
            return this.advance();
        }

        const current = this.peek();
        const position = this.getPosition();

        const defaultMessage = `Expected ${type} but got ${current.type} ('${current.value}')`;
        const fullMessage = message || defaultMessage;

        const errorMsg = `${fullMessage} at line ${position.line}`;
        this.errors.push(errorMsg);
        
        // Recovery: skip the problematic token and return a placeholder
        this.advance();
        return { type: 'ERROR', value: `[ERROR: ${errorMsg}]`, position: position.line };
    } catch (error) {
        const errorMsg = `Parser error in consume: ${error}`;
        this.errors.push(errorMsg);
        this.advance(); // Skip problematic token
        return { type: 'ERROR', value: `[ERROR: ${errorMsg}]` };
    }
}

consumeValue(type: string, value: string, message?: string) {
        try {
            if (this.checkValue(type, value)) {
                return this.advance();
            }
            
            const current = this.peek();
            const defaultMessage = `Expected ${type}('${value}') but got ${current.type}('${current.value}')`;
            const errorMsg = message || defaultMessage;
            
            this.errors.push(errorMsg);
            this.advance(); // Skip problematic token
            return { type: 'ERROR', value: `[ERROR: ${errorMsg}]` };
        } catch (error) {
            const errorMsg = `Parser error in consumeValue: ${error}`;
            this.errors.push(errorMsg);
            this.advance();
            return { type: 'ERROR', value: `[ERROR: ${errorMsg}]` };
        }
    }

getPosition() {
        const token = this.peek();
        
        return {
            line: token.line ?? 'unknown',
            column: token.column ?? 'unknown',
            position: token.position ?? this.current,
            token: token,
            index: this.current
        };
}

isMatchingEnd(envName: string): boolean {
    if(this.current + 3 >= this.tokens.length){
        return false;
    }

    const token0 = this.tokens[this.current];      // \end
    const token1 = this.tokens[this.current + 1];  // {
    const token2 = this.tokens[this.current + 2];  // envName
    const token3 = this.tokens[this.current + 3];  // }

    return (
        token0.type === 'COMMAND' && 
        token0.value === 'end' &&
        token1.type === 'LBRACE' &&
        token2.type === 'CONTENT' &&
        token2.value === envName &&
        token3.type === 'RBRACE'
    );
}

previous() {
    return this.tokens[this.current - 1];
}


isBeginEnvironment() {
        return this.checkValue('COMMAND', 'begin');
    }

isEndEnvironment() {
    return this.checkValue('COMMAND', 'end');
    }

peekEnvironmentName() {
        if (!this.check('COMMAND')) {
            return null;
        }
        
        // Pattern: COMMAND LBRACE CONTENT RBRACE
        if (this.peek(1).type === 'LBRACE' && 
            this.peek(2).type === 'CONTENT' &&
            this.peek(3).type === 'RBRACE') {
            return this.peek(2).value;
        }
        
        return null;
}

parse(){
    try {
        const result = this.parseDocument();
        
        // If there were errors during parsing, include them in the result
        if (this.errors.length > 0) {
            return JSON.stringify({
                ...result,
                errors: this.errors,
                hasErrors: true
            }, null, 2);
        }
        
        return JSON.stringify(result, null, 2);
    } catch (error) {
        // Fallback error handling - should rarely reach here due to error recovery
        return JSON.stringify({
            type: 'error',
            message: `Critical parser error: ${error}`,
            errors: [...this.errors, `Critical error: ${error}`],
            hasErrors: true
        }, null, 2);
    }
}

parseDocument(){
    const statement = [];

    while(!this.isAtEnd()){
        const stmnt = this.parseStatement();
        if(stmnt){
            statement.push(stmnt);
        }
    }
    return {
        type : 'document',
        children : statement
    }
}

parseStatement(): any {
    try {
        if(this.check('COMMAND')){
            if(this.peek().value === 'begin'){
                return this.parseEnvironment();
            }
            else if(this.peek().value === 'end'){
                const errorMsg = `Unexpected \\end at ${this.getPosition().line}`;
                this.errors.push(errorMsg);
                this.advance(); // Skip the problematic token
                return { type: 'error', message: errorMsg };
            }
            else {
                return this.parseCommand();
            }
        }
        else if(this.check('MATH_IN')){
            return this.parseMathInline();
        }
        else if(this.check('MATH_DIS')){
            return this.parseMathDisplay();
        }
        else if (this.check('CONTENT')) {
            return this.parseText();
        } 
        else if (this.check('WHITESPACE') || this.check('NEWLINE')) {
            return this.parseWhitespace();
        } 
        else if (this.check('COMMENT')) {
            return this.parseComment();
        }
        else{
            const token = this.peek();
            const errorMsg = `Unknown token of type: ${token.type} with value: ${token.value}`;
            this.errors.push(errorMsg);
            console.warn(errorMsg + ', skipping token');
            this.advance();
            return { type: 'error', message: errorMsg };
        }
    } catch (error) {
        const errorMsg = `Error in parseStatement: ${error}`;
        this.errors.push(errorMsg);
        this.advance(); // Skip problematic token
        return { type: 'error', message: errorMsg };
    }
}

parseCommand(): any {
    const nameToken = this.advance();
    const name = nameToken.value;
    const args = [];
    const optionalArgs = [];

    // Parse optional arguments in square brackets
    while(this.check('LBRACKET')){
        this.advance(); // consume '['
        const content: any = this.parseOptionalContent();
        this.consume('RBRACKET', `Expected ']' after optional argument for \\${name}`);
        optionalArgs.push(content);
    }

    // Parse required arguments in braces
    while(this.check('LBRACE')){
        this.advance(); // consume '{'
        const content: any = this.parseContent();
        this.consume('RBRACE', `Expected '}' after command for argument \\${name}`);
        args.push(content);
    }

    return{
        type: 'command',
        name: name,
        args: args,
        optionalArgs: optionalArgs.length > 0 ? optionalArgs : undefined,
        position: nameToken.position
    };
}

parseEnvironment(): any {
    try {
        const beginToken = this.advance();

        this.consume('LBRACE', "Expected '{' after \\begin");

        const envNameToken = this.consume('CONTENT', "Expected environment name");
        const envName = envNameToken.value || '';

        this.consume('RBRACE', `Expected '}' after environment name '${envName}'`);

        const content: any = this.parseEnvironmentContent(envName);

        this.consume('COMMAND', `Expected \\end for environment \\${envName}`);
        const endCommand = this.previous().value;

        if(endCommand !== 'end'){
            const errorMsg = `Expected \\end, got \\${endCommand}`;
            this.errors.push(errorMsg);
            return { type: 'error', message: errorMsg };
        }

        this.consume('LBRACE', "Expected '{' after \\end");

        const endEnvNameToken = this.consume('CONTENT', "Expected environment name after \\end");
        const endEnvName = endEnvNameToken.value;

        this.consume('RBRACE', `Expected '}' after environment name '${endEnvName}'`);

        if (envName !== endEnvName){
            const errorMsg = `Environment mismatch: \\begin{${envName}} ... \\end{${endEnvName}}`;
            this.errors.push(errorMsg);
            return { type: 'error', message: errorMsg };
        }

        return {
            type: 'environment',
            name: envName,
            content: content,
            position: beginToken.position
        };
    } catch (error) {
        const errorMsg = `Error parsing environment: ${error}`;
        this.errors.push(errorMsg);
        // Try to recover by skipping to next valid token
        while (!this.isAtEnd() && !this.check('COMMAND', 'CONTENT')) {
            this.advance();
        }
        return { type: 'error', message: errorMsg };
    }
}

parseEnvironmentContent(envName: string): any {
    // Special handling for list environments
    if (envName === 'itemize' || envName === 'enumerate') {
        return this.parseListContent(envName);
    }
    
    const statement = [];

    while(!this.isAtEnd()){
        if(this.isMatchingEnd(envName)){
            break;
        }
        const stmt: any = this.parseStatement();
        if(stmt){
            statement.push(stmt);
        }

    }
     return{
            type: 'content',
            items: statement
        };
}

parseListContent(envName: string): any {
    const items = [];
    
    while (!this.isAtEnd()) {
        if (this.isMatchingEnd(envName)) {
            break;
        }
        
        // Look for \item commands
        if (this.checkValue('COMMAND', 'item')) {
            this.advance(); // consume \item
            
            // Collect content until next \item or end of environment
            const itemContent = [];
            
            while (!this.isAtEnd() && 
                   !this.checkValue('COMMAND', 'item') && 
                   !this.isMatchingEnd(envName)) {
                const stmt = this.parseStatement();
                if (stmt) {
                    itemContent.push(stmt);
                }
            }
            
            // Create an item node
            items.push({
                type: 'listItem',
                content: {
                    type: 'content',
                    items: itemContent
                }
            });
        } else {
            // Skip non-item content (whitespace, etc.)
            this.advance();
        }
    }
    
    return {
        type: 'listContent',
        items: items
    };
}

parseMathInline() {
    const openToken = this.advance(); // consume opening '$'
        
    const content = this.parseMathContent('MATH_IN');
        
    this.consume('MATH_IN', "Expected closing '$' for inline math");
        
    return {
        type: 'math',
        inline: true,
        content: content,
        position: openToken.position
    };
}

parseMathDisplay() {
    const openToken = this.advance(); // consume opening '$$'
        
    const content = this.parseMathContent('MATH_DIS');
        
    this.consume('MATH_DIS', "Expected closing '$$' for display math");
        
    return {
        type: 'math',
        inline: false,
        content: content,
        position: openToken.position
    };
}

parseMathContent(closingDelimiter: string): string {
    let content = '';
        
    // Collect everything until we hit the closing delimiter
    while (!this.isAtEnd() && !this.check(closingDelimiter)) {
        if (this.check('COMMAND')) {
            // Handle math commands like \frac{a}{b}, \sum, etc.
            const cmd = this.advance();
            content += `\\${cmd.value}`;
                
            // If command has arguments, parse them
            if (this.check('LBRACE')) {
                content += '{';
                this.advance(); // consume '{'
                    
                // Recursively parse math content in argument
                content += this.parseMathContent('RBRACE');
                    
                this.consume('RBRACE', "Expected '}' in math command");
                content += '}';
            }
        } 
        else if (this.check('RBRACE')) {
            // This closes an argument, not the math mode
            break;
        }
        else {
            // Regular text, whitespace, operators, etc.
            content += this.advance().value;
        }
    }
        
    return content.trim();
}

parseContent(): any {
    const items = [];
        
    // Parse until we hit a closing brace
    while (!this.isAtEnd() && !this.check('RBRACE')) {
        const stmt: any = this.parseStatement();
        if (stmt) items.push(stmt);
    }
        
    return {
        type: 'content',
        items: items
    };
}

parseOptionalContent(): any {
    const items = [];
        
    // Parse until we hit a closing bracket
    while (!this.isAtEnd() && !this.check('RBRACKET')) {
        const stmt: any = this.parseStatement();
        if (stmt) items.push(stmt);
    }
        
    return {
        type: 'optionalContent',
        items: items
    };
}

parseText() {
    const token = this.advance();
    return {
        type: 'text',
        value: token.value,
        position: token.position
    };
}

parseWhitespace() {
    const token = this.advance();
    return {
        type: 'whitespace',
        value: token.value,
        position: token.position
    };
}

parseComment() {
    const token = this.advance();
    return {
        type: 'comment',
        value: token.value,
        position: token.position
    };
}

}
