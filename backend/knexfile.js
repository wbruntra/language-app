// Update with your config settings.
const path = require('path')
const fs = require('fs')

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'dev.sqlite3'),
    },
    useNullAsDefault: true, // SQLite requires this
  },
  staging: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'dev.sqlite3'),
    },
    useNullAsDefault: true, // SQLite requires this
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'dev.sqlite3'),
    },
    useNullAsDefault: true, // SQLite requires this
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: path.join(__dirname, 'test.sqlite3'),
    },
    useNullAsDefault: true, // SQLite requires this
  },

}
