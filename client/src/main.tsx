import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './styles/index.scss'
import AppContent from './components/AppContent'
import store from './store'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <AppContent />
    </Provider>
  </StrictMode>,
)
