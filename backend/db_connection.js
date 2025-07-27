const knex = require('knex')
const knexfile = require('./knexfile')

const config = knexfile[process.env.NODE_ENV || 'development']

const db = knex(config)

module.exports = db
