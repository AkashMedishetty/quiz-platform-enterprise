export interface Question {
  id: string;
  question: string;
  options: string[];
  optionImages?: string[]; // Base64 images for each option
  correctAnswer: number;
  timeLimit?: number;
  points?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  orderIndex: number;
  imageUrl?: string; // Base64 image for the question
  image_url?: string; // Database field name
  option_images?: string[]; // Database field name
}

export interface Participant {
  id: string;
  name: string;
  mobile: string;
  institute: string;
  score: number;
  answers: { [questionId: string]: ParticipantAnswer };
  joinedAt: number;
  avatarColor?: string;
  streak: number;
  badges: string[];
  lastSeen: string;
}

export interface ParticipantAnswer {
  answerIndex: number;
  timeToAnswer: number;
  isCorrect: boolean;
  pointsEarned: number;
  answeredAt: string;
}

export interface QuizState {
  id?: string;
  questions: Question[];
  currentQuestionIndex: number;
  isActive: boolean;
  isFinished: boolean;
  participants: Participant[];
  showResults: boolean;
  quizSettings: QuizSettings;
  currentQuestionStartTime?: number;
  statistics: QuizStatistics;
  hostId?: string;
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