# Taboo Feature for Language Learners

## Overview
A Taboo-like game feature where users are given an answer word and must describe it while trying to incorporate as many key words as possible. This is the inverse of traditional Taboo - instead of avoiding certain words, users are encouraged to use specific target words.

## Game Flow
1. User is presented with an answer word (e.g., "CAR")
2. User sees translated key words in their target language
3. User provides a spoken/written description of the answer word
4. AI evaluates how many key words were successfully incorporated
5. AI provides feedback and a sample description using all key words
6. Score is calculated based on key words hit and description quality

## Data Structure
Using existing `taboo_words.json` format:
```json
{
  "answer": "CAR",
  "key_words": ["DRIVER", "RED", "RIDE", "TRANSPORT", "FAST"]
}
```

## AI Integration Points

### 1. Translation Service
- **Purpose**: Translate key words to user's target language
- **Input**: Array of English key words + target language
- **Output**: Array of translated key words
- **API Endpoint**: `POST /api/taboo/translate`

### 2. Description Evaluation
- **Purpose**: Analyze user's description to count key word usage
- **Input**: User description + key words (in target language)
- **Output**: 
  - Words found/used
  - Score (0-100)
  - Feedback on description quality
- **API Endpoint**: `POST /api/taboo/evaluate`

### 3. Sample Description Generation
- **Purpose**: Create an example description incorporating all key words
- **Input**: Answer word + key words (in target language)
- **Output**: Well-formed description using all key words naturally
- **API Endpoint**: `POST /api/taboo/generate-example`

## Backend Implementation Plan

### 1. New Utility Module
**File**: `backend/utils/openAI/tabooGameplay.js`
**Functions**:
- `translateKeyWords(keyWords, targetLanguage)`
- `evaluateDescription(description, keyWords, answerWord)`
- `generateSampleDescription(answerWord, keyWords, targetLanguage)`

### 2. New Route Handler
**File**: `backend/routes/taboo.js`
**Endpoints**:
- `GET /api/taboo/cards` - Get available taboo cards
- `POST /api/taboo/translate` - Translate key words
- `POST /api/taboo/evaluate` - Evaluate user description
- `POST /api/taboo/generate-example` - Generate sample description

### 3. Database Considerations
**Option A**: Keep using JSON file (simple, fast iteration)
**Option B**: Migrate to database table for:
- Custom user-generated cards
- Difficulty levels
- Language-specific cards
- User progress tracking

## Frontend Implementation Plan

### 1. New Component Structure
```
src/components/TabooGame/
├── TabooGame.tsx (main container)
├── TabooCard.tsx (displays answer + translated keywords)
├── DescriptionInput.tsx (text/speech input)
├── ScoreDisplay.tsx (shows results)
└── ExampleDescription.tsx (AI-generated example)
```

### 2. Game States
- **Setup**: Select language, difficulty
- **Playing**: Show card, collect description
- **Evaluating**: AI processes description
- **Results**: Show score, words found, example
- **Next**: Move to next card or end game

### 3. Integration with Existing Features
- Use existing audio recording functionality
- Leverage transcription service for speech input
- Integrate with user authentication
- Track progress in user dashboard

## API Specifications

### Translate Keywords
```javascript
POST /api/taboo/translate
{
  "keyWords": ["DRIVER", "RED", "RIDE"],
  "targetLanguage": "es"
}

Response:
{
  "translatedWords": ["CONDUCTOR", "ROJO", "VIAJAR"],
  "originalWords": ["DRIVER", "RED", "RIDE"]
}
```

### Evaluate Description
```javascript
POST /api/taboo/evaluate
{
  "description": "Es un vehículo rojo que necesita un conductor para viajar",
  "keyWords": ["CONDUCTOR", "ROJO", "VIAJAR", "TRANSPORTE", "RÁPIDO"],
  "answerWord": "CAR",
  "targetLanguage": "es"
}

Response:
{
  "wordsFound": ["ROJO", "CONDUCTOR", "VIAJAR"],
  "wordsMissed": ["TRANSPORTE", "RÁPIDO"],
  "score": 60,
  "feedback": "Good description! You used 3 out of 5 key words naturally.",
  "suggestions": ["Try to mention how fast it can go", "Consider describing its purpose for transportation"]
}
```

### Generate Example
```javascript
POST /api/taboo/generate-example
{
  "answerWord": "CAR",
  "keyWords": ["CONDUCTOR", "ROJO", "VIAJAR", "TRANSPORTE", "RÁPIDO"],
  "targetLanguage": "es"
}

Response:
{
  "example": "Es un medio de transporte rojo que necesita un conductor para viajar de manera rápida por las calles.",
  "keyWordsUsed": ["TRANSPORTE", "ROJO", "CONDUCTOR", "VIAJAR", "RÁPIDO"]
}
```

## Scoring System
- **Base Score**: 20 points per key word used (max 100 for 5 words)
- **Bonus Points**: 
  - Natural usage (+5 per word)
  - Creative description (+10)
  - Grammatical correctness (+10)
- **Penalties**:
  - Using the answer word directly (-50)
  - Very short description (<10 words) (-10)

## Future Enhancements
1. **Difficulty Levels**: Easy (3 words), Medium (5 words), Hard (7 words)
2. **Custom Cards**: Users can create their own taboo cards
3. **Multiplayer**: Real-time games with friends
4. **Progress Tracking**: Statistics on words learned, scores achieved
5. **Adaptive Learning**: AI suggests cards based on user's weak vocabulary areas
6. **Voice Recognition**: Real-time feedback during speech
7. **Cultural Context**: Cards specific to different Spanish-speaking regions

## Technical Considerations
1. **Rate Limiting**: Prevent API abuse with reasonable limits
2. **Caching**: Cache translations for common words
3. **Error Handling**: Graceful degradation when AI services are unavailable
4. **Performance**: Optimize for mobile devices
5. **Accessibility**: Support for screen readers and keyboard navigation

## Testing Strategy
1. **Unit Tests**: Individual AI utility functions
2. **Integration Tests**: Full API endpoint flows
3. **E2E Tests**: Complete user journey from card selection to results
4. **Performance Tests**: Response times for AI evaluations
5. **Accessibility Tests**: Screen reader compatibility

## Development Phases

### Phase 1: Core Backend (Current)
- [ ] Create tabooGameplay.js utility
- [ ] Implement basic translation function
- [ ] Create taboo.js route handler
- [ ] Add basic evaluation logic

### Phase 2: AI Enhancement
- [ ] Implement sophisticated description evaluation
- [ ] Add sample description generation
- [ ] Improve scoring algorithm with natural language processing

### Phase 3: Frontend Implementation
- [ ] Create React components
- [ ] Integrate with existing audio/transcription
- [ ] Implement game flow state management
- [ ] Add responsive design

### Phase 4: Polish & Features
- [ ] Add progress tracking
- [ ] Implement difficulty levels
- [ ] Add custom card creation
- [ ] Performance optimization
