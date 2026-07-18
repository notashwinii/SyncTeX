'use client'

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { useState, useRef, useEffect } from 'react';
import * as Y from 'yjs';
import PreviewWindow from '@/components/Preview/CompileWindow';
import PreviewErrorBoundary from '@/components/Preview/PreviewErrorBoundary';
import Sidebar from '@/components/Editor/Sidebar';
import type { FileNode } from '@/types/file';
import EditorToolbar from '@/components/Editor/EditorToolbar';
import EditorPane from '@/components/Editor/EditorPane';
import { OpenFile } from '@/components/Editor/FileTabs';
import styles from '@/app/editor/editor.module.css'
import type * as monacoEditor from 'monaco-editor';

// openFiles will be populated from backend file tree

function EditorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [compiledContent, setCompiledContent] = useState<string>('');
  const [shouldRender, setShouldRender] = useState<boolean>(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isEditorReady, setIsEditorReady] = useState<boolean>(false);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const docRef = useRef<Y.Doc | null>(null);

  const handleCompile = (content: string, errors?: string[]) => {
    if (errors && errors.length > 0) {
      // Show errors in preview pane
      setValidationErrors(errors);
      setShouldRender(false);
    } else {
      // Clear errors and show compiled content
      setValidationErrors([]);
      setCompiledContent(content);
      setShouldRender(true);
    }
  };

  const handleFileSelect = (file: FileNode) => {
    // Add to open files if not present and set active
    setOpenFiles((prev) => {
      if (prev.some((f) => f.id === (file.id ?? file.name))) return prev;
      const newFile: OpenFile = {
        id: file.id ?? file.name,
        name: file.name,
        path: file.name,
        isDirty: false,
      };
      return [...prev, newFile];
    });
    setActiveFileId(file.id ?? file.name);

    // Try to load file content into Yjs doc (if editor ready)
    (async () => {
      try {
        if (!file.object_key) {
          console.warn('file missing object_key, cannot load content');
          return;
        }

        const { storageApi } = await import('@/lib/api/endpoints/storage');
        const res = await storageApi.getSignedURL({ key: file.object_key });

        if (res.content && docRef.current) {
          const ytext = docRef.current.getText('monacotest');
          // replace content
          ytext.delete(0, ytext.length);
          ytext.insert(0, res.content);
        } else if (res.url) {
          const resp = await fetch(res.url);
          const ctype = resp.headers.get('content-type') || '';
          if (ctype.startsWith('text/')) {
            const text = await resp.text();
            if (docRef.current) {
              const ytext = docRef.current.getText('monacotest');
              ytext.delete(0, ytext.length);
              ytext.insert(0, text);
            }
          } else {
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
          }
        }
      } catch (err) {
        console.error('Failed to load file content', err);
      }
    })();
  };

  const handleSidebarCollapseToggle = (isCollapsed: boolean) => {
    setIsSidebarCollapsed(isCollapsed);
  };

  const handleEditorReady = (
    editor: React.RefObject<monacoEditor.editor.IStandaloneCodeEditor | null>, 
    doc: React.RefObject<Y.Doc | null>
  ) => {
    editorRef.current = editor.current;
    docRef.current = doc.current;
    setIsEditorReady(true);
  };

  const handleTabFileSelect = (fileId: string) => {
    setActiveFileId(fileId);
    // TODO: Load file content into editor
  };

  const handleTabFileClose = (fileId: string) => {
    const newOpenFiles = openFiles.filter(f => f.id !== fileId);
    setOpenFiles(newOpenFiles);
    
    // If closing active file, switch to first remaining file
    if (fileId === activeFileId && newOpenFiles.length > 0) {
      setActiveFileId(newOpenFiles[0].id);
    }
  };

  const handleNewFile = () => {
    const newFileId = Date.now().toString();
    const newFile: OpenFile = {
      id: newFileId,
      name: 'untitled.tex',
      path: 'untitled.tex',
      isDirty: false
    };
    
    setOpenFiles([...openFiles, newFile]);
    setActiveFileId(newFileId);
  };
  
  // Populate open files from backend file tree when projectId changes
  useEffect(() => {
    if (!projectId) return;

    let mounted = true;
    (async () => {
      try {
        const { storageApi } = await import('@/lib/api/endpoints/storage');
        const tree = await storageApi.getFileTree(projectId);

        // flatten tree into file list with full paths
        const files: OpenFile[] = [];
        const walk = (nodes: FileNode[], parentPath = '') => {
          if (!nodes) return;
          for (const n of nodes) {
            const fullPath = parentPath ? `${parentPath}/${n.name}` : n.name;
            if (n.type === 'file') {
              files.push({
                id: n.id ?? fullPath,
                name: n.name,
                path: fullPath,
                isDirty: false,
              });
            } else if (n.type === 'directory' || n.type === 'folder') {
              walk(n.children || [], fullPath);
            }
          }
        };

        // tree is returned as array of nodes (children of root)
        if (tree && Array.isArray(tree)) {
          walk(tree, '');
        }

        if (mounted) {
          setOpenFiles(files);
          setActiveFileId(files.length > 0 ? files[0].id : null);
        }
      } catch (err) {
        console.error('Failed to load file tree', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [projectId]);
  
  if (!projectId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No Project Selected</h2>
          <p className="text-gray-600">Please provide a projectId parameter.</p>
         
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.main} ${isSidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
      <Sidebar
        projectId={projectId}
        onFileSelect={handleFileSelect}
        onCollapseToggle={handleSidebarCollapseToggle}
      />
      <div className={styles.mainContent}>
        <EditorToolbar 
          projectId={projectId}
          editorRef={{ current: editorRef.current }}
          yjsDoc={docRef.current ? { current: docRef.current } : undefined}
          isEditorReady={isEditorReady}
          onCompile={handleCompile}
          onReportErrors={(errs: string[]) => {
            setValidationErrors(Array.isArray(errs) ? errs : [String(errs)]);
            setShouldRender(false);
          }}
        />
        <div className={styles.editorPreviewContainer}>
          <EditorPane
            projectId={projectId}
            onEditorReady={handleEditorReady}
            openFiles={openFiles}
            activeFileId={activeFileId}
            onFileSelect={handleTabFileSelect}
            onFileClose={handleTabFileClose}
            onNewFile={handleNewFile}
          />
          <div className={styles.preview}>
            <PreviewErrorBoundary
              onReport={(errs) => {
                setValidationErrors(Array.isArray(errs) ? errs : [String(errs)]);
                setShouldRender(false);
              }}
            >
              <PreviewWindow 
                inputText={compiledContent} 
                shouldRender={shouldRender} 
                validationErrors={validationErrors}
              />
            </PreviewErrorBoundary>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CollaborativeEditor() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorContent />
    </Suspense>
  );
}
