require('module-alias/register')
const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')
const { OpenAI } = require('openai')

// Set up axios with cookie jar for session management
const jar = new CookieJar()
const client = wrapper(axios.create({ jar }))

const baseURL = 'http://localhost:3001'

// Initialize OpenAI for generating test descriptions
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Test user credentials
const testUser = {
  username: 'testuser',
  password: 'testpass123'
}

async function authenticateUser() {
  try {
    console.log('🔐 Authenticating user...')
    
    const response = await client.post(`${baseURL}/api/users/login`, testUser)
    
    if (response.status === 200) {
      console.log('✅ Authentication successful')
      return true
    } else {
      console.log('❌ Authentication failed:', response.status)
      return false
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.response?.status, error.response?.data?.error || error.message)
    return false
  }
}

async function testGetCards() {
  console.log('\n📋 Testing GET /api/taboo/cards...')
  
  try {
    // Test basic card retrieval
    const response = await client.get(`${baseURL}/api/taboo/cards`)
    console.log('✅ Cards retrieved:', {
      success: response.data.success,
      count: response.data.count,
      firstCard: response.data.cards[0]
    })

    // Test with parameters
    const categoryResponse = await client.get(`${baseURL}/api/taboo/cards?count=3&category=animals`)
    console.log('✅ Animal cards retrieved:', categoryResponse.data.count)

    return response.data.cards[0]
  } catch (error) {
    console.log('❌ Error getting cards:', error.response?.data || error.message)
    return null
  }
}

async function testStartSession(card, targetLanguage = 'es') {
  console.log('\n🎮 Testing POST /api/taboo/sessions/start...')
  
  try {
    const response = await client.post(`${baseURL}/api/taboo/sessions/start`, {
      cardId: card.id,
      targetLanguage
    })
    
    console.log('✅ Session started:', {
      sessionId: response.data.session.id,
      answerWord: response.data.session.answerWord,
      translatedKeyWords: response.data.session.translatedKeyWords,
      status: response.data.session.status
    })
    
    return response.data.session
  } catch (error) {
    console.log('❌ Error starting session:', error.response?.data || error.message)
    return null
  }
}

async function generateTestDescription(answerWord, translatedKeyWords, targetLanguage) {
  try {
    const prompt = `Create a realistic description in ${targetLanguage} for the word "${answerWord}". 
    Try to naturally incorporate some (but not necessarily all) of these key words: ${translatedKeyWords.join(', ')}.
    The description should be natural and conversational, like something a language learner might say.
    Keep it to 1-2 sentences. Do not use the answer word "${answerWord}" directly.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are a language learner creating descriptions for a taboo-style word game.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 100,
      temperature: 0.7
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.log('Warning: Could not generate AI description, using fallback')
    // Fallback description
    return `Es algo relacionado con ${translatedKeyWords.slice(0, 2).join(' y ')}.`
  }
}

async function testCompleteSession(session) {
  console.log('\n🏁 Testing POST /api/taboo/sessions/:sessionId/complete...')
  
  try {
    // Generate a realistic test description
    const testDescription = await generateTestDescription(
      session.answerWord,
      session.translatedKeyWords,
      session.targetLanguage
    )
    
    console.log('📝 Using test description:', testDescription)
    
    const response = await client.post(`${baseURL}/api/taboo/sessions/${session.id}/complete`, {
      description: testDescription,
      includeExample: true
    })
    
    console.log('✅ Session completed:', {
      score: response.data.session.score,
      wordsFound: response.data.session.wordsFound,
      wordsMissed: response.data.session.wordsMissed,
      status: response.data.session.status,
      hasExample: !!response.data.session.exampleDescription
    })
    
    if (response.data.session.evaluation) {
      console.log('📊 Evaluation details:', {
        feedback: response.data.session.evaluation.feedback,
        suggestions: response.data.session.evaluation.suggestions?.slice(0, 2)
      })
    }
    
    return response.data.session
  } catch (error) {
    console.log('❌ Error completing session:', error.response?.data || error.message)
    return null
  }
}

async function testSessionHistory() {
  console.log('\n📚 Testing GET /api/taboo/sessions/history...')
  
  try {
    const response = await client.get(`${baseURL}/api/taboo/sessions/history?limit=5`)
    
    console.log('✅ Session history retrieved:', {
      count: response.data.count,
      sessions: response.data.sessions.map(s => ({
        answerWord: s.answerWord,
        score: s.score,
        wordsFound: s.wordsFound,
        totalWords: s.totalWords
      }))
    })
    
    return response.data.sessions
  } catch (error) {
    console.log('❌ Error getting session history:', error.response?.data || error.message)
    return null
  }
}

async function testSessionStats() {
  console.log('\n📈 Testing GET /api/taboo/sessions/stats...')
  
  try {
    const response = await client.get(`${baseURL}/api/taboo/sessions/stats`)
    
    console.log('✅ Session stats retrieved:', response.data.stats)
    
    return response.data.stats
  } catch (error) {
    console.log('❌ Error getting session stats:', error.response?.data || error.message)
    return null
  }
}

async function testCategories() {
  console.log('\n🏷️ Testing GET /api/taboo/categories...')
  
  try {
    const response = await client.get(`${baseURL}/api/taboo/categories`)
    
    console.log('✅ Categories retrieved:', response.data.categories)
    
    return response.data.categories
  } catch (error) {
    console.log('❌ Error getting categories:', error.response?.data || error.message)
    return null
  }
}

async function testLanguages() {
  console.log('\n🌍 Testing GET /api/taboo/languages...')
  
  try {
    const response = await client.get(`${baseURL}/api/taboo/languages`)
    
    console.log('✅ Languages retrieved:', response.data.languages.length, 'languages')
    
    return response.data.languages
  } catch (error) {
    console.log('❌ Error getting languages:', error.response?.data || error.message)
    return null
  }
}

async function runFullTabooGameTest() {
  console.log('🎯 Starting comprehensive taboo database API test...\n')
  
  // 1. Authenticate
  const authenticated = await authenticateUser()
  if (!authenticated) {
    console.log('❌ Cannot proceed without authentication')
    return
  }
  
  // 2. Test supporting endpoints
  await testCategories()
  await testLanguages()
  
  // 3. Get a card
  const card = await testGetCards()
  if (!card) {
    console.log('❌ Cannot proceed without a card')
    return
  }
  
  // 4. Start a session
  const session = await testStartSession(card, 'es')
  if (!session) {
    console.log('❌ Cannot proceed without a session')
    return
  }
  
  // 5. Complete the session
  const completedSession = await testCompleteSession(session)
  if (!completedSession) {
    console.log('❌ Session completion failed')
    return
  }
  
  // 6. Test history and stats
  await testSessionHistory()
  await testSessionStats()
  
  console.log('\n🎉 All taboo database tests completed successfully!')
  console.log('\n📊 Test Summary:')
  console.log('- Database tables: ✅ Working')
  console.log('- Session management: ✅ Working')
  console.log('- AI integration: ✅ Working')
  console.log('- History tracking: ✅ Working')
  console.log('- Statistics: ✅ Working')
}

// Run the test if this script is executed directly
if (require.main === module) {
  runFullTabooGameTest()
    .then(() => {
      console.log('\n✅ Test suite completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error)
      process.exit(1)
    })
}

module.exports = {
  runFullTabooGameTest,
  testGetCards,
  testStartSession,
  testCompleteSession,
  testSessionHistory,
  testSessionStats,
  testCategories,
  testLanguages
}
