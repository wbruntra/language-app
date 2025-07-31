'use strict'

const { OpenAI } = require('openai')
const ffmpeg = require('fluent-ffmpeg')
const { Readable, PassThrough } = require('stream')
const config = require('@config')

// Centralized language config accessor
function getLanguageConfig(language) {
  const languages = config.languages || {}
  return languages[language] || languages.spanish || { isoCode: null, name: 'Spanish' }
}

function getIsoLanguageCode(language) {
  return getLanguageConfig(language).isoCode ?? null
}

// Create OpenAI client
function openaiClient(apiKey = process.env.OPENAI_API_KEY) {
  return new OpenAI({ apiKey })
}

// Convert an input audio buffer (assumed webm) to MP3 buffer
function convertToMp3Buffer(inputBuffer) {
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

/**
 * Transcribe an audio buffer using OpenAI.
 *
 * Params:
 *  - openai: OpenAI client instance (optional, will create if not provided)
 *  - buffer: Buffer (required)
 *  - mimetype: string (e.g., 'audio/webm', 'audio/mpeg')
 *  - originalname: original filename
 *  - language: language key (e.g., 'spanish')
 *  - tryWebmDirect: boolean, if true and input is webm, try sending directly
 *  - model: transcription model (default 'gpt-4o-mini-transcribe')
 *
 * Returns:
 *  { text, usage, finalMimeType, fileSizeBytes }
 */
async function transcribeBuffer({
  openai,
  buffer,
  mimetype,
  originalname,
  language = 'spanish',
  tryWebmDirect = true,
  model = 'gpt-4o-mini-transcribe',
}) {
  if (!buffer) throw new Error('No audio buffer provided')

  const client = openai || openaiClient()
  const languageConfig = getLanguageConfig(language)
  const isoLanguageCode = languageConfig.isoCode

  const isWebM = mimetype === 'audio/webm' || originalname?.toLowerCase().endsWith('.webm')
  const isMp3 =
    mimetype === 'audio/mpeg' ||
    mimetype === 'audio/mp3' ||
    originalname?.toLowerCase().endsWith('.mp3')

  const shouldTryDirectWebM = tryWebmDirect && isWebM

  let finalBuffer = buffer
  let finalMimeType = mimetype
  let finalFilename = originalname || 'audio'

  if (shouldTryDirectWebM) {
    finalMimeType = 'audio/webm'
    finalFilename = 'audio.webm'
  } else if (!isMp3) {
    // Convert to MP3
    finalBuffer = await convertToMp3Buffer(buffer)
    finalMimeType = 'audio/mpeg'
    finalFilename = 'audio.mp3'
  } else {
    // Already MP3
    finalMimeType = 'audio/mpeg'
    finalFilename = 'audio.mp3'
  }

  // Build File object
  let audioFileForAPI
  if (shouldTryDirectWebM) {
    audioFileForAPI = createAudioFileFromBuffer(finalBuffer, mimetype, originalname)
  } else {
    audioFileForAPI = createFileFromBuffer(finalBuffer, finalFilename, finalMimeType)
  }

  // Build request
  const transcriptionRequest = {
    file: audioFileForAPI,
    model,
  }
  if (isoLanguageCode !== null) {
    transcriptionRequest.language = isoLanguageCode
  }

  let transcription
  try {
    transcription = await client.audio.transcriptions.create(transcriptionRequest)
  } catch (error) {
    if (
      shouldTryDirectWebM &&
      (error.message?.includes('format') || error.message?.includes('audio'))
    ) {
      // Fallback to MP3 conversion
      const mp3Buffer = await convertToMp3Buffer(buffer)
      const mp3File = createFileFromBuffer(mp3Buffer, 'audio.mp3', 'audio/mPEG')

      const fallbackRequest = {
        file: mp3File,
        model,
      }
      if (isoLanguageCode !== null) {
        fallbackRequest.language = isoLanguageCode
      }

      transcription = await client.audio.transcriptions.create(fallbackRequest)
      finalMimeType = 'audio/mpeg'
      finalBuffer = mp3Buffer
    } else {
      throw error
    }
  }

  return {
    text: transcription.text,
    usage: transcription.usage || null,
    finalMimeType,
    fileSizeBytes: finalBuffer.length,
  }
}

module.exports = {
  getLanguageConfig,
  getIsoLanguageCode,
  openaiClient,
  convertToMp3Buffer,
  createFileFromBuffer,
  createAudioFileFromBuffer,
  transcribeBuffer,
}