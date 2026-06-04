package models

import "time"

// User represents a record from the users table.
type User struct {
	ID                  int
	Username            string
	PasswordHash        string
	FailedLoginAttempts int
	AccountLockedUntil  *time.Time
}

// IsLocked reports whether the account is currently locked at time now.
func (u *User) IsLocked(now time.Time) bool {
	return u.AccountLockedUntil != nil && u.AccountLockedUntil.After(now)
}
