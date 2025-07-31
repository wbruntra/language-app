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
const conversationsRouter = require('./routes/conversations')
const vocabRouter = require('./routes/vocab')
const tabooRouter = require('./routes/taboo')
const storiesRouter = require('./routes/stories')
const adminRouter = require('./routes/admin')
const { requireAdmin } = require('./middleware/adminAuth')

app.use('/api', requireAuth, transcriptionsRouter) // keeps /transcribe and health
app.use('/api/conversations', requireAuth, conversationsRouter) // new routes
app.use('/api/vocab', requireAuth, vocabRouter)
app.use('/api/taboo', requireAuth, tabooRouter)
app.use('/api/stories', requireAuth, storiesRouter)
app.use('/api/admin', requireAuth, requireAdmin, adminRouter) // admin routes with admin middleware

app.use(function (req, res, next) {
  res.status(404).json({ error: 'Not Found' })
})

// Error handler middleware
const errorHandler = require('./middleware/errorHandler')
app.use(errorHandler)

module.exports = app
