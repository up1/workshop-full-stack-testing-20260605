import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LoginForm from './LoginForm.vue'
import { useAuthStore } from '../stores/authStore'

describe('LoginForm.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the username, password fields and login button', () => {
    const wrapper = mount(LoginForm)
    expect(wrapper.find('[data-testid="username-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="password-field"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="login-button"]').exists()).toBe(true)
  })

  it('shows validation errors when fields are empty', async () => {
    const wrapper = mount(LoginForm)

    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.find('[data-testid="username-error"]').text()).toBe(
      'Please enter your username',
    )
    expect(wrapper.find('[data-testid="password-error"]').text()).toBe(
      'Please enter your password',
    )
  })

  it('does not call the store when validation fails', async () => {
    const wrapper = mount(LoginForm)
    const store = useAuthStore()
    const loginSpy = vi.spyOn(store, 'login')

    await wrapper.find('form').trigger('submit.prevent')

    expect(loginSpy).not.toHaveBeenCalled()
  })

  it('calls the store with credentials on valid submit', async () => {
    const wrapper = mount(LoginForm)
    const store = useAuthStore()
    const loginSpy = vi.spyOn(store, 'login').mockResolvedValue(true)

    await wrapper.find('[data-testid="username-field"]').setValue('validUser')
    await wrapper.find('[data-testid="password-field"]').setValue('validPassword')
    await wrapper.find('form').trigger('submit.prevent')

    expect(loginSpy).toHaveBeenCalledWith({
      username: 'validUser',
      password: 'validPassword',
    })
  })

  it('displays the store error message after a failed login', async () => {
    const wrapper = mount(LoginForm)
    const store = useAuthStore()
    vi.spyOn(store, 'login').mockImplementation(async () => {
      store.error = 'Invalid username or password'
      return false
    })

    await wrapper.find('[data-testid="username-field"]').setValue('invalidUser')
    await wrapper.find('[data-testid="password-field"]').setValue('wrongPassword')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.find('[data-testid="login-error"]').text()).toBe(
      'Invalid username or password',
    )
  })

  it('shows the success message once authenticated', async () => {
    const wrapper = mount(LoginForm)
    const store = useAuthStore()
    vi.spyOn(store, 'login').mockImplementation(async () => {
      store.token = 'jwt_token_string'
      return true
    })

    await wrapper.find('[data-testid="username-field"]').setValue('validUser')
    await wrapper.find('[data-testid="password-field"]').setValue('validPassword')
    await wrapper.find('form').trigger('submit.prevent')
    await flushPromises()

    expect(wrapper.find('[data-testid="login-success"]').exists()).toBe(true)
  })
})
