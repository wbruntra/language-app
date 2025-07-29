#!/usr/bin/env node

/**
 * Manual test script for vocabulary API endpoints with real OpenAI integration
 * This will make actual API calls to test the complete flow
 */

const axios = require('axios')
const { wrapper } = require('axios-cookiejar-support')
const { CookieJar } = require('tough-cookie')
require('dotenv').config()

const BASE_URL = 'http://localhost:13010/api'

// Test user data
const testUser = {
  email: 'vocab-test@example.com',
  password: 'testpassword123',
  auth_code: process.env.AUTH_CODE || 'test', // Default to 'test' from secrets
  first_name: 'Vocab',
  last_name: 'Tester'
}

// Create axios instance to maintain cookies
const jar = new CookieJar()
const client = wrapper(axios.create({
  jar,
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 30000 // 30 second timeout for OpenAI calls
}))

async function authenticate() {
  console.log('🔐 Authenticating...')
  
  try {
    // Try to register (might fail if user exists)
    try {
      await client.post('/auth/register', testUser)
      console.log('✅ User registered')
    } catch (regError) {
      if (regError.response?.status === 400) {
        console.log('📝 User already exists, proceeding to login')
      } else {
        throw regError
      }
    }
    
    // Login
    const loginResponse = await client.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    })

    console.log("login response", loginResponse.data)
    
    if (loginResponse.data.authenticated) {
      console.log('✅ Authenticated successfully')
      
      // Test auth status to verify session
      const statusResponse = await client.get('/auth/status')
      console.log('🔍 Auth status after login:', statusResponse.data)
      
      return statusResponse.data.authenticated
    } else {
      console.log('❌ Authentication failed')
      return false
    }
  } catch (error) {
    console.log('❌ Authentication error:', error.response?.data || error.message)
    return false
  }
}

async function testVocabularyAnalysis() {
  console.log('\n📝 Testing vocabulary analysis...')
  
  const testCases = [
    {
      word: 'corriendo',
      context: 'El niño está corriendo en el parque.',
      language: 'Spanish',
      expected: { baseForm: 'correr', partOfSpeech: 'verb' }
    },
    {
      word: 'libros',
      context: 'Los libros están en la mesa.',
      language: 'Spanish',
      expected: { baseForm: 'libro', partOfSpeech: 'noun' }
    },
    {
      word: 'bella',
      context: 'Ella es muy bella.',
      language: 'Spanish',
      expected: { baseForm: 'bello', partOfSpeech: 'adjective' }
    }
  ]
  
  for (const testCase of testCases) {
    try {
      console.log(`\n🔍 Analyzing: "${testCase.word}" in "${testCase.context}"`)
      
      const response = await client.post('/vocab/analyze', {
        word: testCase.word,
        context: testCase.context,
        language: testCase.language
      })
      
      if (response.data.success) {
        const analysis = response.data.analysis
        console.log('✅ Analysis successful:')
        console.log(`   Base form: ${analysis.baseForm}`)
        console.log(`   Part of speech: ${analysis.partOfSpeech}`)
        console.log(`   Definition: ${analysis.definition}`)
        console.log(`   Confidence: ${analysis.confidence}`)
        
        // Validate against expected results
        if (analysis.baseForm === testCase.expected.baseForm) {
          console.log('✅ Base form matches expected')
        } else {
          console.log(`⚠️  Base form mismatch: expected ${testCase.expected.baseForm}, got ${analysis.baseForm}`)
        }
        
        if (analysis.partOfSpeech === testCase.expected.partOfSpeech) {
          console.log('✅ Part of speech matches expected')
        } else {
          console.log(`⚠️  Part of speech mismatch: expected ${testCase.expected.partOfSpeech}, got ${analysis.partOfSpeech}`)
        }
        
        // Save the word for further testing
        await testSaveVocabulary(testCase, analysis)
        
      } else {
        console.log('❌ Analysis failed:', response.data.error)
      }
    } catch (error) {
      console.log('❌ Analysis error:', error.response?.data || error.message)
    }
    
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

async function testSaveVocabulary(testCase, analysis) {
  try {
    console.log(`💾 Saving word: ${analysis.baseForm}`)
    
    const response = await client.post('/vocab/save', {
      word: analysis.baseForm,
      originalWord: testCase.word,
      baseForm: analysis.baseForm,
      language: testCase.language,
      partOfSpeech: analysis.partOfSpeech,
      definition: analysis.definition,
      context: testCase.context,
      confidence: analysis.confidence
    })
    
    if (response.data.success) {
      console.log(`✅ Word saved: ${response.data.message}`)
      return response.data.word
    } else {
      console.log('❌ Save failed:', response.data.error)
    }
  } catch (error) {
    console.log('❌ Save error:', error.response?.data || error.message)
  }
}

async function testVocabularyList() {
  console.log('\n📚 Testing vocabulary list...')
  
  try {
    const response = await client.get('/vocab/Spanish')
    
    if (response.data.success) {
      console.log('✅ Vocabulary list retrieved:')
      console.log(`   Total words: ${response.data.pagination.total}`)
      console.log(`   Words on this page: ${response.data.words.length}`)
      
      response.data.words.forEach((word, index) => {
        console.log(`   ${index + 1}. ${word.word} (${word.part_of_speech}) - ${word.definition}`)
      })
      
      return response.data.words
    } else {
      console.log('❌ List failed:', response.data.error)
    }
  } catch (error) {
    console.log('❌ List error:', error.response?.data || error.message)
  }
}

async function testVocabularyStats() {
  console.log('\n📊 Testing vocabulary statistics...')
  
  try {
    const response = await client.get('/vocab/Spanish/stats')
    
    if (response.data.success) {
      const stats = response.data.stats
      console.log('✅ Statistics retrieved:')
      console.log(`   Total words: ${stats.totalWords}`)
      console.log(`   Learned words: ${stats.learnedWords}`)
      console.log(`   Learned percentage: ${stats.learnedPercentage}%`)
      console.log(`   Recent words (7 days): ${stats.recentWords}`)
      console.log(`   Part of speech breakdown:`)
      
      Object.entries(stats.partOfSpeechBreakdown).forEach(([pos, count]) => {
        console.log(`     ${pos}: ${count}`)
      })
    } else {
      console.log('❌ Stats failed:', response.data.error)
    }
  } catch (error) {
    console.log('❌ Stats error:', error.response?.data || error.message)
  }
}

async function testErrorHandling() {
  console.log('\n🚫 Testing error handling...')
  
  // Test missing fields
  try {
    await client.post('/vocab/analyze', {})
    console.log('❌ Should have failed with missing fields')
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected request with missing fields')
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message)
    }
  }
  
  // Test empty fields
  try {
    await client.post('/vocab/analyze', {
      word: '',
      context: 'Some context',
      language: 'Spanish'
    })
    console.log('❌ Should have failed with empty word')
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Correctly rejected request with empty word')
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message)
    }
  }
}

async function runManualTests() {
  console.log('🧪 Starting Manual Vocabulary API Tests')
  console.log('This will make real OpenAI API calls and test the complete flow')
  console.log('Make sure you have OPENAI_API_KEY and AUTH_CODE in your .env file\n')
  
  // Check if required env vars are set
  if (!process.env.OPENAI_API_KEY) {
    console.log('❌ OPENAI_API_KEY not found in environment variables')
    return
  }
  
  if (!process.env.AUTH_CODE && testUser.auth_code === 'your-auth-code-here') {
    console.log('❌ AUTH_CODE not found in environment variables')
    console.log('Set AUTH_CODE in your .env file or update the testUser.auth_code in this script')
    return
  }
  
  // Run tests
  const authenticated = await authenticate()
  if (!authenticated) {
    console.log('❌ Could not authenticate, stopping tests')
    return
  }
  
  await testErrorHandling()
  await testVocabularyAnalysis()
  await testVocabularyList()
  await testVocabularyStats()
  
  console.log('\n✨ Manual tests completed!')
  console.log('Check the output above for any issues.')
}

if (require.main === module) {
  runManualTests().catch(console.error)
}
