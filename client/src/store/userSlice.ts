import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'
import type { 
  User, 
  UserFormData, 
  UserState, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest 
} from '../types'

// Async thunks for API calls
export const checkAuthStatus = createAsyncThunk<AuthResponse, void, { rejectValue: string }>(
  'user/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get<AuthResponse>('/api/auth/status')
      return response.data
    } catch (error: any) {
      console.error('Auth status check failed:', error)
      return rejectWithValue(error.response?.data?.error || 'Auth status check failed')
    }
  }
)

export const loginUser = createAsyncThunk<AuthResponse, LoginRequest, { rejectValue: string }>(
  'user/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await axios.post<AuthResponse>('/api/auth/login', { email, password })
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Login failed'
      return rejectWithValue(errorMsg)
    }
  }
)

export const registerUser = createAsyncThunk<
  AuthResponse, 
  Omit<RegisterRequest, 'auth_code' | 'first_name' | 'last_name'> & { authCode: string; firstName: string; lastName: string },
  { rejectValue: string }
>(
  'user/registerUser',
  async ({ email, password, authCode, firstName, lastName }, { rejectWithValue }) => {
    try {
      const response = await axios.post<AuthResponse>('/api/auth/register', { 
        email, 
        password, 
        auth_code: authCode,
        first_name: firstName,
        last_name: lastName
      })
      return response.data
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || 'Registration failed'
      return rejectWithValue(errorMsg)
    }
  }
)

export const logoutUser = createAsyncThunk<{ success: boolean }, void, { rejectValue: string }>(
  'user/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await axios.get('/api/auth/logout')
      return { success: true }
    } catch (error: any) {
      console.error('Logout failed:', error)
      // Still treat as success since we'll clear local state regardless
      return { success: true }
    }
  }
)

const initialState: UserState = {
  user: null,
  loading: false,
  error: null,
  successMessage: null,
  isAuthenticated: false,
  authChecked: false, // Track if we've checked auth status on app load
  formData: {
    email: '',
    password: '',
    authCode: '',
    firstName: '',
    lastName: ''
  },
}

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null
    },
    clearSuccess: (state) => {
      state.successMessage = null
    },
    updateFormData: (state, action: PayloadAction<Partial<UserFormData>>) => {
      state.formData = { ...state.formData, ...action.payload }
    },
    clearFormData: (state) => {
      state.formData = {
        email: '',
        password: '',
        authCode: '',
        firstName: '',
        lastName: ''
      }
    },
    clearUser: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.error = null
      state.successMessage = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth status
      .addCase(checkAuthStatus.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.loading = false
        state.authChecked = true
        if (action.payload.authenticated) {
          state.user = action.payload.user || { authenticated: true }
          state.isAuthenticated = true
        } else {
          state.user = null
          state.isAuthenticated = false
        }
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.loading = false
        state.authChecked = true
        state.user = null
        state.isAuthenticated = false
        state.error = action.payload || 'Auth check failed'
      })
      
      // Login user
      .addCase(loginUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false
        if (action.payload.authenticated) {
          state.user = action.payload.user || { authenticated: true }
          state.isAuthenticated = true
        } else {
          state.error = 'Login failed'
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Login failed'
        state.user = null
        state.isAuthenticated = false
      })
      
      // Register user
      .addCase(registerUser.pending, (state) => {
        state.loading = true
        state.error = null
        state.successMessage = null
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false
        // Registration successful - user will need to login separately
        // Don't automatically authenticate after registration
        state.error = null
        state.successMessage = 'Account created successfully! Please log in with your new credentials.'
        // Clear form data except email for convenience
        state.formData = {
          email: state.formData.email, // Keep email for login
          password: '',
          authCode: '',
          firstName: '',
          lastName: ''
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload || 'Registration failed'
      })
      
      // Logout user
      .addCase(logoutUser.pending, (state) => {
        state.loading = true
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false
        state.user = null
        state.isAuthenticated = false
        state.error = null
      })
      .addCase(logoutUser.rejected, (state) => {
        state.loading = false
        // Clear user state even if logout request failed
        state.user = null
        state.isAuthenticated = false
      })
  },
})

export const { clearError, clearSuccess, updateFormData, clearFormData, clearUser } = userSlice.actions

export default userSlice.reducer
