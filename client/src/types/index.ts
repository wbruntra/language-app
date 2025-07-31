// User types
export interface User {
  id?: string | number;
  email?: string;
  first_name?: string;
  last_name?: string;
  is_admin?: boolean;
  authenticated: boolean;
  [key: string]: any;
}

export interface UserFormData {
  email: string;
  password: string;
  authCode: string;
  firstName: string;
  lastName: string;
}

export interface AuthResponse {
  authenticated: boolean;
  user?: User;
  error?: string;
}

// Language types
export interface Language {
  name: string;
  nativeName: string;
  flag: string;
}

export type LanguageCode = 'spanish' | 'french' | 'german' | 'italian' | 'portuguese' | 'english';

// Conversation types
export interface ConversationEntry {
  id?: string;
  timestamp?: number;
  userText: string;
  correctedText?: string;
  explanation?: string;
  audioUrl?: string;
  type?: 'user' | 'system' | 'correction';
}

export interface Scenario {
  title: string;
  context: string;
  tips: string[];
}

export interface ConversationResult {
  conversationHistory: ConversationEntry[];
  correction: string;
  alternative: string;
  explanation: string;
  audioUrl?: string;
}

export interface ScenarioResult {
  title: string;
  context: string;
  tips: string[];
  conversationHistory: ConversationEntry[];
}

// Follow-up types
export interface FollowupEntry {
  id?: string;
  timestamp?: number;
  question: string;
  answer: string;
  audioUrl?: string;
}

// State types
export interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  formData: UserFormData;
}

export interface LanguageHelperState {
  // Recording
  isRecording: boolean;

  // Transcription state
  transcription: string;
  editedTranscription: string;

  // UI State
  loading: boolean;
  error: string | null;

  // Conversation state
  conversationHistory: ConversationEntry[];
  lastCorrection: string;
  lastAlternative: string;
  lastExplanation: string;
  conversationLoading: boolean;
  correctionExpanded: boolean;

  // TTS (Text-to-Speech) state
  ttsEnabled: boolean;
  lastAudioUrl: string | null;
  isPlayingAudio: boolean;

  // Scenario state
  scenarioLoading: boolean;
  currentScenario: Scenario | null;
  scenarioSuggestion: string;

  // Follow-up question state
  followupHistory: FollowupEntry[];
  followupLoading: boolean;
  showFollowupModal: boolean;
  followupQuestion: string;
  followupTranscription: string;
  isFollowupRecording: boolean;

  // Language configuration
  selectedLanguage: LanguageCode;
  languages: Record<LanguageCode, Language>;
}

export interface RootState {
  user: UserState;
  languageHelper: LanguageHelperState;
  tabooGame: import('../store/tabooGameSlice').TabooGameState;
}

// API types
export interface ApiError {
  error: string;
  status?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  auth_code: string;
  first_name: string;
  last_name: string;
}

// Component props types
export interface AudioVisualizerProps {
  isRecording: boolean;
  audioLevel: number;
}

export interface RecordingControlsProps {
  isRecording: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  disabled?: boolean;
}

export interface TranscriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
}

export interface NavbarProps {
  onLanguageChange: (language: LanguageCode) => void;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Hook types
export interface UseLanguageHelperReturn {
  // Recording functions
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  
  // Transcription functions
  submitTranscription: (text?: string) => Promise<void>;
  
  // TTS functions
  playAudio: (url: string) => Promise<void>;
  stopAudio: () => void;
  
  // Scenario functions
  generateScenario: (suggestion?: string) => Promise<void>;
  
  // Follow-up functions
  submitFollowup: (question: string, answer: string) => Promise<void>;
  
  // State
  audioLevel: number;
  recordingTime: number;
}

export interface UseUserReturn {
  // State
  user: User | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  formData: UserFormData;
  isAuthenticated: boolean;
  authChecked: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: unknown }>;
  register: (userData: Omit<RegisterRequest, 'auth_code' | 'first_name' | 'last_name'> & { authCode: string; firstName: string; lastName: string }) => Promise<{ success: boolean; error?: unknown }>;
  logout: () => Promise<{ success: boolean }>;
  checkAuthStatus: () => any;
  updateFormData: (data: Partial<UserFormData>) => void;
  clearFormData: () => void;
  clearError: () => void;
  clearSuccess: () => void;
  clearUser: () => void;
}
