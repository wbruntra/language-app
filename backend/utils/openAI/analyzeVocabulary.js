const OpenAI = require('openai')
const calculateCost = require('./calculateCost')

/**
 * Analyze a vocabulary word using OpenAI to get part of speech, base form, and definition.
 *
 * @param {string} word - The word to analyze (possibly inflected).
 * @param {string} context - The sentence containing the word.
 * @param {string} language - The language of the word (e.g., "Spanish", "French").
 * @returns {Promise<{
 *   analysis: {
 *     baseForm: string,
 *     partOfSpeech: string,
 *     definition: string,
 *     confidence: 'high' | 'medium' | 'low'
 *   },
 *   usage: Object | null,
 *   cost: number,
 *   error?: string
 * }>} - A promise that resolves to an object containing the analysis results, usage data, cost, and optional error message.
 */
async function analyzeVocabulary(word, context, language) {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  try {
    const prompt = `You are a language expert. Analyze the following word in ${language} within its context.

Word: "${word}"
Context: "${context}"

Provide a JSON response with exactly these fields:
- baseForm: the root/lemma form of the word (infinitive for verbs, singular for nouns, masculine singular for adjectives)
- partOfSpeech: one of: noun, verb, adjective, adverb, preposition, conjunction, pronoun, article, interjection
- definition: brief English definition (max 100 characters)
- confidence: your confidence level as "high", "medium", or "low"

Example response:
{
  "baseForm": "correr",
  "partOfSpeech": "verb",
  "definition": "to run",
  "confidence": "high"
}

Response:`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a precise language analysis assistant. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 600,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0].message.content
    const analysis = JSON.parse(content)

    // Calculate cost for tracking
    const cost = calculateCost('gpt-4o-mini', response.usage)

    // Validate required fields
    const requiredFields = ['baseForm', 'partOfSpeech', 'definition', 'confidence']
    for (const field of requiredFields) {
      if (!analysis[field]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }

    // Validate confidence level
    if (!['high', 'medium', 'low'].includes(analysis.confidence)) {
      analysis.confidence = 'medium'
    }

    // Validate part of speech
    const validPOS = [
      'noun',
      'verb',
      'adjective',
      'adverb',
      'preposition',
      'conjunction',
      'pronoun',
      'article',
      'interjection',
    ]
    if (!validPOS.includes(analysis.partOfSpeech)) {
      analysis.partOfSpeech = 'unknown'
    }

    return {
      analysis,
      usage: response.usage,
      cost,
    }
  } catch (error) {
    console.error('Error analyzing vocabulary:', error)

    // Return fallback analysis
    return {
      analysis: {
        baseForm: word,
        partOfSpeech: 'unknown',
        definition: 'Unable to analyze',
        confidence: 'low',
      },
      usage: null,
      cost: 0,
      error: error.message,
    }
  }
}

module.exports = { analyzeVocabulary }
