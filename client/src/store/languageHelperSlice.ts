import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { 
  LanguageHelperState, 
  ConversationEntry, 
  Scenario, 
  ConversationResult, 
  ScenarioResult, 
  FollowupEntry, 
  LanguageCode 
} from '../types'

// Load initial state from localStorage
const loadInitialLanguage = (): LanguageCode => {
  if (typeof window !== 'undefined') {
    const savedLanguage = localStorage.getItem('languageHelperLanguage')
    if (savedLanguage && ['spanish', 'french', 'german', 'italian', 'portuguese', 'english'].includes(savedLanguage)) {
      return savedLanguage as LanguageCode
    }
  }
  return 'spanish'
}

const loadInitialTtsEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    const savedTtsEnabled = localStorage.getItem('languageHelperTtsEnabled')
    if (savedTtsEnabled !== null) {
      return savedTtsEnabled === 'true'
    }
  }
  return true
}

const initialState: LanguageHelperState = {
  // Recording
  isRecording: false,
  // audioLevel removed - now handled locally
  // recordingTime removed - now handled locally

  // Transcription state
  transcription: '',
  editedTranscription: '',

  // UI State
  loading: false,
  error: null,

  // Conversation state
  conversationHistory: [],
  lastCorrection: '',
  lastAlternative: '',
  lastExplanation: '',
  conversationLoading: false,
  correctionExpanded: true,

  // TTS (Text-to-Speech) state
  ttsEnabled: loadInitialTtsEnabled(), // Load from localStorage
  lastAudioUrl: null,
  isPlayingAudio: false,

  // Scenario state
  scenarioLoading: false,
  currentScenario: null,
  scenarioSuggestion: '',

  // Follow-up question state
  followupHistory: [],
  followupLoading: false,
  showFollowupModal: false,
  followupQuestion: '',
  followupTranscription: '',
  isFollowupRecording: false,

  // Language configuration
  selectedLanguage: loadInitialLanguage(), // Load from localStorage
  languages: {
    spanish: { name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    french: { name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    german: { name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    italian: { name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    portuguese: { name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    english: { name: 'English', nativeName: 'English', flag: '🇺🇸' },
  },
}

const languageHelperSlice = createSlice({
  name: 'languageHelper',
  initialState,
  reducers: {
    // Recording and transcription actions
    setTranscription: (state, action: PayloadAction<string>) => {
      state.transcription = action.payload
    },
    setEditedTranscription: (state, action: PayloadAction<string>) => {
      state.editedTranscription = action.payload
    },
    appendToEditedTranscription: (state, action: PayloadAction<string>) => {
      state.editedTranscription = state.editedTranscription 
        ? state.editedTranscription + ' ' + action.payload 
        : action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setIsRecording: (state, action: PayloadAction<boolean>) => {
      state.isRecording = action.payload
    },
    // setRecordingTime removed - now handled locally
    // incrementRecordingTime removed - now handled locally
    // setAudioLevel removed - now handled locally

    // Conversation actions
    setConversationHistory: (state, action: PayloadAction<ConversationEntry[]>) => {
      state.conversationHistory = action.payload
    },
    addToConversationHistory: (state, action: PayloadAction<ConversationEntry>) => {
      state.conversationHistory.push(action.payload)
    },
    setLastCorrection: (state, action: PayloadAction<string>) => {
      state.lastCorrection = action.payload
    },
    setLastAlternative: (state, action: PayloadAction<string>) => {
      state.lastAlternative = action.payload
    },
    setLastExplanation: (state, action: PayloadAction<string>) => {
      state.lastExplanation = action.payload
    },
    setConversationLoading: (state, action: PayloadAction<boolean>) => {
      state.conversationLoading = action.payload
    },
    setCorrectionExpanded: (state, action: PayloadAction<boolean>) => {
      state.correctionExpanded = action.payload
    },

    // TTS actions
    setTtsEnabled: (state, action: PayloadAction<boolean>) => {
      state.ttsEnabled = action.payload
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('languageHelperTtsEnabled', action.payload.toString())
      }
    },
    setLastAudioUrl: (state, action: PayloadAction<string | null>) => {
      state.lastAudioUrl = action.payload
    },
    setIsPlayingAudio: (state, action: PayloadAction<boolean>) => {
      state.isPlayingAudio = action.payload
    },

    // Scenario actions
    setScenarioLoading: (state, action: PayloadAction<boolean>) => {
      state.scenarioLoading = action.payload
    },
    setCurrentScenario: (state, action: PayloadAction<Scenario | null>) => {
      state.currentScenario = action.payload
    },
    setScenarioSuggestion: (state, action: PayloadAction<string>) => {
      state.scenarioSuggestion = action.payload
    },

    // Follow-up question actions
    setFollowupHistory: (state, action: PayloadAction<FollowupEntry[]>) => {
      state.followupHistory = action.payload
    },
    addToFollowupHistory: (state, action: PayloadAction<FollowupEntry>) => {
      state.followupHistory.push(action.payload)
    },
    setFollowupLoading: (state, action: PayloadAction<boolean>) => {
      state.followupLoading = action.payload
    },
    setShowFollowupModal: (state, action: PayloadAction<boolean>) => {
      state.showFollowupModal = action.payload
    },
    setFollowupQuestion: (state, action: PayloadAction<string>) => {
      state.followupQuestion = action.payload
    },
    setFollowupTranscription: (state, action: PayloadAction<string>) => {
      state.followupTranscription = action.payload
    },
    setIsFollowupRecording: (state, action: PayloadAction<boolean>) => {
      state.isFollowupRecording = action.payload
    },

    // Language actions
    setSelectedLanguage: (state, action: PayloadAction<LanguageCode>) => {
      state.selectedLanguage = action.payload
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('languageHelperLanguage', action.payload)
      }
    },

    // Combined actions for common workflows
    clearConversation: (state) => {
      state.conversationHistory = []
      state.lastCorrection = ''
      state.lastAlternative = ''
      state.lastExplanation = ''
      state.editedTranscription = ''
      state.transcription = ''
      state.currentScenario = null
      state.correctionExpanded = true
    },
    
    clearFollowup: (state) => {
      state.followupHistory = []
      state.followupQuestion = ''
      state.followupTranscription = ''
      state.isFollowupRecording = false
      state.showFollowupModal = false
    },

    resetRecording: (state) => {
      state.isRecording = false
      // recordingTime removed - now handled locally
      // audioLevel removed - now handled locally
    },

    resetTranscription: (state) => {
      state.transcription = ''
      state.editedTranscription = ''
    },

    // Update conversation result (for API responses)
    updateConversationResult: (state, action: PayloadAction<ConversationResult>) => {
      const { conversationHistory, correction, alternative, explanation, audioUrl } = action.payload
      state.conversationHistory = conversationHistory
      state.lastCorrection = correction
      state.lastAlternative = alternative
      state.lastExplanation = explanation
      state.lastAudioUrl = audioUrl || null
      state.correctionExpanded = true
      state.editedTranscription = ''
      state.transcription = ''
    },

    // Update scenario result (for API responses)
    updateScenarioResult: (state, action: PayloadAction<ScenarioResult>) => {
      const { title, context, tips, conversationHistory } = action.payload
      state.currentScenario = { title, context, tips }
      state.conversationHistory = conversationHistory
      state.scenarioSuggestion = ''
    },
  },
})

export const {
  // Recording and transcription actions
  setTranscription,
  setEditedTranscription,
  appendToEditedTranscription,
  setError,
  setLoading,
  setIsRecording,
  // setRecordingTime removed - now handled locally
  // incrementRecordingTime removed - now handled locally
  // setAudioLevel removed - now handled locally

  // Conversation actions
  setConversationHistory,
  addToConversationHistory,
  setLastCorrection,
  setLastAlternative,
  setLastExplanation,
  setConversationLoading,
  setCorrectionExpanded,

  // TTS actions
  setTtsEnabled,
  setLastAudioUrl,
  setIsPlayingAudio,

  // Scenario actions
  setScenarioLoading,
  setCurrentScenario,
  setScenarioSuggestion,

  // Follow-up question actions
  setFollowupHistory,
  addToFollowupHistory,
  setFollowupLoading,
  setShowFollowupModal,
  setFollowupQuestion,
  setFollowupTranscription,
  setIsFollowupRecording,

  // Language actions
  setSelectedLanguage,

  // Combined actions
  clearConversation,
  clearFollowup,
  resetRecording,
  resetTranscription,
  updateConversationResult,
  updateScenarioResult,
} = languageHelperSlice.actions

export default languageHelperSlice.reducer
