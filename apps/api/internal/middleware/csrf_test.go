package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
)

func TestRequireCSRF(t *testing.T) {
	gin.SetMode(gin.TestMode)
	authservices.Configure("csrf-middleware-test-secret")
	validToken, err := authservices.GenerateCSRFToken()
	if err != nil {
		t.Fatalf("GenerateCSRFToken() error = %v", err)
	}

	tests := []struct {
		name       string
		method     string
		cookie     string
		header     string
		wantStatus int
	}{
		{
			name:       "safe method",
			method:     http.MethodGet,
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "valid token",
			method:     http.MethodPost,
			cookie:     validToken,
			header:     validToken,
			wantStatus: http.StatusNoContent,
		},
		{
			name:       "missing header",
			method:     http.MethodPost,
			cookie:     validToken,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "mismatched token",
			method:     http.MethodPost,
			cookie:     validToken,
			header:     validToken + "x",
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "invalid signature",
			method:     http.MethodPost,
			cookie:     "payload.signature",
			header:     "payload.signature",
			wantStatus: http.StatusForbidden,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(test.method, "/", nil)
			if test.cookie != "" {
				request.AddCookie(&http.Cookie{
					Name:  authservices.CSRFCookieName,
					Value: test.cookie,
				})
			}
			if test.header != "" {
				request.Header.Set(authservices.CSRFHeaderName, test.header)
			}

			router := gin.New()
			router.Use(RequireCSRF())
			router.Any("/", func(c *gin.Context) { c.Status(http.StatusNoContent) })
			router.ServeHTTP(recorder, request)

			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
		})
	}
}

func TestRequireCSRFForCookieAuthSkipsBearer(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/", nil)
	router := gin.New()
	router.Use(
		func(c *gin.Context) {
			c.Set(authSourceKey, authSourceBearer)
			c.Next()
		},
		RequireCSRFForCookieAuth(),
	)
	router.POST("/", func(c *gin.Context) { c.Status(http.StatusNoContent) })
	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
}
