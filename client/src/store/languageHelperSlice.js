import { createSlice } from '@reduxjs/toolkit'

const initialState = {
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
  selectedLanguage: 'spanish',
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
    setTranscription: (state, action) => {
      state.transcription = action.payload
    },
    setEditedTranscription: (state, action) => {
      state.editedTranscription = action.payload
    },
    appendToEditedTranscription: (state, action) => {
      state.editedTranscription = state.editedTranscription 
        ? state.editedTranscription + ' ' + action.payload 
        : action.payload
    },
    setError: (state, action) => {
      state.error = action.payload
    },
    setLoading: (state, action) => {
      state.loading = action.payload
    },
    setIsRecording: (state, action) => {
      state.isRecording = action.payload
    },
    // setRecordingTime removed - now handled locally
    // incrementRecordingTime removed - now handled locally
    // setAudioLevel removed - now handled locally

    // Conversation actions
    setConversationHistory: (state, action) => {
      state.conversationHistory = action.payload
    },
    addToConversationHistory: (state, action) => {
      state.conversationHistory.push(action.payload)
    },
    setLastCorrection: (state, action) => {
      state.lastCorrection = action.payload
    },
    setLastAlternative: (state, action) => {
      state.lastAlternative = action.payload
    },
    setLastExplanation: (state, action) => {
      state.lastExplanation = action.payload
    },
    setConversationLoading: (state, action) => {
      state.conversationLoading = action.payload
    },
    setCorrectionExpanded: (state, action) => {
      state.correctionExpanded = action.payload
    },

    // Scenario actions
    setScenarioLoading: (state, action) => {
      state.scenarioLoading = action.payload
    },
    setCurrentScenario: (state, action) => {
      state.currentScenario = action.payload
    },
    setScenarioSuggestion: (state, action) => {
      state.scenarioSuggestion = action.payload
    },

    // Follow-up question actions
    setFollowupHistory: (state, action) => {
      state.followupHistory = action.payload
    },
    addToFollowupHistory: (state, action) => {
      state.followupHistory.push(action.payload)
    },
    setFollowupLoading: (state, action) => {
      state.followupLoading = action.payload
    },
    setShowFollowupModal: (state, action) => {
      state.showFollowupModal = action.payload
    },
    setFollowupQuestion: (state, action) => {
      state.followupQuestion = action.payload
    },
    setFollowupTranscription: (state, action) => {
      state.followupTranscription = action.payload
    },
    setIsFollowupRecording: (state, action) => {
      state.isFollowupRecording = action.payload
    },

    // Language actions
    setSelectedLanguage: (state, action) => {
      state.selectedLanguage = action.payload
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
    updateConversationResult: (state, action) => {
      const { conversationHistory, correction, alternative, explanation } = action.payload
      state.conversationHistory = conversationHistory
      state.lastCorrection = correction
      state.lastAlternative = alternative
      state.lastExplanation = explanation
      state.correctionExpanded = true
      state.editedTranscription = ''
      state.transcription = ''
    },

    // Update scenario result (for API responses)
    updateScenarioResult: (state, action) => {
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
