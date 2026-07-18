package workspaceHandlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/synctex-org/backend/internal/queries/workspaceQueries"
	"github.com/synctex-org/backend/internal/services/emailServices"
	"github.com/synctex-org/backend/schemas/workspaceSchemas"
)

// generateInvitationToken generates a secure random token for invitations
func generateInvitationToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// SendInvitation godoc
// @Summary Send workspace invitation to email
// @Tags workspaces
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Param request body workspaceSchemas.SendInvitationRequest true "Invitation details"
// @Success 201 {object} workspaceSchemas.WorkspaceInvitation
// @Router /workspaces/{id}/invitations [post]
func SendInvitation(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req workspaceSchemas.SendInvitationRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invalid payload"})
			return
		}

		wsID := c.Param("id")
		userID := c.GetString("userID")

		// Check if user has permission (must be a member)
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, userID).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized to send invitations"})
			return
		}

		// Check if user with this email already exists
		var existingUserID string
		err := pool.QueryRow(c, `SELECT id FROM users WHERE LOWER(email) = LOWER($1)`, req.Email).Scan(&existingUserID)
		if err == nil {
			// User exists, check if already a member
			var memberRole string
			memberErr := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, existingUserID).Scan(&memberRole)
			if memberErr == nil {
				c.JSON(http.StatusConflict, gin.H{"message": "user is already a member of this workspace"})
				return
			}
		}

		// Check if there's already a pending invitation
		var pendingCount int
		if err := pool.QueryRow(c, workspaceQueries.CheckPendingInvitation, wsID, req.Email).Scan(&pendingCount); err == nil && pendingCount > 0 {
			c.JSON(http.StatusConflict, gin.H{"message": "invitation already sent to this email"})
			return
		}

		// Generate invitation token
		token, err := generateInvitationToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to generate invitation token"})
			return
		}

		// Create invitation
		var invitation workspaceSchemas.WorkspaceInvitation
		err = pool.QueryRow(c, workspaceQueries.CreateInvitation,
			wsID, req.Email, req.Role, token, userID,
		).Scan(
			&invitation.ID,
			&invitation.WorkspaceID,
			&invitation.Email,
			&invitation.Role,
			&invitation.Token,
			&invitation.InvitedBy,
			&invitation.Status,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
		)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		// Get workspace name and inviter name for email
		var workspaceName, inviterUsername string
		err = pool.QueryRow(c, `
			SELECT w.name, u.username 
			FROM workspaces w, users u 
			WHERE w.id = $1 AND u.id = $2
		`, wsID, userID).Scan(&workspaceName, &inviterUsername)
		if err != nil {
			workspaceName = "a workspace"
			inviterUsername = "Someone"
		}

		// Send invitation email - this must succeed for invitation to be valid
		emailService := emailServices.NewEmailService()
		if !emailService.IsConfigured() {
			// Rollback: delete the invitation we just created
			pool.Exec(c, `DELETE FROM workspace_invitations WHERE id = $1`, invitation.ID)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "SMTP not configured - cannot send invitation emails"})
			return
		}

		// Determine the frontend URL
		frontendURL := os.Getenv("FRONTEND_ORIGIN")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000"
		}
		invitationURL := fmt.Sprintf("%s/invitations/accept?token=%s", frontendURL, token)

		emailData := emailServices.InvitationEmailData{
			InviterName:   inviterUsername,
			WorkspaceName: workspaceName,
			Role:          req.Role,
			InvitationURL: invitationURL,
			ExpiresIn:     "7 days",
		}

		// Send email synchronously - must succeed
		if err := emailService.SendInvitationEmail(req.Email, emailData); err != nil {
			// Rollback: delete the invitation we just created
			pool.Exec(c, `DELETE FROM workspace_invitations WHERE id = $1`, invitation.ID)
			c.JSON(http.StatusInternalServerError, gin.H{"message": fmt.Sprintf("Failed to send invitation email: %v", err)})
			return
		}

		fmt.Printf("Successfully sent invitation email to %s\n", req.Email)

		// Don't include token in response for security
		invitation.Token = ""
		c.JSON(http.StatusCreated, invitation)
	}
}

// ListInvitations godoc
// @Summary List all invitations for a workspace
// @Tags workspaces
// @Produce json
// @Security BearerAuth
// @Param id path string true "Workspace ID"
// @Success 200 {array} workspaceSchemas.WorkspaceInvitation
// @Router /workspaces/{id}/invitations [get]
func ListInvitations(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		wsID := c.Param("id")
		userID := c.GetString("userID")

		// Check if user has permission
		var role string
		if err := pool.QueryRow(c, workspaceQueries.Q.CheckUserWorkspaceRole, wsID, userID).Scan(&role); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"message": "not authorized"})
			return
		}

		rows, err := pool.Query(c, workspaceQueries.ListWorkspaceInvitations, wsID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()

		var invitations []workspaceSchemas.WorkspaceInvitation
		for rows.Next() {
			var inv workspaceSchemas.WorkspaceInvitation
			if err := rows.Scan(
				&inv.ID,
				&inv.WorkspaceID,
				&inv.Email,
				&inv.Role,
				&inv.InvitedBy,
				&inv.Status,
				&inv.CreatedAt,
				&inv.ExpiresAt,
				&inv.AcceptedAt,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			invitations = append(invitations, inv)
		}

		if invitations == nil {
			invitations = []workspaceSchemas.WorkspaceInvitation{}
		}

		c.JSON(http.StatusOK, invitations)
	}
}

// GetMyInvitations godoc
// @Summary Get all pending invitations for current user's email
// @Tags invitations
// @Produce json
// @Security BearerAuth
// @Success 200 {array} workspaceSchemas.WorkspaceInvitation
// @Router /invitations [get]
func GetMyInvitations(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID := c.GetString("userID")

		// Get user's email
		var email string
		if err := pool.QueryRow(c, `SELECT email FROM users WHERE id = $1`, userID).Scan(&email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to get user email"})
			return
		}

		rows, err := pool.Query(c, workspaceQueries.ListPendingInvitationsByEmail, email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}
		defer rows.Close()

		var invitations []workspaceSchemas.WorkspaceInvitation
		for rows.Next() {
			var inv workspaceSchemas.WorkspaceInvitation
			if err := rows.Scan(
				&inv.ID,
				&inv.WorkspaceID,
				&inv.Email,
				&inv.Role,
				&inv.Token,
				&inv.InvitedBy,
				&inv.Status,
				&inv.CreatedAt,
				&inv.ExpiresAt,
			); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
				return
			}
			invitations = append(invitations, inv)
		}

		if invitations == nil {
			invitations = []workspaceSchemas.WorkspaceInvitation{}
		}

		c.JSON(http.StatusOK, invitations)
	}
}

// AcceptInvitation godoc
// @Summary Accept workspace invitation by token
// @Tags invitations
// @Accept json
// @Produce json
// @Param token path string true "Invitation token"
// @Success 200 {object} workspaceSchemas.WorkspaceMember
// @Router /invitations/{token}/accept [post]
func AcceptInvitation(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		userID := c.GetString("userID")

		// Get invitation
		var invitation workspaceSchemas.WorkspaceInvitation
		err := pool.QueryRow(c, workspaceQueries.GetInvitationByToken, token).Scan(
			&invitation.ID,
			&invitation.WorkspaceID,
			&invitation.Email,
			&invitation.Role,
			&invitation.Token,
			&invitation.InvitedBy,
			&invitation.Status,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
			&invitation.AcceptedAt,
		)

		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"message": "invitation not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		// Check if invitation is still valid
		if invitation.Status != "pending" {
			c.JSON(http.StatusBadRequest, gin.H{"message": "invitation has already been " + invitation.Status})
			return
		}

		// Get user's email to verify
		var userEmail string
		if err := pool.QueryRow(c, `SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to verify user"})
			return
		}

		// Verify email matches (case-insensitive)
		if userEmail != invitation.Email {
			c.JSON(http.StatusForbidden, gin.H{"message": "invitation was sent to a different email address"})
			return
		}

		// Add user to workspace
		var member workspaceSchemas.WorkspaceMember
		err = pool.QueryRow(c, workspaceQueries.Q.AddWorkspaceMember,
			invitation.WorkspaceID, userID, invitation.Role,
		).Scan(&member.ID, &member.WorkspaceID, &member.UserID, &member.Role)

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to add member to workspace"})
			return
		}

		// Update invitation status
		_, err = pool.Exec(c, workspaceQueries.UpdateInvitationStatus, "accepted", invitation.ID)
		if err != nil {
			// Member is already added, so just log the error
			fmt.Printf("Warning: failed to update invitation status: %v\n", err)
		}

		c.JSON(http.StatusOK, member)
	}
}

// DeclineInvitation godoc
// @Summary Decline workspace invitation
// @Tags invitations
// @Param token path string true "Invitation token"
// @Success 200 {object} gin.H
// @Router /invitations/{token}/decline [post]
func DeclineInvitation(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.Param("token")
		userID := c.GetString("userID")

		// Get invitation
		var invitation workspaceSchemas.WorkspaceInvitation
		err := pool.QueryRow(c, workspaceQueries.GetInvitationByToken, token).Scan(
			&invitation.ID,
			&invitation.WorkspaceID,
			&invitation.Email,
			&invitation.Role,
			&invitation.Token,
			&invitation.InvitedBy,
			&invitation.Status,
			&invitation.CreatedAt,
			&invitation.ExpiresAt,
			&invitation.AcceptedAt,
		)

		if err != nil {
			if err == pgx.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"message": "invitation not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		// Verify user email matches invitation
		var userEmail string
		if err := pool.QueryRow(c, `SELECT email FROM users WHERE id = $1`, userID).Scan(&userEmail); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to verify user"})
			return
		}

		if userEmail != invitation.Email {
			c.JSON(http.StatusForbidden, gin.H{"message": "invitation was sent to a different email address"})
			return
		}

		// Update invitation status to declined
		_, err = pool.Exec(c, workspaceQueries.UpdateInvitationStatus, "declined", invitation.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "failed to decline invitation"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "invitation declined"})
	}
}

// CancelInvitation godoc
// @Summary Cancel a sent invitation (by inviter only)
// @Tags workspaces
// @Security BearerAuth
// @Param id path string true "Invitation ID"
// @Success 200 {object} gin.H
// @Router /invitations/{id} [delete]
func CancelInvitation(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		invitationID := c.Param("id")
		userID := c.GetString("userID")

		result, err := pool.Exec(c, workspaceQueries.DeleteInvitation, invitationID, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
			return
		}

		if result.RowsAffected() == 0 {
			c.JSON(http.StatusNotFound, gin.H{"message": "invitation not found or you don't have permission to cancel it"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "invitation cancelled"})
	}
}
