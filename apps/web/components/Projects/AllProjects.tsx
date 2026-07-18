'use client';

import { useWorkspaces } from '@/lib/query/queries/workspace.queries';
import { projectApi } from '@/lib/api/endpoints/project';
import { useQuery } from '@tanstack/react-query';
import { ProjectWithWorkspace } from '@/types/project';
import styles from "./projects.module.css";

const Projects = () => {
  const { data: workspaces, isLoading: workspacesLoading } = useWorkspaces();

  // Fetch all projects from all workspaces
  const { data: allProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['all-projects', workspaces],
    queryFn: async () => {
      if (!workspaces || workspaces.length === 0) return [];
      
      const projectPromises = workspaces.map(workspace =>
        projectApi.listProjects(workspace.id)
          .then(projects => 
            projects.map(project => ({
              ...project,
              workspace_name: workspace.name,
              owner: workspace.owner_id
            }))
          )
          .catch(() => [])
      );
      
      const projectArrays = await Promise.all(projectPromises);
      return projectArrays.flat();
    },
    enabled: !!workspaces && workspaces.length > 0,
  });

  const isLoading = workspacesLoading || projectsLoading;
  const projects = allProjects || [];

  if (isLoading) {
    return (
      <div className={styles.tableContainer}>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>
          <div className={styles.spinner} />
          <p>Loading projects...</p>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className={styles.tableContainer}>
        <div style={{ padding: '3rem', textAlign: 'center', color: '#6c757d' }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 1rem' }}>
            <path
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3>No projects yet</h3>
          <p>Create your first project to get started</p>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Workspace</th>
            <th>Created</th>
            <th>Last Modified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project: ProjectWithWorkspace & { workspace_name?: string }) => (
            <tr key={project.id}>
              <td><strong>{project.title}</strong></td>
              <td>{project.workspace_name}</td>
              <td>{formatDate(project.created_at)}</td>
              <td>{formatDate(project.updated_at)}</td>
              <td>
                <button className={styles.actionBtn} title="Open">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3.333v9.334M3.333 8h9.334" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <button className={styles.actionBtn} title="Delete">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Projects;
