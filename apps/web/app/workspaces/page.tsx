'use client';

import { useState } from 'react';
import WorkspaceList from '@/components/Workspace/WorkspaceList';
import CreateWorkspaceModal from '@/components/Workspace/CreateWorkspaceModal';
import styles from './page.module.css';

type ViewMode = 'grid' | 'list';

export default function WorkspacesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.titleBar}>
          <div className={styles.titleSection}>
            <h1 className={styles.title}>My Workspaces</h1>
            <p className={styles.subtitle}>
              Organize your LaTeX projects into collaborative workspaces
            </p>
          </div>
          <div className={styles.actions}>
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <button
              className={styles.createBtn}
              onClick={() => setIsCreateModalOpen(true)}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M10 4.167v11.666M4.167 10h11.666"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              New Workspace
            </button>
          </div>
        </div>

        <WorkspaceList viewMode={viewMode} />
      </div>

      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
