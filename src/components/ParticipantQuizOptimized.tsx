import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { optimizedSync } from '../lib/optimizedRealtimeSync';
import { ParticipantWaitingRoom } from './participant/ParticipantWaitingRoom';
import { ParticipantQuestion } from './participant/ParticipantQuestion';
import { ParticipantResults } from './participant/ParticipantResults';
import { SimpleErrorBoundary, useErrorHandler } from './ErrorBoundary';
import type { Question, Participant, QuizSettings, ParticipantAnswer } from '../types';

interface ParticipantQuizOptimizedProps {
  sessionId: string;
  participantId: string;
  participantName: string;
  participantMobile: string;
  onBack: () => void;
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

export const ParticipantQuizOptimized: React.FC<ParticipantQuizOptimizedProps> = ({
  sessionId,
  participantId,
  participantName,
  participantMobile,
  onBack,
}) => {
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
  const [myParticipant, setMyParticipant] = useState<Participant | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const handleError = useErrorHandler();

  // Update last seen timestamp periodically
  useEffect(() => {
    const updateLastSeen = async () => {
      try {
        await supabase
          .from('quiz_participants')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', participantId);
      } catch (error) {
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'updateLastSeen');
      }
    };
    
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [participantId, handleError]);

  // Load quiz data function
  const loadQuizData = async () => {
    try {
      console.log('📊 [PARTICIPANT] Loading quiz data for session:', sessionId);
      
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

      console.log('✅ [PARTICIPANT] Quiz state updated:', newQuizState);
      setQuizState(newQuizState);

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
          
          // Check for existing answer
          const { data: existingAnswer } = await supabase
            .from('quiz_answers')
            .select('answer_index')
            .eq('participant_id', participantId)
            .eq('question_id', question.id)
            .single();

          if (existingAnswer) {
            setHasAnswered(true);
            setSelectedAnswer(existingAnswer.answer_index);
          } else {
            setHasAnswered(false);
            setSelectedAnswer(null);
          }
        }
      } else {
        setCurrentQuestion(null);
        setHasAnswered(false);
        setSelectedAnswer(null);
      }

      // Load participants
      loadParticipantsData();

    } catch (err) {
      console.error('❌ [PARTICIPANT] Error loading quiz data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quiz data');
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'loadQuizData');
    }
  };

  // Load participants data
  const loadParticipantsData = async () => {
    try {
      const { data: participantsData, error: participantsError } = await supabase
        .from('quiz_participants')
        .select('id, name, mobile, score, streak, badges, avatar_color, joined_at, last_seen')
        .eq('quiz_session_id', sessionId)
        .order('score', { ascending: false });

      if (!participantsError && participantsData) {
        const processedParticipants: Participant[] = participantsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          mobile: p.mobile,
          score: p.score || 0,
          streak: p.streak || 0,
          badges: p.badges || [],
          avatarColor: p.avatar_color || 'bg-gradient-to-r from-blue-400 to-purple-400',
          joinedAt: new Date(p.joined_at).getTime(),
          lastSeen: p.last_seen,
          answers: {} // Load separately when needed
        }));
        
        setParticipants(processedParticipants);
        const me = processedParticipants.find(p => p.id === participantId);
        if (me) setMyParticipant(me);
      }
    } catch (err) {
      console.error('❌ [PARTICIPANT] Error loading participants:', err);
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'loadParticipantsData');
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    console.log('⚡ [PARTICIPANT] Setting up optimized sync for session:', sessionId);
    let isActive = true;

    const unsubscribe = optimizedSync.subscribe(sessionId, (update) => {
      if (!isActive) return;
      
      console.log('🚀 [PARTICIPANT] Sync update:', update.type);
          
      // Immediate state updates
      switch (update.type) {
        case 'START_QUIZ':
        case 'START_QUESTION':
          console.log('⚡ [PARTICIPANT] Question update, reloading data immediately');
          setHasAnswered(false);
          setSelectedAnswer(null);
          loadQuizData();
          break;
        case 'SHOW_RESULTS':
          console.log('⚡ [PARTICIPANT] Results update, reloading data immediately');
          loadQuizData();
          break;
        case 'FINISH_QUIZ':
          console.log('⚡ [PARTICIPANT] Quiz finished, reloading data immediately');
          loadQuizData();
          break;
        case 'PARTICIPANT_UPDATE':
          console.log('⚡ [PARTICIPANT] Participant update');
          loadParticipantsData();
          break;
      }
    }, 'participant');

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [sessionId]);

  // Load initial data
  useEffect(() => {
    console.log('🎮 [PARTICIPANT] Initializing for session:', sessionId, 'participant:', participantId);
    
    const initializeData = async () => {
      setLoading(true);
      await loadQuizData();
      setLoading(false);
    };

    initializeData();
  }, [sessionId, participantId]);

  // Timer for current question
  useEffect(() => {
    if (quizState.isActive && quizState.currentQuestionStartTime && !quizState.showResults && currentQuestion) {
      const startTime = new Date(quizState.currentQuestionStartTime).getTime();
      const timeLimit = currentQuestion.timeLimit * 1000;
      
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
  }, [quizState.currentQuestionStartTime, quizState.showResults, currentQuestion, quizState.isActive]);

  // Submit answer function
  const submitAnswer = async (answerIndex: number) => {
    if (!currentQuestion || hasAnswered || !quizState.currentQuestionStartTime) return;

    try {
      setLoading(true);
      const timeToAnswer = (Date.now() - new Date(quizState.currentQuestionStartTime).getTime()) / 1000;
      const isCorrect = answerIndex === currentQuestion.correctAnswer;
      
      // Calculate points
      let pointsEarned = 0;
      if (isCorrect) {
        pointsEarned = currentQuestion.points;
        // Speed bonus
        const speedMultiplier = Math.max(0.5, 1 - (timeToAnswer / currentQuestion.timeLimit) * 0.5);
        pointsEarned = Math.round(pointsEarned * speedMultiplier);
      }

      // Submit answer
      const { error: answerError } = await supabase
        .from('quiz_answers')
        .insert({
          quiz_session_id: sessionId,
          participant_id: participantId,
          question_id: currentQuestion.id,
          answer_index: answerIndex,
          is_correct: isCorrect,
          time_to_answer: timeToAnswer,
          points_earned: pointsEarned,
        });

      if (answerError) throw answerError;

      // Update participant score and streak
      const newScore = (myParticipant?.score || 0) + pointsEarned;
      const newStreak = isCorrect ? (myParticipant?.streak || 0) + 1 : 0;

      const { error: participantError } = await supabase
        .from('quiz_participants')
        .update({
          score: newScore,
          streak: newStreak,
          last_seen: new Date().toISOString(),
        })
        .eq('id', participantId);

      if (participantError) throw participantError;

      setSelectedAnswer(answerIndex);
      setHasAnswered(true);

      // Update local participant data
      if (myParticipant) {
        setMyParticipant({
          ...myParticipant,
          score: newScore,
          streak: newStreak
        });
      }

    } catch (err) {
      console.error('❌ [PARTICIPANT] Error submitting answer:', err);
      handleError(err instanceof Error ? err : new Error('Unknown error'), 'submitAnswer');
      alert('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading && !quizState.title) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-2xl font-black text-white mb-4 font-mono">CONNECTING TO QUIZ</div>
          <div className="text-cyan-400 font-mono">SYNCHRONIZING DATA...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500 p-8 text-center max-w-md rounded-lg">
          <h2 className="text-xl font-black text-red-300 mb-4 font-mono">CONNECTION ERROR</h2>
          <p className="text-red-200 mb-6 font-mono">{error}</p>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                loadQuizData().finally(() => setLoading(false));
              }}
              className="bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 font-mono font-bold uppercase tracking-wider transition-colors rounded"
            >
              RETRY
            </button>
            <button
              onClick={onBack}
              className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 font-mono font-bold uppercase tracking-wider transition-colors rounded"
            >
              EXIT
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render appropriate component based on quiz state
  return (
    <SimpleErrorBoundary>
      {/* Waiting for quiz to start */}
      {!quizState.isActive && (
        <ParticipantWaitingRoom
          quizTitle={quizState.title}
          quizDescription={quizState.description}
          participantName={participantName}
          participantMobile={participantMobile}
          participants={participants}
          onBack={onBack}
        />
      )}

      {/* Quiz finished - show final results */}
      {quizState.isFinished && myParticipant && (
        <ParticipantResults
          isQuizFinished={true}
          myParticipant={myParticipant}
          participants={participants}
          totalQuestions={Math.max(quizState.currentQuestionIndex + 1, 0)}
          quizTitle={quizState.title}
          onReturnHome={onBack}
        />
      )}

      {/* Active question */}
      {quizState.isActive && currentQuestion && quizState.currentQuestionIndex >= 0 && !quizState.showResults && myParticipant && (
        <ParticipantQuestion
          question={currentQuestion}
          questionIndex={quizState.currentQuestionIndex}
          totalQuestions={Math.max(quizState.currentQuestionIndex + 1, 0)} // Approximate, actual count would need to be loaded
          timeRemaining={timeRemaining}
          selectedAnswer={selectedAnswer}
          hasAnswered={hasAnswered}
          myParticipant={myParticipant}
          loading={loading}
          showResults={quizState.showResults}
          onSelectAnswer={submitAnswer}
        />
      )}

      {/* Show results screen */}
      {quizState.showResults && currentQuestion && myParticipant && (
        <ParticipantResults
          isQuizFinished={false}
          currentQuestion={currentQuestion}
          myParticipant={myParticipant}
          participants={participants}
          totalQuestions={Math.max(quizState.currentQuestionIndex + 1, 0)}
          quizTitle={quizState.title}
          onReturnHome={onBack}
        />
      )}

      {/* Default waiting state */}
      {quizState.isActive && !currentQuestion && quizState.currentQuestionIndex >= 0 && !quizState.showResults && (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-2xl font-black text-white mb-4 font-mono">WAITING FOR NEXT QUESTION</div>
            <div className="text-cyan-400 font-mono">STAND BY...</div>
          </div>
        </div>
      )}
    </SimpleErrorBoundary>
  );
}; 