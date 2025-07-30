import React, { useRef, useState, useEffect } from 'react'
import axios from 'axios'
import AudioVisualizer from './AudioVisualizer'

interface UnifiedTextInputProps {
  value: string
  onChange: (value: string) => void
  onVoiceTranscription?: (text: string) => void
  onVoiceError?: (error: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  language?: string
  showVoiceControls?: boolean
  showVisualization?: boolean
  showKeyboardShortcuts?: boolean
  className?: string
  textareaClassName?: string
  controlsClassName?: string
  maxLength?: number
  showCharacterCount?: boolean
}

interface VoiceState {
  isRecording: boolean
  isTranscribing: boolean
  audioLevel: number
  recordingTime: number
  error: string | null
}

const UnifiedTextInput: React.FC<UnifiedTextInputProps> = ({
  value,
  onChange,
  onVoiceTranscription,
  onVoiceError,
  placeholder = 'Type your message here...',
  rows = 4,
  disabled = false,
  language = 'spanish',
  showVoiceControls = true,
  showVisualization = true,
  showKeyboardShortcuts = true,
  className = '',
  textareaClassName = '',
  controlsClassName = '',
  maxLength,
  showCharacterCount = false
}) => {
  // Voice recording state
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isRecording: false,
    isTranscribing: false,
    audioLevel: 0,
    recordingTime: 0,
    error: null
  })

  // Refs for voice functionality
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const shouldTranscribeRef = useRef<boolean>(true)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (!maxLength || newValue.length <= maxLength) {
      onChange(newValue)
    }
  }

  // Recording timer effect
  useEffect(() => {
    if (voiceState.isRecording) {
      timerRef.current = setInterval(() => {
        setVoiceState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setVoiceState(prev => ({ ...prev, recordingTime: 0 }))
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [voiceState.isRecording])

  // Keyboard controls effect
  useEffect(() => {
    if (!showVoiceControls) return

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && !event.repeat && !voiceState.isTranscribing) {
        if (event.code === 'Space') {
          event.preventDefault()
          if (!voiceState.isRecording) {
            shouldTranscribeRef.current = true
            startRecording()
          } else {
            shouldTranscribeRef.current = true
            stopRecording()
          }
        } else if (event.code === 'KeyX' && voiceState.isRecording) {
          event.preventDefault()
          cancelRecording()
        }
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [voiceState.isRecording, voiceState.isTranscribing, showVoiceControls])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
      stopAudioVisualization()
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Audio visualization functions
  const startAudioVisualization = (stream: MediaStream) => {
    if (!showVisualization) return

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
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
        setVoiceState(prev => ({ ...prev, audioLevel: average / 255 }))

        animationRef.current = requestAnimationFrame(updateAudioLevel)
      }

      animationRef.current = requestAnimationFrame(updateAudioLevel)
    } catch (err) {
      console.warn('Audio visualization not supported:', err)
    }
  }

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
    setVoiceState(prev => ({ ...prev, audioLevel: 0 }))
  }

  // Recording functions
  const startRecording = async () => {
    if (disabled || !showVoiceControls) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

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
        stopAudioVisualization()
      }

      mediaRecorderRef.current.start()
      setVoiceState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        recordingTime: 0 
      }))
    } catch (err: any) {
      const errorMessage = 'Failed to access microphone. Please allow microphone access.'
      setVoiceState(prev => ({ ...prev, error: errorMessage }))
      if (onVoiceError) onVoiceError(errorMessage)
      stopAudioVisualization()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && voiceState.isRecording) {
      mediaRecorderRef.current.stop()
      setVoiceState(prev => ({ ...prev, isRecording: false }))
    }
  }

  const cancelRecording = () => {
    shouldTranscribeRef.current = false
    stopRecording()
    stopAudioVisualization()
    setVoiceState(prev => ({ ...prev, error: null }))
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    abortControllerRef.current = new AbortController()
    setVoiceState(prev => ({ ...prev, isTranscribing: true, error: null }))
    
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', language)

    try {
      const response = await axios.post('/api/transcribe', formData, {
        signal: abortControllerRef.current.signal,
      })
      
      if (response.data && onVoiceTranscription) {
        // Append to existing text or set if empty
        const currentText = value.trim()
        const newText = currentText 
          ? `${currentText} ${response.data}` 
          : response.data
        onChange(newText)
        onVoiceTranscription(response.data)
      }
    } catch (err: any) {
      let errorMessage = 'Failed to transcribe audio'
      
      if (axios.isCancel(err)) {
        errorMessage = 'Transcription canceled by user.'
      } else {
        errorMessage = err.response?.data || err.message || errorMessage
      }
      
      setVoiceState(prev => ({ ...prev, error: errorMessage }))
      if (onVoiceError) onVoiceError(errorMessage)
    } finally {
      setVoiceState(prev => ({ ...prev, isTranscribing: false }))
      abortControllerRef.current = null
    }
  }

  const cancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setVoiceState(prev => ({ ...prev, isTranscribing: false, error: null }))
    }
  }

  // Render status content for the control bar
  const renderStatusContent = () => {
    if (voiceState.isTranscribing) {
      return (
        <small className="text-muted">
          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
          Transcribing...
        </small>
      )
    }

    if (voiceState.isRecording && showVisualization) {
      return (
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          <small className="text-muted">Recording ({voiceState.recordingTime}s):</small>
          <div className="flex-grow-1">
            <AudioVisualizer audioLevel={voiceState.audioLevel} />
          </div>
        </div>
      )
    }

    if (voiceState.isRecording && !showVisualization) {
      return (
        <small className="text-muted">Recording ({voiceState.recordingTime}s)</small>
      )
    }

    if (showKeyboardShortcuts && showVoiceControls) {
      return (
        <small className="text-muted d-none d-md-inline">
          Ctrl+Space to record • Ctrl+X to cancel
        </small>
      )
    }

    return null
  }

  // Render voice control buttons
  const renderVoiceControls = () => {
    if (!showVoiceControls) return null

    if (!voiceState.isRecording) {
      return (
        <button
          type="button"
          className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px' }}
          onClick={() => {
            shouldTranscribeRef.current = true
            startRecording()
          }}
          disabled={disabled || voiceState.isTranscribing}
          title="Start recording"
        >
          <i className="bi bi-mic"></i>
        </button>
      )
    }

    return (
      <>
        {/* Stop/Send recording */}
        <button
          type="button"
          className="btn btn-success btn-sm rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px' }}
          onClick={() => {
            shouldTranscribeRef.current = true
            stopRecording()
          }}
          disabled={disabled || voiceState.isTranscribing}
          title="Stop and transcribe recording"
        >
          <i className="bi bi-check-lg"></i>
        </button>
        
        {/* Cancel recording */}
        <button
          type="button"
          className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px' }}
          onClick={cancelRecording}
          disabled={disabled}
          title="Cancel recording"
        >
          <i className="bi bi-x-lg"></i>
        </button>
      </>
    )
  }

  // Render character count if enabled
  const renderCharacterCount = () => {
    if (!showCharacterCount) return null

    const count = value.length
    const isNearLimit = maxLength && count > maxLength * 0.8
    const isOverLimit = maxLength && count > maxLength

    return (
      <small className={`text-muted ${isOverLimit ? 'text-danger' : isNearLimit ? 'text-warning' : ''}`}>
        {count}{maxLength ? `/${maxLength}` : ''} characters
      </small>
    )
  }

  return (
    <div className={`unified-text-input ${className}`}>
      {/* Unified input container with rounded design */}
      <div className="position-relative">
        {/* Top section - Textarea */}
        <div className="bg-white border" style={{ borderRadius: '0.375rem 0.375rem 0 0', borderBottom: 'none' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleTextChange}
            rows={rows}
            className={`form-control border-0 ${textareaClassName}`}
            style={{ 
              borderRadius: '0.375rem 0.375rem 0 0',
              resize: 'none',
              boxShadow: 'none'
            }}
            placeholder={placeholder}
            disabled={disabled || voiceState.isRecording}
            maxLength={maxLength}
          />
        </div>

        {/* Bottom section - Controls */}
        <div 
          className={`bg-light border d-flex align-items-center justify-content-between px-3 py-2 ${controlsClassName}`}
          style={{ borderRadius: '0 0 0.375rem 0.375rem' }}
        >
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            {renderStatusContent()}
            {renderCharacterCount()}
          </div>

          <div className="d-flex align-items-center gap-2">
            {renderVoiceControls()}
            {voiceState.isTranscribing && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px' }}
                onClick={cancelTranscription}
                disabled={disabled}
                title="Cancel transcription"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error display */}
      {voiceState.error && (
        <div className="alert alert-danger alert-sm mt-2" role="alert">
          <small>{voiceState.error}</small>
        </div>
      )}
    </div>
  )
}

export default UnifiedTextInput
