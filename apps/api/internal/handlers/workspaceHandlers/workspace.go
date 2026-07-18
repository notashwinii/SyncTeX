package workspaceHandlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/workspaceQueries"
	"github.com/synctex-org/backend/schemas/workspaceSchemas"
)

// CreateWorkspace godoc
// @Summary Create workspace
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body workspaceSchemas.CreateWorkspaceRequest true "Create workspace"
// @Success 201 {object} workspaceSchemas.Workspace
// @Router /workspaces [post]
func CreateWorkspace(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req workspaceSchemas.CreateWorkspaceRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload"})
			return
		}
		userID := c.GetString("userID")
		row := pool.QueryRow(c, workspaceQueries.Q.CreateWorkspace, req.Name, userID)
		var ws workspaceSchemas.Workspace
		if err := row.Scan(&ws.ID, &ws.Name, &ws.OwnerID, &ws.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		// Ensure owner is also recorded as a member
		_, _ = pool.Exec(c, workspaceQueries.Q.AddWorkspaceMember, ws.ID, userID, "owner")
		c.JSON(http.StatusCreated, ws)
	}
}

// ListMyWorkspaces godoc
// @Summary List my workspaces
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Success 200 {array} workspaceSchemas.Workspace
// @Router /workspaces [get]
func ListMyWorkspaces(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")
		rows, err := pool.Query(c, workspaceQueries.Q.ListMyWorkspaces, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()
		list := []workspaceSchemas.Workspace{}
		for rows.Next() {
			var w workspaceSchemas.Workspace
			if err := rows.Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			list = append(list, w)
		}
		c.JSON(http.StatusOK, list)
	}
}

// GetWorkspace godoc
// @Summary Get workspace by id
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Success 200 {object} workspaceSchemas.Workspace
// @Router /workspaces/{id} [get]
func GetWorkspace(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")
		userID := c.GetString("userID")
		// membership check
		var role string
		err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, id, userID).Scan(&role)
		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusForbidden, gin.H{"message": "not a member"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		_ = role
		row := pool.QueryRow(c, workspaceQueries.Q.GetWorkspaceByID, id)
		var w workspaceSchemas.Workspace
		if err := row.Scan(&w.ID, &w.Name, &w.OwnerID, &w.CreatedAt); err != nil {
			c.JSON(http.StatusNotFound, gin.H{"message": "workspace not found"})
			return
		}
		c.JSON(http.StatusOK, w)
	}
}

// AddMember godoc
// @Summary Add member to workspace
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Param request body workspaceSchemas.AddMemberRequest true "Add member"
// @Success 201 {object} workspaceSchemas.WorkspaceMember
// @Router /workspaces/{id}/members [post]
func AddMember(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req workspaceSchemas.AddMemberRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload"})
			return
		}
		wsID := c.Param("id")
		// ensure actor has a role
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, c.GetString("userID")).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}
		row := pool.QueryRow(c, workspaceQueries.Q.AddWorkspaceMember, wsID, req.UserID, req.Role)
		var m workspaceSchemas.WorkspaceMember
		if err := row.Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.Role); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		c.JSON(http.StatusCreated, m)
	}
}

// ListMembers godoc
// @Summary List members in workspace
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Success 200 {array} workspaceSchemas.WorkspaceMember
// @Router /workspaces/{id}/members [get]
func ListMembers(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		wsID := c.Param("id")
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, c.GetString("userID")).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}
		rows, err := pool.Query(c, workspaceQueries.Q.ListWorkspaceMembers, wsID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()
		var list []workspaceSchemas.WorkspaceMember
		for rows.Next() {
			var m workspaceSchemas.WorkspaceMember
			if err := rows.Scan(&m.ID, &m.WorkspaceID, &m.UserID, &m.Role); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			list = append(list, m)
		}
		c.JSON(http.StatusOK, list)
	}
}
