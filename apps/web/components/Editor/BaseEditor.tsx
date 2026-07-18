'use client'
import { useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type * as monacoEditor from 'monaco-editor';

interface BaseEditorProps {
  projectId: string;
  onCompile: (content: string) => void;
  onEditorReady?: (editorRef: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>, docRef: React.RefObject<Y.Doc | null>) => void;
}

const BaseEditor: React.FC<BaseEditorProps> = ({ projectId, onCompile, onEditorReady }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const doc = useRef<Y.Doc | null>(null);
  // undo redo mount state, default value false
  const [isEditorReady, setIsEditorReady] = useState(false);

  // editor.current passes the current instance of editor so we can use it across multiple functions/apps/layers
  function handleEditorMount(
    editor: monacoEditor.editor.IStandaloneCodeEditor
  ) {
    try {
      editorRef.current = editor;

      doc.current = new Y.Doc();

      
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      
      // Get auth token for WebSocket connection
      const token = localStorage.getItem('token');
      const serverUrl = `${wsUrl}/api/ws${token ? `?token=${token}` : ''}`;
      
      const wsProvider = new WebsocketProvider(
        serverUrl,                      
        projectId,                      
        doc.current!
      );
      const provider = new IndexeddbPersistence(projectId, doc.current!);

      provider.on('synced', () => {
        console.log(`Content from database loaded for project: ${projectId}`);
      });

      wsProvider.on('status', event => {
        console.log(`WebSocket ${event.status} for project: ${projectId}`);
      });

      // Use project-specific text object
      const textType = doc.current!.getText("monacotest");

      const model = editorRef.current.getModel();
      if (!model) {
        throw new Error('Editor model is not available');
      }
      
      const binding = new MonacoBinding(
        textType,
        model,
        new Set([editorRef.current]),
        wsProvider.awareness
      );

      // 'binding' is intentionally unused, as it sets up collaborative editing side effects
      void binding;

      // Initialize default content if document is empty
      // Wait a bit for the document to be fully synced
      setTimeout(() => {
        if (textType.length === 0) {
          const defaultContent = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amsfonts}
\\usepackage{amssymb}
\\usepackage{graphicx}

\\title{Welcome to SyncTex}
\\author{You}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}

This is your new LaTeX document. You can start writing your content here.

\\section{Mathematics}

You can write mathematical equations like this:
\\begin{equation}
    E = mc^{2}
\\end{equation}

Or inline math like $a^{2} + b^{2} = c^{2}$.

Here are some more examples with Greek letters: $\\alpha$, $\\beta$, $\\gamma$, and $\\pi \\approx 3.14$.

You can also write fractions like $\\frac{x}{y}$, square roots like $\\sqrt{16} = 4$, and use symbols like $\\infty$, $\\sum$, $\\leq$, and $\\neq$.

\\section{Lists}

Here's a bulleted list:
\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item
\\end{itemize}

\\section{More Content}

This content will automatically flow to a new page when the current page is full.

You can add as much content as you want, and the system will automatically create new pages as needed, just like in Overleaf!

\\section{Conclusion}

Happy writing!

\\end{document}
`;
          console.log('Initializing empty project with default content');
          textType.insert(0, defaultContent);
        }
      }, 1000); // Wait 1 second for synchronization

      // sets the state to be true only if the editor component has been loaded thus allowing undo redo
      setIsEditorReady(true);
      
      // Notify parent component that editor is ready
      if (onEditorReady) {
        onEditorReady(editorRef, doc);
      }
    } catch (error) {
      console.error('Error mounting editor:', error);
      // Still set editor ready to prevent hanging state
      setIsEditorReady(true);
      if (onEditorReady) {
        onEditorReady(editorRef, doc);
      }
    }
  }

  // passing prop to undo redo button function
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative' }}>
      <Editor
        height="100%"
        width="100%"
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          scrollBeyondLastLine: true,
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible'
          },
          automaticLayout: true,
          wordWrap: 'on',
          contextmenu: true,
          mouseWheelZoom: false,
          fixedOverflowWidgets: true,
          padding: { top: 10, bottom: 20 }
        }}
        onMount={handleEditorMount}
      />
    </div>
  );
}

export default BaseEditor;