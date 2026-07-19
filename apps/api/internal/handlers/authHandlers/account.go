package authHandlers

import (
	"errors"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
	"github.com/synctex-org/backend/schemas/authSchemas"
)

const accountEmailResponse = "If the account exists, an email has been sent."

// ResendVerification godoc
// @Summary Resend an email verification link
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.EmailRequest true "Account email"
// @Success 202 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 429 {object} map[string]string
// @Router /auth/verification/resend [post]
func ResendVerification(
	accounts accountManager,
	emails accountEmailSender,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request authSchemas.EmailRequest
		if err := c.ShouldBindBodyWithJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Provide a valid email address"})
			return
		}

		issued, found, err := accounts.IssueEmailVerification(
			c.Request.Context(),
			request.Email,
		)
		if err != nil {
			log.Printf("issue email verification: %v", err)
		} else if found {
			if err := emails.SendVerification(issued.Email, issued.Token); err != nil {
				log.Printf("send email verification: %v", err)
			}
		}

		c.JSON(http.StatusAccepted, gin.H{"message": accountEmailResponse})
	}
}

// ConfirmVerification godoc
// @Summary Confirm an email verification token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.TokenRequest true "Verification token"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /auth/verification/confirm [post]
func ConfirmVerification(accounts accountManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request authSchemas.TokenRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Missing verification token"})
			return
		}

		if err := accounts.VerifyEmail(c.Request.Context(), request.Token); err != nil {
			if errors.Is(err, authservices.ErrInvalidUserToken) {
				c.JSON(
					http.StatusBadRequest,
					gin.H{
						"code":    "INVALID_TOKEN",
						"message": "Verification link is invalid or expired",
					},
				)
				return
			}
			log.Printf("verify email: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not verify email"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Email verified"})
	}
}

// ForgotPassword godoc
// @Summary Request a password reset link
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.EmailRequest true "Account email"
// @Success 202 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 429 {object} map[string]string
// @Router /auth/password/forgot [post]
func ForgotPassword(
	accounts accountManager,
	emails accountEmailSender,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request authSchemas.EmailRequest
		if err := c.ShouldBindBodyWithJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Provide a valid email address"})
			return
		}

		issued, found, err := accounts.IssuePasswordReset(
			c.Request.Context(),
			request.Email,
		)
		if err != nil {
			log.Printf("issue password reset: %v", err)
		} else if found {
			if err := emails.SendPasswordReset(issued.Email, issued.Token); err != nil {
				log.Printf("send password reset: %v", err)
			}
		}

		c.JSON(http.StatusAccepted, gin.H{"message": accountEmailResponse})
	}
}

// ResetPassword godoc
// @Summary Reset a password using a one-time token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body authSchemas.PasswordResetRequest true "Reset token and new password"
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Router /auth/password/reset [post]
func ResetPassword(
	accounts accountManager,
	secureCookies bool,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request authSchemas.PasswordResetRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Provide a reset token and password"})
			return
		}

		if err := accounts.ResetPassword(
			c.Request.Context(),
			request.Token,
			request.Password,
		); err != nil {
			var passwordError *authservices.PasswordError
			if errors.As(err, &passwordError) {
				c.JSON(http.StatusBadRequest, gin.H{"message": passwordError.Message})
				return
			}
			if errors.Is(err, authservices.ErrInvalidUserToken) {
				c.JSON(
					http.StatusBadRequest,
					gin.H{
						"code":    "INVALID_TOKEN",
						"message": "Password reset link is invalid or expired",
					},
				)
				return
			}
			log.Printf("reset password: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Could not reset password"})
			return
		}

		clearAuthCookies(c, secureCookies)
		c.JSON(http.StatusOK, gin.H{"message": "Password reset. Sign in with your new password."})
	}
}
