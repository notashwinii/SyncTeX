package sessionQueries

type Queries struct {
	StartSession string
	EndSession   string
}

var Q = Queries{
	StartSession: "INSERT INTO sessions (project_id, user_id, status) VALUES ($1, $2, 'active') RETURNING id, project_id, user_id, status",
	EndSession:   "UPDATE sessions SET status = 'ended' WHERE id = $1 RETURNING id, project_id, user_id, status",
}
