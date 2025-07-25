const express = require('express')
const cors = require('cors')
const logger = require('morgan')
const path = require('path')
const cookieSession = require('cookie-session')
const secrets = require('./secrets')


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

app.use('/api/auth', require('./routes/auth'))

const transcriptionsRouter = require('./transcriptions_v2')
app.use('/api', transcriptionsRouter)


// Start server
const PORT = process.env.PORT || 13010
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
