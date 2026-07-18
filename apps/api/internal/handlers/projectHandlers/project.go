package projectHandlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/projectQueries"
	"github.com/synctex-org/backend/internal/queries/workspaceQueries"
	"github.com/synctex-org/backend/schemas/projectSchemas"
)

// CreateProject godoc
// @Summary Create project in a workspace
// @Tags projects
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Param request body projectSchemas.CreateProjectRequest true "Create project"
// @Success 201 {object} projectSchemas.Project
// @Router /workspaces/{id}/projects [post]
func CreateProject(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		wsID := c.Param("id")
		// membership check
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, c.GetString("userID")).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}
		var req projectSchemas.CreateProjectRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload"})
			return
		}
		row := pool.QueryRow(c, projectQueries.Q.CreateProject, wsID, req.Title)
		var p projectSchemas.Project
		if err := row.Scan(&p.ID, &p.WorkspaceID, &p.Title, &p.CreatedAt, &p.UpdatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, p)
	}
}

// ListProjects godoc
// @Summary List projects in a workspace
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Success 200 {array} projectSchemas.Project
// @Router /workspaces/{id}/projects [get]
func ListProjects(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		wsID := c.Param("id")
		// membership check
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, c.GetString("userID")).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}
		rows, err := pool.Query(c, projectQueries.Q.ListProjects, wsID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()
		var list []projectSchemas.Project
		for rows.Next() {
			var p projectSchemas.Project
			if err := rows.Scan(&p.ID, &p.WorkspaceID, &p.Title, &p.CreatedAt, &p.UpdatedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			list = append(list, p)
		}
		c.JSON(http.StatusOK, list)
	}
}

// GetProject godoc
// @Summary Get project by id
// @Tags projects
// @Produce json
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 200 {object} projectSchemas.Project
// @Router /projects/{id} [get]
func GetProject(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var exists int
		if err := pool.QueryRow(c, projectQueries.Q.CheckProjectAccess, id, c.GetString("userID")).Scan(&exists); err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
	}
	row := pool.QueryRow(c, projectQueries.Q.GetProjectByID, id)
	var p projectSchemas.Project
	if err := row.Scan(&p.ID, &p.WorkspaceID, &p.Title, &p.CreatedAt, &p.UpdatedAt); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "project not found"})
		return
	}
	c.JSON(http.StatusOK, p)
}
}// DeleteProject godoc
// @Summary Delete project by id
// @Tags projects
// @Security BearerAuth
// @Param id path string true "Project ID"
// @Success 204 {string} string "no content"
// @Router /projects/{id} [delete]
func DeleteProject(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		var exists int
		if err := pool.QueryRow(c, projectQueries.Q.CheckProjectAccess, id, c.GetString("userID")).Scan(&exists); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}
		if _, err := pool.Exec(c, projectQueries.Q.DeleteProjectByID, id); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.Status(http.StatusNoContent)
	}
}
