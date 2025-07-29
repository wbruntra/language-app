const express = require('express')
const morgan = require('morgan')
const cookieSession = require('cookie-session')
const secrets = require('./secrets')
const defaultDB = require('./db_connection')

// one place for the canonical cookie setup
const defaultCookieOpts = {
  name: 'language-session',
  keys: [secrets.cookieSecret],
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}

function appFactory({
  dbInstance = defaultDB,
  sessionMW = (req, res, next) => {
    req.session = {}
    next()
  },
  jwtMW = (req, res, next) => {
    req.user = {}
    next()
  },
  cookieOpts = defaultCookieOpts,
  enableLogging = true,
  loggerFormat = 'dev',
} = {}) {
  const app = express()
  app.use(express.json())

  if (enableLogging) app.use(morgan(loggerFormat))

  app.use(cookieSession(cookieOpts))
  // app.use(sessionMW)
  app.use(jwtMW)

  app.set('db', dbInstance)

  return app
}

module.exports = appFactory
