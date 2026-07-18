import { Project } from './project';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  token?: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  expires_at: string;
  accepted_at?: string;
}

export interface CreateWorkspaceRequest {
  name: string;
}

export interface AddMemberRequest {
  user_id: string;
  role: string;
}

export interface SendInvitationRequest {
  email: string;
  role: string;
}

export interface WorkspaceWithProjects extends Workspace {
  projects?: Project[];
  memberCount?: number;
}

export interface WorkspaceListResponse {
  workspaces: Workspace[];
}

export interface MemberListResponse {
  members: WorkspaceMember[];
}
