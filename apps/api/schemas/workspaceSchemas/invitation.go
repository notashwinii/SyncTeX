package workspaceSchemas

import "time"

type WorkspaceInvitation struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspace_id"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Token       string     `json:"token,omitempty"`
	InvitedBy   string     `json:"invited_by"`
	Status      string     `json:"status"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	AcceptedAt  *time.Time `json:"accepted_at,omitempty"`
}

type SendInvitationRequest struct {
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required"`
}

type AcceptInvitationRequest struct {
	Token string `json:"token" binding:"required"`
}

type InvitationListResponse struct {
	Invitations []WorkspaceInvitation `json:"invitations"`
}
