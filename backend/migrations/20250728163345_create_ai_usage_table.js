exports.up = function (knex) {
  return knex.schema.createTable('ai_usage', function (table) {
    table.increments('id').primary()
    table.string('model').notNullable()
    table.json('usage')
    table.integer('input_tokens').notNullable()
    table.integer('cached_input_tokens').notNullable()
    table.integer('output_tokens').notNullable()
    table.decimal('cost_usd', 5, 3)
    table.json('metadata')

    table.string('user_id').notNullable()
    table.foreign('user_id').references('id').inTable('user_info').onDelete('CASCADE')

    table.timestamps(true, false) // created_at and updated_at
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('ai_usage')
}
