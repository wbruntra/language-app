import { useState, useEffect } from 'react'
import { useUser } from '../hooks/useUser'

function Login() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [localError, setLocalError] = useState('')
  const {
    login,
    register,
    loading,
    error,
    successMessage,
    formData,
    clearError,
    clearSuccess,
    updateFormData,
    clearFormData,
  } = useUser()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    updateFormData({ [name]: value })
  }

  useEffect(() => {
    // console log to track local error changes
    console.log('Local error changed:', localError)
  }, [localError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLocalError('')
    clearError()
    clearSuccess()

    if (isRegistering) {
      // Registration form
      const result = await register({
        email: formData.email.trim(),
        password: formData.password,
        authCode: formData.authCode.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
      })

      if (result.success) {
        setIsRegistering(false)
        // Form data is automatically cleared by Redux reducer, keeping email
      } else {
        setLocalError(result.error)
      }
    } else {
      // Login form
      if (!formData.email.trim() || !formData.password.trim()) {
        setLocalError('Please enter both email and password')
        return
      }

      const result = await login(formData.email.trim(), formData.password)
      if (!result.success) {
        setLocalError(result.error)
      }
    }
  }

  const toggleMode = () => {
    setIsRegistering(!isRegistering)
    setLocalError('')
    clearError()
    clearSuccess()
    clearFormData()
  }

  const displayError = localError || error
  const displaySuccess = successMessage

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card mt-5">
            <div className="card-body">
              <h2 className="card-title text-center mb-2">Language Helper</h2>
              <h5 className="card-subtitle mb-4 text-center text-muted">
                {isRegistering ? 'Create a new account' : 'Please log in to continue'}
              </h5>

              <form onSubmit={handleSubmit}>
                {/* Email field */}
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                {/* Password field */}
                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter your password"
                    disabled={loading}
                    required
                  />
                </div>

                {/* Registration-only fields */}
                {isRegistering && (
                  <>
                    <div className="mb-3">
                      <label htmlFor="authCode" className="form-label">
                        Authorization Code <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        id="authCode"
                        name="authCode"
                        className="form-control"
                        value={formData.authCode}
                        onChange={handleInputChange}
                        placeholder="Enter authorization code"
                        disabled={loading}
                        required
                      />
                      <div className="form-text">
                        You need a valid authorization code to create an account.
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="firstName" className="form-label">
                            First Name
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            className="form-control"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            placeholder="First name (optional)"
                            disabled={loading}
                          />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="mb-3">
                          <label htmlFor="lastName" className="form-label">
                            Last Name
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            className="form-control"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            placeholder="Last name (optional)"
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Success message */}
                {displaySuccess && (
                  <div className="alert alert-success" role="alert">
                    {displaySuccess}
                  </div>
                )}

                {/* Error message */}
                {displayError && (
                  <div className="alert alert-danger" role="alert">
                    {displayError}
                  </div>
                )}

                {/* Submit button */}
                <button type="submit" className="btn btn-primary w-100 mb-3" disabled={loading}>
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      {isRegistering ? 'Creating Account...' : 'Logging in...'}
                    </>
                  ) : isRegistering ? (
                    'Create Account'
                  ) : (
                    'Log In'
                  )}
                </button>

                {/* Toggle between login and registration */}
                <div className="text-center">
                  <button
                    type="button"
                    className="btn btn-link text-decoration-none"
                    onClick={toggleMode}
                    disabled={loading}
                  >
                    {isRegistering
                      ? 'Already have an account? Log in here'
                      : 'Need an account? Register here'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
