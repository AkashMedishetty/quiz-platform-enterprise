import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Users, Clock, Target, Crown, Medal, Star, TrendingUp, Award, Zap, CheckCircle, XCircle, Timer, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { optimizedSync } from '../lib/optimizedRealtimeSync';
import { BigScreenWaitingDisplay } from './bigscreen/BigScreenWaitingDisplay';
import { SimpleErrorBoundary, useErrorHandler } from './ErrorBoundary';
import type { Question, Participant, QuizSettings } from '../types';

interface BigScreenDisplayOptimizedProps {
  accessCode: string;
}

interface QuizState {
  isActive: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
  currentQuestionStartTime: string | null;
  showResults: boolean;
  title: string;
  description: string;
}

interface AnswerStats {
  optionIndex: number;
  count: number;
  percentage: number;
  isCorrect: boolean;
}

export const BigScreenDisplayOptimized: React.FC<BigScreenDisplayOptimizedProps> = ({ accessCode }) => {
  console.log('🖥️ [BIG SCREEN] Component mounted with accessCode:', accessCode);
  
  const [sessionId, setSessionId] = useState<string>('');
  const [quizState, setQuizState] = useState<QuizState>({
    isActive: false,
    isFinished: false,
    currentQuestionIndex: -1,
    currentQuestionStartTime: null,
    showResults: false,
    title: 'Loading...',
    description: '',
  });
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [answerStats, setAnswerStats] = useState<AnswerStats[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  
  const handleError = useErrorHandler();

  // Calculate top 3 participants
  const top3Participants = useMemo(() => {
    return participants
      .filter(p => p.score >= 0) // Show all participants, even with 0 score
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [participants]);

  // Calculate quiz statistics
  const quizStats = useMemo(() => {
    const totalParticipants = participants.length;
    const totalScore = participants.reduce((sum, p) => sum + p.score, 0);
    const averageScore = totalParticipants > 0 ? totalScore / totalParticipants : 0;
    const highestScore = Math.max(...participants.map(p => p.score), 0);
    const participantsWithAnswers = participants.filter(p => Object.keys(p.answers || {}).length > 0).length;
    const participationRate = totalParticipants > 0 ? (participantsWithAnswers / totalParticipants) * 100 : 0;
    
    return {
      totalParticipants,
      averageScore: Math.round(averageScore),
      highestScore,
      participationRate: Math.round(participationRate),
    };
  }, [participants]);

  // Load quiz data function
  const loadQuizData = async () => {
    if (!sessionId) return;

    try {
      console.log('📊 [BIG SCREEN OPTIMIZED] Loading quiz data for session:', sessionId);
      
      // Load session data
      const { data: session, error: sessionError } = await supabase
        .from('quiz_sessions')
        .select('is_active, is_finished, current_question_index, current_question_start_time, show_results, title, description')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw sessionError;

      const newQuizState = {
        isActive: session.is_active,
        isFinished: session.is_finished,
        currentQuestionIndex: session.current_question_index,
        currentQuestionStartTime: session.current_question_start_time,
        showResults: session.show_results,
        title: session.title,
        description: session.description,
      };

      setQuizState(newQuizState);

      // Count total questions
      const { count: questionsCount } = await supabase
        .from('quiz_questions')
        .select('*', { count: 'exact', head: true })
        .eq('quiz_session_id', sessionId);
      
      setTotalQuestions(questionsCount || 0);

      // Load current question if quiz is active
      if (session.current_question_index >= 0) {
        const { data: question, error: questionError } = await supabase
          .from('quiz_questions')
          .select('id, question, options, correct_answer, time_limit, points, image_url, order_index')
          .eq('quiz_session_id', sessionId)
          .eq('order_index', session.current_question_index)
          .single();

        if (!questionError && question) {
          const processedQuestion: Question = {
            id: question.id,
            question: question.question,
            options: question.options,
            correctAnswer: question.correct_answer,
            timeLimit: question.time_limit || 30,
            points: question.points || 100,
            difficulty: 'medium',
            orderIndex: question.order_index,
            imageUrl: question.image_url || undefined,
            optionImages: undefined,
          };
          
          setCurrentQuestion(processedQuestion);
          
          // Reset correct answer display when new question loads
          setShowCorrectAnswer(false);
          
          // Load answer stats for current question
          await loadAnswerStats(processedQuestion.id);
        }
      } else {
        setCurrentQuestion(null);
        setAnswerStats([]);
        setShowCorrectAnswer(false);
      }

      // Load participants
      await loadParticipantsData();

    } catch (err) {
      console.error('❌ [BIG SCREEN OPTIMIZED] Error loading quiz data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz data');
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'loadQuizData');
    }
  };

  // Load participants data with answers
  const loadParticipantsData = async () => {
    if (!sessionId) return;

    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('id, name, mobile, score, streak, badges, avatar_color, joined_at, last_seen')
        .eq('quiz_session_id', sessionId)
        .order('score', { ascending: false });

      if (!participantsError && participantsData) {
        // Load answers for all participants
        const { data: answersData, error: answersError } = await supabase
          .from('quiz_answers')
          .select('participant_id, question_id, answer_index, is_correct, time_to_answer, points_earned, answered_at')
          .eq('quiz_session_id', sessionId);

        const processedParticipants = participantsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          mobile: p.mobile,
          score: p.score || 0,
          streak: p.streak || 0,
          badges: p.badges || [],
          avatarColor: p.avatar_color || 'bg-gradient-to-r from-blue-400 to-purple-400',
          joinedAt: new Date(p.joined_at).getTime(),
          lastSeen: p.last_seen,
                      answers: !answersError && answersData ? 
              answersData
                .filter(a => a.participant_id === p.id)
                .reduce((acc: any, answer: any) => {
                  acc[answer.question_id] = {
                    answerIndex: answer.answer_index,
                    isCorrect: answer.is_correct,
                    timeToAnswer: parseFloat(answer.time_to_answer),
                    pointsEarned: answer.points_earned || 0,
                    answeredAt: answer.answered_at,
                  };
                  return acc;
                }, {} as any) : {}
        }));
        
        setParticipants(processedParticipants as any);
      }
    } catch (err) {
      console.error('❌ [BIG SCREEN OPTIMIZED] Error loading participants:', err);
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'loadParticipantsData');
    }
  };

  // Load answer statistics
  const loadAnswerStats = async (questionId: string) => {
    if (!sessionId || !questionId) return;

    try {
      const { data: answers, error } = await supabase
        .from('quiz_answers')
        .select('answer_index')
        .eq('quiz_session_id', sessionId)
        .eq('question_id', questionId);

      if (error) throw error;

      if (currentQuestion) {
        const totalAnswers = answers?.length || 0;
        const stats: AnswerStats[] = currentQuestion.options.map((_, index) => {
          const count = answers?.filter(a => a.answer_index === index).length || 0;
          return {
            optionIndex: index,
            count,
            percentage: totalAnswers > 0 ? (count / totalAnswers) * 100 : 0,
            isCorrect: index === currentQuestion.correctAnswer,
          };
        });

        setAnswerStats(stats);
      }
    } catch (err) {
      console.error('❌ [BIG SCREEN OPTIMIZED] Error loading answer stats:', err);
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'loadAnswerStats');
    }
  };

  // Lookup session by access code
  useEffect(() => {
    const lookupSession = async () => {
      try {
        console.log('🔍 [BIG SCREEN OPTIMIZED] Looking up session for code:', accessCode);
        setLoading(true);
        setError(null);

        const { data: session, error } = await supabase
          .from('quiz_sessions')
          .select('id, title, description')
          .eq('access_code', accessCode)
          .single();

        if (error) throw error;
        if (!session) throw new Error('Session not found');

        console.log('✅ [BIG SCREEN OPTIMIZED] Session found:', session.id, session.title);
        setSessionId(session.id);
      } catch (err) {
        console.error('❌ [BIG SCREEN OPTIMIZED] Session lookup failed:', err);
        setError(err instanceof Error ? err.message : 'Session not found');
      } finally {
        setLoading(false);
      }
    };

    if (accessCode?.trim()) {
      lookupSession();
    } else {
      setError('No access code provided');
      setLoading(false);
    }
  }, [accessCode]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    console.log('⚡ [BIG SCREEN OPTIMIZED] Setting up optimized sync for session:', sessionId);
    let isActive = true;

    const unsubscribe = optimizedSync.subscribe(sessionId, (update) => {
      if (!isActive) return;
      
      console.log('🚀 [BIG SCREEN OPTIMIZED] Sync update:', update.type);
          
      // Immediate state updates
      switch (update.type) {
        case 'START_QUIZ':
        case 'START_QUESTION':
          console.log('⚡ [BIG SCREEN OPTIMIZED] Question update, reloading data immediately');
          setShowCorrectAnswer(false); // Reset correct answer display
          loadQuizData();
          break;
        case 'SHOW_RESULTS':
          console.log('⚡ [BIG SCREEN OPTIMIZED] Results update, showing correct answer');
          setShowCorrectAnswer(true); // Show correct answer when results are displayed
          loadQuizData();
          break;
        case 'FINISH_QUIZ':
          console.log('⚡ [BIG SCREEN OPTIMIZED] Quiz finished, reloading data immediately');
          loadQuizData();
          break;
        case 'PARTICIPANT_UPDATE':
          console.log('⚡ [BIG SCREEN OPTIMIZED] Participant update');
          loadParticipantsData();
          break;
        default:
          // Handle any other updates (including settings changes) by reloading data
          console.log('⚡ [BIG SCREEN OPTIMIZED] General update received, reloading data');
          loadQuizData();
          break;
      }
    }, 'bigscreen');

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [sessionId]);

  // Load initial data
  useEffect(() => {
    if (sessionId) {
      loadQuizData();
    }
  }, [sessionId]);

  // Timer for current question
  useEffect(() => {
    if (quizState.isActive && quizState.currentQuestionStartTime && !quizState.isFinished && currentQuestion) {
      const startTime = new Date(quizState.currentQuestionStartTime).getTime();
      const timeLimit = (currentQuestion.timeLimit || 30) * 1000;
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          setTimeRemaining(0);
          // Show correct answer when timer expires
          setTimeout(() => {
            setShowCorrectAnswer(true);
          }, 1000);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [quizState.currentQuestionStartTime, quizState.isFinished, currentQuestion, quizState.isActive]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center">
        {/* Futuristic Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
        
        <div className="text-center relative z-10">
          <div className="w-24 h-24 border-4 border-cyan-400/30 border-t-cyan-400 rounded-none animate-spin mx-auto mb-8"></div>
          <div className="text-4xl font-black text-white mb-6 font-mono">CONNECTING TO QUIZ</div>
          <div className="text-cyan-400 font-mono text-xl">Access Code: {accessCode}</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
        {/* Futuristic Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,0,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
        
        <div className="bg-red-500/20 border-2 border-red-500 p-12 text-center max-w-lg relative z-10">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-3xl font-black text-red-300 mb-6 font-mono">CONNECTION ERROR</h2>
          <p className="text-red-200 mb-8 font-mono text-lg">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-red-500 hover:bg-red-400 text-white px-8 py-4 font-mono font-bold uppercase tracking-wider transition-colors text-lg"
          >
            RELOAD
          </button>
        </div>
      </div>
    );
  }

  // Render appropriate component based on quiz state
  return (
    <SimpleErrorBoundary>
      {/* Waiting for quiz to start */}
      {!quizState.isActive && !quizState.isFinished && (
        <BigScreenWaitingDisplay
          quizTitle={quizState.title}
          quizDescription={quizState.description}
          accessCode={accessCode}
          participants={participants}
          totalQuestions={totalQuestions}
        />
      )}

      {/* Quiz in progress or finished */}
      {(quizState.isActive || quizState.isFinished) && (
        <div className="min-h-screen bg-black relative overflow-hidden p-4">
          {/* Futuristic Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
          
          <div className="max-w-7xl mx-auto relative z-10">
            {/* Header with Quiz Info */}
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                {quizState.title}
              </h1>
              <div className="flex items-center justify-center gap-8 text-lg font-mono">
                <div className={`px-6 py-2 rounded-full border-2 ${
                  quizState.isFinished ? 'bg-green-500/20 border-green-400 text-green-300' :
                  quizState.showResults ? 'bg-orange-500/20 border-orange-400 text-orange-300' :
                  'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                }`}>
                  {quizState.isFinished ? '🏁 QUIZ COMPLETE' : 
                   quizState.showResults ? '📊 RESULTS' : 
                   '🔴 LIVE QUIZ'}
                </div>
                <div className="text-white/70">
                  Question {Math.max(1, Math.min(quizState.currentQuestionIndex + 1, totalQuestions))} of {totalQuestions}
                </div>
                <div className="text-white/70">
                  {participants.length} Participants
                </div>
              </div>
            </div>

            {/* Current Question Display */}
            {currentQuestion && quizState.currentQuestionIndex >= 0 && !quizState.isFinished && (
              <div className="bg-black/60 backdrop-blur-md border-2 border-cyan-400/50 rounded-3xl p-8 mb-8 shadow-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center font-mono font-black text-xl text-black">
                      Q{Math.max(1, Math.min(quizState.currentQuestionIndex + 1, totalQuestions))}
                    </div>
                    <div>
                      <div className="text-cyan-400 font-mono font-bold text-xl">
                        QUESTION {Math.max(1, Math.min(quizState.currentQuestionIndex + 1, totalQuestions))}
                      </div>
                      <div className="text-white/70 font-mono">
                        {currentQuestion.points} points • {currentQuestion.timeLimit}s
                      </div>
                    </div>
                  </div>
                  
                  {timeRemaining !== null && (
                    <div className={`flex items-center gap-4 text-4xl font-black font-mono ${
                      timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 
                      timeRemaining <= 10 ? 'text-orange-400' : 'text-white'
                    }`}>
                      <Timer className="w-10 h-10" />
                      {timeRemaining}s
                    </div>
                  )}
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-8 font-mono leading-tight">
                  {currentQuestion.question}
                </h2>
                
                {currentQuestion.imageUrl && (
                  <div className="mb-8 flex justify-center">
                    <img
                      src={currentQuestion.imageUrl}
                      alt="Question"
                      className="max-w-full max-h-64 object-contain rounded-2xl border-2 border-cyan-400/30 shadow-lg"
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {currentQuestion.options.map((option, index) => {
                    const isCorrect = index === currentQuestion.correctAnswer;
                    const stat = answerStats.find(s => s.optionIndex === index);
                    const showAnswer = quizState.showResults || showCorrectAnswer;
                    
                    return (
                      <div
                        key={index}
                        className={`relative overflow-hidden rounded-2xl p-6 border-2 transition-all duration-1000 ${
                          showAnswer && isCorrect
                            ? 'bg-green-500/30 border-green-400 shadow-green-400/50 shadow-lg'
                            : showAnswer && !isCorrect
                            ? 'bg-red-500/20 border-red-400/50'
                            : 'bg-gray-800/70 border-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {/* Answer percentage bar */}
                        {showAnswer && stat && (
                          <div 
                            className={`absolute bottom-0 left-0 h-2 transition-all duration-1000 ${
                              isCorrect ? 'bg-green-400' : 'bg-blue-400'
                            }`}
                            style={{ width: `${stat.percentage}%` }}
                          />
                        )}
                        
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center font-mono font-black text-2xl transition-all duration-500 ${
                            showAnswer && isCorrect
                              ? 'bg-green-400 text-black'
                              : showAnswer && !isCorrect
                              ? 'bg-red-400/70 text-white'
                              : 'bg-gray-600 text-white'
                          }`}>
                            {showAnswer && isCorrect && <CheckCircle className="w-8 h-8" />}
                            {showAnswer && !isCorrect && <XCircle className="w-8 h-8" />}
                            {!showAnswer && String.fromCharCode(65 + index)}
                          </div>
                          
                          <div className="flex-1">
                            <div className="text-white font-mono text-lg font-bold">{option}</div>
                            {showAnswer && stat && (
                              <div className="text-white/70 font-mono text-sm mt-2">
                                {stat.count} answers ({Math.round(stat.percentage)}%)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top 3 Leaderboard */}
            {top3Participants.length > 0 && (
              <div className="bg-black/60 backdrop-blur-md border-2 border-yellow-400/50 rounded-3xl p-8 mb-8 shadow-2xl">
                <div className="flex items-center justify-center gap-4 mb-8">
                  <Crown className="w-10 h-10 text-yellow-400" />
                  <h2 className="text-3xl font-black text-white font-mono">
                    🏆 TOP 3 CHAMPIONS
                  </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {top3Participants.map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`text-center p-8 rounded-2xl border-2 transition-all duration-500 ${
                        index === 0
                          ? 'bg-gradient-to-b from-yellow-400/30 to-yellow-600/20 border-yellow-400 shadow-yellow-400/50 shadow-lg transform scale-105'
                          : index === 1
                          ? 'bg-gradient-to-b from-gray-400/30 to-gray-600/20 border-gray-400 shadow-gray-400/50 shadow-lg'
                          : 'bg-gradient-to-b from-orange-400/30 to-orange-600/20 border-orange-400 shadow-orange-400/50 shadow-lg'
                      }`}
                    >
                      <div className="mb-6">
                        {index === 0 && <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />}
                        {index === 1 && <Medal className="w-12 h-12 text-gray-400 mx-auto mb-2" />}
                        {index === 2 && <Award className="w-12 h-12 text-orange-400 mx-auto mb-2" />}
                        
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center font-mono font-black text-3xl text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                          'bg-gradient-to-r from-orange-400 to-orange-600'
                        }`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-black text-white font-mono mb-2">
                        {participant.name}
                      </h3>
                      <div className="text-white/70 font-mono text-sm mb-4">
                        {participant.mobile}
                      </div>
                      
                      <div className={`text-4xl font-black font-mono mb-2 ${
                        index === 0 ? 'text-yellow-400' :
                        index === 1 ? 'text-gray-400' :
                        'text-orange-400'
                      }`}>
                        {participant.score.toLocaleString()}
                      </div>
                      
                      <div className="text-white/60 font-mono text-sm">
                        points
                      </div>
                      
                      {participant.streak > 1 && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <Zap className="w-5 h-5 text-orange-400" />
                          <span className="text-orange-300 font-mono font-bold">
                            {participant.streak} streak
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quiz Statistics Dashboard */}
            <div className="bg-black/60 backdrop-blur-md border-2 border-purple-400/50 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-center gap-4 mb-8">
                <BarChart3 className="w-10 h-10 text-purple-400" />
                <h2 className="text-3xl font-black text-white font-mono">
                  📊 QUIZ DASHBOARD
                </h2>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                <div className="text-center p-6 bg-blue-500/20 border border-blue-400 rounded-2xl">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-white font-mono">
                    {quizStats.totalParticipants}
                  </div>
                  <div className="text-blue-300 font-mono text-sm">
                    Total Players
                  </div>
                </div>
                
                <div className="text-center p-6 bg-green-500/20 border border-green-400 rounded-2xl">
                  <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-white font-mono">
                    {quizStats.averageScore}
                  </div>
                  <div className="text-green-300 font-mono text-sm">
                    Avg Score
                  </div>
                </div>
                
                <div className="text-center p-6 bg-yellow-500/20 border border-yellow-400 rounded-2xl">
                  <Star className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-white font-mono">
                    {quizStats.highestScore}
                  </div>
                  <div className="text-yellow-300 font-mono text-sm">
                    High Score
                  </div>
                </div>
                
                <div className="text-center p-6 bg-purple-500/20 border border-purple-400 rounded-2xl">
                  <Target className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <div className="text-3xl font-black text-white font-mono">
                    {quizStats.participationRate}%
                  </div>
                  <div className="text-purple-300 font-mono text-sm">
                    Participation
                  </div>
                </div>
              </div>

              {/* All Participants Grid */}
              {participants.length > 3 && (
                <div>
                  <h3 className="text-xl font-black text-white font-mono mb-6 text-center">
                    ALL PARTICIPANTS ({participants.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                    {participants.slice(3).map((participant, index) => (
                      <div
                        key={participant.id}
                        className="text-center p-4 bg-gray-800/50 border border-gray-600 rounded-xl hover:border-gray-400 transition-all"
                      >
                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center font-mono font-bold text-white text-lg mb-2 ${participant.avatarColor}`}>
                          {participant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-white font-mono font-bold text-sm mb-1">
                          #{index + 4}
                        </div>
                        <div className="text-white font-mono text-xs mb-1 truncate">
                          {participant.name}
                        </div>
                        <div className="text-gray-400 font-mono text-xs mb-2 truncate">
                          {participant.mobile}
                        </div>
                        <div className="text-cyan-400 font-mono font-bold text-sm">
                          {participant.score.toLocaleString()}
                        </div>
                        {participant.streak > 1 && (
                          <div className="text-orange-300 font-mono text-xs mt-1">
                            🔥 {participant.streak}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </SimpleErrorBoundary>
  );
}; 