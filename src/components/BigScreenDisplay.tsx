import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Users, Clock, Target, Zap, Award, TrendingUp, Activity, CheckCircle, XCircle, Crown, Medal, Star, Play, Timer, BarChart3, Wifi } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { optimizedSync } from '../lib/optimizedRealtimeSync';

interface BigScreenDisplayProps {
  accessCode: string;
}

interface AnswerStats {
  optionIndex: number;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

export const BigScreenDisplay: React.FC<BigScreenDisplayProps> = ({ accessCode }) => {
  const mountedRef = useRef(false);
  
  useEffect(() => {
    if (!mountedRef.current) {
      console.log('🎮 [BIG SCREEN] Component mounted with accessCode:', accessCode);
      mountedRef.current = true;
    }
  }, [accessCode]);
  
  const [sessionId, setSessionId] = useState<string>('');
  const [quizState, setQuizState] = useState<{
    questions: any[];
    participants: any[];
    currentQuestionIndex: number;
    currentQuestionStartTime: number | null;
    isActive: boolean;
    isFinished: boolean;
    showResults: boolean;
    quizSettings: {
      title: string;
      description: string;
      defaultTimeLimit: number;
      pointsPerQuestion: number;
    };
    statistics: {
      totalParticipants: number;
      averageScore: number;
      participationRate: number;
    };
  }>({
    questions: [],
    participants: [],
    currentQuestionIndex: -1,
    currentQuestionStartTime: null,
    isActive: false,
    isFinished: false,
    showResults: false,
    quizSettings: {
      title: 'Loading...',
      description: '',
      defaultTimeLimit: 30,
      pointsPerQuestion: 100,
    },
    statistics: {
      totalParticipants: 0,
      averageScore: 0,
      participationRate: 0,
    },
  });
  const [answerStats, setAnswerStats] = useState<AnswerStats[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // FIXED: Add effect to log access code and prevent redirects
  useEffect(() => {
    console.log('🎮 [BIG SCREEN] Initialized with access code:', accessCode);
    
    // Ensure URL stays correct
    const expectedPath = `/big-screen/${accessCode}`;
    if (window.location.pathname !== expectedPath) {
      console.log('🎮 [BIG SCREEN] Fixing URL from', window.location.pathname, 'to', expectedPath);
      window.history.replaceState({}, '', expectedPath);
    }
  }, [accessCode]);

  // Subscribe to optimized sync updates
  useEffect(() => {
    if (!sessionId) return;

    console.log('⚡ [BIG SCREEN] Setting up optimized sync for session:', sessionId);

    const unsubscribe = optimizedSync.subscribe(sessionId, (update) => {
      console.log('🚀 [BIG SCREEN] Optimized sync update:', update.type, 'at', new Date(update.timestamp).toISOString());
      
      // Immediate state updates without delays
      switch (update.type) {
        case 'START_QUIZ':
        case 'START_QUESTION':
          console.log('⚡ [BIG SCREEN] Question update, reloading data immediately');
          loadQuizData();
          break;
        case 'SHOW_RESULTS':
          console.log('⚡ [BIG SCREEN] Results update, reloading data immediately');
          loadQuizData();
          break;
        case 'FINISH_QUIZ':
          console.log('⚡ [BIG SCREEN] Quiz finished, reloading data immediately');
          loadQuizData();
          break;
        case 'PARTICIPANT_UPDATE':
          console.log('⚡ [BIG SCREEN] Participant update, reloading data');
          loadQuizData();
          break;
      }
    }, 'bigscreen');

    return unsubscribe;
  }, [sessionId]);

  // Load quiz data function - stabilized with useCallback
  const loadQuizData = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setLoading(true);
      console.log('📊 [BIG SCREEN] Loading quiz data for session:', sessionId);
      
      // Load quiz session
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      console.log('✅ [BIG SCREEN] Session loaded:', {
        id: session.id,
        isActive: session.is_active,
        isFinished: session.is_finished,
        currentQuestionIndex: session.current_question_index,
        showResults: session.show_results
      });

      // Load questions
      const { data: questions, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_session_id', sessionId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Load participants
      const { data: participants, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('*')
        .eq('quiz_session_id', sessionId);

      if (participantsError) throw participantsError;

      // Load answers
      const { data: answers, error: answersError } = await supabase
        .from('quiz_answers')
        .select('*')
        .eq('quiz_session_id', sessionId);

      if (answersError) throw answersError;

      // Process participants with their answers
      const processedParticipants = (participants || []).map(p => ({
        id: p.id,
        name: p.name,
        mobile: p.mobile,
        score: p.score || 0,
        streak: p.streak || 0,
        badges: p.badges || [],
        avatarColor: p.avatar_color || 'bg-gradient-to-r from-blue-400 to-purple-400',
        joinedAt: new Date(p.joined_at).getTime(),
        lastSeen: p.last_seen,
        answers: (answers || [])
          .filter(a => a.participant_id === p.id)
          .reduce((acc, answer) => {
            acc[answer.question_id] = {
              answerIndex: answer.answer_index,
              isCorrect: answer.is_correct,
              timeToAnswer: parseFloat(answer.time_to_answer),
              pointsEarned: answer.points_earned || 0,
              answeredAt: answer.answered_at,
            };
            return acc;
          }, {}),
      }));

      const processedQuestions = (questions || []).map(q => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correct_answer,
        timeLimit: q.time_limit || 30,
        points: q.points || 100,
        category: q.category,
        difficulty: q.difficulty,
        orderIndex: q.order_index,
        imageUrl: q.image_url || undefined,
        image_url: q.image_url || undefined,
        option_images: q.option_images || undefined,
      }));

      const newState = {
        questions: processedQuestions,
        participants: processedParticipants.sort((a, b) => b.score - a.score),
        currentQuestionIndex: session.current_question_index ?? -1,
        currentQuestionStartTime: session.current_question_start_time ? new Date(session.current_question_start_time).getTime() : null,
        isActive: session.is_active || false,
        isFinished: session.is_finished || false,
        showResults: session.show_results || false,
        quizSettings: {
          title: session.title,
          description: session.description || '',
          defaultTimeLimit: 30,
          pointsPerQuestion: 100,
          ...(session.settings || {}),
        },
        statistics: {
          totalParticipants: processedParticipants.length,
          averageScore: processedParticipants.length > 0 
            ? processedParticipants.reduce((sum, p) => sum + p.score, 0) / processedParticipants.length 
            : 0,
          participationRate: processedQuestions.length > 0 && processedParticipants.length > 0
            ? (processedParticipants.reduce((sum, p) => sum + Object.keys(p.answers).length, 0) / (processedQuestions.length * processedParticipants.length)) * 100
            : 0,
        },
      };

      console.log('🎯 [BIG SCREEN] NEW STATE:', {
        currentQuestionIndex: newState.currentQuestionIndex,
        isActive: newState.isActive,
        showResults: newState.showResults,
        questionsCount: newState.questions.length
      });

      setQuizState(newState);

    } catch (err) {
      console.error('❌ [BIG SCREEN] Error loading quiz data:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // REMOVED: Duplicate database subscriptions - optimized sync handles all real-time updates
  // The optimized sync system handles all real-time updates centrally

  // Add supabase to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).supabase = supabase;
      console.log('🔧 [BIG SCREEN] Supabase available as window.supabase for testing');
    }
  }, []);

  // First, lookup the session ID from access code
  useEffect(() => {
    const lookupSession = async () => {
      try {
        console.log('🔍 [BIG SCREEN] Looking up session for code:', accessCode);
        setInitialLoading(true);
        setLookupError(null);
        
        const { data: session, error } = await supabase
          .from('quiz_sessions')
          .select('id, title, description, is_active, is_finished')
          .eq('access_code', accessCode)
          .single();

        if (error) {
          console.error('❌ [BIG SCREEN] Lookup error:', error);
          throw error;
        }

        if (!session) {
          throw new Error('Session not found');
        }

        console.log('✅ [BIG SCREEN] Session found:', session.id, session.title);
        setSessionId(session.id);
      } catch (err) {
        console.error('❌ [BIG SCREEN] Lookup failed:', err);
        setLookupError(err instanceof Error ? err.message : 'Session not found');
      } finally {
        setInitialLoading(false);
      }
    };

    if (accessCode && accessCode.trim()) {
      lookupSession();
    } else {
      console.error('❌ [BIG SCREEN] No access code provided');
      setLookupError('No access code provided');
      setInitialLoading(false);
    }
  }, [accessCode]);

  // Load quiz data when session ID is available
  useEffect(() => {
    if (sessionId) {
      loadQuizData();
    }
  }, [sessionId]);

  // Debug quiz state changes
  useEffect(() => {
    console.log('🎯 [BIG SCREEN] Quiz state changed:', {
      isActive: quizState.isActive,
      isFinished: quizState.isFinished,
      currentQuestionIndex: quizState.currentQuestionIndex,
      showResults: quizState.showResults,
      questionsCount: quizState.questions.length,
      participantsCount: quizState.participants.length
    });
  }, [quizState]);

  // Load answer statistics for current question - stabilized with useCallback
  const loadAnswerStats = useCallback(async () => {
    if (!sessionId || !quizState.questions.length || quizState.currentQuestionIndex < 0) {
      setAnswerStats([]);
      return;
    }

    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    if (!currentQuestion) return;

    console.log('📊 [BIG SCREEN] Loading answer stats for question:', currentQuestion.id);

    try {
      const { data: answers, error } = await supabase
        .from('quiz_answers')
        .select('answer_index')
        .eq('quiz_session_id', sessionId)
        .eq('question_id', currentQuestion.id);

      if (error) {
        console.error('❌ [BIG SCREEN] Error loading answer stats:', error);
        return;
      }

      const totalAnswers = answers?.length || 0;
      const stats: AnswerStats[] = currentQuestion.options.map((_: any, index: number) => {
        const count = answers?.filter(a => a.answer_index === index).length || 0;
        return {
          optionIndex: index,
          count,
          percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
          isCorrect: index === currentQuestion.correctAnswer,
        };
      });

      console.log('📊 [BIG SCREEN] Answer stats loaded:', stats);
      setAnswerStats(stats);
    } catch (err) {
      console.error('❌ [BIG SCREEN] Failed to load answer stats:', err);
    }
  }, [sessionId, quizState.questions, quizState.currentQuestionIndex]);

  // Load answer stats when question changes
  useEffect(() => {
    loadAnswerStats();
  }, [sessionId, quizState.currentQuestionIndex, quizState.questions]);

  // Timer for current question
  useEffect(() => {
    if (quizState.isActive && quizState.currentQuestionStartTime && !quizState.showResults && quizState.questions.length) {
      const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
      if (!currentQuestion) return;

      const startTime = quizState.currentQuestionStartTime;
      const timeLimit = (currentQuestion.timeLimit || 30) * 1000;
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          setTimeRemaining(0);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [quizState.isActive, quizState.currentQuestionStartTime, quizState.showResults, quizState.currentQuestionIndex, quizState.questions]);

  // Loading states
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 border-8 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-8"></div>
          <div className="text-6xl font-black text-white mb-6 font-mono tracking-tight">
            CONNECTING TO QUIZ
          </div>
          <div className="text-2xl text-cyan-400 font-mono font-bold tracking-wider">
            ACCESS CODE: {accessCode}
          </div>
        </div>
      </div>
    );
  }

  if (lookupError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-black to-red-900 flex items-center justify-center p-8">
        <div className="bg-red-500/20 border-4 border-red-500 rounded-3xl p-12 text-center max-w-2xl">
          <XCircle className="w-24 h-24 text-red-400 mx-auto mb-8" />
          <h2 className="text-5xl font-black text-red-300 mb-6 font-mono">SESSION NOT FOUND</h2>
          <p className="text-red-200 mb-8 font-mono text-xl">{lookupError}</p>
          <div className="bg-black/50 border border-red-400 p-6 rounded-xl">
            <div className="text-red-400 font-mono text-lg font-bold mb-2">ACCESS CODE</div>
            <div className="text-white font-mono text-3xl font-black">{accessCode}</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-32 h-32 text-cyan-400 mx-auto mb-8 animate-pulse" />
          <div className="text-6xl font-black text-white mb-6 font-mono">LOADING QUIZ DATA</div>
          <div className="text-cyan-400 font-mono text-2xl">SYNCHRONIZING...</div>
        </div>
      </div>
    );
  }

  // Waiting for quiz to start
  if (!quizState.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400 opacity-30 animate-pulse rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
          <div className="text-center max-w-6xl">
            {/* Main Logo */}
            <div className="w-48 h-48 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl animate-pulse">
              <Play className="w-24 h-24 text-white" />
            </div>
            
            <h1 className="text-8xl sm:text-9xl font-black text-white mb-8 font-mono tracking-tight">
              QUIZ STARTING SOON
            </h1>
            
            {/* Quiz Info Card */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-cyan-400 rounded-3xl p-12 mb-12 shadow-2xl">
              <div className="text-cyan-400 font-mono font-bold mb-6 text-3xl tracking-wider">NOW SHOWING</div>
              <div className="text-white font-mono text-6xl font-black mb-6">{quizState.quizSettings.title}</div>
              <div className="text-gray-300 font-mono text-2xl">{quizState.quizSettings.description}</div>
            </div>
            
            {/* Status Indicator */}
            <div className="flex items-center justify-center gap-8 mb-12">
              <div className="w-8 h-8 bg-yellow-400 rounded-full animate-pulse"></div>
              <span className="text-yellow-400 font-mono font-bold text-3xl tracking-wider">WAITING FOR HOST TO START</span>
              <div className="w-8 h-8 bg-cyan-400 rounded-full animate-pulse delay-500"></div>
            </div>
            
            {/* Participants Display */}
            {quizState.participants.length > 0 && (
              <div className="bg-black/80 backdrop-blur-sm border-4 border-purple-400 rounded-3xl p-12">
                <div className="text-purple-400 font-mono font-bold mb-8 text-4xl">
                  PARTICIPANTS READY: {quizState.participants.length}
                </div>
                <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-6 max-h-96 overflow-y-auto">
                  {quizState.participants.map((participant) => (
                    <div key={participant.id} className="text-center group">
                      <div className={`w-16 h-16 ${participant.avatarColor} rounded-full flex items-center justify-center font-mono font-bold text-white text-xl mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                        {participant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="text-white font-mono text-sm font-bold truncate">{participant.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Quiz finished - show final results
  if (quizState.isFinished) {
    const topParticipants = quizState.participants.slice(0, 10);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-900 via-black to-orange-900 relative overflow-hidden">
        {/* Celebration particles */}
        <div className="absolute inset-0">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 bg-yellow-400 opacity-60 animate-bounce rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${1 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <div className="w-48 h-48 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl">
                <Trophy className="w-24 h-24 text-black" />
              </div>
              
              <h1 className="text-8xl sm:text-9xl font-black text-white mb-8 font-mono tracking-tight">
                QUIZ COMPLETE
              </h1>
              
              <div className="text-yellow-400 font-mono text-4xl font-bold tracking-wider mb-6">
                FINAL RESULTS
              </div>
              
              <div className="text-white font-mono text-3xl">{quizState.quizSettings.title}</div>
            </div>

            {/* Podium for top 3 */}
            {topParticipants.length >= 3 && (
              <div className="flex items-end justify-center gap-12 mb-20">
                {/* 2nd Place */}
                <div className="text-center">
                  <Medal className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                  <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-black w-32 h-32 rounded-full flex items-center justify-center font-mono font-black text-4xl mb-6 shadow-xl">
                    2
                  </div>
                  <div className="bg-gray-400/20 border-4 border-gray-400 rounded-2xl p-8 h-48 flex flex-col justify-end">
                    <div className="text-white font-mono font-bold text-2xl mb-2">{topParticipants[1]?.name}</div>
                    <div className="text-gray-300 font-mono text-xl">{topParticipants[1]?.score.toLocaleString()}</div>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="text-center">
                  <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-6 animate-bounce" />
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-black w-40 h-40 rounded-full flex items-center justify-center font-mono font-black text-5xl mb-6 shadow-2xl">
                    1
                  </div>
                  <div className="bg-yellow-400/20 border-4 border-yellow-400 rounded-2xl p-10 h-56 flex flex-col justify-end">
                    <div className="text-white font-mono font-bold text-3xl mb-3">{topParticipants[0]?.name}</div>
                    <div className="text-yellow-300 font-mono text-2xl">{topParticipants[0]?.score.toLocaleString()}</div>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="text-center">
                  <Star className="w-14 h-14 text-orange-400 mx-auto mb-6" />
                  <div className="bg-gradient-to-r from-orange-400 to-yellow-500 text-black w-28 h-28 rounded-full flex items-center justify-center font-mono font-black text-3xl mb-6 shadow-lg">
                    3
                  </div>
                  <div className="bg-orange-400/20 border-4 border-orange-400 rounded-2xl p-6 h-40 flex flex-col justify-end">
                    <div className="text-white font-mono font-bold text-xl mb-2">{topParticipants[2]?.name}</div>
                    <div className="text-orange-300 font-mono text-lg">{topParticipants[2]?.score.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Leaderboard */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-cyan-400 rounded-3xl p-12">
              <div className="text-cyan-400 font-mono font-bold mb-12 text-4xl text-center">FINAL LEADERBOARD</div>
              <div className="grid gap-6">
                {quizState.participants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-8 rounded-2xl border-4 transition-all duration-300 ${
                      index === 0
                        ? 'bg-yellow-400/20 border-yellow-400 shadow-2xl'
                        : index === 1
                        ? 'bg-gray-400/20 border-gray-400 shadow-xl'
                        : index === 2
                        ? 'bg-orange-400/20 border-orange-400 shadow-lg'
                        : 'bg-gray-800/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-8">
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center font-mono font-black text-3xl ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-2xl' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black shadow-xl' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black shadow-lg' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold text-3xl mb-2">{participant.name}</div>
                        <div className="flex items-center gap-6">
                          {participant.badges.map((badge: string) => (
                            <span key={badge} className="px-4 py-2 bg-blue-500/20 border-2 border-blue-400 rounded-full text-blue-300 font-mono text-lg">
                              {badge.replace('-', ' ').toUpperCase()}
                            </span>
                          ))}
                          {participant.streak > 1 && (
                            <span className="text-orange-300 font-mono text-2xl">🔥 {participant.streak} streak</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-mono font-black text-4xl mb-2">
                        {participant.score.toLocaleString()}
                      </div>
                      <div className="text-gray-400 font-mono text-xl">POINTS</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active question display
  if (quizState.questions.length && quizState.currentQuestionIndex >= 0 && !quizState.showResults) {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    const answeredCount = answerStats.reduce((sum, stat) => sum + stat.count, 0);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-black to-purple-900 relative overflow-hidden">
        {/* Dynamic background based on time remaining */}
        <div className={`absolute inset-0 transition-all duration-1000 ${
          timeRemaining && timeRemaining <= 5 
            ? 'bg-gradient-to-br from-red-900 via-black to-red-900' 
            : 'bg-gradient-to-br from-blue-900 via-black to-purple-900'
        }`}>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.1)_1px,transparent_1px)] bg-[size:100px_100px] animate-pulse"></div>
        </div>
        
        <div className="relative z-10 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header with timer */}
            <div className="flex items-center justify-between mb-16">
              <div className="text-cyan-400 font-mono font-bold text-4xl">
                QUESTION {quizState.currentQuestionIndex + 1}
              </div>
              
              {timeRemaining !== null && (
                <div className={`text-8xl font-black font-mono transition-all duration-300 flex items-center gap-6 ${
                  timeRemaining <= 5 ? 'text-red-400 animate-pulse scale-110' : 'text-white'
                }`}>
                  <Timer className="w-16 h-16" />
                  {timeRemaining}s
                </div>
              )}
              
              <div className="text-orange-400 font-mono font-bold text-4xl flex items-center gap-4">
                <Target className="w-12 h-12" />
                {currentQuestion.points} POINTS
              </div>
            </div>

            {/* Question */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-cyan-400 rounded-3xl p-16 mb-16 shadow-2xl">
              <h2 className="text-5xl sm:text-7xl font-black text-white font-mono leading-tight text-center">
                {currentQuestion.question}
              </h2>
              
              {/* Question Image */}
              {currentQuestion.image_url && (
                <div className="mt-8 flex justify-center">
                  <img
                    src={currentQuestion.image_url}
                    alt="Question"
                    className="max-w-4xl max-h-96 object-contain rounded-2xl border-4 border-cyan-400/50 shadow-2xl"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Answer Options */}
            <div className="grid grid-cols-2 gap-8 mb-16">
              {currentQuestion.options.map((option: string, index: number) => (
                <div
                  key={index}
                  className="bg-black/80 backdrop-blur-sm border-4 border-gray-600 hover:border-cyan-400 rounded-2xl p-12 transition-all duration-300 transform hover:scale-105 shadow-xl"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-full flex items-center justify-center font-mono font-black text-4xl text-white shadow-lg">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <div className="flex items-center gap-6 flex-1">
                      {/* Option Image */}
                      {currentQuestion.option_images?.[index] && (
                        <img
                          src={currentQuestion.option_images[index]}
                          alt={`Option ${index + 1}`}
                          className="w-32 h-32 object-contain rounded-xl border-2 border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <div className="text-white font-mono font-bold text-3xl flex-1">
                        {option}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Live stats */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-purple-400 rounded-2xl p-8">
              <div className="grid grid-cols-3 gap-8 text-center">
                <div className="flex items-center justify-center gap-4">
                  <Users className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-purple-400 font-mono font-bold text-xl">PARTICIPANTS</div>
                    <div className="text-white font-mono font-black text-3xl">{quizState.participants.length}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Activity className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-green-400 font-mono font-bold text-xl">ANSWERED</div>
                    <div className="text-white font-mono font-black text-3xl">{answeredCount}</div>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Zap className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-yellow-400 font-mono font-bold text-xl">LIVE QUIZ</div>
                    <div className="text-white font-mono font-black text-3xl">ON AIR</div>
                  </div>
                </div>
              </div>
              
              {/* Progress bar */}
              <div className="mt-6">
                <div className="w-full bg-gray-800 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
                    style={{ width: `${quizState.participants.length > 0 ? (answeredCount / quizState.participants.length) * 100 : 0}%` }}
                  ></div>
                </div>
                <div className="text-center mt-2 text-gray-400 font-mono">
                  {quizState.participants.length > 0 ? Math.round((answeredCount / quizState.participants.length) * 100) : 0}% PARTICIPATION
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Results phase - show answer analytics
  if (quizState.showResults && quizState.questions.length && quizState.currentQuestionIndex >= 0) {
    const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-black to-emerald-900 relative overflow-hidden">
        {/* Results background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.1)_1px,transparent_1px)] bg-[size:100px_100px] animate-pulse"></div>
        
        <div className="relative z-10 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center mb-16">
              <h1 className="text-7xl sm:text-8xl font-black text-white mb-8 font-mono tracking-tight">
                QUESTION RESULTS
              </h1>
              <div className="text-green-400 font-mono text-3xl font-bold tracking-wider">
                QUESTION {quizState.currentQuestionIndex + 1} ANALYSIS
              </div>
            </div>

            {/* Question and Correct Answer */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-green-400 rounded-3xl p-12 mb-16 shadow-2xl">
              <div className="text-green-400 font-mono font-bold mb-6 text-2xl">CORRECT ANSWER</div>
              <div className="text-white font-mono text-3xl font-bold mb-8">{currentQuestion.question}</div>
              <div className="bg-green-500/20 border-4 border-green-400 rounded-2xl p-8">
                <div className="flex items-center gap-6">
                  <CheckCircle className="w-12 h-12 text-green-400" />
                  <div className="text-green-300 font-mono font-bold text-3xl">
                    {String.fromCharCode(65 + currentQuestion.correctAnswer)}: {currentQuestion.options[currentQuestion.correctAnswer]}
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Statistics */}
            <div className="grid grid-cols-2 gap-8 mb-16">
              {answerStats.map((stat, index) => (
                <div
                  key={index}
                  className={`border-4 rounded-2xl p-8 transition-all duration-1000 shadow-xl ${
                    stat.isCorrect 
                      ? 'bg-green-500/20 border-green-400' 
                      : 'bg-red-500/20 border-red-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-6">
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center font-mono font-black text-2xl ${
                        stat.isCorrect ? 'bg-green-400 text-black' : 'bg-red-400 text-white'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      {stat.isCorrect ? (
                        <CheckCircle className="w-12 h-12 text-green-400" />
                      ) : (
                        <XCircle className="w-12 h-12 text-red-400" />
                      )}
                    </div>
                    <div className={`text-5xl font-black font-mono ${
                      stat.isCorrect ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {Math.round(stat.percentage)}%
                    </div>
                  </div>
                  
                  <div className="text-white font-mono font-bold text-xl mb-4">
                    {currentQuestion.options[index]}
                  </div>
                  
                  <div className="w-full bg-gray-800 rounded-full h-6 mb-3">
                    <div 
                      className={`h-6 rounded-full transition-all duration-2000 ${
                        stat.isCorrect ? 'bg-green-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${stat.percentage}%` }}
                    ></div>
                  </div>
                  
                  <div className={`font-mono text-lg ${
                    stat.isCorrect ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {stat.count} participants
                  </div>
                </div>
              ))}
            </div>

            {/* Current Leaderboard */}
            <div className="bg-black/80 backdrop-blur-sm border-4 border-cyan-400 rounded-3xl p-12">
              <div className="text-cyan-400 font-mono font-bold mb-8 text-3xl text-center">CURRENT STANDINGS</div>
              <div className="grid grid-cols-2 gap-6">
                {quizState.participants.slice(0, 10).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-6 rounded-xl border-4 transition-all duration-300 ${
                      index === 0
                        ? 'bg-yellow-400/20 border-yellow-400 shadow-lg'
                        : index === 1
                        ? 'bg-gray-400/20 border-gray-400'
                        : index === 2
                        ? 'bg-orange-400/20 border-orange-400'
                        : 'bg-gray-800/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-xl ${
                        index === 0 ? 'bg-yellow-400 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-400 text-black' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold text-xl">{participant.name}</div>
                        {participant.streak > 1 && (
                          <div className="text-orange-300 font-mono text-sm">🔥 {participant.streak}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-white font-mono font-bold text-2xl">
                      {participant.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default waiting state
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Activity className="w-32 h-32 text-cyan-400 mx-auto mb-8 animate-pulse" />
        <div className="text-6xl font-black text-white mb-6 font-mono">WAITING FOR NEXT QUESTION</div>
        <div className="text-cyan-400 font-mono text-2xl">STAND BY...</div>
      </div>
    </div>
  );
};