import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// Taboo Game Types
export interface TabooCard {
  id: string
  answer: string
  key_words: string[]
  category: string
  difficulty: string
}

export interface TabooSession {
  id: string
  cardId: string
  answerWord: string
  originalKeyWords: string[]
  translatedKeyWords: string[]
  targetLanguage: string
  status: string
  createdAt: string
  score?: number
  wordsFound?: string[]
  wordsMissed?: string[]
  userDescription?: string
  aiExampleDescription?: string
  evaluationResult?: any
}

export interface TabooGameState {
  // Game state
  stage: 'start' | 'playing' | 'loading' | 'completed'
  currentSession: TabooSession | null
  
  // UI state
  loading: boolean
  error: string | null
  
  // Game play state
  userDescription: string
  submittingDescription: boolean
  wordsFound: string[]
  wordsMissed: string[]
  evaluationResult: any | null
  showWordBoard: boolean
  allWordsRevealed: boolean
  submissionHistory: Array<{
    description: string
    wordsFound: string[]
    timestamp: string
  }>
  
  // AI Example state
  aiExample: string | null
  generatingExample: boolean
  
  // Game history and stats
  recentSessions: TabooSession[]
  userStats: {
    totalGames: number
    averageScore: number
    bestScore: number
    totalWordsFound: number
    averageWordsFound: number
    languages: string[]
  } | null
  
  // Available data
  availableCategories: string[]
  
  // Settings  
  selectedCategory: string | null
  selectedDifficulty: string | null
}

const initialState: TabooGameState = {
  // Game state
  stage: 'start',
  currentSession: null,
  
  // UI state
  loading: false,
  error: null,
  
  // Game play state
  userDescription: '',
  submittingDescription: false,
  wordsFound: [],
  wordsMissed: [],
  evaluationResult: null,
  showWordBoard: false,
  allWordsRevealed: false,
  submissionHistory: [],
  
  // AI Example state
  aiExample: null,
  generatingExample: false,
  
  // Game history and stats
  recentSessions: [],
  userStats: null,
  
  // Available data
  availableCategories: [],
  
  // Settings
  selectedCategory: null,
  selectedDifficulty: null,
}

const tabooGameSlice = createSlice({
  name: 'tabooGame',
  initialState,
  reducers: {
    // Game state actions
    setStage: (state, action: PayloadAction<TabooGameState['stage']>) => {
      state.stage = action.payload
    },
    setCurrentSession: (state, action: PayloadAction<TabooSession | null>) => {
      state.currentSession = action.payload
    },
    updateCurrentSession: (state, action: PayloadAction<Partial<TabooSession>>) => {
      if (state.currentSession) {
        state.currentSession = { ...state.currentSession, ...action.payload }
      }
    },
    
    // UI state actions
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    
    // Game play actions
    setUserDescription: (state, action: PayloadAction<string>) => {
      state.userDescription = action.payload
    },
    setSubmittingDescription: (state, action: PayloadAction<boolean>) => {
      state.submittingDescription = action.payload
    },
    setWordsFound: (state, action: PayloadAction<string[]>) => {
      state.wordsFound = action.payload
    },
    setWordsMissed: (state, action: PayloadAction<string[]>) => {
      state.wordsMissed = action.payload
    },
    setEvaluationResult: (state, action: PayloadAction<any>) => {
      state.evaluationResult = action.payload
    },
    setShowWordBoard: (state, action: PayloadAction<boolean>) => {
      state.showWordBoard = action.payload
    },
    setAllWordsRevealed: (state, action: PayloadAction<boolean>) => {
      state.allWordsRevealed = action.payload
    },
    addSubmissionToHistory: (state, action: PayloadAction<{
      description: string
      wordsFound: string[]
      timestamp: string
    }>) => {
      state.submissionHistory.push(action.payload)
    },
    
    // AI Example actions
    setGeneratingExample: (state, action: PayloadAction<boolean>) => {
      state.generatingExample = action.payload
    },
    setAiExample: (state, action: PayloadAction<string | null>) => {
      state.aiExample = action.payload
    },
    
    // Game history and stats actions
    setRecentSessions: (state, action: PayloadAction<TabooSession[]>) => {
      state.recentSessions = action.payload
    },
    addToRecentSessions: (state, action: PayloadAction<TabooSession>) => {
      state.recentSessions.unshift(action.payload)
      // Keep only the 10 most recent sessions
      if (state.recentSessions.length > 10) {
        state.recentSessions = state.recentSessions.slice(0, 10)
      }
    },
    setUserStats: (state, action: PayloadAction<TabooGameState['userStats']>) => {
      state.userStats = action.payload
    },
    
    // Available data actions
    setAvailableCategories: (state, action: PayloadAction<string[]>) => {
      state.availableCategories = action.payload
    },
    
    // Settings actions
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload
    },
    setSelectedDifficulty: (state, action: PayloadAction<string | null>) => {
      state.selectedDifficulty = action.payload
    },
    
    // Combined actions for common workflows
    startGame: (state) => {
      state.stage = 'loading'
      state.error = null
      state.loading = true
    },
    gameStarted: (state, action: PayloadAction<TabooSession>) => {
      state.stage = 'playing'
      state.currentSession = action.payload
      state.loading = false
      state.error = null
      // Reset game play state
      state.userDescription = ''
      state.submittingDescription = false
      state.wordsFound = []
      state.wordsMissed = []
      state.evaluationResult = null
      state.showWordBoard = false
      state.allWordsRevealed = false
      state.submissionHistory = []
      state.aiExample = null
      state.generatingExample = false
    },
    descriptionSubmitted: (state, action: PayloadAction<{
      wordsFound: string[]
      wordsMissed: string[]
      evaluationResult: any
      newWordsFound: string[]
    }>) => {
      state.submittingDescription = false
      
      // Accumulate found words (avoid duplicates)
      const allFoundWords = [...new Set([...state.wordsFound, ...action.payload.newWordsFound])]
      state.wordsFound = allFoundWords
      
      // Update missed words (only words not found yet)
      if (state.currentSession) {
        state.wordsMissed = state.currentSession.translatedKeyWords.filter(
          word => !allFoundWords.includes(word)
        )
      }
      
      state.evaluationResult = action.payload.evaluationResult
      state.showWordBoard = true
      
      // Add to submission history
      state.submissionHistory.push({
        description: state.userDescription,
        wordsFound: action.payload.newWordsFound,
        timestamp: new Date().toISOString()
      })
      
      // Clear current description for next attempt
      state.userDescription = ''
    },
    gameCompleted: (state, action: PayloadAction<TabooSession>) => {
      state.stage = 'completed'
      state.currentSession = action.payload
      state.loading = false
      state.error = null
      // Add to recent sessions
      state.recentSessions.unshift(action.payload)
      if (state.recentSessions.length > 10) {
        state.recentSessions = state.recentSessions.slice(0, 10)
      }
    },
    gameError: (state, action: PayloadAction<string>) => {
      state.stage = 'start'
      state.loading = false
      state.error = action.payload
    },
    resetGame: (state) => {
      state.stage = 'start'
      state.currentSession = null
      state.loading = false
      state.error = null
      // Reset game play state
      state.userDescription = ''
      state.submittingDescription = false
      state.wordsFound = []
      state.wordsMissed = []
      state.evaluationResult = null
      state.showWordBoard = false
      state.allWordsRevealed = false
      state.submissionHistory = []
      state.aiExample = null
      state.generatingExample = false
    },
    
    // Clear all game data
    clearGameData: (state) => {
      state.stage = 'start'
      state.currentSession = null
      state.loading = false
      state.error = null
      state.recentSessions = []
      state.userStats = null
      // Reset game play state
      state.userDescription = ''
      state.submittingDescription = false
      state.wordsFound = []
      state.wordsMissed = []
      state.evaluationResult = null
      state.showWordBoard = false
      state.allWordsRevealed = false
      state.submissionHistory = []
      state.aiExample = null
      state.generatingExample = false
    },
  },
})

export const {
  // Game state actions
  setStage,
  setCurrentSession,
  updateCurrentSession,
  
  // UI state actions
  setLoading,
  setError,
  
  // Game play actions
  setUserDescription,
  setSubmittingDescription,
  setWordsFound,
  setWordsMissed,
  setEvaluationResult,
  setShowWordBoard,
  setAllWordsRevealed,
  addSubmissionToHistory,
  
  // AI Example actions
  setGeneratingExample,
  setAiExample,
  
  // Game history and stats actions
  setRecentSessions,
  addToRecentSessions,
  setUserStats,
  
  // Available data actions
  setAvailableCategories,
  
  // Settings actions
  setSelectedCategory,
  setSelectedDifficulty,
  
  // Combined actions
  startGame,
  gameStarted,
  gameCompleted,
  gameError,
  resetGame,
  clearGameData,
  descriptionSubmitted,
} = tabooGameSlice.actions

export default tabooGameSlice.reducer
