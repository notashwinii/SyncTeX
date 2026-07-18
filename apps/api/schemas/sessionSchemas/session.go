package sessionSchemas

type Session struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`
	UserID    string `json:"user_id"`
	Status    string `json:"status"` // active/ended
}
