# Login REST API (Go) — Implementation & Testing Notes

Implementation of the Login API described in [backend/req_api.md](../req_api.md), built with Go + Fiber v3 + PostgreSQL.

## Requirements covered

`POST /api/login` with JSON body `{ "username", "password" }`:

| Test Case | Scenario | Result |
|-----------|----------|--------|
| TC001 | Valid login | `200 OK` + `{ "token": <JWT> }` |
| TC002 | Invalid username/password | `401` + `Invalid username or password` |
| TC003 | Missing/empty fields (or malformed JSON) | `400` + `Username and password are required` |
| TC004 | Unexpected (DB) error | `500` + `An unexpected error occurred. Please try again later.` |
| TC005 | Account locked after 3 failed attempts | `401` + `Account locked due to multiple failed login attempts. Please try again later.` |

## Project structure

```
backend/go/
  main.go                         # App wiring, DB connection, env config
  internal/
    models/user.go                # User domain model + IsLocked helper
    auth/password.go              # bcrypt hash/verify
    auth/jwt.go                   # Self-contained HS256 JWT (stdlib only)
    repository/user.go            # UserRepository interface + Postgres impl
    handler/login.go              # Login handler + business logic
    handler/login_test.go         # Tests for TC001–TC005 (mock repo)
```

## Key design decisions

- **Dependency injection via `UserRepository` interface** — the handler depends on
  an interface, not Postgres directly. Tests use an in-memory mock, so no live
  database is needed and the DB-error case (TC004) can be simulated deterministically.
- **Self-contained JWT** — `auth/jwt.go` implements HS256 signing with the standard
  library (`crypto/hmac`, `crypto/sha256`, `encoding/base64`) to avoid adding an
  external JWT dependency. `ParseToken` is used by tests to verify the signed token.
- **Password security** — bcrypt (`golang.org/x/crypto/bcrypt`) for hashing/verification.
- **Account locking** — failed attempts are counted; on reaching `MaxFailedAttempts`
  (3) the account is locked for `LockDuration` (15 min) via `account_locked_until`.
  A successful login resets the counter and clears the lock.
- **Generic error messages** — invalid username and invalid password both return the
  same `401` message to avoid user enumeration.

## Configuration (env vars, with defaults)

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | HTTP port |
| `DB_HOST` | `localhost` | matches `database/docker-compose.yml` |
| `DB_PORT` | `5432` | |
| `DB_USER` | `myuser` | |
| `DB_PASSWORD` | `mypassword` | |
| `DB_NAME` | `mydatabase` | |
| `DB_SSLMODE` | `disable` | |
| `JWT_SECRET` | `dev-secret-change-me` | **override in production** |

## How to run

```bash
# Start the database (from repo root)
cd database && docker compose up -d

# Run the API
cd backend/go && go run .

# Run tests
cd backend/go && go test ./...
```

## Lessons learned

- The seed hashes in `database/data.sql` are placeholders, not real bcrypt hashes,
  so logging in against seeded users requires regenerating them with a real bcrypt hash.
- Fiber v3 `app.Test` takes `fiber.TestConfig{Timeout: ...}`; body parsing is done
  manually with `json.Unmarshal(c.Body(), ...)` for predictable 400 handling.
- Testing the handler through `app.Test` exercises the full HTTP stack (routing,
  status codes, JSON) while staying fast by mocking the repository.
