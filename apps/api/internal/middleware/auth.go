package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
	"github.com/synctex-org/backend/schemas/authSchemas"
)

// AuthRequired validates JWT from the access cookie or Authorization: Bearer <token>.
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		if cookie, err := c.Cookie(authservices.AccessCookieName); err == nil && cookie != "" {
			tokenString = cookie
			c.Set(authSourceKey, authSourceCookie)
		} else {
			auth := c.GetHeader("Authorization")

			if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
				tokenString = strings.TrimSpace(auth[7:])
				c.Set(authSourceKey, authSourceBearer)
			}
		}
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "missing token"})
			return
		}

		claims := &authSchemas.Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return authservices.JwtKey, nil
		})
		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"message": "invalid token"})
			return
		}

		// Attach to context
		c.Set("userID", claims.UserID)
		c.Set("username", claims.Username)

		c.Next()
	}
}
