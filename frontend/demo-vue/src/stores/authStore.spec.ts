import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from './authStore'
import { apiClient } from '../api/client'

vi.mock('../api/client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

const mockedPost = vi.mocked(apiClient.post)

describe('authStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockedPost.mockReset()
  })

  it('starts unauthenticated', () => {
    const store = useAuthStore()
    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBeNull()
  })

  it('stores the token on successful login (TC001)', async () => {
    mockedPost.mockResolvedValue({ data: { token: 'jwt_token_string' } })
    const store = useAuthStore()

    const ok = await store.login({ username: 'validUser', password: 'validPassword' })

    expect(ok).toBe(true)
    expect(store.token).toBe('jwt_token_string')
    expect(store.isAuthenticated).toBe(true)
    expect(store.error).toBeNull()
    expect(mockedPost).toHaveBeenCalledWith('/api/login', {
      username: 'validUser',
      password: 'validPassword',
    })
  })

  it('surfaces the API error message on invalid credentials (TC002)', async () => {
    mockedPost.mockRejectedValue({
      isAxiosError: true,
      response: { data: { error: 'Invalid username or password' } },
    })
    const store = useAuthStore()

    const ok = await store.login({ username: 'invalidUser', password: 'invalidPassword' })

    expect(ok).toBe(false)
    expect(store.token).toBeNull()
    expect(store.error).toBe('Invalid username or password')
  })

  it('falls back to a generic message on unexpected errors (TC004)', async () => {
    mockedPost.mockRejectedValue(new Error('network down'))
    const store = useAuthStore()

    const ok = await store.login({ username: 'a', password: 'b' })

    expect(ok).toBe(false)
    expect(store.error).toBe('An unexpected error occurred. Please try again later.')
  })

  it('clears state on logout', async () => {
    mockedPost.mockResolvedValue({ data: { token: 'jwt_token_string' } })
    const store = useAuthStore()
    await store.login({ username: 'validUser', password: 'validPassword' })

    store.logout()

    expect(store.token).toBeNull()
    expect(store.isAuthenticated).toBe(false)
    expect(store.error).toBeNull()
  })
})
