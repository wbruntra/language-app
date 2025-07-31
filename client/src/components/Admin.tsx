import React, { useState } from 'react'
import axios from 'axios'
import { useUser } from '../hooks/useUser'

function Admin(): React.JSX.Element {
  const { user } = useUser()
  const [ttsText, setTtsText] = useState('')
  const [voice, setVoice] = useState('alloy')
  const [provider, setProvider] = useState('openai')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    audioUrl: string;
    text: string;
    voice: string;
    filename: string;
    provider?: string;
    format?: string;
    sampleRate?: number;
    channels?: number;
  } | null>(null)
  const [error, setError] = useState('')

  // Available voices for OpenAI TTS
  const openaiVoices = [
    { value: 'alloy', label: 'Alloy', description: 'Neutral, clear, warm', gender: 'Neutral' },
    { value: 'ash', label: 'Ash', description: 'Expressive, dynamic, engaging', gender: 'Masculine' },
    { value: 'ballad', label: 'Ballad', description: 'Melodic, emotive, storytelling', gender: 'Feminine/Neutral' },
    { value: 'coral', label: 'Coral', description: 'Vibrant, lively, cheerful', gender: 'Feminine' },
    { value: 'echo', label: 'Echo', description: 'Deep, resonant, authoritative', gender: 'Masculine' },
    { value: 'fable', label: 'Fable', description: 'Smooth, warm, approachable', gender: 'Masculine' },
    { value: 'nova', label: 'Nova', description: 'Bright, energetic, youthful', gender: 'Feminine' },
    { value: 'onyx', label: 'Onyx', description: 'Rich, deep, commanding', gender: 'Masculine' },
    { value: 'sage', label: 'Sage', description: 'Calm, wise, soothing', gender: 'Neutral/Feminine' },
    { value: 'shimmer', label: 'Shimmer', description: 'Sparkling, lively, upbeat', gender: 'Feminine' }
  ]

  // Available voices for Google TTS
  const googleVoices = [
    { value: 'Kore', label: 'Kore', description: 'Clear, natural', gender: 'Neutral' },
    { value: 'Zephyr', label: 'Zephyr', description: 'Gentle, flowing', gender: 'Neutral' },
    { value: 'Charon', label: 'Charon', description: 'Deep, authoritative', gender: 'Masculine' },
    { value: 'Fenrir', label: 'Fenrir', description: 'Strong, powerful', gender: 'Masculine' },
    { value: 'Aoede', label: 'Aoede', description: 'Melodic, expressive', gender: 'Feminine' },
    { value: 'Puck', label: 'Puck', description: 'Playful, energetic', gender: 'Neutral' }
  ]

  const getCurrentVoices = () => provider === 'google' ? googleVoices : openaiVoices

  // Additional security check - shouldn't be accessible without admin rights
  if (!user?.is_admin) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Access Denied</h4>
          <p>You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const handleGenerateTTS = async () => {
    if (!ttsText.trim()) {
      setError('Please enter some text to convert to speech')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await axios.post('/api/admin/text-to-speech', {
        text: ttsText.trim(),
        voice,
        provider
      })

      setResult(response.data)
    } catch (err: any) {
      console.error('TTS generation error:', err)
      const errorMessage = err.response?.data?.error || 'Failed to generate text-to-speech'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider)
    // Reset voice to default for the new provider
    if (newProvider === 'google') {
      setVoice('Kore')
    } else {
      setVoice('alloy')
    }
  }

  const handlePlayAudio = () => {
    if (result?.audioUrl) {
      const audio = new Audio(result.audioUrl)
      audio.play().catch(console.error)
    }
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex align-items-center mb-4">
            <i className="bi bi-shield-check text-warning me-3" style={{ fontSize: '2rem' }}></i>
            <div>
              <h1 className="mb-0">Admin Dashboard</h1>
              <p className="text-muted mb-0">Welcome to the administration panel</p>
            </div>
          </div>

          {/* Admin confirmation card */}
          <div className="row mb-4">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card border-warning">
                <div className="card-header bg-warning text-dark">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-person-check me-2"></i>
                    Admin Status Confirmed
                  </h5>
                </div>
                <div className="card-body">
                  <p className="card-text">
                    Hey there, <strong>{user.first_name || 'Admin'}</strong>! 
                    You're an administrator with special privileges.
                  </p>
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill text-success me-2"></i>
                    <span>Admin access verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text-to-Speech Tool */}
          <div className="row mb-4">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-soundwave me-2"></i>
                    Text-to-Speech Generator
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-12 col-lg-8">
                      <div className="mb-3">
                        <label htmlFor="ttsText" className="form-label">
                          Text to Convert
                        </label>
                        <textarea
                          id="ttsText"
                          className="form-control"
                          rows={4}
                          value={ttsText}
                          onChange={(e) => setTtsText(e.target.value)}
                          placeholder="Enter the text you want to convert to speech..."
                          maxLength={4000}
                          disabled={loading}
                        />
                        <div className="form-text">
                          {ttsText.length}/4000 characters
                        </div>
                      </div>

                      <div className="mb-3">
                        <label htmlFor="provider" className="form-label">
                          TTS Provider
                        </label>
                        <select
                          id="provider"
                          className="form-select"
                          value={provider}
                          onChange={(e) => handleProviderChange(e.target.value)}
                          disabled={loading}
                        >
                          <option value="openai">OpenAI TTS</option>
                          <option value="google">Google TTS</option>
                        </select>
                        <div className="form-text">
                          Choose between OpenAI and Google text-to-speech services
                        </div>
                      </div>

                      <div className="mb-3">
                        <label htmlFor="voice" className="form-label">
                          Voice
                        </label>
                        <select
                          id="voice"
                          className="form-select"
                          value={voice}
                          onChange={(e) => setVoice(e.target.value)}
                          disabled={loading}
                        >
                          {getCurrentVoices().map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label} - {v.description} ({v.gender})
                            </option>
                          ))}
                        </select>
                        <div className="form-text">
                          {getCurrentVoices().find(v => v.value === voice)?.description} - {getCurrentVoices().find(v => v.value === voice)?.gender}
                        </div>
                      </div>

                      <button
                        className="btn btn-primary"
                        onClick={handleGenerateTTS}
                        disabled={loading || !ttsText.trim()}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Generating...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-play-circle me-2"></i>
                            Generate Speech
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Error display */}
                  {error && (
                    <div className="alert alert-danger mt-3" role="alert">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  {/* Result display */}
                  {result && (
                    <div className="alert alert-success mt-3" role="alert">
                      <h6 className="alert-heading">
                        <i className="bi bi-check-circle me-2"></i>
                        Speech Generated Successfully!
                      </h6>
                      <p className="mb-2">
                        <strong>Text:</strong> "{result.text}"<br />
                        <strong>Provider:</strong> {result.provider || 'OpenAI'}<br />
                        <strong>Voice:</strong> {result.voice}<br />
                        <strong>File:</strong> {result.filename}
                        {result.format && (
                          <>
                            <br />
                            <strong>Format:</strong> {result.format}
                          </>
                        )}
                        {result.sampleRate && (
                          <>
                            <br />
                            <strong>Sample Rate:</strong> {result.sampleRate}Hz
                          </>
                        )}
                      </p>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={handlePlayAudio}
                        >
                          <i className="bi bi-play-fill me-1"></i>
                          Play Audio
                        </button>
                        <a
                          href={result.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-secondary"
                        >
                          <i className="bi bi-download me-1"></i>
                          Download
                        </a>
                        <a
                          href={result.audioUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          Open URL
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Admin features placeholder */}
          <div className="row">
            <div className="col-12">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-tools me-2"></i>
                    Future Admin Tools
                  </h5>
                </div>
                <div className="card-body">
                  <p className="text-muted">
                    Additional admin-specific features will be implemented here. Some possibilities include:
                  </p>
                  <ul className="list-unstyled">
                    <li className="mb-2">
                      <i className="bi bi-people me-2 text-primary"></i>
                      User management
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-bar-chart me-2 text-success"></i>
                      System analytics
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-gear me-2 text-warning"></i>
                      System configuration
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-shield-lock me-2 text-danger"></i>
                      Security settings
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-database me-2 text-info"></i>
                      Database management
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Admin
