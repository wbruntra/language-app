/**
 * taboo_cards Table DDL:
 * BEGIN_DDL
CREATE TABLE taboo_cards (
    id varchar(255),
    answer_word varchar(255) NOT NULL,
    key_words json NOT NULL,
    category varchar(255) DEFAULT 'general',
    difficulty varchar(255) DEFAULT 'medium',
    description TEXT,
    metadata json,
    is_active boolean DEFAULT '1',
    usage_count INTEGER DEFAULT '0',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT unique_taboo_answer_word UNIQUE (answer_word)
);

-- Indexes:
-- * idx_taboo_cards_category on (category)
-- * idx_taboo_cards_difficulty on (difficulty)
-- * idx_taboo_cards_active on (is_active)
-- * idx_taboo_cards_answer on (answer_word)
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

class TabooCards extends Model {
  static get tableName() {
    return 'taboo_cards'
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['answer_word', 'key_words'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        answer_word: { type: 'string', maxLength: 255 },
        key_words: { type: 'array', items: { type: 'string' } },
        category: { type: ['string', 'null'], maxLength: 255, default: 'general' },
        difficulty: { type: ['string', 'null'], enum: ['easy', 'medium', 'hard'], default: 'medium' },
        description: { type: ['string', 'null'] },
        metadata: { type: ['object', 'null'] },
        is_active: { type: 'boolean', default: true },
        usage_count: { type: 'integer', default: 0, minimum: 0 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }

  static get relationMappings() {
    const TabooGameSessions = require('./taboo_game_sessions')

    return {
      gameSessions: {
        relation: Model.HasManyRelation,
        modelClass: TabooGameSessions,
        join: {
          from: 'taboo_cards.id',
          to: 'taboo_game_sessions.taboo_card_id'
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

  // Helper method to increment usage count
  async incrementUsage() {
    return await this.$query().patch({
      usage_count: this.usage_count + 1
    })
  }

  // Static method to get random active cards
  static async getRandomCards(limit = 1, category = null, difficulty = null) {
    let query = this.query()
      .where('is_active', true)
      .orderByRaw('RANDOM()')
      .limit(limit)

    if (category) {
      query = query.where('category', category)
    }

    if (difficulty) {
      query = query.where('difficulty', difficulty)
    }

    return await query
  }

  // Static method to get cards by difficulty
  static async getCardsByDifficulty(difficulty) {
    return await this.query()
      .where('is_active', true)
      .where('difficulty', difficulty)
  }

  // Static method to get all categories
  static async getCategories() {
    const result = await this.query()
      .distinct('category')
      .where('is_active', true)
      .whereNotNull('category')
    
    return result.map(row => row.category)
  }
}

module.exports = TabooCards
