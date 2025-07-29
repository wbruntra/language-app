# Vocabulary Builder Feature Implementation Plan

## Overview
The vocabulary builder feature will allow users to save vocabulary words in foreign languages and retrieve them later. The system will leverage OpenAI to analyze words and provide grammatical information and base forms.

## Backend Implementation

### 1. OpenAI Integration for Word Analysis

#### New Utility Function: `backend/utils/openAI/analyzeVocabulary.js`
- **Purpose**: Send word + context to OpenAI and get part of speech and base form
- **Input**: 
  - `word`: The foreign language word (possibly inflected)
  - `context`: The sentence containing the word
  - `language`: Target language (e.g., "Spanish", "French")
- **Output**:
  - `partOfSpeech`: noun, verb, adjective, adverb, etc.
  - `baseForm`: Root/lemma form of the word
  - `definition`: Brief definition in English
  - `confidence`: AI confidence level
- **Implementation**: Use structured outputs with OpenAI API

#### OpenAI Prompt Strategy
```
Given a word in [LANGUAGE] and its context sentence, provide:
1. Part of speech (noun, verb, adjective, adverb, preposition, etc.)
2. Base form (infinitive for verbs, singular for nouns, etc.)
3. Brief English definition
4. Confidence level (high/medium/low)

Word: [WORD]
Context: [CONTEXT_SENTENCE]
```

### 2. API Routes

#### Route 1: `POST /api/vocab/analyze`
- **Purpose**: Analyze a word using OpenAI
- **Authentication**: Required (requireAuth middleware)
- **Input Body**:
  ```json
  {
    "word": "corriendo",
    "context": "El niño está corriendo en el parque",
    "language": "Spanish"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "analysis": {
      "word": "corriendo",
      "baseForm": "correr",
      "partOfSpeech": "verb",
      "definition": "to run",
      "confidence": "high"
    }
  }
  ```

#### Route 2: `POST /api/vocab/save`
- **Purpose**: Save analyzed vocabulary word to database
- **Authentication**: Required
- **Input Body**:
  ```json
  {
    "word": "corriendo",
    "baseForm": "correr",
    "language": "Spanish",
    "partOfSpeech": "verb",
    "definition": "to run",
    "context": "El niño está corriendo en el parque",
    "confidence": "high"
  }
  ```
- **Database Storage**: Uses existing `user_vocab_info` table
- **Metadata Structure**:
  ```json
  {
    "baseForm": "correr",
    "partOfSpeech": "verb",
    "definition": "to run",
    "context": "El niño está corriendo en el parque",
    "confidence": "high",
    "originalWord": "corriendo"
  }
  ```

#### Route 3: `GET /api/vocab/:language`
- **Purpose**: Retrieve all vocabulary words for user in specified language
- **Authentication**: Required
- **URL Parameters**: `language` (e.g., "Spanish", "French")
- **Query Parameters**: 
  - `limit` (optional): Number of words to return
  - `offset` (optional): For pagination
  - `sortBy` (optional): "created_at", "word", "baseForm"
  - `sortOrder` (optional): "asc", "desc"
- **Response**:
  ```json
  {
    "success": true,
    "words": [
      {
        "id": "abc123",
        "word": "correr",
        "language": "Spanish",
        "metadata": {
          "baseForm": "correr",
          "partOfSpeech": "verb",
          "definition": "to run",
          "context": "El niño está corriendo en el parque",
          "confidence": "high",
          "originalWord": "corriendo"
        },
        "created_at": "2025-07-29T10:30:00Z",
        "updated_at": "2025-07-29T10:30:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "hasMore": false
  }
  ```

#### Route 4: `DELETE /api/vocab/:id`
- **Purpose**: Delete a vocabulary word
- **Authentication**: Required
- **Security**: Ensure user can only delete their own words

### 3. Backend File Structure
```
backend/
├── routes/
│   └── vocab.js                    # New route file
├── utils/
│   └── openAI/
│       ├── analyzeVocabulary.js    # New OpenAI integration
│       └── index.js                # Export new function
└── tables/
    └── user_vocab_info.js          # Already exists, may need updates
```

### 4. Cost Tracking
- Integrate with existing `ai_usage` table to track OpenAI API costs
- Track vocabulary analysis requests separately from other AI usage

## Frontend Implementation

### 1. New Types (TypeScript)

#### Add to `client/src/types/index.ts`:
```typescript
// Vocabulary types
export interface VocabularyWord {
  id: string;
  word: string;
  language: string;
  metadata: {
    baseForm: string;
    partOfSpeech: string;
    definition: string;
    context: string;
    confidence: 'high' | 'medium' | 'low';
    originalWord: string;
  };
  created_at: string;
  updated_at: string;
}

export interface VocabularyAnalysis {
  word: string;
  baseForm: string;
  partOfSpeech: string;
  definition: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface VocabularyState {
  words: VocabularyWord[];
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  currentAnalysis: VocabularyAnalysis | null;
  total: number;
  hasMore: boolean;
  page: number;
}
```

### 2. Redux State Management

#### New Slice: `client/src/store/vocabularySlice.ts`
- **State**: Vocabulary words, loading states, current analysis
- **Actions**:
  - `analyzeWord` - Call OpenAI analysis
  - `saveWord` - Save word to database
  - `fetchWords` - Load user's vocabulary
  - `deleteWord` - Remove word
  - `clearAnalysis` - Reset current analysis
  - `setPage` - Pagination

### 3. API Service Layer

#### New Service: `client/src/services/vocabularyApi.ts`
- Centralized API calls for vocabulary features
- Error handling and response formatting
- Integration with existing auth headers

### 4. React Components

#### Component 1: `VocabularyAnalyzer.tsx`
- **Purpose**: Analyze new words
- **Features**:
  - Input field for word
  - Input field for context sentence
  - Language selector (reuse existing)
  - "Analyze" button
  - Display analysis results
  - "Save Word" button
- **State**: Uses vocabulary slice

#### Component 2: `VocabularyList.tsx`
- **Purpose**: Display saved vocabulary
- **Features**:
  - Language filter
  - Search/filter functionality
  - Pagination
  - Sort options (date, alphabetical)
  - Delete word functionality
  - Part of speech badges
- **State**: Uses vocabulary slice

#### Component 3: `VocabularyCard.tsx`
- **Purpose**: Individual word display
- **Features**:
  - Word and base form
  - Part of speech badge
  - Definition
  - Context sentence
  - Created date
  - Delete button

#### Component 4: `VocabularyModal.tsx`
- **Purpose**: Quick word addition from transcription
- **Features**:
  - Triggered from transcription interface
  - Pre-fill context from current sentence
  - Quick save workflow

### 5. Integration with Existing Features

#### Transcription Integration
- Add "Save Word" buttons in transcription results
- Pre-populate context from transcription text
- Highlight unknown words for quick vocabulary addition

#### Dashboard Integration
- Add vocabulary section to main dashboard
- Recent words widget
- Vocabulary statistics (words learned per language)

### 6. Frontend File Structure
```
client/src/
├── components/
│   ├── vocabulary/
│   │   ├── VocabularyAnalyzer.tsx
│   │   ├── VocabularyList.tsx
│   │   ├── VocabularyCard.tsx
│   │   └── VocabularyModal.tsx
│   └── Dashboard.tsx               # Update to include vocab
├── store/
│   ├── vocabularySlice.ts          # New slice
│   └── index.ts                    # Update to include vocab
├── services/
│   └── vocabularyApi.ts            # New API service
├── types/
│   └── index.ts                    # Update with vocab types
└── hooks/
    └── useVocabulary.ts            # New custom hook
```

## Implementation Steps

### Phase 1: Backend Foundation
1. Create OpenAI vocabulary analysis utility
2. Create vocabulary routes (`vocab.js`)
3. Update app.js to include vocabulary routes
4. Add cost tracking for vocabulary analysis
5. Write tests for vocabulary endpoints

### Phase 2: Frontend Foundation
1. Add vocabulary types to TypeScript definitions
2. Create vocabulary Redux slice
3. Create vocabulary API service
4. Build basic VocabularyAnalyzer component
5. Build basic VocabularyList component

### Phase 3: Integration
1. Add vocabulary section to Dashboard
2. Integrate with transcription workflow
3. Add vocabulary modal for quick additions
4. Implement search and filtering
5. Add pagination for large vocabulary lists

### Phase 4: Enhancement
1. Export vocabulary functionality
2. Vocabulary practice mode (flashcards)
3. Word frequency tracking
4. Spaced repetition algorithm
5. Vocabulary statistics and insights

## Database Considerations

### Existing Schema
The `user_vocab_info` table is well-suited for this feature:
- `word`: Store the base form
- `language`: Language of the word
- `metadata`: JSON field for analysis results
- `user_id`: Links to user
- Timestamps for tracking

### Potential Schema Updates
Consider adding indexes for performance:
```sql
CREATE INDEX idx_user_vocab_language ON user_vocab_info(user_id, language);
CREATE INDEX idx_user_vocab_word ON user_vocab_info(user_id, word);
```

## Security Considerations
1. Validate user ownership of vocabulary words
2. Rate limiting on OpenAI analysis requests
3. Input sanitization for word and context
4. Prevent injection attacks in database queries

## Performance Considerations
1. Pagination for large vocabulary lists
2. Caching frequently accessed words
3. Debouncing analysis requests
4. Lazy loading of vocabulary data

## Testing Strategy
1. Unit tests for OpenAI analysis utility
2. Integration tests for vocabulary API routes
3. Frontend component testing
4. E2E tests for complete vocabulary workflow
5. Performance testing with large vocabulary lists

## Cost Management
1. Track OpenAI API usage for vocabulary analysis
2. Implement daily/monthly limits per user
3. Cache analysis results to avoid duplicate API calls
4. Consider batch processing for multiple words

This comprehensive plan provides a roadmap for implementing the vocabulary builder feature across both frontend and backend systems, ensuring scalability, security, and user experience.