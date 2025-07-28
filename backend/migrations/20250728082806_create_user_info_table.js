/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('user_info', function (table) {
    table.string('id').primary()
    table.string('email', 255).notNullable().unique()
    table.string('phone', 24).nullable()
    table.string('password', 255).notNullable()
    table.string('user_type', 24).notNullable()
    table.string('first_name')
    table.string('last_name')
    table.string('nickname')
    table.string('avatar')
    table.string('gender')
    table.json('preferences')
    table.boolean('is_active').notNullable().defaultTo(true)
    table.boolean('email_verified').notNullable().defaultTo(false)
    table.datetime('created_at').notNullable().defaultTo(knex.fn.now())
    table.datetime('updated_at').notNullable().defaultTo(knex.fn.now())
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists('user_info')
}
