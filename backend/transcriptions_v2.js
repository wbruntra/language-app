require('dotenv').config()
const express = require('express')
const router = express.Router()
const { OpenAI } = require('openai')
const ffmpeg = require('fluent-ffmpeg')
const multer = require('multer')
const { Readable, PassThrough } = require('stream')
const { requireLogin } = require('./middleware/auth')

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

router.use(requireLogin) // Ensure authentication for all routes
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const audioFile = req.file
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file uploaded' })
    }

    console.log('Received file:', {
      size: audioFile.size,
      mimetype: audioFile.mimetype,
      originalname: audioFile.originalname
    })

    let finalBuffer = audioFile.buffer

    // Only convert if it's NOT already MP3
    const isMp3 = audioFile.mimetype === 'audio/mpeg' || 
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

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile_mp3,
      model: 'gpt-4o-mini-transcribe',
    })

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
    const { userMessage, conversationHistory = [] } = req.body

    if (!userMessage) {
      return res.status(400).json({ error: 'userMessage is required' })
    }

    console.log('Received conversation request:', {
      userMessage,
      historyLength: conversationHistory.length
    })

    // Build the conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a helpful Spanish language tutor. Your job is to:
1. Correct and rephrase the user's Spanish in a grammatically correct and natural way
2. Provide a conversational response in Spanish to continue the dialogue
3. Keep responses appropriate for language learning - not too complex but engaging

Respond with a JSON object containing:
- "correction": The user's message corrected and rephrased in proper Spanish (or "Perfecto" if no correction needed)
- "response": Your conversational response in Spanish to continue the dialogue
- "explanation": Brief explanation in English of any major corrections made (or empty string if no corrections)`
      }
    ]

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role || 'user',
        content: msg.content
      })
    })

    // Add current user message
    messages.push({
      role: 'user',
      content: `Please correct and respond to: "${userMessage}"`
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
                description:
                  "The corrected and properly phrased Spanish version of the user's message",
              },
              response: {
                type: 'string',
                description: 'A conversational response in Spanish to continue the dialogue',
              },
              explanation: {
                type: 'string',
                description:
                  'Brief explanation in English of corrections made, or empty string if no corrections needed',
              },
            },
            required: ['correction', 'response', 'explanation'],
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
      response: responseContent.response,
      explanation: responseContent.explanation,
      conversationHistory: [
        ...conversationHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: responseContent.response }
      ]
    })

  } catch (error) {
    console.error('Conversation error:', error)
    res.status(500).json({ 
      error: 'Failed to process conversation',
      details: error.message 
    })
  }
})

// NEW: Generate conversation scenario
router.post('/scenario', async (req, res) => {
  try {
    const { suggestion = '' } = req.body

    console.log('Received scenario request:', { suggestion })

    const systemPrompt = `You are a helpful Spanish language tutor. Generate a realistic conversation scenario for Spanish language practice.

Create a scenario that:
1. Provides a clear context/situation
2. Gives the student a specific role to play
3. Includes a starting message from a Spanish speaker
4. Is appropriate for intermediate Spanish learners
5. Encourages natural conversation

${suggestion ? `User suggestion: "${suggestion}". Try to incorporate this into the scenario if appropriate.` : ''}

Respond with a JSON object containing:
- "title": A brief title for the scenario (in English)
- "context": Description of the situation and the student's role (in English)
- "initialMessage": The first message from the Spanish speaker to start the conversation (in Spanish)
- "tips": Brief tips for the student on useful phrases or vocabulary for this scenario (in English)`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: 'Please generate a conversation scenario for Spanish practice.'
      }
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
                description: 'Brief title for the scenario'
              },
              context: {
                type: 'string',
                description: 'Description of the situation and student role'
              },
              initialMessage: {
                type: 'string',
                description: 'First message from Spanish speaker to start conversation'
              },
              tips: {
                type: 'string',
                description: 'Useful phrases or vocabulary tips for this scenario'
              }
            },
            required: ['title', 'context', 'initialMessage', 'tips'],
            additionalProperties: false
          }
        }
      }
    })

    const endTime = Date.now()
    console.log('Scenario Response Time:', (endTime - startTime) / 1000, 'seconds')

    const responseContent = JSON.parse(completion.choices[0].message.content)

    res.json({
      title: responseContent.title,
      context: responseContent.context,
      initialMessage: responseContent.initialMessage,
      tips: responseContent.tips,
      conversationHistory: [
        { role: 'assistant', content: responseContent.initialMessage }
      ]
    })

  } catch (error) {
    console.error('Scenario error:', error)
    res.status(500).json({ 
      error: 'Failed to generate scenario',
      details: error.message 
    })
  }
})

module.exports = router
