import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Question, QuizState, QuizSettings, Participant } from '../types';
import { unifiedSync, QuizStateUpdate } from '../lib/realtimeSync';

// Add simple caching to prevent redundant API calls
const quizDataCache = new Map<string, { data: QuizState; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds

export const useSupabaseQuiz = (sessionId: string) => {
  // Skip hook execution if sessionId is invalid
  const shouldSkip = !sessionId || sessionId === 'skip' || sessionId === '';
  
  // Use useRef to ensure we always have the latest state
  const quizStateRef = useRef<QuizState>({
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
      speedBonus: true,
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
  });

  const [quizState, setQuizState] = useState<QuizState>(quizStateRef.current);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update state function with loading management
  const updateQuizState = useCallback((newState: QuizState) => {
    console.log('🎯 [QUIZ] UPDATING STATE:', {
      currentQuestionIndex: newState.currentQuestionIndex,
      isActive: newState.isActive,
      showResults: newState.showResults,
      questionsCount: newState.questions.length
    });
    
    quizStateRef.current = newState;
    setQuizState(newState);
    setError(null); // Clear any previous errors on successful update
  }, []);

  // Load initial quiz data with better loading management
  const loadQuizData = useCallback(async (retryCount = 0) => {
    if (shouldSkip || loadingRef.current) return;
    
    // Prevent multiple calls by debouncing
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }
    
    // Check cache first
    const cached = quizDataCache.get(sessionId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('📊 [QUIZ] Using cached data for session:', sessionId);
      updateQuizState(cached.data);
      return;
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      console.log('📊 [QUIZ] Loading quiz data for session:', sessionId);

      // Removed aggressive loading timeout that was causing "Query timeout" errors
      
      // Load quiz session
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      console.log('✅ [QUIZ] Session loaded:', {
        id: session.id,
        isActive: session.is_active,
        isFinished: session.is_finished,
        currentQuestionIndex: session.current_question_index,
        showResults: session.show_results
      });

      console.log('🔍 [QUIZ] RAW SESSION DATA:', session);
      
      // Load data with better error handling (timeout removed)

      // OPTIMIZED: Load only essential data for faster performance
      const [questionsResult, participantsResult] = await Promise.all([
        supabase
          .from('quiz_questions')
                  .select('id, question, options, correct_answer, time_limit, points, category, difficulty, order_index, image_url')
        .eq('quiz_session_id', sessionId)
          .order('order_index', { ascending: true })
          .limit(20), // Much smaller for faster loading
        supabase
          .from('quiz_participants')
          .select('id, name, mobile, score, streak, badges, avatar_color, joined_at, last_seen')
          .eq('quiz_session_id', sessionId)
          .order('score', { ascending: false })
          .limit(50) // Reduced for performance
      ]);

      // Results already destructured above

      // Handle errors more gracefully
      const questions = questionsResult.error ? [] : (questionsResult.data || []);
      const participants = participantsResult.error ? [] : (participantsResult.data || []);

      // Log any sub-query errors but don't fail completely
      if (questionsResult.error) console.warn('Questions load error:', questionsResult.error);
      if (participantsResult.error) console.warn('Participants load error:', participantsResult.error);

      // OPTIMIZED: Process participants without loading all answers (for speed)
      const processedParticipants: Participant[] = (participants || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        mobile: p.mobile,
        score: p.score || 0,
        streak: p.streak || 0,
        badges: p.badges || [],
        avatarColor: p.avatar_color || 'bg-gradient-to-r from-blue-400 to-purple-400',
        joinedAt: new Date(p.joined_at).getTime(),
        lastSeen: p.last_seen,
        answers: {} // Load answers separately when needed for performance
      }));

      const processedQuestions: Question[] = (questions || []).map((q: any) => ({
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
        image_url: q.image_url || undefined,
                  optionImages: undefined,
      }));

      const newState: QuizState = {
        questions: processedQuestions,
        participants: processedParticipants,
        currentQuestionIndex: session.current_question_index ?? -1,
        currentQuestionStartTime: session.current_question_start_time ? new Date(session.current_question_start_time).getTime() : undefined,
        isActive: session.is_active || false,
        isFinished: session.is_finished || false,
        showResults: session.show_results || false,
        quizSettings: {
          title: session.title || 'New Quiz',
          description: session.description || '',
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
          ...(session.settings || {}),
        },
        statistics: {
          totalParticipants: processedParticipants.length,
          averageScore: processedParticipants.length > 0 
            ? processedParticipants.reduce((sum, p) => sum + p.score, 0) / processedParticipants.length 
            : 0,
          questionsAnswered: processedParticipants.reduce((sum, p) => sum + Object.keys(p.answers).length, 0),
          averageTimePerQuestion: 0, // This would need to be calculated from answers
          participationRate: processedQuestions.length > 0 && processedParticipants.length > 0
            ? (processedParticipants.reduce((sum, p) => sum + Object.keys(p.answers).length, 0) / (processedQuestions.length * processedParticipants.length)) * 100
            : 0,
          completionRate: processedQuestions.length > 0 && processedParticipants.length > 0
            ? (processedParticipants.filter(p => Object.keys(p.answers).length === processedQuestions.length).length / processedParticipants.length) * 100
            : 0,
        },
      };

      console.log('🎯 [QUIZ] NEW STATE CREATED:', {
        currentQuestionIndex: `DB:${session.current_question_index} -> STATE:${newState.currentQuestionIndex}`,
        isActive: newState.isActive,
        showResults: newState.showResults,
        questionsCount: newState.questions.length
      });

      // Cache the data
      quizDataCache.set(sessionId, { data: newState, timestamp: Date.now() });

      updateQuizState(newState);

    } catch (err) {
      console.error('❌ [QUIZ] Error loading quiz data:', err);
      
      // More robust retry logic
      const isNetworkError = err instanceof Error && (
        err.message.includes('Failed to fetch') || 
        err.message.includes('network') ||
        err.message.includes('NetworkError') ||
        err.name === 'TypeError'
      );
      
      if (retryCount < 3 && isNetworkError) {
        console.log(`🔄 [QUIZ] Retrying loadQuizData (attempt ${retryCount + 1}/3)`);
        setTimeout(() => loadQuizData(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quiz data';
      setError(errorMessage);
      console.error('❌ [QUIZ] Final error after retries:', errorMessage);
    } finally {
      // Reset loading state
      loadingRef.current = false;
      setLoading(false);
    }
  }, [sessionId, shouldSkip, updateQuizState]);

  // Setup data loading with real-time sync (FIXED - no loops)
  useEffect(() => {
    if (shouldSkip) return;
    
    console.log('🔄 [QUIZ] Loading initial data for session:', sessionId);
    
    // Load data immediately
    loadQuizData();
    
    // NO REAL-TIME SYNC IN HOOK - causes loops
    // Real-time sync handled in components only
    
  }, [sessionId]); // Only sessionId dependency to prevent loops

  const addQuestion = async (questionData: Omit<Question, 'id' | 'orderIndex'>) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Adding question:', questionData.question);
      
      // OPTIMIZED: Minimal insert for faster performance
      const insertData = {
        quiz_session_id: sessionId,
        question: questionData.question,
        options: questionData.options,
        correct_answer: questionData.correctAnswer,
        time_limit: questionData.timeLimit,
        points: questionData.points,
        category: questionData.category || '',
        difficulty: questionData.difficulty || 'medium',
        order_index: quizStateRef.current.questions.length,
        image_url: questionData.imageUrl || null,
        option_images: questionData.optionImages || null
      };

      // FAST INSERT: Use minimal select for speed
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(insertData)
        .select('id, question, options, correct_answer, time_limit, points, category, difficulty, order_index, image_url')
        .single();

      if (error) {
        console.error('❌ [QUIZ] Database error adding question:', error);
        throw error;
      }

      console.log('✅ [QUIZ] Question added successfully:', data);
      
      // IMMEDIATE UI UPDATE - no waiting for database reload
      const newQuestion: Question = {
        id: data.id,
        question: data.question,
        options: data.options,
        correctAnswer: data.correct_answer,
        timeLimit: data.time_limit,
        points: data.points,
        category: data.category,
        difficulty: data.difficulty as 'easy' | 'medium' | 'hard',
        orderIndex: data.order_index,
        imageUrl: data.image_url || undefined,
        optionImages: undefined,
      };
      
      const newState = {
        ...quizStateRef.current,
        questions: [...quizStateRef.current.questions, newQuestion],
      };
      
      updateQuizState(newState);
      
      // Send real-time update to all participants and components
      await unifiedSync.sendUpdate(sessionId, {
        type: 'QUESTION_ADDED',
        data: { questionCount: newState.questions.length }
      });
      
      console.log('✅ [QUIZ] Question added with real-time sync');
    } catch (err) {
      console.error('❌ [QUIZ] Error adding question:', err);
      setError(err instanceof Error ? err.message : 'Failed to add question');
    } finally {
      setLoading(false);
    }
  };

  const makeLive = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Making quiz live...');

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ is_active: true })
        .eq('id', sessionId);

      if (error) throw error;
      
      console.log('✅ [QUIZ] Quiz is now live');
      
      // Update state immediately
      const newState = {
        ...quizStateRef.current,
        isActive: true,
      };
      
      updateQuizState(newState);
      
      // Send unified sync update
      await unifiedSync.sendUpdate(sessionId, {
        type: 'START_QUIZ',
      });
    } catch (err) {
      console.error('❌ [QUIZ] Error making quiz live:', err);
      setError(err instanceof Error ? err.message : 'Failed to make quiz live');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Starting quiz...');
      
      if (quizStateRef.current.questions.length === 0) {
        throw new Error('Cannot start quiz without questions');
      }

      const startTime = new Date().toISOString();

      console.log('🎯 [QUIZ] UPDATING DATABASE - setting current_question_index to 0');
      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          current_question_index: 0,
          current_question_start_time: startTime,
          show_results: false,
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      console.log('✅ [QUIZ] Quiz started successfully');
      console.log('🎯 [QUIZ] After start - currentQuestionIndex should be 0');
      
      // Update state immediately
      const newState = {
        ...quizStateRef.current,
        currentQuestionIndex: 0,
        currentQuestionStartTime: new Date(startTime).getTime(),
        showResults: false,
      };
      
      updateQuizState(newState);
      
      // Send unified sync update
      await unifiedSync.sendUpdate(sessionId, {
        type: 'START_QUIZ',
        questionIndex: 0,
      });
    } catch (err) {
      console.error('❌ [QUIZ] Error starting quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to start quiz');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startQuestion = async (questionIndex: number) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Starting question', questionIndex + 1);
      
      const startTime = new Date().toISOString();

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          current_question_index: questionIndex,
          current_question_start_time: startTime,
          show_results: false,
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      console.log('✅ [QUIZ] Question started successfully');
      
      // Update state immediately
      const newState = {
        ...quizStateRef.current,
        currentQuestionIndex: questionIndex,
        currentQuestionStartTime: new Date(startTime).getTime(),
        showResults: false,
      };
      
      updateQuizState(newState);
      
      // Send unified sync update
      await unifiedSync.sendUpdate(sessionId, {
        type: 'START_QUESTION',
        questionIndex,
      });
    } catch (err) {
      console.error('❌ [QUIZ] Error starting question:', err);
      setError(err instanceof Error ? err.message : 'Failed to start question');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const showResults = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Showing results...');

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ show_results: true })
        .eq('id', sessionId);

      if (error) throw error;
      
      console.log('✅ [QUIZ] Results shown successfully');
      
      // Update state immediately
      const newState = {
        ...quizStateRef.current,
        showResults: true,
      };
      
      updateQuizState(newState);
      
      // Send unified sync update
      await unifiedSync.sendUpdate(sessionId, {
        type: 'SHOW_RESULTS',
      });
    } catch (err) {
      console.error('❌ [QUIZ] Error showing results:', err);
      setError(err instanceof Error ? err.message : 'Failed to show results');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const finishQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [QUIZ] Finishing quiz...');

      const { error } = await supabase
        .from('quiz_sessions')
        .update({ 
          is_finished: true,
          show_results: true,
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      console.log('✅ [QUIZ] Quiz finished successfully');
      
      // Update state immediately
      const newState = {
        ...quizStateRef.current,
        isFinished: true,
        showResults: true,
      };
      
      updateQuizState(newState);
      
      // Send unified sync update
      await unifiedSync.sendUpdate(sessionId, {
        type: 'FINISH_QUIZ',
      });
    } catch (err) {
      console.error('❌ [QUIZ] Error finishing quiz:', err);
      setError(err instanceof Error ? err.message : 'Failed to finish quiz');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateQuizSettings = useCallback(async (newSettings: Partial<QuizSettings>) => {
    try {
      setLoading(true);
      setError(null);
      const updatedSettings = { ...quizStateRef.current.quizSettings, ...newSettings };

      const { error } = await supabase
        .from('quiz_sessions')
        .update({
          title: updatedSettings.title,
          description: updatedSettings.description,
          settings: updatedSettings,
        })
        .eq('id', sessionId);

      if (error) throw error;
      
      // Update state immediately without triggering reload
      const newState = {
        ...quizStateRef.current,
        quizSettings: updatedSettings,
      };
      
      updateQuizState(newState);
      
      // Update cache to prevent automatic reload that causes redirects
      quizDataCache.set(sessionId, { data: newState, timestamp: Date.now() });
      
      console.log('✅ [QUIZ] Settings updated without reload');
    } catch (err) {
      console.error('❌ [QUIZ] Error updating quiz settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [sessionId, updateQuizState]);

  // Force update function for manual data reload
  const forceUpdate = useCallback(() => {
    console.log('🔄 [QUIZ] Force update triggered');
    if (!loadingRef.current) {
      loadQuizData();
    }
  }, [loadQuizData]);

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
    setLoading,
    forceUpdate,
  };
};
