package workspaceQueries

type Queries struct {
	CreateWorkspace         string
	ListMyWorkspaces        string
	GetWorkspaceByID        string
	AddWorkspaceMember      string
	ListWorkspaceMembers    string
	CheckUserWorkspaceRole  string
}

var Q = Queries{
	CreateWorkspace:        "INSERT INTO workspaces (name, owner_id) VALUES ($1, $2) RETURNING id, name, owner_id, created_at",
	ListMyWorkspaces:       "SELECT w.id, w.name, w.owner_id, w.created_at FROM workspaces w JOIN workspace_members m ON w.id = m.workspace_id WHERE m.user_id = $1",
	GetWorkspaceByID:       "SELECT id, name, owner_id, created_at FROM workspaces WHERE id = $1",
	AddWorkspaceMember:     "INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING id, workspace_id, user_id, role",
	ListWorkspaceMembers:   "SELECT id, workspace_id, user_id, role FROM workspace_members WHERE workspace_id = $1",
	CheckUserWorkspaceRole: "SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2",
}
