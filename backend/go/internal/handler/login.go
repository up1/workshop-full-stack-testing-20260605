package handler

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"demo/internal/auth"
	"demo/internal/repository"

	"github.com/gofiber/fiber/v3"
)

// Error and config constants used by the login flow.
const (
	msgMissingFields = "Username and password are required"
	msgInvalidCreds  = "Invalid username or password"
	msgAccountLocked = "Account locked due to multiple failed login attempts. Please try again later."
	msgServerError   = "An unexpected error occurred. Please try again later."
)

// LoginRequest is the expected JSON body for POST /api/login.
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// LoginHandler holds the dependencies required to authenticate users.
type LoginHandler struct {
	Repo              repository.UserRepository
	JWTSecret         string
	TokenTTL          time.Duration
	MaxFailedAttempts int
	LockDuration      time.Duration
}

// NewLoginHandler builds a LoginHandler with sensible defaults applied.
func NewLoginHandler(repo repository.UserRepository, jwtSecret string) *LoginHandler {
	return &LoginHandler{
		Repo:              repo,
		JWTSecret:         jwtSecret,
		TokenTTL:          time.Hour,
		MaxFailedAttempts: 3,
		LockDuration:      15 * time.Minute,
	}
}

// Login authenticates a user and issues a JWT on success.
func (h *LoginHandler) Login(c fiber.Ctx) error {
	var req LoginRequest
	if err := json.Unmarshal(c.Body(), &req); err != nil {
		return badRequest(c, msgMissingFields)
	}

	username := strings.TrimSpace(req.Username)
	password := req.Password
	if username == "" || password == "" {
		return badRequest(c, msgMissingFields)
	}

	ctx := context.Background()
	user, err := h.Repo.GetByUsername(ctx, username)
	if err == repository.ErrUserNotFound {
		return unauthorized(c, msgInvalidCreds)
	}
	if err != nil {
		return serverError(c)
	}

	now := time.Now()
	if user.IsLocked(now) {
		return unauthorized(c, msgAccountLocked)
	}

	if auth.CheckPassword(user.PasswordHash, password) {
		// Successful login: clear any failed-attempt state.
		if user.FailedLoginAttempts != 0 || user.AccountLockedUntil != nil {
			if err := h.Repo.UpdateLoginState(ctx, user.ID, 0, nil); err != nil {
				return serverError(c)
			}
		}
		token, err := auth.GenerateToken(h.JWTSecret, user.ID, user.Username, h.TokenTTL)
		if err != nil {
			return serverError(c)
		}
		return c.Status(fiber.StatusOK).JSON(fiber.Map{"token": token})
	}

	// Failed login: increment counter and lock the account when the threshold is hit.
	attempts := user.FailedLoginAttempts + 1
	var lockedUntil *time.Time
	locked := attempts >= h.MaxFailedAttempts
	if locked {
		until := now.Add(h.LockDuration)
		lockedUntil = &until
	}
	if err := h.Repo.UpdateLoginState(ctx, user.ID, attempts, lockedUntil); err != nil {
		return serverError(c)
	}
	if locked {
		return unauthorized(c, msgAccountLocked)
	}
	return unauthorized(c, msgInvalidCreds)
}

func badRequest(c fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": msg})
}

func unauthorized(c fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": msg})
}

func serverError(c fiber.Ctx) error {
	return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": msgServerError})
}
