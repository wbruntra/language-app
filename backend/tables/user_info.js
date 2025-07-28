/**
 * user_info Table DDL:
 * BEGIN_DDL
CREATE TABLE user_info (
    id varchar(255),
    email varchar(255) NOT NULL,
    phone varchar(24),
    password varchar(255) NOT NULL,
    first_name varchar(255),
    last_name varchar(255),
    nickname varchar(255),
    avatar varchar(255),
    gender varchar(255),
    preferences json,
    is_active boolean NOT NULL DEFAULT '1',
    email_verified boolean NOT NULL DEFAULT '0',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT user_info_email_unique UNIQUE (email)
);

-- Referenced by:
-- * conversation_info.user_id (fk_conversation_info_user_id_user_info_id)
-- * user_vocab_info.user_id (fk_user_vocab_info_user_id_user_info_id)
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')
const short = require('short-uuid')
const bcrypt = require('bcrypt')

// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class UserInfo extends Model {
  static get tableName() {
    return 'user_info'
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        email: { type: 'string', maxLength: 255, format: 'email' },
        phone: { type: ['string', 'null'], maxLength: 24 },
        password: { type: 'string', maxLength: 255 },
        first_name: { type: ['string', 'null'], maxLength: 255 },
        last_name: { type: ['string', 'null'], maxLength: 255 },
        nickname: { type: ['string', 'null'], maxLength: 255 },
        avatar: { type: ['string', 'null'], maxLength: 255 },
        gender: { type: ['string', 'null'], maxLength: 255 },
        preferences: { type: ['object', 'null'] },
        is_active: { type: 'boolean', default: true },
        email_verified: { type: 'boolean', default: false },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' },
      },
    }
  }

  static get relationMappings() {
    const ConversationInfo = require('./conversation_info')
    const UserVocabInfo = require('./user_vocab_info')

    return {
      conversations: {
        relation: Model.HasManyRelation,
        modelClass: ConversationInfo,
        join: {
          from: 'user_info.id',
          to: 'conversation_info.user_id',
        },
      },
      vocabulary: {
        relation: Model.HasManyRelation,
        modelClass: UserVocabInfo,
        join: {
          from: 'user_info.id',
          to: 'user_vocab_info.user_id',
        },
      },
    }
  }

  async $beforeInsert(context) {
    await super.$beforeInsert(context)

    const now = new Date().toISOString()
    if (!this.id) {
      this.id = short.generate()
    }
    this.created_at = now
    this.updated_at = now

    // Hash password if it exists and isn't already hashed
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10)
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context)

    this.updated_at = new Date().toISOString()

    // Hash password if it's being updated and isn't already hashed
    if (this.password && !this.password.startsWith('$2b$')) {
      this.password = await bcrypt.hash(this.password, 10)
    }
  }

  /**
   * Verify a password against the stored hash
   * @param {string} password - Plain text password to verify
   * @returns {Promise<boolean>} - True if password matches, false otherwise
   */
  async verifyPassword(password) {
    if (!this.password || !password) {
      return false
    }
    return bcrypt.compare(password, this.password)
  }

  /**
   * Static method to find user by email and verify password
   * @param {string} email - User email
   * @param {string} password - Plain text password
   * @returns {Promise<UserInfo|null>} - User if credentials are valid, null otherwise
   */
  static async authenticate(email, password) {
    const user = await this.query().findOne({ email })
    if (!user) {
      return null
    }

    const isValidPassword = await user.verifyPassword(password)
    return isValidPassword ? user : null
  }
}

module.exports = UserInfo
