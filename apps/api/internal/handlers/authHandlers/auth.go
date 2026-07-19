package authHandlers

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	errorhandler "github.com/synctex-org/backend/errorHandler"
	authservices "github.com/synctex-org/backend/internal/services/authServices"

	"github.com/synctex-org/backend/schemas/authSchemas"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

const (
	accessCookieName  = "token"
	refreshCookieName = "refresh_token"
	refreshCookiePath = "/api/auth"
	csrfCookiePath    = "/"
)

type sessionManager interface {
	Issue(context.Context, string, string, string) (authservices.RotatedSession, error)
	Rotate(context.Context, string, string, string) (authservices.RotatedSession, error)
	Revoke(context.Context, string) error
}

type accountManager interface {
	Register(context.Context, string, string, string) (authservices.AccountToken, error)
	IssueEmailVerification(
		context.Context,
		string,
	) (authservices.AccountToken, bool, error)
	IssuePasswordReset(
		context.Context,
		string,
	) (authservices.AccountToken, bool, error)
	VerifyEmail(context.Context, string) error
	ResetPassword(context.Context, string, string) error
}

type accountEmailSender interface {
	SendVerification(string, string) error
	SendPasswordReset(string, string) error
}

// Register godoc
// @Summary Register a new user
// @Description Register a new user with email, username and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.RegisterRequest true "User registration data"
// @Success 201 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /auth/register [post]
func Register(accounts accountManager, emails accountEmailSender) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request authSchemas.RegisterRequest

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid JSON payload"})
			return
		}

		// Validate password strength
		if err := authservices.ValidatePassword(request.Password); err != nil {
			var pwdErr *authservices.PasswordError
			if errors.As(err, &pwdErr) {
				c.JSON(http.StatusBadRequest, gin.H{"message": pwdErr.Message})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Error validating password"})
			return
		}

		ctx := c.Request.Context()
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to hash password"})
			return
		}

		verification, err := accounts.Register(
			ctx,
			request.Email,
			request.Username,
			string(hashedPassword),
		)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				combined := strings.ToLower(pgErr.ConstraintName + " " + pgErr.Detail)
				if strings.Contains(combined, "email") {
					c.JSON(http.StatusBadRequest, gin.H{"message": "account with this email already exists"})
					return
				}
				if strings.Contains(combined, "username") {
					c.JSON(http.StatusBadRequest, gin.H{"message": "username already taken"})
					return
				}
				c.JSON(http.StatusBadRequest, gin.H{"message": "account already exists"})
				return
			}

			log.Println("Error inserting user:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to register user. Please try again later"})
			return
		}

		if err := emails.SendVerification(verification.Email, verification.Token); err != nil {
			log.Printf("send registration verification email: %v", err)
			c.JSON(
				http.StatusServiceUnavailable,
				gin.H{
					"code":    "EMAIL_DELIVERY_FAILED",
					"message": "Account created, but the verification email could not be sent",
				},
			)
			return
		}

		c.JSON(
			http.StatusCreated,
			gin.H{"message": "Account created. Check your email to verify it."},
		)
	}

}

// Login godoc
// @Summary Login user
// @Description Login user with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.LoginRequest true "User login data"
// @Success 200 {object} authSchemas.SessionResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /auth/login [post]
func Login(pool *pgxpool.Pool, sessions sessionManager, secureCookies bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req authSchemas.LoginRequest
		if err := c.ShouldBindBodyWithJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Provide valid login payload"})
			return
		}

		ctx, cancel := context.WithTimeout(c.Request.Context(), 5*time.Second)
		defer cancel()

		user, err := authservices.GetUserByEmail(
			ctx,
			pool,
			strings.ToLower(strings.TrimSpace(req.Email)),
		)
		if err != nil {
			errorhandler.HandleUserRetrievalError(c, err)
			return
		}

		if !authservices.CheckPassword(user.HashedPassword, req.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}

		csrfToken, err := authservices.GenerateCSRFToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create session"})
			return
		}

		session, err := sessions.Issue(ctx, user.ID, c.Request.UserAgent(), c.ClientIP())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create session"})
			return
		}

		accessToken, err := authservices.GenerateAccessToken(
			user.ID,
			user.UserName,
			session.SessionID,
		)
		if err != nil {
			_ = sessions.Revoke(ctx, session.RefreshToken)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not create session"})
			return
		}

		setAuthCookies(c, accessToken, session.RefreshToken, csrfToken, secureCookies)

		c.JSON(http.StatusOK, authSchemas.SessionResponse{
			ExpiresIn: int(authservices.AccessTime.Seconds()),
		})
	}
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Refresh access token using refresh token
// @Tags auth
// @Produce json
// @Success 200 {object} authSchemas.SessionResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /auth/refresh [post]
func RefreshToken(sessions sessionManager, secureCookies bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		refreshToken, err := c.Cookie(refreshCookieName)
		if err != nil || refreshToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Missing refresh token"})
			return
		}

		csrfToken, err := authservices.GenerateCSRFToken()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not refresh session"})
			return
		}

		session, err := sessions.Rotate(
			c.Request.Context(),
			refreshToken,
			c.Request.UserAgent(),
			c.ClientIP(),
		)
		if err != nil {
			if errors.Is(err, authservices.ErrSessionCompromised) {
				clearAuthCookies(c, secureCookies)
				c.JSON(
					http.StatusUnauthorized,
					gin.H{
						"code":    "SESSION_COMPROMISED",
						"message": "Session revoked after refresh token reuse",
					},
				)
				return
			}
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid or expired refresh token"})
			return
		}

		accessToken, err := authservices.GenerateAccessToken(
			session.UserID,
			session.Username,
			session.SessionID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate access token"})
			return
		}

		setAuthCookies(c, accessToken, session.RefreshToken, csrfToken, secureCookies)

		c.JSON(http.StatusOK, authSchemas.SessionResponse{
			ExpiresIn: int(authservices.AccessTime.Seconds()),
		})
	}
}

// Logout godoc
// @Summary Logout user
// @Description Clear authentication cookie and logout user
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Router /auth/logout [post]
func Logout(sessions sessionManager, secureCookies bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		refreshToken, _ := c.Cookie(refreshCookieName)
		if err := sessions.Revoke(c.Request.Context(), refreshToken); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not revoke session"})
			return
		}

		clearAuthCookies(c, secureCookies)
		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}

func setAuthCookies(
	c *gin.Context,
	accessToken string,
	refreshToken string,
	csrfToken string,
	secure bool,
) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		accessCookieName,
		accessToken,
		int(authservices.AccessTime.Seconds()),
		"/",
		"",
		secure,
		true,
	)
	c.SetCookie(
		refreshCookieName,
		refreshToken,
		int(authservices.RefreshTime.Seconds()),
		refreshCookiePath,
		"",
		secure,
		true,
	)
	c.SetCookie(
		authservices.CSRFCookieName,
		csrfToken,
		int(authservices.RefreshTime.Seconds()),
		csrfCookiePath,
		"",
		secure,
		false,
	)
}

func clearAuthCookies(c *gin.Context, secure bool) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(accessCookieName, "", -1, "/", "", secure, true)
	c.SetCookie(refreshCookieName, "", -1, refreshCookiePath, "", secure, true)
	c.SetCookie(authservices.CSRFCookieName, "", -1, csrfCookiePath, "", secure, false)
}
