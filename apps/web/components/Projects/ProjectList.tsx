'use client';

import { useProjects } from '@/lib/query/queries/project.queries';
import { useDeleteProject } from '@/lib/query/mutations/project.mutations';
import ProjectCard from './ProjectCard';
import styles from './ProjectList.module.css';

interface ProjectListProps {
  workspaceId: string;
}

export default function ProjectList({ workspaceId }: ProjectListProps) {
  const { data: projects, isLoading, error } = useProjects(workspaceId);
  const deleteProject = useDeleteProject();

  const handleDelete = (id: string) => {
    deleteProject.mutate({ id, workspaceId });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <p>Loading projects...</p>
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
          <h3>Failed to load projects</h3>
          <p>{error instanceof Error ? error.message : 'An error occurred'}</p>
        </div>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M13 2v7h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <h3>No projects yet</h3>
          <p>Create your first LaTeX project to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
}
