const express = require('express')
const router = express.Router()
const recordAiUsage = require('@utils/recordAiUsage')
const {
  conversationMessage,
  createTTSAndUpload,
  generateScenario,
  followupAnswer,
  getSelectedLanguage,
} = require('@utils/openAI/conversationTools')

// POST /api/conversations/message
router.post('/message', async (req, res) => {
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

    const { responseContent, selectedLanguage } = await conversationMessage({
      userId,
      userMessage,
      conversationHistory,
      language,
    })

    let audioUrl = null
    if (enableTTS && responseContent.response) {
      try {
        console.log('Generating TTS for response...')
        const voice = selectedLanguage.ttsVoice || 'alloy'
        audioUrl = await createTTSAndUpload({
          userId,
          text: responseContent.response,
          voice,
        })
        console.log('TTS Audio URL:', audioUrl)
      } catch (ttsError) {
        console.error('TTS generation failed:', ttsError)
        audioUrl = null
      }
    }

    res.json({
      correction: responseContent.correction,
      alternative: responseContent.alternative,
      response: responseContent.response,
      explanation: responseContent.explanation,
      audioUrl,
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

// POST /api/conversations/scenario
router.post('/scenario', async (req, res) => {
  try {
    const { suggestion = '', language = 'spanish' } = req.body
    const userId = req.session?.user_id
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' })
    }

    console.log('Received scenario request:', { suggestion, language })

    const { responseContent } = await generateScenario({ userId, suggestion, language })

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

// POST /api/conversations/followup
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

    const { responseContent } = await followupAnswer({
      userId,
      userQuestion,
      correctionContext,
      followupHistory,
      language,
    })

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
