import { useRef, useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import AudioVisualizer from './AudioVisualizer'
import {
  setIsRecording,
  setError,
  setTranscription,
  setLoading,
  appendToEditedTranscription
} from '../store/languageHelperSlice'

const RecordingControls = ({ currentSelectedLanguage }) => {
  const dispatch = useDispatch()
  const { 
    isRecording, 
    loading
  } = useSelector((state) => state.languageHelper)

  // Local state for recording functionality (doesn't need to be in Redux)
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
        setAudioLevel(average / 255) // Normalize to 0-1 using local state

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
    setAudioLevel(0) // Reset local state
  }

  // Recording functions
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
      dispatch(setIsRecording(true))
      dispatch(setError(''))
      dispatch(setTranscription(''))
    } catch (err) {
      dispatch(setError('Failed to access microphone. Please allow microphone access.'))
      stopAudioVisualization() // Clean up on error
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
    stopAudioVisualization() // Make sure visualization stops immediately
  }

  // Transcription function
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

  const cancelTranscription = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      dispatch(setLoading(false))
      dispatch(setError('Transcription canceled.'))
    }
  }

  const statusText = isRecording
    ? `Recording, ${recordingTime} seconds`
    : loading
    ? 'Transcribing...'
    : 'Idle'

  return (
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
          <AudioVisualizer audioLevel={audioLevel} />
        </div>
      )}

      <p className="my-2 small text-muted d-none d-md-block">
        Recording Status:{' '}
        {isRecording
          ? `Recording, ${recordingTime} seconds`
          : loading
          ? 'Transcribing...'
          : 'Ready'}
      </p>
    </div>
  )
}

export default RecordingControls
