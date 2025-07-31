require('module-alias/register') // Initialize module-alias
const { OpenAI } = require('openai')
const StoryInfo = require('@tables/story_info')
const { generateImage, saveImage, suggestFileName } = require('./imageGenerator')

const { characterBible, style, scenePrompts } = buildIllustrationPlan({
  title: 'The Lost Scarf in the Park',
  scenes: [
    {
      text: 'A girl walks through a park wearing a red scarf. Leaves fall from trees. She smiles and holds a book.',
    },
    { text: 'Wind blows. The red scarf flies off her neck and lands on a bench.' },
    { text: 'A dog finds the scarf on the bench and picks it up gently with its mouth.' },
    {
      text: 'The dog brings the scarf to the girl. The girl kneels, pats the dog, and puts the scarf back on.',
    },
  ],
})

for (const p of scenePrompts) {
  await generateImage({ prompt: p })
}

// Types (adjust as needed)
/**
 * Story = {
 *   title?: string,
 *   scenes: Array<{ id?: string|number, text: string }>
 * }
 *
 * Character = {
 *   id: string,
 *   role: string,            // e.g., "main girl", "dog"
 *   visual: {                // stable, visual traits
 *     age?: string,
 *     gender?: string,
 *     body?: string,
 *     hair?: string,
 *     skin?: string,
 *     clothing?: string[],
 *     accessories?: string[],
 *     colors?: string[],
 *     uniqueFeatures?: string[],
 *   },
 *   notes?: string           // reminders for consistency
 * }
 *
 * IllustrationPlan = {
 *   characterBible: Character[],
 *   style: {
 *     medium: string,        // e.g., "clean vector line art"
 *     colorPalette: string,  // e.g., "soft, warm pastels"
 *     framing: string,       // e.g., "clear, medium-wide shots"
 *     backgroundDetail: string,
 *     textPolicy: string,    // "no text in image"
 *     consistencyDirectives: string[],
 *     negativePrompts: string[],
 *     generalDirectives: string[],
 *   },
 *   scenePrompts: string[]
 * }
 */

// Utility: generate a stable ID for characters
const makeId = (base, idx) => `${base.replace(/\s+/g, '-').toLowerCase()}-${idx}`

// Heuristic character extractor.
// For production, replace with a more robust NER pass or a manual cast input.
function extractCharactersFromScenes(scenes) {
  // Very simple heuristics:
  // - Look for "girl, boy, man, woman, dog, cat" tokens.
  // - Assign a default canonical look for each role.
  // - If multiple of same role, number them.
  const roleOrder = []
  const roleCounts = {}
  const knownRoles = ['girl', 'boy', 'man', 'woman', 'dog', 'cat', 'teacher', 'student']

  const roleDefaults = {
    girl: {
      visual: {
        age: 'child (8-10)',
        gender: 'female',
        body: 'average height for a child',
        hair: 'brown, shoulder-length, straight',
        skin: 'light/medium',
        clothing: ['blue denim jacket', 'white T-shirt', 'navy skirt', 'white sneakers'],
        accessories: ['red scarf'], // often seen in stories
        colors: ['blue, red, white'],
        uniqueFeatures: ['small star-shaped pin on jacket'],
      },
      notes: 'Keep scarf consistent in all scenes; same hair length and outfit.',
    },
    boy: {
      visual: {
        age: 'child (8-10)',
        gender: 'male',
        body: 'average height for a child',
        hair: 'black, short, slightly wavy',
        skin: 'medium',
        clothing: ['green hoodie', 'dark jeans', 'black sneakers'],
        accessories: [],
        colors: ['green, black, dark blue'],
        uniqueFeatures: ['band-aid on left knee'],
      },
      notes: 'Hoodie and band-aid should be visible consistently.',
    },
    man: {
      visual: {
        age: 'adult (30s)',
        gender: 'male',
        body: 'average build',
        hair: 'brown, short',
        skin: 'light/medium',
        clothing: ['light gray sweater', 'navy chinos', 'brown shoes'],
        accessories: ['black watch'],
        colors: ['gray, navy, brown'],
        uniqueFeatures: ['thin rectangular glasses'],
      },
      notes: 'Glasses and watch should appear in all scenes.',
    },
    woman: {
      visual: {
        age: 'adult (30s)',
        gender: 'female',
        body: 'average build',
        hair: 'dark brown, shoulder-length, wavy',
        skin: 'medium',
        clothing: ['mustard yellow coat', 'blue jeans', 'ankle boots'],
        accessories: ['simple silver earrings'],
        colors: ['mustard yellow, blue'],
        uniqueFeatures: ['small crescent necklace'],
      },
      notes: 'Coat color must remain mustard yellow; same necklace each scene.',
    },
    dog: {
      visual: {
        age: 'adult dog',
        gender: 'unknown',
        body: 'medium-sized, short-haired',
        hair: 'tan fur with white chest',
        skin: '—',
        clothing: ['red collar with round silver tag'],
        accessories: [],
        colors: ['tan, white, red'],
        uniqueFeatures: ['one floppy ear, one upright ear'],
      },
      notes: 'Ear shape and red collar must be consistent.',
    },
    cat: {
      visual: {
        age: 'adult cat',
        gender: 'unknown',
        body: 'slim, short-haired',
        hair: 'gray tabby stripes',
        skin: '—',
        clothing: [],
        accessories: ['blue collar with bell'],
        colors: ['gray, blue'],
        uniqueFeatures: ['distinct M marking on forehead'],
      },
      notes: 'Tabby pattern and blue collar bell must be consistent.',
    },
    teacher: {
      visual: {
        age: 'adult (40s)',
        gender: 'any',
        body: 'average build',
        hair: 'salt-and-pepper, neatly tied back',
        skin: 'medium',
        clothing: ['navy cardigan', 'white shirt', 'khaki trousers'],
        accessories: ['black frame glasses'],
        colors: ['navy, white, khaki'],
        uniqueFeatures: ['name badge on lanyard'],
      },
      notes: 'Glasses and badge always visible.',
    },
    student: {
      visual: {
        age: 'teen (15-16)',
        gender: 'any',
        body: 'average',
        hair: 'dark short hair',
        skin: 'light/medium',
        clothing: ['school uniform blazer', 'white shirt', 'tie'],
        accessories: [],
        colors: ['navy, white'],
        uniqueFeatures: ['school crest patch on blazer'],
      },
      notes: 'Uniform and crest consistent.',
    },
  }

  function detectRoles(text) {
    const lower = text.toLowerCase()
    const found = []
    for (const role of knownRoles) {
      if (lower.includes(role)) found.push(role)
    }
    return Array.from(new Set(found))
  }

  // Accumulate which roles appear
  scenes.forEach((s) => {
    detectRoles(s.text).forEach((role) => {
      roleOrder.push(role)
      roleCounts[role] = (roleCounts[role] || 0) + 1
    })
  })

  // If no roles detected, create a generic "student" as main
  if (roleOrder.length === 0) {
    roleOrder.push('student')
    roleCounts['student'] = 1
  }

  const characters = []
  const counters = {}
  roleOrder.forEach((role) => {
    counters[role] = 0
  })

  // Create one entry per unique role (or multiple if needed)
  Object.keys(roleCounts).forEach((role) => {
    const count = roleCounts[role]
    for (let i = 0; i < count; i++) {
      const n = count > 1 ? ` ${i + 1}` : ''
      const roleLabel = `${role}${n}`
      const base = roleDefaults[role] || {
        visual: {
          age: 'unspecified',
          gender: 'unspecified',
          body: 'average build',
          hair: 'brown, short',
          skin: 'medium',
          clothing: ['simple shirt', 'pants'],
          accessories: [],
          colors: ['neutral tones'],
          uniqueFeatures: [],
        },
        notes: 'Keep outfit, hair, and accessories consistent in all scenes.',
      }

      characters.push({
        id: makeId(roleLabel, i),
        role: roleLabel,
        visual: base.visual,
        notes: base.notes,
      })
    }
  })

  return characters
}

function buildGlobalStyle() {
  return {
    medium: 'clean, flat, vector-style illustration with clear outlines',
    colorPalette:
      'soft, warm, classroom-friendly pastels with high contrast between characters and background',
    framing: 'medium-wide shots that clearly show characters and actions; avoid extreme close-ups',
    backgroundDetail:
      'simple, uncluttered backgrounds with a few clear props that support the action',
    textPolicy: 'no embedded text or letters inside the image',
    consistencyDirectives: [
      'always keep characters’ unique features, outfits, and accessories identical across scenes',
      'maintain the same lighting mood and palette throughout the series',
      'same character proportions and facial features across scenes',
    ],
    negativePrompts: [
      'no photorealism',
      'no text, no watermarks, no logos',
      'no extra characters beyond those listed',
      'avoid exaggerated cartoon distortions or chibi proportions',
    ],
    generalDirectives: [
      'clear, readable poses and expressions',
      'single focal action per scene',
      'label nothing with text; use visual cues only',
    ],
  }
}

// Turn character bible into a compact, reusable description block
function characterBibleToText(characters) {
  const lines = characters.map((c) => {
    const v = c.visual
    const clothing = v.clothing?.length ? v.clothing.join(', ') : '—'
    const accessories = v.accessories?.length ? v.accessories.join(', ') : '—'
    const unique = v.uniqueFeatures?.length ? v.uniqueFeatures.join(', ') : '—'
    const colors = v.colors?.length ? v.colors.join(', ') : '—'

    return [
      `Character ${c.id} (${c.role}):`,
      `- Age: ${v.age}; Gender: ${v.gender}; Body: ${v.body}`,
      `- Hair: ${v.hair}; Skin: ${v.skin}`,
      `- Clothing: ${clothing}`,
      `- Accessories: ${accessories}`,
      `- Colors: ${colors}`,
      `- Unique Features: ${unique}`,
      `- Notes: ${c.notes}`,
    ].join(' ')
  })
  return lines.join('\n')
}

// Turn style into a compact, reusable description block
function styleToText(style) {
  return [
    `Art Style: ${style.medium}; Palette: ${style.colorPalette}.`,
    `Framing: ${style.framing}. Background: ${style.backgroundDetail}.`,
    `Consistency: ${style.consistencyDirectives.join('; ')}.`,
    `General: ${style.generalDirectives.join('; ')}.`,
    `Do not include text in the image. Negative: ${style.negativePrompts.join('; ')}.`,
  ].join(' ')
}

// Optional: simple scene normalizer for clarity
function normalizeSceneText(text) {
  // Keep it simple: trim and ensure it is one or two sentences max.
  return text.trim().replace(/\s+/g, ' ')
}

// Builds a single, strong prompt for a scene by combining cast + style + scene
function buildScenePrompt({ storyTitle, style, characterBibleText, sceneText, sceneIndex }) {
  return [
    `Illustration for language-learning book. Title: "${storyTitle || 'Untitled Story'}".`,
    styleToText(style),
    `Character Bible (use exact, consistent details):`,
    characterBibleText,
    `Scene ${sceneIndex + 1}: ${normalizeSceneText(sceneText)}`,
    `Show only the listed characters. Ensure all unique features and outfits match the Character Bible.`,
    `Clear, descriptive action; no text labels.`,
  ].join('\n')
}

// Main function: from story => plan with character bible, style, and scene prompts
function buildIllustrationPlan(story) {
  const characters = extractCharactersFromScenes(story.scenes)
  const style = buildGlobalStyle()
  const characterBibleText = characterBibleToText(characters)

  const scenePrompts = story.scenes.map((scene, i) =>
    buildScenePrompt({
      storyTitle: story.title,
      style,
      characterBibleText,
      sceneText: scene.text,
      sceneIndex: i,
    }),
  )

  return {
    characterBible: characters,
    style,
    scenePrompts,
  }
}

// Example integration with your generateImage:
async function generateImagesForStory(openai, story, options = {}) {
  const { characterBible, style, scenePrompts } = buildIllustrationPlan(story)

  const results = []
  for (let i = 0; i < scenePrompts.length; i++) {
    const prompt = scenePrompts[i]
    const img = await generateImage({
      prompt,
      ...(options || {}),
    })
    results.push({ index: i, prompt, img })
  }
  return { characterBible, style, results }
}
