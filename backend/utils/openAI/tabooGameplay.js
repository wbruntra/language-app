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
 * @param {Object} params - Translation parameters
 * @param {string[]} params.keyWords - Array of English key words
 * @param {string} params.mainWord - The main word that the key words are related to
 * @param {string} params.targetLanguage - Target language
 * @returns {Promise<Object>} Translation results
 * @property {boolean} success - Whether the translation was successful
 * @property {string} translatedMainWord - The translated main/answer word
 * @property {string[]} translatedWords - Array of translated key words in the target language
 * @property {string[]} originalWords - Array of original English key words
 * @property {string} originalMainWord - The original English main word
 * @property {number} cost - Total cost of the API call
 * @property {Object} usage - Usage details from the OpenAI API
 * @property {string} [error] - Error message if the translation fails
 */
async function translateKeyWords({ keyWords, mainWord, targetLanguage }) {
  try {
    const prompt = `Translate the main word and key words to ${targetLanguage}. 
    The key words are related to the main concept: "${mainWord}". 
    Provide single-word translations that maintain the same meaning and context.
    Choose the most appropriate translation for each word given their relationship to each other.
    
    Main word: ${mainWord}
    Key words: ${keyWords.join(', ')}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: 'You are a professional translator specializing in vocabulary games. When translating words, consider their context and relationship to the main concept to choose the most appropriate translation. For words with multiple meanings, select the translation that best relates to the given main word.'
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
          description: 'Translation results for taboo game main word and key words',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              mainWord: {
                type: 'object',
                properties: {
                  original: {
                    type: 'string',
                    description: 'The original English main word'
                  },
                  translated: {
                    type: 'string',
                    description: 'The translated main word in target language'
                  }
                },
                required: ['original', 'translated'],
                additionalProperties: false
              },
              keyWords: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    original: {
                      type: 'string',
                      description: 'The original English key word'
                    },
                    translated: {
                      type: 'string',
                      description: 'The translated key word in target language'
                    }
                  },
                  required: ['original', 'translated'],
                  additionalProperties: false
                }
              }
            },
            required: ['mainWord', 'keyWords'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.3
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    const translatedMainWord = result.mainWord.translated;
    const translatedWords = result.keyWords.map(t => t.translated);
    const originalWords = result.keyWords.map(t => t.original);

    // Calculate cost
    const cost = calculateCost('gpt-4o-2024-08-06', completion.usage);

    return {
      success: true,
      translatedMainWord,
      translatedWords,
      originalWords,
      originalMainWord: mainWord,
      cost: cost?.totalCost || 0,
      usage: completion.usage
    };

  } catch (error) {
    console.error('Error translating key words:', error);
    return {
      success: false,
      error: error.message,
      translatedMainWord: mainWord,
      translatedWords: [],
      originalWords: keyWords,
      originalMainWord: mainWord
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
    const prompt = `Check which of these key words are used in the user's description. Look for exact matches and inflected variations (conjugations, plural forms, etc.) but NOT synonyms.

    User's description: "${description}"
    Key words to find: ${keyWords.join(', ')}
    Target language: ${targetLanguage}

    For each key word, determine if it was used in the description. Only count:
    - Exact matches of the key word
    - Inflected forms (conjugations, plural/singular forms, verb tenses)
    - NOT synonyms or related words - only the specific key words or their inflections`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are a language expert who identifies exact word usage in ${targetLanguage}. Only detect the specific given words or their inflected forms (conjugations, plurals, etc.). Do NOT count synonyms or related words.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'word_detection_response',
          description: 'Detection of key words in user description',
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
                    context: { type: 'string' }
                  },
                  required: ['keyWord', 'found', 'usedAs', 'context'],
                  additionalProperties: false
                }
              },
              answerWordMentioned: {
                type: 'boolean',
                description: 'Whether the answer word was mentioned directly'
              }
            },
            required: ['wordsFound', 'wordsMissed', 'wordDetails', 'answerWordMentioned'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.1
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
      wordDetails: keyWords.map(word => ({
        keyWord: word,
        found: wordsFound.includes(word),
        usedAs: wordsFound.includes(word) ? word : 'not found',
        context: wordsFound.includes(word) ? 'simple match' : 'not detected'
      })),
      answerWordMentioned: description.toLowerCase().includes(answerWord.toLowerCase()),
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
 * Generate a new taboo card using AI
 * @param {Object} params - Card generation parameters
 * @param {string} params.answerWord - The main word for the taboo card
 * @param {string} [params.category] - Optional category for the word (e.g., 'animals', 'food', 'objects')
 * @param {string} [params.difficulty] - Optional difficulty level ('easy', 'medium', 'hard')
 * @param {number} [params.keyWordCount=5] - Number of taboo keywords to generate
 * @param {string} [params.language='en'] - Language for the card (default: English)
 * @returns {Promise<Object>} Generated taboo card
 * @property {boolean} success - Whether the generation was successful
 * @property {Object} card - The generated taboo card
 * @property {string} card.answer - The main answer word
 * @property {string[]} card.key_words - Array of taboo keywords
 * @property {string} [card.category] - Category of the word
 * @property {string} [card.difficulty] - Difficulty level
 * @property {string} [card.language] - Language of the card
 * @property {number} cost - Total cost of the API call
 * @property {Object} usage - Usage details from the OpenAI API
 * @property {string} [error] - Error message if generation fails
 */
async function generateTabooCard({ 
  answerWord, 
  category, 
  difficulty = 'medium', 
  keyWordCount = 5, 
  language = 'en' 
}) {
  try {
    const languageNames = {
      'en': 'English',
      'es': 'Spanish', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese'
    };

    const languageName = languageNames[language] || language;

    const prompt = `Create a taboo card for the word "${answerWord}" in ${languageName}.

    Instructions:
    - Generate ${keyWordCount} taboo keywords that people would most commonly use when describing "${answerWord}"
    - These should be the MOST OBVIOUS words someone would naturally use in their description
    - Choose words that would make the game challenging but fair
    - Avoid overly obscure or technical terms
    - Include a mix of: related nouns, descriptive adjectives, common verbs, and associated concepts
    - Keywords should be single words (or compound words that are commonly written as one word)
    ${category ? `- Consider that this word belongs to the category: ${category}` : ''}
    ${difficulty ? `- Adjust difficulty level to: ${difficulty} (easy = very common words, medium = mix of common and specific, hard = more specific/technical words)` : ''}

    Example reasoning for "CAR":
    - DRIVE (most obvious action)
    - VEHICLE (direct category)  
    - WHEELS (essential physical feature)
    - ROAD (common association)
    - TRANSPORT (main function)

    Think about what words would make someone immediately say "${answerWord}" and make those taboo.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are an expert game designer specializing in word games like Taboo. You understand what makes effective taboo keywords - they should be the most obvious words people would use to describe the answer word, making the game challenging but fair. Focus on common, natural language that players would intuitively reach for.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'taboo_card_response',
          description: 'A generated taboo card with answer word and forbidden keywords',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              answer: {
                type: 'string',
                description: 'The main answer word (uppercase)'
              },
              key_words: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of taboo keywords (uppercase)'
              },
              category: {
                type: 'string',
                description: 'Suggested category for this word'
              },
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard'],
                description: 'Assessed difficulty level'
              },
              reasoning: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    keyword: { type: 'string' },
                    reason: { type: 'string' }
                  },
                  required: ['keyword', 'reason'],
                  additionalProperties: false
                },
                description: 'Explanation for why each keyword was chosen'
              }
            },
            required: ['answer', 'key_words', 'category', 'difficulty', 'reasoning'],
            additionalProperties: false
          }
        }
      },
      temperature: 0.7
    });

    const result = JSON.parse(completion.choices[0].message.content);
    
    // Calculate cost
    const cost = calculateCost('gpt-4o-2024-08-06', completion.usage);

    // Ensure the answer word is in the correct format
    const card = {
      answer: result.answer.toUpperCase(),
      key_words: result.key_words.map(word => word.toUpperCase()),
      category: category || result.category.toLowerCase(),
      difficulty: difficulty || result.difficulty,
      language: language
    };

    return {
      success: true,
      card,
      reasoning: result.reasoning,
      cost: cost?.totalCost || 0,
      usage: completion.usage
    };

  } catch (error) {
    console.error('Error generating taboo card:', error);
    return {
      success: false,
      error: error.message,
      card: null
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
  generateTabooCard,
  calculateScore
};
