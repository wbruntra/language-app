import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import type { RootState, AppDispatch } from '../store'
import {
  startGame,
  gameStarted,
  gameError,
  resetGame,
  type TabooSession
} from '../store/tabooGameSlice'

function TabooGame(): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>()
  const { 
    stage, 
    currentSession, 
    loading, 
    error
  } = useSelector((state: RootState) => state.tabooGame)
  
  // Get the current language from the centralized language system
  const { selectedLanguage } = useSelector((state: RootState) => state.languageHelper)

  const handleStartGame = async () => {
    dispatch(startGame())
    
    try {
      // First, get a random card
      const cardsResponse = await axios.get('/api/taboo/cards?count=1')
      
      if (!cardsResponse.data.success || !cardsResponse.data.cards.length) {
        throw new Error('No cards available')
      }

      const card = cardsResponse.data.cards[0]
      
      // Start a session with this card
      const sessionResponse = await axios.post('/api/taboo/sessions/start', {
        cardId: card.id,
        targetLanguage: selectedLanguage // Use the centralized language setting
      })

      if (!sessionResponse.data.success) {
        throw new Error('Failed to start game session')
      }

      dispatch(gameStarted(sessionResponse.data.session))

    } catch (error: any) {
      console.error('Error starting game:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to start game'
      dispatch(gameError(errorMessage))
    }
  }

  const handleResetGame = () => {
    dispatch(resetGame())
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h2 className="card-title mb-0">
                <i className="bi bi-puzzle me-2"></i>
                Taboo Game
              </h2>
            </div>
            <div className="card-body">
              {stage === 'start' && (
                <div className="text-center">
                  <h4 className="mb-4">Ready to Play?</h4>
                  <p className="text-muted mb-4">
                    Test your Spanish vocabulary skills! You'll be given a word to describe 
                    using key vocabulary words. The more key words you use naturally, the higher your score!
                  </p>
                  
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}
                  
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={handleStartGame}
                  >
                    <i className="bi bi-play-circle me-2"></i>
                    Start New Game
                  </button>
                </div>
              )}

              {stage === 'loading' && (
                <div className="text-center">
                  <div className="spinner-border text-primary mb-3" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                  <p className="text-muted">Starting your game...</p>
                </div>
              )}

              {stage === 'playing' && currentSession && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h4 className="mb-0">Game in Progress</h4>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetGame}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Back to Start
                    </button>
                  </div>

                  {/* Game Info */}
                  <div className="row mb-4">
                    <div className="col-md-6">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <h6 className="card-subtitle text-muted mb-2">Session ID</h6>
                          <code className="small">{currentSession.id}</code>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <h6 className="card-subtitle text-muted mb-2">Status</h6>
                          <span className="badge bg-success">{currentSession.status}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Answer Word */}
                  <div className="card border-primary mb-4">
                    <div className="card-header bg-primary text-white">
                      <h5 className="mb-0">
                        <i className="bi bi-bullseye me-2"></i>
                        Word to Describe
                      </h5>
                    </div>
                    <div className="card-body text-center">
                      <h2 className="display-4 text-primary mb-0">
                        {currentSession.answerWord}
                      </h2>
                    </div>
                  </div>

                  {/* Original Key Words */}
                  <div className="card border-info mb-4">
                    <div className="card-header bg-info text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-flag me-2"></i>
                        Original Key Words (English)
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex flex-wrap gap-2">
                        {currentSession.originalKeyWords.map((word, index) => (
                          <span 
                            key={index} 
                            className="badge bg-info text-dark fs-6"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Translated Key Words */}
                  <div className="card border-success mb-4">
                    <div className="card-header bg-success text-white">
                      <h6 className="mb-0">
                        <i className="bi bi-translate me-2"></i>
                        Key Words in Spanish
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="d-flex flex-wrap gap-2">
                        {currentSession.translatedKeyWords.map((word, index) => (
                          <span 
                            key={index} 
                            className="badge bg-success fs-6"
                          >
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Game Instructions */}
                  <div className="alert alert-light border">
                    <h6 className="alert-heading">
                      <i className="bi bi-info-circle me-2"></i>
                      How to Play
                    </h6>
                    <p className="mb-0">
                      <strong>Goal:</strong> Describe the word "<strong>{currentSession.answerWord}</strong>" 
                      in Spanish using as many of the green key words as possible. 
                      Do not use the answer word directly in your description.
                    </p>
                  </div>

                  {/* Placeholder for future description input */}
                  <div className="text-center">
                    <div className="text-muted">
                      <i className="bi bi-wrench me-2"></i>
                      Description input and scoring coming soon...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TabooGame
