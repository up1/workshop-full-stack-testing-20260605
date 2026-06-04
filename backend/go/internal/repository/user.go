package repository

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"demo/internal/models"
)

// ErrUserNotFound is returned when no user matches the given username.
var ErrUserNotFound = errors.New("user not found")

// UserRepository abstracts persistence for user accounts so the login
// handler can be tested without a real database.
type UserRepository interface {
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	UpdateLoginState(ctx context.Context, userID, failedAttempts int, lockedUntil *time.Time) error
}

// PostgresUserRepository is the Postgres-backed implementation.
type PostgresUserRepository struct {
	db *sql.DB
}

// NewPostgresUserRepository creates a repository backed by the given DB.
func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

// GetByUsername loads a user by username, returning ErrUserNotFound if absent.
func (r *PostgresUserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	const query = `
		SELECT id, username, password_hash, failed_login_attempts, account_locked_until
		FROM users
		WHERE username = $1`

	var user models.User
	var lockedUntil sql.NullTime
	err := r.db.QueryRowContext(ctx, query, username).Scan(
		&user.ID,
		&user.Username,
		&user.PasswordHash,
		&user.FailedLoginAttempts,
		&lockedUntil,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}
	if lockedUntil.Valid {
		user.AccountLockedUntil = &lockedUntil.Time
	}
	return &user, nil
}

// UpdateLoginState persists the failed-attempt counter and lock timestamp.
func (r *PostgresUserRepository) UpdateLoginState(ctx context.Context, userID, failedAttempts int, lockedUntil *time.Time) error {
	const query = `
		UPDATE users
		SET failed_login_attempts = $1, account_locked_until = $2
		WHERE id = $3`

	_, err := r.db.ExecContext(ctx, query, failedAttempts, lockedUntil, userID)
	return err
}
