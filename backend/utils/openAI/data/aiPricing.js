module.exports = {
  // Text-to-Speech models
  'gpt-4o-mini-tts': {
    textTokens: { input: 0.0000006, cachedInput: 0, output: 0 }, // $0.60 per 1M input tokens
    audioTokens: { input: 0, output: 0.000012 }, // $12.00 per 1M output audio tokens
    estimatedCostPerMinute: 0.015,
  },

  // Transcription models
  'gpt-4o-transcribe': {
    textTokens: { input: 0.0000025, cachedInput: 0, output: 0.00001 }, // $2.50 input, $10.00 output per 1M tokens
    audioTokens: { input: 0.000006, output: 0 }, // $6.00 per 1M input audio tokens
    estimatedCostPerMinute: 0.006,
  },
  'gpt-4o-mini-transcribe': {
    textTokens: { input: 0.00000125, cachedInput: 0, output: 0.000005 }, // $1.25 input, $5.00 output per 1M tokens
    audioTokens: { input: 0.000003, output: 0 }, // $3.00 per 1M input audio tokens
    estimatedCostPerMinute: 0.003,
  },

  // Chat completion models
  'gpt-4o-2024-08-06': {
    textTokens: { input: 0.0000025, cachedInput: 0.00000125, output: 0.00001 }, // $2.50 input, $1.25 cached input, $10.00 output per 1M tokens
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4o-mini': {
    textTokens: { input: 0.00000015, cachedInput: 0.000000075, output: 0.0000006 }, // GPT-4o-mini pricing with cached
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },

  // Latest models (as of 2025)
  'gpt-4.1': {
    textTokens: { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 }, // $2.00 input, $0.50 cached, $8.00 output per 1M tokens
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.1-2025-04-14': {
    textTokens: { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 }, // Same as gpt-4.1
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.1-mini': {
    textTokens: { input: 0.0000004, cachedInput: 0.0000001, output: 0.0000016 }, // $0.40 input, $0.10 cached, $1.60 output per 1M tokens
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.1-mini-2025-04-14': {
    textTokens: { input: 0.0000004, cachedInput: 0.0000001, output: 0.0000016 }, // Same as gpt-4.1-mini
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.1-nano': {
    textTokens: { input: 0.0000001, cachedInput: 0.000000025, output: 0.0000004 }, // $0.10 input, $0.025 cached, $0.40 output per 1M tokens
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.1-nano-2025-04-14': {
    textTokens: { input: 0.0000001, cachedInput: 0.000000025, output: 0.0000004 }, // Same as gpt-4.1-nano
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.5-preview': {
    textTokens: { input: 0.000075, cachedInput: 0.0000375, output: 0.00015 }, // $75.00 input, $37.50 cached, $150.00 output per 1M tokens
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
  'gpt-4.5-preview-2025-02-27': {
    textTokens: { input: 0.000075, cachedInput: 0.0000375, output: 0.00015 }, // Same as gpt-4.5-preview
    audioTokens: { input: 0, output: 0 },
    estimatedCostPerMinute: 0,
  },
}
