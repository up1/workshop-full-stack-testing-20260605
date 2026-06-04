import { defineStore } from 'pinia'
import axios from 'axios'
import { apiClient } from '../api/client'

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthState {
  token: string | null
  loading: boolean
  error: string | null
}

const GENERIC_ERROR = 'An unexpected error occurred. Please try again later.'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state): boolean => state.token !== null,
  },

  actions: {
    /**
     * Authenticate the user against the login API.
     * Returns true on success, false otherwise. On failure `error` holds a
     * user-friendly message taken from the API response when available.
     */
    async login(credentials: LoginCredentials): Promise<boolean> {
      this.loading = true
      this.error = null

      try {
        const { data } = await apiClient.post<{ token: string }>(
          '/api/login',
          credentials,
        )
        this.token = data.token
        return true
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.data?.error) {
          this.error = err.response.data.error as string
        } else {
          this.error = GENERIC_ERROR
        }
        this.token = null
        return false
      } finally {
        this.loading = false
      }
    },

    logout(): void {
      this.token = null
      this.error = null
    },
  },
})
