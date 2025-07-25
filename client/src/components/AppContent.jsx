import { useUser } from '../contexts/UserContext'
import Login from '../components/Login'
import LanguageHelper from '../LanguageHelper'

function AppContent() {
  const { isAuthenticated, loading, logout } = useUser()

  if (loading) {
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

  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <div>
      <nav className="navbar navbar-light bg-light py-1 mb-2">
        <div className="container-fluid">
          <span className="navbar-brand mb-0 h6">Spanish Language Helper</span>
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </nav>
      <LanguageHelper />
    </div>
  )
}

export default AppContent
