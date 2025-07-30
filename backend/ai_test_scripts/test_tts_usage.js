require('dotenv').config()
const { OpenAI } = require('openai')
const calculateCost = require('../utils/openAI/calculateCost')

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

async function testTTSUsage() {
  try {
    console.log('Testing TTS endpoint and usage tracking...')
    
    const testText = "Hola, ¿cómo estás? Me llamo María y soy profesora de español."
    console.log(`Test text: "${testText}"`)
    console.log(`Character count: ${testText.length}`)
    
    // Call the TTS endpoint
    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'nova',
      input: testText,
    })
    
    console.log('\n--- TTS Response ---')
    console.log('Response received successfully')
    console.log('Response type:', typeof response)
    console.log('Response headers:', response.response?.headers || 'No headers visible')
    
    // Check if usage information is available
    console.log('\n--- Usage Information ---')
    if (response.usage) {
      console.log('Usage object found:', response.usage)
    } else {
      console.log('No usage object in response - this is expected for TTS')
      console.log('TTS endpoints typically do not return usage objects like chat completions')
    }
    
    // Create a mock usage object for TTS (since TTS doesn't return usage)
    const mockTTSUsage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      characters: testText.length, // Store character count for TTS
    }
    
    console.log('\n--- Mock TTS Usage Object ---')
    console.log('Mock usage:', mockTTSUsage)
    
    // Test the calculateCost function
    console.log('\n--- Cost Calculation Test ---')
    const costResult = calculateCost('gpt-4o-mini-tts', mockTTSUsage, {
      character_count: testText.length,
      operation: 'text_to_speech',
    })
    
    console.log('Cost calculation result:', costResult)
    
    // Verify the cost makes sense
    const expectedCostPerChar = 0.000015 // From pricing data
    const expectedTotalCost = testText.length * expectedCostPerChar
    
    console.log('\n--- Cost Verification ---')
    console.log(`Expected cost per character: $${expectedCostPerChar}`)
    console.log(`Expected total cost: $${expectedTotalCost.toFixed(6)}`)
    console.log(`Calculated total cost: $${costResult.totalCost}`)
    console.log(`Cost calculation matches: ${Math.abs(costResult.totalCost - expectedTotalCost) < 0.000001}`)
    
  } catch (error) {
    console.error('Error testing TTS:', error)
    console.error('Error details:', error.message)
    
    // If the error is about the model name, try with standard TTS model
    if (error.message?.includes('model') || error.message?.includes('gpt-4o-mini-tts')) {
      console.log('\n--- Trying with standard tts-1 model ---')
      try {
        const fallbackResponse = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'nova',
          input: testText,
        })
        
        console.log('Standard tts-1 model works successfully')
        console.log('Response type:', typeof fallbackResponse)
        
        // Test cost calculation with tts-1 model
        const fallbackUsage = {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0,
          characters: testText.length,
        }
        
        // We'd need to add tts-1 to our pricing data
        console.log('\nNote: You may need to add tts-1 pricing to aiPricing.js if using standard TTS models')
        
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError.message)
      }
    }
  }
}

// Run the test
testTTSUsage().then(() => {
  console.log('\n--- Test Complete ---')
}).catch(error => {
  console.error('Test failed:', error)
  process.exit(1)
})
