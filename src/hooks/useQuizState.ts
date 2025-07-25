import { useState, useEffect, useCallback, useMemo } from 'react';
import { QuizState, Participant, Question, QuizSettings, ParticipantAnswer, QuizStatistics } from '../types';
import { debounce } from 'lodash';

const STORAGE_KEY = 'quiz-state';

const defaultSettings: QuizSettings = {
  title: 'Purplehat Events Quiz',
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

// Debounced version of localStorage.setItem
const saveToLocalStorage = debounce((state: QuizState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, 500);

export const useQuizState = () => {
  // Split state into smaller, more focused pieces
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizSettings, setQuizSettingsState] = useState<QuizSettings>(defaultSettings);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        if (parsed.questions) setQuestions(parsed.questions);
        if (parsed.currentQuestionIndex !== undefined) setCurrentQuestionIndex(parsed.currentQuestionIndex);
        if (parsed.isActive !== undefined) setIsActive(parsed.isActive);
        if (parsed.isFinished !== undefined) setIsFinished(parsed.isFinished);
        if (parsed.participants) setParticipants(parsed.participants);
        if (parsed.showResults !== undefined) setShowResults(parsed.showResults);
        if (parsed.quizSettings) setQuizSettingsState(parsed.quizSettings);
      } catch (error) {
        console.error('Error parsing saved quiz state:', error);
      }
    }
  }, []);

  // Helper function to calculate statistics - moved to top to avoid usage before declaration
  const calculateStatistics = useCallback((participants: Participant[], totalQuestions: number): QuizStatistics => {
    const totalParticipants = participants.length;
    const totalScore = participants.reduce((sum, p) => sum + p.score, 0);
    const averageScore = totalParticipants > 0 ? totalScore / totalParticipants : 0;
    const questionsAnswered = participants.reduce((sum, p) => sum + Object.keys(p.answers).length, 0);
    
    // Calculate completion rate based on how many questions have been answered by participants
    const totalPossibleAnswers = totalParticipants * totalQuestions;
    const completionRate = totalPossibleAnswers > 0 
      ? (questionsAnswered / totalPossibleAnswers) * 100 
      : 0;
    
    return {
      totalParticipants,
      averageScore,
      questionsAnswered,
      averageTimePerQuestion: 0, // This would need to be calculated based on actual timing data
      participationRate: totalParticipants > 0 ? (questionsAnswered / (totalParticipants * Math.max(1, totalQuestions))) * 100 : 0,
      completionRate,
    };
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    const state: QuizState = {
      questions,
      currentQuestionIndex,
      isActive,
      isFinished,
      participants,
      showResults,
      quizSettings,
      statistics: calculateStatistics(participants, questions.length),
    };
    saveToLocalStorage(state);
  }, [questions, currentQuestionIndex, isActive, isFinished, participants, showResults, quizSettings, calculateStatistics]);

  // Memoized full state to prevent unnecessary re-renders
  const quizState = useMemo<QuizState>(() => ({
    questions,
    currentQuestionIndex,
    isActive,
    isFinished,
    participants,
    showResults,
    quizSettings,
    statistics: calculateStatistics(participants, questions.length),
  }), [questions, currentQuestionIndex, isActive, isFinished, participants, showResults, quizSettings]);

  // Update multiple state properties at once
  const updateQuizState = useCallback((newState: Partial<QuizState>) => {
    if (newState.questions !== undefined) setQuestions(newState.questions);
    if (newState.currentQuestionIndex !== undefined) setCurrentQuestionIndex(newState.currentQuestionIndex);
    if (newState.isActive !== undefined) setIsActive(newState.isActive);
    if (newState.isFinished !== undefined) setIsFinished(newState.isFinished);
    if (newState.participants !== undefined) setParticipants(newState.participants);
    if (newState.showResults !== undefined) setShowResults(newState.showResults);
    if (newState.quizSettings !== undefined) setQuizSettingsState(newState.quizSettings);
  }, []);



  const updateQuizSettings = useCallback((newSettings: Partial<QuizSettings>) => {
    setQuizSettingsState(prev => ({
      ...prev,
      ...newSettings
    }));
  }, []);

  const addParticipant = useCallback((name: string, mobile: string = ''): string => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const participant: Participant = {
      id,
      name,
      mobile,
      score: 0,
      answers: {},
      joinedAt: Date.now(),
      streak: 0,
      badges: [],
      lastSeen: now,
    };
    
    setParticipants(prev => [...prev, participant]);
    return id;
  }, []);

  const calculatePoints = useCallback((isCorrect: boolean, timeToAnswer: number, timeLimit: number, basePoints: number, streak: number, settings: QuizSettings): number => {
    // Simple right/wrong scoring - no time-based or streak bonuses
    return isCorrect ? basePoints : 0;
  }, []);

  const submitAnswer = useCallback((participantId: string, questionId: string, answerIndex: number, timeToAnswer: number) => {
    setParticipants(prevParticipants => {
      return prevParticipants.map(p => {
        if (p.id !== participantId) return p;
        
        const question = questions.find(q => q.id === questionId);
        const isCorrect = question ? question.correctAnswer === answerIndex : false;
        const basePoints = question?.points || quizSettings.pointsPerQuestion;
        const timeLimit = question?.timeLimit || quizSettings.defaultTimeLimit;
        
        const newStreak = isCorrect ? p.streak + 1 : 0;
        const pointsEarned = calculatePoints(isCorrect, timeToAnswer, timeLimit, basePoints, p.streak, quizSettings);
        
        const answer: ParticipantAnswer = {
          answerIndex,
          timeToAnswer,
          isCorrect,
          pointsEarned,
          answeredAt: new Date().toISOString(),
        };
        
        // Award badges
        const newBadges = [...p.badges];
        if (newStreak === 3 && !newBadges.includes('streak-3')) {
          newBadges.push('streak-3');
        }
        if (newStreak === 5 && !newBadges.includes('streak-5')) {
          newBadges.push('streak-5');
        }
        if (timeToAnswer < 5 && isCorrect && !newBadges.includes('speed-demon')) {
          newBadges.push('speed-demon');
        }
        
        return {
          ...p,
          answers: { ...p.answers, [questionId]: answer },
          score: p.score + pointsEarned,
          streak: newStreak,
          badges: newBadges,
        };
      });
    });
  }, [questions, quizSettings, calculatePoints]);

  const startQuestion = useCallback((questionIndex: number) => {
    setCurrentQuestionIndex(questionIndex);
    setShowResults(false);
    // Note: currentQuestionStartTime is now managed separately if needed
  }, []);

  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setCurrentQuestionIndex(-1);
    setIsActive(false);
    setIsFinished(false);
    setParticipants([]);
    setShowResults(false);
    setQuizSettingsState(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportResults = useCallback(() => {
    const results = {
      quiz: quizSettings,
      participants,
      questions,
      statistics: calculateStatistics(participants, questions.length),
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [participants, questions, quizSettings, calculateStatistics]);

  // Memoize the API to prevent unnecessary re-renders
  const api = useMemo(() => ({
    quizState,
    updateQuizState,
    updateQuizSettings,
    addParticipant,
    submitAnswer,
    startQuestion,
    resetQuiz,
    exportResults,
  }), [
    quizState,
    updateQuizState,
    updateQuizSettings,
    addParticipant,
    submitAnswer,
    startQuestion,
    resetQuiz,
    exportResults,
  ]);

  return api;
};