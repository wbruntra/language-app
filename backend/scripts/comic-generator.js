require('module-alias/register') // Initialize module-alias

const { generateComicIdea, generateImage, saveImage } = require('../utils/openAI/imageGenerator')
const StoryInfo = require('../tables/story_info')
const fs = require('fs').promises
const path = require('path')

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
      const fullPrompt = `Clean, black-and-white line art style illustration. ${sceneDesc}`

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
 * Generate an HTML preview file for a comic story
 * @param {Object} story - The story object from the database
 * @param {string} outputDir - Directory to save the HTML file (default: './comic-previews')
 * @returns {Promise<string>} Path to the generated HTML file
 */
async function generateComicHTML(story, outputDir = './comic-previews') {
  try {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true })

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comic Story #${story.id} - ${story.prompt.theme}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .comic-container {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .comic-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .comic-title {
            font-size: 2.5em;
            margin: 0;
            color: #333;
            text-transform: capitalize;
        }
        .comic-meta {
            color: #666;
            margin: 10px 0;
        }
        .comic-description {
            font-style: italic;
            margin: 15px 0;
            color: #555;
        }
        .panels-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 30px 0;
        }
        .panel {
            border: 3px solid #333;
            border-radius: 8px;
            overflow: hidden;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .panel-header {
            background: #333;
            color: white;
            padding: 10px;
            font-weight: bold;
            text-align: center;
        }
        .panel-image {
            width: 100%;
            height: auto;
            object-fit: contain;
            display: block;
            max-height: 400px;
        }
        .panel-description {
            padding: 15px;
            font-size: 0.9em;
            color: #555;
            border-top: 1px solid #eee;
        }
        .story-info {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        .info-item {
            background: white;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #dee2e6;
        }
        .info-label {
            font-weight: bold;
            color: #495057;
            font-size: 0.85em;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        .info-value {
            color: #333;
        }
        .common-description {
            background: #e9f7ef;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #28a745;
        }
        .common-description h3 {
            margin-top: 0;
            color: #155724;
        }
        @media (max-width: 768px) {
            .panels-grid {
                grid-template-columns: 1fr;
            }
            .comic-title {
                font-size: 2em;
            }
            body {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="comic-container">
        <div class="comic-header">
            <h1 class="comic-title">${story.prompt.theme}</h1>
            <div class="comic-meta">
                <strong>Story ID:</strong> ${story.id} | 
                <strong>Language:</strong> ${story.language} | 
                <strong>Difficulty:</strong> ${story.difficulty} |
                <strong>Category:</strong> ${story.category}
            </div>
            <div class="comic-description">${story.description}</div>
        </div>

        <div class="common-description">
            <h3>Story Overview</h3>
            <p>${story.prompt.storyDescription}</p>
        </div>

        <div class="panels-grid">
            ${story.images.panels
              .map(
                (panel) => `
                <div class="panel">
                    <div class="panel-header">Panel ${panel.panelNumber}</div>
                    <img src="${panel.imageUrl}" alt="Panel ${panel.panelNumber}" class="panel-image" />
                    <div class="panel-description">${panel.description}</div>
                </div>
            `,
              )
              .join('')}
        </div>

        <div class="story-info">
            <h3>Story Information</h3>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Character Type</div>
                    <div class="info-value">${story.prompt.characterType}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Created</div>
                    <div class="info-value">${new Date(
                      story.created_at,
                    ).toLocaleDateString()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Usage Count</div>
                    <div class="info-value">${story.usage_count}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Active</div>
                    <div class="info-value">${story.is_active ? 'Yes' : 'No'}</div>
                </div>
                ${
                  story.upvotes + story.downvotes > 0
                    ? `
                <div class="info-item">
                    <div class="info-label">Rating</div>
                    <div class="info-value">👍 ${story.upvotes} | 👎 ${story.downvotes}</div>
                </div>
                `
                    : ''
                }
            </div>
        </div>
    </div>
</body>
</html>`

    const fileName = `comic_${story.id}_${story.prompt.theme.replace(/[^a-zA-Z0-9]/g, '_')}.html`
    const filePath = path.join(outputDir, fileName)

    await fs.writeFile(filePath, htmlContent)
    console.log(`📄 HTML preview generated: ${filePath}`)

    return filePath
  } catch (error) {
    console.error('❌ Error generating HTML preview:', error)
    throw error
  }
}

/**
 * Generate a comic and create an HTML preview
 * @param {string} language - Target language
 * @param {string} category - Comic category
 * @param {boolean} createHTML - Whether to generate HTML preview
 * @returns {Promise<Object>} Result with story and HTML path
 */
async function generateComicWithPreview(
  language = 'English',
  category = 'comic',
  createHTML = true,
) {
  try {
    const story = await generateFullComic(language, category)

    let htmlPath = null
    if (createHTML) {
      htmlPath = await generateComicHTML(story)
    }

    return {
      success: true,
      story,
      htmlPath,
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
    const result = await generateComicWithPreview('English', 'test-comic', true)

    if (result.success) {
      console.log(`✅ Test completed successfully!`)
      console.log(`   Story ID: ${result.story.id}`)
      console.log(`   Theme: ${result.story.prompt.theme}`)
      console.log(`   HTML Preview: ${result.htmlPath}`)
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
  generateComicHTML,
  generateComicWithPreview,
}
