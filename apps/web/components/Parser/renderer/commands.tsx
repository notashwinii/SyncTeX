import { ASTNode } from '../core/types';
import { COMMAND_MAP, BLOCK_COMMANDS, TEXT_COMMANDS } from '../core/constants';
import { RenderNode } from './nodes';
import React from 'react';

// Global state to store document metadata
let documentMeta = {
  title: '',
  author: '',
  date: ''
};

// Section numbering state (reset per document)
let sectionCounters = {
  section: 0,
  subsection: 0,
  subsubsection: 0,
};

// Cache heading numbers per node to avoid double-increment on multi-pass renders
let headingNumberCache: WeakMap<ASTNode, string> = new WeakMap();

export const resetSectionCounters = () => {
  sectionCounters = { section: 0, subsection: 0, subsubsection: 0 };
  headingNumberCache = new WeakMap();
};

const nextHeadingNumber = (name?: string, node?: ASTNode): string | null => {
  if (node) {
    const cached = headingNumberCache.get(node);
    if (cached) return cached;
  }
  switch (name) {
    case 'section':
      sectionCounters.section += 1;
      sectionCounters.subsection = 0;
      sectionCounters.subsubsection = 0;
      {
        const num = `${sectionCounters.section}`;
        if (node) headingNumberCache.set(node, num);
        return num;
      }
    case 'subsection':
      // If a subsection appears before any section, start at section 1
      if (sectionCounters.section === 0) sectionCounters.section = 1;
      sectionCounters.subsection += 1;
      sectionCounters.subsubsection = 0;
      {
        const num = `${sectionCounters.section}.${sectionCounters.subsection}`;
        if (node) headingNumberCache.set(node, num);
        return num;
      }
    case 'subsubsection':
      // If a subsubsection appears before any section/subsection, start at 1.1
      if (sectionCounters.section === 0) sectionCounters.section = 1;
      if (sectionCounters.subsection === 0) sectionCounters.subsection = 1;
      sectionCounters.subsubsection += 1;
      {
        const num = `${sectionCounters.section}.${sectionCounters.subsection}.${sectionCounters.subsubsection}`;
        if (node) headingNumberCache.set(node, num);
        return num;
      }
    default:
      return null;
  }
};

/**
 * Renders unknown commands as a styled fallback
 */
const renderUnknownCommand = (node: ASTNode): React.ReactNode => {
  return (
    <span
      style={{
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        padding: '2px 4px',
        borderRadius: '3px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#856404',
      }}
    >
      \{node.name}
      {node.args &&
        node.args.map((arg: ASTNode, index: number) => (
          <span key={index}>
            {'{'}
            <RenderNode node={arg} />
            {'}'}
          </span>
        ))}
    </span>
  );
};

/**
 * Routes commands to appropriate renderers using COMMAND_MAP
 */



export const renderCommandWithRegistry = (node: ASTNode): React.ReactNode => {
  // Handle documentclass command - no visual output, just set document behavior
  if (node.name === 'documentclass') {
    return null; // Document class affects layout but isn't visually rendered
  }

  // Handle usepackage command - no visual output, enables functionality
  if (node.name === 'usepackage') {
    return null; // Packages provide functionality but aren't visually rendered
  }

  // Handle begin/end commands  
  if (node.name === 'begin' || node.name === 'end') {
    return null; // These are handled by environment parsing
  }

  // Handle metadata commands
  if (node.name === 'title' && node.args?.[0]) {
    const titleContent = extractTextContent(node.args[0]);
    documentMeta.title = titleContent;
    return null; // Don't render immediately, will be used by \maketitle
  }

  if (node.name === 'author' && node.args?.[0]) {
    const authorContent = extractTextContent(node.args[0]);
    documentMeta.author = authorContent;
    return null;
  }

  if (node.name === 'date' && node.args?.[0]) {
    const dateContent = extractTextContent(node.args[0]);
    documentMeta.date = dateContent === '\\today' ? new Date().toLocaleDateString() : dateContent;
    return null;
  }

  // Handle \maketitle
  if (node.name === 'maketitle') {
    return (
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        {documentMeta.title && (
          <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {documentMeta.title}
          </h1>
        )}
        {documentMeta.author && (
          <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>
            {documentMeta.author}
          </div>
        )}
        {documentMeta.date && (
          <div style={{ fontSize: '1rem', color: '#666' }}>
            {documentMeta.date}
          </div>
        )}
      </div>
    );
  }

  // Handle special text commands (like \textbackslash)
  if (TEXT_COMMANDS[node.name || '']) {
    return <span>{TEXT_COMMANDS[node.name || '']}</span>;
  }

  // Page break commands are handled by CSS auto-pagination, so we ignore them
  if (node.name === 'newpage' || node.name === 'pagebreak' || node.name === 'clearpage') {
    return null; // Ignore manual page break commands in auto-paginated layout
  }

  const tagName = COMMAND_MAP[node.name || ''];
  if (tagName === 'img') {
    const arg = node.args?.[0];

    const src = arg?.items
        ?.map(item =>
          item.type === 'text' ? item.value ?? '' : ''
        )
        .join('')
        .trim();

    if (!src) {
      return (
        <span style={{ color: 'red' }}>
          [Invalid image source]
        </span>
      );
    }

    return (
      <img
        src={src}
        alt=""
        style={{ maxWidth: '100%', display: 'block' }}
      />
    );
  }
  
  if (node.name === 'caption') {
    return (
      <figcaption>
        {node.args?.map((arg: ASTNode) =>
          arg.type === 'content'
            ? arg.items?.map((item: ASTNode, index: number) =>
              item.type === 'text' ? item.value : <RenderNode key={index} node={item} />
            )
            : <RenderNode node={arg} />
        )}
      </figcaption>
    );
  }

  if (!tagName) {
    return renderUnknownCommand(node);
  }

  const isBlockCommand = BLOCK_COMMANDS.has(node.name || '');
  const headingNumber = nextHeadingNumber(node.name, node);

  const Element = React.createElement(
    tagName,
    isBlockCommand ? { style: { display: 'block', marginBottom: '1rem' } } : {},
    [
      headingNumber ? (
        <span key="heading-number" style={{ marginRight: '0.5rem' }}>{headingNumber}</span>
      ) : null,
      ...(node.args
        ? node.args.map((arg: ASTNode, index: number) => (
            <RenderNode key={index} node={arg} />
          ))
        : []),
    ]
  );

  return Element;
};

// Helper function to extract text content from an AST node
function extractTextContent(node: ASTNode): string {
  if (node.type === 'text') {
    return node.value || '';
  }
  if (node.type === 'content' && node.items) {
    return node.items
      .map(item => extractTextContent(item))
      .join('')
      .trim();
  }
  return '';
}
