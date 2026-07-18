import React from 'react';
import { ASTNode } from '../core/types';
import { renderCommandWithRegistry, resetSectionCounters } from './commands';
import { renderMathContent } from './mathRenderer';
import { AutoPaginatedDocument } from './DocumentLayout';
import './documentLayout.css';

export const RenderNode = ({ node }: { node: ASTNode }): React.ReactNode => {
  if (!node) return null;

  // Handle error nodes
  if (node.type === 'error') {
    return (
      <div
        style={{
          display: 'inline-block',
          padding: '4px 8px',
          backgroundColor: '#ffe6e6',
          border: '1px solid #ff9999',
          borderRadius: '4px',
          color: '#cc0000',
          fontSize: '12px',
          fontFamily: 'monospace',
        }}
      >
        {node.message || 'Parse error'}
      </div>
    );
  }

  switch (node.type) {
    case 'document':
      return (
        <div>
          {node.children?.map((child: ASTNode, index: number) => (
            <RenderNode key={index} node={child} />
          ))}
        </div>
      );

    case 'command':
      return renderCommandWithRegistry(node);

    case 'environment':
      if (node.name === 'document') {
        // Reset section counters at the start of a document
        resetSectionCounters();
        return (
          <AutoPaginatedDocument showPageNumbers={true}>
            <RenderNode node={node.content as ASTNode} />
          </AutoPaginatedDocument>
        );
      }
      else if (node.name === 'itemize') {
        return (
          <ul style={{ 
            marginBottom: '1rem',
            listStyleType: 'disc',
            paddingLeft: '2rem'
          }}>
            <RenderNode node={node.content as ASTNode} />
          </ul>
        );
      }
      else if (node.name === 'enumerate') {
        return (
          <ol type="1" style={{ marginBottom: '1rem' }}>
            <RenderNode node={node.content as ASTNode} />
          </ol>
        );
      }
      else if (node.name === 'equation') {
        return (
          <div style={{ 
            textAlign: 'center', 
            margin: '1rem 0',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '4px'
          }}>
            <RenderNode node={node.content as ASTNode} />
          </div>
        );
      }
      else {
        return (
          <div>
            <RenderNode node={node.content as ASTNode} />
          </div>
        );
      }

    case 'content':
      return (
        <React.Fragment>
          {node.items?.map((item: ASTNode, index: number) => (
            <RenderNode key={index} node={item} />
          ))}
        </React.Fragment>
      );

    case 'listContent':
      return (
        <React.Fragment>
          {node.items?.map((item: ASTNode, index: number) => (
            <RenderNode key={index} node={item} />
          ))}
        </React.Fragment>
      );

    case 'listItem':
      return (
        <li style={{ marginBottom: '0.5rem' }}>
          <RenderNode node={node.content as ASTNode} />
        </li>
      );

    case 'optionalContent':
      return (
        <React.Fragment>
          {node.items?.map((item: ASTNode, index: number) => (
            <RenderNode key={index} node={item} />
          ))}
        </React.Fragment>
      );

    case 'text':
      return <span>{node.value}</span>;

    case 'whitespace':
      return ' ';

    case 'comment':
      return null;

    case 'math':
      {
        const mathContent = typeof node.content === 'string' ? node.content : '';
        
        return (
          <span
            style={{
              display: node.inline ? 'inline' : 'block',
              textAlign: node.inline ? 'left' : 'center',
              backgroundColor: node.inline ? 'transparent' : '#f8f9fa',
              padding: node.inline ? '0 2px' : '8px',
              margin: node.inline ? '0' : '8px 0',
              borderRadius: node.inline ? '0' : '4px',
              border: node.inline ? 'none' : '1px solid #e9ecef',
            }}
          >
            {renderMathContent(mathContent, node.inline)}
          </span>
        );
      }

    default:
      console.warn(`Unknown AST node type: ${node.type}`);
      return (
        <span
          style={{
            backgroundColor: '#ffe6e6',
            border: '1px solid #ff9999',
            padding: '2px 4px',
            borderRadius: '3px',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#cc0000',
          }}
        >
          [Unknown: {node.type}]
        </span>
      );
  }
};
