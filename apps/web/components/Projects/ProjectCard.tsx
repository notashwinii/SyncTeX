'use client';

import { Project } from '@/types/project';
import styles from './ProjectCard.module.css';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/projects/${project.id}/editor`);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete && confirm(`Are you sure you want to delete "${project.title}"?`)) {
      onDelete(project.id);
    }
  };

  const createdDate = project.created_at 
    ? new Date(project.created_at).toLocaleDateString()
    : 'Unknown';
  
  const updatedDate = project.updated_at 
    ? new Date(project.updated_at).toLocaleDateString()
    : 'Never';

  return (
    <div className={styles.card} onClick={handleClick}>
      <div className={styles.header}>
        <div className={styles.icon}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M11.667 1.667H5a1.667 1.667 0 0 0-1.667 1.666v13.334A1.667 1.667 0 0 0 5 18.333h10a1.667 1.667 0 0 0 1.667-1.666V6.667m-5-5 5 5m-5-5v5h5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h3 className={styles.title}>{project.title}</h3>
        {onDelete && (
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            aria-label="Delete project"
            title="Delete project"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      <div className={styles.footer}>
        <span className={styles.date}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Updated {updatedDate}
        </span>
        <span className={styles.date}>
          Created {createdDate}
        </span>
      </div>
    </div>
  );
}
