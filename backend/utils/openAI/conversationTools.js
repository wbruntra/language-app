const config = require('@config')
const recordAiUsage = require('@utils/recordAiUsage')
const { uploadData } = require('../../linodeUtils')
const { createTextToSpeech } = require('./index')
const { openaiClient } = require('./transcriptionTools')

const LANGUAGE_CONFIG = config.languages
const openai = openaiClient()

function getSelectedLanguage(language) {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.spanish
}

function buildConversationMessages({ userMessage, conversationHistory = [], language }) {
  const selectedLanguage = getSelectedLanguage(language)
  const languageName = selectedLanguage.name

  const messages = [
    {
      role: 'system',
      content: `You are a helpful ${languageName} language tutor. Your job is to:
1. Correct and rephrase the user's ${languageName} in a grammatically correct and natural way
2. Provide an alternative way to express the same idea - this should be creative and show different vocabulary, expressions, or structures
3. Provide a conversational response in ${languageName} to continue the dialogue
4. Keep responses appropriate for language learning - not too complex but engaging

Respond with a JSON object containing:
- "correction": The user's message corrected and rephrased in proper ${languageName} (or "Perfect" if no correction needed)
- "alternative": A creative alternative way to express the same idea using different vocabulary, expressions, or sentence structures in ${languageName}
- "response": Your conversational response in ${languageName} to continue the dialogue
- "explanation": Brief explanation in English of any major corrections made (or empty string if no corrections)`,
    },
  ]

  conversationHistory.forEach((msg) => {
    messages.push({
      role: msg.role || 'user',
      content: msg.content,
    })
  })

  messages.push({
    role: 'user',
    content: `Please correct and respond to: "${userMessage}"`,
  })

  return { messages, selectedLanguage }
}

async function conversationMessage({ userId, userMessage, conversationHistory = [], language = 'spanish' }) {
  const { messages, selectedLanguage } = buildConversationMessages({ userMessage, conversationHistory, language })
  const startTime = Date.now()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'language_response',
        description: 'Response for language learning conversation with correction and continuation',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            correction: { type: 'string' },
            alternative: { type: 'string' },
            response: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['correction', 'alternative', 'response', 'explanation'],
          additionalProperties: false,
        },
      },
    },
  })

  const endTime = Date.now()
  console.log('Conversation Response Time:', (endTime - startTime) / 1000, 'seconds')

  const responseContent = JSON.parse(completion.choices[0].message.content)

  if (completion.usage) {
    await recordAiUsage(userId, completion.usage, {
      model: completion.model || 'gpt-4o-2024-08-06',
      operation: 'conversation',
      language,
      conversation_history_length: conversationHistory.length,
      response_format: 'json_schema',
    })
  }

  return { responseContent, selectedLanguage }
}

async function createTTSAndUpload({ userId, text, voice }) {
  const audioBuffer = await createTextToSpeech({ text, voice })
  const characterCount = text.length
  const ttsUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    characters: characterCount,
  }
  await recordAiUsage(userId, ttsUsage, {
    model: 'gpt-4o-mini-tts',
    operation: 'text_to_speech',
    language: 'n/a',
    voice,
    character_count: characterCount,
  })

  const filename = `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`
  const uploadResult = await uploadData({
    dataBuffer: audioBuffer,
    linodePath: 'tts/',
    fileName: filename,
    uploadType: 'tts',
  })
  return uploadResult.url
}

async function generateScenario({ userId, suggestion = '', language = 'spanish' }) {
  const selectedLanguage = getSelectedLanguage(language)
  const languageName = selectedLanguage.name
  const levelDescription = selectedLanguage.level

  const systemPrompt = `You are a helpful ${languageName} language tutor. Generate a realistic conversation scenario for ${languageName} language practice.

Create a scenario that:
1. Provides a clear context/situation
2. Gives the student a specific role to play
3. Includes a starting message from a ${languageName} speaker
4. Is appropriate for ${levelDescription} learners
5. Encourages natural conversation

${suggestion ? `User suggestion: "${suggestion}". Try to incorporate this into the scenario if appropriate.` : ''}

Respond with a JSON object containing:
- "title": A brief title for the scenario (in English)
- "context": Description of the situation and the student's role (in English)
- "initialMessage": The first message from the ${languageName} speaker to start the conversation (in ${languageName})
- "tips": Brief tips for the student on useful phrases or vocabulary for this scenario (in English)`

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Please generate a conversation scenario for ${languageName} practice.` },
  ]

  const startTime = Date.now()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'scenario_response',
        description: `A conversation scenario for ${languageName} language practice`,
        strict: true,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            context: { type: 'string' },
            initialMessage: { type: 'string' },
            tips: { type: 'string' },
          },
          required: ['title', 'context', 'initialMessage', 'tips'],
          additionalProperties: false,
        },
      },
    },
  })
  const endTime = Date.now()
  console.log('Scenario Response Time:', (endTime - startTime) / 1000, 'seconds')

  const responseContent = JSON.parse(completion.choices[0].message.content)

  if (completion.usage) {
    await recordAiUsage(userId, completion.usage, {
      model: completion.model || 'gpt-4o-2024-08-06',
      operation: 'scenario_generation',
      language,
      suggestion_provided: !!suggestion,
      response_format: 'json_schema',
    })
  }

  return { responseContent }
}

async function followupAnswer({ userId, userQuestion, correctionContext = {}, followupHistory = [], language = 'spanish' }) {
  const selectedLanguage = getSelectedLanguage(language)
  const languageName = selectedLanguage.name

  let contextText = `You are a helpful language tutor. A student is asking a follow-up question about a recent language correction/feedback.`
  if (correctionContext.correction || correctionContext.alternative || correctionContext.explanation) {
    contextText += `\n\nContext of the recent correction for ${languageName} learning:`
    if (correctionContext.original) contextText += `\n- Original student message: "${correctionContext.original}"`
    if (correctionContext.correction) contextText += `\n- Corrected version: "${correctionContext.correction}"`
    if (correctionContext.alternative) contextText += `\n- Alternative expression: "${correctionContext.alternative}"`
    if (correctionContext.explanation) contextText += `\n- Explanation provided: "${correctionContext.explanation}"`
  }
  contextText += `\n\nPlease answer the student's follow-up question clearly and helpfully. You can respond in any language that best serves the student's understanding, but default to English for explanations unless they specifically ask in another language.`

  const messages = [{ role: 'system', content: contextText }]
  followupHistory.forEach((msg) => {
    messages.push({ role: msg.role || 'user', content: msg.content })
  })
  messages.push({ role: 'user', content: userQuestion })

  const startTime = Date.now()
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-2024-08-06',
    messages,
    temperature: 0.7,
  })
  const endTime = Date.now()
  console.log('Follow-up Response Time:', (endTime - startTime) / 1000, 'seconds')

  const responseContent = completion.choices[0].message.content

  if (completion.usage) {
    await recordAiUsage(userId, completion.usage, {
      model: completion.model || 'gpt-4o-2024-08-06',
      operation: 'followup_question',
      language,
      followup_history_length: followupHistory.length,
      has_correction_context: Object.keys(correctionContext).length > 0,
    })
  }

  return { responseContent }
}

module.exports = {
  conversationMessage,
  createTTSAndUpload,
  generateScenario,
  followupAnswer,
  getSelectedLanguage,
}