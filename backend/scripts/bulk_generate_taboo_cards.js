#!/usr/bin/env node

/**
 * Bulk taboo card generator - create multiple cards at once
 * Usage: node scripts/bulk_generate_taboo_cards.js
 */

require('module-alias/register')
const { generateTabooCard } = require('../utils/openAI/tabooGameplay')
const TabooCards = require('@tables/taboo_cards')

// Predefined word lists for bulk generation
const WORD_LISTS = {
  animals: [
    'GIRAFFE', 'KANGAROO', 'DOLPHIN', 'OCTOPUS', 'BUTTERFLY', 
    'PENGUIN', 'ZEBRA', 'CHEETAH', 'WHALE', 'EAGLE'
  ],
  food: [
    'SUSHI', 'TACOS', 'LASAGNA', 'CROISSANT', 'SANDWICH',
    'SALAD', 'SOUP', 'STEAK', 'PASTA', 'YOGURT'
  ],
  technology: [
    'LAPTOP', 'TABLET', 'HEADPHONES', 'CAMERA', 'KEYBOARD',
    'MONITOR', 'ROUTER', 'PRINTER', 'SCANNER', 'WEBCAM'
  ],
  transportation: [
    'BICYCLE', 'MOTORCYCLE', 'AIRPLANE', 'HELICOPTER', 'SUBWAY',
    'TAXI', 'BUS', 'TRUCK', 'BOAT', 'SCOOTER'
  ],
  household: [
    'REFRIGERATOR', 'MICROWAVE', 'TOASTER', 'VACUUM', 'BLENDER',
    'DISHWASHER', 'WASHING', 'TELEVISION', 'LAMP', 'MIRROR'
  ],
  concepts: [
    'FREEDOM', 'JUSTICE', 'CREATIVITY', 'FRIENDSHIP', 'COURAGE',
    'WISDOM', 'PATIENCE', 'HONESTY', 'LOYALTY', 'KINDNESS'
  ]
}

async function bulkGenerateTabooCards(category, limit = 5) {
  try {
    console.log(`🎯 Bulk generating ${limit} taboo cards for category: ${category}`)
    
    const wordList = WORD_LISTS[category]
    if (!wordList) {
      throw new Error(`Category "${category}" not found. Available: ${Object.keys(WORD_LISTS).join(', ')}`)
    }

    // Shuffle and take the requested number
    const shuffled = wordList.sort(() => 0.5 - Math.random())
    const wordsToGenerate = shuffled.slice(0, limit)

    let totalCost = 0
    let successCount = 0
    let skippedCount = 0

    console.log(`\nGenerating cards for: ${wordsToGenerate.join(', ')}\n`)

    for (const word of wordsToGenerate) {
      console.log(`=== Generating card for "${word}" ===`)
      
      try {
        // Check if card already exists
        const existingCard = await TabooCards.query()
          .where('answer_word', word.toUpperCase())
          .first()

        if (existingCard) {
          console.log(`⚠️  Card for "${word}" already exists, skipping...`)
          skippedCount++
          continue
        }

        // Generate the card
        const result = await generateTabooCard({
          answerWord: word,
          category,
          difficulty: 'medium' // Default difficulty for bulk generation
        })

        if (!result.success) {
          console.log(`❌ Failed to generate card for "${word}": ${result.error}`)
          continue
        }

        // Insert into database
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
            generated_at: new Date().toISOString(),
            bulk_generation: true
          }
        })

        console.log(`✅ Card created with ID: ${newCard.id}`)
        console.log(`   Keywords: ${result.card.key_words.join(', ')}`)
        console.log(`   Cost: $${result.cost.toFixed(6)}`)
        
        totalCost += result.cost
        successCount++

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ Error processing "${word}":`, error.message)
      }
      
      console.log('') // Empty line for readability
    }

    // Final summary
    console.log('🎉 Bulk generation completed!')
    console.log(`📊 Summary:`)
    console.log(`   - Successfully generated: ${successCount} cards`)
    console.log(`   - Skipped (already exists): ${skippedCount} cards`)
    console.log(`   - Total cost: $${totalCost.toFixed(6)}`)

    // Get total count of cards in database
    const totalCards = await TabooCards.query().count('* as count').first()
    console.log(`📊 Total cards in database: ${totalCards.count}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

async function listAvailableCategories() {
  console.log('📋 Available categories for bulk generation:')
  Object.entries(WORD_LISTS).forEach(([category, words]) => {
    console.log(`  ${category}: ${words.length} words available`)
    console.log(`    Sample: ${words.slice(0, 3).join(', ')}...`)
  })
  console.log('\nUsage: node scripts/bulk_generate_taboo_cards.js <category> [limit]')
  console.log('Example: node scripts/bulk_generate_taboo_cards.js animals 5')
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    listAvailableCategories()
    process.exit(0)
  }

  const [category, limitStr] = args
  const limit = parseInt(limitStr) || 5

  if (limit > 10) {
    console.log('⚠️  Limiting to 10 cards per run to manage costs')
    process.exit(1)
  }

  bulkGenerateTabooCards(category, limit)
    .then(() => {
      console.log('\n✅ Bulk generation completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n💥 Bulk generation failed:', error)
      process.exit(1)
    })
}

module.exports = { bulkGenerateTabooCards, WORD_LISTS }
