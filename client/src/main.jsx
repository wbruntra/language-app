import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './styles/index.scss'
import { UserProvider } from './contexts/UserContext'
import AppContent from './components/AppContent'
import store from './store'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <UserProvider>
        <AppContent />
      </UserProvider>
    </Provider>
  </StrictMode>,
)
