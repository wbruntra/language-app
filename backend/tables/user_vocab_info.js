/**
 * user_vocab_info Table DDL:
 * BEGIN_DDL
CREATE TABLE user_vocab_info (
    id varchar(255),
    word varchar(255) NOT NULL,
    language varchar(255),
    metadata json,
    user_id varchar(255) NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_user_vocab_info_user_id_user_info_id FOREIGN KEY (user_id) REFERENCES user_info(id)
);

-- References:
-- * user_info via user_id (fk_user_vocab_info_user_id_user_info_id)
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')
const short = require('short-uuid')


// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class UserVocabInfo extends Model {
  static get tableName() {
    return 'user_vocab_info'
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['word', 'user_id'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        word: { type: 'string', maxLength: 255 },
        language: { type: ['string', 'null'], maxLength: 255 },
        metadata: { type: ['object', 'null'] },
        user_id: { type: 'string', maxLength: 255 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
      }
    }
  }

  static get relationMappings() {
    const UserInfo = require('./user_info')

    return {
      user: {
        relation: Model.BelongsToOneRelation,
        modelClass: UserInfo,
        join: {
          from: 'user_vocab_info.user_id',
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
}

module.exports = UserVocabInfo
