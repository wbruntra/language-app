require('module-alias/register')
const storyData = require('../db/story_info.json')

const UserInfo = require('../tables/user_info')
const StoryInfo = require('../tables/story_info')

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('story_info').del()

  const stories = storyData.map((story) => ({
    ...story,
    images: JSON.parse(story.images || '[]'),
    metadata: JSON.parse(story.metadata || '{}'),
    prompt: JSON.parse(story.prompt || '{}'),
    is_active: true,
    id: undefined,
  }))

  const sqlitePromises = stories.map((story) => {
    return StoryInfo.query().insert(story)
  })

  await Promise.all(sqlitePromises)
}
