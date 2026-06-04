import { test, expect } from '@playwright/test'

const LOGIN_API = 'http://localhost:3000/api/login'

test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders the login form components', async ({ page }) => {
    await expect(page.getByTestId('username-field')).toBeVisible()
    await expect(page.getByTestId('password-field')).toBeVisible()
    await expect(page.getByTestId('login-button')).toBeVisible()
  })

  test('shows validation errors when submitting empty fields', async ({ page }) => {
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('username-error')).toHaveText(
      'Please enter your username',
    )
    await expect(page.getByTestId('password-error')).toHaveText(
      'Please enter your password',
    )
  })

  test('logs in successfully with valid credentials (TC001)', async ({ page }) => {
    await page.route(LOGIN_API, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'jwt_token_string' }),
      })
    })

    await page.getByTestId('username-field').fill('validUser')
    await page.getByTestId('password-field').fill('validPassword')
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('login-success')).toBeVisible()
  })

  test('shows an error for invalid credentials (TC002)', async ({ page }) => {
    await page.route(LOGIN_API, async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid username or password' }),
      })
    })

    await page.getByTestId('username-field').fill('invalidUser')
    await page.getByTestId('password-field').fill('invalidPassword')
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('login-error')).toHaveText(
      'Invalid username or password',
    )
  })

  test('shows a generic error on server failure (TC004)', async ({ page }) => {
    await page.route(LOGIN_API, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'An unexpected error occurred. Please try again later.',
        }),
      })
    })

    await page.getByTestId('username-field').fill('someUser')
    await page.getByTestId('password-field').fill('somePassword')
    await page.getByTestId('login-button').click()

    await expect(page.getByTestId('login-error')).toHaveText(
      'An unexpected error occurred. Please try again later.',
    )
  })
})
