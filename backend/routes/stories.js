const express = require('express')
const router = express.Router()
const StoryInfo = require('@tables/story_info')

/**
 * GET /api/stories
 * Get list of all stories (paginated)
 */
router.get('/', async (req, res) => {
  try {
    const {
      limit = 20,
      offset = 0,
      language,
      category,
      difficulty,
      is_active = true
    } = req.query

    // Build query
    let query = StoryInfo.query()

    // Apply filters
    if (language) {
      query = query.where('language', language)
    }

    if (category) {
      query = query.where('category', category)
    }

    if (difficulty) {
      query = query.where('difficulty', difficulty)
    }

    if (is_active !== undefined) {
      query = query.where('is_active', is_active === 'true')
    }

    // Get total count for pagination
    const totalQuery = query.clone().count('id as count')
    const [{ count: total }] = await totalQuery

    // Add sorting and pagination
    const limitNum = Math.min(parseInt(limit), 100) // Max 100 items
    const offsetNum = Math.max(parseInt(offset), 0)

    const stories = await query
      .orderBy('created_at', 'desc')
      .limit(limitNum)
      .offset(offsetNum)

    // Calculate pagination info
    const currentPage = Math.floor(offsetNum / limitNum) + 1
    const totalPages = Math.ceil(total / limitNum)
    const hasMore = offsetNum + limitNum < total

    res.json({
      success: true,
      stories,
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
        category,
        difficulty,
        is_active
      }
    })

  } catch (error) {
    console.error('Error fetching stories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stories'
    })
  }
})

/**
 * GET /api/stories/categories
 * Get list of available story categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await StoryInfo.query()
      .distinct('category')
      .whereNotNull('category')
      .orderBy('category')

    res.json({
      success: true,
      categories: categories.map(row => row.category)
    })

  } catch (error) {
    console.error('Error fetching categories:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    })
  }
})

/**
 * GET /api/stories/stats
 * Get story statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [
      totalStories,
      activeStories,
      categoryStats,
      difficultyStats,
      languageStats
    ] = await Promise.all([
      // Total stories
      StoryInfo.query().count('id as count').first(),
      
      // Active stories
      StoryInfo.query().where('is_active', true).count('id as count').first(),

      // Category breakdown
      StoryInfo.query()
        .groupBy('category')
        .select('category')
        .count('id as count')
        .orderBy('count', 'desc'),

      // Difficulty breakdown
      StoryInfo.query()
        .groupBy('difficulty')
        .select('difficulty')
        .count('id as count')
        .orderBy('count', 'desc'),

      // Language breakdown
      StoryInfo.query()
        .groupBy('language')
        .select('language')
        .count('id as count')
        .orderBy('count', 'desc')
    ])

    res.json({
      success: true,
      stats: {
        totalStories: parseInt(totalStories.count),
        activeStories: parseInt(activeStories.count),
        categoryBreakdown: categoryStats.reduce((acc, stat) => {
          acc[stat.category] = parseInt(stat.count)
          return acc
        }, {}),
        difficultyBreakdown: difficultyStats.reduce((acc, stat) => {
          acc[stat.difficulty] = parseInt(stat.count)
          return acc
        }, {}),
        languageBreakdown: languageStats.reduce((acc, stat) => {
          acc[stat.language] = parseInt(stat.count)
          return acc
        }, {})
      }
    })

  } catch (error) {
    console.error('Error fetching story stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch story statistics'
    })
  }
})

/**
 * GET /api/stories/:id
 * Get a specific story by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const story = await StoryInfo.query().findById(id)

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      })
    }

    // Increment usage count
    await StoryInfo.query()
      .findById(id)
      .patch({
        usage_count: story.usage_count + 1
      })

    res.json({
      success: true,
      story: {
        ...story,
        usage_count: story.usage_count + 1
      }
    })

  } catch (error) {
    console.error('Error fetching story:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to fetch story'
    })
  }
})

/**
 * PATCH /api/stories/:id/vote
 * Vote on a story (upvote or downvote)
 */
router.patch('/:id/vote', async (req, res) => {
  try {
    const { id } = req.params
    const { vote } = req.body // 'up' or 'down'

    if (!vote || !['up', 'down'].includes(vote)) {
      return res.status(400).json({
        success: false,
        error: 'Vote must be either "up" or "down"'
      })
    }

    const story = await StoryInfo.query().findById(id)

    if (!story) {
      return res.status(404).json({
        success: false,
        error: 'Story not found'
      })
    }

    const updateData = vote === 'up' 
      ? { upvotes: story.upvotes + 1 }
      : { downvotes: story.downvotes + 1 }

    const updatedStory = await StoryInfo.query()
      .patchAndFetchById(id, updateData)

    res.json({
      success: true,
      message: `${vote === 'up' ? 'Upvote' : 'Downvote'} recorded`,
      story: updatedStory
    })

  } catch (error) {
    console.error('Error voting on story:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to record vote'
    })
  }
})

module.exports = router
