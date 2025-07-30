import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import axios from 'axios'
import type { RootState, AppDispatch } from '../store'
import UnifiedTextInput from './UnifiedTextInput'
import {
  startGame,
  gameStarted,
  gameError,
  resetGame,
  setUserDescription,
  setSubmittingDescription,
  descriptionSubmitted,
  setAllWordsRevealed,
  setGeneratingExample,
  setAiExample,
  type TabooSession
} from '../store/tabooGameSlice'

function TabooGame(): React.JSX.Element {
  const dispatch = useDispatch<AppDispatch>()
  const { 
    stage, 
    currentSession, 
    loading, 
    error,
    userDescription,
    submittingDescription,
    wordsFound,
    wordsMissed,
    showWordBoard,
    allWordsRevealed,
    submissionHistory,
    aiExample,
    generatingExample
  } = useSelector((state: RootState) => state.tabooGame)
  
  // Get the current language from the centralized language system
  const { selectedLanguage, languages } = useSelector((state: RootState) => state.languageHelper)
  const currentLanguage = languages[selectedLanguage] || languages.spanish

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

  const handleSubmitDescription = async () => {
    if (!currentSession || !userDescription.trim()) return

    dispatch(setSubmittingDescription(true))

    try {
      const response = await axios.post(`/api/taboo/sessions/${currentSession.id}/submit`, {
        description: userDescription.trim(),
        includeExample: true // Always include example for now, backend will decide when to generate
      })

      if (!response.data.success) {
        throw new Error('Failed to submit description')
      }

      const evaluation = response.data.evaluation
      
      dispatch(descriptionSubmitted({
        wordsFound: evaluation.allWordsFound || [], // Use all words found across attempts
        wordsMissed: evaluation.wordsMissed || [],
        evaluationResult: evaluation,
        newWordsFound: evaluation.wordsFoundThisAttempt || [] // New words found in this attempt
      }))

      // Clear description for next attempt if game isn't complete
      if (!response.data.isGameComplete) {
        dispatch(setUserDescription(''))
      }

    } catch (error: any) {
      console.error('Error submitting description:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit description'
      dispatch(gameError(errorMessage))
    }
  }

  const handleRevealAllWords = () => {
    dispatch(setAllWordsRevealed(true))
  }

  const handleFinishGame = async () => {
    if (!currentSession) return

    try {
      const response = await axios.post(`/api/taboo/sessions/${currentSession.id}/finish`, {
        includeExample: true
      })

      if (!response.data.success) {
        throw new Error('Failed to finish game')
      }

      // Mark all remaining words as revealed
      dispatch(setAllWordsRevealed(true))

    } catch (error: any) {
      console.error('Error finishing game:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to finish game'
      dispatch(gameError(errorMessage))
    }
  }

  const handleGenerateExample = async () => {
    if (!currentSession) return

    dispatch(setGeneratingExample(true))

    try {
      const response = await axios.post(`/api/taboo/sessions/${currentSession.id}/generate-example`)

      if (!response.data.success) {
        throw new Error('Failed to generate example')
      }

      dispatch(setAiExample(response.data.example.description))

    } catch (error: any) {
      console.error('Error generating example:', error)
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate example'
      dispatch(gameError(errorMessage))
    } finally {
      dispatch(setGeneratingExample(false))
    }
  }

  const handleVoiceTranscription = (transcribedText: string) => {
    // Append to existing description or set if empty
    const currentText = userDescription.trim()
    const newText = currentText 
      ? `${currentText} ${transcribedText}` 
      : transcribedText
    dispatch(setUserDescription(newText))
  }

  const handleVoiceError = (error: string) => {
    dispatch(gameError(`Voice input error: ${error}`))
  }

  return (
    <div className="container-fluid px-2 px-sm-3">
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
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
                    Test your {currentLanguage.name} vocabulary skills! You'll be given a word to describe 
                    and must try to use key vocabulary words naturally. You can make multiple attempts 
                    to find all the words - each correct word will light up on the board!
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
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="mb-0">Game in Progress</h4>
                    <button 
                      className="btn btn-outline-secondary btn-sm"
                      onClick={handleResetGame}
                    >
                      <i className="bi bi-arrow-left me-1"></i>
                      Back to Start
                    </button>
                  </div>

                  {/* Answer Word - More compact */}
                  <div className="card border-primary mb-3">
                    <div className="card-body text-center py-3">
                      <div className="d-flex align-items-center justify-content-center mb-2">
                        <i className="bi bi-bullseye text-primary me-2"></i>
                        <h5 className="mb-0 text-muted">Word to Describe:</h5>
                      </div>
                      <h2 className="h1 text-primary mb-0 fw-bold">
                        {currentSession.answerWord}
                      </h2>
                    </div>
                  </div>

                  {/* Game Instructions - More compact */}
                  <div className="alert alert-info border mb-3 py-2">
                    <div className="d-flex align-items-start">
                      <i className="bi bi-info-circle me-2 mt-1 flex-shrink-0"></i>
                      <div>
                        <strong>Goal:</strong> Describe "<strong>{currentSession.answerWord}</strong>" in {currentLanguage.name} using related vocabulary words naturally. Don't use the answer word directly!
                      </div>
                    </div>
                  </div>

                  {/* Two-column layout for description and progress */}
                  <div className="row">
                    {/* Left Column - Description Input */}
                    <div className="col-lg-8 col-md-7">
                      <div className="card border-success mb-3">
                        <div className="card-header bg-success text-white py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-pencil me-2"></i>
                            Your Description
                          </h6>
                        </div>
                        <div className="card-body">
                          <UnifiedTextInput
                            value={userDescription}
                            onChange={(value) => dispatch(setUserDescription(value))}
                            onVoiceTranscription={handleVoiceTranscription}
                            onVoiceError={handleVoiceError}
                            placeholder={`Describe "${currentSession.answerWord}" in ${currentLanguage.name}...`}
                            rows={6}
                            disabled={submittingDescription}
                            language={selectedLanguage}
                            showVoiceControls={true}
                            showVisualization={true}
                            showKeyboardShortcuts={true}
                            showCharacterCount={true}
                            className="mb-3"
                          />
                          
                          {/* Submit Controls */}
                          <div className="d-flex justify-content-end">
                            <button
                              className="btn btn-success"
                              onClick={handleSubmitDescription}
                              disabled={!userDescription.trim() || submittingDescription}
                            >
                              {submittingDescription ? (
                                <>
                                  <span className="spinner-border spinner-border-sm me-2" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                  </span>
                                  Evaluating...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-send me-2"></i>
                                  Submit Description
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Submission History - Only show if exists */}
                      {submissionHistory.length > 0 && (
                        <div className="card border-secondary">
                          <div className="card-header bg-light py-2">
                            <h6 className="mb-0">
                              <i className="bi bi-clock-history me-2"></i>
                              Previous Attempts ({submissionHistory.length})
                            </h6>
                          </div>
                          <div className="card-body" style={{maxHeight: '300px', overflowY: 'auto'}}>
                            {submissionHistory.map((submission, index) => (
                              <div key={index} className="mb-2 pb-2 border-bottom">
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                  <small className="text-primary fw-bold">#{index + 1}</small>
                                  {submission.wordsFound.length > 0 && (
                                    <span className="badge bg-success">
                                      +{submission.wordsFound.length}
                                    </span>
                                  )}
                                </div>
                                <p className="small fst-italic mb-1">"{submission.description}"</p>
                                {submission.wordsFound.length > 0 && (
                                  <div className="d-flex flex-wrap gap-1">
                                    {submission.wordsFound.map((word, wordIndex) => (
                                      <span key={wordIndex} className="badge bg-success bg-opacity-75 small">
                                        {word}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Progress and Word Board */}
                    <div className="col-lg-4 col-md-5">
                      {/* Progress Summary */}
                      <div className="card border-info mb-3">
                        <div className="card-header bg-info text-white py-2">
                          <h6 className="mb-0">
                            <i className="bi bi-trophy me-2"></i>
                            Progress
                          </h6>
                        </div>
                        <div className="card-body py-2">
                          <div className="row text-center">
                            <div className="col-4">
                              <div className="text-success">
                                <div className="h5 mb-0">{wordsFound.length}</div>
                                <small>Found</small>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="text-secondary">
                                <div className="h5 mb-0">{currentSession.translatedKeyWords.length - wordsFound.length}</div>
                                <small>Remaining</small>
                              </div>
                            </div>
                            <div className="col-4">
                              <div className="text-primary">
                                <div className="h5 mb-0">{Math.round((wordsFound.length / currentSession.translatedKeyWords.length) * 100)}%</div>
                                <small>Complete</small>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="progress mt-2" style={{height: '8px'}}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{width: `${(wordsFound.length / currentSession.translatedKeyWords.length) * 100}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Word Board - Compact version */}
                      {showWordBoard && (
                        <div className="card border-warning mb-3">
                          <div className="card-header bg-warning text-dark py-2">
                            <h6 className="mb-0">
                              <i className="bi bi-grid me-2"></i>
                              Target Words
                            </h6>
                          </div>
                          <div className="card-body py-2">
                            <div className="row">
                              {currentSession.translatedKeyWords.map((word, index) => {
                                const isFound = wordsFound.includes(word)
                                const shouldShow = isFound || allWordsRevealed
                                
                                return (
                                  <div key={index} className="col-12 mb-2">
                                    <div className={`card card-body py-2 ${
                                      isFound ? 'border-success bg-success bg-opacity-10' : 
                                      shouldShow ? 'border-secondary bg-light' :
                                      'border-light bg-light'
                                    }`}>
                                      <div className="d-flex align-items-center">
                                        {isFound && (
                                          <i className="bi bi-check-circle-fill text-success me-2"></i>
                                        )}
                                        {!isFound && shouldShow && (
                                          <i className="bi bi-x-circle-fill text-secondary me-2"></i>
                                        )}
                                        {!shouldShow && (
                                          <i className="bi bi-question-circle text-muted me-2"></i>
                                        )}
                                        <div className="flex-grow-1">
                                          <div className={`fw-bold ${
                                            isFound ? 'text-success' : 
                                            shouldShow ? 'text-secondary' : 
                                            'text-muted'
                                          }`}>
                                            {shouldShow ? word : '???'}
                                          </div>
                                          <small className="text-muted">
                                            {shouldShow ? currentSession.originalKeyWords[index] : 'Hidden'}
                                          </small>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="card">
                        <div className="card-body py-2">
                          <div className="d-grid gap-2">
                            {!allWordsRevealed && showWordBoard && (
                              <>
                                <button 
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={handleRevealAllWords}
                                >
                                  <i className="bi bi-eye me-2"></i>
                                  Reveal All Words
                                </button>
                                
                                {wordsFound.length > 0 && wordsFound.length < currentSession.translatedKeyWords.length && (
                                  <button 
                                    className="btn btn-warning btn-sm"
                                    onClick={handleFinishGame}
                                  >
                                    <i className="bi bi-flag me-2"></i>
                                    Finish Game
                                  </button>
                                )}
                              </>
                            )}
                            
                            {(allWordsRevealed || wordsFound.length === currentSession.translatedKeyWords.length) && (
                              <>
                                <button 
                                  className="btn btn-primary"
                                  onClick={handleStartGame}
                                  disabled={loading}
                                >
                                  <i className="bi bi-arrow-clockwise me-2"></i>
                                  Play Again
                                </button>
                                
                                {!aiExample && (
                                  <button 
                                    className="btn btn-info btn-sm"
                                    onClick={handleGenerateExample}
                                    disabled={generatingExample}
                                  >
                                    {generatingExample ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status">
                                          <span className="visually-hidden">Loading...</span>
                                        </span>
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <i className="bi bi-lightbulb me-2"></i>
                                        Show AI Example
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                            
                            {wordsFound.length < currentSession.translatedKeyWords.length && !allWordsRevealed && showWordBoard && (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => {
                                  document.querySelector('textarea')?.focus()
                                }}
                              >
                                <i className="bi bi-pencil me-2"></i>
                                Focus Description
                              </button>
                            )}
                          </div>
                          
                          {wordsFound.length === currentSession.translatedKeyWords.length && (
                            <div className="alert alert-success mt-2 py-2 mb-0">
                              <div className="text-center">
                                <i className="bi bi-trophy-fill me-2"></i>
                                <strong>Perfect!</strong> All words found!
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Example Display */}
                      {aiExample && (
                        <div className="card border-info">
                          <div className="card-header bg-info text-white py-2">
                            <h6 className="mb-0">
                              <i className="bi bi-lightbulb-fill me-2"></i>
                              AI Example Description
                            </h6>
                          </div>
                          <div className="card-body py-2">
                            <p className="small mb-0 fst-italic">
                              "{aiExample}"
                            </p>
                            <small className="text-muted mt-2 d-block">
                              This example incorporates all the target vocabulary words naturally.
                            </small>
                          </div>
                        </div>
                      )}
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
