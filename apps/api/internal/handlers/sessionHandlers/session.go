package sessionHandlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/sessionQueries"
)

// StartSession godoc
// @Summary Start an editing session
// @Tags sessions
// @Produce json
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 201 {object} map[string]string
// @Router /projects/{id}/sessions [post]
func StartSession(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param("id")
		userID := c.GetString("userID")
		if err := pool.QueryRow(c, sessionQueries.Q.StartSession, projectID, userID).Scan(new(string), new(string), new(string), new(string)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, gin.H{"message": "session started"})
	}
}

// EndSession godoc
// @Summary End an editing session
// @Tags sessions
// @Produce json
// @Security BearerAuth
// @Param id path string true "Session ID"
// @Success 200 {object} map[string]string
// @Router /sessions/{id}/end [post]
func EndSession(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		if err := pool.QueryRow(c, sessionQueries.Q.EndSession, id).Scan(new(string), new(string), new(string), new(string)); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "session ended"})
	}
}
