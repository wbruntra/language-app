import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useLanguageConfig } from '../hooks/useLanguageHelper'
import type { LanguageCode } from '../types'

function MainLayout(): React.JSX.Element {
  const { setSelectedLanguage } = useLanguageConfig()

  const handleLanguageChange = (language: LanguageCode): void => {
    setSelectedLanguage(language) // This now automatically persists to localStorage
  }

  return (
    <div>
      <Navbar onLanguageChange={handleLanguageChange} />
      <Outlet />
    </div>
  )
}

export default MainLayout
