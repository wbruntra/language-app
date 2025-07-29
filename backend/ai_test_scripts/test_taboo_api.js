#!/usr/bin/env node

/**
 * Simple script to test taboo API endpoints
 * Make sure the server is running on localhost:13010
 */

const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')
const { OpenAI } = require('openai')
const secrets = require('../secrets')

// Initialize OpenAI for generating test descriptions
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a simple test description for a given word
 * @param {string} word - The word to describe
 * @param {string} targetLanguage - The language for the description (default: 'es')
 * @returns {Promise<string>} A simple description of the word
 */
async function generateTestDescription(word, targetLanguage = 'es') {
  try {
    const languageName = targetLanguage === 'es' ? 'Spanish' : targetLanguage;
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are helping create test descriptions for a language learning game. Generate a simple, natural description in ${languageName} for the given word. Keep it to 1-2 sentences and avoid using the word itself.`
        },
        {
          role: 'user',
          content: `Create a simple description in ${languageName} for the word: ${word}`
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    });

    return completion.choices[0].message.content.trim();
  } catch (error) {
    console.warn(`Failed to generate test description for "${word}":`, error.message);
    // Fallback to a generic description
    return targetLanguage === 'es' 
      ? `Es algo relacionado con la palabra ${word}` 
      : `Something related to the word ${word}`;
  }
}

const BASE_URL = 'http://localhost:13010/api'
const TABOO_URL = `${BASE_URL}/taboo`

// Create axios instance to maintain cookies (same as vocab manual test)
const jar = new CookieJar()
const client = wrapper(axios.create({
  jar,
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000 // 30 second timeout for OpenAI calls
}))

// Test user credentials
const testUser = {
  email: 'taboo-test@example.com',
  password: 'testpassword123',
  auth_code: secrets.authorizationCode,
  first_name: 'Taboo',
  last_name: 'Tester',
}

async function setupTestUser() {
  console.log('🔧 Setting up test user...')
  
  try {
    // Try to register the user (might fail if already exists)
    try {
      await client.post('/auth/register', testUser)
      console.log('✅ Test user registered')
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        console.log('📝 Test user already exists')
      } else {
        console.log('❌ Registration failed:', error.response?.data || error.message)
        return false
      }
    }
    
    // Login
    const loginResponse = await client.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    })
    
    if (loginResponse.data.authenticated) {
      console.log('✅ Logged in successfully')
      
      // Test auth status to verify session
      const statusResponse = await client.get('/auth/status')
      console.log('🔍 Auth status after login:', statusResponse.data)
      
      return statusResponse.data.authenticated
    } else {
      console.log('❌ Authentication failed')
      return false
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message)
    return false
  }
}

async function testGetCards() {
  console.log('\n=== Testing GET /api/taboo/cards ===')
  
  try {
    const response = await client.get('/taboo/cards?count=3')
    
    console.log('✅ Get cards successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.cards[0] // Return first card for further testing
  } catch (error) {
    console.log('❌ Get cards failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testTranslateEndpoint(keyWords = ['DRIVER', 'RED', 'FAST']) {
  console.log('\n=== Testing POST /api/taboo/translate ===')
  
  try {
    const response = await client.post('/taboo/translate', {
      keyWords,
      targetLanguage: 'es'
    })
    
    console.log('✅ Translation successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.translatedWords
  } catch (error) {
    console.log('❌ Translation failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testEvaluateEndpoint(translatedWords, answerWord = 'CAR') {
  console.log('\n=== Testing POST /api/taboo/evaluate ===')
  
  if (!translatedWords) {
    console.log('⏭️ Skipping evaluate test - no translated words available')
    return null
  }
  
  // Generate a test description using OpenAI
  console.log(`🔍 Generating test description for "${answerWord}"...`)
  const testDescription = await generateTestDescription(answerWord, 'es')
  console.log(`� Generated description: "${testDescription}"`)
  
  try {
    const response = await client.post('/taboo/evaluate', {
      description: testDescription,
      keyWords: translatedWords,
      answerWord: answerWord,
      targetLanguage: 'es'
    })
    
    console.log('✅ Evaluation successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data
  } catch (error) {
    console.log('❌ Evaluation failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testGenerateExampleEndpoint(translatedWords, answerWord = 'CAR') {
  console.log('\n=== Testing POST /api/taboo/generate-example ===')
  
  if (!translatedWords) {
    console.log('⏭️ Skipping generate example test - no translated words available')
    return null
  }
  
  try {
    const response = await client.post('/taboo/generate-example', {
      answerWord: answerWord,
      keyWords: translatedWords,
      targetLanguage: 'es'
    })
    
    console.log('✅ Generate example successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data
  } catch (error) {
    console.log('❌ Generate example failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testCompleteRoundEndpoint(translatedWords, answerWord = 'CAR') {
  console.log('\n=== Testing POST /api/taboo/complete-round ===')
  
  if (!translatedWords) {
    console.log('⏭️ Skipping complete round test - no translated words available')
    return null
  }
  
  // Generate a test description using OpenAI
  console.log(`🔍 Generating test description for complete round test of "${answerWord}"...`)
  const testDescription = await generateTestDescription(answerWord, 'es')
  console.log(`📝 Generated description: "${testDescription}"`)
  
  try {
    const response = await client.post('/taboo/complete-round', {
      description: testDescription,
      keyWords: translatedWords,
      answerWord: answerWord,
      targetLanguage: 'es',
      includeExample: true
    })
    
    console.log('✅ Complete round successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data
  } catch (error) {
    console.log('❌ Complete round failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testLanguagesEndpoint() {
  console.log('\n=== Testing GET /api/taboo/languages ===')
  
  try {
    const response = await client.get('/taboo/languages')
    
    console.log('✅ Get languages successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data
  } catch (error) {
    console.log('❌ Get languages failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function runTests() {
  console.log('🎯 Testing Taboo Game API Endpoints')
  console.log('Server: http://localhost:13010')
  
  // Setup authentication
  const authSuccess = await setupTestUser()
  if (!authSuccess) {
    console.log('❌ Could not authenticate, stopping tests')
    return
  }
  
  // Test all endpoints
  const card = await testGetCards()
  const languages = await testLanguagesEndpoint()
  
  let translatedWords = null
  let answerWord = 'CAR' // Default fallback
  
  if (card && card.key_words) {
    answerWord = card.answer // Use the actual answer from the card
    translatedWords = await testTranslateEndpoint(card.key_words)
  } else {
    translatedWords = await testTranslateEndpoint() // Use default words
  }
  
  if (translatedWords) {
    await testEvaluateEndpoint(translatedWords, answerWord)
    await testGenerateExampleEndpoint(translatedWords, answerWord)
    await testCompleteRoundEndpoint(translatedWords, answerWord)
  }
  
  console.log('\n✨ Taboo API tests completed!')
}

if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { 
  testGetCards,
  testTranslateEndpoint, 
  testEvaluateEndpoint, 
  testGenerateExampleEndpoint,
  testCompleteRoundEndpoint,
  testLanguagesEndpoint,
  setupTestUser 
}
