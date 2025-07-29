#!/usr/bin/env node

/**
 * Utility script to generate and add new taboo cards to the database
 * Usage: node scripts/add_taboo_card.js <word> [category] [difficulty]
 */

require('module-alias/register')
const { generateTabooCard } = require('../utils/openAI/tabooGameplay')
const TabooCards = require('@tables/taboo_cards')

async function addTabooCard(answerWord, category, difficulty) {
  try {
    console.log(`🎯 Generating taboo card for "${answerWord}"...`)
    
    // Generate the card
    const result = await generateTabooCard({
      answerWord,
      category,
      difficulty
    })

    if (!result.success) {
      throw new Error(`Failed to generate card: ${result.error}`)
    }

    console.log('✅ Card generated successfully!')
    console.log('📋 Generated Card:')
    console.log(JSON.stringify(result.card, null, 2))
    
    console.log('\n💭 AI Reasoning:')
    result.reasoning.forEach(item => {
      console.log(`  • ${item.keyword}: ${item.reason}`)
    })
    
    console.log(`\n💰 Cost: $${result.cost.toFixed(6)}`)

    // Check if card already exists in database
    const existingCard = await TabooCards.query()
      .where('answer_word', result.card.answer.toUpperCase())
      .first()

    if (existingCard) {
      console.log('⚠️  A card for this word already exists in the database:')
      console.log(JSON.stringify({
        id: existingCard.id,
        answer_word: existingCard.answer_word,
        key_words: existingCard.key_words,
        category: existingCard.category,
        difficulty: existingCard.difficulty
      }, null, 2))
      console.log('\nSkipping insertion to avoid duplicates.')
      return
    }

    // Insert the new card into the database
    const newCard = await TabooCards.query().insert({
      answer_word: result.card.answer.toUpperCase(),
      language: result.card.language || 'en',
      key_words: result.card.key_words,
      category: result.card.category,
      difficulty: result.card.difficulty,
      metadata: {
        generated_by_ai: true,
        generation_cost: result.cost,
        ai_reasoning: result.reasoning,
        generated_at: new Date().toISOString()
      }
    })

    console.log(`\n✅ Card added to database!`)
    console.log(`📊 Card ID: ${newCard.id}`)
    
    // Get total count of cards
    const totalCards = await TabooCards.query().count('* as count').first()
    console.log(`📊 Total cards in database: ${totalCards.count}`)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: node scripts/add_taboo_card.js <word> [category] [difficulty]')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/add_taboo_card.js BICYCLE')
    console.log('  node scripts/add_taboo_card.js ELEPHANT animals')
    console.log('  node scripts/add_taboo_card.js QUANTUM concepts hard')
    console.log('')
    console.log('Available difficulties: easy, medium, hard')
    console.log('Categories will be auto-suggested if not provided')
    process.exit(1)
  }

  const [answerWord, category, difficulty] = args
  
  addTabooCard(answerWord.toUpperCase(), category, difficulty)
    .then(() => {
      console.log('\n🎉 Process completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Process failed:', error)
      process.exit(1)
    })
}

module.exports = { addTabooCard }
