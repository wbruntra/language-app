/**
 * uploads Table DDL:
 * BEGIN_DDL
CREATE TABLE uploads (
    id varchar(255),
    url varchar(255) NOT NULL,
    filename varchar(255) NOT NULL,
    upload_type varchar(255) NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);
 * END_DDL
 */
const { Model } = require('objection')
const knex = require('@db_connection')
const short = require('short-uuid')


// Initialize knex connection for all models
if (!Model.knex()) {
  Model.knex(knex)
}

class Uploads extends Model {
  static get tableName() {
    return 'uploads'
  }
  
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['url', 'filename', 'upload_type'],
      properties: {
        id: { type: 'string', maxLength: 255 },
        url: { type: 'string', maxLength: 255, format: 'uri' },
        filename: { type: 'string', maxLength: 255 },
        upload_type: { type: 'string', maxLength: 255 },
        created_at: { type: 'string', format: 'date-time' },
        updated_at: { type: 'string', format: 'date-time' }
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

module.exports = Uploads
