package downloadQueries

type Queries struct {
	ProjectContent string
}

var Query = Queries{
	ProjectContent: "SELECT state FROM snapshots WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
}
