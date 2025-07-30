const { OpenAI } = require('openai')
const fs = require('fs')
const path = require('path')
const { uploadData } = require('../../linodeUtils')
const sharp = require('sharp')
const crypto = require('crypto')

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
  return img
}

const saveImage = async ({
  prompt,
  linodeKey = 'generated_images/',
  withThumbnail = true,
  quality,
}) => {
  const fileName = suggestFileName(prompt)
  console.log(`Generated file name: ${fileName}`)

  const result = await generateImage({
    prompt,
    quality,
  })
  const imageBuffer = Buffer.from(result.data[0].b64_json, 'base64')

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
          description:
            'A simple 4-scene story idea with scene descriptions',
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
            required: ['storyDescription', 'sceneDescriptions', 'theme', 'characterType', 'difficulty'],
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

const test = async () => {
  const linodeKey = 'generated_images/'

  console.time('Test Execution Time')

  let idea
  idea = await generateComicIdea()


  console.log('Generated comic idea:', JSON.stringify(idea, null, 2))

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
