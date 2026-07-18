package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/db"
)

func RequireProjectAccess(pool *pgxpool.Pool, parameter string) gin.HandlerFunc {
	queries := db.New(pool)
	return func(c *gin.Context) {
		projectID := c.Param(parameter)
		if !userCanAccessProject(c, queries, projectID) {
			return
		}
		c.Next()
	}
}

func RequireObjectProjectAccess(pool *pgxpool.Pool) gin.HandlerFunc {
	queries := db.New(pool)
	return func(c *gin.Context) {
		objectKey := strings.TrimSpace(c.Query("key"))
		projectID, _, found := strings.Cut(objectKey, "/")
		if !found || projectID == "" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "invalid object key"})
			return
		}
		if !userCanAccessProject(c, queries, projectID) {
			return
		}
		c.Next()
	}
}

func userCanAccessProject(c *gin.Context, queries db.Querier, projectID string) bool {
	if projectID == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"message": "missing project id"})
		return false
	}

	allowed, err := queries.UserCanAccessProject(
		c.Request.Context(),
		db.UserCanAccessProjectParams{
			ProjectID: projectID,
			UserID:    c.GetString("userID"),
		},
	)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"message": "failed to verify project access"})
		return false
	}
	if !allowed {
		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"message": "not authorized"})
	}
	return allowed
}
