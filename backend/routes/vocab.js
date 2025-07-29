const express = require('express')
const router = express.Router()
const UserVocabInfo = require('@tables/user_vocab_info')
const AiUsage = require('@tables/ai_usage')
const { analyzeVocabulary } = require('@utils/openAI')

/**
 * POST /api/vocab/analyze
 * Analyze a word using OpenAI to get part of speech, base form, and definition
 */
router.post('/analyze', async (req, res) => {
  try {
    const { word, context, language } = req.body
    const userId = req.session?.user_id

    // Validate input
    if (!word || !context || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: word, context, and language are required'
      })
    }

    if (word.trim().length === 0 || context.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Word and context cannot be empty'
      })
    }

    // Analyze the word with OpenAI
    const { analysis, usage, cost, error } = await analyzeVocabulary(
      word.trim(),
      context.trim(),
      language
    )

    // Track AI usage for cost monitoring
    if (usage && cost) {
      try {
        await AiUsage.query().insert({
          user_id: userId,
          input_tokens: usage.prompt_tokens,
          cached_input_tokens: 0,
          output_tokens: usage.completion_tokens,
          metadata: {
            model_used: 'gpt-4o-mini',
            tokens_used: usage.total_tokens,
            cost_usd: cost,
            request_type: 'vocabulary_analysis',
            word,
            language
          }
        })
      } catch (usageError) {
        console.error('Error tracking AI usage:', usageError)
        // Don't fail the request if usage tracking fails
      }
    }

    res.json({
      success: true,
      analysis,
      ...(error && { warning: error })
    })

  } catch (error) {
    console.error('Error in vocab analysis:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to analyze vocabulary word'
    })
  }
})

/**
 * POST /api/vocab/save
 * Save analyzed vocabulary word to database
 */
router.post('/save', async (req, res) => {
  try {
    console.log('Received save request body:', JSON.stringify(req.body, null, 2))
    
    const {
      word,
      originalWord,
      baseForm,
      language,
      partOfSpeech,
      definition,
      context,
      confidence,
      metadata = {}
    } = req.body
    
    console.log('Extracted partOfSpeech:', partOfSpeech)
    
    const userId = req.session?.user_id

    // Validate required fields
    if (!word || !language) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: word and language are required'
      })
    }

    // Check if word already exists for this user and language
    const existingWord = await UserVocabInfo.query()
      .where('user_id', userId)
      .where('word', word.trim())
      .where('language', language)
      .first()

    if (existingWord) {
      // Update existing word - increment times_encountered
      const updatedWord = await UserVocabInfo.query()
        .patchAndFetchById(existingWord.id, {
          times_encountered: existingWord.times_encountered + 1,
          // Update other fields if provided
          ...(originalWord && { original_word: originalWord }),
          ...(partOfSpeech && { part_of_speech: partOfSpeech }),
          ...(definition && { definition }),
          ...(context && { context }),
          ...(confidence && { confidence }),
          metadata: {
            ...existingWord.metadata,
            ...metadata,
            lastEncountered: new Date().toISOString()
          }
        })

      return res.json({
        success: true,
        message: 'Word updated - times encountered incremented',
        word: updatedWord,
        isNew: false
      })
    }

    // Create new vocabulary entry
    const newWord = await UserVocabInfo.query().insert({
      word: baseForm || word.trim(),
      original_word: originalWord || word.trim(),
      language,
      part_of_speech: partOfSpeech,
      definition,
      context,
      confidence: confidence || 'medium',
      user_id: userId,
      metadata: {
        ...metadata,
        firstEncountered: new Date().toISOString()
      }
    })

    res.status(201).json({
      success: true,
      message: 'Vocabulary word saved successfully',
      word: newWord,
      isNew: true
    })

  } catch (error) {
    console.error('Error saving vocabulary word:', error)
    
    // Handle unique constraint violation
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        error: 'This word already exists in your vocabulary for this language'
      })
    }

    res.status(500).json({
      success: false,
      error: 'Failed to save vocabulary word'
    })
  }
})

/**
 * GET /api/vocab/:language
 * Retrieve user's vocabulary words for a specific language
 */
router.get('/:language', async (req, res) => {
  try {
    const { language } = req.params
    const userId = req.session?.user_id
    
    // Query parameters for pagination and filtering
    const {
      limit = 50,
      offset = 0,
      sortBy = 'created_at',
      sortOrder = 'desc',
      search,
      partOfSpeech,
      isLearned
    } = req.query

    // Build query
    let query = UserVocabInfo.query()
      .where('user_id', userId)
      .where('language', language)

    // Add search filter
    if (search) {
      query = query.where(builder => {
        builder
          .where('word', 'like', `%${search}%`)
          .orWhere('definition', 'like', `%${search}%`)
          .orWhere('context', 'like', `%${search}%`)
      })
    }

    // Add part of speech filter
    if (partOfSpeech) {
      query = query.where('part_of_speech', partOfSpeech)
    }

    // Add learned status filter
    if (isLearned !== undefined) {
      query = query.where('is_learned', isLearned === 'true')
    }

    // Get total count for pagination
    const totalQuery = query.clone().count('id as count')
    const [{ count: total }] = await totalQuery

    // Add sorting
    const validSortColumns = ['created_at', 'word', 'part_of_speech', 'times_encountered']
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at'
    const sortDirection = sortOrder === 'asc' ? 'asc' : 'desc'
    
    query = query.orderBy(sortColumn, sortDirection)

    // Add pagination
    const limitNum = Math.min(parseInt(limit), 100) // Max 100 items
    const offsetNum = Math.max(parseInt(offset), 0)
    
    query = query.limit(limitNum).offset(offsetNum)

    // Execute query
    const words = await query

    // Calculate pagination info
    const currentPage = Math.floor(offsetNum / limitNum) + 1
    const totalPages = Math.ceil(total / limitNum)
    const hasMore = offsetNum + limitNum < total

    res.json({
      success: true,
      words,
      pagination: {
        total: parseInt(total),
        page: currentPage,
        totalPages,
        limit: limitNum,
        offset: offsetNum,
        hasMore
      },
      filters: {
        language,
        search,
        partOfSpeech,
        isLearned,
        sortBy: sortColumn,
        sortOrder: sortDirection
      }
    })

  } catch (error) {
    console.error('Error fetching vocabulary words:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary words'
    })
  }
})

/**
 * PATCH /api/vocab/:id/learned
 * Toggle learned status of a vocabulary word
 */
router.patch('/:id/learned', async (req, res) => {
  try {
    const { id } = req.params
    const { isLearned } = req.body
    const userId = req.session?.user_id

    // Find the word and verify ownership
    const word = await UserVocabInfo.query()
      .findById(id)
      .where('user_id', userId)

    if (!word) {
      return res.status(404).json({
        success: false,
        error: 'Vocabulary word not found'
      })
    }

    // Update learned status
    const updatedWord = await UserVocabInfo.query()
      .patchAndFetchById(id, {
        is_learned: isLearned !== undefined ? isLearned : !word.is_learned
      })

    res.json({
      success: true,
      message: 'Learned status updated',
      word: updatedWord
    })

  } catch (error) {
    console.error('Error updating learned status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to update learned status'
    })
  }
})

/**
 * DELETE /api/vocab/:id
 * Delete a vocabulary word
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.session?.user_id

    // Find and delete the word, ensuring user ownership
    const deletedCount = await UserVocabInfo.query()
      .deleteById(id)
      .where('user_id', userId)

    if (deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vocabulary word not found'
      })
    }

    res.json({
      success: true,
      message: 'Vocabulary word deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting vocabulary word:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete vocabulary word'
    })
  }
})

/**
 * GET /api/vocab/:language/stats
 * Get vocabulary statistics for a language
 */
router.get('/:language/stats', async (req, res) => {
  try {
    const { language } = req.params
    const userId = req.session?.user_id

    // Get various statistics
    const [
      totalWords,
      learnedWords,
      partOfSpeechStats,
      recentWords
    ] = await Promise.all([
      // Total words
      UserVocabInfo.query()
        .where('user_id', userId)
        .where('language', language)
        .count('id as count')
        .first(),
      
      // Learned words
      UserVocabInfo.query()
        .where('user_id', userId)
        .where('language', language)
        .where('is_learned', true)
        .count('id as count')
        .first(),

      // Part of speech breakdown
      UserVocabInfo.query()
        .where('user_id', userId)
        .where('language', language)
        .whereNotNull('part_of_speech')
        .groupBy('part_of_speech')
        .select('part_of_speech')
        .count('id as count'),

      // Recent words (last 7 days)
      UserVocabInfo.query()
        .where('user_id', userId)
        .where('language', language)
        .where('created_at', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .count('id as count')
        .first()
    ])

    res.json({
      success: true,
      stats: {
        totalWords: parseInt(totalWords.count),
        learnedWords: parseInt(learnedWords.count),
        learnedPercentage: totalWords.count > 0 ? 
          Math.round((learnedWords.count / totalWords.count) * 100) : 0,
        recentWords: parseInt(recentWords.count),
        partOfSpeechBreakdown: partOfSpeechStats.reduce((acc, stat) => {
          acc[stat.part_of_speech] = parseInt(stat.count)
          return acc
        }, {})
      }
    })

  } catch (error) {
    console.error('Error fetching vocabulary stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch vocabulary statistics'
    })
  }
})

module.exports = router
