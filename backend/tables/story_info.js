/**
 * story_info Table DDL:
 * BEGIN_DDL
CREATE TABLE story_info (
    id INTEGER NOT NULL,
    prompt json NOT NULL,
    language varchar(255) NOT NULL,
    images json NOT NULL,
    category varchar(255) DEFAULT 'general',
    difficulty varchar(255) DEFAULT 'medium',
    description TEXT,
    metadata json,
    is_active boolean DEFAULT '1',
    usage_count INTEGER DEFAULT '0',
    upvotes INTEGER DEFAULT '0',
    downvotes INTEGER DEFAULT '0',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')


// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class StoryInfo extends Model {
  static get tableName() {
    return 'story_info'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['prompt', 'language', 'images'],
      properties: {
        id: { type: 'integer' },
        prompt: { type: 'object' },
        language: { type: 'string', maxLength: 255 },
        images: { type: 'object' },
        category: { type: 'string', maxLength: 255, default: 'general' },
        difficulty: { type: 'string', maxLength: 255, default: 'medium' },
        description: { type: ['string', 'null'] },
        metadata: { type: ['object', 'null'] },
        is_active: { type: 'boolean', default: true },
        usage_count: { type: 'integer', default: 0 },
        upvotes: { type: 'integer', default: 0 },
        downvotes: { type: 'integer', default: 0 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }

  $beforeInsert() {
    const now = new Date().toISOString()
    this.created_at = now
    this.updated_at = now
  }

  $beforeUpdate() {
    this.updated_at = new Date().toISOString()
  }

  // TODO: Add relationMappings if needed
}

module.exports = StoryInfo
