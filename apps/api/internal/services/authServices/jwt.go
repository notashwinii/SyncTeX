package authservices

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
	"github.com/synctex-org/backend/schemas/authSchemas"
)

var (
	JwtKey      []byte
	RefreshKey  []byte
	AccessTime  time.Duration
	RefreshTime time.Duration
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}
	secret := os.Getenv("JWT_KEY")
	refreshSecret := os.Getenv("REFRESH_KEY")
	if secret == "" || refreshSecret == "" {
		log.Fatal("JWT_KEY or REFRESH_KEY environment variable not set")
	}
	JwtKey = []byte(secret)
	RefreshKey = []byte(refreshSecret)
	AccessTime = 30 * time.Minute
	RefreshTime = 30 * 24 * time.Hour
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
