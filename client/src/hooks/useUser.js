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

export const useUser = () => {
  const dispatch = useDispatch()
  const { user, loading, error, successMessage, formData, isAuthenticated, authChecked } = useSelector(state => state.user)

  // Check authentication status on app load
  useEffect(() => {
    if (!authChecked) {
      dispatch(checkAuthStatus())
    }
  }, [dispatch, authChecked])

  const login = async (email, password) => {
    try {
      const result = await dispatch(loginUser({ email, password })).unwrap()
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const register = async (email, password, authCode, firstName = '', lastName = '') => {
    try {
      const result = await dispatch(registerUser({ 
        email, 
        password, 
        authCode, 
        firstName, 
        lastName 
      })).unwrap()
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

  const updateForm = (data) => {
    dispatch(updateFormData(data))
  }

  const clearForm = () => {
    dispatch(clearFormData())
  }

  const clearUserData = () => {
    dispatch(clearUser())
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
  }
}
