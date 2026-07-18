import client from '../client';
import {
  Project,
  CreateProjectRequest,
} from '@/types/project';

export const projectApi = {
  createProject: async (
    workspaceId: string,
    data: CreateProjectRequest
  ): Promise<Project> => {
    const response = await client.post<Project>(
      `/workspaces/${workspaceId}/projects`,
      data
    );
    return response.data;
  },

  listProjects: async (workspaceId: string): Promise<Project[]> => {
    const response = await client.get<Project[]>(
      `/workspaces/${workspaceId}/projects`
    );
    return response.data;
  },

  getProject: async (id: string): Promise<Project> => {
    const response = await client.get<Project>(`/projects/${id}`);
    return response.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await client.delete(`/projects/${id}`);
  },
};
