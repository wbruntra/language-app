import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useLanguageConfig } from '../hooks/useLanguageHelper'
import { setTtsEnabled } from '../store/languageHelperSlice'
import type { AppDispatch } from '../store'
import type { LanguageCode } from '../types'

function MainLayout(): React.JSX.Element {
  const { selectedLanguage, setSelectedLanguage } = useLanguageConfig()
  const dispatch = useDispatch<AppDispatch>()

  // Initialize language and TTS settings from localStorage on app start
  useEffect(() => {
    const savedLanguage = localStorage.getItem('languageHelperLanguage')
    if (savedLanguage && savedLanguage !== selectedLanguage) {
      setSelectedLanguage(savedLanguage as LanguageCode)
    }

    // Initialize TTS setting from localStorage
    const savedTtsEnabled = localStorage.getItem('languageHelperTtsEnabled')
    if (savedTtsEnabled !== null) {
      dispatch(setTtsEnabled(savedTtsEnabled === 'true'))
    }
  }, [selectedLanguage, setSelectedLanguage, dispatch])

  const handleLanguageChange = (language: LanguageCode): void => {
    setSelectedLanguage(language)
    localStorage.setItem('languageHelperLanguage', language)
  }

  return (
    <div>
      <Navbar onLanguageChange={handleLanguageChange} />
      <Outlet />
    </div>
  )
}

export default MainLayout
