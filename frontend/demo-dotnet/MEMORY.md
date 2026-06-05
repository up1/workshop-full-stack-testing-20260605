# Login Feature — .NET MVC Implementation Memory

Server-side login feature for the .NET MVC demo app, built from
[req_web.md](../req_web.md) (and the backend contract in
[req_api.md](../../backend/req_api.md)).

## Stack

- **.NET 10 / ASP.NET Core MVC** — server-rendered views + controllers
- **Razor views** + Bootstrap (default template) — UI
- **jQuery Unobtrusive Validation** — client-side required-field validation
- **HttpClient** (typed client) — calls the backend login API
- **Session** — stores the authenticated user + token after login
- **xUnit + Moq** — unit tests (controller + service)
- **Playwright** — end-to-end browser tests

## Project structure

```
webmvc/
  Models/
    LoginViewModel.cs      # Username/Password + [Required] messages
    AuthResult.cs          # Success/Token/ErrorMessage result type
  Services/
    IAuthService.cs        # LoginAsync abstraction
    AuthService.cs         # Real client: POST {BaseUrl}/api/login
    FakeAuthService.cs     # Deterministic in-memory auth (dev/e2e)
  Controllers/
    AccountController.cs    # GET/POST Login, Dashboard, Logout
  Views/Account/
    Login.cshtml           # Login form (data-testid hooks)
    Dashboard.cshtml       # Post-login landing page
  Program.cs               # DI: session + AuthService/FakeAuthService switch
  appsettings*.json        # AuthApi:BaseUrl / AuthApi:UseFake
tests/
  AccountControllerTests.cs  # Controller behaviour (Moq IAuthService)
  AuthServiceTests.cs        # HttpClient mapping of 200/401/400/500/network
  FakeSession.cs             # In-memory ISession for controller tests
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
- **Service switch**: `Program.cs` registers `FakeAuthService` when
  `AuthApi:UseFake` is `true` (set in `appsettings.Development.json`), otherwise
  a typed `HttpClient` `AuthService` pointed at `AuthApi:BaseUrl`
  (`http://localhost:3000`). This keeps the e2e suite self-contained — no real
  backend or database needed — while production uses the real API.
- `FakeAuthService` credentials: `user1` / `validPassword` succeeds;
  `lockedUser` returns the lockout message; everything else is invalid.
- Form uses `novalidate` so jQuery Unobtrusive Validation (not native browser
  bubbles) renders the custom `[Required]` messages into the `*-error` spans.
- `[ValidateAntiForgeryToken]` on POST actions; the form tag helper emits the
  hidden token automatically, so Playwright's real form submit just works.

## Commands

```bash
# from frontend/demo-dotnet
dotnet run --project webmvc            # http://localhost:5217 (Development = fake auth)
dotnet test                            # run xUnit suite (webmvc + tests)

# from frontend/demo-dotnet/playwright
npx playwright install chromium        # one-time browser install
npx playwright test                    # auto-starts the MVC app via webServer
```

To run against the **real backend**, start the backend on
`http://localhost:3000` and run the app without Development env (or set
`AuthApi:UseFake=false`).

## Test results

- **xUnit: 12 passed** — `AccountControllerTests` (GET view, TC001 redirect,
  TC002 invalid, invalid ModelState short-circuit, TC005 lockout, dashboard
  guard/render) + `AuthServiceTests` (200/401/400/500/network mapping).
- **Playwright: 7 passed** — render, TC001 success, TC002 invalid, TC003 missing
  username, TC004 missing password, TC005 missing both, account lockout.

## Notes / gotchas

- A stale `UnitTest1.cs` lingered after `mv`; duplicate class definitions broke
  the build until it was removed. If renaming test files, verify the old file is
  gone.
- `UseHttpsRedirection` is harmless under the http-only Playwright server — with
  no configured HTTPS port it serves http without redirecting.
- EF Core / PostgreSQL were intentionally **not** added: req_web.md is a frontend
  login consuming the existing backend API, so persisting users here would
  duplicate the backend and over-engineer the demo.
