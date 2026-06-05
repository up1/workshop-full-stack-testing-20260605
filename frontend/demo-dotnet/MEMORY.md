# Login Feature — .NET MVC Implementation Memory

Server-side login feature for the .NET MVC demo app, built from
[req_web.md](../req_web.md) (and the backend contract in
[req_api.md](../../backend/req_api.md)).

## Stack

- **.NET 10 / ASP.NET Core MVC** — server-rendered views + JSON API controllers
- **Razor views** + Bootstrap (default template) — UI
- **jQuery Unobtrusive Validation** — client-side required-field validation
- **Entity Framework Core 10** + **Npgsql** (PostgreSQL) — `users` table / DB auth
- **BCrypt.Net-Next** — password hash verification (matches the Go backend)
- **Swashbuckle (Swagger)** — OpenAPI docs for the JSON API (Development only)
- **HttpClient** (typed client) — alternative: call the external backend login API
- **Session** — stores the authenticated user + token after login
- **xUnit + Moq** — unit tests (controller + service)
- **Microsoft.AspNetCore.Mvc.Testing + EF Core InMemory** — API integration tests
- **Playwright** — end-to-end browser tests

## Project structure

```
webmvc/
  Data/
    ApplicationDbContext.cs  # EF Core DbContext mapping the users table
  Models/
    LoginViewModel.cs      # Username/Password + [Required] messages
    AuthResult.cs          # Success/Token/ErrorMessage result type
    User.cs                # users entity (+ IsLocked helper)
    Api/LoginApiModels.cs  # LoginApiRequest/Response + ErrorApiResponse
  Services/
    IAuthService.cs        # LoginAsync abstraction
    AuthService.cs         # HTTP client: POST {BaseUrl}/api/login
    DbAuthService.cs       # EF Core auth: bcrypt + lockout (req_api parity)
    FakeAuthService.cs     # Deterministic in-memory auth (dev/e2e)
  Controllers/
    AccountController.cs    # GET/POST Login, Dashboard, Logout (MVC views)
    ApiLoginController.cs   # POST /api/login -> 200 {token} | 400/401 {error}
  Views/Account/
    Login.cshtml           # Login form (data-testid hooks)
    Dashboard.cshtml       # Post-login landing page
  Program.cs               # DI: session, EF Core, Swagger, auth switch; partial Program
  appsettings*.json        # AuthApi + ConnectionStrings:DefaultConnection
tests/
  AccountControllerTests.cs    # Controller behaviour (Moq IAuthService)
  AuthServiceTests.cs          # HttpClient mapping of 200/401/400/500/network
  ApiLoginIntegrationTests.cs  # POST /api/login over a real pipeline (in-memory db)
  ApiWebApplicationFactory.cs  # WebApplicationFactory<Program> + EF InMemory swap
  FakeSession.cs               # In-memory ISession for controller tests
  FakeTimeProvider.cs          # Deterministic clock for lockout windows
playwright/
  tests/login.spec.ts        # e2e for TC001–TC005 + lockout
  playwright.config.ts       # baseURL + webServer (dotnet run, Development)
```

## Requirements mapping

| Requirement (req_web.md)        | Implementation |
|---------------------------------|----------------|
| Username field `username-field` | `<input data-testid="username-field">` |
| Password field `password-field` | `<input type="password" data-testid="password-field">` |
| Login button `login-button`     | `<button data-testid="login-button">` |
| Username required               | `Please enter your username` (`username-error`) |
| Password required               | `Please enter your password` (`password-error`) |
| POST `/api/login`               | `AuthService` → backend `POST /api/login` |
| 200 → `{ token }`               | Session set, redirect to `Account/Dashboard` |
| 401 → invalid credentials       | `Invalid username or password` (`login-error`) |
| 400 → required fields           | Surfaced from backend `error` field |
| 500 / network                   | `An unexpected error occurred. Please try again later.` |
| Lockout (req_api TC005)         | Backend/Fake message surfaced in `login-error` |

## Architecture notes

- **Classic MVC flow**, not client-side fetch: `GET /Account/Login` renders the
  form; `POST /Account/Login` validates `ModelState`, calls `IAuthService`, then
  either re-renders with errors or redirects to the dashboard. This gives the
  controller meaningful server-side logic to unit test.
- **JSON login API**: `ApiLoginController` exposes `POST /api/login` per
  [req_api.md](../../backend/req_api.md) — `200 { token }`, `400 { error }` for
  missing fields, `401 { error }` for invalid credentials / lockout. It shares
  the same `IAuthService` as the MVC flow. `[ApiController]`'s automatic 400 is
  suppressed (`SuppressModelStateInvalidFilter`) so the API returns its own
  `{ error: "Username and password are required" }` body.
- **Service switch** (`Program.cs`), first match wins:
  - `AuthApi:UseFake=true` → `FakeAuthService` (Development/e2e; no DB or API).
  - `AuthApi:UseDatabase=true` → `DbAuthService` (EF Core; used by the
    integration tests).
  - otherwise → typed `HttpClient` `AuthService` → external backend
    (`AuthApi:BaseUrl`, default `http://localhost:3000`).
- **`DbAuthService`** mirrors the Go backend exactly: bcrypt verify, increment
  `failed_login_attempts`, lock for **15 minutes** after **3** failures, clear
  the counter on success. Uses an injected `TimeProvider` so lockout windows are
  testable.
- `FakeAuthService` credentials: `user1` / `validPassword` succeeds;
  `lockedUser` returns the lockout message; everything else is invalid.
- Form uses `novalidate` so jQuery Unobtrusive Validation (not native browser
  bubbles) renders the custom `[Required]` messages into the `*-error` spans.
- `[ValidateAntiForgeryToken]` on the MVC POST actions; the form tag helper emits
  the hidden token automatically, so Playwright's real form submit just works.
  The JSON API uses `ControllerBase` (no antiforgery), so API clients post plain
  JSON.

## API integration tests (in-memory database)

- `ApiWebApplicationFactory : WebApplicationFactory<Program>` boots the real app
  but: sets `AuthApi:UseDatabase=true`, removes the Npgsql `DbContext`
  registrations, and re-adds EF Core **InMemory** with a unique database name per
  factory instance. A `FakeTimeProvider` gives a deterministic clock.
- `Program` is declared `public partial class Program;` at the end of
  `Program.cs` so the factory can reference it as the generic argument.
- `SeedDatabase()` resets (`EnsureDeleted`/`EnsureCreated`) and inserts `user1`
  with a freshly computed bcrypt hash; it runs in the test class constructor, so
  each test starts from a clean, known state (xUnit runs tests in a class
  sequentially).
- `ApiLoginIntegrationTests` covers TC001 (200 + token), TC002 (401 invalid),
  unknown user (401), TC003 (400 missing field), empty body (400), and TC005
  (3 failed attempts → lockout persisted to the DB, correct password rejected
  while locked).

## Commands

```bash
# from frontend/demo-dotnet
dotnet run --project webmvc            # http://localhost:5217 (Development = fake auth)
                                       # Swagger UI at /swagger in Development
dotnet test                            # run xUnit suite (unit + API integration)

# from frontend/demo-dotnet/playwright
npx playwright install chromium        # one-time browser install
npx playwright test                    # auto-starts the MVC app via webServer
```

Auth backend selection (config keys, first match wins):

- `AuthApi:UseFake=true` — in-memory fake (default in Development; e2e).
- `AuthApi:UseDatabase=true` — EF Core against `ConnectionStrings:DefaultConnection`.
- neither — external HTTP backend at `AuthApi:BaseUrl` (default `http://localhost:3000`).

## Test results

- **xUnit: 18 passed**
  - `AccountControllerTests` (7) — GET view, TC001 redirect, TC002 invalid,
    invalid ModelState short-circuit, TC005 lockout, dashboard guard/render.
  - `AuthServiceTests` (5) — 200/401/400/500/network mapping.
  - `ApiLoginIntegrationTests` (6) — `POST /api/login` over a real HTTP pipeline
    with the EF Core in-memory database (TC001–TC003, TC005 lockout, edge cases).
- **Playwright: 7 passed** — render, TC001 success, TC002 invalid, TC003 missing
  username, TC004 missing password, TC005 missing both, account lockout.

## Notes / gotchas

- A stale `UnitTest1.cs` lingered after `mv`; duplicate class definitions broke
  the build until it was removed. If renaming test files, verify the old file is
  gone.
- `UseHttpsRedirection` is harmless under the http-only Playwright server — with
  no configured HTTPS port it serves http without redirecting.
- **EF provider conflict in tests**: removing only the
  `DbContextOptions<ApplicationDbContext>` descriptor is not enough — the Npgsql
  provider's internal services remain and EF throws "Only a single database
  provider can be registered". The factory removes every descriptor under the
  `Microsoft.EntityFrameworkCore` namespace (and Npgsql implementations) before
  adding the in-memory provider.
- The in-memory provider doesn't enforce the Npgsql column mappings, but using
  the same `ApplicationDbContext` keeps the entity model and query logic honest.
