// Database types based on actual Supabase schema
export interface DatabaseHostAuth {
  id: string;
  host_id: string;
  password_hash: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DatabaseHostSession {
  id: string;
  host_id: string;
  session_token: string;
  quiz_session_id: string | null;
  expires_at: string;
  created_at: string;
}

export interface DatabaseQuestion {
  id: string;
  quiz_session_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  time_limit: number;
  points: number;
  category: string | null;
  difficulty: string;
  order_index: number;
  image_url: string | null;
  option_images: string[] | null;
  created_at: string;
}

export interface DatabaseParticipant {
  id: string;
  quiz_session_id: string;
  name: string;
  mobile: string;
  institute: string;
  score: number;
  streak: number;
  badges: string[];
  avatar_color: string;
  joined_at: string;
  last_seen: string;
}

export interface DatabaseQuizSession {
  id: string;
  title: string;
  description: string;
  host_id: string;
  access_code: string | null;
  is_active: boolean;
  is_finished: boolean;
  current_question_index: number;
  current_question_start_time: string | null;
  show_results: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  template_id: string | null;
  scheduled_start_time: string | null;
}

export interface DatabaseAnswer {
  id: string;
  quiz_session_id: string;
  participant_id: string;
  question_id: string;
  answer_index: number;
  is_correct: boolean;
  time_to_answer: number;
  points_earned: number;
  answered_at: string;
}

export interface DatabaseQuizTemplate {
  id: string;
  title: string;
  description: string;
  created_by: string;
  is_public: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTemplateQuestion {
  id: string;
  template_id: string;
  question: string;
  options: string[];
  correct_answer: number;
  time_limit: number;
  points: number;
  category: string | null;
  difficulty: string;
  order_index: number;
  image_url: string | null;
  created_at: string;
}

// Application types (cleaned up versions)
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  question: string;
  options: string[];
  optionImages?: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  category?: string;
  difficulty: QuestionDifficulty;
  orderIndex: number;
  imageUrl?: string;
}

export interface ParticipantAnswer {
  answerIndex: number;
  timeToAnswer: number;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}

export interface Participant {
  id: string;
  name: string;
  mobile: string;
  institute: string;
  score: number;
  answers: Record<string, ParticipantAnswer>;
  joinedAt: number;
  avatarColor: string;
  streak: number;
  badges: string[];
  lastSeen: string;
}

export interface QuizSettings {
  title: string;
  description: string;
  defaultTimeLimit: number;
  pointsPerQuestion: number;
  speedBonus: boolean;
  streakBonus: boolean;
  showLeaderboardDuringQuiz: boolean;
  allowLateJoining: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  maxParticipants: number;
  requireApproval: boolean;
}

export interface QuizStatistics {
  totalParticipants: number;
  averageScore: number;
  questionsAnswered: number;
  averageTimePerQuestion: number;
  participationRate: number;
  completionRate: number;
}

export interface QuizState {
  id?: string;
  questions: Question[];
  currentQuestionIndex: number;
  isActive: boolean;
  isFinished: boolean;
  participants: Participant[];
  showResults: boolean;
  accessCode?: string;
  quizSettings: QuizSettings;
  currentQuestionStartTime?: number;
  statistics: QuizStatistics;
  hostId?: string;
}

export interface QuizAnswer {
  participantId: string;
  questionId: string;
  answerIndex: number;
  isCorrect: boolean;
  timeToAnswer: number;
  pointsEarned: number;
}

export interface QuizSession {
  id: string;
  title: string;
  description: string;
  displayCode: string;
  hostId: string;
  isActive: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
  currentQuestionStartTime: string | null;
  showResults: boolean;
  settings: QuizSettings;
  createdAt: string;
  updatedAt: string;
}

// Template types
export interface QuizTemplate {
  id: string;
  title: string;
  description: string;
  created_by: string;
  is_public: boolean;
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
  questions: Question[];
}

// Real-time sync types
export type QuizUpdateType = 
  | 'START_QUIZ' 
  | 'START_QUESTION' 
  | 'SHOW_RESULTS' 
  | 'FINISH_QUIZ' 
  | 'PARTICIPANT_UPDATE' 
  | 'QUESTION_ADDED'
  | 'LEADERBOARD_UPDATE';

export interface QuizStateUpdate {
  type: QuizUpdateType;
  sessionId: string;
  questionIndex?: number;
  timestamp: number;
  data?: Record<string, unknown>;
}

export type ClientType = 'host' | 'participant' | 'bigscreen';

// Component prop types
export interface QuestionFormData {
  question: string;
  options: string[];
  optionImages: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  category: string;
  difficulty: QuestionDifficulty;
  imageUrl: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

// Hook return types
export interface UseQuizStateReturn {
  quizState: QuizState;
  loading: boolean;
  error: string | null;
  addQuestion: (question: Omit<Question, 'id' | 'orderIndex'>) => Promise<void>;
  startQuestion: (index: number) => Promise<void>;
  showResults: () => Promise<void>;
  makeLive: () => Promise<void>;
  startQuiz: () => Promise<void>;
  finishQuiz: () => Promise<void>;
  updateQuizSettings: (settings: Partial<QuizSettings>) => Promise<void>;
  forceRefresh: () => Promise<void>;
  isConnected: boolean;
}

export interface UseQuizTemplatesReturn {
  templates: QuizTemplate[];
  loading: boolean;
  error: string | null;
  saveTemplate: (
    title: string,
    description: string,
    questions: Question[],
    settings: QuizSettings,
    isPublic?: boolean
  ) => Promise<string | null>;
  createSessionFromTemplate: (templateId: string) => Promise<string>;
  deleteTemplate: (templateId: string) => Promise<void>;
  generateReadableSessionId: () => string;
}

// Utility types
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Event types
export interface QuizEvent {
  type: string;
  sessionId: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

// Component state types
export interface QuizControlsState {
  isActive: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  showResults: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  participant: Participant;
  change?: number; // Position change from last update
}

// Form validation types
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

// Storage types
export interface ParticipantSession {
  sessionId: string;
  participantId: string;
  participantName: string;
  participantMobile: string;
  accessCode: string;
  timestamp: number;
}

// Configuration types
export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  maxFileSize: number;
  cacheTimeout: number;
  heartbeatInterval: number;
  maxRetryAttempts: number;
}

// Type guards
export const isQuestion = (obj: unknown): obj is Question => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Question).id === 'string' &&
    typeof (obj as Question).question === 'string' &&
    Array.isArray((obj as Question).options) &&
    typeof (obj as Question).correctAnswer === 'number'
  );
};

export const isParticipant = (obj: unknown): obj is Participant => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Participant).id === 'string' &&
    typeof (obj as Participant).name === 'string' &&
    typeof (obj as Participant).score === 'number'
  );
};

export const isQuizSettings = (obj: unknown): obj is QuizSettings => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as QuizSettings).title === 'string' &&
    typeof (obj as QuizSettings).defaultTimeLimit === 'number' &&
    typeof (obj as QuizSettings).pointsPerQuestion === 'number'
  );
};

// Constants
export const QUIZ_DIFFICULTIES: QuestionDifficulty[] = ['easy', 'medium', 'hard'];

export const DEFAULT_QUIZ_SETTINGS: QuizSettings = {
  title: 'New Quiz',
  description: 'Interactive quiz powered by Purplehat Events',
  defaultTimeLimit: 30,
  pointsPerQuestion: 100,
  speedBonus: true,
  streakBonus: true,
  showLeaderboardDuringQuiz: true,
  allowLateJoining: true,
  shuffleQuestions: false,
  shuffleAnswers: false,
  maxParticipants: 100,
  requireApproval: false,
};

export const AVATAR_COLORS = [
  'bg-gradient-to-r from-blue-400 to-purple-400',
  'bg-gradient-to-r from-green-400 to-blue-400',
  'bg-gradient-to-r from-purple-400 to-pink-400',
  'bg-gradient-to-r from-yellow-400 to-orange-400',
  'bg-gradient-to-r from-red-400 to-pink-400',
  'bg-gradient-to-r from-indigo-400 to-purple-400',
] as const;

export type AvatarColor = typeof AVATAR_COLORS[number]; 