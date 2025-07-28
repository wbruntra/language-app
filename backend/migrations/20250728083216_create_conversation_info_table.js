exports.up = function (knex) {
  return knex.schema.createTable('conversation_info', function (table) {
    table.string('id').primary()
    table.string('language')
    table.json('messages')
    table.json('metadata')

    table.string('user_id').notNullable()
    table.foreign('user_id').references('id').inTable('user_info').onDelete('CASCADE')

    table.timestamps(true, true) // created_at and updated_at
  })
}

exports.down = function (knex) {
  return knex.schema.dropTable('conversation_info')
}
