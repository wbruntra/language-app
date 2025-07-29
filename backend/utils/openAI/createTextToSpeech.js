const { OpenAI } = require('openai')

/**
 * Converts text to speech using OpenAI's TTS model.
 *
 * @param {Object} params - The parameters for the TTS request.
 * @param {string} params.text - The text to be converted to speech.
 * @param {string} [params.voice] - The voice model to use for the TTS. Defaults to 'alloy'.
 * @returns {Promise<Buffer>} - A promise that resolves to a buffer containing the MP3 audio data.
 */
const createTextToSpeech = async ({ text, voice }) => {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  const mp3 = await openai.audio.speech.create({
    model: 'gpt-4o-mini-tts',
    voice: voice || 'alloy',
    input: text,
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())

  return buffer
}

module.exports = createTextToSpeech
