'use client';

import { useWorkspaces } from '@/lib/query/queries/workspace.queries';
import WorkspaceCard from './WorkspaceCard';
import styles from './WorkspaceList.module.css';

interface WorkspaceListProps {
  viewMode: 'grid' | 'list';
}

export default function WorkspaceList({ viewMode }: WorkspaceListProps) {
  const { data: workspaces, isLoading, error } = useWorkspaces();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading workspaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h3>Failed to load workspaces</h3>
          <p>{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3>No workspaces yet</h3>
          <p>Create your first workspace to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={viewMode === 'grid' ? styles.grid : styles.list}>
        {workspaces.map((workspace) => (
          <WorkspaceCard
            key={workspace.id}
            workspace={workspace}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
}
