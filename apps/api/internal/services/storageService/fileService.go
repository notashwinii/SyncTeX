package storage

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/projectQueries"
)

type FileMetadata struct {
	ID          string
	ProjectID   string
	FileType    string
	Filename    string
	ObjectKey   string
	ContentType string
	UploadedBy  string
	CreatedAt   time.Time
}

type FileService struct {
	DB *pgxpool.Pool
}

func NewFileService(db *pgxpool.Pool) *FileService {
	return &FileService{DB: db}
}

func (s *FileService) InsertFileMetadata(ctx context.Context, meta *FileMetadata) (*FileMetadata, error) {

	fmt.Printf("ProjectId%v", meta)

	row := s.DB.QueryRow(
		ctx,
		projectQueries.Q.InsertProjectFile,
		meta.ProjectID,
		meta.FileType,
		meta.Filename,
		meta.ObjectKey,
		meta.ContentType,
		meta.UploadedBy,
	)

	var saved FileMetadata
	err := row.Scan(
		&saved.ID,
		&saved.ProjectID,
		&saved.FileType,
		&saved.Filename,
		&saved.ObjectKey,
		&saved.ContentType,
		&saved.UploadedBy,
		&saved.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	return &saved, nil
}
