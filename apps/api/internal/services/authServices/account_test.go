package authservices

import (
	"context"
	"crypto/sha256"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/synctex-org/backend/internal/db"
	"golang.org/x/crypto/bcrypt"
)

type accountStoreStub struct {
	userID  string
	getErr  error
	queries *accountQueriesStub
}

func (store *accountStoreStub) GetUserIDByEmail(
	_ context.Context,
	_ string,
) (string, error) {
	return store.userID, store.getErr
}

func (store *accountStoreStub) InTransaction(
	_ context.Context,
	run func(accountQueries) error,
) error {
	return run(store.queries)
}

type accountQueriesStub struct {
	createdUserID     string
	createUserParams  db.CreateUserParams
	createTokenParams db.CreateUserTokenParams
	invalidateParams  db.InvalidateUserTokensParams
	token             db.GetUserTokenForUpdateRow
	tokenErr          error
	verifiedParams    db.MarkUserEmailVerifiedParams
	usedParams        db.MarkUserTokenUsedParams
	passwordParams    db.UpdateUserPasswordParams
	revokeParams      db.RevokeUserAuthSessionsParams
}

func (queries *accountQueriesStub) CreateUser(
	_ context.Context,
	params db.CreateUserParams,
) (string, error) {
	queries.createUserParams = params
	return queries.createdUserID, nil
}

func (queries *accountQueriesStub) CreateUserToken(
	_ context.Context,
	params db.CreateUserTokenParams,
) error {
	queries.createTokenParams = params
	return nil
}

func (queries *accountQueriesStub) GetUserTokenForUpdate(
	_ context.Context,
	_ db.GetUserTokenForUpdateParams,
) (db.GetUserTokenForUpdateRow, error) {
	return queries.token, queries.tokenErr
}

func (queries *accountQueriesStub) InvalidateUserTokens(
	_ context.Context,
	params db.InvalidateUserTokensParams,
) error {
	queries.invalidateParams = params
	return nil
}

func (queries *accountQueriesStub) MarkUserEmailVerified(
	_ context.Context,
	params db.MarkUserEmailVerifiedParams,
) error {
	queries.verifiedParams = params
	return nil
}

func (queries *accountQueriesStub) MarkUserTokenUsed(
	_ context.Context,
	params db.MarkUserTokenUsedParams,
) error {
	queries.usedParams = params
	return nil
}

func (queries *accountQueriesStub) RevokeUserAuthSessions(
	_ context.Context,
	params db.RevokeUserAuthSessionsParams,
) error {
	queries.revokeParams = params
	return nil
}

func (queries *accountQueriesStub) UpdateUserPassword(
	_ context.Context,
	params db.UpdateUserPasswordParams,
) error {
	queries.passwordParams = params
	return nil
}

func TestAccountManagerRegisterCreatesHashedVerificationToken(t *testing.T) {
	now := time.Date(2026, time.July, 19, 6, 0, 0, 0, time.UTC)
	queries := &accountQueriesStub{createdUserID: "user-id"}
	manager := testAccountManager(now, &accountStoreStub{queries: queries})

	issued, err := manager.Register(
		context.Background(),
		" Student@Example.COM ",
		" student ",
		"password-hash",
	)
	if err != nil {
		t.Fatalf("Register() error = %v", err)
	}

	if queries.createUserParams.Email != "student@example.com" ||
		queries.createUserParams.Username != "student" {
		t.Fatalf("CreateUser params = %#v", queries.createUserParams)
	}
	wantHash := sha256.Sum256([]byte(issued.Token))
	if string(queries.createTokenParams.TokenHash) != string(wantHash[:]) {
		t.Fatal("Register() did not store the verification token hash")
	}
	if queries.createTokenParams.Purpose != db.UserTokenPurposeVerifyEmail {
		t.Fatalf("purpose = %q, want verify_email", queries.createTokenParams.Purpose)
	}
	if !queries.createTokenParams.ExpiresAt.Time.Equal(now.Add(VerificationTokenTTL)) {
		t.Fatalf("expiry = %v", queries.createTokenParams.ExpiresAt.Time)
	}
}

func TestAccountManagerIssuePasswordResetHidesUnknownEmail(t *testing.T) {
	manager := newAccountManager(&accountStoreStub{getErr: pgx.ErrNoRows})

	issued, found, err := manager.IssuePasswordReset(
		context.Background(),
		"unknown@example.com",
	)
	if err != nil {
		t.Fatalf("IssuePasswordReset() error = %v", err)
	}
	if found || issued.Token != "" {
		t.Fatalf("IssuePasswordReset() = %#v, %v, want no token", issued, found)
	}
}

func TestAccountManagerVerifyEmailRejectsExpiredToken(t *testing.T) {
	now := time.Date(2026, time.July, 19, 6, 0, 0, 0, time.UTC)
	queries := &accountQueriesStub{
		token: db.GetUserTokenForUpdateRow{
			ID:        "token-id",
			UserID:    "user-id",
			ExpiresAt: validTimestamp(now.Add(-time.Second)),
		},
	}
	manager := testAccountManager(now, &accountStoreStub{queries: queries})

	err := manager.VerifyEmail(context.Background(), "expired-token")
	if !errors.Is(err, ErrInvalidUserToken) {
		t.Fatalf("VerifyEmail() error = %v, want ErrInvalidUserToken", err)
	}
	if queries.verifiedParams.UserID != "" || queries.usedParams.ID != "" {
		t.Fatal("VerifyEmail() modified an expired token")
	}
}

func TestAccountManagerResetPasswordRevokesSessions(t *testing.T) {
	now := time.Date(2026, time.July, 19, 6, 0, 0, 0, time.UTC)
	queries := &accountQueriesStub{
		token: db.GetUserTokenForUpdateRow{
			ID:        "token-id",
			UserID:    "user-id",
			ExpiresAt: validTimestamp(now.Add(time.Minute)),
		},
	}
	manager := testAccountManager(now, &accountStoreStub{queries: queries})
	password := "Correct-Horse-Battery-Staple-2026!"

	if err := manager.ResetPassword(context.Background(), "reset-token", password); err != nil {
		t.Fatalf("ResetPassword() error = %v", err)
	}
	if err := bcrypt.CompareHashAndPassword(
		[]byte(queries.passwordParams.HashedPassword),
		[]byte(password),
	); err != nil {
		t.Fatal("ResetPassword() did not store the new password hash")
	}
	if queries.revokeParams.UserID != "user-id" {
		t.Fatalf("revoked user = %q, want user-id", queries.revokeParams.UserID)
	}
	if queries.usedParams.ID != "token-id" {
		t.Fatalf("used token = %q, want token-id", queries.usedParams.ID)
	}
}

func testAccountManager(
	now time.Time,
	store accountStore,
) *AccountManager {
	manager := newAccountManager(store)
	manager.now = func() time.Time { return now }
	manager.tokenSource = func() (string, error) { return "opaque-user-token", nil }
	return manager
}
