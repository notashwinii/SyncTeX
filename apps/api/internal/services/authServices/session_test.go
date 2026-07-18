package authservices

import (
	"context"
	"crypto/sha256"
	"errors"
	"testing"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/synctex-org/backend/internal/db"
)

type sessionStoreStub struct {
	createParams db.CreateAuthSessionParams
	createResult db.CreateAuthSessionRow
	queries      *sessionQueriesStub
	revokeParams db.RevokeAuthSessionFamilyByTokenHashParams
}

func (store *sessionStoreStub) CreateAuthSession(
	_ context.Context,
	params db.CreateAuthSessionParams,
) (db.CreateAuthSessionRow, error) {
	store.createParams = params
	return store.createResult, nil
}

func (store *sessionStoreStub) InTransaction(
	_ context.Context,
	run func(sessionQueries) error,
) error {
	return run(store.queries)
}

func (store *sessionStoreStub) RevokeAuthSessionFamilyByTokenHash(
	_ context.Context,
	params db.RevokeAuthSessionFamilyByTokenHashParams,
) error {
	store.revokeParams = params
	return nil
}

type sessionQueriesStub struct {
	current          db.GetAuthSessionByTokenHashForUpdateRow
	getErr           error
	consumeRows      int64
	graceRows        int64
	consumeParams    db.ConsumeAuthSessionParams
	graceParams      db.ClaimAuthSessionGraceReuseParams
	rotateParams     db.CreateRotatedAuthSessionParams
	revokeParams     db.RevokeAuthSessionFamilyParams
	rotatedSessionID string
}

func (queries *sessionQueriesStub) GetAuthSessionByTokenHashForUpdate(
	_ context.Context,
	_ []byte,
) (db.GetAuthSessionByTokenHashForUpdateRow, error) {
	return queries.current, queries.getErr
}

func (queries *sessionQueriesStub) ConsumeAuthSession(
	_ context.Context,
	params db.ConsumeAuthSessionParams,
) (int64, error) {
	queries.consumeParams = params
	return queries.consumeRows, nil
}

func (queries *sessionQueriesStub) ClaimAuthSessionGraceReuse(
	_ context.Context,
	params db.ClaimAuthSessionGraceReuseParams,
) (int64, error) {
	queries.graceParams = params
	return queries.graceRows, nil
}

func (queries *sessionQueriesStub) CreateRotatedAuthSession(
	_ context.Context,
	params db.CreateRotatedAuthSessionParams,
) (string, error) {
	queries.rotateParams = params
	return queries.rotatedSessionID, nil
}

func (queries *sessionQueriesStub) RevokeAuthSessionFamily(
	_ context.Context,
	params db.RevokeAuthSessionFamilyParams,
) error {
	queries.revokeParams = params
	return nil
}

func TestSessionManagerIssueStoresOnlyTokenHash(t *testing.T) {
	now := time.Date(2026, time.July, 18, 12, 0, 0, 0, time.UTC)
	store := &sessionStoreStub{
		createResult: db.CreateAuthSessionRow{
			ID:       "session-id",
			FamilyID: "family-id",
		},
	}
	manager := newSessionManager(store)
	manager.now = func() time.Time { return now }
	manager.tokenSource = func() (string, error) { return "opaque-refresh-token", nil }

	session, err := manager.Issue(
		context.Background(),
		"user-id",
		"test-agent",
		"127.0.0.1",
	)
	if err != nil {
		t.Fatalf("Issue() error = %v", err)
	}

	wantHash := sha256.Sum256([]byte(session.RefreshToken))
	if string(store.createParams.TokenHash) != string(wantHash[:]) {
		t.Fatal("Issue() did not store the refresh token hash")
	}
	if string(store.createParams.TokenHash) == session.RefreshToken {
		t.Fatal("Issue() stored the raw refresh token")
	}
	if session.SessionID != "session-id" {
		t.Fatalf("SessionID = %q, want session-id", session.SessionID)
	}
	if got := store.createParams.ExpiresAt.Time; !got.Equal(now.Add(RefreshTime)) {
		t.Fatalf("ExpiresAt = %v, want %v", got, now.Add(RefreshTime))
	}
}

func TestSessionManagerRotateConsumesCurrentToken(t *testing.T) {
	now := time.Date(2026, time.July, 18, 12, 0, 0, 0, time.UTC)
	queries := &sessionQueriesStub{
		current: db.GetAuthSessionByTokenHashForUpdateRow{
			ID:        "current-id",
			FamilyID:  "family-id",
			UserID:    "user-id",
			Username:  "student",
			ExpiresAt: validTimestamp(now.Add(time.Hour)),
		},
		consumeRows:      1,
		rotatedSessionID: "rotated-id",
	}
	manager := testSessionManager(now, queries)

	session, err := manager.Rotate(
		context.Background(),
		"current-token",
		"test-agent",
		"127.0.0.1",
	)
	if err != nil {
		t.Fatalf("Rotate() error = %v", err)
	}

	if queries.consumeParams.ID != "current-id" {
		t.Fatalf("consumed session = %q, want current-id", queries.consumeParams.ID)
	}
	if queries.rotateParams.ParentID != "current-id" {
		t.Fatalf("rotated parent = %q, want current-id", queries.rotateParams.ParentID)
	}
	if session.SessionID != "rotated-id" || session.RefreshToken != "next-token" {
		t.Fatalf("Rotate() session = %#v", session)
	}
}

func TestSessionManagerRotateAllowsOneGraceReuse(t *testing.T) {
	now := time.Date(2026, time.July, 18, 12, 0, 0, 0, time.UTC)
	queries := &sessionQueriesStub{
		current: db.GetAuthSessionByTokenHashForUpdateRow{
			ID:             "current-id",
			FamilyID:       "family-id",
			UserID:         "user-id",
			Username:       "student",
			ConsumedAt:     validTimestamp(now.Add(-time.Second)),
			GraceExpiresAt: validTimestamp(now.Add(time.Second)),
			ExpiresAt:      validTimestamp(now.Add(time.Hour)),
		},
		graceRows:        1,
		rotatedSessionID: "grace-id",
	}
	manager := testSessionManager(now, queries)

	session, err := manager.Rotate(
		context.Background(),
		"current-token",
		"test-agent",
		"127.0.0.1",
	)
	if err != nil {
		t.Fatalf("Rotate() error = %v", err)
	}
	if queries.graceParams.ID != "current-id" {
		t.Fatalf("grace session = %q, want current-id", queries.graceParams.ID)
	}
	if session.SessionID != "grace-id" {
		t.Fatalf("SessionID = %q, want grace-id", session.SessionID)
	}
}

func TestSessionManagerRotateRevokesFamilyOnReplay(t *testing.T) {
	now := time.Date(2026, time.July, 18, 12, 0, 0, 0, time.UTC)
	queries := &sessionQueriesStub{
		current: db.GetAuthSessionByTokenHashForUpdateRow{
			ID:             "current-id",
			FamilyID:       "family-id",
			UserID:         "user-id",
			Username:       "student",
			ConsumedAt:     validTimestamp(now.Add(-time.Minute)),
			GraceExpiresAt: validTimestamp(now.Add(-time.Second)),
			ExpiresAt:      validTimestamp(now.Add(time.Hour)),
		},
	}
	manager := testSessionManager(now, queries)

	_, err := manager.Rotate(
		context.Background(),
		"replayed-token",
		"test-agent",
		"127.0.0.1",
	)
	if !errors.Is(err, ErrSessionCompromised) {
		t.Fatalf("Rotate() error = %v, want ErrSessionCompromised", err)
	}
	if queries.revokeParams.FamilyID != "family-id" {
		t.Fatalf("revoked family = %q, want family-id", queries.revokeParams.FamilyID)
	}
	if queries.rotateParams.FamilyID != "" {
		t.Fatal("Rotate() created a session after replay detection")
	}
}

func TestSessionManagerRotateRejectsUnknownToken(t *testing.T) {
	now := time.Date(2026, time.July, 18, 12, 0, 0, 0, time.UTC)
	queries := &sessionQueriesStub{getErr: pgx.ErrNoRows}
	manager := testSessionManager(now, queries)

	_, err := manager.Rotate(
		context.Background(),
		"unknown-token",
		"test-agent",
		"127.0.0.1",
	)
	if !errors.Is(err, ErrInvalidRefreshToken) {
		t.Fatalf("Rotate() error = %v, want ErrInvalidRefreshToken", err)
	}
}

func testSessionManager(now time.Time, queries *sessionQueriesStub) *SessionManager {
	manager := newSessionManager(&sessionStoreStub{queries: queries})
	manager.now = func() time.Time { return now }
	manager.tokenSource = func() (string, error) { return "next-token", nil }
	return manager
}

func validTimestamp(value time.Time) pgtype.Timestamptz {
	return pgtype.Timestamptz{Time: value, Valid: true}
}
