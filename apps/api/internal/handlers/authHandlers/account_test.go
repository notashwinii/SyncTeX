package authHandlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	authservices "github.com/synctex-org/backend/internal/services/authServices"
)

type accountManagerStub struct {
	issuedVerification authservices.AccountToken
	issuedReset        authservices.AccountToken
	found              bool
	issueErr           error
	verifyErr          error
	resetErr           error
	resetToken         string
	resetPassword      string
}

func (stub *accountManagerStub) Register(
	context.Context,
	string,
	string,
	string,
) (authservices.AccountToken, error) {
	return authservices.AccountToken{}, nil
}

func (stub *accountManagerStub) IssueEmailVerification(
	context.Context,
	string,
) (authservices.AccountToken, bool, error) {
	return stub.issuedVerification, stub.found, stub.issueErr
}

func (stub *accountManagerStub) IssuePasswordReset(
	context.Context,
	string,
) (authservices.AccountToken, bool, error) {
	return stub.issuedReset, stub.found, stub.issueErr
}

func (stub *accountManagerStub) VerifyEmail(context.Context, string) error {
	return stub.verifyErr
}

func (stub *accountManagerStub) ResetPassword(
	_ context.Context,
	token string,
	password string,
) error {
	stub.resetToken = token
	stub.resetPassword = password
	return stub.resetErr
}

type accountEmailSenderStub struct {
	verificationCalls int
	resetCalls        int
}

func (stub *accountEmailSenderStub) SendVerification(string, string) error {
	stub.verificationCalls++
	return nil
}

func (stub *accountEmailSenderStub) SendPasswordReset(string, string) error {
	stub.resetCalls++
	return nil
}

func TestForgotPasswordUsesUniformResponse(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name     string
		accounts *accountManagerStub
	}{
		{
			name:     "unknown account",
			accounts: &accountManagerStub{},
		},
		{
			name: "database error",
			accounts: &accountManagerStub{
				issueErr: errors.New("database unavailable"),
			},
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(recorder)
			context.Request = httptest.NewRequest(
				http.MethodPost,
				"/",
				strings.NewReader(`{"email":"student@example.com"}`),
			)
			context.Request.Header.Set("Content-Type", "application/json")

			ForgotPassword(test.accounts, &accountEmailSenderStub{})(context)

			if recorder.Code != http.StatusAccepted {
				t.Fatalf("status = %d, want %d", recorder.Code, http.StatusAccepted)
			}
			if !strings.Contains(recorder.Body.String(), accountEmailResponse) {
				t.Fatalf("body = %s, want uniform response", recorder.Body.String())
			}
		})
	}
}

func TestConfirmVerificationRejectsInvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(`{"token":"invalid"}`),
	)
	context.Request.Header.Set("Content-Type", "application/json")

	ConfirmVerification(&accountManagerStub{
		verifyErr: authservices.ErrInvalidUserToken,
	})(context)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusBadRequest)
	}
	if !strings.Contains(recorder.Body.String(), "INVALID_TOKEN") {
		t.Fatalf("body = %s, want INVALID_TOKEN", recorder.Body.String())
	}
}

func TestResetPasswordClearsAuthenticationCookies(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(
		http.MethodPost,
		"/",
		strings.NewReader(
			`{"token":"reset-token","password":"Correct-Horse-Battery-Staple-2026!"}`,
		),
	)
	context.Request.Header.Set("Content-Type", "application/json")
	accounts := &accountManagerStub{}

	ResetPassword(accounts, true)(context)

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusOK)
	}
	if accounts.resetToken != "reset-token" {
		t.Fatalf("reset token = %q, want reset-token", accounts.resetToken)
	}
	if len(recorder.Result().Cookies()) != 3 {
		t.Fatalf("cleared cookie count = %d, want 3", len(recorder.Result().Cookies()))
	}
}
