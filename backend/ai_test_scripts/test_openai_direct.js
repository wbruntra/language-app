#!/usr/bin/env node

/**
 * Simple test of just the OpenAI analysis function without routes
 */

const { analyzeVocabulary } = require('../utils/openAI/analyzeVocabulary')

async function testDirectAnalysis() {
  console.log('🧪 Testing OpenAI analysis function directly...')
  
  const testCases = [
    {
      word: 'corriendo',
      context: 'El niño está corriendo en el parque.',
      language: 'Spanish'
    },
    {
      word: 'libros', 
      context: 'Los libros están en la mesa.',
      language: 'Spanish'
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Analyzing: "${testCase.word}"`)
    
    try {
      const result = await analyzeVocabulary(
        testCase.word,
        testCase.context,
        testCase.language
      )
      
      console.log('✅ Analysis result:')
      console.log(`   Base form: ${result.analysis.baseForm}`)
      console.log(`   Part of speech: ${result.analysis.partOfSpeech}`)
      console.log(`   Definition: ${result.analysis.definition}`)
      console.log(`   Confidence: ${result.analysis.confidence}`)
      console.log(`   Cost: $${result.cost?.totalCost || 0}`)
      
      if (result.usage) {
        console.log(`   Tokens: ${result.usage.prompt_tokens} input + ${result.usage.completion_tokens} output`)
      }
      
      if (result.error) {
        console.log(`   ⚠️ Warning: ${result.error}`)
      }
    } catch (error) {
      console.log('❌ Error:', error.message)
    }
    
    // Wait between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

if (require.main === module) {
  testDirectAnalysis().catch(console.error)
}
