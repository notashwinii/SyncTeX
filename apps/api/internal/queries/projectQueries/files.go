package projectQueries

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

type FileRow struct {
	ID        string
	Filename  string
	ObjectKey string
}

func GetFilesByProject(
	ctx context.Context,
	pool *pgxpool.Pool,
	projectID string,
) ([]FileRow, error) {

	rows, err := pool.Query(ctx, `
		SELECT id, filename, object_key
		FROM project_files
		WHERE project_id = $1
	`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var files []FileRow
	for rows.Next() {
		var f FileRow
		if err := rows.Scan(&f.ID, &f.Filename, &f.ObjectKey); err != nil {
			return nil, err
		}
		files = append(files, f)
	}

	return files, nil
}
