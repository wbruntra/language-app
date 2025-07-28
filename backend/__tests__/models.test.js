require('module-alias/register') // Initialize module-alias

const knex = require('@db_connection')
const UserInfo = require('@tables/user_info')
const ConversationInfo = require('@tables/conversation_info')
const UserVocabInfo = require('@tables/user_vocab_info')

describe('Language Helper Models', () => {
  beforeAll(async () => {
    // Run migrations to ensure tables exist
    await knex.migrate.latest()
  })

  afterAll(async () => {
    // Clean up tables after all tests in this suite
    await knex('user_vocab_info').del()
    await knex('conversation_info').del()
    await knex('user_info').del()
    // Close database connection
    await knex.destroy()
  })

  describe('UserInfo Model', () => {
    test('should create a user with auto-generated ID', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      }

      const user = await UserInfo.query().insert(userData)

      expect(user.id).toBeDefined()
      expect(user.id).toMatch(/^[a-zA-Z0-9_-]+$/) // short-uuid format
      expect(user.email).toBe(userData.email)
      expect(user.first_name).toBe(userData.first_name)
      expect(user.created_at).toBeDefined()
      expect(user.updated_at).toBeDefined()
    })

    test('should hash passwords on insert', async () => {
      const plainPassword = 'mySecretPassword123'
      const userData = {
        email: 'hash_test@example.com',
        password: plainPassword,
        
      }

      const user = await UserInfo.query().insert(userData)

      // Password should be hashed (bcrypt hashes start with $2b$)
      expect(user.password).not.toBe(plainPassword)
      expect(user.password).toMatch(/^\$2b\$/)
      expect(user.password.length).toBeGreaterThan(50) // bcrypt hashes are long
    })

    test('should verify passwords correctly', async () => {
      const plainPassword = 'testPassword456'
      const userData = {
        email: 'verify_test@example.com',
        password: plainPassword,
        
      }

      const user = await UserInfo.query().insert(userData)

      // Should verify correct password
      const isValidPassword = await user.verifyPassword(plainPassword)
      expect(isValidPassword).toBe(true)

      // Should reject incorrect password
      const isInvalidPassword = await user.verifyPassword('wrongPassword')
      expect(isInvalidPassword).toBe(false)

      // Should handle empty/null passwords
      const isEmptyPassword = await user.verifyPassword('')
      expect(isEmptyPassword).toBe(false)
    })

    test('should authenticate users with email and password', async () => {
      const email = 'auth_test@example.com'
      const password = 'authTestPassword789'
      
      // Create user
      await UserInfo.query().insert({
        email,
        password,
        first_name: 'Auth',
        last_name: 'Test'
      })

      // Should authenticate with correct credentials
      const authenticatedUser = await UserInfo.authenticate(email, password)
      expect(authenticatedUser).not.toBeNull()
      expect(authenticatedUser.email).toBe(email)
      expect(authenticatedUser.first_name).toBe('Auth')

      // Should fail with incorrect password
      const failedAuth = await UserInfo.authenticate(email, 'wrongPassword')
      expect(failedAuth).toBeNull()

      // Should fail with non-existent email
      const nonExistentAuth = await UserInfo.authenticate('nonexistent@example.com', password)
      expect(nonExistentAuth).toBeNull()
    })

    test('should hash passwords on update', async () => {
      const user = await UserInfo.query().insert({
        email: 'update_test@example.com',
        password: 'originalPassword',
        
      })

      const originalHash = user.password

      // Update password
      const newPassword = 'newSecretPassword'
      await UserInfo.query().patchAndFetchById(user.id, { password: newPassword })

      // Fetch updated user
      const updatedUser = await UserInfo.query().findById(user.id)

      // Password should be newly hashed
      expect(updatedUser.password).not.toBe(newPassword)
      expect(updatedUser.password).not.toBe(originalHash)
      expect(updatedUser.password).toMatch(/^\$2b\$/)

      // Should verify with new password
      const isValid = await updatedUser.verifyPassword(newPassword)
      expect(isValid).toBe(true)

      // Should not verify with old password
      const isOldValid = await updatedUser.verifyPassword('originalPassword')
      expect(isOldValid).toBe(false)
    })

    test('should validate required fields', async () => {
      const invalidUserData = {
        first_name: 'John'
        // Missing required fields: email, password
      }

      await expect(
        UserInfo.query().insert(invalidUserData)
      ).rejects.toThrow()
    })

    test('should enforce unique email constraint', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123'
      }

      // Insert first user
      await UserInfo.query().insert(userData)

      // Try to insert user with same email - should throw UniqueViolationError
      await expect(
        UserInfo.query().insert(userData)
      ).rejects.toThrow(/UNIQUE constraint failed|UniqueViolationError/)
    })
  })

  describe('ConversationInfo Model', () => {
    let testUser

    beforeAll(async () => {
      testUser = await UserInfo.query().insert({
        email: 'conversation_test_user@example.com',
        password: 'password123'
      })
    })

    test('should create a conversation with auto-generated ID', async () => {
      const conversationData = {
        language: 'English',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' }
        ],
        metadata: { topic: 'greetings' },
        user_id: testUser.id
      }

      const conversation = await ConversationInfo.query().insert(conversationData)

      expect(conversation.id).toBeDefined()
      expect(conversation.id).toMatch(/^[a-zA-Z0-9_-]+$/)
      expect(conversation.language).toBe(conversationData.language)
      expect(conversation.messages).toEqual(conversationData.messages)
      expect(conversation.user_id).toBe(testUser.id)
      expect(conversation.created_at).toBeDefined()
    })

    test('should establish relationship with user', async () => {
      const conversation = await ConversationInfo.query().insert({
        language: 'Spanish',
        user_id: testUser.id
      })

      // Test the relationship
      const conversationWithUser = await ConversationInfo.query()
        .findById(conversation.id)
        .withGraphFetched('user')

      expect(conversationWithUser.user).toBeDefined()
      expect(conversationWithUser.user.id).toBe(testUser.id)
      expect(conversationWithUser.user.email).toBe(testUser.email)
    })
  })

  describe('UserVocabInfo Model', () => {
    let testUser

    beforeAll(async () => {
      testUser = await UserInfo.query().insert({
        email: 'vocab_test_user@example.com',
        password: 'password123'
      })
    })

    test('should create vocabulary words with auto-generated IDs', async () => {
      const vocabWord1 = {
        word: 'hello',
        language: 'English',
        metadata: { definition: 'a greeting', difficulty: 'beginner' },
        user_id: testUser.id
      }

      const vocabWord2 = {
        word: 'goodbye',
        language: 'English',
        metadata: { definition: 'a farewell', difficulty: 'beginner' },
        user_id: testUser.id
      }

      const vocab1 = await UserVocabInfo.query().insert(vocabWord1)
      const vocab2 = await UserVocabInfo.query().insert(vocabWord2)

      expect(vocab1.id).toBeDefined()
      expect(vocab1.id).toMatch(/^[a-zA-Z0-9_-]+$/)
      expect(vocab1.word).toBe('hello')
      expect(vocab1.language).toBe('English')

      expect(vocab2.id).toBeDefined()
      expect(vocab2.id).toMatch(/^[a-zA-Z0-9_-]+$/)
      expect(vocab2.word).toBe('goodbye')

      // IDs should be different
      expect(vocab1.id).not.toBe(vocab2.id)
    })

    test('should establish relationship with user', async () => {
      const vocab = await UserVocabInfo.query().insert({
        word: 'computer',
        language: 'English',
        user_id: testUser.id
      })

      // Test the relationship
      const vocabWithUser = await UserVocabInfo.query()
        .findById(vocab.id)
        .withGraphFetched('user')

      expect(vocabWithUser.user).toBeDefined()
      expect(vocabWithUser.user.id).toBe(testUser.id)
      expect(vocabWithUser.user.email).toBe(testUser.email)
    })
  })

  describe('Complete User Workflow', () => {
    test('should create user, conversation, and vocabulary words with proper relationships', async () => {
      // 1. Create a user
      const user = await UserInfo.query().insert({
        email: 'workflow_test_user@example.com',
        password: 'password123',
        first_name: 'Alice',
        last_name: 'Johnson'
      })

      expect(user.id).toBeDefined()

      // 2. Add a conversation for that user
      const conversation = await ConversationInfo.query().insert({
        language: 'English',
        messages: [
          { role: 'user', content: 'I want to learn new words' },
          { role: 'assistant', content: 'Great! Let\'s start with some basic vocabulary.' }
        ],
        metadata: { session_type: 'vocabulary_learning' },
        user_id: user.id
      })

      expect(conversation.id).toBeDefined()
      expect(conversation.user_id).toBe(user.id)

      // 3. Add two vocabulary words for that user
      const vocab1 = await UserVocabInfo.query().insert({
        word: 'learn',
        language: 'English',
        metadata: { 
          definition: 'to acquire knowledge or skill',
          difficulty: 'intermediate',
          context: 'I want to learn new languages'
        },
        user_id: user.id
      })

      const vocab2 = await UserVocabInfo.query().insert({
        word: 'practice',
        language: 'English',
        metadata: { 
          definition: 'to do something repeatedly to improve',
          difficulty: 'intermediate',
          context: 'Practice makes perfect'
        },
        user_id: user.id
      })

      expect(vocab1.id).toBeDefined()
      expect(vocab2.id).toBeDefined()
      expect(vocab1.user_id).toBe(user.id)
      expect(vocab2.user_id).toBe(user.id)

      // 4. Test relationships - fetch user with all related data
      const userWithRelations = await UserInfo.query()
        .findById(user.id)
        .withGraphFetched('[conversations, vocabulary]')

      expect(userWithRelations.conversations).toHaveLength(1)
      expect(userWithRelations.conversations[0].id).toBe(conversation.id)
      expect(userWithRelations.conversations[0].language).toBe('English')

      expect(userWithRelations.vocabulary).toHaveLength(2)
      
      const words = userWithRelations.vocabulary.map(v => v.word).sort()
      expect(words).toEqual(['learn', 'practice'])

      // 5. Verify all IDs are properly generated and unique
      const allIds = [
        user.id,
        conversation.id,
        vocab1.id,
        vocab2.id
      ]

      // All IDs should be defined and unique
      expect(new Set(allIds).size).toBe(4)
      allIds.forEach(id => {
        expect(id).toMatch(/^[a-zA-Z0-9_-]+$/)
      })
    })
  })
})
