import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

function LanguageHelper({ selectedLanguage }) {
  const [transcription, setTranscription] = useState('')
  const [editedTranscription, setEditedTranscription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioLevel, setAudioLevel] = useState(0) // NEW: Audio level for visualization

  // NEW: Conversation state
  const [conversationHistory, setConversationHistory] = useState([])
  const [lastCorrection, setLastCorrection] = useState('')
  const [lastAlternative, setLastAlternative] = useState('')
  const [lastExplanation, setLastExplanation] = useState('')
  const [conversationLoading, setConversationLoading] = useState(false)
  const [correctionExpanded, setCorrectionExpanded] = useState(true)

  // NEW: Scenario state
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [currentScenario, setCurrentScenario] = useState(null)
  const [scenarioSuggestion, setScenarioSuggestion] = useState('')

  // NEW: Follow-up question state
  const [followupHistory, setFollowupHistory] = useState([])
  const [followupLoading, setFollowupLoading] = useState(false)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [followupQuestion, setFollowupQuestion] = useState('')
  const [followupTranscription, setFollowupTranscription] = useState('')
  const [isFollowupRecording, setIsFollowupRecording] = useState(false)

  // NEW: Language configuration state
  const currentSelectedLanguage = selectedLanguage || 'spanish'

  // Language configuration
  const languages = {
    spanish: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    french: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    german: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    italian: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    portuguese: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    english: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  }

  const currentLanguage = languages[currentSelectedLanguage] || languages.spanish

  const shouldTranscribeRef = useRef(true)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const textareaRef = useRef(null)
  const abortControllerRef = useRef(null)
  const timerRef = useRef(null)
  // NEW: Audio visualization refs
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  // Add effect for keyboard event listener
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.ctrlKey && !event.repeat && !loading) {
        if (event.code === 'Space') {
          event.preventDefault()
          if (!isRecording) {
            shouldTranscribeRef.current = true
            startRecording()
          } else {
            shouldTranscribeRef.current = true
            stopRecording()
          }
        } else if (event.code === 'KeyX' && isRecording) {
          event.preventDefault()
          cancelRecording()
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isRecording, loading])

  // Add effect for recording timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingTime(0)
    }

    return () => clearInterval(timerRef.current)
  }, [isRecording])

  // Clear conversation when language changes
  useEffect(() => {
    clearConversation()
  }, [selectedLanguage])

  // NEW: Audio visualization function
  const startAudioVisualization = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)

      analyserRef.current.fftSize = 256
      analyserRef.current.smoothingTimeConstant = 0.8
      source.connect(analyserRef.current)

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

      const updateAudioLevel = () => {
        if (!analyserRef.current) return

        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setAudioLevel(average / 255) // Normalize to 0-1

        animationRef.current = requestAnimationFrame(updateAudioLevel)
      }

      animationRef.current = requestAnimationFrame(updateAudioLevel)
    } catch (err) {
      console.warn('Audio visualization not supported:', err)
    }
  }

  // NEW: Stop audio visualization
  const stopAudioVisualization = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    setAudioLevel(0)
  }

  // MODIFIED: Start recording with visualization
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Start audio visualization
      startAudioVisualization(stream)

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        if (shouldTranscribeRef.current) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' })
          await transcribeAudio(audioBlob)
        }
        stream.getTracks().forEach((track) => track.stop())
        shouldTranscribeRef.current = true

        // Stop visualization when recording stops
        stopAudioVisualization()
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setError('')
      setTranscription('')
    } catch (err) {
      setError('Failed to access microphone. Please allow microphone access.')
      stopAudioVisualization() // Clean up on error
    }
  }

  // MODIFIED: Stop recording with visualization cleanup
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // MODIFIED: Cancel recording with visualization cleanup
  const cancelRecording = () => {
    shouldTranscribeRef.current = false
    stopRecording()
    stopAudioVisualization() // Make sure visualization stops immediately
  }

  // Transcribe the recorded audio
  const transcribeAudio = async (audioBlob) => {
    abortControllerRef.current = new AbortController()
    setLoading(true)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', currentSelectedLanguage)

    try {
      const response = await axios.post('/api/transcribe', formData, {
        signal: abortControllerRef.current.signal,
      })
      setTranscription(response.data)
      setEditedTranscription((prevEdited) =>
        prevEdited ? prevEdited + ' ' + response.data : response.data,
      )
      setError('')
    } catch (err) {
      if (axios.isCancel(err)) {
        setError('Transcription canceled by user.')
      } else {
        const errorMsg = err.response?.data || err.message
        setError(`Failed to transcribe audio: ${errorMsg}`)
      }
    } finally {
      setLoading(false)
      abortControllerRef.current = null
    }
  }

  const cancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setLoading(false)
      setError('Transcription canceled.')
    }
  }

  const handleTranscriptionEdit = (e) => {
    setEditedTranscription(e.target.value)
  }

  // NEW: Handle language change
  const handleLanguageChange = (language) => {
    // This function is now handled in AppContent
    // Clear current conversation when language changes
    clearConversation()
  }

  // NEW: Send message for conversation
  const sendMessage = async () => {
    if (!editedTranscription.trim()) {
      setError('Please enter a message to send.')
      return
    }

    setConversationLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/conversation', {
        userMessage: editedTranscription.trim(),
        conversationHistory: conversationHistory,
        language: currentSelectedLanguage,
      })

      // Update conversation history
      setConversationHistory(response.data.conversationHistory)

      // Show correction, alternative, and explanation
      setLastCorrection(response.data.correction)
      setLastAlternative(response.data.alternative)
      setLastExplanation(response.data.explanation)

      // Expand correction panel when new correction arrives
      setCorrectionExpanded(true)

      // Clear the input for next message
      setEditedTranscription('')
      setTranscription('')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message
      setError(`Failed to send message: ${errorMsg}`)
    } finally {
      setConversationLoading(false)
    }
  }

  // NEW: Clear conversation
  const clearConversation = () => {
    setConversationHistory([])
    setLastCorrection('')
    setLastAlternative('')
    setLastExplanation('')
    setEditedTranscription('')
    setTranscription('')
    setCurrentScenario(null)
    setCorrectionExpanded(true)
  }

  // NEW: Generate conversation scenario
  const generateScenario = async () => {
    setScenarioLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/scenario', {
        suggestion: scenarioSuggestion.trim() || undefined,
        language: currentSelectedLanguage,
      })

      // Set the scenario and start conversation with initial message
      setCurrentScenario({
        title: response.data.title,
        context: response.data.context,
        tips: response.data.tips,
      })

      setConversationHistory(response.data.conversationHistory)

      // Clear the suggestion input
      setScenarioSuggestion('')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message
      setError(`Failed to generate scenario: ${errorMsg}`)
    } finally {
      setScenarioLoading(false)
    }
  }

  // NEW: Follow-up question functions
  const openFollowupModal = () => {
    setShowFollowupModal(true)
    setFollowupQuestion('')
    setFollowupTranscription('')
    setFollowupHistory([])
  }

  const closeFollowupModal = () => {
    setShowFollowupModal(false)
    setFollowupQuestion('')
    setFollowupTranscription('')
    setFollowupHistory([])
    setIsFollowupRecording(false)
  }

  const sendFollowupQuestion = async () => {
    const questionText = followupTranscription || followupQuestion
    if (!questionText.trim()) {
      setError('Please enter a follow-up question.')
      return
    }

    setFollowupLoading(true)
    setError('')

    try {
      // Get the most recent user message from conversation history for context
      const lastUserMessage = conversationHistory
        .filter(msg => msg.role === 'user')
        .pop()?.content || ''

      const correctionContext = {
        original: lastUserMessage,
        correction: lastCorrection,
        alternative: lastAlternative,
        explanation: lastExplanation,
      }

      const response = await axios.post('/api/followup', {
        userQuestion: questionText.trim(),
        correctionContext: correctionContext,
        followupHistory: followupHistory,
        language: currentSelectedLanguage,
      })

      setFollowupHistory(response.data.followupHistory)
      setFollowupQuestion('')
      setFollowupTranscription('')
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message
      setError(`Failed to send follow-up question: ${errorMsg}`)
    } finally {
      setFollowupLoading(false)
    }
  }

  // NEW: Follow-up recording functions
  const startFollowupRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })
      audioChunksRef.current = []

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        
        if (shouldTranscribeRef.current) {
          await transcribeFollowupAudio(audioBlob)
        }
      }

      mediaRecorderRef.current.start()
      setIsFollowupRecording(true)
      setError('')
    } catch (err) {
      setError('Failed to access microphone for follow-up recording.')
    }
  }

  const stopFollowupRecording = () => {
    if (mediaRecorderRef.current && isFollowupRecording) {
      mediaRecorderRef.current.stop()
      setIsFollowupRecording(false)
    }
  }

  const cancelFollowupRecording = () => {
    shouldTranscribeRef.current = false
    stopFollowupRecording()
  }

  const transcribeFollowupAudio = async (audioBlob) => {
    setFollowupLoading(true)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'followup-recording.webm')
    formData.append('language', 'auto-detect') // Use auto-detection for follow-up questions

    try {
      const response = await axios.post('/api/transcribe', formData)
      setFollowupTranscription(response.data)
      setError('')
    } catch (err) {
      const errorMsg = err.response?.data || err.message
      setError(`Failed to transcribe follow-up audio: ${errorMsg}`)
    } finally {
      setFollowupLoading(false)
    }
  }

  // NEW: Audio visualizer component
  const AudioVisualizer = () => (
    <div
      style={{
        width: '200px',
        height: '6px',
        backgroundColor: '#e0e0e0',
        borderRadius: '3px',
        overflow: 'hidden',
        margin: '8px 0',
        border: '1px solid #ccc',
      }}
    >
      <div
        style={{
          width: `${audioLevel * 100}%`,
          height: '100%',
          backgroundColor: audioLevel > 0.7 ? '#dc3545' : audioLevel > 0.3 ? '#fd7e14' : '#28a745',
          transition: 'width 0.1s ease-out',
          borderRadius: '2px',
        }}
      />
    </div>
  )

  const statusText = isRecording
    ? `Recording, ${recordingTime} seconds`
    : loading
    ? 'Transcribing...'
    : 'Idle'

  return (
    <div className="container-fluid px-1">
      {conversationHistory.length === 0 && (
        <div className="alert alert-info mt-2">
          <>
            <h6 className="mb-2">How to Use</h6>
            <ul className="mb-3 small">
              <li>Record yourself speaking {currentLanguage.name} using the microphone</li>
              <li>Edit the transcription if needed</li>
              <li>Send your message to get corrections and continue the conversation</li>
            </ul>
          </>
          <div className="d-none d-md-block">
            <h6 className="mb-1">Keyboard Commands</h6>
            <ul className="mb-0 small">
              <li>Ctrl + Space: Start/Stop Recording</li>
              <li>Ctrl + X: Cancel Recording (while recording)</li>
            </ul>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger mt-2">{error}</div>}

      {/* NEW: Scenario Generator - show when no conversation */}
      {conversationHistory.length === 0 && (
        <div className="scenario-generator mt-3">
          <div className="card">
            <div className="card-body p-3">
              <h6 className="card-title">Start a Conversation</h6>
              <p className="card-text small">
                Get a conversation scenario to practice your {currentLanguage.name}, or start your
                own conversation.
              </p>

              <div className="mb-3">
                <label htmlFor="scenarioSuggestion" className="form-label small">
                  Scenario Suggestion (optional)
                </label>
                <input
                  type="text"
                  id="scenarioSuggestion"
                  className="form-control"
                  value={scenarioSuggestion}
                  onChange={(e) => setScenarioSuggestion(e.target.value)}
                  placeholder="e.g., ordering food, asking directions..."
                  disabled={scenarioLoading}
                />
              </div>

              <button
                className="btn btn-outline-primary w-100"
                onClick={generateScenario}
                disabled={scenarioLoading}
              >
                {scenarioLoading ? 'Generating...' : 'Generate Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Current Scenario Display */}
      {currentScenario && (
        <div className="current-scenario mt-3">
          <div className="alert alert-info p-3">
            <h6>
              <strong>Scenario:</strong> {currentScenario.title}
            </h6>
            <p className="mb-2 small">
              <strong>Context:</strong> {currentScenario.context}
            </p>
            <p className="mb-0 small">
              <strong>Tips:</strong> {currentScenario.tips}
            </p>
          </div>
        </div>
      )}

      {/* NEW: Correction Display */}
      {lastCorrection && (
        <div className="correction-display mt-3">
          <div className="alert alert-success p-3">
            <div
              className="d-flex justify-content-between align-items-center"
              style={{ cursor: 'pointer' }}
              onClick={() => setCorrectionExpanded(!correctionExpanded)}
            >
              <h6 className="mb-0">
                {correctionExpanded
                  ? 'Corrections & Alternatives'
                  : `Corrected: "${
                      lastCorrection === 'Perfect' ? (
                        <span role="img" aria-label="thumbs up">
                          👍
                        </span>
                      ) : (
                        lastCorrection
                      )
                    }"`}
              </h6>
              <span className="badge bg-primary">{correctionExpanded ? '−' : '+'}</span>
            </div>

            <div className={`collapse ${correctionExpanded ? 'show' : ''}`}>
              <div className="mt-3">
                <h6>Corrected Version:</h6>
                <p className="mb-2">
                  <strong>{lastCorrection}</strong>
                </p>

                {lastAlternative && (
                  <>
                    <h6 className="mt-3">Alternative Way to Say It:</h6>
                    <p className="mb-2">
                      <strong>{lastAlternative}</strong>
                    </p>
                  </>
                )}

                {lastExplanation && (
                  <>
                    <h6 className="mt-3">Explanation:</h6>
                    <p className="mb-2 small">{lastExplanation}</p>
                  </>
                )}

                {/* NEW: Follow-up question button */}
                <div className="mt-3 pt-2 border-top">
                  <button
                    className="btn btn-outline-primary btn-sm"
                    onClick={openFollowupModal}
                    disabled={followupLoading}
                  >
                    <i className="bi bi-question-circle me-1"></i>
                    Ask Follow-up Question
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history mt-3">
          <h6>Conversation History</h6>
          <div className="border rounded p-2" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {conversationHistory.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}
              >
                <div
                  className={`d-inline-block p-2 rounded small ${
                    msg.role === 'user' ? 'bg-primary text-white' : 'bg-light border'
                  }`}
                  style={{ maxWidth: '85%' }}
                >
                  <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong> {msg.content}
                </div>
              </div>
            ))}
          </div>
          {/* <button
            className="btn btn-sm btn-outline-secondary mt-2 w-100"
            onClick={clearConversation}
          >
            Clear Conversation
          </button> */}
        </div>
      )}

      <div className="transcription mt-3">
        <h6>Your Message</h6>
        <textarea
          ref={textareaRef}
          value={editedTranscription}
          onChange={handleTranscriptionEdit}
          rows={4}
          className="form-control"
          placeholder={`Speak to transcribe, or type your ${currentLanguage.name} message here...`}
        />
        <div className="mt-2 d-grid">
          <button
            className="btn btn-success"
            onClick={sendMessage}
            disabled={conversationLoading || !editedTranscription.trim()}
          >
            {conversationLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      <div className="controls mt-2">
        <div className="d-flex align-items-center flex-wrap gap-2">
          <div
            className={`recording-indicator ${isRecording ? 'active' : ''} d-none d-sm-block`}
          ></div>
          <button
            className={`btn btn-primary ${
              isRecording ? 'recording' : ''
            } flex-fill flex-sm-grow-0`}
            onClick={() => {
              shouldTranscribeRef.current = true
              isRecording ? stopRecording() : startRecording()
            }}
            disabled={loading}
          >
            <span className="d-none d-sm-inline">
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </span>
            <span className="d-inline d-sm-none">{isRecording ? 'Stop' : 'Record'}</span>
          </button>
          {isRecording && (
            <button className="btn btn-warning flex-fill flex-sm-grow-0" onClick={cancelRecording}>
              <span className="d-none d-sm-inline">Cancel Recording</span>
              <span className="d-inline d-sm-none">Cancel</span>
            </button>
          )}
          {loading && (
            <button
              className="btn btn-danger flex-fill flex-sm-grow-0"
              onClick={cancelTranscription}
            >
              <span className="d-none d-sm-inline">Cancel Transcription</span>
              <span className="d-inline d-sm-none">Cancel</span>
            </button>
          )}
        </div>

        {/* Mobile recording indicator */}
        <div className="d-block d-sm-none mt-3">
          <div className="d-flex align-items-center justify-content-center gap-2">
            <div
              className={`recording-indicator ${isRecording ? 'active' : ''}`}
              style={{ margin: 0 }}
            ></div>
            <small className="text-muted">{statusText}</small>
          </div>
        </div>

        {/* Audio visualization - only show when recording */}
        {isRecording && (
          <div className="mt-2">
            <small className="text-muted">Audio Level:</small>
            <AudioVisualizer />
          </div>
        )}
      </div>

      <p className="my-2 small text-muted d-none d-md-block">
        Recording Status:{' '}
        {isRecording
          ? `Recording, ${recordingTime} seconds`
          : loading
          ? 'Transcribing...'
          : 'Ready'}
      </p>

      {/* NEW: Follow-up Question Modal */}
      {showFollowupModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h6 className="modal-title">Ask a Follow-up Question</h6>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeFollowupModal}
                  disabled={followupLoading}
                ></button>
              </div>
              <div className="modal-body">
                <p className="small text-muted mb-3">
                  Ask questions about the correction, alternative, or explanation you received. 
                  You can type or record your question in any language.
                </p>

                {/* Follow-up conversation history */}
                {followupHistory.length > 0 && (
                  <div className="mb-3">
                    <h6 className="small">Conversation:</h6>
                    <div 
                      className="border rounded p-2" 
                      style={{ maxHeight: '200px', overflowY: 'auto', backgroundColor: '#f8f9fa' }}
                    >
                      {followupHistory.map((msg, index) => (
                        <div key={index} className="mb-2">
                          <div className={`small ${msg.role === 'user' ? 'text-primary fw-bold' : 'text-dark'}`}>
                            <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong> {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question input */}
                <div className="mb-3">
                  <label className="form-label small">Your Follow-up Question:</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={followupTranscription || followupQuestion}
                    onChange={(e) => setFollowupQuestion(e.target.value)}
                    placeholder="Type your question here, or use the microphone to record..."
                    disabled={followupLoading || isFollowupRecording}
                  />
                </div>

                {/* Recording controls for follow-up */}
                <div className="mb-3">
                  <div className="d-flex gap-2 align-items-center">
                    <button
                      className={`btn btn-sm ${isFollowupRecording ? 'btn-danger' : 'btn-outline-primary'}`}
                      onClick={() => {
                        shouldTranscribeRef.current = true
                        isFollowupRecording ? stopFollowupRecording() : startFollowupRecording()
                      }}
                      disabled={followupLoading}
                    >
                      {isFollowupRecording ? 'Stop Recording' : 'Record Question'}
                    </button>
                    
                    {isFollowupRecording && (
                      <button
                        className="btn btn-sm btn-warning"
                        onClick={cancelFollowupRecording}
                      >
                        Cancel
                      </button>
                    )}
                    
                    {isFollowupRecording && (
                      <small className="text-muted">Recording... (auto-detecting language)</small>
                    )}
                  </div>
                </div>

                {/* Error display */}
                {error && <div className="alert alert-danger small">{error}</div>}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeFollowupModal}
                  disabled={followupLoading}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={sendFollowupQuestion}
                  disabled={followupLoading || (!followupQuestion.trim() && !followupTranscription.trim())}
                >
                  {followupLoading ? 'Sending...' : 'Send Question'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Language Selector Component for the navbar
export function LanguageSelector({ selectedLanguage, onLanguageChange }) {
  const [showDropdown, setShowDropdown] = useState(false)

  const languages = {
    spanish: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    french: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    german: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    // italian: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    // portuguese: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    english: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  }

  const currentLanguage = languages[selectedLanguage] || languages.spanish

  return (
    <div className="dropdown">
      <button
        className="btn btn-outline-secondary btn-sm dropdown-toggle"
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-expanded={showDropdown}
      >
        {/* <i className="bi bi-gear me-1"></i> */}
        <span className="d-none d-sm-inline">
          {currentLanguage.flag} {currentLanguage.name}
        </span>
        <span className="d-inline d-sm-none">{currentLanguage.flag}</span>
      </button>

      {showDropdown && (
        <div className="dropdown-menu dropdown-menu-end show" style={{ minWidth: '200px' }}>
          <h6 className="dropdown-header">Choose Language</h6>
          {Object.entries(languages).map(([key, lang]) => (
            <button
              key={key}
              className={`dropdown-item ${selectedLanguage === key ? 'active' : ''}`}
              onClick={() => {
                onLanguageChange(key)
                setShowDropdown(false)
              }}
            >
              {lang.flag} {lang.name}
              <small className="text-muted d-block">{lang.nativeName}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageHelper
