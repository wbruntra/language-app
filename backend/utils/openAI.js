const { OpenAI } = require('openai')

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const createTextToSpeech = async ({ text, voice }) => {
  const mp3 = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: voice || 'coral',
    input: text,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())

  return buffer
}

module.exports = { createTextToSpeech }
