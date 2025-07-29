import React, { useState, useEffect } from 'react'
import { useLanguageConfig } from '@/hooks/useLanguageHelper'
import { useUser } from '@/hooks/useUser'

interface VocabularyWord {
  id: string
  word: string
  original_word: string
  part_of_speech: string
  definition: string
  language: string
  context: string | null
  confidence: string
  times_encountered: number
  is_learned: boolean
  created_at: string
  updated_at: string
}

interface VocabularyAnalysis {
  baseForm: string
  partOfSpeech: string
  definition: string
  confidence: string
}

interface VocabularyStats {
  totalWords: number
  learnedWords: number
  learnedPercentage: number
  recentWords: number
  partOfSpeechBreakdown: Record<string, number>
}

function Vocabulary(): React.JSX.Element {
  const { selectedLanguage, currentLanguage } = useLanguageConfig()
  const { user } = useUser()
  const [word, setWord] = useState('')
  const [context, setContext] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingWords, setIsLoadingWords] = useState(false)
  const [analysis, setAnalysis] = useState<VocabularyAnalysis | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [words, setWords] = useState<VocabularyWord[]>([])
  const [stats, setStats] = useState<VocabularyStats | null>(null)

  // Load vocabulary words and stats when component mounts or language changes
  useEffect(() => {
    if (selectedLanguage) {
      loadVocabularyWords()
      loadVocabularyStats()
    }
  }, [selectedLanguage])

  const loadVocabularyWords = async () => {
    setIsLoadingWords(true)
    try {
      const response = await fetch(`/api/vocab/${selectedLanguage}`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setWords(data.words || [])
      } else {
        console.error('Failed to load vocabulary words')
      }
    } catch (error) {
      console.error('Error loading vocabulary words:', error)
    } finally {
      setIsLoadingWords(false)
    }
  }

  const loadVocabularyStats = async () => {
    try {
      const response = await fetch(`/api/vocab/${selectedLanguage}/stats`, {
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        console.error('Failed to load vocabulary stats')
      }
    } catch (error) {
      console.error('Error loading vocabulary stats:', error)
    }
  }

  const analyzeWord = async () => {
    if (!word.trim() || !context.trim()) {
      setError('Please enter both a word and a context sentence.')
      return
    }

    setIsAnalyzing(true)
    setError('')
    setSuccess('')
    setAnalysis(null)

    try {
      const response = await fetch('/api/vocab/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          word: word.trim(),
          context: context.trim(),
          language: currentLanguage.name,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setAnalysis(data.analysis)
        setSuccess('Word analyzed successfully!')
      } else {
        setError(data.error || 'Failed to analyze word')
      }
    } catch (error) {
      setError('Error analyzing word. Please try again.')
      console.error('Analysis error:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const saveWord = async () => {
    if (!analysis) {
      setError('Please analyze the word first.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const response = await fetch('/api/vocab/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          word: word.trim(),
          baseForm: analysis.baseForm,
          partOfSpeech: analysis.partOfSpeech,
          definition: analysis.definition,
          language: selectedLanguage,
          context: context.trim(),
          confidence: analysis.confidence,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess('Word saved to your vocabulary!')
        // Clear the form
        setWord('')
        setContext('')
        setAnalysis(null)
        // Reload the vocabulary list and stats
        loadVocabularyWords()
        loadVocabularyStats()
      } else {
        setError(data.error || 'Failed to save word')
      }
    } catch (error) {
      setError('Error saving word. Please try again.')
      console.error('Save error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const toggleLearned = async (wordId: string, isLearned: boolean) => {
    try {
      const response = await fetch(`/api/vocab/${wordId}/learned`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ is_learned: !isLearned }),
      })

      if (response.ok) {
        // Update the local state
        setWords(words.map((w) => (w.id === wordId ? { ...w, is_learned: !isLearned } : w)))
        // Reload stats to reflect the change
        loadVocabularyStats()
      }
    } catch (error) {
      console.error('Error updating learned status:', error)
    }
  }

  // Add delete handler
  const deleteWord = async (wordId: string) => {
    if (!window.confirm('Are you sure you want to delete this word?')) return
    try {
      const response = await fetch(`/api/vocab/${wordId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        setWords(words.filter(w => w.id !== wordId))
        loadVocabularyStats()
      } else {
        console.error('Failed to delete word')
      }
    } catch (error) {
      console.error('Error deleting word:', error)
    }
  }

  return (
    <div className="container-fluid px-3 py-3">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">
            <i className="bi bi-book me-2"></i>
            {currentLanguage.name} Vocabulary Builder
          </h2>

          {/* Statistics */}
          {stats && (
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="row">
                  <div className="col-sm-3">
                    <div className="card text-center">
                      <div className="card-body py-2">
                        <h5 className="card-title text-primary mb-1">{stats.totalWords}</h5>
                        <small className="text-muted">Total Words</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="card text-center">
                      <div className="card-body py-2">
                        <h5 className="card-title text-success mb-1">{stats.learnedWords}</h5>
                        <small className="text-muted">Learned</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="card text-center">
                      <div className="card-body py-2">
                        <h5 className="card-title text-info mb-1">{stats.learnedPercentage}%</h5>
                        <small className="text-muted">Progress</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-sm-3">
                    <div className="card text-center">
                      <div className="card-body py-2">
                        <h5 className="card-title text-warning mb-1">{stats.recentWords}</h5>
                        <small className="text-muted">This Week</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="row">
            {/* Add New Word Form */}
            <div className="col-lg-6 mb-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-plus-circle me-2"></i>
                    Add New Word
                  </h5>
                </div>
                <div className="card-body">
                  {error && (
                    <div className="alert alert-danger alert-dismissible fade show" role="alert">
                      {error}
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setError('')}
                      ></button>
                    </div>
                  )}

                  {success && (
                    <div className="alert alert-success alert-dismissible fade show" role="alert">
                      {success}
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => setSuccess('')}
                      ></button>
                    </div>
                  )}

                  <div className="mb-3">
                    <label htmlFor="word-input" className="form-label">
                      Word in {currentLanguage.name}
                    </label>
                    <input
                      id="word-input"
                      type="text"
                      className="form-control"
                      value={word}
                      onChange={(e) => setWord(e.target.value)}
                      placeholder="e.g., corriendo"
                      disabled={isAnalyzing || isSaving}
                    />
                  </div>

                  <div className="mb-3">
                    <label htmlFor="context-input" className="form-label">
                      Context Sentence
                    </label>
                    <textarea
                      id="context-input"
                      className="form-control"
                      rows={3}
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder="e.g., El niño está corriendo en el parque."
                      disabled={isAnalyzing || isSaving}
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={analyzeWord}
                      disabled={isAnalyzing || isSaving || !word.trim() || !context.trim()}
                    >
                      {isAnalyzing ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-search me-2"></i>
                          Analyze Word
                        </>
                      )}
                    </button>

                    {analysis && (
                      <button className="btn btn-success" onClick={saveWord} disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-save me-2"></i>
                            Save to Vocabulary
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Analysis Results */}
                  {analysis && (
                    <div className="mt-4 p-3 bg-light rounded">
                      <h6 className="text-success mb-3">
                        <i className="bi bi-check-circle me-2"></i>
                        Analysis Results
                      </h6>

                      {/* Show the original context sentence */}
                      <div className="mb-3 p-2 bg-white rounded border-start border-4 border-info">
                        <small className="text-muted d-block mb-1">
                          <i className="bi bi-quote me-1"></i>
                          Original sentence:
                        </small>
                        <em className="text-dark">"{context}"</em>
                      </div>

                      <div className="row">
                        <div className="col-sm-6">
                          <strong>Word:</strong> <mark className="bg-warning-subtle">{word}</mark>
                        </div>
                        <div className="col-sm-6">
                          <strong>Base Form:</strong> {analysis.baseForm}
                        </div>
                        <div className="col-sm-6 mt-2">
                          <strong>Part of Speech:</strong> {analysis.partOfSpeech}
                        </div>
                        <div className="col-sm-6 mt-2">
                          <strong>Confidence:</strong>{' '}
                          <span
                            className={`badge ${
                              analysis.confidence === 'high'
                                ? 'bg-success'
                                : analysis.confidence === 'medium'
                                ? 'bg-warning'
                                : 'bg-secondary'
                            }`}
                          >
                            {analysis.confidence}
                          </span>
                        </div>
                        <div className="col-12 mt-2">
                          <strong>Definition:</strong> {analysis.definition}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Vocabulary List */}
            <div className="col-lg-6">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    <i className="bi bi-list-ul me-2"></i>
                    Your Vocabulary ({words.length})
                  </h5>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    onClick={loadVocabularyWords}
                    disabled={isLoadingWords}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
                <div className="card-body" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {isLoadingWords ? (
                    <div className="text-center">
                      <div className="spinner-border spinner-border-sm"></div>
                      <p className="mt-2 mb-0">Loading vocabulary...</p>
                    </div>
                  ) : words.length === 0 ? (
                    <div className="text-center text-muted">
                      <i className="bi bi-book display-4 d-block mb-3"></i>
                      <p>No vocabulary words yet.</p>
                      <p>Add your first word using the form!</p>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {words.map((vocabWord) => (
                        <div key={vocabWord.id} className="list-group-item px-0">
                          <div className="d-flex justify-content-between align-items-start">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center mb-1">
                                <strong className="me-2">{vocabWord.word}</strong>
                                {vocabWord.word !== vocabWord.original_word && (
                                  <span className="text-muted">({vocabWord.original_word})</span>
                                )}
                                <span
                                  className={`badge ms-2 ${
                                    vocabWord.part_of_speech === 'noun'
                                      ? 'bg-primary'
                                      : vocabWord.part_of_speech === 'verb'
                                      ? 'bg-success'
                                      : vocabWord.part_of_speech === 'adjective'
                                      ? 'bg-warning'
                                      : vocabWord.part_of_speech === 'adverb'
                                      ? 'bg-info'
                                      : 'bg-secondary'
                                  }`}
                                >
                                  {vocabWord.part_of_speech}
                                </span>
                              </div>
                              <div className="text-muted small mb-1">{vocabWord.definition}</div>
                              {vocabWord.context && (
                                <div className="context-sentence p-2 mb-2 bg-light rounded">
                                  <small className="text-muted d-block mb-1">
                                    <i className="bi bi-quote me-1"></i>
                                    Original context:
                                  </small>
                                  <em className="text-dark">"{vocabWord.context}"</em>
                                </div>
                              )}
                              {/* <div className="small text-muted mt-1">
                                Encountered {vocabWord.times_encountered} time
                                {vocabWord.times_encountered !== 1 ? 's' : ''}
                              </div> */}
                            </div>
                            <div className="btn-group ms-2" role="group">
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  vocabWord.is_learned ? 'btn-success' : 'btn-outline-success'
                                }`}
                                onClick={() => toggleLearned(vocabWord.id, vocabWord.is_learned)}
                                title={
                                  vocabWord.is_learned ? 'Mark as not learned' : 'Mark as learned'
                                }
                              >
                                <i className={`bi ${
                                  vocabWord.is_learned ? 'bi-check-circle-fill' : 'bi-circle'
                                }`} />
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => deleteWord(vocabWord.id)}
                                title="Delete word"
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Vocabulary
