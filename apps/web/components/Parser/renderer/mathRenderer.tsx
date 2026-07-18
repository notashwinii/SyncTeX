import React from 'react';
import { MATH_SYMBOLS } from '../core/constants';

/**
 * Renders LaTeX math content with proper formatting and symbol conversion
 */
export const renderMathContent = (content: string, inline: boolean = true): React.ReactNode => {
  if (!content) return null;

  // Convert LaTeX commands to Unicode symbols
  let processedContent = content;
  
  // Handle Greek letters and common math symbols
  for (const [latex, unicode] of Object.entries(MATH_SYMBOLS)) {
    const regex = new RegExp(`\\\\${latex}(?![a-zA-Z])`, 'g');
    processedContent = processedContent.replace(regex, unicode);
  }
  
  // Handle superscripts (^{...} or ^x)
  processedContent = processedContent.replace(/\^{([^}]+)}/g, (_, exp) => {
    return `<sup>${exp}</sup>`;
  });
  processedContent = processedContent.replace(/\^([a-zA-Z0-9])/g, (_, exp) => {
    return `<sup>${exp}</sup>`;
  });
  
  // Handle subscripts (_{...} or _x)
  processedContent = processedContent.replace(/_{([^}]+)}/g, (_, sub) => {
    return `<sub>${sub}</sub>`;
  });
  processedContent = processedContent.replace(/_([a-zA-Z0-9])/g, (_, sub) => {
    return `<sub>${sub}</sub>`;
  });
  
  // Handle fractions \frac{a}{b}
  processedContent = processedContent.replace(/\\frac{([^}]+)}{([^}]+)}/g, (_, num, den) => {
    if (inline) {
      return `${num}/${den}`;
    } else {
      return `<div style="display: inline-block; text-align: center; vertical-align: middle;">
                <div style="border-bottom: 1px solid currentColor; padding: 0 4px;">${num}</div>
                <div style="padding: 0 4px;">${den}</div>
              </div>`;
    }
  });
  
  // Handle square roots \sqrt{...}
  processedContent = processedContent.replace(/\\sqrt{([^}]+)}/g, (_, content) => {
    return `√(${content})`;
  });
  
  // Clean up remaining backslashes for unknown commands
  processedContent = processedContent.replace(/\\([a-zA-Z]+)/g, '$1');
  
  return (
    <span
      style={{
        fontFamily: inline ? 'serif' : 'serif',
        fontStyle: 'italic',
        display: inline ? 'inline' : 'block',
        textAlign: inline ? 'left' : 'center',
      }}
      dangerouslySetInnerHTML={{ __html: processedContent }}
    />
  );
};