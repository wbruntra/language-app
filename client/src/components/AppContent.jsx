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
      <nav className="navbar navbar-light bg-light py-2 mb-2 sticky-top">
        <div className="container-fluid px-3">
          <span className="navbar-brand mb-0 h6 d-none d-sm-block">Spanish Language Helper</span>
          <span className="navbar-brand mb-0 small d-block d-sm-none">Spanish Helper</span>
          <button 
            className="btn btn-outline-secondary btn-sm"
            onClick={logout}
          >
            <span className="d-none d-sm-inline">Logout</span>
            <span className="d-inline d-sm-none">Exit</span>
          </button>
        </div>
      </nav>
      <div className="container-fluid px-2 px-sm-3">
        <LanguageHelper />
      </div>
    </div>
  )
}

export default AppContent
