require('module-alias/register') // Initialize module-alias

const express = require('express')
const cors = require('cors')
const logger = require('morgan')
const path = require('path')
const cookieSession = require('cookie-session')
const secrets = require('./secrets')
const { expressAuth } = require('simple-express-react-auth')
const appFactory = require('./app_factory')

require('dotenv').config()

const app = appFactory()

const { router: authRouter, requireAuth } = expressAuth.createAuth({
  password: secrets.authorizationCode,
})

app.use('/api/auth', require('./routes/users'))

const transcriptionsRouter = require('./routes/transcriptions')
const vocabRouter = require('./routes/vocab')
const tabooRouter = require('./routes/taboo')
const storiesRouter = require('./routes/stories')

app.use('/api', requireAuth, transcriptionsRouter)
app.use('/api/vocab', requireAuth, vocabRouter)
app.use('/api/taboo', requireAuth, tabooRouter)
app.use('/api/stories', requireAuth, storiesRouter)

app.use(function (req, res, next) {
  res.status(404).json({ error: 'Not Found' })
})

// Error handler middleware
const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

module.exports = app
