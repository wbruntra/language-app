import { useSelector, useDispatch } from 'react-redux'
import { useEffect } from 'react'
import { 
  checkAuthStatus, 
  loginUser, 
  registerUser, 
  logoutUser, 
  clearError, 
  clearSuccess,
  updateFormData,
  clearFormData,
  clearUser 
} from '../store/userSlice'
import type { RootState, AppDispatch } from '../store'
import type { UserFormData, UseUserReturn } from '../types'

export const useUser = (): UseUserReturn => {
  const dispatch = useDispatch<AppDispatch>()
  const { user, loading, error, successMessage, formData, isAuthenticated, authChecked } = useSelector((state: RootState) => state.user)

  // Check authentication status on app load
  useEffect(() => {
    if (!authChecked) {
      dispatch(checkAuthStatus())
    }
  }, [dispatch, authChecked])

  const login = async (email: string, password: string) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap()
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const register = async (userData: Parameters<UseUserReturn['register']>[0]) => {
    try {
      const result = await dispatch(registerUser(userData)).unwrap()
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const logout = async () => {
    try {
      await dispatch(logoutUser()).unwrap()
      return { success: true }
    } catch (error) {
      return { success: true } // Always treat logout as success
    }
  }

  const clearErrorMessage = () => {
    dispatch(clearError())
  }

  const clearSuccessMessage = () => {
    dispatch(clearSuccess())
  }

  const updateForm = (data: Partial<UserFormData>) => {
    dispatch(updateFormData(data))
  }

  const clearForm = () => {
    dispatch(clearFormData())
  }

  const clearUserData = () => {
    dispatch(clearUser())
  }

  const checkAuthStatusFn = async () => {
    return dispatch(checkAuthStatus())
  }

  return {
    user,
    loading,
    error,
    successMessage,
    formData,
    isAuthenticated,
    authChecked,
    login,
    register,
    logout,
    clearError: clearErrorMessage,
    clearSuccess: clearSuccessMessage,
    updateFormData: updateForm,
    clearFormData: clearForm,
    clearUser: clearUserData,
    checkAuthStatus: checkAuthStatusFn,
  }
}
