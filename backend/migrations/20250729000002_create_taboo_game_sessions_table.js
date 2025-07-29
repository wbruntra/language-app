exports.up = function (knex) {
  return knex.schema.createTable('taboo_game_sessions', function (table) {
    table.string('id').primary()
    table.string('taboo_card_id').notNullable() // Reference to the card being played
    table.string('user_id').notNullable() // Reference to the user
    table.string('target_language').notNullable() // Language user is learning (e.g., "es")
    table.string('answer_word').notNullable() // Copy from card for historical tracking
    table.json('original_key_words').notNullable() // Original English key words
    table.json('translated_key_words').notNullable() // Translated key words
    table.text('user_description') // User's description (if completed)
    table.json('evaluation_result') // AI evaluation: score, words_found, feedback, etc.
    table.text('ai_example_description') // AI-generated example description
    table.string('status').defaultTo('initialized') // initialized, in_progress, completed, abandoned
    table.integer('score').defaultTo(0) // Final score (0-100)
    table.json('words_found') // Array of key words successfully used
    table.json('words_missed') // Array of key words not used
    table.json('ai_usage_metadata') // Track AI API calls and costs
    table.json('messages') // Game progression messages/history
    table.json('metadata') // Additional game data (timing, attempts, etc.)

    // Foreign key constraints
    table.foreign('taboo_card_id').references('id').inTable('taboo_cards').onDelete('CASCADE')
    table.foreign('user_id').references('id').inTable('user_info').onDelete('CASCADE')

    table.timestamps(true, true) // created_at and updated_at

    // Indexes for performance and analytics
    table.index(['user_id'], 'idx_taboo_sessions_user')
    table.index(['taboo_card_id'], 'idx_taboo_sessions_card')
    table.index(['target_language'], 'idx_taboo_sessions_language')
    table.index(['status'], 'idx_taboo_sessions_status')
    table.index(['user_id', 'target_language'], 'idx_taboo_sessions_user_language')
    table.index(['user_id', 'status'], 'idx_taboo_sessions_user_status')
    table.index(['created_at'], 'idx_taboo_sessions_created')
    table.index(['score'], 'idx_taboo_sessions_score')
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('taboo_game_sessions')
}
