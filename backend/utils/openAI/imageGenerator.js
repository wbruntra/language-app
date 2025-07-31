require('module-alias/register') // Initialize module-alias

const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')
const { uploadData } = require('@linodeUtils')
const sharp = require('sharp')
const crypto = require('crypto')
const StoryInfo = require('@tables/story_info')

const md5 = (str) => {
  return crypto.createHash('md5').update(str).digest('hex')
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const suggestFileName = (prompt) => {
  // if the prompt is very long, hash it to create a unique identifier
  if (prompt.length > 40) {
    const hash = md5(prompt)
    return `image_${hash}`
  }

  // Generate a simple file name based on the prompt
  const baseName = prompt.split(' ').join('_').toLowerCase()
  return `${baseName}`
}

const generateImage = async ({
  prompt,
  size = '1024x1024',
  n = 1,
  model = 'gpt-image-1',
  quality = 'low',
  output_format = 'jpeg',
}) => {
  const img = await openai.images.generate({
    model,
    prompt,
    n,
    size,
    quality,
    output_format,
  })

  const imageBuffer = Buffer.from(img.data[0].b64_json, 'base64')
  return imageBuffer
}

const saveImage = async ({
  imageBuffer,
  fileName,
  linodeKey = 'generated_images/',
  withThumbnail = true,
}) => {
  // Upload the full-size image
  const uploadResult = await uploadData({
    dataBuffer: imageBuffer,
    linodePath: linodeKey,
    fileName: `${fileName}.jpg`,
    fileExtension: 'jpg',
    uploadType: 'image',
  })

  let thumbnailUploadResult = null

  if (withThumbnail) {
    const thumbnailBuffer = await sharp(imageBuffer)
      .resize(200, 200, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 80 })
      .toBuffer()

    // Upload the thumbnail
    thumbnailUploadResult = await uploadData({
      dataBuffer: thumbnailBuffer,
      linodePath: `${linodeKey}thumbnails/`,
      fileName: `${fileName}.jpg`,
      fileExtension: 'jpg',
      uploadType: 'image',
    })
  }

  return {
    fullImage: uploadResult,
    thumbnail: thumbnailUploadResult,
  }
}

/**
 * Generate a 4-scene story idea for language learners
 * @returns {Promise<Object>} Story structure with scene descriptions
 */
async function generateComicIdea() {
  try {
    const prompt = `Create a simple 4-scene story idea for language learners that depicts clear, visual scenes.

Requirements:
- The story should show a simple, everyday scenario that learners can describe using basic vocabulary.
- Focus on clear actions, emotions, and visual elements that are easy to understand.
- Each scene should be visually distinct and tell a progression from beginning to end.
- Use simple, relatable characters and settings.
- The output should be JSON with:
  - "storyDescription": a brief description of the overall story and setting.
  - "sceneDescriptions": an array of 4 individual scene descriptions focusing on what's happening visually.
  - Optional: theme, characterType, difficulty
- Focus on clear visual storytelling without relying on text or dialogue.
- Each scene should be suitable for illustration as a single, standalone image.`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are a storyteller who creates simple, visual stories for language learners. Your stories are easy to understand, focus on everyday situations, and are perfect for visual illustration.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'story_idea_response',
          description: 'A simple 4-scene story idea with scene descriptions',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              storyDescription: {
                type: 'string',
                description: 'Brief description of the overall story and setting',
              },
              sceneDescriptions: {
                type: 'array',
                items: {
                  type: 'string',
                  description: 'Visual description of what happens in a single scene',
                },
                minItems: 4,
                maxItems: 4,
              },
              theme: {
                type: 'string',
                description:
                  'General theme or topic of the comic (e.g., daily routine, transportation)',
              },
              characterType: {
                type: 'string',
                description: 'Type of character(s), e.g., adult, child, animal, etc.',
              },
              difficulty: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
                description: 'Estimated comprehension level',
              },
            },
            required: [
              'storyDescription',
              'sceneDescriptions',
              'theme',
              'characterType',
              'difficulty',
            ],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.7,
    })

    const result = JSON.parse(completion.choices[0].message.content)

    return {
      success: true,
      ...result,
    }
  } catch (error) {
    console.error('Error generating comic idea:', error)
    return {
      success: false,
      error: error.message,
      fallback: true,
      message: 'Comic idea generation failed. Try again later.',
    }
  }
}

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

      const imageBuffer = await generateImage({
        prompt: fullPrompt,
        quality: 'low',
      })

      const fileName = suggestFileName(fullPrompt)

      const result = await saveImage({
        imageBuffer,
        linodeKey: 'comics/',
        withThumbnail: true,
        fileName,
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

const test = async () => {
  
  console.time('Test Execution Time')
  
  const linodeKey = 'generated_images/'

  const prompt = 'A simple image of a cat sitting on a windowsill, looking outside at a sunny day.'
  const quality = 'low'

  const fileName = suggestFileName(prompt)
  console.log(`Generated file name: ${fileName}`)

  const imageBuffer = await generateImage({
    prompt,
    quality,
  })

  console.log('Image generated successfully')
  const savedImage = await saveImage({
    imageBuffer,
    fileName,
    linodeKey,
    withThumbnail: false,
  })

  console.log('Image saved successfully:', savedImage)

  // let idea
  // idea = await generateComicIdea()

  // console.log('Generated comic idea:', JSON.stringify(idea, null, 2))

  console.timeEnd('Test Execution Time')

  console.log('Image saved successfully')
}

if (require.main === module) {
  test()
    .then(() => {
      console.log('Test completed successfully')
      process.exit(0)
    })
    .catch(console.error)
}

module.exports = { generateImage, saveImage, suggestFileName, generateComicIdea }
