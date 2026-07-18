package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
)

func TestAuthRequiredRejectsQueryToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authservices.Configure("auth-middleware-test-secret")
	token, err := authservices.GenerateAccessToken("user-id", "student", "session-id")
	if err != nil {
		t.Fatalf("GenerateAccessToken() error = %v", err)
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/?token="+token, nil)
	router := gin.New()
	router.Use(AuthRequired())
	router.GET("/", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
}
