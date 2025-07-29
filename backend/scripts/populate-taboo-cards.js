require('module-alias/register')
const TabooCards = require('@tables/taboo_cards')
const tabooData = require('../taboo_words.json')

async function populateTabooCards() {
  try {
    console.log('Starting to populate taboo_cards table...')
    
    // Check if cards already exist
    const existingCards = await TabooCards.query()
    if (existingCards.length > 0) {
      console.log(`Found ${existingCards.length} existing cards. Skipping population.`)
      return
    }

    const cardsToInsert = tabooData.cards.map(card => ({
      answer_word: card.answer,
      language: 'en',
      key_words: card.key_words,
      category: categorizeCard(card.answer),
      difficulty: calculateDifficulty(card.key_words),
      description: `Describe the word "${card.answer}" using these key words: ${card.key_words.join(', ')}`,
      metadata: {
        source: 'taboo_words.json',
        imported_at: new Date().toISOString()
      },
      is_active: true,
      usage_count: 0
    }))

    console.log(`Inserting ${cardsToInsert.length} cards...`)
    
    // Insert cards one by one for SQLite compatibility
    let insertedCount = 0
    for (const card of cardsToInsert) {
      await TabooCards.query().insert(card)
      insertedCount++
      if (insertedCount % 5 === 0) {
        console.log(`  Inserted ${insertedCount}/${cardsToInsert.length} cards...`)
      }
    }
    
    console.log('Successfully populated taboo_cards table!')
    
    // Show summary
    const summary = await TabooCards.query()
      .select('category')
      .count('* as count')
      .groupBy('category')
    
    console.log('Cards by category:')
    summary.forEach(row => {
      console.log(`  ${row.category}: ${row.count}`)
    })
    
  } catch (error) {
    console.error('Error populating taboo_cards:', error)
    throw error
  }
}

function categorizeCard(answerWord) {
  const word = answerWord.toLowerCase()
  
  // Simple categorization based on the answer word
  if (['car', 'transport'].some(w => word.includes(w))) return 'transportation'
  if (['dragonfly', 'penguin', 'bull', 'hippo'].some(w => word.includes(w))) return 'animals'
  if (['hamburger', 'popcorn'].some(w => word.includes(w))) return 'food'
  if (['snowflake', 'winter', 'cold'].some(w => word.includes(w))) return 'weather'
  if (['hungry', 'furious', 'peaceful', 'naughty'].some(w => word.includes(w))) return 'emotions'
  if (['comb', 'glasses'].some(w => word.includes(w))) return 'objects'
  if (['speech', 'fairytale', 'magic'].some(w => word.includes(w))) return 'abstract'
  if (['normal', 'original', 'match', 'rescue'].some(w => word.includes(w))) return 'concepts'
  
  return 'general'
}

function calculateDifficulty(keyWords) {
  // Simple difficulty calculation based on word complexity
  const avgLength = keyWords.reduce((sum, word) => sum + word.length, 0) / keyWords.length
  const hasComplexWords = keyWords.some(word => word.length > 8 || word.includes(' '))
  
  if (avgLength < 5 && !hasComplexWords) return 'easy'
  if (avgLength > 7 || hasComplexWords) return 'hard'
  return 'medium'
}

// Run the population if this script is executed directly
if (require.main === module) {
  populateTabooCards()
    .then(() => {
      console.log('Population complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Population failed:', error)
      process.exit(1)
    })
}

module.exports = { populateTabooCards }
