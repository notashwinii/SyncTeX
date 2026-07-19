package authSchemas

import "github.com/golang-jwt/jwt/v5"

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type EmailRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type TokenRequest struct {
	Token string `json:"token" binding:"required"`
}

type PasswordResetRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// for jwt
type Claims struct {
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	SessionID string `json:"session_id"`
	jwt.RegisteredClaims
}

type SessionResponse struct {
	ExpiresIn int `json:"expires_in"`
}
