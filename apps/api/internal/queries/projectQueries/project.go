package projectQueries

type Queries struct {
	CreateProject      string
	ListProjects       string
	GetProjectByID     string
	DeleteProjectByID  string
	CheckProjectAccess string
	CheckProjectExists string

	// Project files queries
	InsertProjectFile     string
	ListProjectFiles      string
	GetProjectFileByID    string
	DeleteProjectFileByID string
	GetProjectFiles       string
}

var Q = Queries{
	CreateProject:      "INSERT INTO projects (workspace_id, title) VALUES ($1, $2) RETURNING id, workspace_id, title, created_at, updated_at",
	ListProjects:       "SELECT id, workspace_id, title, created_at, updated_at FROM projects WHERE workspace_id = $1",
	GetProjectByID:     "SELECT id, workspace_id, title, created_at, updated_at FROM projects WHERE id = $1",
	DeleteProjectByID:  "DELETE FROM projects WHERE id = $1",
	CheckProjectAccess: "SELECT 1 FROM workspace_members m JOIN projects p ON p.workspace_id = m.workspace_id WHERE p.id = $1 AND m.user_id = $2",
	CheckProjectExists: "SELECT EXISTS(SELECT 1 FROM projects WHERE id = $1)",
	InsertProjectFile: `
		INSERT INTO project_files 
			(project_id, file_type, filename, object_key, content_type, uploaded_by) 
		VALUES ($1, $2, $3, $4, $5, $6) 
		RETURNING id, project_id, file_type, filename, object_key, content_type, uploaded_by, created_at
	`,
	GetProjectFiles: `SELECT id, filename, file_type, object_key
		FROM project_files
		WHERE project_id = $1
		ORDER BY object_key`,
}
