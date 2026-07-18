'use client';

import { Workspace } from '@/types/workspace';
import styles from './WorkspaceCard.module.css';
import { useRouter } from 'next/navigation';

interface WorkspaceCardProps {
  workspace: Workspace;
  viewMode: 'grid' | 'list';
}

export default function WorkspaceCard({ workspace, viewMode }: WorkspaceCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/workspace/${workspace.id}`);
  };

  const createdDate = workspace.created_at 
    ? new Date(workspace.created_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    : 'Unknown';

  if (viewMode === 'list') {
    return (
      <div className={styles.listCard} onClick={handleClick}>
        <div className={styles.listIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className={styles.listContent}>
          <div className={styles.listMain}>
            <h3 className={styles.listTitle}>{workspace.name}</h3>
            <p className={styles.listDescription}>
              Collaborative LaTeX workspace for your projects
            </p>
          </div>
          <div className={styles.listMeta}>
            <span className={styles.listDate}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="4" width="10" height="9" rx="1" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 7h10M6 2v3M10 2v3" strokeLinecap="round" />
              </svg>
              {createdDate}
            </span>
          </div>
        </div>
        <div className={styles.listArrow}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M7.5 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.header}>
        <div className={styles.iconWrapper}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      
      <div className={styles.titleWrapper}>
        <h3 className={styles.title}>{workspace.name}</h3>
        <p className={styles.description}>
          Collaborative LaTeX workspace for your projects
        </p>
      </div>
      
      <div className={styles.footer}>
        <div className={styles.meta}>
          <span className={styles.created}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="10" height="9" rx="1" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 7h10M6 2v3M10 2v3" strokeLinecap="round" />
            </svg>
            {createdDate}
          </span>
        </div>
      </div>
    </div>
  );
}
