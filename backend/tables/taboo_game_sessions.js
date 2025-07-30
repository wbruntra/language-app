/**
 * taboo_game_sessions Table DDL:
 * BEGIN_DDL
CREATE TABLE taboo_game_sessions (
    id varchar(255),
    taboo_card_id varchar(255) NOT NULL,
    user_id varchar(255) NOT NULL,
    target_language varchar(255) NOT NULL,
    answer_word varchar(255) NOT NULL,
    original_key_words json NOT NULL,
    translated_key_words json NOT NULL,
    user_description TEXT,
    evaluation_result json,
    ai_example_description TEXT,
    status varchar(255) DEFAULT 'initialized',
    score INTEGER DEFAULT '0',
    words_found json,
    words_missed json,
    ai_usage_metadata json,
    messages json,
    metadata json,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_taboo_game_sessions_user_id_user_info_id FOREIGN KEY (user_id) REFERENCES user_info(id),
    CONSTRAINT fk_taboo_game_sessions_taboo_card_id_taboo_cards_id FOREIGN KEY (taboo_card_id) REFERENCES taboo_cards(id)
);

-- References:
-- * user_info via user_id (fk_taboo_game_sessions_user_id_user_info_id)
-- * taboo_cards via taboo_card_id (fk_taboo_game_sessions_taboo_card_id_taboo_cards_id)
 * END_DDL
 */
require('module-alias/register')
const { Model } = require('objection')
const knex = require('@db_connection')
const short = require('short-uuid')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class TabooGameSessions extends Model {
  static get tableName() {
    return 'taboo_game_sessions'
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['taboo_card_id', 'user_id', 'target_language', 'answer_word', 'original_key_words', 'translated_key_words'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        taboo_card_id: { type: 'string', maxLength: 255 },
        user_id: { type: 'string', maxLength: 255 },
        target_language: { type: 'string', maxLength: 255 },
        answer_word: { type: 'string', maxLength: 255 },
        original_key_words: { type: 'array', items: { type: 'string' } },
        translated_key_words: { type: 'array', items: { type: 'string' } },
        user_description: { type: ['string', 'null'] },
        evaluation_result: { type: ['object', 'null'] },
        ai_example_description: { type: ['string', 'null'] },
        status: { 
          type: ['string', 'null'], 
          enum: ['initialized', 'in_progress', 'completed', 'abandoned'], 
          default: 'initialized' 
        },
        score: { type: 'integer', default: 0, minimum: 0, maximum: 100 },
        words_found: { type: ['array', 'null'], items: { type: 'string' } },
        words_missed: { type: ['array', 'null'], items: { type: 'string' } },
        ai_usage_metadata: { type: ['object', 'null'] },
        messages: { type: ['array', 'null'] },
        metadata: { type: ['object', 'null'] },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }

  static get relationMappings() {
    const TabooCards = require('./taboo_cards')
    const UserInfo = require('./user_info')

    return {
      tabooCard: {
        relation: Model.BelongsToOneRelation,
        modelClass: TabooCards,
        join: {
          from: 'taboo_game_sessions.taboo_card_id',
          to: 'taboo_cards.id'
        }
      },
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserInfo,
        join: {
          from: 'taboo_game_sessions.user_id',
          to: 'user_info.id'
        }
      }
    }
  }

  $beforeInsert() {
    const now = new Date().toISOString()
    if (!this.id) {
      this.id = short.generate()
    }
    this.created_at = now
    this.updated_at = now
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString()
  }

  // Helper method to add a message to the game history
  addMessage(type, content, metadata = null) {
    if (!this.messages) {
      this.messages = []
    }
    
    this.messages.push({
      type,
      content,
      metadata,
      timestamp: new Date().toISOString()
    })
  }

  // Helper method to update game status
  async updateStatus(newStatus, additionalData = {}) {
    const updateData = {
      status: newStatus,
      ...additionalData
    }
    
    return await this.$query().patch(updateData)
  }

  // Helper method to complete the game with evaluation
  async completeGame(userDescription, evaluationResult, aiExample = null) {
    const updateData = {
      status: 'completed',
      user_description: userDescription,
      evaluation_result: evaluationResult,
      score: evaluationResult.score || 0,
      words_found: evaluationResult.wordsFound || [],
      words_missed: evaluationResult.wordsMissed || []
    }

    if (aiExample) {
      updateData.ai_example_description = aiExample
    }

    this.addMessage('game_completed', 'Game completed', {
      score: updateData.score,
      wordsFound: updateData.words_found.length,
      totalWords: this.original_key_words.length
    })

    updateData.messages = this.messages

    return await this.$query().patch(updateData)
  }

  // Static method to get user's game history
  static async getUserHistory(userId, targetLanguage = null, limit = 10) {
    let query = this.query()
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .withGraphFetched('tabooCard')

    if (targetLanguage) {
      query = query.where('target_language', targetLanguage)
    }

    return await query
  }

  // Static method to get user statistics
  static async getUserStats(userId, targetLanguage = null) {
    let query = this.query()
      .where('user_id', userId)
      .where('status', 'completed')

    if (targetLanguage) {
      query = query.where('target_language', targetLanguage)
    }

    const sessions = await query

    if (sessions.length === 0) {
      return {
        totalGames: 0,
        averageScore: 0,
        bestScore: 0,
        totalWordsFound: 0,
        averageWordsFound: 0,
        languages: []
      }
    }

    const totalGames = sessions.length
    const scores = sessions.map(s => s.score)
    const wordsFoundCounts = sessions.map(s => (s.words_found || []).length)
    const languages = [...new Set(sessions.map(s => s.target_language))]

    return {
      totalGames,
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / totalGames),
      bestScore: Math.max(...scores),
      totalWordsFound: wordsFoundCounts.reduce((sum, count) => sum + count, 0),
      averageWordsFound: Math.round(wordsFoundCounts.reduce((sum, count) => sum + count, 0) / totalGames * 10) / 10,
      languages
    }
  }

  /**
   * Static method to create a new game session
   * @param {Object} params - Game session parameters
   * @param {string} params.tabooCardId - ID of the taboo card
   * @param {string} params.userId - ID of the user
   * @param {string} params.targetLanguage - Target language for the game
   * @param {string[]} params.translatedKeyWords - Translated taboo words
   * @param {string} params.translatedMainWord - Translated main word/answer
   * @returns {Promise<TabooGameSessions>} Created game session
   */
  static async createGameSession({
    tabooCardId,
    userId,
    targetLanguage,
    translatedKeyWords,
    translatedMainWord
  }) {
    const tabooCard = await require('./taboo_cards').query().findById(tabooCardId)
    
    if (!tabooCard) {
      throw new Error('Taboo card not found')
    }

    const session = await this.query().insert({
      taboo_card_id: tabooCardId,
      user_id: userId,
      target_language: targetLanguage,
      answer_word: translatedMainWord, // Use the translated main word
      original_key_words: tabooCard.key_words,
      translated_key_words: translatedKeyWords,
      status: 'initialized'
    })

    // Increment usage count on the card
    await tabooCard.incrementUsage()

    return session
  }
}

module.exports = TabooGameSessions
