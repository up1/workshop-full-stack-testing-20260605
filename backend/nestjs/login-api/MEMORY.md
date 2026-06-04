# Login REST API (NestJS) — Implementation & Testing Notes

Implementation of the Login API described in [backend/req_api.md](../../req_api.md),
built with **NestJS 11 + TypeORM + PostgreSQL + JWT + Swagger**, tested with **Jest**.

## Requirements covered

`POST /api/login` with JSON body `{ "username", "password" }`:

| Test Case | Scenario | Result |
|-----------|----------|--------|
| TC001 | Valid login | `200 OK` + `{ "token": <JWT> }` |
| TC002 | Invalid username/password | `401` + `{ "error": "Invalid username or password" }` |
| TC003 | Missing/empty fields | `400` + `{ "error": "Username and password are required" }` |
| TC004 | Unexpected (DB) error | `500` + `{ "error": "An unexpected error occurred. Please try again later." }` |
| TC005 | Account locked after 3 failed attempts | `401` + `{ "error": "Account locked due to multiple failed login attempts. Please try again later." }` |

## Project structure

```
src/
  main.ts                       # Bootstrap + global ValidationPipe + Swagger
  app.module.ts                 # ConfigModule + TypeOrm (Postgres) + AuthModule
  auth/
    auth.module.ts              # Wires JwtModule + AuthController/Service
    auth.controller.ts          # POST /api/login, Swagger annotations
    auth.service.ts             # Login business logic (validation, lock, JWT)
    auth.constants.ts           # Contract error messages
    auth.service.spec.ts        # Unit tests (TC001–TC005, mocked repo)
    dto/login.dto.ts            # Request/response DTOs + class-validator
  user/
    user.entity.ts              # TypeORM entity mapping `users` table
    user.repository.ts          # IUserRepository interface + TypeORM impl
    user.module.ts              # Provides USER_REPOSITORY token
test/
  auth.e2e-spec.ts              # E2E tests over full HTTP stack (in-memory repo)
```

## Key design decisions

- **Repository abstraction via `USER_REPOSITORY` token + `IUserRepository`** — the
  `AuthService` depends on an interface, not TypeORM directly. Unit tests inject a
  Jest mock and e2e tests inject an in-memory implementation, so **no live database
  is required to run the test suite**, and the DB-error case (TC004) is simulated
  deterministically.
- **Contract-accurate error bodies** — all failures return exactly `{ "error": "..." }`.
  This is enforced by throwing `HttpException({ error: msg }, status)` in the service
  and by a custom `exceptionFactory` on the global `ValidationPipe` (otherwise Nest's
  default validation error shape `{ statusCode, message, error }` would leak).
- **Password security** — `bcryptjs` (`bcrypt.compare`) for password verification.
- **JWT** — `@nestjs/jwt` (HS256), secret from `JWT_SECRET`, 1h expiry.
- **Account locking** — failed attempts are counted; on reaching `MAX_FAILED_ATTEMPTS`
  (3) the account is locked for 15 minutes via `account_locked_until`. A successful
  login resets the counter and clears the lock.
- **Generic 401 message** — unknown username and wrong password both return the same
  message to avoid user enumeration.
- **Swagger** — served at `/api` (DocumentBuilder); DTOs annotated with `@ApiProperty`.

## Configuration (env vars, with defaults — match `database/docker-compose.yml`)

| Var | Default | Purpose |
|-----|---------|---------|
| `PORT` | `3000` | HTTP port |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | |
| `DB_USER` | `myuser` | |
| `DB_PASSWORD` | `mypassword` | |
| `DB_NAME` | `mydatabase` | |
| `JWT_SECRET` | `dev-secret-change-me` | **override in production** |

## How to run

```bash
# Start the database (from repo root)
cd database && docker compose up -d

# Install & run the API
cd backend/nestjs/login-api
npm install
npm run start          # http://localhost:3000  (Swagger UI: /api)

# Run tests
npm test               # unit tests (12)
npm run test:e2e       # e2e tests (4)
```

## Test results

- Unit (`src/auth/auth.service.spec.ts`): **12 passed** — covers TC001–TC005 plus
  counter-increment, locked-account rejection, and failed-attempt reset.
- E2E (`test/auth.e2e-spec.ts`): **4 passed** — full HTTP stack for TC001, TC002,
  TC003, TC005.

## Lessons learned

- With `isolatedModules` + `emitDecoratorMetadata`, an interface used only as a
  decorated constructor-parameter type must be imported via `import type { ... }`
  (TS1272), otherwise `nest build` fails.
- The default NestJS `ValidationPipe` returns its own error shape; a custom
  `exceptionFactory` is required to satisfy the `{ "error": ... }` contract.
- The removed boilerplate (`app.controller`/`app.service` + their tests) was
  dropped because the default `app.e2e-spec.ts` imported `AppModule`, which now
  opens a Postgres connection and would fail the DB-free test run.
- The seed hash in `database/data.sql` is for `validPassword`; regenerate with a real
  bcrypt hash (see `backend/util/genhash.go`) if seeded login is needed end-to-end.
```
