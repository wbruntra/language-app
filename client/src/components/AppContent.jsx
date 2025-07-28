import { useUser } from '../hooks/useUser'
import Login from '../components/Login'
import LanguageHelper, { LanguageSelector } from '../LanguageHelper'
import { useEffect } from 'react'
import { useLanguageConfig } from '../hooks/useLanguageHelper'
import { useSelector, useDispatch } from 'react-redux'
import { setTtsEnabled } from '../store/languageHelperSlice'

function AppContent() {
  const { user, isAuthenticated, loading, logout } = useUser()
  const { selectedLanguage, currentLanguage, setSelectedLanguage } = useLanguageConfig()
  const dispatch = useDispatch()
  const ttsEnabled = useSelector(state => state.languageHelper.ttsEnabled)

  // Initialize language from localStorage on app start
  useEffect(() => {
    const savedLanguage = localStorage.getItem('languageHelperLanguage')
    if (savedLanguage && savedLanguage !== selectedLanguage) {
      setSelectedLanguage(savedLanguage)
    }

    // Initialize TTS setting from localStorage
    const savedTtsEnabled = localStorage.getItem('languageHelperTtsEnabled')
    if (savedTtsEnabled !== null) {
      dispatch(setTtsEnabled(savedTtsEnabled === 'true'))
    }
  }, [])

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language)
    localStorage.setItem('languageHelperLanguage', language)
  }

  const handleTtsToggle = () => {
    const newTtsEnabled = !ttsEnabled
    dispatch(setTtsEnabled(newTtsEnabled))
    localStorage.setItem('languageHelperTtsEnabled', newTtsEnabled.toString())
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
      <nav id="logged-in-navbar" className="navbar navbar-light bg-light py-2 mb-2 sticky-top">
        <div className="container-fluid px-3">
          <div className="navbar-brand mb-0 d-flex flex-column">
            <span className="h6 d-none d-sm-block">{currentLanguage.name} Language Helper</span>
            <span className="small d-block d-sm-none">{currentLanguage.name} Helper</span>
            {user?.first_name && (
              <small className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1 }}>
                Welcome back, {user.first_name}!
              </small>
            )}
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              className={`btn btn-sm ${ttsEnabled ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={handleTtsToggle}
              title={`Text-to-Speech: ${ttsEnabled ? 'On' : 'Off'}`}
            >
              <i className={`bi ${ttsEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`}></i>
              <span className="d-none d-md-inline ms-1">
                {ttsEnabled ? 'TTS On' : 'TTS Off'}
              </span>
            </button>
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
