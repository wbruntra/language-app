module.exports = {
  hashPrefixes: {},
  languages: {
    spanish: {
      name: 'Spanish',
      nativeName: 'español',
      isoCode: 'es',
      level: 'intermediate Spanish',
      ttsVoice: 'nova', // Female voice that works well with Spanish
    },
    french: {
      name: 'French',
      nativeName: 'français',
      isoCode: 'fr',
      level: 'intermediate French',
      ttsVoice: 'alloy', // Neutral voice
    },
    german: {
      name: 'German',
      nativeName: 'Deutsch',
      isoCode: 'de',
      level: 'intermediate German',
      ttsVoice: 'echo', // Male voice
    },
    italian: {
      name: 'Italian',
      nativeName: 'italiano',
      isoCode: 'it',
      level: 'intermediate Italian',
      ttsVoice: 'fable', // British accent, good for Italian
    },
    portuguese: {
      name: 'Portuguese',
      nativeName: 'português',
      isoCode: 'pt',
      level: 'intermediate Portuguese',
      ttsVoice: 'nova', // Female voice
    },
    english: {
      name: 'English',
      nativeName: 'English',
      isoCode: 'en',
      level: 'intermediate English',
      ttsVoice: 'alloy', // Default neutral voice
    },
    'auto-detect': {
      name: 'Auto-detect',
      nativeName: 'Auto-detect',
      isoCode: null, // Special case for auto-detection
      level: 'auto-detect',
      ttsVoice: 'alloy', // Default voice for auto-detect
    },
  },
}
