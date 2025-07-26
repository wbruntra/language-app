import { useSelector, useDispatch } from 'react-redux'
import {
  setTranscription,
  setEditedTranscription,
  appendToEditedTranscription,
  setError,
  setLoading,
  setIsRecording,
  setRecordingTime,
  incrementRecordingTime,
  setAudioLevel,
  setConversationHistory,
  addToConversationHistory,
  setLastCorrection,
  setLastAlternative,
  setLastExplanation,
  setConversationLoading,
  setCorrectionExpanded,
  setScenarioLoading,
  setCurrentScenario,
  setScenarioSuggestion,
  setFollowupHistory,
  addToFollowupHistory,
  setFollowupLoading,
  setShowFollowupModal,
  setFollowupQuestion,
  setFollowupTranscription,
  setIsFollowupRecording,
  setSelectedLanguage,
  clearConversation,
  clearFollowup,
  resetRecording,
  resetTranscription,
  updateConversationResult,
  updateScenarioResult,
} from '../store/languageHelperSlice'

// Main hook to access all language helper state and actions
export const useLanguageHelper = () => {
  const dispatch = useDispatch()
  const state = useSelector((state) => state.languageHelper)

  return {
    // State
    ...state,
    
    // Computed state
    currentLanguage: state.languages[state.selectedLanguage] || state.languages.spanish,
    
    // Actions
    actions: {
      // Recording and transcription
      setTranscription: (payload) => dispatch(setTranscription(payload)),
      setEditedTranscription: (payload) => dispatch(setEditedTranscription(payload)),
      appendToEditedTranscription: (payload) => dispatch(appendToEditedTranscription(payload)),
      setError: (payload) => dispatch(setError(payload)),
      setLoading: (payload) => dispatch(setLoading(payload)),
      setIsRecording: (payload) => dispatch(setIsRecording(payload)),
      setRecordingTime: (payload) => dispatch(setRecordingTime(payload)),
      incrementRecordingTime: () => dispatch(incrementRecordingTime()),
      setAudioLevel: (payload) => dispatch(setAudioLevel(payload)),

      // Conversation
      setConversationHistory: (payload) => dispatch(setConversationHistory(payload)),
      addToConversationHistory: (payload) => dispatch(addToConversationHistory(payload)),
      setLastCorrection: (payload) => dispatch(setLastCorrection(payload)),
      setLastAlternative: (payload) => dispatch(setLastAlternative(payload)),
      setLastExplanation: (payload) => dispatch(setLastExplanation(payload)),
      setConversationLoading: (payload) => dispatch(setConversationLoading(payload)),
      setCorrectionExpanded: (payload) => dispatch(setCorrectionExpanded(payload)),

      // Scenario
      setScenarioLoading: (payload) => dispatch(setScenarioLoading(payload)),
      setCurrentScenario: (payload) => dispatch(setCurrentScenario(payload)),
      setScenarioSuggestion: (payload) => dispatch(setScenarioSuggestion(payload)),

      // Follow-up
      setFollowupHistory: (payload) => dispatch(setFollowupHistory(payload)),
      addToFollowupHistory: (payload) => dispatch(addToFollowupHistory(payload)),
      setFollowupLoading: (payload) => dispatch(setFollowupLoading(payload)),
      setShowFollowupModal: (payload) => dispatch(setShowFollowupModal(payload)),
      setFollowupQuestion: (payload) => dispatch(setFollowupQuestion(payload)),
      setFollowupTranscription: (payload) => dispatch(setFollowupTranscription(payload)),
      setIsFollowupRecording: (payload) => dispatch(setIsFollowupRecording(payload)),

      // Language
      setSelectedLanguage: (payload) => dispatch(setSelectedLanguage(payload)),

      // Combined actions
      clearConversation: () => dispatch(clearConversation()),
      clearFollowup: () => dispatch(clearFollowup()),
      resetRecording: () => dispatch(resetRecording()),
      resetTranscription: () => dispatch(resetTranscription()),
      updateConversationResult: (payload) => dispatch(updateConversationResult(payload)),
      updateScenarioResult: (payload) => dispatch(updateScenarioResult(payload)),
    },
  }
}

// Convenience hooks for specific parts of the state
export const useRecording = () => {
  const dispatch = useDispatch()
  const {
    isRecording,
    recordingTime,
    audioLevel,
    loading
  } = useSelector((state) => state.languageHelper)

  return {
    isRecording,
    recordingTime,
    audioLevel,
    loading,
    setIsRecording: (payload) => dispatch(setIsRecording(payload)),
    setRecordingTime: (payload) => dispatch(setRecordingTime(payload)),
    incrementRecordingTime: () => dispatch(incrementRecordingTime()),
    setAudioLevel: (payload) => dispatch(setAudioLevel(payload)),
    setLoading: (payload) => dispatch(setLoading(payload)),
    resetRecording: () => dispatch(resetRecording()),
  }
}

export const useTranscription = () => {
  const dispatch = useDispatch()
  const {
    transcription,
    editedTranscription,
    error
  } = useSelector((state) => state.languageHelper)

  return {
    transcription,
    editedTranscription,
    error,
    setTranscription: (payload) => dispatch(setTranscription(payload)),
    setEditedTranscription: (payload) => dispatch(setEditedTranscription(payload)),
    appendToEditedTranscription: (payload) => dispatch(appendToEditedTranscription(payload)),
    setError: (payload) => dispatch(setError(payload)),
    resetTranscription: () => dispatch(resetTranscription()),
  }
}

export const useConversation = () => {
  const dispatch = useDispatch()
  const {
    conversationHistory,
    lastCorrection,
    lastAlternative,
    lastExplanation,
    conversationLoading,
    correctionExpanded
  } = useSelector((state) => state.languageHelper)

  return {
    conversationHistory,
    lastCorrection,
    lastAlternative,
    lastExplanation,
    conversationLoading,
    correctionExpanded,
    setConversationHistory: (payload) => dispatch(setConversationHistory(payload)),
    addToConversationHistory: (payload) => dispatch(addToConversationHistory(payload)),
    setLastCorrection: (payload) => dispatch(setLastCorrection(payload)),
    setLastAlternative: (payload) => dispatch(setLastAlternative(payload)),
    setLastExplanation: (payload) => dispatch(setLastExplanation(payload)),
    setConversationLoading: (payload) => dispatch(setConversationLoading(payload)),
    setCorrectionExpanded: (payload) => dispatch(setCorrectionExpanded(payload)),
    updateConversationResult: (payload) => dispatch(updateConversationResult(payload)),
    clearConversation: () => dispatch(clearConversation()),
  }
}

export const useScenario = () => {
  const dispatch = useDispatch()
  const {
    scenarioLoading,
    currentScenario,
    scenarioSuggestion
  } = useSelector((state) => state.languageHelper)

  return {
    scenarioLoading,
    currentScenario,
    scenarioSuggestion,
    setScenarioLoading: (payload) => dispatch(setScenarioLoading(payload)),
    setCurrentScenario: (payload) => dispatch(setCurrentScenario(payload)),
    setScenarioSuggestion: (payload) => dispatch(setScenarioSuggestion(payload)),
    updateScenarioResult: (payload) => dispatch(updateScenarioResult(payload)),
  }
}

export const useFollowup = () => {
  const dispatch = useDispatch()
  const {
    followupHistory,
    followupLoading,
    showFollowupModal,
    followupQuestion,
    followupTranscription,
    isFollowupRecording
  } = useSelector((state) => state.languageHelper)

  return {
    followupHistory,
    followupLoading,
    showFollowupModal,
    followupQuestion,
    followupTranscription,
    isFollowupRecording,
    setFollowupHistory: (payload) => dispatch(setFollowupHistory(payload)),
    addToFollowupHistory: (payload) => dispatch(addToFollowupHistory(payload)),
    setFollowupLoading: (payload) => dispatch(setFollowupLoading(payload)),
    setShowFollowupModal: (payload) => dispatch(setShowFollowupModal(payload)),
    setFollowupQuestion: (payload) => dispatch(setFollowupQuestion(payload)),
    setFollowupTranscription: (payload) => dispatch(setFollowupTranscription(payload)),
    setIsFollowupRecording: (payload) => dispatch(setIsFollowupRecording(payload)),
    clearFollowup: () => dispatch(clearFollowup()),
  }
}

export const useLanguageConfig = () => {
  const dispatch = useDispatch()
  const {
    selectedLanguage,
    languages
  } = useSelector((state) => state.languageHelper)
  
  const currentLanguage = languages[selectedLanguage] || languages.spanish

  return {
    selectedLanguage,
    languages,
    currentLanguage,
    setSelectedLanguage: (payload) => dispatch(setSelectedLanguage(payload)),
  }
}
