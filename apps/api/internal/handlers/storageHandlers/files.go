package storage

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/projectQueries"
	"github.com/synctex-org/backend/internal/services/storageService"
)

func GetFileTree(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")

		rows, err := projectQueries.GetFilesByProject(
			c.Request.Context(),
			pool,
			projectID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to fetch files",
			})
			return
		}

		var files []storage.FileMetadata
		for _, r := range rows {
			files = append(files, storage.FileMetadata{
				ID:        r.ID,
				Filename:  r.Filename,
				ObjectKey: r.ObjectKey,
			})
		}

		tree := storage.BuildFileTree(files)
		c.JSON(http.StatusOK, tree)
	}
}
