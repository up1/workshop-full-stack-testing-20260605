import { test, expect } from '@playwright/test';

// E2E tests for the .NET MVC login feature (req_web.md).
// The app runs in Development so it uses the deterministic FakeAuthService:
//   user1 / validPassword -> success
//   lockedUser            -> account locked message
//   anything else         -> invalid username or password

test.beforeEach(async ({ page }) => {
  await page.goto('/Account/Login');
});

test('renders the login form', async ({ page }) => {
  await expect(page.getByTestId('username-field')).toBeVisible();
  await expect(page.getByTestId('password-field')).toBeVisible();
  await expect(page.getByTestId('login-button')).toBeVisible();
});

// TC001 — valid login redirects to the dashboard.
test('TC001: valid credentials log the user in', async ({ page }) => {
  await page.getByTestId('username-field').fill('user1');
  await page.getByTestId('password-field').fill('validPassword');
  await page.getByTestId('login-button').click();

  await expect(page).toHaveURL(/\/Account\/Dashboard$/);
  await expect(page.getByTestId('dashboard')).toBeVisible();
  await expect(page.getByTestId('welcome-message')).toContainText('user1');
});

// TC002 — invalid credentials show an error.
test('TC002: invalid credentials show an error message', async ({ page }) => {
  await page.getByTestId('username-field').fill('invalidUser');
  await page.getByTestId('password-field').fill('invalidPassword');
  await page.getByTestId('login-button').click();

  await expect(page.getByTestId('login-error')).toContainText('Invalid username or password');
  await expect(page).toHaveURL(/\/Account\/Login$/);
});

// TC003 — missing username shows the required-field error.
test('TC003: missing username shows a validation error', async ({ page }) => {
  await page.getByTestId('password-field').fill('validPassword');
  await page.getByTestId('login-button').click();

  await expect(page.getByTestId('username-error')).toContainText('Please enter your username');
});

// TC004 — missing password shows the required-field error.
test('TC004: missing password shows a validation error', async ({ page }) => {
  await page.getByTestId('username-field').fill('user1');
  await page.getByTestId('login-button').click();

  await expect(page.getByTestId('password-error')).toContainText('Please enter your password');
});

// TC005 — missing both fields shows both errors.
test('TC005: missing both fields shows both validation errors', async ({ page }) => {
  await page.getByTestId('login-button').click();

  await expect(page.getByTestId('username-error')).toContainText('Please enter your username');
  await expect(page.getByTestId('password-error')).toContainText('Please enter your password');
});

// req_api TC005 — account lockout message is surfaced to the user.
test('locked account shows the lockout message', async ({ page }) => {
  await page.getByTestId('username-field').fill('lockedUser');
  await page.getByTestId('password-field').fill('wrongPassword');
  await page.getByTestId('login-button').click();

  await expect(page.getByTestId('login-error')).toContainText(
    'Account locked due to multiple failed login attempts. Please try again later.',
  );
});
