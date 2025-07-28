require('module-alias/register') // Initialize module-alias

const express = require('express')
const cors = require('cors')
const logger = require('morgan')
const path = require('path')
const cookieSession = require('cookie-session')
const secrets = require('./secrets')
const { expressAuth } = require('simple-express-react-auth')

require('dotenv').config()

const app = express()

// Middleware for logging requests
app.use(logger('dev'))

// Middleware
app.use(express.json())

app.use(
  cookieSession({
    name: 'language-session',
    keys: [secrets.cookieSecret],
    maxAge: 180 * 24 * 60 * 60 * 1000, // 180 days
  }),
)

const { router: authRouter, requireAuth } = expressAuth.createAuth({
  password: secrets.authorizationCode,
})

app.use('/api/auth', require('./routes/users'))

const transcriptionsRouter = require('./routes/transcriptions')
app.use('/api', requireAuth, transcriptionsRouter)

app.use(function (req, res, next) {
  res.status(404).json({ error: 'Not Found' })
})

// Error handler middleware
const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

module.exports = app
