import { useQuery } from '@tanstack/react-query';
import { projectApi } from '@/lib/api/endpoints/project';
import { Project } from '@/types/project';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...projectKeys.lists(), workspaceId] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
};

export const useProjects = (workspaceId: string, enabled: boolean = true) => {
  return useQuery<Project[], Error>({
    queryKey: projectKeys.list(workspaceId),
    queryFn: () => projectApi.listProjects(workspaceId),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!workspaceId,
  });
};

export const useProject = (id: string, enabled: boolean = true) => {
  return useQuery<Project, Error>({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectApi.getProject(id),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!id,
  });
};
