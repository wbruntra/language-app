import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const UserContext = createContext()

export const useUser = () => {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Check authentication status on app load
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get('/api/auth/status')
      if (response.data.authenticated) {
        setUser({ authenticated: true })
      } else {
        setUser(null)
      }
    } catch (err) {
      console.error('Auth status check failed:', err)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (password) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await axios.post('/api/auth/login', { password })
      if (response.data.authenticated) {
        setUser({ authenticated: true })
        return { success: true }
      } else {
        setError('Login failed')
        return { success: false, error: 'Login failed' }
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed'
      setError(errorMsg)
      return { success: false, error: errorMsg }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await axios.get('/api/auth/logout')
      setUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
      // Still clear user state even if logout request fails
      setUser(null)
    }
  }

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user?.authenticated
  }

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
