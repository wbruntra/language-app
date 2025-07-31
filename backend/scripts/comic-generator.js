require('module-alias/register') // Initialize module-alias

const { generateComicIdea, generateImage, saveImage } = require('../utils/openAI/imageGenerator')
const StoryInfo = require('../tables/story_info')

/**
 * Generate a complete comic story with AI-generated images
 * @param {string} language - The target language for the comic
 * @param {string} category - Category for the comic (default: 'comic')
 * @returns {Promise<Object>} The created story record
 */
async function generateFullComic(language = 'English', category = 'comic') {
  console.log('🎨 Starting comic generation...')
  console.time('Total Comic Generation Time')

  try {
    // Step 1: Generate the story idea
    console.log('📝 Generating story idea...')
    const storyIdea = await generateComicIdea()

    if (!storyIdea.success) {
      throw new Error(`Failed to generate story idea: ${storyIdea.error}`)
    }

    console.log(`✅ Generated story idea: "${storyIdea.theme}"`)
    console.log(`   Character type: ${storyIdea.characterType}`)
    console.log(`   Difficulty: ${storyIdea.difficulty}`)

    // Step 2: Generate images for each scene
    console.log('🖼️  Generating scene images...')
    const imagePromises = storyIdea.sceneDescriptions.map(async (sceneDesc, index) => {
      console.log(`   Generating scene ${index + 1}/4...`)

      // Add art style to the scene description
      // const artStyle = 'Infographic cartoon style.'
      // const artStyle = 'Clean, black-and-white line art style illustration.'
      const artStyle = 'Flat color cartoon style.'

      const fullPrompt = `${artStyle} ${sceneDesc}`

      const result = await saveImage({
        prompt: fullPrompt,
        linodeKey: 'comics/',
        withThumbnail: true,
        quality: 'low',
      })

      return {
        panelNumber: index + 1,
        description: sceneDesc,
        fullPrompt: fullPrompt,
        imageUrl: result.fullImage.url,
        thumbnailUrl: result.thumbnail?.url || null,
      }
    })

    const panelImages = await Promise.all(imagePromises)
    console.log('✅ All scene images generated successfully')

    // Step 3: Prepare data for database storage
    const storyData = {
      prompt: {
        storyDescription: storyIdea.storyDescription,
        sceneDescriptions: storyIdea.sceneDescriptions,
        theme: storyIdea.theme,
        characterType: storyIdea.characterType,
        generatedAt: new Date().toISOString(),
      },
      language: language,
      images: {
        panels: panelImages,
        totalPanels: 4,
        imageType: 'comic_panels',
      },
      category: category,
      difficulty: storyIdea.difficulty,
      description: `A 4-scene story about ${storyIdea.theme} featuring ${storyIdea.characterType}`,
      metadata: {
        generationMethod: 'ai_generated',
        model: 'gpt-4o-2024-08-06',
        imageModel: 'gpt-image-1',
        panelCount: 4,
      },
    }

    // Step 4: Save to database
    console.log('💾 Saving comic to database...')
    const savedStory = await StoryInfo.query().insert(storyData)
    console.log(`✅ Comic saved with ID: ${savedStory.id}`)

    console.timeEnd('Total Comic Generation Time')

    return savedStory
  } catch (error) {
    console.error('❌ Error generating comic:', error)
    throw error
  }
}

/**
 * Generate a comic and save it to the database
 * @param {string} language - Target language
 * @param {string} category - Comic category
 * @returns {Promise<Object>} Result with story
 */
async function generateComic(language = 'English', category = 'comic') {
  try {
    const story = await generateFullComic(language, category)

    return {
      success: true,
      story,
      message: `Comic "${story.prompt.theme}" generated successfully!`,
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: 'Failed to generate comic',
    }
  }
}

// Test function
async function test() {
  console.log('🧪 Testing comic generation...')

  try {
    const result = await generateComic('English', 'test-comic')

    if (result.success) {
      console.log(`✅ Test completed successfully!`)
      console.log(`   Story ID: ${result.story.id}`)
      console.log(`   Theme: ${result.story.prompt.theme}`)
      console.log(`   View at: /stories/${result.story.id}`)
    } else {
      console.log(`❌ Test failed: ${result.error}`)
    }
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

// Run test if called directly
if (require.main === module) {
  test()
    .then(() => {
      console.log('🏁 Script completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Script failed:', error)
      process.exit(1)
    })
}

module.exports = {
  generateFullComic,
}
