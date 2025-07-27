/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable('uploads', function (table) {
    table.string('id').primary() // UUID string as primary key
    table.string('url').notNullable() // URL to the uploaded file
    table.string('filename').notNullable() // Original filename
    table.string('upload_type').notNullable() // Type of upload (e.g., 'audio', 'image', etc.)
    table.timestamps(true, true) // created_at and updated_at with default values
  })
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTable('uploads')
}
