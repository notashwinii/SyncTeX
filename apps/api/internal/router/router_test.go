package router

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

type healthChecker struct {
	err error
}

func (checker healthChecker) Ping(context.Context) error {
	return checker.err
}

func TestLivenessHandler(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	context, _ := gin.CreateTestContext(recorder)
	context.Request = request

	livenessHandler()(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
}

func TestReadinessHandler(t *testing.T) {
	tests := []struct {
		name       string
		database   healthChecker
		wantStatus int
	}{
		{
			name:       "ready",
			database:   healthChecker{},
			wantStatus: http.StatusOK,
		},
		{
			name:       "database unavailable",
			database:   healthChecker{err: errors.New("connection refused")},
			wantStatus: http.StatusServiceUnavailable,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
			context, _ := gin.CreateTestContext(recorder)
			context.Request = request

			readinessHandler(test.database)(context)

			if recorder.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, test.wantStatus)
			}
		})
	}
}
