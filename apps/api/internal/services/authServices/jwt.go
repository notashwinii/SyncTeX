package authservices

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/synctex-org/backend/schemas/authSchemas"
)

var (
	JwtKey      []byte
	RefreshKey  []byte
	AccessTime  = 30 * time.Minute
	RefreshTime = 30 * 24 * time.Hour
)

func Configure(jwtKey, refreshKey string) {
	JwtKey = []byte(jwtKey)
	RefreshKey = []byte(refreshKey)
}

func generateTokenID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func GenerateAccessToken(userID, username string) (string, error) {
	expirationTime := time.Now().Add(AccessTime)
	claims := &authSchemas.Claims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JwtKey)
}

func GenerateRefreshToken(userID, username string) (string, error) {
	expirationTime := time.Now().Add(RefreshTime)
	claims := &authSchemas.RefreshClaims{
		UserID:   userID,
		Username: username,
		TokenID:  generateTokenID(),
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(RefreshKey)
}

func ValidateRefreshToken(tokenStr string) (*authSchemas.RefreshClaims, error) {
	claims := &authSchemas.RefreshClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return RefreshKey, nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}
