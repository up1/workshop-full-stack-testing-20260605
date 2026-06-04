package handler

import (
	"context"
	"database/sql"
	"net/http"
	"testing"
	"time"

	"demo/internal/auth"
	"demo/internal/repository"

	"github.com/gofiber/fiber/v3"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const schemaDDL = `
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  failed_login_attempts INT DEFAULT 0,
  account_locked_until TIMESTAMP
);`

// startPostgres launches a throwaway PostgreSQL container and returns an open
// *sql.DB connected to it. The container and connection are cleaned up via t.Cleanup.
func startPostgres(t *testing.T) *sql.DB {
	t.Helper()
	ctx := context.Background()

	container, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("mydatabase"),
		postgres.WithUsername("myuser"),
		postgres.WithPassword("mypassword"),
		testcontainers.WithWaitStrategy(
			wait.ForListeningPort("5432/tcp").WithStartupTimeout(60*time.Second),
		),
	)
	require.NoError(t, err)
	t.Cleanup(func() {
		_ = testcontainers.TerminateContainer(container)
	})

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	db, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	require.Eventually(t, func() bool {
		return db.PingContext(ctx) == nil
	}, 30*time.Second, time.Second, "database did not become ready")

	_, err = db.ExecContext(ctx, schemaDDL)
	require.NoError(t, err)

	return db
}

// TC001 (integration): valid login against a real PostgreSQL database
// running in a testcontainer returns 200 OK and a valid JWT.
func TestLogin_ValidCredentials_Integration(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping integration test in short mode")
	}

	db := startPostgres(t)
	ctx := context.Background()

	// Seed a user with a real bcrypt hash of "validPassword".
	hash, err := auth.HashPassword("validPassword")
	require.NoError(t, err)
	_, err = db.ExecContext(ctx,
		`INSERT INTO users (username, password_hash) VALUES ($1, $2)`,
		"validUser", hash,
	)
	require.NoError(t, err)

	// Wire the handler with the real Postgres-backed repository.
	repo := repository.NewPostgresUserRepository(db)
	app := fiber.New()
	h := NewLoginHandler(repo, testSecret)
	app.Post("/api/login", h.Login)

	resp, body := doLogin(t, app, `{"username":"validUser","password":"validPassword"}`)

	assert.Equal(t, http.StatusOK, resp.StatusCode)
	token, ok := body["token"].(string)
	require.True(t, ok, "response should contain a token")
	require.NotEmpty(t, token)

	claims, err := auth.ParseToken(testSecret, token)
	require.NoError(t, err)
	assert.Equal(t, "validUser", claims.Username)
}
