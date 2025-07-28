const express = require('express')
const router = express.Router()
const secrets = require('../secrets')
const bcrypt = require('bcrypt')
const UserInfo = require('@tables/user_info')

router.get('/status', async (req, res) => {
  if (req.session && req.session.authenticated) {
    try {
      // Fetch user details from database
      const user = await UserInfo.query().findById(req.session.user_id)
      if (user) {
        res.status(200).json({
          status: 'Authenticated',
          authenticated: true,
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          },
        })
      } else {
        // User not found in database, clear session
        req.session = null
        res.status(200).json({ status: 'Unauthenticated', authenticated: false })
      }
    } catch (err) {
      console.error('Error fetching user status:', err)
      res.status(200).json({ status: 'Unauthenticated', authenticated: false })
    }
  } else {
    res.status(200).json({ status: 'Unauthenticated', authenticated: false })
  }
})

router.post('/register', async (req, res) => {
  const { email, password, auth_code, first_name, last_name } = req.body

  // Validate required fields
  if (!email || !password || !auth_code) {
    return res.status(400).json({ error: 'Email, password, and auth_code are required' })
  }

  const authResult = await bcrypt.compare(auth_code, secrets.hashedAuthCode)

  if (!authResult) {
    return res.status(401).json({ error: 'Invalid authentication code' })
  }

  try {
    const user = await UserInfo.query().insert({
      email,
      password,
      is_active: true,
      email_verified: false,
      first_name,
      last_name,
    })
    res.status(201).json({ message: 'User registered successfully', user_id: user.id })
  } catch (err) {
    console.error('Error registering user:', err)
    if (err.code === 'SQLITE_CONSTRAINT' || err.name === 'UniqueViolationError') {
      res.status(400).json({ error: 'Email already exists' })
    } else {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
})

// Login endpoint
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  // Validate required fields
  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid email or password', authenticated: false })
  }

  try {
    const authenticatedUser = await UserInfo.authenticate(email, password)
    if (authenticatedUser) {
      req.session.authenticated = true
      req.session.user_id = authenticatedUser.id
      res.status(200).json({
        message: 'Login successful',
        user_id: authenticatedUser.id,
        authenticated: true,
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          first_name: authenticatedUser.first_name,
          last_name: authenticatedUser.last_name,
        },
      })
    } else {
      res.status(401).json({ error: 'Invalid email or password', authenticated: false })
    }
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Internal server error', authenticated: false })
  }
})

// Logout endpoint
router.get('/logout', (req, res) => {
  req.session = null // Clear the session
  res.status(200).json({ message: 'Logged out successfully', authenticated: false })
})

// Test cleanup endpoint - only for testing environment
router.delete('/test-cleanup', async (req, res) => {
  const { email } = req.body

  // Only allow this endpoint in development/test environments
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' })
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' })
  }

  try {
    const deletedCount = await UserInfo.query().delete().where('email', email)
    res.status(200).json({
      message: 'User cleaned up successfully',
      deleted: deletedCount > 0,
    })
  } catch (err) {
    console.error('Error cleaning up test user:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router
