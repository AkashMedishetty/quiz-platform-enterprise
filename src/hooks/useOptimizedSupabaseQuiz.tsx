import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Question, QuizState, QuizSettings, Participant } from '../types';
import { optimizedSync, QuizStateUpdate } from '../lib/optimizedRealtimeSync';

// Optimized caching with TTL
const quizDataCache = new Map<string, { data: QuizState; timestamp: number; ttl: number }>();
const DEFAULT_CACHE_TTL = 10000; // 10 seconds
const LOADING_DEBOUNCE = 300; // 300ms debounce
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

interface UseOptimizedSupabaseQuizReturn {
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

export const useOptimizedSupabaseQuiz = (sessionId: string): UseOptimizedSupabaseQuizReturn => {
  // Skip hook execution if sessionId is invalid
  const shouldSkip = !sessionId || sessionId === 'skip' || sessionId === '';

  // Use refs to prevent stale closures and unnecessary re-renders
  const sessionIdRef = useRef(sessionId);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Default quiz state
  const defaultQuizState: QuizState = useMemo(() => ({
    questions: [],
    participants: [],
    currentQuestionIndex: -1,
    currentQuestionStartTime: undefined,
    isActive: false,
    isFinished: false,
    showResults: false,
    quizSettings: {
      title: 'New Quiz',
      description: '',
      defaultTimeLimit: 30,
      pointsPerQuestion: 100,
      speedBonus: false,
      streakBonus: true,
      showLeaderboardDuringQuiz: true,
      allowLateJoining: true,
      shuffleQuestions: false,
      shuffleAnswers: false,
      maxParticipants: 100,
      requireApproval: false,
    },
    statistics: {
      totalParticipants: 0,
      averageScore: 0,
      questionsAnswered: 0,
      averageTimePerQuestion: 0,
      participationRate: 0,
      completionRate: 0,
    },
  }), []);

  const [quizState, setQuizState] = useState<QuizState>(defaultQuizState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Debounced loading setter to prevent flickering
  const setLoadingDebounced = useCallback((isLoading: boolean) => {
    if (loadingDebounceRef.current) {
      clearTimeout(loadingDebounceRef.current);
    }

    if (isLoading) {
      setLoading(true);
    } else {
      loadingDebounceRef.current = setTimeout(() => {
        setLoading(false);
      }, LOADING_DEBOUNCE);
    }
  }, []);

  // Optimized cache management
  const getCachedData = useCallback((sessionId: string): QuizState | null => {
    const cached = quizDataCache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((sessionId: string, data: QuizState, ttl: number = DEFAULT_CACHE_TTL) => {
    quizDataCache.set(sessionId, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  // Optimized data loading with proper error handling
  const loadQuizData = useCallback(async (useCache: boolean = true): Promise<void> => {
    if (shouldSkip) return;

    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) return;

    // Check cache first
    if (useCache) {
      const cachedData = getCachedData(currentSessionId);
      if (cachedData) {
        setQuizState(cachedData);
        setError(null);
        return;
      }
    }

    try {
      setLoadingDebounced(true);
      setError(null);

      // Load session data
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('id, title, description, host_id, access_code, is_active, is_finished, current_question_index, current_question_start_time, show_results, settings, created_at, updated_at')
        .eq('id', currentSessionId)
        .single();

      if (sessionError) throw sessionError;

      // Load questions and participants in parallel with error isolation
      const [questionsResult, participantsResult] = await Promise.allSettled([
        supabase
          .from('quiz_questions')
          .select('id, question, options, correct_answer, time_limit, points, category, difficulty, order_index, image_url')
          .eq('quiz_session_id', currentSessionId)
          .order('order_index', { ascending: true }),
        supabase
          .from('quiz_participants')
          .select('id, name, mobile, score, streak, badges, avatar_color, joined_at, last_seen')
          .eq('quiz_session_id', currentSessionId)
          .order('score', { ascending: false })
      ]);

      // Handle results with graceful degradation
      const questions = questionsResult.status === 'fulfilled' && !questionsResult.value.error 
        ? questionsResult.value.data || [] 
        : [];
      
      const participants = participantsResult.status === 'fulfilled' && !participantsResult.value.error 
        ? participantsResult.value.data || [] 
        : [];

      // Log any errors but don't fail completely
      if (questionsResult.status === 'rejected') {
        console.warn('[QUIZ] Questions load failed:', questionsResult.reason);
      }
      if (participantsResult.status === 'rejected') {
        console.warn('[QUIZ] Participants load failed:', participantsResult.reason);
      }

      // Process data efficiently
      const processedParticipants: Participant[] = participants.map((p: any) => ({
        id: p.id,
        name: p.name,
        mobile: p.mobile,
        score: p.score || 0,
        streak: p.streak || 0,
        badges: p.badges || [],
        avatarColor: p.avatar_color || 'bg-gradient-to-r from-blue-400 to-purple-400',
        joinedAt: new Date(p.joined_at).getTime(),
        lastSeen: p.last_seen,
        answers: {} // Load separately when needed for performance
      }));

      const processedQuestions: Question[] = questions.map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit || 30,
        points: q.points || 100,
        category: q.category,
        difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
        orderIndex: q.order_index,
        imageUrl: q.image_url || undefined,
        optionImages: q.option_images || undefined,
      }));

      // Calculate statistics
      const totalParticipants = processedParticipants.length;
      const averageScore = totalParticipants > 0 
        ? processedParticipants.reduce((sum, p) => sum + p.score, 0) / totalParticipants 
        : 0;

      const newState: QuizState = {
        id: session.id,
        questions: processedQuestions,
        participants: processedParticipants,
        currentQuestionIndex: session.current_question_index ?? -1,
        currentQuestionStartTime: session.current_question_start_time 
          ? new Date(session.current_question_start_time).getTime() 
          : undefined,
        isActive: session.is_active || false,
        isFinished: session.is_finished || false,
        showResults: session.show_results || false,
        accessCode: session.access_code || '',
        quizSettings: {
          ...defaultQuizState.quizSettings,
          title: session.title || 'New Quiz',
          description: session.description || '',
          ...(session.settings || {}),
        },
        statistics: {
          totalParticipants,
          averageScore,
          questionsAnswered: 0, // This would need proper calculation
          averageTimePerQuestion: 0,
          participationRate: processedQuestions.length > 0 && totalParticipants > 0
            ? (processedParticipants.reduce((sum, p) => sum + Object.keys(p.answers).length, 0) / (processedQuestions.length * totalParticipants)) * 100
            : 0,
          completionRate: 0,
        },
      } as any; // Type assertion to handle accessCode field

      setQuizState(newState);
      setCachedData(currentSessionId, newState);

    } catch (err) {
      console.error('[QUIZ] Error loading quiz data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz data');
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionIdRef, getCachedData, setCachedData, setLoadingDebounced, defaultQuizState]);

  // Handle real-time updates - Use useRef to avoid circular dependencies
  const handleRealtimeUpdateRef = useRef<(update: QuizStateUpdate) => void>();
  
  // Setup the real-time update handler
  useEffect(() => {
    handleRealtimeUpdateRef.current = (update: QuizStateUpdate) => {
      console.log('[QUIZ] Received real-time update:', update.type);
      
      // CRITICAL: Only reload for meaningful updates, ignore participant spam
      if (update.type === 'PARTICIPANT_UPDATE') {
        console.log('[QUIZ] Ignoring PARTICIPANT_UPDATE to prevent infinite loop');
        return;
      }
      
      // Invalidate cache for this session
      quizDataCache.delete(sessionIdRef.current);
      
      // Reload data
      loadQuizData(false); // Don't use cache
    };
  }, [loadQuizData]);

  // Setup real-time subscription
  useEffect(() => {
    if (shouldSkip) return;

    sessionIdRef.current = sessionId;
    console.log('[QUIZ] Setting up subscription for session:', sessionId);

    // Initial data load
    loadQuizData(true);

    // Setup real-time subscription with stable callback
    const handleUpdate = (update: QuizStateUpdate) => {
      if (handleRealtimeUpdateRef.current) {
        handleRealtimeUpdateRef.current(update);
      }
    };

    const unsubscribe = optimizedSync.subscribe(sessionId, handleUpdate, 'host');
    unsubscribeRef.current = unsubscribe;

    // Monitor connection status
    const connectionInterval = setInterval(() => {
      const connected = optimizedSync.getConnectionStatus(sessionId);
      setIsConnected(connected);
    }, 5000);

    // Cleanup function
    return () => {
      console.log('[QUIZ] Cleaning up subscription for session:', sessionId);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      clearInterval(connectionInterval);
    };
  }, [sessionId, shouldSkip]); // Removed circular dependencies

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      if (loadingDebounceRef.current) {
        clearTimeout(loadingDebounceRef.current);
      }
    };
  }, []);

  // Quiz action methods with optimized error handling
  const addQuestion = useCallback(async (questionData: Omit<Question, 'id' | 'orderIndex'>) => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      const orderIndex = quizState.questions.length;
      const { error } = await supabase
        .from('quiz_questions')
        .insert({
          quiz_session_id: sessionId,
          question: questionData.question,
          options: questionData.options,
          correct_answer: questionData.correctAnswer,
          time_limit: questionData.timeLimit || 30,
          points: questionData.points || 100,
          category: questionData.category || null,
          difficulty: questionData.difficulty || 'medium',
          order_index: orderIndex,
          image_url: questionData.imageUrl || null,
          option_images: questionData.optionImages || null,
        });

      if (error) throw error;

      // Reload data to get the new question
      await loadQuizData(false);
    } catch (err) {
      console.error('[QUIZ] Error adding question:', err);
      setError(err instanceof Error ? err.message : 'Failed to add question');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, quizState.questions.length, loadQuizData, setLoadingDebounced]);

  const startQuestion = useCallback(async (index: number) => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      // Bounds checking to prevent invalid question indices
      const totalQuestions = quizState?.questions?.length || 0;
      if (index < 0 || index >= totalQuestions) {
        console.warn(`[QUIZ] Invalid question index ${index}. Total questions: ${totalQuestions}`);
        throw new Error(`Invalid question index ${index}. Total questions: ${totalQuestions}`);
      }

      console.log(`[QUIZ] Starting question ${index + 1} of ${totalQuestions}`);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          current_question_index: index,
          current_question_start_time: new Date().toISOString(),
          show_results: false,
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (err) {
      console.error('[QUIZ] Error starting question:', err);
      setError(err instanceof Error ? err.message : 'Failed to start question');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced, quizState?.questions?.length]);

  const showResults = useCallback(async () => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ show_results: true })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (err) {
      console.error('[QUIZ] Error showing results:', err);
      setError(err instanceof Error ? err.message : 'Failed to show results');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced]);

  const makeLive = useCallback(async () => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);
      console.log('[QUIZ] Making quiz live...');

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ is_active: true })
        .eq('id', sessionId);

      if (error) throw error;

      console.log('✅ [QUIZ] Quiz is now live');
      
      // Clear cache to force refresh
      quizDataCache.delete(sessionId);
      
      // Update state immediately
      const currentState = quizState;
      if (currentState) {
        const newState = {
          ...currentState,
          isActive: true,
        };
        setQuizState(newState);
        
        // Update cache with new state
        quizDataCache.set(sessionId, { data: newState, timestamp: Date.now(), ttl: DEFAULT_CACHE_TTL });
      }
      
      // Trigger real-time update by updating the database timestamp
      await supabase
        .from('quiz_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      // Also reload data to ensure consistency
      await loadQuizData(false);
      
    } catch (err) {
      console.error('[QUIZ] Error making quiz live:', err);
      setError(err instanceof Error ? err.message : 'Failed to make quiz live');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced, quizState, setQuizState, loadQuizData]);

  const startQuiz = useCallback(async () => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          is_active: true,
          current_question_index: 0,
          current_question_start_time: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (err) {
      console.error('[QUIZ] Error starting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced]);

  const finishQuiz = useCallback(async () => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          is_finished: true,
          show_results: true,
        })
        .eq('id', sessionId);

      if (error) throw error;
    } catch (err) {
      console.error('[QUIZ] Error finishing quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to finish quiz');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced]);

  const updateQuizSettings = useCallback(async (settings: Partial<QuizSettings>) => {
    if (shouldSkip) return;

    try {
      setLoadingDebounced(true);
      setError(null);

      const updateData: any = {};
      if (settings.title !== undefined) updateData.title = settings.title;
      if (settings.description !== undefined) updateData.description = settings.description;
      
      const { error } = await supabase
        .from('quiz_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) throw error;

      // Clear cache to force refresh across all components
      quizDataCache.delete(sessionId);

      // Update local state immediately for better UX
      setQuizState(prev => ({
        ...prev,
        quizSettings: { ...prev.quizSettings, ...settings }
      }));

      // Trigger real-time sync to notify other components by updating session
      console.log('[QUIZ] Triggering sync update for settings change');
      
      // Force a session update to trigger real-time sync across all components
      // This will automatically notify BigScreen and other connected components
      const { error: syncError } = await supabase
        .from('quiz_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);
      
      if (!syncError) {
        console.log('[QUIZ] Settings sync update broadcasted successfully');
      }
      
      // Reload data to get fresh state
      setTimeout(() => {
        loadQuizData(false); // Don't use cache
      }, 200);

    } catch (err) {
      console.error('[QUIZ] Error updating settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    } finally {
      setLoadingDebounced(false);
    }
  }, [shouldSkip, sessionId, setLoadingDebounced, loadQuizData]);

  const forceRefresh = useCallback(async () => {
    if (shouldSkip) return;
    
    // Clear cache and reload
    quizDataCache.delete(sessionId);
    await loadQuizData(false);
  }, [shouldSkip, sessionId, loadQuizData]);

  return {
    quizState,
    loading,
    error,
    addQuestion,
    startQuestion,
    showResults,
    makeLive,
    startQuiz,
    finishQuiz,
    updateQuizSettings,
    forceRefresh,
    isConnected,
  };
}; 