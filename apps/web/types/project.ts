export interface Project {
  id: string;
  workspace_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  title: string;
}

export interface UpdateProjectRequest {
  title?: string;
}

export interface ProjectListResponse {
  projects: Project[];
}

export interface ProjectWithWorkspace extends Project {
  workspace?: {
    id: string;
    name: string;
  };
}
