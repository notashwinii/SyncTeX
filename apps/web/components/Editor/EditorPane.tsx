'use client'

import React from 'react';
import dynamic from 'next/dynamic';
import FileTabs, { OpenFile } from './FileTabs';
import styles from './EditorPane.module.css';
import type * as monacoEditor from 'monaco-editor';
import * as Y from 'yjs';

interface EditorPaneProps {
  projectId: string;
  onCompile: (content: string) => void;
  onEditorReady?: (editorRef: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>, docRef: React.RefObject<Y.Doc | null>) => void;
  openFiles: OpenFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onNewFile: () => void;
}

const BaseEditor = dynamic(() => import('./BaseEditor'), {
  ssr: false,
  loading: () => <div>Loading collaborative editor...</div>
});

const EditorPane: React.FC<EditorPaneProps> = ({
  projectId,
  onCompile,
  onEditorReady,
  openFiles,
  activeFileId,
  onFileSelect,
  onFileClose,
  onNewFile
}) => {
  return (
    <div className={styles.editorPane}>
      <FileTabs
        openFiles={openFiles}
        activeFileId={activeFileId}
        onFileSelect={onFileSelect}
        onFileClose={onFileClose}
        onNewFile={onNewFile}
      />
      <div className={styles.editorContainer}>
        <BaseEditor 
          projectId={projectId} 
          onCompile={onCompile} 
          onEditorReady={onEditorReady}
        />
      </div>
    </div>
  );
};

export default EditorPane;