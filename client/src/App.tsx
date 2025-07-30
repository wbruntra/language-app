import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './components/Login'
import MainLayout from './components/MainLayout'
import Dashboard from './components/Dashboard'
import Vocabulary from './components/Vocabulary'
import TabooGame from './components/TabooGame'
import Stories from './components/Stories'
import ProtectedRoute from './components/ProtectedRoute'
import { useUser } from './hooks/useUser'

function App(): React.JSX.Element {
  const { isAuthenticated, authChecked } = useUser()

  // Show loading while checking auth status
  if (!authChecked) {
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

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="dashboard" 
            element={<Dashboard />} 
          />
          <Route 
            path="vocabulary" 
            element={<Vocabulary />} 
          />
          <Route 
            path="taboo" 
            element={<TabooGame />} 
          />
          <Route 
            path="stories" 
            element={<Stories />} 
          />
          <Route 
            path="stories/:storyId" 
            element={<Stories />} 
          />
        </Route>
        
        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
