import { useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/endpoints/project';
import { CreateProjectRequest, Project } from '@/types/project';
import { projectKeys } from '../queries/project.queries';
import client from '@/lib/api/client';

export const useCreateProject = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<Project, Error, CreateProjectRequest>({
    mutationFn: (data) => projectApi.createProject(workspaceId, data),
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>(
        projectKeys.list(workspaceId),
        (old) => [...(old || []), newProject]
      );
      
      queryClient.invalidateQueries({ 
        queryKey: projectKeys.list(workspaceId) 
      });
    },
    onError: (error) => {
      console.error('Create project failed:', error);
    },
  });
};

export const useSaveProject = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string; content: string }>({
    mutationFn: async ({ id, content }) => {
      // snapshot endpoint expects base64-encoded state
      const encoded = typeof window !== 'undefined' ? btoa(content) : Buffer.from(content).toString('base64');
      await client.put(`/projects/${id}/snapshot`, { state: encoded });
    },
    onSuccess: () => {
      // Invalidate any snapshot/project queries if present
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: (error) => {
      console.error('Save project failed:', error);
    },
  });
};

export const useDownloadPDF = () => {
  return useMutation<void, Error, { id: string; content: string }>({
    mutationFn: async ({ id, content }) => {
      // Use POST method with content in body
      const resp = await client.post<ArrayBuffer>(
        `/projects/${id}/download`,
        { content },
        {
          responseType: 'arraybuffer',
        }
      );

      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Download PDF failed:', error);
      
      alert(error.message || 'PDF compilation failed');
    },
  });
};

export const useDeleteProject = () => {
  const queryClient = useQueryClient();

  return useMutation<
    void, 
    Error, 
    { id: string; workspaceId: string },
    { previousProjects?: Project[]; workspaceId: string }
  >({
    mutationFn: ({ id }) => projectApi.deleteProject(id),
    onMutate: async ({ id, workspaceId }) => {
      await queryClient.cancelQueries({ 
        queryKey: projectKeys.list(workspaceId) 
      });

      const previousProjects = queryClient.getQueryData<Project[]>(
        projectKeys.list(workspaceId)
      );

      queryClient.setQueryData<Project[]>(
        projectKeys.list(workspaceId),
        (old) => old?.filter((project) => project.id !== id) || []
      );

      return { previousProjects, workspaceId };
    },
    onError: (error, variables, context) => {
      if (context?.previousProjects) {
        queryClient.setQueryData(
          projectKeys.list(context.workspaceId),
          context.previousProjects
        );
      }
      console.error('Delete project failed:', error);
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ 
        queryKey: projectKeys.list(workspaceId) 
      });
    },
  });
};
