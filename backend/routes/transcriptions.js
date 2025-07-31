require('dotenv').config()
const express = require('express')
const router = express.Router()
const { OpenAI } = require('openai')
const multer = require('multer')
const { createTextToSpeech } = require('../utils/openAI/index')
const { uploadData } = require('../linodeUtils')
const config = require('@config')
const recordAiUsage = require('@utils/recordAiUsage')

// Utilities extracted for audio/transcription
const {
  getLanguageConfig,
  transcribeBuffer,
  openaiClient,
} = require('@utils/openAI/transcriptionTools')

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
const openai = openaiClient()


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

    // Use centralized language config helper (kept for logging context)
    const languageConfig = getLanguageConfig(language)

    // Log file meta and planned processing
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

    const startTime = Date.now()

    // Delegate transcription to utility
    const result = await transcribeBuffer({
      openai,
      buffer: audioFile.buffer,
      mimetype: audioFile.mimetype,
      originalname: audioFile.originalname,
      language,
      tryWebmDirect: AUDIO_CONFIG.TRY_WEBM_DIRECT,
      model: 'gpt-4o-mini-transcribe',
    })

    const endTime = Date.now()
    console.log('Transcription Response Time:', (endTime - startTime) / 1000, 'seconds')

    // Record AI usage for transcription
    if (result.usage) {
      await recordAiUsage(userId, result.usage, {
        model: 'gpt-4o-mini-transcribe',
        operation: 'transcription',
        language: language,
        file_size_bytes: audioFile.size ?? result.fileSizeBytes,
        audio_format: result.finalMimeType,
      })
    } else {
      // Fallback estimate if usage absent
      const estimatedTokens = result.text?.split(' ').length || 0
      const fallbackUsage = {
        prompt_tokens: 0,
        completion_tokens: estimatedTokens,
        total_tokens: estimatedTokens,
      }
      await recordAiUsage(userId, fallbackUsage, {
        model: 'gpt-4o-mini-transcribe',
        operation: 'transcription',
        language: language,
        file_size_bytes: audioFile.size ?? result.fileSizeBytes,
        audio_format: result.finalMimeType,
        estimated_tokens: true,
      })
    }

    res.send(result.text)
  } catch (error) {
    console.error('Transcription error:', error)
    res.status(500).send(error.message || 'Transcription failed')
  }
})

module.exports = router
