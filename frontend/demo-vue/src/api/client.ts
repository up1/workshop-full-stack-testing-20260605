import axios from 'axios'

/** Base URL for the login API. */
export const API_BASE_URL = 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})
