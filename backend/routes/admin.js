const express = require('express')
const router = express.Router()
const createTextToSpeech = require('../utils/openAI/createTextToSpeech')
const { createGoogleTTS } = require('../utils/google/textToSpeech')
const { uploadData } = require('../linodeUtils')

// Text-to-speech endpoint
router.post('/text-to-speech', async (req, res) => {
  try {
    const { text, voice, provider = 'openai' } = req.body

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required and must be a non-empty string' })
    }

    // Limit text length for safety
    if (text.length > 4000) {
      return res.status(400).json({ error: 'Text is too long. Maximum 4000 characters allowed.' })
    }

    let result

    if (provider === 'google') {
      // Use Google TTS
      result = await createGoogleTTS({ 
        text: text.trim(), 
        voiceName: voice || 'Kore' 
      })
      
      res.status(200).json({
        message: 'Text-to-speech generated successfully with Google',
        audioUrl: result.url,
        text: result.text,
        voice: result.voiceName,
        filename: result.filename,
        uploadId: result.id,
        provider: 'google',
        format: result.convertedFormat,
        sampleRate: result.sampleRate,
        channels: result.channels
      })
    } else {
      // Use OpenAI TTS (default)
      const audioBuffer = await createTextToSpeech({ text: text.trim(), voice })

      // Create a unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2, 8)
      const filename = `tts_${timestamp}_${randomId}.mp3`
      
      // Upload to Linode object storage
      const uploadResult = await uploadData({
        dataBuffer: audioBuffer,
        linodePath: 'admin/tts/',
        fileName: filename,
        fileExtension: 'mp3',
        uploadType: 'admin_tts'
      })

      res.status(200).json({
        message: 'Text-to-speech generated successfully with OpenAI',
        audioUrl: uploadResult.url,
        text: text.trim(),
        voice: voice || 'alloy',
        filename: uploadResult.filename,
        uploadId: uploadResult.id,
        provider: 'openai',
        format: 'mp3'
      })
    }

  } catch (error) {
    console.error('Error generating text-to-speech:', error)
    
    if (error.message && (error.message.includes('OpenAI') || error.message.includes('Google'))) {
      return res.status(500).json({ error: 'Failed to generate audio. Please try again.' })
    }
    
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Admin status endpoint
router.get('/status', (req, res) => {
  res.status(200).json({ 
    message: 'Admin access confirmed',
    user_id: req.session.user_id,
    is_admin: req.session.is_admin
  })
})

module.exports = router
