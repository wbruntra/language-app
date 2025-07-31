import React from 'react'
import LanguageHelper from '../LanguageHelper'
import { useLanguageConfig } from '../hooks/useLanguageHelper'

function Conversation(): React.JSX.Element {
  const { selectedLanguage } = useLanguageConfig()
  
  return (
    <div className="container-fluid px-2 px-sm-3">
      <LanguageHelper selectedLanguage={selectedLanguage} />
    </div>
  )
}

export default Conversation
