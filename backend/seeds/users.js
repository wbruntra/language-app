require('module-alias/register')
const UserInfo = require('../tables/user_info')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('user_info').del()

  const users = [
    {
      id: 'testuser',
      email: 'test@example.com',
      password: '1234',
      first_name: 'Test',
      last_name: 'User',
    }
  ]

  await UserInfo.query().insert(users)
}
