package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"testing"
	"time"

	"demo/internal/auth"
	"demo/internal/models"
	"demo/internal/repository"

	"github.com/gofiber/fiber/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testSecret = "test-secret"

// mockUserRepo is an in-memory UserRepository for tests.
type mockUserRepo struct {
	user      *models.User // matched by username; nil means not found
	getErr    error        // forces GetByUsername to fail (simulate DB error)
	updateErr error        // forces UpdateLoginState to fail
}

func (m *mockUserRepo) GetByUsername(_ context.Context, username string) (*models.User, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	if m.user == nil || m.user.Username != username {
		return nil, repository.ErrUserNotFound
	}
	// Return a copy so handler mutations go through UpdateLoginState.
	cp := *m.user
	return &cp, nil
}

func (m *mockUserRepo) UpdateLoginState(_ context.Context, userID, failedAttempts int, lockedUntil *time.Time) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	if m.user != nil && m.user.ID == userID {
		m.user.FailedLoginAttempts = failedAttempts
		m.user.AccountLockedUntil = lockedUntil
	}
	return nil
}

func newTestApp(repo repository.UserRepository) *fiber.App {
	app := fiber.New()
	h := NewLoginHandler(repo, testSecret)
	app.Post("/api/login", h.Login)
	return app
}

func doLogin(t *testing.T, app *fiber.App, body string) (*http.Response, map[string]any) {
	t.Helper()
	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, "/api/login", bytes.NewBufferString(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	resp, err := app.Test(req, fiber.TestConfig{Timeout: 5 * time.Second})
	require.NoError(t, err)

	data, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	_ = resp.Body.Close()

	var parsed map[string]any
	if len(data) > 0 {
		require.NoError(t, json.Unmarshal(data, &parsed))
	}
	return resp, parsed
}

func mustHash(t *testing.T, password string) string {
	t.Helper()
	hash, err := auth.HashPassword(password)
	require.NoError(t, err)
	return hash
}

// TC001: Valid login returns 200 and a valid JWT token.
func TestLogin_ValidCredentials(t *testing.T) {
	repo := &mockUserRepo{user: &models.User{
		ID:           1,
		Username:     "validUser",
		PasswordHash: mustHash(t, "validPassword"),
	}}
	app := newTestApp(repo)

	resp, body := doLogin(t, app, `{"username":"validUser","password":"validPassword"}`)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	token, ok := body["token"].(string)
	require.True(t, ok, "response should contain a token")
	require.NotEmpty(t, token)

	claims, err := auth.ParseToken(testSecret, token)
	require.NoError(t, err)
	assert.Equal(t, "validUser", claims.Username)
}

// TC002: Invalid credentials return 401.
func TestLogin_InvalidCredentials(t *testing.T) {
	repo := &mockUserRepo{user: &models.User{
		ID:           1,
		Username:     "validUser",
		PasswordHash: mustHash(t, "validPassword"),
	}}
	app := newTestApp(repo)

	// Wrong password.
	resp, body := doLogin(t, app, `{"username":"validUser","password":"wrongPassword"}`)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Equal(t, msgInvalidCreds, body["error"])

	// Unknown user.
	resp, body = doLogin(t, app, `{"username":"ghost","password":"whatever"}`)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Equal(t, msgInvalidCreds, body["error"])
}

// TC003: Missing fields return 400.
func TestLogin_MissingFields(t *testing.T) {
	app := newTestApp(&mockUserRepo{})

	cases := []string{
		`{"username":"validUser"}`,
		`{"password":"validPassword"}`,
		`{}`,
		`not-json`,
	}
	for _, body := range cases {
		resp, parsed := doLogin(t, app, body)
		assert.Equal(t, http.StatusBadRequest, resp.StatusCode, "body: %s", body)
		assert.Equal(t, msgMissingFields, parsed["error"], "body: %s", body)
	}
}

// TC004: Unexpected (DB) error returns 500.
func TestLogin_ServerError(t *testing.T) {
	repo := &mockUserRepo{getErr: errors.New("db is down")}
	app := newTestApp(repo)

	resp, body := doLogin(t, app, `{"username":"validUser","password":"validPassword"}`)
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
	assert.Equal(t, msgServerError, body["error"])
}

// TC005: Account locks after 3 failed login attempts.
func TestLogin_AccountLocksAfterThreeFailures(t *testing.T) {
	repo := &mockUserRepo{user: &models.User{
		ID:           1,
		Username:     "lockedUser",
		PasswordHash: mustHash(t, "correctPassword"),
	}}
	app := newTestApp(repo)

	// First two failures: invalid credentials.
	for i := 0; i < 2; i++ {
		resp, body := doLogin(t, app, `{"username":"lockedUser","password":"wrongPassword"}`)
		assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
		assert.Equal(t, msgInvalidCreds, body["error"])
	}

	// Third failure trips the lock.
	resp, body := doLogin(t, app, `{"username":"lockedUser","password":"wrongPassword"}`)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Equal(t, msgAccountLocked, body["error"])

	// Subsequent attempts stay locked, even with the correct password.
	resp, body = doLogin(t, app, `{"username":"lockedUser","password":"correctPassword"}`)
	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
	assert.Equal(t, msgAccountLocked, body["error"])
}
