exports.up = function (knex) {
  return knex.schema.createTable('story_info', function (table) {
    table.increments('id').primary()
    table.json('prompt').notNullable()
    table.string('language').notNullable() // Language of the card (e.g., "en" for English)
    table.json('images').notNullable() // Array of image URLs
    table.string('category').defaultTo('general') // Category like "vehicles", "food", etc.
    table.string('difficulty').defaultTo('medium') // easy, medium, hard
    table.text('description') // Optional description or hint
    table.json('metadata') // Additional data like tags, source, etc.
    table.boolean('is_active').defaultTo(true) // For enabling/disabling stories
    table.integer('usage_count').defaultTo(0) // Track how often this story is used
    table.integer('upvotes').defaultTo(0) // Track upvotes for quality control
    table.integer('downvotes').defaultTo(0) // Track downvotes for quality control

    table.timestamps(true, true) // created_at and updated_at
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('story_info')
}
