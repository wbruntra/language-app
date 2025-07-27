import { useRef, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import { 
  setEditedTranscription, 
  setIsRecording, 
  setError, 
  setTranscription, 
  setLoading, 
  appendToEditedTranscription 
} from '../store/languageHelperSlice'
import AudioVisualizer from './AudioVisualizer'

const TranscriptionInput = ({ currentLanguage, onSendMessage, conversationLoading, currentSelectedLanguage }) => {
  const dispatch = useDispatch()
  const { editedTranscription, isRecording, loading } = useSelector((state) => state.languageHelper)
  const textareaRef = useRef(null)

  // Local state for recording functionality
  const [audioLevel, setAudioLevel] = useState(0)
  const [recordingTime, setRecordingTime] = useState(0)

  // Refs for recording functionality
  const shouldTranscribeRef = useRef(true)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const abortControllerRef = useRef(null)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const analyserRef = useRef(null)
  const animationRef = useRef(null)

  const handleTranscriptionEdit = (e) => {
    dispatch(setEditedTranscription(e.target.value))
  }

  // Recording timer effect
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } else {
      clearInterval(timerRef.current)
      setRecordingTime(0)
    }

    return () => clearInterval(timerRef.current)
  }, [isRecording])

  // Keyboard controls effect
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

  // Audio visualization functions
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
        setAudioLevel(average / 255)

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
    setAudioLevel(0)
  }

  // Recording functions
  const startRecording = async () => {
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
      dispatch(setIsRecording(true))
      dispatch(setError(''))
      dispatch(setTranscription(''))
    } catch (err) {
      dispatch(setError('Failed to access microphone. Please allow microphone access.'))
      stopAudioVisualization()
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      dispatch(setIsRecording(false))
    }
  }

  const cancelRecording = () => {
    shouldTranscribeRef.current = false
    stopRecording()
    stopAudioVisualization()
  }

  const transcribeAudio = async (audioBlob) => {
    abortControllerRef.current = new AbortController()
    dispatch(setLoading(true))
    const formData = new FormData()
    formData.append('audio', audioBlob, 'recording.webm')
    formData.append('language', currentSelectedLanguage)

    try {
      const response = await axios.post('/api/transcribe', formData, {
        signal: abortControllerRef.current.signal,
      })
      dispatch(setTranscription(response.data))
      dispatch(appendToEditedTranscription(response.data))
      dispatch(setError(''))
    } catch (err) {
      if (axios.isCancel(err)) {
        dispatch(setError('Transcription canceled by user.'))
      } else {
        const errorMsg = err.response?.data || err.message
        dispatch(setError(`Failed to transcribe audio: ${errorMsg}`))
      }
    } finally {
      dispatch(setLoading(false))
      abortControllerRef.current = null
    }
  }

  return (
    <div className="transcription mt-3">
      <h6>Your Message</h6>
      
      {/* Unified input container with rounded design */}
      <div className="position-relative">
        {/* Top section - Textarea */}
        <div className="bg-white border" style={{ borderRadius: '0.375rem 0.375rem 0 0', borderBottom: 'none' }}>
          <textarea
            ref={textareaRef}
            value={editedTranscription}
            onChange={handleTranscriptionEdit}
            rows={4}
            className="form-control border-0"
            style={{ 
              borderRadius: '0.375rem 0.375rem 0 0',
              resize: 'none',
              boxShadow: 'none'
            }}
            placeholder={`Speak to transcribe, or type your ${currentLanguage.name} message here...`}
            disabled={loading || isRecording}
          />
        </div>

        {/* Bottom section - Controls */}
        <div 
          className="bg-light border d-flex align-items-center justify-content-between px-3 py-2"
          style={{ borderRadius: '0 0 0.375rem 0.375rem' }}
        >
          <div className="d-flex align-items-center gap-2 flex-grow-1">
            {loading && (
              <small className="text-muted">
                <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                Transcribing...
              </small>
            )}
            {!loading && !isRecording && (
              <small className="text-muted d-none d-md-inline">
                Ctrl+Space to record • Ctrl+X to cancel
              </small>
            )}
            {isRecording && (
              <div className="d-flex align-items-center gap-2 flex-grow-1">
                <small className="text-muted">Recording ({recordingTime}s):</small>
                <div className="flex-grow-1">
                  <AudioVisualizer audioLevel={audioLevel} />
                </div>
              </div>
            )}
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Recording controls */}
            {!isRecording ? (
              <button
                type="button"
                className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '40px', height: '40px' }}
                onClick={() => {
                  shouldTranscribeRef.current = true
                  startRecording()
                }}
                disabled={loading}
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
                    stopRecording()
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
                  onClick={cancelRecording}
                  title="Cancel recording"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Send message button */}
      <div className="mt-2 d-grid">
        <button
          className="btn btn-success"
          onClick={onSendMessage}
          disabled={conversationLoading || !editedTranscription.trim() || isRecording || loading}
        >
          {conversationLoading ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </div>
  )
}

export default TranscriptionInput
