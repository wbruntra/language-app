import React, { useRef, useState, useEffect } from 'react'
import axios from 'axios'
import AudioVisualizer from './AudioVisualizer'

interface VoiceInputProps {
  onTranscriptionReceived: (text: string) => void
  onError?: (error: string) => void
  language?: string
  disabled?: boolean
  variant?: 'button' | 'icon' | 'mini' | 'dual-button'
  className?: string
  style?: React.CSSProperties
  showControls?: boolean
  showVisualization?: boolean
  placeholder?: string
  buttonText?: {
    start?: string
    stop?: string
    cancel?: string
  }
}

interface VoiceInputState {
  isRecording: boolean
  isTranscribing: boolean
  audioLevel: number
  recordingTime: number
  error: string | null
}

const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscriptionReceived,
  onError,
  language = 'spanish',
  disabled = false,
  variant = 'button',
  className = '',
  style = {},
  showControls = true,
  showVisualization = true,
  placeholder = 'Click microphone to start recording...',
  buttonText = {}
}) => {
  // State
  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isTranscribing: false,
    audioLevel: 0,
    recordingTime: 0,
    error: null
  })

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const shouldTranscribeRef = useRef<boolean>(true)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animationRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Default button text
  const defaultButtonText = {
    start: 'Start Recording',
    stop: 'Stop Recording',
    cancel: 'Cancel',
    ...buttonText
  }

  // Timer effect
  useEffect(() => {
    if (state.isRecording) {
      timerRef.current = setInterval(() => {
        setState(prev => ({ ...prev, recordingTime: prev.recordingTime + 1 }))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setState(prev => ({ ...prev, recordingTime: 0 }))
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [state.isRecording])

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
        setState(prev => ({ ...prev, audioLevel: average / 255 }))

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
    setState(prev => ({ ...prev, audioLevel: 0 }))
  }

  // Recording functions
  const startRecording = async () => {
    if (disabled) return

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
      setState(prev => ({ 
        ...prev, 
        isRecording: true, 
        error: null,
        recordingTime: 0 
      }))
    } catch (err: any) {
      const errorMessage = 'Failed to access microphone. Please allow microphone access.'
      setState(prev => ({ ...prev, error: errorMessage }))
      if (onError) onError(errorMessage)
      stopAudioVisualization()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      setState(prev => ({ ...prev, isRecording: false }))
    }
  }

  const cancelRecording = () => {
    shouldTranscribeRef.current = false
    stopRecording()
    stopAudioVisualization()
    setState(prev => ({ ...prev, error: null }))
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    abortControllerRef.current = new AbortController()
    setState(prev => ({ ...prev, isTranscribing: true, error: null }))
    
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', language)

    try {
      const response = await axios.post('/api/transcribe', formData, {
        signal: abortControllerRef.current.signal,
      })
      
      if (response.data) {
        onTranscriptionReceived(response.data)
      }
    } catch (err: any) {
      let errorMessage = 'Failed to transcribe audio'
      
      if (axios.isCancel(err)) {
        errorMessage = 'Transcription canceled by user.'
      } else {
        errorMessage = err.response?.data || err.message || errorMessage
      }
      
      setState(prev => ({ ...prev, error: errorMessage }))
      if (onError) onError(errorMessage)
    } finally {
      setState(prev => ({ ...prev, isTranscribing: false }))
      abortControllerRef.current = null
    }
  }

  const cancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setState(prev => ({ ...prev, isTranscribing: false, error: null }))
    }
  }

  // Render functions
  const renderButton = () => {
    const isLoading = state.isTranscribing
    const isActive = state.isRecording

    // Handle dual-button variant (like TranscriptionInput)
    if (variant === 'dual-button') {
      if (!isActive) {
        // Show microphone button when not recording
        return (
          <button
            type="button"
            className={`btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center ${className}`}
            style={{ width: '40px', height: '40px', ...style }}
            onClick={startRecording}
            disabled={disabled || isLoading}
            title={defaultButtonText.start}
          >
            <i className="bi bi-mic"></i>
          </button>
        )
      } else {
        // Show both stop (checkmark) and cancel (X) buttons when recording
        return (
          <div className="d-flex align-items-center gap-2">
            {/* Stop/Send recording */}
            <button
              type="button"
              className="btn btn-success btn-sm rounded-circle d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px' }}
              onClick={stopRecording}
              disabled={disabled || isLoading}
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
          </div>
        )
      }
    }

    if (variant === 'mini') {
      return (
        <button
          type="button"
          className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${
            isActive ? 'btn-danger' : 'btn-outline-primary'
          } ${className}`}
          style={{ width: '32px', height: '32px', ...style }}
          onClick={isActive ? stopRecording : startRecording}
          disabled={disabled || isLoading}
          title={isActive ? defaultButtonText.stop : defaultButtonText.start}
        >
          <i className={`bi ${isActive ? 'bi-stop-fill' : 'bi-mic'}`}></i>
        </button>
      )
    }

    if (variant === 'icon') {
      return (
        <button
          type="button"
          className={`btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center ${className}`}
          style={{ width: '40px', height: '40px', ...style }}
          onClick={isActive ? stopRecording : startRecording}
          disabled={disabled || isLoading}
          title={isActive ? defaultButtonText.stop : defaultButtonText.start}
        >
          <i className={`bi ${isActive ? 'bi-stop-fill' : 'bi-mic'}`}></i>
        </button>
      )
    }

    return (
      <button
        type="button"
        className={`btn ${isActive ? 'btn-danger' : 'btn-primary'} ${className}`}
        style={style}
        onClick={isActive ? stopRecording : startRecording}
        disabled={disabled || isLoading}
      >
        <i className={`bi ${isActive ? 'bi-stop-fill me-2' : 'bi-mic me-2'}`}></i>
        {isActive ? defaultButtonText.stop : defaultButtonText.start}
      </button>
    )
  }

  const renderControls = () => {
    if (!showControls || variant === 'mini' || variant === 'dual-button') return null

    return (
      <div className="d-flex gap-2 align-items-center">
        {state.isRecording && (
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={cancelRecording}
            disabled={disabled}
          >
            <i className="bi bi-x-lg me-1"></i>
            {defaultButtonText.cancel}
          </button>
        )}
        
        {state.isTranscribing && (
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={cancelTranscription}
            disabled={disabled}
          >
            <i className="bi bi-x-lg me-1"></i>
            Cancel Transcription
          </button>
        )}
      </div>
    )
  }

  const renderStatus = () => {
    if (variant === 'mini') return null

    if (state.isTranscribing) {
      return (
        <small className="text-muted">
          <span className="spinner-border spinner-border-sm me-1" role="status"></span>
          Transcribing...
        </small>
      )
    }

    if (state.isRecording) {
      return (
        <small className="text-muted">
          Recording... ({state.recordingTime}s)
        </small>
      )
    }

    if (!state.isRecording && !state.isTranscribing) {
      return <small className="text-muted">{placeholder}</small>
    }

    return null
  }

  const renderVisualization = () => {
    if (!showVisualization || !state.isRecording || variant === 'mini') return null

    return (
      <div className="mt-2">
        <AudioVisualizer audioLevel={state.audioLevel} />
      </div>
    )
  }

  const renderError = () => {
    if (!state.error) return null

    return (
      <div className="alert alert-danger alert-sm mt-2" role="alert">
        <small>{state.error}</small>
      </div>
    )
  }

  return (
    <div className="voice-input">
      <div className="d-flex align-items-center gap-2 flex-wrap">
        {renderButton()}
        {renderControls()}
        {variant !== 'mini' && <div className="flex-grow-1">{renderStatus()}</div>}
      </div>
      {renderVisualization()}
      {renderError()}
    </div>
  )
}

export default VoiceInput
