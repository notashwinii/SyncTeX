package snapshotSchemas

type Snapshot struct {
	ID        string `json:"id"`
	ProjectID string `json:"project_id"`
	State     []byte `json:"state"`
}

// UpsertSnapshotRequest holds a base64-encoded Yjs state (or raw bytes over octet-stream)
type UpsertSnapshotRequest struct {
	State string `json:"state" binding:"required"` // base64
}
