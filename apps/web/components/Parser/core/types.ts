export interface Token {
    type: string;
    value?: string;
    line?: number;
    column?: number;
    position?: number;
}

export interface ASTNode {
    type: string;
    children?: ASTNode[];
    content?: ASTNode | ASTNode[];
    items?: ASTNode[];
    args?: ASTNode[];
    optionalArgs?: ASTNode[];
    name?: string;
    value?: string;
    position?: number;
    message?: string;
    inline?: boolean;
    errors?: string[];
    hasErrors?: boolean;
}

export interface ParseResult {
    type: string;
    children?: ASTNode[];
    errors?: string[];
    hasErrors?: boolean;
}
