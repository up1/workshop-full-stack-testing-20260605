<script setup lang="ts">
import { reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const { loading, error, isAuthenticated } = storeToRefs(authStore)

const form = reactive({
  username: '',
  password: '',
})

const errors = reactive({
  username: '',
  password: '',
})

const submitted = ref(false)

function validate(): boolean {
  errors.username = form.username.trim() ? '' : 'Please enter your username'
  errors.password = form.password ? '' : 'Please enter your password'
  return !errors.username && !errors.password
}

async function handleSubmit(): Promise<void> {
  submitted.value = true

  if (!validate()) {
    return
  }

  await authStore.login({
    username: form.username,
    password: form.password,
  })
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gray-100 p-4">
    <div class="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">
      <h1 class="mb-6 text-center text-2xl font-semibold text-gray-800">
        Login
      </h1>

      <div
        v-if="isAuthenticated"
        data-testid="login-success"
        class="rounded-md bg-green-50 p-4 text-center text-green-700"
      >
        You are logged in successfully.
      </div>

      <form v-else novalidate class="space-y-4" @submit.prevent="handleSubmit">
        <div>
          <label
            for="username"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Username
          </label>
          <input
            id="username"
            v-model="form.username"
            type="text"
            data-testid="username-field"
            autocomplete="username"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            :class="{ 'border-red-500': errors.username }"
          />
          <p
            v-if="errors.username"
            data-testid="username-error"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.username }}
          </p>
        </div>

        <div>
          <label
            for="password"
            class="mb-1 block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            data-testid="password-field"
            autocomplete="current-password"
            class="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            :class="{ 'border-red-500': errors.password }"
          />
          <p
            v-if="errors.password"
            data-testid="password-error"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.password }}
          </p>
        </div>

        <p
          v-if="error"
          data-testid="login-error"
          class="rounded-md bg-red-50 p-3 text-sm text-red-700"
        >
          {{ error }}
        </p>

        <button
          type="submit"
          data-testid="login-button"
          :disabled="loading"
          class="w-full rounded-md bg-indigo-600 py-2 font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>
