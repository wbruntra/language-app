require('module-alias/register')
const axios = require('axios')

const appFactory = require('../app_factory')

async function testTabooSessions() {
  console.log('🎯 Testing Taboo Game Session Management')

  const app = appFactory({
    sessionMW: (req, res, next) => {
      req.session.authorized = true // Mock session for testing
      req.session.user_id = 'jyyLnruPErEBXMK2YzUfe3' // user ID for testing

      next()
    },
  })

  const tabooRouter = require('../routes/taboo')
  app.use('/api/taboo', tabooRouter)

  app.listen(3000, () => {
    console.log('✅ Test server is running on http://localhost:3000')
  })

  const BASE_URL = 'http://localhost:3000/api/taboo'

  try {
    // Step 1: Get available cards
    console.log('\n=== Getting Available Cards ===')

    const cardsResponse = await axios.get(`${BASE_URL}/cards?count=3`)

    console.log('✅ Cards retrieved:', cardsResponse.data.count)

    if (!cardsResponse.data.success || !cardsResponse.data.cards.length) {
      throw new Error('No cards available for testing')
    }

    const testCard = cardsResponse.data.cards[0]
    console.log(`✅ Using test card: "${testCard.answer}" with ${testCard.key_words.length} key words`)

    // Step 2: Start a new game session
    console.log('\n=== Testing POST /api/taboo/sessions/start ===')
    const startSessionResponse = await axios.post(`${BASE_URL}/sessions/start`, {
      cardId: testCard.id,
      targetLanguage: 'spanish'
    })

    if (!startSessionResponse.data.success) {
      throw new Error('Failed to start session')
    }

    const session = startSessionResponse.data.session
    console.log('✅ Session started successfully:')
    console.log(JSON.stringify({
      sessionId: session.id,
      answerWord: session.answerWord,
      translatedKeyWords: session.translatedKeyWords,
      status: session.status
    }, null, 2))

    // Step 3: Get session details
    console.log('\n=== Testing GET /api/taboo/sessions/:sessionId ===')
    const getSessionResponse = await axios.get(`${BASE_URL}/sessions/${session.id}`)

    if (!getSessionResponse.data.success) {
      throw new Error('Failed to get session details')
    }

    console.log('✅ Session details retrieved:')
    console.log(JSON.stringify({
      id: getSessionResponse.data.session.id,
      answerWord: getSessionResponse.data.session.answerWord,
      status: getSessionResponse.data.session.status,
      translatedKeyWords: getSessionResponse.data.session.translatedKeyWords
    }, null, 2))

    // Step 4: Submit description for evaluation
    console.log('\n=== Testing POST /api/taboo/sessions/:sessionId/submit ===')
    
    // Generate a test description using the answer word and some key words
    const answerWord = session.answerWord
    const keyWords = session.translatedKeyWords
    
    let testDescription = `Es algo relacionado con ${keyWords[0] || 'algo importante'}`
    if (keyWords.length > 1) {
      testDescription += ` y también con ${keyWords[1]}`
    }
    testDescription += `. Es muy útil y común.`

    console.log(`🔍 Using test description: "${testDescription}"`)

    const submitResponse = await axios.post(`${BASE_URL}/sessions/${session.id}/submit`, {
      description: testDescription,
      includeExample: true
    })

    if (!submitResponse.data.success) {
      throw new Error('Failed to submit session')
    }

    console.log('✅ Session submitted successfully:')
    console.log(JSON.stringify({
      sessionId: submitResponse.data.sessionId,
      score: submitResponse.data.evaluation.score,
      wordsFound: submitResponse.data.evaluation.wordsFound,
      wordsMissed: submitResponse.data.evaluation.wordsMissed,
      hasExample: !!submitResponse.data.example
    }, null, 2))

    // Step 5: Get updated session details
    console.log('\n=== Verifying Completed Session ===')
    const completedSessionResponse = await axios.get(`${BASE_URL}/sessions/${session.id}`)

    if (!completedSessionResponse.data.success) {
      throw new Error('Failed to get completed session details')
    }

    const completedSession = completedSessionResponse.data.session
    console.log('✅ Completed session verified:')
    console.log(JSON.stringify({
      id: completedSession.id,
      status: completedSession.status,
      score: completedSession.score,
      wordsFound: completedSession.wordsFound?.length || 0,
      totalWords: completedSession.translatedKeyWords?.length || 0,
      hasAiExample: !!completedSession.aiExampleDescription
    }, null, 2))

    // Step 6: Get session history
    console.log('\n=== Testing GET /api/taboo/sessions (History) ===')
    const historyResponse = await axios.get(`${BASE_URL}/sessions?limit=5`)

    if (!historyResponse.data.success) {
      throw new Error('Failed to get session history')
    }

    console.log('✅ Session history retrieved:')
    console.log(JSON.stringify({
      totalSessions: historyResponse.data.sessions.length,
      sessions: historyResponse.data.sessions.map(s => ({
        id: s.id,
        answerWord: s.answerWord,
        status: s.status,
        score: s.score,
        wordsFound: s.wordsFound,
        totalWords: s.totalWords
      }))
    }, null, 2))

    // Step 8: Get user statistics
    console.log('\n=== Testing GET /api/taboo/stats ===')
    const statsResponse = await axios.get(`${BASE_URL}/stats`)

    if (!statsResponse.data.success) {
      throw new Error('Failed to get user statistics')
    }

    console.log('✅ User statistics retrieved:')
    console.log(JSON.stringify(statsResponse.data.stats, null, 2))

    // Step 9: Get categories
    console.log('\n=== Testing GET /api/taboo/categories ===')
    const categoriesResponse = await axios.get(`${BASE_URL}/categories`)

    if (!categoriesResponse.data.success) {
      throw new Error('Failed to get categories')
    }

    console.log('✅ Categories retrieved:')
    console.log(JSON.stringify(categoriesResponse.data.categories, null, 2))

    // Step 10: Test error cases
    console.log('\n=== Testing Error Cases ===')
    
    // Try to submit to already completed session
    try {
      await axios.post(`${BASE_URL}/sessions/${session.id}/submit`, {
        description: "Another description"
      })
      console.log('❌ Should have failed to submit to completed session')
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected submission to completed session')
      } else {
        throw error
      }
    }

    // Try to get non-existent session
    try {
      await axios.get(`${BASE_URL}/sessions/nonexistent-id`)
      console.log('❌ Should have failed to get non-existent session')
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for non-existent session')
      } else {
        throw error
      }
    }

    console.log('\n✨ All taboo session tests completed successfully!')

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
  testTabooSessions()
    .then(() => {
      console.log('\n🎉 Session management tests completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Session management tests failed!')
      console.error(error)
      process.exit(1)
    })
}

module.exports = { testTabooSessions }
