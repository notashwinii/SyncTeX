'use client';
import { Lexer } from '../core/lexer';
import { Parser } from '../core/parser';
import { RenderNode } from '../renderer/nodes';
import type { ASTNode } from '../core/types';
import ErrorBoundary from './ErrorBoundary';

interface RawInput {
  input: string;
}

const Mains = ({ input }: RawInput) => {
  try {
    if (!input || input.trim() === '') {
      return (
        <div style={{ color: '#999999', fontStyle: 'italic', backgroundColor: '#ffffff' }}>
          No content to parse
        </div>
      );
    }

    const lexer = new Lexer(input);
    const lexerResult = lexer.tokenize();
    const tokens = JSON.parse(lexerResult);

    const parser = new Parser(tokens);
    const parserResult = parser.parse();
    const nodes: ASTNode = JSON.parse(parserResult);

    // Check if there were parser errors
    if (nodes.hasErrors && nodes.errors) {
      return (
        <div
          style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            padding: '12px',
            color: '#721c24',
          }}
        >
          <strong>Parser Error:</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            {nodes.errors.map((error: string, index: number) => (
              <li key={index} style={{ marginBottom: '4px' }}>{error}</li>
            ))}
          </ul>
          <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#721c24' }}>
            Please check your LaTeX syntax and try again.
          </p>
        </div>
      );
    }

    return (
      <ErrorBoundary>
        <RenderNode node={nodes} />
      </ErrorBoundary>
    );
  } catch (error) {
    return (
      <div
        style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          padding: '12px',
          color: '#721c24',
        }}
      >
        <strong>Critical Error:</strong>{' '}
        {error instanceof Error ? error.message : String(error)}
        <p style={{ marginTop: '8px', fontSize: '0.9em', color: '#721c24' }}>
          Please check your LaTeX syntax and try again.
        </p>
      </div>
    );
  }
};

export default Mains;
