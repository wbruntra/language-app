import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

function LanguageHelper() {
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
  const [lastExplanation, setLastExplanation] = useState('')
  const [conversationLoading, setConversationLoading] = useState(false)
  
  // NEW: Scenario state
  const [scenarioLoading, setScenarioLoading] = useState(false)
  const [currentScenario, setCurrentScenario] = useState(null)
  const [scenarioSuggestion, setScenarioSuggestion] = useState('')

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
        conversationHistory: conversationHistory
      })

      // Update conversation history
      setConversationHistory(response.data.conversationHistory)
      
      // Show correction and explanation
      setLastCorrection(response.data.correction)
      setLastExplanation(response.data.explanation)
      
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
    setLastExplanation('')
    setEditedTranscription('')
    setTranscription('')
    setCurrentScenario(null)
  }

  // NEW: Generate conversation scenario
  const generateScenario = async () => {
    setScenarioLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/scenario', {
        suggestion: scenarioSuggestion.trim() || undefined
      })

      // Set the scenario and start conversation with initial message
      setCurrentScenario({
        title: response.data.title,
        context: response.data.context,
        tips: response.data.tips
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
    <div className="container">
      <div className="alert alert-info mt-3">
        {conversationHistory.length === 0 && (
          <>
            <h5>How to Use</h5>
            <ul>
              <li>Record yourself speaking Spanish using the microphone</li>
              <li>Edit the transcription if needed</li>
              <li>Send your message to get corrections and continue the conversation</li>
            </ul>
          </>
        )}
        <h6>Keyboard Commands</h6>
        <ul>
          <li>Ctrl + Space: Start/Stop Recording</li>
          <li>Ctrl + X: Cancel Recording (while recording)</li>
        </ul>
      </div>

      <div className="controls mt-3">
        <div className="d-flex align-items-center">
          <div className={`recording-indicator ${isRecording ? 'active' : ''}`}></div>
          <button
            className={`btn btn-sm btn-primary ${isRecording ? 'recording' : ''}`}
            onClick={() => {
              shouldTranscribeRef.current = true
              isRecording ? stopRecording() : startRecording()
            }}
            disabled={loading}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          {isRecording && (
            <button className="btn btn-sm btn-warning ms-2" onClick={cancelRecording}>
              Cancel Recording
            </button>
          )}
          {loading && (
            <button className="btn btn-sm btn-danger ms-2" onClick={cancelTranscription}>
              Cancel Transcription
            </button>
          )}
        </div>

        {/* Audio visualization - only show when recording */}
        {isRecording && (
          <div className="mt-2">
            <small className="text-muted">Audio Level:</small>
            <AudioVisualizer />
          </div>
        )}
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      {/* NEW: Scenario Generator - show when no conversation */}
      {conversationHistory.length === 0 && (
        <div className="scenario-generator mt-4">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Start a Conversation</h5>
              <p className="card-text">
                Get a conversation scenario to practice your Spanish, or start your own conversation.
              </p>
              
              <div className="mb-3">
                <label htmlFor="scenarioSuggestion" className="form-label">
                  Scenario Suggestion (optional)
                </label>
                <input
                  type="text"
                  id="scenarioSuggestion"
                  className="form-control"
                  value={scenarioSuggestion}
                  onChange={(e) => setScenarioSuggestion(e.target.value)}
                  placeholder="e.g., ordering food at a restaurant, asking for directions..."
                  disabled={scenarioLoading}
                />
              </div>
              
              <button 
                className="btn btn-outline-primary"
                onClick={generateScenario}
                disabled={scenarioLoading}
              >
                {scenarioLoading ? 'Generating Scenario...' : 'Generate Conversation Scenario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Current Scenario Display */}
      {currentScenario && (
        <div className="current-scenario mt-4">
          <div className="alert alert-info">
            <h6><strong>Scenario:</strong> {currentScenario.title}</h6>
            <p className="mb-2"><strong>Context:</strong> {currentScenario.context}</p>
            <p className="mb-0"><strong>Tips:</strong> {currentScenario.tips}</p>
          </div>
        </div>
      )}

      {/* NEW: Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history mt-4">
          <h5>Conversation History</h5>
          <div className="border rounded p-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {conversationHistory.map((msg, index) => (
              <div key={index} className={`mb-2 ${msg.role === 'user' ? 'text-end' : 'text-start'}`}>
                <div
                  className={`d-inline-block p-2 rounded ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white' 
                      : 'bg-light border'
                  }`}
                  style={{ maxWidth: '70%' }}
                >
                  <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong> {msg.content}
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-sm btn-outline-secondary mt-2" onClick={clearConversation}>
            Clear Conversation
          </button>
        </div>
      )}

      {/* NEW: Correction Display */}
      {lastCorrection && (
        <div className="correction-display mt-4">
          <div className="alert alert-success">
            <h6>Corrected Version:</h6>
            <p className="mb-1"><strong>{lastCorrection}</strong></p>
            {lastExplanation && (
              <>
                <h6 className="mt-2">Explanation:</h6>
                <p className="mb-0">{lastExplanation}</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="transcription mt-4">
        <h5>Your Message</h5>
        <textarea
          ref={textareaRef}
          value={editedTranscription}
          onChange={handleTranscriptionEdit}
          rows={4}
          className="form-control"
          placeholder="Speak to transcribe, or type your Spanish message here..."
        />
        <div className="mt-2">
          <button 
            className="btn btn-success"
            onClick={sendMessage}
            disabled={conversationLoading || !editedTranscription.trim()}
          >
            {conversationLoading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </div>

      <p className="my-2">
        Recording Status: {isRecording
          ? `Recording, ${recordingTime} seconds`
          : loading
          ? 'Transcribing...'
          : 'Ready'}
      </p>
    </div>
  )
}

export default LanguageHelper
