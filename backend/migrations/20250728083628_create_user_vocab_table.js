exports.up = function (knex) {
  return knex.schema.createTable('user_vocab_info', function (table) {
    table.string('id').primary()
    table.string('word').notNullable()
    table.string('language')
    table.json('metadata')

    table.string('user_id').notNullable()
    table.foreign('user_id').references('id').inTable('user_info').onDelete('CASCADE')

    table.timestamps(true, true) // created_at and updated_at
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('user_vocab_info')
}
