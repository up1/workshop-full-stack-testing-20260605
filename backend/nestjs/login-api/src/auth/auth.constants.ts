/** Centralized error messages required by the API contract (req_api.md). */
export const AUTH_MESSAGES = {
  missingFields: 'Username and password are required',
  invalidCredentials: 'Invalid username or password',
  accountLocked:
    'Account locked due to multiple failed login attempts. Please try again later.',
  serverError: 'An unexpected error occurred. Please try again later.',
} as const;
