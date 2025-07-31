// To run this code you need to install the following dependencies:
// npm install @google/genai mime

const { GoogleGenAI } = require('@google/genai')
const mime = require('mime')
const { uploadData } = require('../../linodeUtils')
const ffmpeg = require('fluent-ffmpeg')
const { Readable } = require('stream')

/**
 * Converts PCM audio data to MP3 format using FFmpeg
 * @param {Buffer} pcmBuffer - Raw PCM audio data
 * @param {Object} options - Audio format options
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
function convertPcmToMp3(pcmBuffer, options = {}) {
  return new Promise((resolve, reject) => {
    const { sampleRate = 24000, channels = 1 } = options
    
    // Create a readable stream from the PCM buffer
    const inputStream = new Readable({
      read() {
        this.push(pcmBuffer)
        this.push(null) // End the stream
      }
    })

    const chunks = []
    
    ffmpeg(inputStream)
      .inputFormat('s16le') // 16-bit signed little-endian PCM
      .inputOptions([
        `-ar ${sampleRate}`, // Sample rate
        `-ac ${channels}`,   // Number of channels
      ])
      .format('mp3')
      .audioBitrate(128) // 128 kbps MP3
      .on('error', (err) => {
        console.error('FFmpeg error:', err)
        reject(err)
      })
      .on('end', () => {
        const mp3Buffer = Buffer.concat(chunks)
        resolve(mp3Buffer)
      })
      .pipe()
      .on('data', (chunk) => {
        chunks.push(chunk)
      })
  })
}

/**
 * Generate text-to-speech using Google's Gemini API and upload to Linode
 * @param {string} text - Text to convert to speech
 * @param {string} voiceName - Voice to use (default: 'Kore')
 * @returns {Promise<Object>} - Upload result with URL
 */
async function createGoogleTTS({ text, voiceName = 'Kore' }) {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })
  
  const config = {
    responseModalities: ['AUDIO'],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName,
        },
      },
    },
  }
  
  const model = 'gemini-2.5-flash-preview-tts'
  const contents = [
    {
      role: 'user',
      parts: [
        {
          text,
        },
      ],
    },
  ]

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents,
  })
  
  // Collect all audio chunks
  const audioChunks = []
  
  for await (const chunk of response) {
    if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
      continue
    }
    
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
      const inlineData = chunk.candidates[0].content.parts[0].inlineData
      const audioData = Buffer.from(inlineData.data || '', 'base64')
      audioChunks.push(audioData)
    }
  }
  
  if (audioChunks.length === 0) {
    throw new Error('No audio data received from Google TTS')
  }
  
  // Combine all audio chunks
  const combinedPcmBuffer = Buffer.concat(audioChunks)
  
  // Convert PCM to MP3
  const mp3Buffer = await convertPcmToMp3(combinedPcmBuffer, {
    sampleRate: 24000, // Google TTS default sample rate
    channels: 1        // Mono audio
  })
  
  // Create unique filename
  const timestamp = Date.now()
  const randomId = Math.random().toString(36).substring(2, 8)
  const filename = `google_tts_${timestamp}_${randomId}.mp3`
  
  // Upload to Linode
  const uploadResult = await uploadData({
    dataBuffer: mp3Buffer,
    linodePath: 'admin/google-tts/',
    fileName: filename,
    fileExtension: 'mp3',
    uploadType: 'google_tts'
  })
  
  return {
    ...uploadResult,
    text,
    voiceName,
    originalFormat: 'pcm',
    convertedFormat: 'mp3',
    sampleRate: 24000,
    channels: 1
  }
}

module.exports = {
  createGoogleTTS,
  convertPcmToMp3
}
