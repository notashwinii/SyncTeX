import { useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceApi } from '@/lib/api/endpoints/workspace';
import {
  CreateWorkspaceRequest,
  Workspace,
  AddMemberRequest,
  WorkspaceMember,
} from '@/types/workspace';
import { workspaceKeys } from '../queries/workspace.queries';
import { projectKeys } from '../queries/project.queries';

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation<Workspace, Error, CreateWorkspaceRequest>({
    mutationFn: workspaceApi.createWorkspace,
    onSuccess: (newWorkspace) => {
      queryClient.setQueryData<Workspace[]>(
        workspaceKeys.list(),
        (old) => [...(old || []), newWorkspace]
      );
      
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    onError: (error) => {
      console.error('Create workspace failed:', error);
    },
  });
};

export const useAddWorkspaceMember = (workspaceId: string) => {
  const queryClient = useQueryClient();

  return useMutation<WorkspaceMember, Error, AddMemberRequest>({
    mutationFn: (data) => workspaceApi.addMember(workspaceId, data),
    onSuccess: (newMember) => {
      queryClient.setQueryData<WorkspaceMember[]>(
        workspaceKeys.members(workspaceId),
        (old) => [...(old || []), newMember]
      );
      
      queryClient.invalidateQueries({ 
        queryKey: workspaceKeys.members(workspaceId) 
      });
    },
    onError: (error) => {
      console.error('Add member failed:', error);
    },
  });
};
