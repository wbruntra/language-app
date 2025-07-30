/**
 * ai_usage Table DDL:
 * BEGIN_DDL
CREATE TABLE ai_usage (
    id INTEGER NOT NULL,
    model varchar(255) NOT NULL,
    input_tokens INTEGER NOT NULL,
    cached_input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    cost_usd float,
    metadata json,
    user_id varchar(255) NOT NULL,
    created_at datetime,
    updated_at datetime,
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_usage_user_id_user_info_id FOREIGN KEY (user_id) REFERENCES user_info(id)
);

-- References:
-- * user_info via user_id (fk_ai_usage_user_id_user_info_id)
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')
const calculateCost = require('../utils/openAI/calculateCost')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class AiUsage extends Model {
  static get tableName() {
    return 'ai_usage'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['model', 'input_tokens', 'cached_input_tokens', 'output_tokens', 'user_id'],
      properties: {
        id: { type: 'integer' },
        model: { type: 'string', maxLength: 255 },
        usage: { type: ['object', 'null'] },
        input_tokens: { type: 'integer' },
        cached_input_tokens: { type: 'integer' },
        output_tokens: { type: 'integer' },
        cost_usd: { type: 'number', minimum: 0, multipleOf: 0.001 },
        metadata: { type: ['object', 'null'] },
        user_id: { type: 'string', maxLength: 255 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    }
  }

  static get relationMappings() {
    const UserInfo = require('./user_info')

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserInfo,
        join: {
          from: 'ai_usage.user_id',
          to: 'user_info.id',
        },
      },
    }
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context)

    const now = new Date().toISOString()
    this.created_at = now
    this.updated_at = now

    // Calculate cost based on model and usage data
    if (this.model && this.usage) {
      this.cost_usd = calculateCost(this.model, this.usage, this.metadata)
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context)

    this.updated_at = new Date().toISOString()
  }
}

module.exports = AiUsage
