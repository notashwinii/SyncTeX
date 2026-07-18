package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/synctex-org/backend/internal/db"
)

type projectAccessStub struct {
	allowed bool
	err     error
	params  db.UserCanAccessProjectParams
}

func (stub *projectAccessStub) UserCanAccessProject(
	_ context.Context,
	params db.UserCanAccessProjectParams,
) (bool, error) {
	stub.params = params
	return stub.allowed, stub.err
}

func TestUserCanAccessProject(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name       string
		projectID  string
		userID     string
		allowed    bool
		queryErr   error
		wantResult bool
		wantStatus int
	}{
		{
			name:       "allows a project member",
			projectID:  "project-id",
			userID:     "user-id",
			allowed:    true,
			wantResult: true,
			wantStatus: http.StatusOK,
		},
		{
			name:       "rejects a non-member",
			projectID:  "project-id",
			userID:     "user-id",
			wantResult: false,
			wantStatus: http.StatusForbidden,
		},
		{
			name:       "rejects a missing project id",
			userID:     "user-id",
			wantResult: false,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "hides database errors",
			projectID:  "project-id",
			userID:     "user-id",
			queryErr:   errors.New("database unavailable"),
			wantResult: false,
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			context.Request = httptest.NewRequest(http.MethodGet, "/", nil)
			context.Set("userID", tt.userID)
			queries := &projectAccessStub{allowed: tt.allowed, err: tt.queryErr}

			got := userCanAccessProject(context, queries, tt.projectID)

			if got != tt.wantResult {
				t.Fatalf("userCanAccessProject() = %v, want %v", got, tt.wantResult)
			}
			if recorder.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", recorder.Code, tt.wantStatus)
			}
			if tt.projectID != "" {
				if queries.params.ProjectID != tt.projectID || queries.params.UserID != tt.userID {
					t.Fatalf("query params = %#v", queries.params)
				}
			}
		})
	}
}
