'use client';

import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Image,
  Book,
  File,
  ChevronRight,
  ChevronDown,
  PanelLeft,
  PanelRight,
  Download,
} from 'lucide-react';
import styles from './Sidebar.module.css';

import type { FileNode as APIFileNode } from '@/types/file';
type FileNode = APIFileNode & { isOpen?: boolean };

// File tree will be fetched from backend; initial state is empty
// Keep the same FileNode shape as backend

const fileIcon = (name: string) => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext ?? '')) return Image;
  if (ext === 'bib') return Book;
  if (['md', 'tex', 'pdf'].includes(ext ?? '')) return FileText;
  return File;
};

const FileTreeItem = ({ node, level, onFileSelect, onToggleFolder }: any) => {
  const Icon =
    node.type === 'folder'
      ? node.isOpen
        ? FolderOpen
        : Folder
      : fileIcon(node.name);

  return (
    <div className={styles.fileTreeItem}>
      <div
        className={`${styles.itemContent} ${
          node.type === 'file' ? styles.file : styles.folder
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() =>
          node.type === 'folder'
            ? onToggleFolder(node.id)
            : onFileSelect(node)
        }
      >
        <span className={styles.icon}>
          <Icon size={16} />
        </span>
        <span className={styles.name}>{node.name}</span>

        {node.type === 'folder' && (
          <span className={styles.chevron}>
            {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
      </div>

      {node.type === 'folder' && node.isOpen && node.children && (
        <div className={styles.children}>
          {node.children.map((child: FileNode) => (
            <FileTreeItem
              key={child.id}
              node={child}
              level={level + 1}
              onFileSelect={onFileSelect}
              onToggleFolder={onToggleFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ projectId, onFileSelect, className, onCollapseToggle }: any) => {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);

  // lazy import storageApi to avoid cycles in build
  const fetchTree = async (pid: string) => {
    try {
      setError(null);
      setIsLoading(true);
      const { storageApi } = await import('@/lib/api/endpoints/storage');
      const tree = await storageApi.getFileTree(pid);
      setFileTree(tree || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (id: string) => {
    const walk = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n =>
        n.id === id && n.type === 'folder'
          ? { ...n, isOpen: !n.isOpen }
          : { ...n, children: n.children && walk(n.children) }
      );
    setFileTree(walk);
  };

  const collapseAll = () => {
    const walk = (nodes: FileNode[]): FileNode[] =>
      nodes.map(n =>
        n.type === 'folder'
          ? { ...n, isOpen: false, children: n.children && walk(n.children) }
          : n
      );
    setFileTree(walk);
  };

  const toggleSidebar = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    onCollapseToggle?.(next);
  };

  const downloadAsZip = async () => {
    if (!projectId) return;
    
    setIsDownloading(true);
    try {
      // Import JSZip dynamically
      const JSZip = await import('jszip');
      const zip = new JSZip.default();
      
      // Function to recursively add files to zip
      const addFilesToZip = async (nodes: FileNode[], basePath = '') => {
        for (const node of nodes) {
          if (node.type === 'file') {
            try {
              // In a real implementation, you'd fetch the file content from your API
              // For now, we'll add placeholder content
              const content = `// Content of ${node.name}\n// This would be fetched from your storage API`;
              zip.file(`${basePath}${node.name}`, content);
            } catch (error) {
              console.error(`Error adding file ${node.name}:`, error);
            }
          } else if (node.type === 'folder' && node.children) {
            const folderPath = `${basePath}${node.name}/`;
            await addFilesToZip(node.children, folderPath);
          }
        }
      };
      
      await addFilesToZip(fileTree);
      
      // Generate and download the zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-${projectId}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error creating zip:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (projectId) fetchTree(projectId);
  }, [projectId]);

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''} ${className ?? ''}`}>
      <div className={styles.header}>
        {!isCollapsed && (
          <>
            <h3 className={styles.title}>Explorer</h3>
            <div className={styles.headerActions}>
              <button 
                onClick={downloadAsZip}
                disabled={isDownloading || fileTree.length === 0}
                className={styles.downloadButton}
                title={isDownloading ? "Downloading..." : "Download all files as ZIP"}
                aria-label="Download all files as ZIP"
              >
                <Download size={16} />
              </button>
              <button onClick={collapseAll} title="Collapse All">
                <Folder size={16} />
              </button>
            </div>
          </>
        )}

        <button onClick={toggleSidebar}>
          {isCollapsed ? <PanelRight size={16} /> : <PanelLeft size={16} />}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div className={styles.fileTree}>
            {isLoading && <div>Loading files...</div>}
            {error && (
              <div>
                <div className="text-red-500">{error}</div>
                <button onClick={() => projectId && fetchTree(projectId)}>Retry</button>
              </div>
            )}
            {!isLoading && !error && fileTree.map((node: FileNode) => (
                <FileTreeItem
                    key={node.id ?? node.name}
                    node={node}
                    level={0}
                    onFileSelect={(file: FileNode) => {
                        setSelectedFile(file);
                        onFileSelect?.(file);
                    }}
                    onToggleFolder={(id: string) => toggleFolder(id)}
                />
            ))}
          </div>

          {selectedFile && (
            <div className={styles.statusBar}>
              Selected: {selectedFile.name}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sidebar;
