const PRICING = require('./data/aiPricing')

/**
 * Calculate the cost of an OpenAI API call based on model and usage
 * @param {string} model - The model name used
 * @param {Object} usage - Usage object from OpenAI response
 * @param {number} usage.input_tokens - Number of input tokens (or prompt_tokens)
 * @param {number} usage.output_tokens - Number of output tokens (or completion_tokens)
 * @param {Object} usage.input_token_details - Details about input tokens
 * @param {number} usage.input_token_details.audio_tokens - Audio input tokens
 * @param {number} usage.input_token_details.text_tokens - Text input tokens
 * @param {Object} usage.prompt_tokens_details - Details about prompt tokens (cached info)
 * @param {number} usage.prompt_tokens_details.cached_tokens - Cached input tokens
 * @param {Object} metadata - Additional metadata for cost calculation
 * @param {number} metadata.character_count - Character count for TTS pricing
 * @returns {Object} Cost breakdown
 */
function calculateCost(model, usage, metadata = {}) {
  const pricing = PRICING[model]

  if (!pricing) {
    console.warn(`No pricing data available for model: ${model}`)
    return {
      totalCost: 0,
      breakdown: {
        textTokenCost: 0,
        audioTokenCost: 0,
        characterCost: 0,
        cachedTokenCost: 0,
      },
      error: `Unknown model: ${model}`,
    }
  }

  let textTokenCost = 0
  let audioTokenCost = 0
  let characterCost = 0
  let cachedTokenCost = 0

  // Calculate text token costs
  const inputTokens = usage.input_tokens || usage.prompt_tokens || 0
  const outputTokens = usage.output_tokens || usage.completion_tokens || 0
  const cachedTokens = usage.prompt_tokens_details?.cached_tokens || 0

  // For transcription models, separate audio and text tokens if available
  if (usage.input_token_details) {
    const audioInputTokens = usage.input_token_details.audio_tokens || 0
    const textInputTokens = usage.input_token_details.text_tokens || 0

    // Calculate audio token costs
    audioTokenCost = audioInputTokens * pricing.audioTokens.input

    // Calculate text token costs (text input tokens + all output tokens)
    textTokenCost =
      textInputTokens * pricing.textTokens.input + outputTokens * pricing.textTokens.output

    // Calculate cached token costs
    cachedTokenCost = cachedTokens * pricing.textTokens.cachedInput
  } else {
    // For chat completions: regular input tokens (minus cached) + cached tokens + output tokens
    const regularInputTokens = inputTokens - cachedTokens

    textTokenCost =
      regularInputTokens * pricing.textTokens.input + outputTokens * pricing.textTokens.output

    // Calculate cached token costs
    cachedTokenCost = cachedTokens * pricing.textTokens.cachedInput
  }

  // For TTS, calculate character-based cost if provided
  if (metadata.character_count && model.includes('tts')) {
    // TTS pricing is typically per character, using the estimated cost per minute
    // This is an approximation - actual pricing may vary
    const estimatedMinutes = metadata.character_count / 1000 // Rough estimate: 1000 chars per minute
    characterCost = estimatedMinutes * pricing.estimatedCostPerMinute
  }

  const totalCost = textTokenCost + audioTokenCost + characterCost + cachedTokenCost

  return {
    totalCost: Math.round(totalCost * 100000) / 100000, // Round to 5 decimal places
    breakdown: {
      textTokenCost: Math.round(textTokenCost * 100000) / 100000,
      audioTokenCost: Math.round(audioTokenCost * 100000) / 100000,
      characterCost: Math.round(characterCost * 100000) / 100000,
      cachedTokenCost: Math.round(cachedTokenCost * 100000) / 100000,
    },
    tokenBreakdown: {
      inputTokens: inputTokens,
      outputTokens: outputTokens,
      cachedTokens: cachedTokens,
      audioTokens: usage.input_token_details?.audio_tokens || 0,
      textTokens: usage.input_token_details?.text_tokens || 0,
      regularInputTokens: Math.max(0, inputTokens - cachedTokens),
    },
  }
}

module.exports = calculateCost