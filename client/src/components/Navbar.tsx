import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Offcanvas } from 'react-bootstrap'
import { useUser } from '../hooks/useUser'
import { useLanguageConfig } from '../hooks/useLanguageHelper'
import { setTtsEnabled } from '../store/languageHelperSlice'
import type { RootState, AppDispatch } from '../store'
import type { LanguageCode } from '../types'

// Import LanguageSelector from the existing LanguageHelper file
import { LanguageSelector } from '../LanguageHelper'

interface NavbarProps {
  onLanguageChange: (language: LanguageCode) => void;
}

function Navbar({ onLanguageChange }: NavbarProps): React.JSX.Element {
  const { user, logout } = useUser()
  const { selectedLanguage, currentLanguage } = useLanguageConfig()
  const dispatch = useDispatch<AppDispatch>()
  const ttsEnabled = useSelector((state: RootState) => state.languageHelper.ttsEnabled)
  const [showSidebar, setShowSidebar] = useState(false)

  const handleTtsToggle = (): void => {
    const newTtsEnabled = !ttsEnabled
    dispatch(setTtsEnabled(newTtsEnabled))
    localStorage.setItem('languageHelperTtsEnabled', newTtsEnabled.toString())
  }

  const handleSidebarClose = () => setShowSidebar(false)
  const handleSidebarShow = () => setShowSidebar(true)

  return (
    <>
      <nav id="logged-in-navbar" className="navbar navbar-light bg-light py-2 mb-2 sticky-top">
        <div className="container-fluid px-3">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-outline-secondary btn-sm me-3"
              onClick={handleSidebarShow}
              title="Open menu"
            >
              <i className="bi bi-list"></i>
            </button>
            <div className="navbar-brand mb-0 d-flex flex-column">
              <span className="h6 d-none d-sm-block">{currentLanguage.name} Language Helper</span>
              <span className="small d-block d-sm-none">{currentLanguage.name} Helper</span>
              {user?.first_name && (
                <small className="text-muted" style={{ fontSize: '0.8rem', lineHeight: 1 }}>
                  Welcome back, {user.first_name}!
                </small>
              )}
            </div>
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
              onLanguageChange={onLanguageChange}
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

      {/* Sidebar */}
      <Offcanvas show={showSidebar} onHide={handleSidebarClose} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>
            <i className="bi bi-chat-dots me-2"></i>
            Language Helper
          </Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-grid gap-2">
            <button 
              className="btn btn-outline-primary text-start"
              onClick={() => {
                // Since we only have one route for now, just close the sidebar
                // In the future, this could navigate to different sections
                handleSidebarClose()
              }}
            >
              <i className="bi bi-chat-square-text me-2"></i>
              Conversation Practice
            </button>
            
            {/* Placeholder for future features */}
            <div className="text-muted small mt-3 px-2">
              <em>More features coming soon...</em>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  )
}

export default Navbar
