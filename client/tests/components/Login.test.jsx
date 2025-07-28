import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Login from '../../src/components/Login'
import userSlice from '../../src/store/userSlice'
import { resetMockUsers } from '../mocks/handlers'

// Create a test store with initial state to avoid loading state
const createTestStore = (initialState = {}) => {
  const defaultUserState = {
    user: null,
    loading: false,
    error: null,
    successMessage: null,
    isAuthenticated: false,
    authChecked: true, // Set to true to avoid initial loading
    formData: {
      email: '',
      password: '',
      authCode: '',
      firstName: '',
      lastName: '',
    },
    ...initialState.user,
  }

  return configureStore({
    reducer: {
      user: userSlice,
    },
    preloadedState: {
      user: defaultUserState,
      ...initialState,
    },
  })
}

// Helper to render component with Redux store
const renderWithStore = (component, store = createTestStore()) => {
  return {
    ...render(<Provider store={store}>{component}</Provider>),
    store,
  }
}

describe('Login Component', () => {
  beforeEach(() => {
    resetMockUsers()
  })

  afterEach(() => {
    cleanup() // Clean up DOM after each test
  })

  it('should display login screen when page loads', () => {
    renderWithStore(<Login />)

    // Check that the main elements of the login screen are present
    expect(screen.getByText('Language Helper')).toBeInTheDocument()
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
    expect(screen.getByText('Need an account? Register here')).toBeInTheDocument()
  })

  it('should render login form initially', () => {
    renderWithStore(<Login />)

    expect(screen.getByText('Language Helper')).toBeInTheDocument()
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
  })

  it('should switch to registration mode', () => {
    renderWithStore(<Login />)

    // Initially in login mode
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument()

    // Click register link
    fireEvent.click(screen.getByText('Need an account? Register here'))

    // Should now be in registration mode
    expect(screen.getByText('Create a new account')).toBeInTheDocument()
    expect(screen.getByLabelText(/Authorization Code/)).toBeInTheDocument()
    expect(screen.getByLabelText('First Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument()
  })

  it('should show success message after successful registration', async () => {
    renderWithStore(<Login />)

    // Switch to registration mode
    fireEvent.click(screen.getByText('Need an account? Register here'))

    // Fill out the form
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })
    fireEvent.change(screen.getByLabelText(/Authorization Code/), {
      target: { value: 'test' },
    })
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Test' },
    })
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'User' },
    })

    // Submit the form
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    // Wait for success message to appear
    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    // Should be back in login mode
    expect(screen.getByText('Please log in to continue')).toBeInTheDocument()

    // Email should be preserved in the form
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
  })

  it('should show error for invalid auth code', async () => {
    renderWithStore(<Login />)

    fireEvent.click(screen.getByText('Need an account? Register here'))

    // Fill form with invalid auth code
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })
    fireEvent.change(screen.getByLabelText(/Authorization Code/), {
      target: { value: 'invalid-code' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid authentication code/i)).toBeInTheDocument()
    })
  })

  it('should validate required fields', async () => {
    renderWithStore(<Login />)

    fireEvent.click(screen.getByText('Need an account? Register here'))

    // Get form elements
    const emailInput = screen.getByLabelText('Email Address')
    const passwordInput = screen.getByLabelText('Password')
    const authCodeInput = screen.getByLabelText(/Authorization Code/)

    // Check that required attributes are present
    expect(emailInput).toHaveAttribute('required')
    expect(passwordInput).toHaveAttribute('required')
    expect(authCodeInput).toHaveAttribute('required')

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitButton)

    // Check validity state - HTML5 validation should prevent submission
    expect(emailInput.validity.valid).toBe(false)
    expect(emailInput.validity.valueMissing).toBe(true)

    // Form should still be in registration mode (submission was prevented)
    expect(screen.getByText('Create a new account')).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    renderWithStore(<Login />)

    fireEvent.click(screen.getByText('Need an account? Register here'))

    const emailInput = screen.getByLabelText('Email Address')

    // Check that email input has the correct type
    expect(emailInput).toHaveAttribute('type', 'email')

    // Fill with invalid email format
    fireEvent.change(emailInput, {
      target: { value: 'invalid-email' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })
    fireEvent.change(screen.getByLabelText(/Authorization Code/), {
      target: { value: 'test' },
    })

    // Check validity after entering invalid email
    expect(emailInput.validity.valid).toBe(false)
    expect(emailInput.validity.typeMismatch).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))
  })

  it('should successfully login after registration', async () => {
    const store = createTestStore()
    renderWithStore(<Login />, store)

    // Register first
    fireEvent.click(screen.getByText('Need an account? Register here'))

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'logintest@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })
    fireEvent.change(screen.getByLabelText(/Authorization Code/), {
      target: { value: 'test' },
    })
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Login' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    // Now login - password field should be cleared, so we need to enter it again
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })

    fireEvent.click(screen.getByRole('button', { name: /log in/i }))

    // Wait for login to complete - check Redux state
    await waitFor(() => {
      const state = store.getState()
      expect(state.user.isAuthenticated).toBe(true)
      expect(state.user.user).toBeDefined()
    })
  })

  it('should manage form data through Redux store', async () => {
    const store = createTestStore()
    renderWithStore(<Login />, store)

    // Switch to registration mode
    fireEvent.click(screen.getByText('Need an account? Register here'))

    // Fill out form and check that Redux state is updated
    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'redux-test@example.com' },
    })

    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'Redux' },
    })

    // Check that the form data is stored in Redux
    const state = store.getState()
    expect(state.user.formData.email).toBe('redux-test@example.com')
    expect(state.user.formData.firstName).toBe('Redux')
  })

  it('should preserve email after successful registration', async () => {
    const store = createTestStore()
    renderWithStore(<Login />, store)

    // Register
    fireEvent.click(screen.getByText('Need an account? Register here'))

    fireEvent.change(screen.getByLabelText('Email Address'), {
      target: { value: 'preserve-test@example.com' },
    })
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'TestPassword123!' },
    })
    fireEvent.change(screen.getByLabelText(/Authorization Code/), {
      target: { value: 'test' },
    })

    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    await waitFor(() => {
      expect(screen.getByText(/account created successfully/i)).toBeInTheDocument()
    })

    // Check Redux state - email should be preserved, other fields cleared
    const state = store.getState()
    expect(state.user.formData.email).toBe('preserve-test@example.com')
    expect(state.user.formData.password).toBe('')
    expect(state.user.formData.authCode).toBe('')
    expect(state.user.successMessage).toContain('Account created successfully')
  })
})
