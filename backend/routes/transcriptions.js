require('dotenv').config()
const express = require('express')
const router = express.Router()
const { OpenAI } = require('openai')
const ffmpeg = require('fluent-ffmpeg')
const multer = require('multer')
const { Readable, PassThrough } = require('stream')

// Use memory storage instead of disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
})

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Convert buffer to MP3 buffer
const convertToMp3Buffer = (inputBuffer) => {
  return new Promise((resolve, reject) => {
    const outputStream = new PassThrough()
    const chunks = []

    outputStream.on('data', (chunk) => chunks.push(chunk))
    outputStream.on('end', () => resolve(Buffer.concat(chunks)))
    outputStream.on('error', reject)

    const inputStream = Readable.from(inputBuffer)

    ffmpeg()
      .input(inputStream)
      .inputFormat('webm')
      .toFormat('mp3')
      .on('error', reject)
      .pipe(outputStream, { end: true })
  })
}

// Create a File object from buffer (Node.js 20+)
function createFileFromBuffer(buffer, filename = 'audio.mp3', mimeType = 'audio/mpeg') {
  return new File([buffer], filename, { type: mimeType })
}

router.get('/', (req, res) => {
  res.send('Language Helper API is running')
})

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file
    const { language = 'spanish' } = req.body

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    console.log('Received file:', {
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      originalname: audioFile.originalname,
      language
    })

    // Map our language keys to ISO-639-1 codes
    const languageToISO = {
      spanish: 'es',
      french: 'fr',
      german: 'de',
      italian: 'it',
      portuguese: 'pt',
      english: 'en',
      'auto-detect': null // Special case for auto-detection
    }

    const isoLanguageCode = languageToISO[language] || 'es' // Default to Spanish

    let finalBuffer = audioFile.buffer

    // Only convert if it's NOT already MP3
    const isMp3 =
      audioFile.mimetype === 'audio/mpeg' ||
      audioFile.mimetype === 'audio/mp3' ||
      audioFile.originalname?.toLowerCase().endsWith('.mp3')

    if (!isMp3) {
      console.log('Converting to MP3...')
      finalBuffer = await convertToMp3Buffer(audioFile.buffer, audioFile.mimetype)
      console.log('MP3 buffer created, size:', finalBuffer.length, 'bytes')
    } else {
      console.log('File is already MP3, using directly')
    }

    const startTime = Date.now()
    const audioFile_mp3 = createFileFromBuffer(finalBuffer, 'audio.mp3', 'audio/mpeg')

    // Create transcription request with or without language specification
    const transcriptionRequest = {
      file: audioFile_mp3,
      model: 'gpt-4o-mini-transcribe',
    }

    // Only add language if it's not auto-detect (null means auto-detect for OpenAI)
    if (isoLanguageCode !== null) {
      transcriptionRequest.language = isoLanguageCode
    }

    const transcription = await openai.audio.transcriptions.create(transcriptionRequest)

    const endTime = Date.now()
    console.log('Transcription Response Time:', (endTime - startTime) / 1000, 'seconds')

    res.send(transcription.text)
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).send(error.message || 'Transcription failed')
  }
})

router.post('/conversation', async (req, res) => {
  try {
    const { userMessage, conversationHistory = [], language = 'spanish' } = req.body

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    console.log('Received conversation request:', {
      userMessage,
      historyLength: conversationHistory.length,
      language,
    })

    // Language-specific configurations
    const languageConfigs = {
      spanish: {
        name: 'Spanish',
        nativeName: 'español',
      },
      french: {
        name: 'French',
        nativeName: 'français',
      },
      german: {
        name: 'German',
        nativeName: 'Deutsch',
      },
      italian: {
        name: 'Italian',
        nativeName: 'italiano',
      },
      portuguese: {
        name: 'Portuguese',
        nativeName: 'português',
      },
      english: {
        name: 'English',
        nativeName: 'English',
      },
    }

    const selectedLanguage = languageConfigs[language] || languageConfigs.spanish
    const languageName = selectedLanguage.name
    const nativeName = selectedLanguage.nativeName

    // Build the conversation context
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

    // Add conversation history
    conversationHistory.forEach((msg) => {
      messages.push({
        role: msg.role || 'user',
        content: msg.content,
      })
    })

    // Add current user message
    messages.push({
      role: 'user',
      content: `Please correct and respond to: "${userMessage}"`,
    })

    const startTime = Date.now()

    // Use structured output to ensure consistent response format
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'language_response',
          description:
            'Response for language learning conversation with correction and continuation',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              correction: {
                type: 'string',
                description: `The corrected and properly phrased ${languageName} version of the user's message`,
              },
              alternative: {
                type: 'string',
                description: `A creative alternative way to express the same idea using different vocabulary, expressions, or sentence structures in ${languageName}`,
              },
              response: {
                type: 'string',
                description: `A conversational response in ${languageName} to continue the dialogue`,
              },
              explanation: {
                type: 'string',
                description:
                  'Brief explanation in English of corrections made, or empty string if no corrections needed',
              },
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

    res.json({
      correction: responseContent.correction,
      alternative: responseContent.alternative,
      response: responseContent.response,
      explanation: responseContent.explanation,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseContent.response },
      ],
    })
  } catch (error) {
    console.error('Conversation error:', error)
    res.status(500).json({
      error: 'Failed to process conversation',
      details: error.message,
    })
  }
})

// NEW: Generate conversation scenario
router.post('/scenario', async (req, res) => {
  try {
    const { suggestion = '', language = 'spanish' } = req.body

    console.log('Received scenario request:', { suggestion, language })

    // Language-specific configurations
    const languageConfigs = {
      spanish: {
        name: 'Spanish',
        nativeName: 'español',
        level: 'intermediate Spanish',
      },
      french: {
        name: 'French',
        nativeName: 'français',
        level: 'intermediate French',
      },
      german: {
        name: 'German',
        nativeName: 'Deutsch',
        level: 'intermediate German',
      },
      italian: {
        name: 'Italian',
        nativeName: 'italiano',
        level: 'intermediate Italian',
      },
      portuguese: {
        name: 'Portuguese',
        nativeName: 'português',
        level: 'intermediate Portuguese',
      },
      english: {
        name: 'English',
        nativeName: 'English',
        level: 'intermediate English',
      },
    }

    const selectedLanguage = languageConfigs[language] || languageConfigs.spanish
    const languageName = selectedLanguage.name
    const nativeName = selectedLanguage.nativeName
    const levelDescription = selectedLanguage.level

    const systemPrompt = `You are a helpful ${languageName} language tutor. Generate a realistic conversation scenario for ${languageName} language practice.

Create a scenario that:
1. Provides a clear context/situation
2. Gives the student a specific role to play
3. Includes a starting message from a ${languageName} speaker
4. Is appropriate for ${levelDescription} learners
5. Encourages natural conversation

${
  suggestion
    ? `User suggestion: "${suggestion}". Try to incorporate this into the scenario if appropriate.`
    : ''
}

Respond with a JSON object containing:
- "title": A brief title for the scenario (in English)
- "context": Description of the situation and the student's role (in English)
- "initialMessage": The first message from the ${languageName} speaker to start the conversation (in ${languageName})
- "tips": Brief tips for the student on useful phrases or vocabulary for this scenario (in English)`

    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Please generate a conversation scenario for ${languageName} practice.`,
      },
    ]

    const startTime = Date.now()

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: messages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'scenario_response',
          description: 'A conversation scenario for Spanish language practice',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Brief title for the scenario',
              },
              context: {
                type: 'string',
                description: 'Description of the situation and student role',
              },
              initialMessage: {
                type: 'string',
                description: `First message from ${languageName} speaker to start conversation`,
              },
              tips: {
                type: 'string',
                description: 'Useful phrases or vocabulary tips for this scenario',
              },
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

    res.json({
      title: responseContent.title,
      context: responseContent.context,
      initialMessage: responseContent.initialMessage,
      tips: responseContent.tips,
      conversationHistory: [{ role: 'assistant', content: responseContent.initialMessage }],
    })
  } catch (error) {
    console.error('Scenario error:', error)
    res.status(500).json({
      error: 'Failed to generate scenario',
      details: error.message,
    })
  }
})

// NEW: Follow-up question route
router.post('/followup', async (req, res) => {
  try {
    const { 
      userQuestion, 
      correctionContext = {},
      followupHistory = [],
      language = 'spanish' 
    } = req.body

    if (!userQuestion) {
      return res.status(400).json({ error: 'userQuestion is required' })
    }

    console.log('Received follow-up request:', {
      userQuestion,
      correctionContext,
      historyLength: followupHistory.length,
      language,
    })

    // Language-specific configurations for context
    const languageConfigs = {
      spanish: { name: 'Spanish', nativeName: 'español' },
      french: { name: 'French', nativeName: 'français' },
      german: { name: 'German', nativeName: 'Deutsch' },
      italian: { name: 'Italian', nativeName: 'italiano' },
      portuguese: { name: 'Portuguese', nativeName: 'português' },
      english: { name: 'English', nativeName: 'English' },
    }

    const selectedLanguage = languageConfigs[language] || languageConfigs.spanish
    const languageName = selectedLanguage.name

    // Build the context from the correction information
    let contextText = `You are a helpful language tutor. A student is asking a follow-up question about a recent language correction/feedback.`
    
    if (correctionContext.correction || correctionContext.alternative || correctionContext.explanation) {
      contextText += `\n\nContext of the recent correction for ${languageName} learning:`
      
      if (correctionContext.original) {
        contextText += `\n- Original student message: "${correctionContext.original}"`
      }
      if (correctionContext.correction) {
        contextText += `\n- Corrected version: "${correctionContext.correction}"`
      }
      if (correctionContext.alternative) {
        contextText += `\n- Alternative expression: "${correctionContext.alternative}"`
      }
      if (correctionContext.explanation) {
        contextText += `\n- Explanation provided: "${correctionContext.explanation}"`
      }
    }

    contextText += `\n\nPlease answer the student's follow-up question clearly and helpfully. You can respond in any language that best serves the student's understanding, but default to English for explanations unless they specifically ask in another language.`

    // Build the conversation messages
    const messages = [
      {
        role: 'system',
        content: contextText,
      },
    ]

    // Add any previous follow-up history
    followupHistory.forEach((msg) => {
      messages.push({
        role: msg.role || 'user',
        content: msg.content,
      })
    })

    // Add current user question
    messages.push({
      role: 'user',
      content: userQuestion,
    })

    const startTime = Date.now()

    // Use regular chat completion for more flexible responses
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: messages,
      temperature: 0.7, // Slightly more creative for explanations
    })

    const endTime = Date.now()
    console.log('Follow-up Response Time:', (endTime - startTime) / 1000, 'seconds')

    const responseContent = completion.choices[0].message.content

    res.json({
      response: responseContent,
      followupHistory: [
        ...followupHistory,
        { role: 'user', content: userQuestion },
        { role: 'assistant', content: responseContent },
      ],
    })
  } catch (error) {
    console.error('Follow-up error:', error)
    res.status(500).json({
      error: 'Failed to process follow-up question',
      details: error.message,
    })
  }
})

module.exports = router
