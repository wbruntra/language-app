#!/usr/bin/env node

/**
 * Simple test for session endpoints using existing authenticated session
 * Run this after running test_taboo_api.js to use the same authenticated session
 */

const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')

// Setup axios with cookie support
const jar = new CookieJar()
const client = wrapper(axios.create({ jar }))

const BASE_URL = 'http://localhost:13010'

async function testSessionEndpoints() {
  console.log('🎯 Testing Session Endpoints (Quick Test)')
  console.log(`Server: ${BASE_URL}`)
  
  try {
    // Step 1: Use existing authenticated session from previous tests
    console.log('\n🔧 Using existing authentication...')
    
    // First, login with the test user that we know works
    const loginResponse = await client.post(`${BASE_URL}/api/users/login`, {
      email: 'taboo-test@example.com',
      password: 'TestPassword123!'
    })

    if (!loginResponse.data.success) {
      throw new Error('Login failed - test user may not exist')
    }
    console.log('✅ Logged in successfully')

    // Step 2: Get available cards
    console.log('\n=== Getting Available Cards ===')
    const cardsResponse = await client.get(`${BASE_URL}/api/taboo/cards?count=1`)
    
    if (!cardsResponse.data.success || !cardsResponse.data.cards.length) {
      throw new Error('No cards available for testing')
    }

    const testCard = cardsResponse.data.cards[0]
    console.log(`✅ Using test card: "${testCard.answer}" (ID: ${testCard.id})`)

    // Step 3: Start a new game session
    console.log('\n=== Testing Session Start ===')
    const startSessionResponse = await client.post(`${BASE_URL}/api/taboo/sessions/start`, {
      cardId: testCard.id,
      targetLanguage: 'es'
    })

    if (!startSessionResponse.data.success) {
      throw new Error('Failed to start session')
    }

    const session = startSessionResponse.data.session
    console.log('✅ Session started successfully:')
    console.log(`   Session ID: ${session.id}`)
    console.log(`   Answer: ${session.answerWord}`)
    console.log(`   Translated Keywords: ${session.translatedKeyWords.join(', ')}`)

    // Step 4: Get session details
    console.log('\n=== Testing Get Session Details ===')
    const getSessionResponse = await client.get(`${BASE_URL}/api/taboo/sessions/${session.id}`)
    
    if (!getSessionResponse.data.success) {
      throw new Error('Failed to get session details')
    }

    console.log('✅ Session details retrieved successfully')
    console.log(`   Status: ${getSessionResponse.data.session.status}`)

    // Step 5: Submit description
    console.log('\n=== Testing Session Submit ===')
    const testDescription = `Es algo relacionado con ${session.translatedKeyWords[0]} y es muy útil.`
    
    const submitResponse = await client.post(`${BASE_URL}/api/taboo/sessions/${session.id}/submit`, {
      description: testDescription,
      includeExample: true
    })

    if (!submitResponse.data.success) {
      throw new Error('Failed to submit session')
    }

    console.log('✅ Session submitted successfully:')
    console.log(`   Score: ${submitResponse.data.evaluation.score}`)
    console.log(`   Words Found: ${submitResponse.data.evaluation.wordsFound.length}`)
    console.log(`   Has Example: ${!!submitResponse.data.example}`)

    // Step 6: Get session history
    console.log('\n=== Testing Session History ===')
    const historyResponse = await client.get(`${BASE_URL}/api/taboo/sessions?limit=3`)
    
    if (!historyResponse.data.success) {
      throw new Error('Failed to get session history')
    }

    console.log('✅ Session history retrieved:')
    console.log(`   Total Sessions: ${historyResponse.data.sessions.length}`)
    
    historyResponse.data.sessions.forEach((s, i) => {
      console.log(`   ${i + 1}. "${s.answerWord}" - Score: ${s.score}, Status: ${s.status}`)
    })

    // Step 7: Get user statistics
    console.log('\n=== Testing User Statistics ===')
    const statsResponse = await client.get(`${BASE_URL}/api/taboo/stats`)
    
    if (!statsResponse.data.success) {
      throw new Error('Failed to get user statistics')
    }

    console.log('✅ User statistics retrieved:')
    console.log(`   Total Games: ${statsResponse.data.stats.totalGames}`)
    console.log(`   Average Score: ${statsResponse.data.stats.averageScore}`)
    console.log(`   Best Score: ${statsResponse.data.stats.bestScore}`)

    // Step 8: Get categories
    console.log('\n=== Testing Categories ===')
    const categoriesResponse = await client.get(`${BASE_URL}/api/taboo/categories`)
    
    if (!categoriesResponse.data.success) {
      throw new Error('Failed to get categories')
    }

    console.log('✅ Categories retrieved:')
    console.log(`   Available: ${categoriesResponse.data.categories.join(', ')}`)

    console.log('\n✨ All session endpoint tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', JSON.stringify(error.response.data, null, 2))
    }
    throw error
  }
}

// Run the tests
if (require.main === module) {
  testSessionEndpoints()
    .then(() => {
      console.log('\n🎉 Session endpoint tests completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Session endpoint tests failed!')
      console.error(error)
      process.exit(1)
    })
}

module.exports = { testSessionEndpoints }
