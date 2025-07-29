#!/usr/bin/env node

/**
 * Simple script to test vocabulary API endpoints
 * Make sure the server is running on localhost:13010
 */

const axios = require('axios')

const BASE_URL = 'http://localhost:13010/api'
const VOCAB_URL = `${BASE_URL}/vocab`

// Create axios instance to maintain cookies
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true
})

// Test user credentials
const testUser = {
  email: 'vocab-test@example.com',
  password: 'testpassword123',
  auth_code: 'your-auth-code', // You'll need to replace this
  first_name: 'Vocab',
  last_name: 'Tester'
}

async function setupTestUser() {
  console.log('🔧 Setting up test user...')
  
  try {
    // Try to register the user (might fail if already exists)
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
  
  try {
    // Login
    const loginResponse = await client.post('/auth/login', {
      email: testUser.email,
      password: testUser.password
    })
    console.log('✅ Logged in successfully')
    return true
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message)
    return false
  }
}

async function testAnalyzeEndpoint() {
  console.log('\n=== Testing /api/vocab/analyze ===')
  
  try {
    const response = await client.post('/vocab/analyze', {
      word: 'corriendo',
      context: 'El niño está corriendo en el parque',
      language: 'Spanish'
    })
    
    console.log('✅ Analysis successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.analysis
  } catch (error) {
    console.log('❌ Analysis failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testSaveEndpoint(analysis = null) {
  console.log('\n=== Testing /api/vocab/save ===')
  
  const wordData = analysis ? {
    word: analysis.baseForm,
    originalWord: 'corriendo',
    baseForm: analysis.baseForm,
    language: 'Spanish',
    partOfSpeech: analysis.partOfSpeech,
    definition: analysis.definition,
    context: 'El niño está corriendo en el parque',
    confidence: analysis.confidence
  } : {
    word: 'correr',
    originalWord: 'corriendo',
    baseForm: 'correr',
    language: 'Spanish',
    partOfSpeech: 'verb',
    definition: 'to run',
    context: 'El niño está corriendo en el parque',
    confidence: 'high'
  }
  
  try {
    const response = await client.post('/vocab/save', wordData)
    
    console.log('✅ Save successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.word
  } catch (error) {
    console.log('❌ Save failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testListEndpoint() {
  console.log('\n=== Testing /api/vocab/Spanish ===')
  
  try {
    const response = await client.get('/vocab/Spanish')
    
    console.log('✅ List successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.words
  } catch (error) {
    console.log('❌ List failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testStatsEndpoint() {
  console.log('\n=== Testing /api/vocab/Spanish/stats ===')
  
  try {
    const response = await client.get('/vocab/Spanish/stats')
    
    console.log('✅ Stats successful:')
    console.log(JSON.stringify(response.data, null, 2))
    return response.data.stats
  } catch (error) {
    console.log('❌ Stats failed:')
    console.log(error.response?.data || error.message)
    return null
  }
}

async function testDeleteEndpoint(wordId) {
  if (!wordId) return
  
  console.log('\n=== Testing DELETE /api/vocab/:id ===')
  
  try {
    const response = await client.delete(`/vocab/${wordId}`)
    
    console.log('✅ Delete successful:')
    console.log(JSON.stringify(response.data, null, 2))
  } catch (error) {
    console.log('❌ Delete failed:')
    console.log(error.response?.data || error.message)
  }
}

async function cleanupTestUser() {
  console.log('\n🧹 Cleaning up test user...')
  
  try {
    await client.delete('/auth/test-cleanup', {
      data: { email: testUser.email }
    })
    console.log('✅ Test user cleaned up')
  } catch (error) {
    console.log('❌ Cleanup failed:', error.response?.data || error.message)
  }
}

async function runTests() {
  console.log('🧪 Testing Vocabulary API Endpoints')
  console.log('Server: http://localhost:13010')
  
  // Setup authentication
  const authSuccess = await setupTestUser()
  if (!authSuccess) {
    console.log('❌ Could not authenticate, stopping tests')
    return
  }
  
  // Test endpoints
  const analysis = await testAnalyzeEndpoint()
  const savedWord = await testSaveEndpoint(analysis)
  const words = await testListEndpoint()
  const stats = await testStatsEndpoint()
  
  // Test delete if we have a word ID
  if (savedWord && savedWord.id) {
    await testDeleteEndpoint(savedWord.id)
  }
  
  // Cleanup (optional - comment out if you want to keep test data)
  // await cleanupTestUser()
  
  console.log('\n✨ Test completed!')
}

if (require.main === module) {
  runTests().catch(console.error)
}

module.exports = { 
  testAnalyzeEndpoint, 
  testSaveEndpoint, 
  testListEndpoint, 
  testStatsEndpoint,
  setupTestUser 
}
