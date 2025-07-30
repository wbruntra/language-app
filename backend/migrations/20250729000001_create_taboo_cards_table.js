exports.up = function (knex) {
  return knex.schema.createTable('taboo_cards', function (table) {
    table.string('id').primary()
    table.string('answer_word').notNullable()
    table.string('language').notNullable() // Language of the card (e.g., "en" for English)
    table.json('key_words').notNullable() // Array of key words in English
    table.string('category').defaultTo('general') // Category like "vehicles", "food", etc.
    table.string('difficulty').defaultTo('medium') // easy, medium, hard
    table.text('description') // Optional description or hint
    table.json('metadata') // Additional data like tags, source, etc.
    table.boolean('is_active').defaultTo(true) // For enabling/disabling cards
    table.integer('usage_count').defaultTo(0) // Track how often this card is used
    table.integer('upvotes').defaultTo(0) // Track upvotes for quality control
    table.integer('downvotes').defaultTo(0) // Track downvotes for quality control

    table.timestamps(true, true) // created_at and updated_at

    // Indexes for performance
    table.index(['category'], 'idx_taboo_cards_category')
    table.index(['difficulty'], 'idx_taboo_cards_difficulty')
    table.index(['is_active'], 'idx_taboo_cards_active')
    table.index(['answer_word'], 'idx_taboo_cards_answer')
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('taboo_cards')
}
