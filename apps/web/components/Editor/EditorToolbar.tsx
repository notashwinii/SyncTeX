'use client'

import React, { useState } from 'react';
import { Undo, Redo, Play, Download } from 'lucide-react';
import * as Y from 'yjs';
import type { editor as MonacoEditorNS } from 'monaco-editor';
import { OpenFile } from './FileTabs';
import styles from './EditorToolbar.module.css';
import { SaveDownloadPDF } from '@/components/Projects/SaveDownloadPDF';
import { API_CONFIG } from '@/lib/config';

interface EditorToolbarProps {
  editorRef?: React.RefObject<MonacoEditorNS.IStandaloneCodeEditor | null>;
  yjsDoc?: React.RefObject<Y.Doc>;
  isEditorReady?: boolean;
  onCompile: (content: string, errors?: string[]) => void;
  onReportErrors?: (errors: string[]) => void;
  activeFileId?: string | null;
  openFiles?: OpenFile[];
  projectId: string;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editorRef,
  yjsDoc,
  isEditorReady = false,
  onCompile,
  onReportErrors,
  activeFileId,
  openFiles = [],
  projectId
}) => {
  const [documentContent, setDocumentContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);

  const handleUndo = () => {
    if (editorRef?.current && isEditorReady) {
      try {
        editorRef.current.trigger('keyboard', 'undo', null);
        console.log("Undo executed successfully");
      } catch (error) {
        console.error("Error during undo:", error);
      }
    } else {
      console.log("Editor not ready or not available");
    }
  };

  const handleRedo = () => {
    if (editorRef?.current && isEditorReady) {
      try {
        editorRef.current.trigger('keyboard', 'redo', null);
        console.log("Redo executed successfully");
      } catch (error) {
        console.error("Error during redo:", error);
      }
    } else {
      console.log("Editor not ready or not available");
    }
  };

  const validateLaTeX = (content: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const lines = content.split('\n');

    // Helper function to find line number for a pattern
    const findLineNumber = (pattern: string | RegExp): number => {
      for (let i = 0; i < lines.length; i++) {
        if (typeof pattern === 'string') {
          if (lines[i].includes(pattern)) return i + 1;
        } else {
          if (pattern.test(lines[i])) return i + 1;
        }
      }
      return -1;
    };

    // Check for basic document structure with detailed help
    if (!content.includes('\\documentclass')) {
      errors.push('📋 Missing \\documentclass | Every LaTeX document must start with \\documentclass{article} (or book, report, etc.) | Fix: Add \\documentclass{article} at line 1');
    }
    if (!content.includes('\\begin{document}')) {
      errors.push('📋 Missing \\begin{document} | The document body must start with \\begin{document} | Fix: Add \\begin{document} after your preamble (packages, settings)');
    }
    if (!content.includes('\\end{document}')) {
      errors.push('📋 Missing \\end{document} | Every document must end with \\end{document} | Fix: Add \\end{document} at the end of your file');
    }

    // Check for section commands missing braces
    const sectionPattern = /\\(section|subsection|subsubsection|chapter|part)\s+[A-Za-z]/;
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(sectionPattern);
      if (match) {
        const command = match[1];
        errors.push(`Line ${i + 1}: ❌ Section command missing braces | Command: \\${command} | Current: "${lines[i].trim()}" | Fix: Use \\${command}{Your Title Here}`);
      }
    }

    // Check for other common LaTeX errors with detailed explanations
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for undefined commands
      if (line.includes('\\ima') && !line.includes('\\image')) {
        errors.push(`Line ${lineNum}: ❌ Undefined command \\ima | LaTeX doesn't recognize this command | Fix: Use \\includegraphics{image.png} (requires \\usepackage{graphicx})`);
      }

      if (line.includes('\\textsize')) {
        errors.push(`Line ${lineNum}: ❌ Invalid command \\textsize | This command doesn't exist in LaTeX | Fix: Use \\large, \\Large, \\small, \\tiny, \\huge, or \\normalsize instead`);
      }

      if (line.includes('\\bold')) {
        errors.push(`Line ${lineNum}: ❌ Invalid command \\bold | LaTeX uses different syntax | Fix: Use \\textbf{your text} or {\\bfseries your text}`);
      }

      if (line.includes('\\italic')) {
        errors.push(`Line ${lineNum}: ❌ Invalid command \\italic | LaTeX uses different syntax | Fix: Use \\textit{your text} or {\\itshape your text}`);
      }

      if (line.includes('\\underline') && line.includes('\\underline{') && (line.match(/\\underline/g) || []).length > 1) {
        errors.push(`Line ${lineNum}: ⚠️ Nested \\underline commands | Multiple underlines don't work well | Fix: Use \\underline{text} only once, or use \\uline{text} from the ulem package`);
      }

      // Check for missing $ in math expressions
      const mathPatterns = [
        { pattern: /[a-z]\s*=\s*[a-z0-9^_+\-*/]+/i, example: 'x = y + 2' },
        { pattern: /\^[0-9]/, example: '^2' },
        { pattern: /_[0-9]/, example: '_n' },
        { pattern: /\\frac/i, example: '\\frac' },
        { pattern: /\\sum|\\int|\\prod|\\sqrt/i, example: 'math operators' }
      ];

      for (const { pattern, example } of mathPatterns) {
        if (pattern.test(line) && !line.includes('$') && !line.includes('\\[') && !line.includes('\\begin{equation}') && !line.includes('\\begin{align}')) {
          errors.push(`Line ${lineNum}: 💡 Math expression without delimiters | Math content like "${example}" needs special delimiters | Fix: Wrap in $...$ for inline math or $$...$$ for display math`);
          break;
        }
      }

      // Check for unescaped special characters
      const specialCharsPattern = /(?<!\\)([&%#_{}~^])/g;
      const matches = line.match(specialCharsPattern);
      if (matches && !line.startsWith('%')) {
        const chars = [...new Set(matches)];
        const escapeMap: { [key: string]: string } = {
          '&': '\\&', '%': '\\%', '#': '\\#', '_': '\\_',
          '{': '\\{', '}': '\\}', '~': '\\textasciitilde', '^': '\\textasciicircum'
        };
        const fixes = chars.map(c => escapeMap[c]).join(', ');
        errors.push(`Line ${lineNum}: ⚠️ Unescaped special characters: ${chars.join(', ')} | These characters have special meaning in LaTeX | Fix: Escape them as: ${fixes}`);
      }

      // Check for common typos
      if (line.includes('\\beign')) {
        errors.push(`Line ${lineNum}: ❌ Typo: \\beign | Did you mean \\begin? | Fix: Change \\beign to \\begin`);
      }

      if (line.includes('\\ned')) {
        errors.push(`Line ${lineNum}: ❌ Typo: \\ned | Did you mean \\end? | Fix: Change \\ned to \\end`);
      }
    }

    // Check for unmatched braces with better error message
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      const diff = Math.abs(openBraces - closeBraces);
      if (openBraces > closeBraces) {
        errors.push(`🔴 Unmatched braces: ${diff} opening brace(s) { without matching closing brace(s) } | This will cause compilation to fail | Fix: Add ${diff} closing brace(s) } or remove ${diff} opening brace(s) {`);
      } else {
        errors.push(`🔴 Unmatched braces: ${diff} closing brace(s) } without matching opening brace(s) { | This will cause compilation to fail | Fix: Add ${diff} opening brace(s) { or remove ${diff} closing brace(s) }`);
      }
    }

    // Check for unmatched environments with line numbers
    const beginMatches: { match: string; env: string; line: number }[] = [];
    const endMatches: { match: string; env: string; line: number }[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const beginMatch = lines[i].match(/\\begin\{([^}]+)\}/g);
      const endMatch = lines[i].match(/\\end\{([^}]+)\}/g);
      
      if (beginMatch) {
        beginMatch.forEach(match => {
          const envName = match.match(/\\begin\{([^}]+)\}/)?.[1] || '';
          beginMatches.push({ match, env: envName, line: i + 1 });
        });
      }
      
      if (endMatch) {
        endMatch.forEach(match => {
          const envName = match.match(/\\end\{([^}]+)\}/)?.[1] || '';
          endMatches.push({ match, env: envName, line: i + 1 });
        });
      }
    }

    if (beginMatches.length !== endMatches.length) {
      const diff = Math.abs(beginMatches.length - endMatches.length);
      errors.push(`🔴 Unmatched environments: ${beginMatches.length} \\begin commands vs ${endMatches.length} \\end commands | Every \\begin{environment} must have a matching \\end{environment} | Fix: Add or remove ${diff} environment tag(s)`);
      
      // Try to identify specific unmatched environments
      const beginEnvs = beginMatches.map(b => b.env);
      const endEnvs = endMatches.map(e => e.env);
      
      beginMatches.forEach(beginMatch => {
        const matchingEndIndex = endEnvs.indexOf(beginMatch.env);
        if (matchingEndIndex === -1) {
          errors.push(`Line ${beginMatch.line}: ❌ Missing \\end{${beginMatch.env}} | Environment started but never closed | Fix: Add \\end{${beginMatch.env}} after your content`);
        }
      });
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleCompile = () => {
    if (yjsDoc?.current) {
      try {
        const yText = yjsDoc.current.getText('monacotest');
        const content = yText.toString();
        
        console.log("Attempting to compile content:", content);
        
        // Validate LaTeX and show errors in preview pane
        const validation = validateLaTeX(content);
        if (!validation.isValid) {
          console.log("LaTeX validation errors:", validation.errors);
          // Pass errors to preview pane - don't render
          onCompile('', validation.errors);
          return;
        }
        
        // If valid, compile and show preview
        setDocumentContent(content);
        onCompile(content);
        
      } catch (error) {
        console.log("Error compiling document to LaTeX", error);
        onCompile('', [`Compilation error: ${error}`]);
      }
    } else {
      console.log("Editor Unavailable");
      onCompile('', ['Editor is not ready']);
    }
  };

  const handleDownloadPDF = async () => {
    if (!projectId) {
      console.error('No project ID available for download');
      return;
    }

    // Get LaTeX content from Yjs document
    let latexContent = '';
    if (yjsDoc?.current) {
      const textType = yjsDoc.current.getText("monacotest");
      latexContent = textType.toString();
    } else if (editorRef?.current) {
      // Fallback: get content from Monaco editor
      latexContent = editorRef.current.getValue();
    }

    if (!latexContent || latexContent.trim() === '') {
      alert('No content to download. Please add some LaTeX content first.');
      return;
    }

    setIsDownloadingPDF(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}/projects/${projectId}/download`, {
        method: 'POST', // Changed to POST to send content
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: latexContent
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || errorData.error || response.statusText || 'PDF compilation failed';
        const errorDetails = errorData.details || '';

        // Build helpful, line-aware messages for the preview pane and return early (no throw)
        const combined = errorDetails ? `${errorMessage}\n${errorDetails}` : errorMessage;
        const lines: string[] = [];
        combined.split('\n').forEach((line: string) => {
          if (!line.trim()) return;
          const match = line.match(/line\s(\d+)/i);
          const hint = match
            ? `Fix: Review LaTeX around line ${match[1]} for missing braces, undefined commands, or math delimiters.`
            : 'Fix: Check for missing \\begin/\\end, unmatched braces, or invalid commands.';
          lines.push(`${line} | ${hint}`);
        });
        if (onReportErrors) onReportErrors(lines.length ? lines : [combined]);
        setIsDownloadingPDF(false);
        return;
      }

      // Get the PDF blob
      const pdfBlob = await response.blob();
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("PDF downloaded successfully");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Route error to preview pane with actionable guidance
      const lines: string[] = [];
      errorMessage.split('\n').forEach((line) => {
        if (!line.trim()) return;
        const match = line.match(/line\s(\d+)/i);
        const hint = match
          ? `Fix: Review your LaTeX around line ${match[1]} for missing braces, undefined commands, or math delimiters.`
          : 'Fix: Check for missing \\begin/\\end, unmatched braces, or invalid commands.';
        lines.push(`${line} | ${hint}`);
      });
      if (onReportErrors) onReportErrors(lines.length ? lines : [errorMessage]);
      
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Function to get current content from editor
  const getCurrentContent = (): string => {
    let content = '';
    if (yjsDoc?.current) {
      const textType = yjsDoc.current.getText("monacotest");
      content = textType.toString();
    } else if (editorRef?.current) {
      content = editorRef.current.getValue();
    }
    return content;
  };

  return (
    <div className={styles.toolbar}>
      <SaveDownloadPDF
        id={projectId}
        content={documentContent}
        isSaving={isSaving}
        isDownloading={isDownloading}
        getContent={getCurrentContent}
      />
      <div className={styles.buttonGroup}>
        <button 
          onClick={handleUndo}
          disabled={!isEditorReady}
          className={styles.toolbarButton}
          title="Undo (Ctrl+Z)"
          aria-label="Undo last action"
        >
          <Undo size={16} />
          <span>Undo</span>
        </button>
        
        <button 
          onClick={handleRedo}
          disabled={!isEditorReady}
          className={styles.toolbarButton}
          title="Redo (Ctrl+Y)"
          aria-label="Redo last action"
        >
          <Redo size={16} />
          <span>Redo</span>
        </button>
      </div>

      <div className={styles.buttonGroup}>
        <button 
          onClick={handleCompile}
          disabled={!isEditorReady}
          className={`${styles.toolbarButton} ${styles.primary}`}
          title="Compile LaTeX (Ctrl+Enter)"
          aria-label="Compile LaTeX document"
        >
          <Play size={16} />
          <span>Compile</span>
        </button>
        
        <button 
          onClick={handleDownloadPDF}
          disabled={!isEditorReady || isDownloadingPDF || !projectId}
          className={`${styles.toolbarButton} ${isDownloadingPDF ? styles.loading : ''}`}
          title={isDownloadingPDF ? "Generating PDF..." : "Download PDF"}
          aria-label="Download document as PDF"
        >
          <Download size={16} />
          <span>{isDownloadingPDF ? 'Downloading...' : 'PDF'}</span>
        </button>
      </div>
    </div>
  );
};

export default EditorToolbar;