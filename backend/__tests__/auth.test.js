require('module-alias/register') // Initialize module-alias

const request = require('supertest')
const app = require('../app')
const knex = require('@db_connection')
const UserInfo = require('@tables/user_info')
const secrets = require('@secrets')

describe('User Authentication Routes', () => {
  let agent

  beforeAll(async () => {
    // Run migrations to ensure tables exist
    await knex.migrate.latest()
    // Create a supertest agent to maintain session state
    agent = request.agent(app)
  })

  afterAll(async () => {
    // Clean up tables after all tests in this suite
    await knex('user_vocab_info').del()
    await knex('conversation_info').del()
    await knex('user_info').del()
    // Close database connection
    await knex.destroy()
  })

  describe('GET /api/auth/status', () => {
    test('should return unauthenticated status for new user', async () => {
      const response = await request(app)
        .get('/api/auth/status')
        .expect(200)

      expect(response.body).toEqual({
        status: 'Unauthenticated',
        authenticated: false
      })
    })
  })

  describe('POST /api/auth/register', () => {
    test('should register a new user with valid auth code', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        auth_code: secrets.authorizationCode // Using the actual auth code from secrets
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201)

      expect(response.body.message).toBe('User registered successfully')
      expect(response.body.user_id).toBeDefined()

      // Verify user was created in database
      const createdUser = await UserInfo.query().findById(response.body.user_id)
      expect(createdUser).toBeDefined()
      expect(createdUser.email).toBe(userData.email)
      expect(createdUser.is_active).toBe(1) // SQLite boolean as integer
      expect(createdUser.email_verified).toBe(0)
      
      // Verify password was hashed
      expect(createdUser.password).not.toBe(userData.password)
      expect(createdUser.password).toMatch(/^\$2b\$/)
    })

    test('should reject registration with invalid auth code', async () => {
      const initialUserCount = await UserInfo.query().count('id as count').first()
      const userData = {
        email: 'invalid_auth_test@example.com',
        password: 'password123',
        auth_code: 'invalidCode'
      }

      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(401)

      // Verify user was not created
      const finalUserCount = await UserInfo.query().count('id as count').first()
      expect(finalUserCount.count).toBe(initialUserCount.count)
    })

    test('should reject registration with duplicate email', async () => {
      // First, create a user
      await UserInfo.query().insert({
        email: 'existing@example.com',
        password: 'password123'
      })

      const userData = {
        email: 'existing@example.com',
        password: 'differentPassword',
        auth_code: secrets.authorizationCode
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400)

      expect(response.body.error).toBe('Email already exists')
    })

    test('should reject registration with missing fields', async () => {
      const incompleteData = {
        email: 'incomplete@example.com',
        // Missing password and auth_code
      }

      const response = await request(app)
        .post('/api/auth/register')
        .send(incompleteData)
        .expect(400)

      expect(response.body.error).toBe('Email, password, and auth_code are required')
    })
  })

  describe('POST /api/auth/login', () => {
    let testUser
    const testPassword = 'testPassword123'

    beforeAll(async () => {
      // Create a test user for login tests  
      testUser = await UserInfo.query().insert({
        email: 'login_test_user@example.com',
        password: testPassword,
        first_name: 'Login',
        last_name: 'Test'
      })
    })

    test('should login successfully with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: testPassword
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200)

      expect(response.body.message).toBe('Login successful')
      expect(response.body.user_id).toBe(testUser.id)

      // Check if session cookie is set
      expect(response.headers['set-cookie']).toBeDefined()
      const cookies = response.headers['set-cookie']
      expect(cookies.some(cookie => cookie.includes('language-session'))).toBe(true)
    })

    test('should reject login with invalid password', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongPassword'
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Invalid email or password')
      expect(response.body.authenticated).toBe(false)
    })

    test('should reject login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: testPassword
      }

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401)

      expect(response.body.error).toBe('Invalid email or password')
      expect(response.body.authenticated).toBe(false)
    })

    test('should reject login with missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(401)

      expect(response.body.error).toBe('Invalid email or password')
    })
  })

  describe('GET /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .expect(200)

      expect(response.body.message).toBe('Logged out successfully')
      expect(response.body.authenticated).toBe(false)
    })
  })

  describe('Complete Authentication Workflow', () => {
    test('should handle complete user journey: register -> login -> check status -> logout', async () => {
      const userEmail = 'workflow_test_user@example.com'
      const userPassword = 'workflowPassword123'

      // Create a fresh agent for this test to maintain session state
      const testAgent = request.agent(app)

      // 1. Register a new user
      console.log('🔧 Step 1: Registering user...')
      const registerResponse = await testAgent
        .post('/api/auth/register')
        .send({
          email: userEmail,
          password: userPassword,
          auth_code: secrets.authorizationCode
        })
        .expect(201)

      expect(registerResponse.body.message).toBe('User registered successfully')
      const userId = registerResponse.body.user_id
      console.log(`✅ User registered with ID: ${userId}`)

      // 2. Check initial status (should be unauthenticated)
      console.log('🔧 Step 2: Checking initial auth status...')
      const initialStatusResponse = await testAgent
        .get('/api/auth/status')
        .expect(200)

      expect(initialStatusResponse.body.authenticated).toBe(false)
      console.log('✅ Initial status: unauthenticated')

      // 3. Login with the registered user
      console.log('🔧 Step 3: Logging in...')
      const loginResponse = await testAgent
        .post('/api/auth/login')
        .send({
          email: userEmail,
          password: userPassword
        })
        .expect(200)

      expect(loginResponse.body.message).toBe('Login successful')
      expect(loginResponse.body.user_id).toBe(userId)
      console.log('✅ Login successful, session established')

      // 4. Check authenticated status using the same agent (maintains session)
      console.log('🔧 Step 4: Checking authenticated status...')
      const authenticatedStatusResponse = await testAgent
        .get('/api/auth/status')
        .expect(200)

      expect(authenticatedStatusResponse.body.status).toBe('Authenticated')
      expect(authenticatedStatusResponse.body.authenticated).toBe(true)
      console.log('✅ Status check: authenticated')

      // 5. Test that requests without session are still unauthenticated
      console.log('🔧 Step 5: Verifying session isolation...')
      const unauthenticatedStatusResponse = await request(app)
        .get('/api/auth/status')
        .expect(200)

      expect(unauthenticatedStatusResponse.body.authenticated).toBe(false)
      console.log('✅ Session isolation confirmed')

      // 6. Logout
      console.log('🔧 Step 6: Logging out...')
      const logoutResponse = await testAgent
        .get('/api/auth/logout')
        .expect(200)

      expect(logoutResponse.body.message).toBe('Logged out successfully')
      expect(logoutResponse.body.authenticated).toBe(false)
      console.log('✅ Logout successful')

      // 7. Verify status is unauthenticated after logout
      console.log('🔧 Step 7: Verifying logout status...')
      const postLogoutStatusResponse = await testAgent
        .get('/api/auth/status')
        .expect(200)

      expect(postLogoutStatusResponse.body.authenticated).toBe(false)
      console.log('✅ Post-logout status: unauthenticated')

      // 8. Verify user still exists in database but is not authenticated
      const userInDb = await UserInfo.query().findById(userId)
      expect(userInDb).toBeDefined()
      expect(userInDb.email).toBe(userEmail)
      console.log('✅ User persists in database after logout')

      console.log('🎉 Complete authentication workflow test passed!')
    })

    test('should maintain session across multiple authenticated requests', async () => {
      // Create user first
      const user = await UserInfo.query().insert({
        email: 'session_test_user@example.com',
        password: 'sessionTest123'
      })

      // Create a fresh agent for this test
      const testAgent = request.agent(app)

      // Login to establish session
      const loginResponse = await testAgent
        .post('/api/auth/login')
        .send({
          email: 'session_test_user@example.com',
          password: 'sessionTest123'
        })
        .expect(200)

      // Make multiple requests with the same agent (maintains session)
      for (let i = 1; i <= 3; i++) {
        const statusResponse = await testAgent
          .get('/api/auth/status')
          .expect(200)

        expect(statusResponse.body.authenticated).toBe(true)
        console.log(`✅ Request ${i}: Session maintained`)
      }
    })
  })
})
