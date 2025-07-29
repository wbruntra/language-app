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
    },
    
    // Clear all game data
    clearGameData: (state) => {
      state.stage = 'start'
      state.currentSession = null
      state.loading = false
      state.error = null
      state.recentSessions = []
      state.userStats = null
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
} = tabooGameSlice.actions

export default tabooGameSlice.reducer
