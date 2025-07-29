exports.up = function (knex) {
  return knex.schema.createTable('user_vocab_info', function (table) {
    table.string('id').primary()
    table.string('word').notNullable() // This will store the base form
    table.string('original_word') // Store the original inflected word that was encountered
    table.string('language').notNullable()
    table.string('part_of_speech') // noun, verb, adjective, etc.
    table.text('definition') // English definition
    table.text('context') // The sentence where the word was found
    table.string('confidence').defaultTo('medium') // high, medium, low - AI confidence
    table.json('metadata') // Additional OpenAI analysis data
    table.boolean('is_learned').defaultTo(false) // For future spaced repetition
    table.integer('times_encountered').defaultTo(1) // Track word frequency

    table.string('user_id').notNullable()
    table.foreign('user_id').references('id').inTable('user_info').onDelete('CASCADE')

    table.timestamps(true, true) // created_at and updated_at

    // Indexes for performance
    table.index(['user_id', 'language'], 'idx_user_vocab_language')
    table.index(['user_id', 'word'], 'idx_user_vocab_word')
    table.index(['user_id', 'part_of_speech'], 'idx_user_vocab_pos')
    table.index(['user_id', 'is_learned'], 'idx_user_vocab_learned')
    table.unique(['user_id', 'word', 'language'], 'unique_user_word_language')
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('user_vocab_info')
}
