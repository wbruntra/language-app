import { useUser } from '../contexts/UserContext'
import Login from '../components/Login'
import LanguageHelper, { LanguageSelector } from '../LanguageHelper'
import { useEffect } from 'react'
import { useLanguageConfig } from '../hooks/useLanguageHelper'

function AppContent() {
  const { isAuthenticated, loading, logout } = useUser()
  const { selectedLanguage, currentLanguage, setSelectedLanguage } = useLanguageConfig()

  // Initialize language from localStorage on app start
  useEffect(() => {
    const savedLanguage = localStorage.getItem('languageHelperLanguage')
    if (savedLanguage && savedLanguage !== selectedLanguage) {
      setSelectedLanguage(savedLanguage)
    }
  }, [])

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language)
    localStorage.setItem('languageHelperLanguage', language)
  }

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
          <span className="navbar-brand mb-0 h6 d-none d-sm-block">{currentLanguage.name} Language Helper</span>
          <span className="navbar-brand mb-0 small d-block d-sm-none">{currentLanguage.name} Helper</span>
          <div className="d-flex align-items-center gap-2">
            <LanguageSelector 
              selectedLanguage={selectedLanguage}
              onLanguageChange={handleLanguageChange}
            />
            <button 
              className="btn btn-outline-secondary btn-sm"
              onClick={logout}
            >
              <span className="d-none d-sm-inline">Logout</span>
              <span className="d-inline d-sm-none">Exit</span>
            </button>
          </div>
        </div>
      </nav>
      <div className="container-fluid px-2 px-sm-3">
        <LanguageHelper selectedLanguage={selectedLanguage} />
      </div>
    </div>
  )
}

export default AppContent
