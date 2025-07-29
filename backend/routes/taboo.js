require('module-alias/register')
const express = require('express')
const router = express.Router()
const config = require('../config')
const {
  translateKeyWords,
  evaluateDescription,
  generateSampleDescription,
  calculateScore,
} = require('../utils/openAI/tabooGameplay')
const AiUsage = require('@tables/ai_usage')
const TabooCards = require('@tables/taboo_cards')
const TabooGameSessions = require('@tables/taboo_game_sessions')

const LANGUAGE_CONFIG = config.languages

/**
 * Helper function to get ISO code from language name
 * @param {string} languageName - Language name like 'spanish', 'french', etc.
 * @returns {string} ISO code like 'es', 'fr', etc.
 */
function getLanguageIsoCode(languageName) {
  const language = LANGUAGE_CONFIG[languageName] || LANGUAGE_CONFIG.spanish
  return language.isoCode
}

/**
 * GET /api/taboo/cards
 * Get random taboo cards for the game
 */
router.get('/cards', async (req, res) => {
  console.log('cards endpoint called with params:', req.query)
  try {
    const count = parseInt(req.query.count) || 1
    const category = req.query.category
    const difficulty = req.query.difficulty
    const maxCards = 10 // Prevent abuse

    const requestedCount = Math.min(count, maxCards)
    const cards = await TabooCards.getRandomCards(requestedCount, category, difficulty)

    if (!cards || cards.length === 0) {
      return res.status(404).json({
        error: 'No taboo cards found matching the criteria',
      })
    }

    res.json({
      success: true,
      cards: cards,
      count: cards.length,
    })
  } catch (error) {
    console.error('Error fetching taboo cards:', error)
    res.status(500).json({
      error: 'Failed to fetch taboo cards',
    })
  }
})

/**
 * POST /api/taboo/sessions/start
 * Start a new taboo game session
 */
router.post('/sessions/start', async (req, res) => {
  try {
    const { cardId, targetLanguage } = req.body
    const userId = req.session?.user_id

    // Validation
    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated to start a game session',
      })
    }

    if (!cardId) {
      return res.status(400).json({
        error: 'cardId is required',
      })
    }

    if (!targetLanguage) {
      return res.status(400).json({
        error: 'targetLanguage is required',
      })
    }

    const language = LANGUAGE_CONFIG[targetLanguage]

    // Get the card
    const card = await TabooCards.query().findById(cardId)
    if (!card) {
      return res.status(404).json({
        error: 'Taboo card not found',
      })
    }

    if (!card.is_active) {
      return res.status(400).json({
        error: 'This card is not currently active',
      })
    }

    const targetLanguageIso = language.isoCode

    let translationResult

    if (card.language !== targetLanguageIso) {
      translationResult = await translateKeyWords({
        keyWords: card.key_words,
        mainWord: card.answer_word,
        targetLanguage: language.name,
      })
    } else {
      translationResult = {
        success: true,
        translatedMainWord: card.answer_word,
        translatedWords: card.key_words,
        originalMainWord: card.answer_word,
        originalWords: card.key_words
      }
    }

    // Translate the key words

    if (!translationResult.success) {
      return res.status(500).json({
        error: 'Failed to translate key words',
        details: translationResult.error,
      })
    }

    // Create the game session
    const session = await TabooGameSessions.createGameSession({
      tabooCardId: cardId,
      userId,
      targetLanguage,
      translatedKeyWords: translationResult.translatedWords,
      translatedMainWord: translationResult.translatedMainWord,
    })

    // Track AI usage for translation
    if (translationResult.usage && translationResult.cost) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: translationResult.usage.prompt_tokens || 0,
          cached_input_tokens: translationResult.usage.prompt_tokens_details?.cached_tokens || 0,
          output_tokens: translationResult.usage.completion_tokens || 0,
          metadata: {
            model_used: 'gpt-4o-2024-08-06',
            tokens_used: translationResult.usage.total_tokens || 0,
            cost_usd: translationResult.cost,
            request_type: 'taboo_session_start',
            target_language: targetLanguage,
            session_id: session.id,
          },
        })
      } catch (usageError) {
        console.error('Failed to track AI usage:', usageError)
      }
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        cardId: session.taboo_card_id,
        answerWord: session.answer_word,
        originalKeyWords: session.original_key_words,
        translatedKeyWords: session.translated_key_words,
        targetLanguage: session.target_language,
        status: session.status,
        createdAt: session.created_at,
      },
    })
  } catch (error) {
    console.error('Error starting game session:', error)
    res.status(500).json({
      error: 'Failed to start game session',
      details: error.message,
    })
  }
})

/**
 * POST /api/taboo/sessions/:sessionId/submit
 * Submit description for evaluation in a game session
 */
router.post('/sessions/:sessionId/submit', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { description, includeExample = true } = req.body
    const userId = req.session?.user_id

    // Validation
    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        error: 'description is required and must be a string',
      })
    }

    if (description.trim().length < 5) {
      return res.status(400).json({
        error: 'Description must be at least 5 characters long',
      })
    }

    // Get the session
    const session = await TabooGameSessions.query().findById(sessionId).where('user_id', userId)

    if (!session) {
      return res.status(404).json({
        error: 'Game session not found or does not belong to current user',
      })
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        error: 'This game session has already been completed',
      })
    }

    // Update session status to in_progress if it's the first submission
    if (session.status === 'initialized') {
      await session.updateStatus('in_progress')
    }

    // Get the words already found in previous attempts
    const previouslyFoundWords = session.words_found || []

    // Evaluate the current description
    const evaluation = await evaluateDescription(
      description,
      session.translated_key_words,
      session.answer_word,
      session.target_language,
    )

    if (!evaluation.success) {
      return res.status(500).json({
        error: 'Failed to evaluate description',
        details: evaluation.error,
      })
    }

    // Combine newly found words with previously found words
    const newWordsFound = evaluation.wordsFound || []
    const allWordsFound = [...new Set([...previouslyFoundWords, ...newWordsFound])]
    const wordsFoundThisAttempt = newWordsFound.filter(word => !previouslyFoundWords.includes(word))
    
    // Calculate words missed (only words not found in any attempt)
    const allWordsMissed = session.translated_key_words.filter(word => !allWordsFound.includes(word))

    // Add this submission to the session messages/history
    if (!session.messages) {
      session.messages = []
    }
    
    session.messages.push({
      type: 'submission',
      content: description.trim(),
      wordsFound: newWordsFound,
      wordsFoundThisAttempt: wordsFoundThisAttempt,
      timestamp: new Date().toISOString(),
      metadata: {
        evaluationId: evaluation.id || null,
        answerWordMentioned: evaluation.answerWordMentioned || false
      }
    })

    // Determine if game should be completed (all words found or user wants to end)
    const isGameComplete = allWordsFound.length === session.translated_key_words.length
    const newStatus = isGameComplete ? 'completed' : 'in_progress'

    // Calculate score based on total words found
    const scorePercentage = Math.round((allWordsFound.length / session.translated_key_words.length) * 100)

    // Update session with new progress
    await session.$query().patch({
      status: newStatus,
      words_found: allWordsFound,
      words_missed: allWordsMissed,
      score: scorePercentage,
      messages: session.messages,
      // Only update user_description and evaluation_result if game is complete
      ...(isGameComplete && {
        user_description: description.trim(),
        evaluation_result: evaluation
      })
    })

    let exampleDescription = null
    let totalCost = evaluation.cost || 0
    let totalUsage = evaluation.usage || {}

    // Generate example if requested, evaluation succeeded, and game is complete
    if (includeExample && evaluation.success && isGameComplete) {
      const example = await generateSampleDescription(
        session.answer_word,
        session.translated_key_words,
        session.target_language,
      )

      if (example.success) {
        exampleDescription = example.description
        totalCost += example.cost || 0

        // Combine usage stats
        if (example.usage) {
          totalUsage.prompt_tokens =
            (totalUsage.prompt_tokens || 0) + (example.usage.prompt_tokens || 0)
          totalUsage.completion_tokens =
            (totalUsage.completion_tokens || 0) + (example.usage.completion_tokens || 0)
          totalUsage.total_tokens =
            (totalUsage.total_tokens || 0) + (example.usage.total_tokens || 0)
        }

        // Update session with example if game is complete
        await session.$query().patch({
          ai_example_description: exampleDescription
        })
      }
    }

    // Track AI usage
    if (totalUsage.total_tokens) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: totalUsage.prompt_tokens || 0,
          cached_input_tokens: totalUsage.prompt_tokens_details?.cached_tokens || 0,
          output_tokens: totalUsage.completion_tokens || 0,
          metadata: {
            model_used: 'gpt-4o-2024-08-06',
            tokens_used: totalUsage.total_tokens || 0,
            cost_usd: totalCost,
            request_type: 'taboo_session_submit',
            target_language: session.target_language,
            session_id: sessionId,
            included_example: includeExample && isGameComplete,
            submission_number: session.messages.length,
            is_game_complete: isGameComplete
          },
        })
      } catch (usageError) {
        console.error('Failed to track AI usage:', usageError)
      }
    }

    // Prepare response
    const response = {
      success: true,
      sessionId,
      isGameComplete,
      evaluation: {
        wordsFound: newWordsFound, // Words found in this specific attempt
        wordsFoundThisAttempt: wordsFoundThisAttempt, // New words found (not previously found)
        allWordsFound: allWordsFound, // All words found across all attempts
        wordsMissed: allWordsMissed, // Words still not found
        wordDetails: evaluation.wordDetails || [],
        answerWordMentioned: evaluation.answerWordMentioned || false,
        totalProgress: {
          found: allWordsFound.length,
          total: session.translated_key_words.length,
          percentage: scorePercentage
        }
      },
      submissionCount: session.messages.length
    }

    if (exampleDescription) {
      response.example = {
        description: exampleDescription,
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error submitting game session:', error)
    res.status(500).json({
      error: 'Failed to submit game session',
      details: error.message,
    })
  }
})

/**
 * GET /api/taboo/sessions/:sessionId
 * Get details of a specific game session
 */
router.get('/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params
    const userId = req.session?.user_id

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    const session = await TabooGameSessions.query()
      .findById(sessionId)
      .where('user_id', userId)
      .withGraphFetched('tabooCard')

    if (!session) {
      return res.status(404).json({
        error: 'Game session not found or does not belong to current user',
      })
    }

    res.json({
      success: true,
      session: {
        id: session.id,
        cardId: session.taboo_card_id,
        answerWord: session.answer_word,
        originalKeyWords: session.original_key_words,
        translatedKeyWords: session.translated_key_words,
        targetLanguage: session.target_language,
        userDescription: session.user_description,
        evaluationResult: session.evaluation_result,
        aiExampleDescription: session.ai_example_description,
        status: session.status,
        score: session.score,
        wordsFound: session.words_found,
        wordsMissed: session.words_missed,
        messages: session.messages,
        createdAt: session.created_at,
        updatedAt: session.updated_at,
        card: session.tabooCard
          ? {
              category: session.tabooCard.category,
              difficulty: session.tabooCard.difficulty,
              description: session.tabooCard.description,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Error getting game session:', error)
    res.status(500).json({
      error: 'Failed to retrieve game session',
      details: error.message,
    })
  }
})

/**
 * GET /api/taboo/sessions
 * Get user's game session history
 */
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.session?.user_id
    const targetLanguage = req.query.language
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    const sessions = await TabooGameSessions.getUserHistory(userId, targetLanguage, limit)

    res.json({
      success: true,
      sessions: sessions.map((session) => ({
        id: session.id,
        answerWord: session.answer_word,
        targetLanguage: session.target_language,
        status: session.status,
        score: session.score,
        wordsFound: session.words_found?.length || 0,
        totalWords: session.original_key_words?.length || 0,
        createdAt: session.created_at,
        card: session.tabooCard
          ? {
              category: session.tabooCard.category,
              difficulty: session.tabooCard.difficulty,
            }
          : null,
      })),
    })
  } catch (error) {
    console.error('Error getting session history:', error)
    res.status(500).json({
      error: 'Failed to retrieve session history',
      details: error.message,
    })
  }
})

/**
 * GET /api/taboo/stats
 * Get user's taboo game statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.session?.user_id
    const targetLanguage = req.query.language

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    const stats = await TabooGameSessions.getUserStats(userId, targetLanguage)

    res.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Error getting user stats:', error)
    res.status(500).json({
      error: 'Failed to retrieve user statistics',
      details: error.message,
    })
  }
})

/**
 * GET /api/taboo/categories
 * Get available card categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await TabooCards.getCategories()

    res.json({
      success: true,
      categories,
    })
  } catch (error) {
    console.error('Error getting categories:', error)
    res.status(500).json({
      error: 'Failed to retrieve categories',
      details: error.message,
    })
  }
})

/**
 * POST /api/taboo/sessions/:sessionId/generate-example
 * Generate an AI example description for a completed session
 */
router.post('/sessions/:sessionId/generate-example', async (req, res) => {
  try {
    const { sessionId } = req.params
    const userId = req.session?.user_id

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    // Get the session
    const session = await TabooGameSessions.query().findById(sessionId).where('user_id', userId)

    if (!session) {
      return res.status(404).json({
        error: 'Game session not found or does not belong to current user',
      })
    }

    // Generate example description
    const example = await generateSampleDescription(
      session.answer_word,
      session.translated_key_words,
      session.target_language,
    )

    if (!example.success) {
      return res.status(500).json({
        error: 'Failed to generate example description',
        details: example.error,
      })
    }

    // Update session with the example if not already present
    if (!session.ai_example_description) {
      await session.$query().patch({
        ai_example_description: example.description
      })
    }

    // Track AI usage
    if (example.usage?.total_tokens) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: example.usage.prompt_tokens || 0,
          cached_input_tokens: example.usage.prompt_tokens_details?.cached_tokens || 0,
          output_tokens: example.usage.completion_tokens || 0,
          metadata: {
            model_used: 'gpt-4o-2024-08-06',
            tokens_used: example.usage.total_tokens || 0,
            cost_usd: example.cost || 0,
            request_type: 'taboo_generate_example',
            target_language: session.target_language,
            session_id: sessionId,
          },
        })
      } catch (usageError) {
        console.error('Failed to track AI usage:', usageError)
      }
    }

    res.json({
      success: true,
      example: {
        description: example.description,
      }
    })
  } catch (error) {
    console.error('Error generating example description:', error)
    res.status(500).json({
      error: 'Failed to generate example description',
      details: error.message,
    })
  }
})

/**
 * POST /api/taboo/sessions/:sessionId/finish
 * Finish a taboo game session (user chooses to stop making attempts)
 */
router.post('/sessions/:sessionId/finish', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { includeExample = true } = req.body
    const userId = req.session?.user_id

    if (!userId) {
      return res.status(401).json({
        error: 'User must be authenticated',
      })
    }

    // Get the session
    const session = await TabooGameSessions.query().findById(sessionId).where('user_id', userId)

    if (!session) {
      return res.status(404).json({
        error: 'Game session not found or does not belong to current user',
      })
    }

    if (session.status === 'completed') {
      return res.status(400).json({
        error: 'This game session has already been completed',
      })
    }

    if (!session.messages || session.messages.length === 0) {
      return res.status(400).json({
        error: 'Cannot finish a session without any submissions',
      })
    }

    // Get the last submission for final evaluation storage
    const lastSubmission = session.messages
      .filter(msg => msg.type === 'submission')
      .pop()

    if (!lastSubmission) {
      return res.status(400).json({
        error: 'No valid submissions found in session',
      })
    }

    const allWordsFound = session.words_found || []
    const allWordsMissed = session.translated_key_words.filter(word => !allWordsFound.includes(word))
    const scorePercentage = Math.round((allWordsFound.length / session.translated_key_words.length) * 100)

    let exampleDescription = null
    let totalCost = 0
    let totalUsage = {}

    // Generate example if requested
    if (includeExample) {
      const example = await generateSampleDescription(
        session.answer_word,
        session.translated_key_words,
        session.target_language,
      )

      if (example.success) {
        exampleDescription = example.description
        totalCost = example.cost || 0
        totalUsage = example.usage || {}
      }
    }

    // Mark session as completed
    await session.$query().patch({
      status: 'completed',
      user_description: lastSubmission.content,
      evaluation_result: {
        wordsFound: allWordsFound,
        wordsMissed: allWordsMissed,
        score: scorePercentage,
        finishedByUser: true,
        totalAttempts: session.messages.filter(msg => msg.type === 'submission').length
      },
      ai_example_description: exampleDescription,
      score: scorePercentage
    })

    // Add completion message
    if (!session.messages) {
      session.messages = []
    }
    
    session.messages.push({
      type: 'game_finished',
      content: 'Game finished by user',
      metadata: {
        finalScore: scorePercentage,
        wordsFound: allWordsFound.length,
        totalWords: session.translated_key_words.length,
        attempts: session.messages.filter(msg => msg.type === 'submission').length
      },
      timestamp: new Date().toISOString()
    })

    await session.$query().patch({ messages: session.messages })

    // Track AI usage for example generation
    if (totalUsage.total_tokens) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: totalUsage.prompt_tokens || 0,
          cached_input_tokens: totalUsage.prompt_tokens_details?.cached_tokens || 0,
          output_tokens: totalUsage.completion_tokens || 0,
          metadata: {
            model_used: 'gpt-4o-2024-08-06',
            tokens_used: totalUsage.total_tokens || 0,
            cost_usd: totalCost,
            request_type: 'taboo_session_finish',
            target_language: session.target_language,
            session_id: sessionId,
            included_example: includeExample,
          },
        })
      } catch (usageError) {
        console.error('Failed to track AI usage:', usageError)
      }
    }

    // Prepare response
    const response = {
      success: true,
      sessionId,
      finalResults: {
        wordsFound: allWordsFound,
        wordsMissed: allWordsMissed,
        score: scorePercentage,
        totalAttempts: session.messages.filter(msg => msg.type === 'submission').length,
        progress: {
          found: allWordsFound.length,
          total: session.translated_key_words.length,
          percentage: scorePercentage
        }
      }
    }

    if (exampleDescription) {
      response.example = {
        description: exampleDescription,
      }
    }

    res.json(response)
  } catch (error) {
    console.error('Error finishing game session:', error)
    res.status(500).json({
      error: 'Failed to finish game session',
      details: error.message,
    })
  }
})

/**
 * POST /api/taboo/sessions/:sessionId/complete
 * Complete a taboo game session with user description
 */
router.post('/sessions/:sessionId/complete', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { description, includeExample } = req.body
    const userId = req.session?.user_id

    if (!userId) {
      return res.status(401).json({
        error: 'User must be logged in',
      })
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({
        error: 'description is required and must be a string',
      })
    }

    // Get the session
    const session = await TabooGameSessions.query().findById(sessionId).where('user_id', userId)

    if (!session) {
      return res.status(404).json({
        error: 'Game session not found',
      })
    }

    if (session.status !== 'initialized' && session.status !== 'in_progress') {
      return res.status(400).json({
        error: 'Game session is already completed',
      })
    }

    // Evaluate description
    const evaluation = await evaluateDescription(
      description,
      session.translated_key_words,
      session.answer_word,
      session.target_language,
    )

    let exampleDescription = null
    let totalCost = evaluation.cost || 0
    let totalUsage = evaluation.usage || {}

    // Generate example if requested and evaluation succeeded
    if (includeExample !== false && evaluation.success) {
      const example = await generateSampleDescription(
        session.answer_word,
        session.translated_key_words,
        session.target_language,
      )

      if (example.success) {
        exampleDescription = example.example
        totalCost += example.cost || 0

        // Combine usage stats
        if (example.usage) {
          totalUsage.prompt_tokens =
            (totalUsage.prompt_tokens || 0) + (example.usage.prompt_tokens || 0)
          totalUsage.completion_tokens =
            (totalUsage.completion_tokens || 0) + (example.usage.completion_tokens || 0)
          totalUsage.total_tokens =
            (totalUsage.total_tokens || 0) + (example.usage.total_tokens || 0)
        }
      }
    }

    // Complete the game session
    await session.completeGame(description, evaluation, exampleDescription)

    // Track combined AI usage
    if (totalUsage.total_tokens) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: totalUsage.prompt_tokens || 0,
          cached_input_tokens: totalUsage.prompt_tokens_details?.cached_tokens || 0,
          output_tokens: totalUsage.completion_tokens || 0,
          metadata: {
            model_used: 'gpt-4o-2024-08-06',
            tokens_used: totalUsage.total_tokens || 0,
            cost_usd: totalCost,
            request_type: 'taboo_session_complete',
            target_language: session.target_language,
            session_id: sessionId,
            included_example: includeExample !== false,
          },
        })
      } catch (usageError) {
        console.error('Failed to track AI usage:', usageError)
      }
    }

    // Get updated session
    const updatedSession = await TabooGameSessions.query().findById(sessionId)

    res.json({
      success: true,
      session: {
        id: updatedSession.id,
        answerWord: updatedSession.answer_word,
        userDescription: updatedSession.user_description,
        evaluation: updatedSession.evaluation_result,
        exampleDescription: updatedSession.ai_example_description,
        score: updatedSession.score,
        wordsFound: updatedSession.words_found,
        wordsMissed: updatedSession.words_missed,
        status: updatedSession.status,
      },
    })
  } catch (error) {
    console.error('Error completing taboo session:', error)
    res.status(500).json({
      error: 'Failed to complete game session',
      details: error.message,
    })
  }
})

module.exports = router
