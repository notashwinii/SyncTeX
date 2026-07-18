package snapshotHandlers

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/snapshotQueries"
	"github.com/synctex-org/backend/schemas/snapshotSchemas"
)

// GetLatestSnapshot godoc
// @Summary Get latest snapshot for a project
// @Tags snapshots
// @Produce application/octet-stream
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 200 {string} string "binary"
// @Router /projects/{id}/snapshot [get]
func GetLatestSnapshot(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")
		row := pool.QueryRow(c, snapshotQueries.Q.GetLatestSnapshot, projectID)
		var id, pid string
		var state []byte
		if err := row.Scan(&id, &pid, &state); err != nil {
			c.Status(http.StatusNoContent)
			return
		}
		c.Data(http.StatusOK, "application/octet-stream", state)
	}
}

// UpsertSnapshot godoc
// @Summary Save latest snapshot for a project (base64 in JSON)
// @Tags snapshots
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Param request body snapshotSchemas.UpsertSnapshotRequest true "Snapshot"
// @Success 201 {object} map[string]string
// @Router /projects/{id}/snapshot [put]
func UpsertSnapshot(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")
		var req snapshotSchemas.UpsertSnapshotRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload"})
			return
		}
		decoded, err := base64.StdEncoding.DecodeString(req.State)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid base64"})
			return
		}
		if err := pool.QueryRow(c, snapshotQueries.Q.UpsertSnapshot, projectID, decoded).Scan(new(string), new(string), new([]byte)); err != nil {
			// We don't care about returned row; scan into dummies to check errors
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "snapshot saved"})
	}
}
