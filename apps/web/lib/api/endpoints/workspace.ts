import client from '../client';
import {
  Workspace,
  WorkspaceMember,
  CreateWorkspaceRequest,
  AddMemberRequest,
  WorkspaceInvitation,
  SendInvitationRequest,
} from '@/types/workspace';

export const workspaceApi = {
  createWorkspace: async (data: CreateWorkspaceRequest): Promise<Workspace> => {
    const response = await client.post<Workspace>('/workspaces', data);
    return response.data;
  },

  listMyWorkspaces: async (): Promise<Workspace[]> => {
    const response = await client.get<Workspace[]>('/workspaces');
    return response.data;
  },

  getWorkspace: async (id: string): Promise<Workspace> => {
    const response = await client.get<Workspace>(`/workspaces/${id}`);
    return response.data;
  },

  addMember: async (
    workspaceId: string,
    data: AddMemberRequest
  ): Promise<WorkspaceMember> => {
    const response = await client.post<WorkspaceMember>(
      `/workspaces/${workspaceId}/members`,
      data
    );
    return response.data;
  },

  listMembers: async (workspaceId: string): Promise<WorkspaceMember[]> => {
    const response = await client.get<WorkspaceMember[]>(
      `/workspaces/${workspaceId}/members`
    );
    return response.data;
  },

  // Invitation endpoints
  sendInvitation: async (
    workspaceId: string,
    data: SendInvitationRequest
  ): Promise<WorkspaceInvitation> => {
    const response = await client.post<WorkspaceInvitation>(
      `/workspaces/${workspaceId}/invitations`,
      data
    );
    return response.data;
  },

  listInvitations: async (workspaceId: string): Promise<WorkspaceInvitation[]> => {
    const response = await client.get<WorkspaceInvitation[]>(
      `/workspaces/${workspaceId}/invitations`
    );
    return response.data;
  },

  getMyInvitations: async (): Promise<WorkspaceInvitation[]> => {
    const response = await client.get<WorkspaceInvitation[]>('/invitations');
    return response.data;
  },

  acceptInvitation: async (token: string): Promise<WorkspaceMember> => {
    const response = await client.post<WorkspaceMember>(
      `/invitations/${token}/accept`
    );
    return response.data;
  },

  declineInvitation: async (token: string): Promise<void> => {
    await client.post(`/invitations/${token}/decline`);
  },

  cancelInvitation: async (invitationId: string): Promise<void> => {
    await client.delete(`/invitations/${invitationId}`);
  },
};
