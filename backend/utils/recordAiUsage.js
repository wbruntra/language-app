const AiUsage = require('@tables/ai_usage')

/**
 * Helper function to record AI usage
 * @param {string} userId - User ID
 * @param {Object} usage - Raw usage object from OpenAI
 * @param {Object} metadata - Additional metadata
 */
async function recordAiUsage(userId, usage, metadata = {}) {
  if (!userId || !usage) {
    console.warn('Cannot record AI usage: missing userId or usage data')
    return
  }

  try {
    await AiUsage.query().insert({
      model: metadata.model || 'unknown',
      usage: usage, // Store the raw usage object from OpenAI
      input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
      cached_input_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      output_tokens: usage.completion_tokens || usage.output_tokens || 0,
      user_id: userId,
      metadata: metadata,
      // cost_usd will be automatically calculated in $beforeInsert
    })

    console.log('AI Usage recorded:', {
      userId,
      model: metadata.model,
      input_tokens: usage.prompt_tokens || usage.input_tokens || 0,
      cached_input_tokens: usage.prompt_tokens_details?.cached_tokens || 0,
      output_tokens: usage.completion_tokens || usage.output_tokens || 0,
      total_tokens: usage.total_tokens || 0,
    })
  } catch (error) {
    console.error('Failed to record AI usage:', error)
    // Don't throw error to avoid breaking the main request
  }
}

module.exports = recordAiUsage
