require('dotenv').config()
const express = require('express')
const router = express.Router()
const { OpenAI } = require('openai')
const ffmpeg = require('fluent-ffmpeg')
const multer = require('multer')
const { Readable, PassThrough } = require('stream')
const { createTextToSpeech, calculateCost } = require('../utils/openAI/index')
const { uploadData } = require('../linodeUtils')
const config = require('@config')
const AiUsage = require('../tables/ai_usage')

// Language configuration - centralized for easy maintenance
const LANGUAGE_CONFIG = config.languages

// Audio processing configuration
const AUDIO_CONFIG = {
  // Set to true to try sending WebM directly to OpenAI (more efficient)
  // Set to false to always convert to MP3 (fallback for compatibility)
  TRY_WEBM_DIRECT: true,
}

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

// Helper function to record AI usage
async function recordAiUsage(userId, usage, metadata = {}) {
  if (!userId || !usage) {
    console.warn('Cannot record AI usage: missing userId or usage data')
    return
  }

  try {
    // Calculate cost if model is provided in metadata
    let costData = null
    if (metadata.model) {
      costData = calculateCost(metadata.model, usage, metadata)
    }

    // Add cost information to metadata
    const enrichedMetadata = {
      ...metadata,
      ...(costData && {
        cost: costData.totalCost,
        cost_breakdown: costData.breakdown,
        token_breakdown: costData.tokenBreakdown,
      }),
    }

    await AiUsage.query().insert({
      input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
      cached_input_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      output_tokens: usage.completion_tokens || usage.output_tokens || 0,
      user_id: userId,
      metadata: enrichedMetadata,
    })

    console.log('AI Usage recorded:', {
      userId,
      input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
      cached_input_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      output_tokens: usage.completion_tokens || usage.output_tokens || 0,
      total_tokens: usage.total_tokens || 0,
      ...(costData && { estimated_cost: `$${costData.totalCost}` }),
    })
  } catch (error) {
    console.error('Failed to record AI usage:', error)
    // Don't throw error to avoid breaking the main request
  }
}

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

// Create appropriate File object based on input format
function createAudioFileFromBuffer(buffer, originalMimeType, originalName) {
  // Determine the appropriate filename and MIME type
  if (originalMimeType === 'audio/webm' || originalName?.toLowerCase().endsWith('.webm')) {
    return new File([buffer], 'audio.webm', { type: 'audio/webm' })
  } else if (
    originalMimeType === 'audio/mpeg' ||
    originalMimeType === 'audio/mp3' ||
    originalName?.toLowerCase().endsWith('.mp3')
  ) {
    return new File([buffer], 'audio.mp3', { type: 'audio/mpeg' })
  } else {
    // Default to webm for unknown types if we're trying direct approach
    return new File([buffer], 'audio.webm', { type: 'audio/webm' })
  }
}

router.get('/', (req, res) => {
  res.send('Language Helper API is running')
})

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file
    const { language = 'spanish' } = req.body
    const userId = req.session?.user_id

    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    // Get language configuration
    const languageConfig = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.spanish
    const isoLanguageCode = languageConfig.isoCode

    // Determine if we should try WebM direct or convert to MP3
    const isWebM =
      audioFile.mimetype === 'audio/webm' ||
      audioFile.originalname?.toLowerCase().endsWith('.webm')
    const isMp3 =
      audioFile.mimetype === 'audio/mpeg' ||
      audioFile.mimetype === 'audio/mp3' ||
      audioFile.originalname?.toLowerCase().endsWith('.mp3')

    const shouldTryDirectWebM = AUDIO_CONFIG.TRY_WEBM_DIRECT && isWebM

    console.log('Received file:', {
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      originalname: audioFile.originalname,
      language,
      processingMode: shouldTryDirectWebM
        ? 'WebM Direct'
        : isMp3
        ? 'MP3 Direct'
        : 'Convert to MP3',
    })

    let finalBuffer = audioFile.buffer
    let finalMimeType = audioFile.mimetype
    let finalFilename = audioFile.originalname || 'audio'

    if (shouldTryDirectWebM) {
      console.log('Attempting to send WebM directly to OpenAI...')
      // Keep original buffer and MIME type for WebM
      finalMimeType = 'audio/webm'
      finalFilename = 'audio.webm'
    } else if (!isMp3) {
      // Convert to MP3 (existing behavior)
      console.log('Converting to MP3...')
      finalBuffer = await convertToMp3Buffer(audioFile.buffer, audioFile.mimetype)
      finalMimeType = 'audio/mpeg'
      finalFilename = 'audio.mp3'
      console.log('MP3 buffer created, size:', finalBuffer.length, 'bytes')
    } else {
      console.log('File is already MP3, using directly')
      finalMimeType = 'audio/mpeg'
      finalFilename = 'audio.mp3'
    }

    const startTime = Date.now()

    // Create the appropriate File object
    let audioFileForAPI
    if (shouldTryDirectWebM) {
      audioFileForAPI = createAudioFileFromBuffer(
        finalBuffer,
        audioFile.mimetype,
        audioFile.originalname,
      )
    } else {
      audioFileForAPI = createFileFromBuffer(finalBuffer, finalFilename, finalMimeType)
    }

    // Create transcription request with or without language specification
    const transcriptionRequest = {
      file: audioFileForAPI,
      model: 'gpt-4o-mini-transcribe',
    }

    // Only add language if it's not auto-detect (null means auto-detect for OpenAI)
    if (isoLanguageCode !== null) {
      transcriptionRequest.language = isoLanguageCode
    }

    let transcription
    try {
      transcription = await openai.audio.transcriptions.create(transcriptionRequest)
    } catch (error) {
      // If WebM direct failed and we were trying that approach, fall back to MP3 conversion
      if (
        shouldTryDirectWebM &&
        (error.message?.includes('format') || error.message?.includes('audio'))
      ) {
        console.log('WebM direct approach failed, falling back to MP3 conversion...')
        console.log('WebM error:', error.message)

        // Convert to MP3 as fallback
        const mp3Buffer = await convertToMp3Buffer(audioFile.buffer, audioFile.mimetype)
        const mp3File = createFileFromBuffer(mp3Buffer, 'audio.mp3', 'audio/mpeg')

        const fallbackRequest = {
          file: mp3File,
          model: 'gpt-4o-mini-transcribe',
        }

        if (isoLanguageCode !== null) {
          fallbackRequest.language = isoLanguageCode
        }

        console.log('Retrying with MP3 conversion...')
        transcription = await openai.audio.transcriptions.create(fallbackRequest)
      } else {
        // Re-throw the error if it's not a format issue or we weren't trying WebM direct
        throw error
      }
    }

    const endTime = Date.now()
    console.log('Transcription Response Time:', (endTime - startTime) / 1000, 'seconds')

    // Record AI usage for transcription
    // Note: The new transcription API returns usage information with audio tokens
    if (transcription.usage) {
      await recordAiUsage(
        userId,
        {
          prompt_tokens: transcription.usage.input_tokens || 0,
          completion_tokens: transcription.usage.output_tokens || 0,
          total_tokens: transcription.usage.total_tokens || 0,
        },
        {
          model: 'gpt-4o-mini-transcribe',
          operation: 'transcription',
          language: language,
          file_size_bytes: audioFile.size,
          audio_format: finalMimeType,
          audio_tokens: transcription.usage.input_token_details?.audio_tokens || 0,
          text_tokens: transcription.usage.input_token_details?.text_tokens || 0,
        },
      )
    } else {
      // Fallback for older API versions or if usage is not returned
      const estimatedTokens = transcription.text?.split(' ').length || 0
      await recordAiUsage(
        userId,
        {
          prompt_tokens: 0,
          completion_tokens: estimatedTokens,
          total_tokens: estimatedTokens,
        },
        {
          model: 'gpt-4o-mini-transcribe',
          operation: 'transcription',
          language: language,
          file_size_bytes: audioFile.size,
          audio_format: finalMimeType,
          estimated_tokens: true,
        },
      )
    }

    res.send(transcription.text)
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).send(error.message || 'Transcription failed')
  }
})

router.post('/conversation', async (req, res) => {
  try {
    const {
      userMessage,
      conversationHistory = [],
      language = 'spanish',
      enableTTS = false,
    } = req.body
    const userId = req.session?.user_id

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    console.log('Received conversation request:', {
      userMessage,
      historyLength: conversationHistory.length,
      language,
      enableTTS,
    })

    // Get language configuration
    const selectedLanguage = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.spanish
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

    // Record AI usage for conversation
    if (completion.usage) {
      await recordAiUsage(userId, completion.usage, {
        model: completion.model || 'gpt-4o-2024-08-06',
        operation: 'conversation',
        language: language,
        conversation_history_length: conversationHistory.length,
        response_format: 'json_schema',
      })
    }

    // Optional: Generate text-to-speech file
    let audioUrl = null
    if (enableTTS && responseContent.response) {
      try {
        console.log('Generating TTS for response...')
        const ttsStartTime = Date.now()

        // Get the appropriate voice for the language
        const voice = selectedLanguage.ttsVoice || 'alloy'

        // Generate speech from the response text
        const audioBuffer = await createTextToSpeech({
          text: responseContent.response,
          voice: voice,
        })

        // Record TTS usage (TTS is priced per character, not tokens)
        const characterCount = responseContent.response.length
        await recordAiUsage(
          userId,
          {
            prompt_tokens: 0,
            completion_tokens: 0, // TTS doesn't have traditional tokens
            total_tokens: 0,
          },
          {
            model: 'gpt-4o-mini-tts', // Assuming default TTS model
            operation: 'text_to_speech',
            language: language,
            voice: voice,
            character_count: characterCount,
            text_length: characterCount,
          },
        )

        // Upload to your storage service (assuming you have uploadData function)
        const filename = `tts-${Date.now()}-${Math.random().toString(36).substring(7)}.mp3`
        const uploadResult = await uploadData({
          dataBuffer: audioBuffer,
          linodePath: 'tts/', // Store TTS files in a tts/ folder
          fileName: filename,
          uploadType: 'tts',
        })
        audioUrl = uploadResult.url

        const ttsEndTime = Date.now()
        console.log('TTS Generation Time:', (ttsEndTime - ttsStartTime) / 1000, 'seconds')
        console.log('TTS Audio URL:', audioUrl)
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError)
        // Don't fail the entire request if TTS fails
        audioUrl = null
      }
    }

    res.json({
      correction: responseContent.correction,
      alternative: responseContent.alternative,
      response: responseContent.response,
      explanation: responseContent.explanation,
      audioUrl: audioUrl,
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
    const userId = req.session?.user_id

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    console.log('Received scenario request:', { suggestion, language })

    // Get language configuration
    const selectedLanguage = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.spanish
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

    // Record AI usage for scenario generation
    if (completion.usage) {
      await recordAiUsage(userId, completion.usage, {
        model: completion.model || 'gpt-4o-2024-08-06',
        operation: 'scenario_generation',
        language: language,
        suggestion_provided: !!suggestion,
        response_format: 'json_schema',
      })
    }

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
      language = 'spanish',
    } = req.body
    const userId = req.session?.user_id

    if (!userQuestion) {
      return res.status(400).json({ error: 'userQuestion is required' })
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    console.log('Received follow-up request:', {
      userQuestion,
      correctionContext,
      historyLength: followupHistory.length,
      language,
    })

    // Get language configuration
    const selectedLanguage = LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG.spanish
    const languageName = selectedLanguage.name

    // Build the context from the correction information
    let contextText = `You are a helpful language tutor. A student is asking a follow-up question about a recent language correction/feedback.`

    if (
      correctionContext.correction ||
      correctionContext.alternative ||
      correctionContext.explanation
    ) {
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

    // Record AI usage for follow-up
    if (completion.usage) {
      await recordAiUsage(userId, completion.usage, {
        model: completion.model || 'gpt-4o-2024-08-06',
        operation: 'followup_question',
        language: language,
        followup_history_length: followupHistory.length,
        has_correction_context: Object.keys(correctionContext).length > 0,
      })
    }

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
