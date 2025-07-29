const { OpenAI } = require('openai');
const calculateCost = require('./calculateCost');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Taboo Gameplay AI Functions
 * Handles translation, evaluation, and example generation for the taboo game
 */

/**
 * Translate key words to target language
 * @param {string[]} keyWords - Array of English key words
 * @param {string} targetLanguage - Target language code (e.g., 'es', 'fr', 'de')
 * @returns {Promise<Object>} Translation results
 */
async function translateKeyWords(keyWords, targetLanguage) {
  try {
    const prompt = `Translate the following English words to ${targetLanguage}. 
    Provide single-word translations that maintain the same meaning and context.
    
    Words to translate: ${keyWords.join(', ')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator. Provide accurate, context-appropriate translations for vocabulary games.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'translation_response',
          description: 'Translation results for taboo game key words',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              translations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'string',
                      description: 'The original English word'
                    },
                    translated: {
                      type: 'string',
                      description: 'The translated word in target language'
                    }
                  },
                  required: ['original', 'translated'],
                  additionalProperties: false
                }
              }
            },
            required: ['translations'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    const translatedWords = result.translations.map(t => t.translated);
    const originalWords = result.translations.map(t => t.original);

    // Calculate cost
    const cost = calculateCost('gpt-4o-2024-08-06', completion.usage);

    return {
      success: true,
      translatedWords,
      originalWords,
      cost: cost?.totalCost || 0,
      usage: completion.usage
    };

  } catch (error) {
    console.error('Error translating key words:', error);
    return {
      success: false,
      error: error.message,
      translatedWords: [],
      originalWords: keyWords
    };
  }
}

/**
 * Evaluate user's description for key word usage
 * @param {string} description - User's description of the answer word
 * @param {string[]} keyWords - Translated key words to look for
 * @param {string} answerWord - The target answer word
 * @param {string} targetLanguage - Language of the description
 * @returns {Promise<Object>} Evaluation results
 */
async function evaluateDescription(description, keyWords, answerWord, targetLanguage = 'es') {
  try {
    const prompt = `Evaluate this description for a word-guessing game. The user is trying to describe "${answerWord}" and should use as many of these key words as possible: ${keyWords.join(', ')}.

    User's description: "${description}"
    Target language: ${targetLanguage}
    Key words to find: ${keyWords.join(', ')}

    Analyze the description and determine:
    1. Which key words were used (including variations, conjugations, and synonyms)
    2. How naturally they were incorporated
    3. Overall quality of the description
    4. Whether the answer word was mentioned directly (penalty)`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are an expert language teacher evaluating student descriptions in ${targetLanguage}. Be fair but encouraging, and provide constructive feedback.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'evaluation_response',
          description: 'Evaluation of user description for taboo game',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              wordsFound: {
                type: 'array',
                items: { type: 'string' },
                description: 'Key words that were successfully used'
              },
              wordsMissed: {
                type: 'array',
                items: { type: 'string' },
                description: 'Key words that were not used'
              },
              wordDetails: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyWord: { type: 'string' },
                    found: { type: 'boolean' },
                    usedAs: { type: 'string' },
                    natural: { type: 'boolean' },
                    context: { type: 'string' }
                  },
                  required: ['keyWord', 'found', 'usedAs', 'natural', 'context'],
                  additionalProperties: false
                }
              },
              directMention: {
                type: 'boolean',
                description: 'Whether the answer word was mentioned directly'
              },
              descriptionQuality: {
                type: 'string',
                enum: ['excellent', 'good', 'fair', 'poor'],
                description: 'Overall quality of the description'
              },
              grammar: {
                type: 'string',
                enum: ['correct', 'minor_errors', 'major_errors'],
                description: 'Grammar assessment'
              },
              creativity: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
                description: 'Creativity score from 1-10'
              },
              naturalness: {
                type: 'integer',
                minimum: 1,
                maximum: 10,
                description: 'How naturally the words were incorporated (1-10)'
              },
              baseScore: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: 'Base score based on words found'
              },
              bonusPoints: {
                type: 'integer',
                minimum: 0,
                description: 'Bonus points for quality'
              },
              penaltyPoints: {
                type: 'integer',
                minimum: 0,
                description: 'Penalty points for issues'
              },
              finalScore: {
                type: 'integer',
                minimum: 0,
                maximum: 100,
                description: 'Final calculated score'
              },
              feedback: {
                type: 'string',
                description: 'Constructive feedback message'
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
                description: 'Suggestions for improvement'
              }
            },
            required: ['wordsFound', 'wordsMissed', 'wordDetails', 'directMention', 'descriptionQuality', 'grammar', 'creativity', 'naturalness', 'baseScore', 'bonusPoints', 'penaltyPoints', 'finalScore', 'feedback', 'suggestions'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Calculate cost
    const cost = calculateCost('gpt-4o-2024-08-06', completion.usage);

    return {
      success: true,
      ...result,
      cost: cost?.totalCost || 0,
      usage: completion.usage
    };

  } catch (error) {
    console.error('Error evaluating description:', error);
    
    // Fallback: simple word matching
    const wordsFound = keyWords.filter(word => 
      description.toLowerCase().includes(word.toLowerCase())
    );
    const wordsMissed = keyWords.filter(word => 
      !description.toLowerCase().includes(word.toLowerCase())
    );
    
    return {
      success: false,
      error: error.message,
      wordsFound,
      wordsMissed,
      finalScore: Math.round((wordsFound.length / keyWords.length) * 100),
      feedback: "Evaluation service temporarily unavailable. Score based on simple word matching.",
      fallback: true
    };
  }
}

/**
 * Generate a sample description using all key words
 * @param {string} answerWord - The word to describe
 * @param {string[]} keyWords - Key words to incorporate
 * @param {string} targetLanguage - Language for the description
 * @returns {Promise<Object>} Generated description
 */
async function generateSampleDescription(answerWord, keyWords, targetLanguage = 'es') {
  try {
    const languageNames = {
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese'
    };

    const languageName = languageNames[targetLanguage] || targetLanguage;

    const prompt = `Create a natural, flowing description of "${answerWord}" in ${languageName} that incorporates ALL of these key words: ${keyWords.join(', ')}.

    Requirements:
    - Use ALL key words naturally in the description
    - Don't mention "${answerWord}" directly
    - Make it sound natural and conversational
    - Keep it concise but descriptive (2-3 sentences)
    - Use proper grammar and vocabulary

    The description should help someone guess "${answerWord}" while demonstrating how to use the key words effectively.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are a creative language teacher who writes engaging, natural descriptions in ${languageName}. Your descriptions should be educational examples for language learners.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'sample_description_response',
          description: 'A sample description for the taboo game',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'The natural description incorporating all key words'
              },
              keyWordsUsed: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of key words that were incorporated'
              },
              wordCount: {
                type: 'integer',
                description: 'Number of words in the description'
              },
              difficulty: {
                type: 'string',
                enum: ['beginner', 'intermediate', 'advanced'],
                description: 'Assessed difficulty level of the description'
              }
            },
            required: ['description', 'keyWordsUsed', 'wordCount', 'difficulty'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Calculate cost
    const cost = calculateCost('gpt-4o-2024-08-06', completion.usage);

    return {
      success: true,
      ...result,
      cost: cost?.totalCost || 0,
      usage: completion.usage
    };

  } catch (error) {
    console.error('Error generating sample description:', error);
    return {
      success: false,
      error: error.message,
      description: `Sample description generation unavailable. Try using these words: ${keyWords.join(', ')}`,
      keyWordsUsed: keyWords,
      fallback: true
    };
  }
}

/**
 * Calculate score based on evaluation results
 * @param {Object} evaluation - Results from evaluateDescription
 * @returns {Object} Detailed scoring breakdown
 */
function calculateScore(evaluation) {
  const {
    wordsFound = [],
    wordsMissed = [],
    directMention = false,
    naturalness = 5,
    creativity = 5,
    grammar = 'correct'
  } = evaluation;

  const totalWords = wordsFound.length + wordsMissed.length;
  const baseScore = Math.round((wordsFound.length / totalWords) * 100);
  
  let bonusPoints = 0;
  let penaltyPoints = 0;

  // Naturalness bonus (0-20 points)
  bonusPoints += Math.round((naturalness / 10) * 20);

  // Creativity bonus (0-10 points)
  bonusPoints += Math.round((creativity / 10) * 10);

  // Grammar bonus/penalty
  if (grammar === 'correct') bonusPoints += 10;
  else if (grammar === 'major_errors') penaltyPoints += 15;

  // Direct mention penalty
  if (directMention) penaltyPoints += 50;

  const finalScore = Math.max(0, Math.min(100, baseScore + bonusPoints - penaltyPoints));

  return {
    baseScore,
    bonusPoints,
    penaltyPoints,
    finalScore,
    breakdown: {
      wordUsage: `${wordsFound.length}/${totalWords} words used`,
      naturalness: `+${Math.round((naturalness / 10) * 20)} for naturalness`,
      creativity: `+${Math.round((creativity / 10) * 10)} for creativity`,
      grammar: grammar === 'correct' ? '+10 for grammar' : grammar === 'major_errors' ? '-15 for grammar errors' : '0 for minor grammar issues',
      directMention: directMention ? '-50 for using answer word' : 'No penalty'
    }
  };
}

module.exports = {
  translateKeyWords,
  evaluateDescription,
  generateSampleDescription,
  calculateScore
};
