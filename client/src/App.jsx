import { UserProvider } from './contexts/UserContext'
import AppContent from './components/AppContent'

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  )
}

export default App