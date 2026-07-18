package authservices

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/synctex-org/backend/schemas/authSchemas"
)

var (
	JwtKey      []byte
	AccessTime  = 10 * time.Minute
	RefreshTime = 30 * 24 * time.Hour
)

func Configure(jwtKey string) {
	JwtKey = []byte(jwtKey)
}

func GenerateAccessToken(userID, username, sessionID string) (string, error) {
	now := time.Now()
	expirationTime := now.Add(AccessTime)
	claims := &authSchemas.Claims{
		UserID:    userID,
		Username:  username,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(now),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtKey)
}
