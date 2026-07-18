'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useWorkspace } from '@/lib/query/queries/workspace.queries';
import { projectApi } from '@/lib/api/endpoints/project';
import { useQuery } from '@tanstack/react-query';
import CreateProjectModal from '@/components/Projects/CreateProjectModal';
import AddMemberModal from '@/components/Workspace/AddMemberModal';
import styles from './page.module.css';

export default function WorkspaceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;
  
  const { data: workspace, isLoading: workspaceLoading, error } = useWorkspace(workspaceId);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch projects for this workspace
  const { data: projects, isLoading: projectsLoading, refetch } = useQuery({
    queryKey: ['workspace-projects', workspaceId],
    queryFn: () => projectApi.listProjects(workspaceId),
    enabled: !!workspaceId,
  });

  const isLoading = workspaceLoading || projectsLoading;

  // Filter projects based on search
  const filteredProjects = projects?.filter(project =>
    project.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleProjectCreated = () => {
    setIsCreateProjectModalOpen(false);
    refetch(); // Refetch projects after creation
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDeleteProject = async (projectId: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      try {
        await projectApi.deleteProject(projectId);
        // Refetch projects
        window.location.reload();
      } catch (error) {
        console.error('Failed to delete project:', error);
        alert('Failed to delete project');
      }
    }
  };

  if (error || (!workspace && !workspaceLoading)) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <h2>Workspace not found</h2>
          <p>The workspace you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          <button className={styles.backBtn} onClick={() => router.push('/workspaces')}>
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logoWrapper}>
          <Image src="/SyncTex.png" alt="Synctex Logo" width={180} height={40} />
        </div>
        
        <button 
          className={styles.newProjectBtn}
          onClick={() => setIsCreateProjectModalOpen(true)}
        >
          New Project
        </button>

        <nav>
          <ul className={styles.navList}>
            <li 
              className={styles.navItem}
              onClick={() => router.push('/workspaces')}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px' }}>
                <path d="M2 6l6-4 6 4v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              All Workspaces
            </li>
            <li className={`${styles.navItem} ${styles.active}`}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginRight: '8px' }}>
                <path d="M2 5v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H9L7 3H3a1 1 0 0 0-1 1v1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {workspace?.name || 'Loading...'}
            </li>
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <button 
            className={styles.membersBtn}
            onClick={() => setIsAddMemberModalOpen(true)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11 14v-1.333A2.667 2.667 0 0 0 8.333 10H3.667a2.667 2.667 0 0 0-2.667 2.667V14M13.333 5.333v4M15.333 7.333h-4M6 7.333A2.667 2.667 0 1 0 6 2a2.667 2.667 0 0 0 0 5.333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Manage Members
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Search in all Projects..." 
            className={styles.searchBar}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className={styles.tableContainer}>
            <div className={styles.loadingState}>
              <div className={styles.spinner} />
              <p>Loading projects...</p>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className={styles.tableContainer}>
            <div className={styles.emptyState}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h3>{searchQuery ? 'No projects found' : 'No projects yet'}</h3>
              <p>{searchQuery ? 'Try a different search term' : 'Create your first project to get started'}</p>
              {!searchQuery && (
                <button 
                  className={styles.createFirstBtn}
                  onClick={() => setIsCreateProjectModalOpen(true)}
                >
                  Create Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Created</th>
                  <th>Last Modified</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td><strong>{project.title}</strong></td>
                    <td>{formatDate(project.created_at)}</td>
                    <td>{formatDate(project.updated_at)}</td>
                    <td>
                      <button 
                        className={styles.actionBtn}
                        title="Open Editor"
                        onClick={() => router.push(`/editor?projectId=${project.id}`)}
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                          <path d="M11.333 2A1.886 1.886 0 0 1 14 4.667l-9 9-3.667 1 1-3.667 9-9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    
                      <button 
                        className={styles.actionBtn}
                        title="Delete"
                        onClick={() => handleDeleteProject(project.id)}
                      >
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
        )}
      </main>

      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={handleProjectCreated}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        workspaceId={workspaceId}
      />
    </div>
  );
}
