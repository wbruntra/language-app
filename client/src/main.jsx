import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './styles/index.scss'
import AppContent from './components/AppContent'
import store from './store'


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AppContent />
    </Provider>
  </StrictMode>,
)
