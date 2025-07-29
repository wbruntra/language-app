/**
 * Mock responses for OpenAI vocabulary analysis
 * Use these for consistent testing without hitting the live API
 */

// Mock successful analysis responses
const mockAnalysisResponses = {
  // Spanish verb "corriendo" -> "correr"
  corriendo: {
    analysis: {
      baseForm: 'correr',
      partOfSpeech: 'verb', 
      definition: 'to run',
      confidence: 'high'
    },
    usage: {
      prompt_tokens: 85,
      completion_tokens: 25,
      total_tokens: 110
    },
    cost: 0.000165
  },

  // Spanish noun "libros" -> "libro"
  libros: {
    analysis: {
      baseForm: 'libro',
      partOfSpeech: 'noun',
      definition: 'book',
      confidence: 'high'
    },
    usage: {
      prompt_tokens: 78,
      completion_tokens: 22,
      total_tokens: 100
    },
    cost: 0.00015
  },

  // French adjective "belle" -> "beau/belle"
  belle: {
    analysis: {
      baseForm: 'beau',
      partOfSpeech: 'adjective',
      definition: 'beautiful',
      confidence: 'high'
    },
    usage: {
      prompt_tokens: 82,
      completion_tokens: 28,
      total_tokens: 110
    },
    cost: 0.000165
  },

  // Challenging/ambiguous word
  banco: {
    analysis: {
      baseForm: 'banco',
      partOfSpeech: 'noun',
      definition: 'bank/bench',
      confidence: 'medium'
    },
    usage: {
      prompt_tokens: 90,
      completion_tokens: 30,
      total_tokens: 120
    },
    cost: 0.00018
  }
}

// Mock error responses
const mockErrorResponses = {
  apiError: {
    analysis: {
      baseForm: 'unknown',
      partOfSpeech: 'unknown',
      definition: 'Unable to analyze',
      confidence: 'low'
    },
    usage: null,
    cost: 0,
    error: 'OpenAI API rate limit exceeded'
  },

  invalidResponse: {
    analysis: {
      baseForm: 'unknown',
      partOfSpeech: 'unknown', 
      definition: 'Unable to analyze',
      confidence: 'low'
    },
    usage: null,
    cost: 0,
    error: 'Invalid response format from OpenAI'
  }
}

// Function to get mock response based on word
function getMockAnalysis(word, shouldError = false) {
  if (shouldError) {
    return mockErrorResponses.apiError
  }

  const normalizedWord = word.toLowerCase()
  return mockAnalysisResponses[normalizedWord] || {
    analysis: {
      baseForm: word,
      partOfSpeech: 'unknown',
      definition: 'Mock definition',
      confidence: 'medium'
    },
    usage: {
      prompt_tokens: 80,
      completion_tokens: 25,
      total_tokens: 105
    },
    cost: 0.0001575
  }
}

// Mock OpenAI API response structure
function createMockOpenAIResponse(word) {
  const mockResponse = getMockAnalysis(word)
  
  return {
    choices: [{
      message: {
        content: JSON.stringify(mockResponse.analysis)
      }
    }],
    usage: mockResponse.usage
  }
}

module.exports = {
  mockAnalysisResponses,
  mockErrorResponses,
  getMockAnalysis,
  createMockOpenAIResponse
}
