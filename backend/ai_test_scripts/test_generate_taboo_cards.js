#!/usr/bin/env node

/**
 * Test script for generating new taboo cards using AI
 */

require('module-alias/register')
const { generateTabooCard } = require('../utils/openAI/tabooGameplay')

async function testGenerateTabooCards() {
  console.log('🎯 Testing Taboo Card Generation with AI\n')

  // Test cases with different parameters
  const testCases = [
    {
      answerWord: 'ELEPHANT',
      category: 'animals',
      difficulty: 'easy'
    },
    {
      answerWord: 'SMARTPHONE',
      category: 'technology',
      difficulty: 'medium'
    },
    {
      answerWord: 'DEMOCRACY',
      category: 'concepts',
      difficulty: 'hard'
    },
    {
      answerWord: 'PIZZA',
      category: 'food'
      // Will use default difficulty (medium)
    },
    {
      answerWord: 'RAINBOW'
      // Will auto-suggest category and difficulty
    }
  ]

  let totalCost = 0

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i]
    console.log(`=== Test ${i + 1}: Generating card for "${testCase.answerWord}" ===`)
    
    try {
      const result = await generateTabooCard(testCase)

      if (result.success) {
        console.log('✅ Card generated successfully!')
        console.log('📋 Generated Card:')
        console.log(JSON.stringify(result.card, null, 2))
        
        console.log('\n💭 AI Reasoning:')
        result.reasoning.forEach(item => {
          console.log(`  • ${item.keyword}: ${item.reason}`)
        })
        
        console.log(`\n💰 Cost: $${result.cost.toFixed(6)}`)
        console.log(`📊 Tokens: ${result.usage.total_tokens}`)
        
        totalCost += result.cost
      } else {
        console.log('❌ Failed to generate card:', result.error)
      }
    } catch (error) {
      console.error('❌ Error:', error.message)
    }
    
    console.log('\n' + '─'.repeat(60) + '\n')
  }

  console.log(`🎉 Test completed! Total cost: $${totalCost.toFixed(6)}`)
  
  // Show how to add to database
  console.log('\n📝 To add these cards to the database:')
  console.log('1. Use the add_taboo_card.js script: node scripts/add_taboo_card.js <WORD> [category] [difficulty]')
  console.log('2. Or use the TabooCards model in your code to insert the card object')
  console.log('3. The cards will be automatically assigned unique IDs and timestamps')
  console.log('\nExample using the script:')
  console.log('node scripts/add_taboo_card.js BICYCLE transportation easy')
}

// Run the test if this script is executed directly
if (require.main === module) {
  testGenerateTabooCards()
    .then(() => {
      console.log('\n✅ Taboo card generation test completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

module.exports = { testGenerateTabooCards }
