import { useQuery } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/endpoints/workspace';
import { Workspace, WorkspaceMember } from '@/types/workspace';

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: () => [...workspaceKeys.lists()] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
};

export const useWorkspaces = () => {
  return useQuery<Workspace[], Error>({
    queryKey: workspaceKeys.list(),
    queryFn: workspaceApi.listMyWorkspaces,
    staleTime: 5 * 60 * 1000,
  });
};

export const useWorkspace = (id: string, enabled: boolean = true) => {
  return useQuery<Workspace, Error>({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => workspaceApi.getWorkspace(id),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!id,
  });
};

export const useWorkspaceMembers = (workspaceId: string, enabled: boolean = true) => {
  return useQuery<WorkspaceMember[], Error>({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceApi.listMembers(workspaceId),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!workspaceId,
  });
};
