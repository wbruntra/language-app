import React from 'react'
import LanguageHelper from '../LanguageHelper'
import type { LanguageCode } from '../types'

interface DashboardProps {
  selectedLanguage: LanguageCode;
}

function Dashboard({ selectedLanguage }: DashboardProps): React.JSX.Element {
  return (
    <div className="container-fluid px-2 px-sm-3">
      <LanguageHelper selectedLanguage={selectedLanguage} />
    </div>
  )
}

export default Dashboard
