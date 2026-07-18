package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/projectQueries"
)

func RequireProjectAccess(pool *pgxpool.Pool, parameter string) gin.HandlerFunc {
	return func(c *gin.Context) {
		projectID := c.Param(parameter)
		if !userCanAccessProject(c, pool, projectID) {
			return
		}
		c.Next()
	}
}

func RequireObjectProjectAccess(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		objectKey := strings.TrimSpace(c.Query("key"))
		projectID, _, found := strings.Cut(objectKey, "/")
		if !found || projectID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "invalid object key"})
			return
		}
		if !userCanAccessProject(c, pool, projectID) {
			return
		}
		c.Next()
	}
}

func userCanAccessProject(c *gin.Context, pool *pgxpool.Pool, projectID string) bool {
	if projectID == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "missing project id"})
		return false
	}

	var exists int
	err := pool.QueryRow(
		c.Request.Context(),
		projectQueries.Q.CheckProjectAccess,
		projectID,
		c.GetString("userID"),
	).Scan(&exists)
	if err == nil {
		return true
	}
	if err == pgx.ErrNoRows {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "not authorized"})
		return false
	}

	c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "failed to verify project access"})
	return false
}
