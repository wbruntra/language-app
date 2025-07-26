import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.scss'
import { UserProvider } from './contexts/UserContext'
import AppContent from './components/AppContent'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <AppContent />
    </UserProvider>
  </StrictMode>,
)
