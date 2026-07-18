package snapshotQueries

type Queries struct {
	GetLatestSnapshot string
	UpsertSnapshot    string
}

// Strategy: latest-only snapshot, one row per project — a true UPSERT backed
// by the unique index added in migration 0003.
var Q = Queries{
	GetLatestSnapshot: "SELECT id, project_id, state FROM snapshots WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
	UpsertSnapshot: `INSERT INTO snapshots (project_id, state) VALUES ($1, $2)
		ON CONFLICT (project_id) DO UPDATE SET state = EXCLUDED.state, created_at = now()
		RETURNING id, project_id, state`,
}
