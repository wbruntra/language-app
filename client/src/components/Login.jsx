import { useState } from 'react'
import { useUser } from '../contexts/UserContext'

function Login() {
  const [password, setPassword] = useState('')
  const [localError, setLocalError] = useState('')
  const { login, loading, error } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')

    if (!password.trim()) {
      setLocalError('Please enter a password')
      return
    }

    const result = await login(password)
    if (!result.success) {
      setLocalError(result.error)
    }
  }

  const displayError = localError || error

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card mt-5">
            <div className="card-body">
              <h2 className="card-title text-center mb-4">Spanish Language Helper</h2>
              <h5 className="card-subtitle mb-3 text-center text-muted">Please log in to continue</h5>
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                
                {displayError && (
                  <div className="alert alert-danger" role="alert">
                    {displayError}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Logging in...' : 'Log In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
