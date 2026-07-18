'use client'
import { useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from "y-monaco";
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import type * as monacoEditor from 'monaco-editor';

interface BaseEditorProps {
  projectId: string;
  onEditorReady?: (editorRef: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>, docRef: React.RefObject<Y.Doc | null>) => void;
}

interface CollaborationResources {
  binding: MonacoBinding;
  indexeddbProvider: IndexeddbPersistence;
  websocketProvider: WebsocketProvider;
  document: Y.Doc;
}

const BaseEditor: React.FC<BaseEditorProps> = ({ projectId, onEditorReady }) => {
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const doc = useRef<Y.Doc | null>(null);
  const collaboration = useRef<CollaborationResources | null>(null);

  useEffect(() => {
    return () => {
      collaboration.current?.binding.destroy();
      collaboration.current?.websocketProvider.destroy();
      collaboration.current?.indexeddbProvider.destroy();
      collaboration.current?.document.destroy();
      collaboration.current = null;
      editorRef.current = null;
      doc.current = null;
    };
  }, []);

  function handleEditorMount(
    editor: monacoEditor.editor.IStandaloneCodeEditor
  ) {
    let document: Y.Doc | null = null;
    let websocketProvider: WebsocketProvider | null = null;
    let indexeddbProvider: IndexeddbPersistence | null = null;

    try {
      editorRef.current = editor;

      const model = editor.getModel();
      if (!model) {
        throw new Error('Editor model is not available');
      }

      document = new Y.Doc();
      doc.current = document;
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
      const serverUrl = `${wsUrl.replace(/\/$/, '')}/api/ws`;

      websocketProvider = new WebsocketProvider(
        serverUrl,
        projectId,
        document
      );
      indexeddbProvider = new IndexeddbPersistence(projectId, document);
      const textType = document.getText("monacotest");
      
      const binding = new MonacoBinding(
        textType,
        model,
        new Set([editorRef.current]),
        websocketProvider.awareness
      );

      collaboration.current = {
        binding,
        indexeddbProvider,
        websocketProvider,
        document,
      };
      
      onEditorReady?.(editorRef, doc);
    } catch (error) {
      websocketProvider?.destroy();
      indexeddbProvider?.destroy();
      document?.destroy();
      collaboration.current = null;
      doc.current = null;
      console.error('Error mounting editor:', error);
      onEditorReady?.(editorRef, doc);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', position: 'relative' }}>
      <Editor
        key={projectId}
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
