# Login Feature — Implementation Memory

Frontend login feature for the Vue demo app, built from [req_web.md](../req_web.md).

## Stack

- **Vue 3** (`<script setup>` + Composition API) + **TypeScript** + **Vite**
- **Pinia** — auth state management
- **Axios** — API client
- **Tailwind CSS v4** — styling (via `@tailwindcss/vite` plugin, `@import "tailwindcss"` in `src/style.css`)
- **Vitest** + **@vue/test-utils** + **jsdom** — unit tests
- **Playwright** — end-to-end tests

## Project structure

```
src/
  api/client.ts            # Axios instance (baseURL http://localhost:3000)
  stores/authStore.ts      # Pinia store: login/logout, token, loading, error
  stores/authStore.spec.ts # Store unit tests
  components/LoginForm.vue  # Login UI + required-field validation
  components/LoginForm.spec.ts
  App.vue                  # Renders <LoginForm />
  main.ts                  # createApp().use(createPinia())
tests/
  login.spec.ts            # Playwright e2e (API mocked via page.route)
```

## Requirements mapping

| Requirement (req_web.md)        | Implementation |
|---------------------------------|----------------|
| Username field `username-field` | `<input data-testid="username-field">` |
| Password field `password-field` | `<input type="password" data-testid="password-field">` |
| Login button `login-button`     | `<button data-testid="login-button">` |
| Username required               | Error `Please enter your username` (`username-error`) |
| Password required               | Error `Please enter your password` (`password-error`) |
| POST `/api/login`               | `authStore.login()` via Axios |
| 200 → `{ token }`               | Stores token, shows `login-success` |
| 401 / 400 / 500 → `{ error }`   | Shows API message in `login-error` |
| Network/unknown error           | Generic message: `An unexpected error occurred. Please try again later.` |

Validation runs client-side before the API call; the form uses `novalidate`
so custom messages (not browser defaults) are shown.

## Commands

```bash
npm run dev        # Vite dev server (http://localhost:5173)
npm test           # Vitest unit tests (run once)
npm run test:watch # Vitest watch mode
npm run test:e2e   # Playwright e2e (auto-starts dev server via webServer config)
npm run build      # vue-tsc type-check + production build
```

## Test results

- Unit: **11 passed** (5 store + 6 component) — covers success, invalid creds,
  generic error, logout, validation, and success/error rendering.
- E2E: **5 passed** — render, empty-field validation, TC001 success,
  TC002 invalid credentials, TC004 server error. Backend API responses are
  mocked with Playwright `page.route`, so the suite is deterministic and does
  not require the real backend running.

## Notes / gotchas

- Tailwind v4 needs no `tailwind.config.js`; just the Vite plugin + CSS import.
- `vite.config.ts` holds the Vitest config (`test.environment = 'jsdom'`,
  `globals: true`, includes only `src/**/*.spec.ts`). Playwright tests live in
  `tests/` so the two runners never collide.
- `playwright.config.ts` has `baseURL: http://localhost:5173` and a `webServer`
  block running `npm run dev` with `reuseExistingServer` outside CI.
- Store error handling uses `axios.isAxiosError` to safely read
  `response.data.error`, otherwise falls back to the generic message.
- Future work: TC005 (account lockout after 3 failed attempts) is a backend
  behavior; the frontend already surfaces whatever message the API returns.
```
