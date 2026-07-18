'use client'

import React from 'react';
import { X, FileText, Image, Book, File, Plus } from 'lucide-react';
import styles from './FileTabs.module.css';

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  isDirty?: boolean;
  type?: 'file' | 'folder';
}

interface FileTabsProps {
  openFiles: OpenFile[];
  activeFileId: string | null;
  onFileSelect: (fileId: string) => void;
  onFileClose: (fileId: string) => void;
  onNewFile?: () => void;
}

const getFileIcon = (fileName: string) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'tex':
    case 'md':
    case 'txt':
      return FileText;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'svg':
      return Image;
    case 'bib':
      return Book;
    default:
      return File;
  }
};

const FileTabs: React.FC<FileTabsProps> = ({
  openFiles,
  activeFileId,
  onFileSelect,
  onFileClose,
  onNewFile
}) => {
  const handleTabClick = (fileId: string) => {
    onFileSelect(fileId);
  };

  const handleCloseClick = (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    onFileClose(fileId);
  };

  const handleNewFile = () => {
    onNewFile?.();
  };

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabsScrollContainer}>
        <div className={styles.tabs}>
          {openFiles.map((file) => {
            const Icon = getFileIcon(file.name);
            const isActive = file.id === activeFileId;
            
            return (
              <div
                key={file.id}
                className={`${styles.tab} ${isActive ? styles.active : ''}`}
                onClick={() => handleTabClick(file.id)}
                title={file.path}
              >
                <div className={styles.tabContent}>
                  <Icon size={14} className={styles.tabIcon} />
                  <span className={styles.tabName}>
                    {file.name}
                    {file.isDirty && <span className={styles.dirty}>●</span>}
                  </span>
                  <button
                    className={styles.closeButton}
                    onClick={(e) => handleCloseClick(e, file.id)}
                    title="Close file"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );
          })}
          
          {/* New file button */}
          <button 
            className={styles.newFileButton}
            onClick={handleNewFile}
            title="New file"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileTabs;