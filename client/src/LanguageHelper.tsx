import { useRef, useEffect, useState } from 'react'
import axios from 'axios'
import { useLanguageHelper } from './hooks/useLanguageHelper'
import { useDispatch } from 'react-redux'
import { clearConversation } from './store/languageHelperSlice'
import RecordingControls from './components/RecordingControls'
import TranscriptionInput from './components/TranscriptionInput'
import type { LanguageCode } from './types'

interface Language {
  flag: string
  name: string
  nativeName: string
}

interface LanguageHelperProps {
  selectedLanguage?: LanguageCode
}

function LanguageHelper({ selectedLanguage }: LanguageHelperProps): React.JSX.Element {
  // Use Redux store via our custom hook
  const {
    // State from store
    error,
    editedTranscription,
    conversationHistory,
    lastCorrection,
    lastAlternative,
    lastExplanation,
    conversationLoading,
    correctionExpanded,
    ttsEnabled,
    lastAudioUrl,
    isPlayingAudio,
    scenarioLoading,
    currentScenario,
    scenarioSuggestion,
    followupHistory,
    followupLoading,
    showFollowupModal,
    followupQuestion,
    followupTranscription,
    isFollowupRecording,
    currentLanguage,
    // Actions from store
    actions
  } = useLanguageHelper()

  // Use dispatch directly for useEffect hooks to avoid dependency issues
  const dispatch = useDispatch()

  // Get the current selected language (either from prop or store)
  const currentSelectedLanguage = selectedLanguage || 'spanish'

  // Refs for follow-up recording functionality only
  const shouldTranscribeRef = useRef<boolean>(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const conversationHistoryRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll to bottom when conversation history changes
  useEffect(() => {
    if (conversationHistoryRef.current) {
      conversationHistoryRef.current.scrollTop = conversationHistoryRef.current.scrollHeight
    }
  }, [conversationHistory, conversationLoading])

  // Clear conversation when language changes
  useEffect(() => {
    dispatch(clearConversation())
  }, [selectedLanguage, dispatch])

  // NEW: Send message for conversation
  const sendMessage = async () => {
    if (!editedTranscription.trim()) {
      actions.setError('Please enter a message to send.')
      return
    }

    const userMessage = editedTranscription.trim()
    
    // Immediately add user message to conversation history
    const updatedHistory = [
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ]
    actions.setConversationHistory(updatedHistory)
    
    // Clear the input and start loading
    actions.setEditedTranscription('')
    actions.setTranscription('')
    actions.setConversationLoading(true)
    actions.setError('')

    try {
      const response = await axios.post('/api/conversations/message', {
        userMessage: userMessage,
        conversationHistory: conversationHistory, // Send original history (without the user message we just added)
        language: currentSelectedLanguage,
        enableTTS: ttsEnabled, // Include TTS setting
      })

      // Update conversation result using the combined action
      actions.updateConversationResult({
        conversationHistory: response.data.conversationHistory,
        correction: response.data.correction,
        alternative: response.data.alternative,
        explanation: response.data.explanation,
        audioUrl: response.data.audioUrl, // Include audio URL
      })
    } catch (err) {
      const error = err as any
      const errorMsg = error.response?.data?.error || error.message
      actions.setError(`Failed to send message: ${errorMsg}`)
      // On error, remove the user message we optimistically added
      actions.setConversationHistory(conversationHistory)
    } finally {
      actions.setConversationLoading(false)
    }
  }

  // NEW: Generate conversation scenario
  const generateScenario = async () => {
    actions.setScenarioLoading(true)
    actions.setError('')

    try {
      const response = await axios.post('/api/conversations/scenario', {
        suggestion: scenarioSuggestion.trim() || undefined,
        language: currentSelectedLanguage,
      })

      // Update scenario result using the combined action
      actions.updateScenarioResult({
        title: response.data.title,
        context: response.data.context,
        tips: response.data.tips,
        conversationHistory: response.data.conversationHistory,
      })
    } catch (err) {
      const error = err as any
      const errorMsg = error.response?.data?.error || error.message
      actions.setError(`Failed to generate scenario: ${errorMsg}`)
    } finally {
      actions.setScenarioLoading(false)
    }
  }

  // NEW: Follow-up question functions
  const openFollowupModal = () => {
    actions.setShowFollowupModal(true)
  }

  const closeFollowupModal = () => {
    actions.setShowFollowupModal(false)
    // Clear the follow-up question and transcription when closing
    actions.setFollowupQuestion('')
    actions.setFollowupTranscription('')
    actions.setIsFollowupRecording(false)
    // Keep the followup history - don't clear it
  }

  const sendFollowupQuestion = async () => {
    const questionText = followupTranscription || followupQuestion
    if (!questionText.trim()) {
      actions.setError('Please enter a follow-up question.')
      return
    }

    actions.setFollowupLoading(true)
    actions.setError('')

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

      const response = await axios.post('/api/conversations/followup', {
        userQuestion: questionText.trim(),
        correctionContext: correctionContext,
        followupHistory: followupHistory,
        language: currentSelectedLanguage,
      })

      actions.setFollowupHistory(response.data.followupHistory)
      actions.setFollowupQuestion('')
      actions.setFollowupTranscription('')
    } catch (err) {
      const error = err as any
      const errorMsg = error.response?.data?.error || error.message
      actions.setError(`Failed to send follow-up question: ${errorMsg}`)
    } finally {
      actions.setFollowupLoading(false)
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
      actions.setIsFollowupRecording(true)
      actions.setError('')
    } catch (err) {
      actions.setError('Failed to access microphone for follow-up recording.')
    }
  }

  const stopFollowupRecording = () => {
    if (mediaRecorderRef.current && isFollowupRecording) {
      mediaRecorderRef.current.stop()
      actions.setIsFollowupRecording(false)
    }
  }

  const cancelFollowupRecording = () => {
    shouldTranscribeRef.current = false
    stopFollowupRecording()
  }

  const transcribeFollowupAudio = async (audioBlob) => {
    actions.setFollowupLoading(true)
    const formData = new FormData()
    formData.append('audio', audioBlob, 'followup-recording.webm')
    formData.append('language', 'auto-detect') // Use auto-detection for follow-up questions

    try {
      const response = await axios.post('/api/transcribe', formData)
      actions.setFollowupTranscription(response.data)
      actions.setError('')
    } catch (err) {
      const error = err as any
      const errorMsg = error.response?.data || error.message
      actions.setError(`Failed to transcribe follow-up audio: ${errorMsg}`)
    } finally {
      actions.setFollowupLoading(false)
    }
  }

  // Audio playback function
  const playAudio = async (audioUrl) => {
    if (!audioUrl) return

    try {
      actions.setIsPlayingAudio(true)
      const audio = new Audio(audioUrl)
      
      audio.onended = () => {
        actions.setIsPlayingAudio(false)
      }
      
      audio.onerror = () => {
        actions.setIsPlayingAudio(false)
        actions.setError('Failed to play audio')
      }
      
      await audio.play()
    } catch (err) {
      actions.setIsPlayingAudio(false)
      const error = err as any
      actions.setError('Failed to play audio: ' + error.message)
    }
  }

  return (
    <div className="container-fluid px-1">
      {conversationHistory.length === 0 && (
        <div className="alert alert-info mt-2">
          <h6 className="mb-2">How to Use</h6>
          <ul className="mb-0 small">
            <li>Use the microphone button to record yourself speaking {currentLanguage.name}</li>
            <li>Edit the transcription if needed in the text area</li>
            <li>Send your message to get corrections and continue the conversation</li>
          </ul>
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
                  onChange={(e) => actions.setScenarioSuggestion(e.target.value)}
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
              onClick={() => actions.setCorrectionExpanded(!correctionExpanded)}
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
          <div 
            ref={conversationHistoryRef}
            className="border rounded p-2" 
            style={{ maxHeight: '300px', overflowY: 'auto' }}
          >
            {conversationHistory.map((msg, index) => {
              // Check if this is the most recent assistant message and has audio
              const isLastAssistantMessage = msg.role === 'assistant' && 
                index === conversationHistory.length - 1 && 
                lastAudioUrl
              
              return (
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
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong>
                        <div 
                          className="mt-1"
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            lineHeight: '1.4'
                          }}
                          dangerouslySetInnerHTML={{
                            __html: msg.content
                              .replace(/\n/g, '<br>')
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.*?)\*/g, '<em>$1</em>')
                              .replace(/`(.*?)`/g, '<code style="background-color: rgba(255,255,255,0.2); padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
                          }}
                        />
                      </div>
                      
                      {/* Play button for the most recent assistant message */}
                      {isLastAssistantMessage && (
                        <button
                          className="btn btn-sm btn-outline-success ms-2 flex-shrink-0"
                          onClick={() => playAudio(lastAudioUrl)}
                          disabled={isPlayingAudio}
                          title="Play audio"
                          style={{ minWidth: '32px', height: '32px' }}
                        >
                          <i className={`bi ${isPlayingAudio ? 'bi-volume-up-fill' : 'bi-play-circle'}`}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {/* Typing indicator when conversation is loading */}
            {conversationLoading && (
              <div className="mb-2 text-start">
                <div className="d-inline-block p-2 rounded small bg-light border" style={{ maxWidth: '85%' }}>
                  <strong>Tutor:</strong>
                  <div className="mt-1 d-flex align-items-center">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <small className="text-muted ms-2">
                      {ttsEnabled ? 'Generating response and audio...' : 'Typing...'}
                    </small>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* <button
            className="btn btn-sm btn-outline-secondary mt-2 w-100"
            onClick={clearConversation}
          >
            Clear Conversation
          </button> */}
        </div>
      )}

      <TranscriptionInput 
        currentLanguage={currentLanguage}
        onSendMessage={sendMessage}
        conversationLoading={conversationLoading}
        currentSelectedLanguage={currentSelectedLanguage}
      />

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
                            <strong>{msg.role === 'user' ? 'You' : 'Tutor'}:</strong>
                            <div 
                              className="mt-1"
                              style={{ 
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                lineHeight: '1.4'
                              }}
                              dangerouslySetInnerHTML={{
                                __html: msg.content
                                  .replace(/\n/g, '<br>')
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                  .replace(/`(.*?)`/g, '<code style="background-color: #f1f3f4; padding: 2px 4px; border-radius: 3px; font-family: monospace;">$1</code>')
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Question input with unified design */}
                <div className="mb-3">
                  <label className="form-label small">Your Follow-up Question:</label>
                  
                  {/* Unified input container with rounded design */}
                  <div className="position-relative">
                    {/* Top section - Textarea */}
                    <div className="bg-white border" style={{ borderRadius: '0.375rem 0.375rem 0 0', borderBottom: 'none' }}>
                      <textarea
                        className="form-control border-0"
                        style={{ 
                          borderRadius: '0.375rem 0.375rem 0 0',
                          resize: 'none',
                          boxShadow: 'none'
                        }}
                        rows={3}
                        value={followupTranscription || followupQuestion}
                        onChange={(e) => actions.setFollowupQuestion(e.target.value)}
                        placeholder="Type your question here, or use the microphone to record..."
                        disabled={followupLoading || isFollowupRecording}
                      />
                    </div>

                    {/* Bottom section - Controls */}
                    <div 
                      className="bg-light border d-flex align-items-center justify-content-between px-3 py-2"
                      style={{ borderRadius: '0 0 0.375rem 0.375rem' }}
                    >
                      <div className="d-flex align-items-center gap-2 flex-grow-1">
                        {followupLoading && (
                          <small className="text-muted">
                            <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                            Transcribing...
                          </small>
                        )}
                        {!followupLoading && !isFollowupRecording && (
                          <small className="text-muted">
                            Auto-detecting language
                          </small>
                        )}
                        {isFollowupRecording && (
                          <small className="text-muted">Recording... (auto-detecting language)</small>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        {/* Recording controls */}
                        {!isFollowupRecording ? (
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}
                            onClick={() => {
                              shouldTranscribeRef.current = true
                              startFollowupRecording()
                            }}
                            disabled={followupLoading}
                            title="Start recording"
                          >
                            <i className="bi bi-mic"></i>
                          </button>
                        ) : (
                          <>
                            {/* Stop/Send recording */}
                            <button
                              type="button"
                              className="btn btn-success btn-sm rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '40px' }}
                              onClick={() => {
                                shouldTranscribeRef.current = true
                                stopFollowupRecording()
                              }}
                              title="Stop and transcribe recording"
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                            
                            {/* Cancel recording */}
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center"
                              style={{ width: '40px', height: '40px' }}
                              onClick={cancelFollowupRecording}
                              title="Cancel recording"
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
  const { languages } = useLanguageHelper()

  // Use the centralized language configuration
  const availableLanguages = languages

  const currentLanguage = availableLanguages[selectedLanguage] || availableLanguages.spanish

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
          {Object.entries(availableLanguages).map(([key, lang]) => (
            <button
              key={key}
              className={`dropdown-item ${selectedLanguage === key ? 'active' : ''}`}
              onClick={() => {
                onLanguageChange(key)
                setShowDropdown(false)
              }}
            >
              {(lang as Language).flag} {(lang as Language).name}
              <small className="text-muted d-block">{(lang as Language).nativeName}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageHelper
