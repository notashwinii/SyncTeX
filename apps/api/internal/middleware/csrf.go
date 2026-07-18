package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
)

const (
	authSourceKey    = "authSource"
	authSourceCookie = "cookie"
	authSourceBearer = "bearer"
)

func RequireCSRF() gin.HandlerFunc {
	return func(c *gin.Context) {
		if isSafeMethod(c.Request.Method) {
			c.Next()
			return
		}

		cookieToken, err := c.Cookie(authservices.CSRFCookieName)
		headerToken := c.GetHeader(authservices.CSRFHeaderName)
		if err != nil ||
			cookieToken == "" ||
			headerToken == "" ||
			subtle.ConstantTimeCompare([]byte(cookieToken), []byte(headerToken)) != 1 ||
			!authservices.ValidateCSRFToken(cookieToken) {
			c.AbortWithStatusJSON(
				http.StatusForbidden,
				gin.H{
					"code":    "CSRF_INVALID",
					"message": "Missing or invalid CSRF token",
				},
			)
			return
		}

		c.Next()
	}
}

func RequireCSRFForCookieAuth() gin.HandlerFunc {
	requireCSRF := RequireCSRF()
	return func(c *gin.Context) {
		if source, exists := c.Get(authSourceKey); exists && source == authSourceCookie {
			requireCSRF(c)
			return
		}
		c.Next()
	}
}

func isSafeMethod(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodOptions, http.MethodTrace:
		return true
	default:
		return false
	}
}
