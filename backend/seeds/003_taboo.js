require('module-alias/register')
const tabooCards = require('../db/taboo_cards.json')

const UserInfo = require('../tables/user_info')
const StoryInfo = require('../tables/story_info')
const TabooCards = require('../tables/taboo_cards')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('taboo_cards').del()

  const cards = tabooCards.map((card) => ({
    ...card,
    key_words: JSON.parse(card.key_words || '[]'),
    metadata: JSON.parse(card.metadata || '{}'),
    is_active: true,
  }))

  const sqlitePromises = cards.map((card) => {
    return TabooCards.query().insert(card)
  })
  await Promise.all(sqlitePromises)
}
