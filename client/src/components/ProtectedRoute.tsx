import React from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps): React.JSX.Element {
  const { isAuthenticated, loading, authChecked } = useUser()

  // Show loading spinner while checking authentication
  if (loading || !authChecked) {
    return (
      <div className="container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
