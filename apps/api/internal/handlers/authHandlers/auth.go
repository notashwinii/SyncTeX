package authHandlers

import (
	"context"
	"errors"

	"log"
	"net/http"
	"strings"
	"time"

	errorhandler "github.com/synctex-org/backend/errorHandler"
	"github.com/synctex-org/backend/internal/queries/authQueries"
	authservices "github.com/synctex-org/backend/internal/services/authServices"

	"github.com/synctex-org/backend/schemas/authSchemas"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

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
func Register(pool *pgxpool.Pool) gin.HandlerFunc {
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

		_, err = pool.Exec(ctx, authQueries.Query.Register, request.Email, request.Username, string(hashedPassword))
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

		c.JSON(http.StatusCreated, gin.H{"message": "User " + request.Username + " registered successfully"})
	}

}

// Login godoc
// @Summary Login user
// @Description Login user with email and password
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.LoginRequest true "User login data"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /auth/login [post]
func Login(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req authSchemas.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Provide valid login payload"})
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		user, err := authservices.GetUserByEmail(ctx, pool, req.Email)
		if err != nil {
			errorhandler.HandleUserRetrievalError(c, err)
			return
		}

		if !authservices.CheckPassword(user.HashedPassword, req.Password) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
			return
		}

		accessToken, err := authservices.GenerateAccessToken(user.ID, user.UserName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate access token"})
			return
		}

		refreshToken, err := authservices.GenerateRefreshToken(user.ID, user.UserName)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate refresh token"})
			return
		}

		c.SetCookie(
			"token",
			accessToken,
			int(authservices.AccessTime.Seconds()),
			"/",
			"",
			true,
			true,
		)

		c.SetCookie(
			"refresh_token",
			refreshToken,
			int(authservices.RefreshTime.Seconds()),
			"/",
			"",
			true,
			true,
		)

		c.JSON(http.StatusOK, authSchemas.TokenResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			TokenType:    "Bearer",
			ExpiresIn:    int(authservices.AccessTime.Seconds()),
		})
	}
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Refresh access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.RefreshRequest true "Refresh token data"
// @Success 200 {object} authSchemas.TokenResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /auth/refresh [post]
func RefreshToken(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to obtain refresh token from cookie first (preferred, httpOnly)
		refreshToken, err := c.Cookie("refresh_token")

		// If cookie not present, allow a JSON body fallback (useful for clients that
		// store refresh tokens in storage and post them explicitly).
		if err != nil || refreshToken == "" {
			var req authSchemas.RefreshRequest
			if bindErr := c.ShouldBindJSON(&req); bindErr != nil || req.RefreshToken == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Missing refresh token"})
				return
			}
			refreshToken = req.RefreshToken
		}

		claims, err := authservices.ValidateRefreshToken(refreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid or expired refresh token"})
			return
		}

		accessToken, err := authservices.GenerateAccessToken(claims.UserID, claims.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not generate access token"})
			return
		}

		c.SetCookie(
			"token",
			accessToken,
			int(authservices.AccessTime.Seconds()),
			"/",
			"",
			true,
			true,
		)

		c.JSON(http.StatusOK, authSchemas.TokenResponse{
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			TokenType:    "Bearer",
			ExpiresIn:    int(authservices.AccessTime.Seconds()),
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
func Logout() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.SetCookie(
			"token",
			"",
			-1,
			"/",
			"",
			true,
			true,
		)

		c.SetCookie(
			"refresh_token",
			"",
			-1,
			"/",
			"",
			true,
			true,
		)

		c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
	}
}
