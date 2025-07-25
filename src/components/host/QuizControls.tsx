import React from 'react';
import { Users, Play, SkipForward, Eye, Clock, Target, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
  points?: number;
}

interface QuizControlsProps {
  isActive: boolean;
  isFinished: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion?: Question;
  timeRemaining?: number | null;
  answeredCount: number;
  totalParticipants: number;
  showResults: boolean;
  loading?: boolean;
  onMakeLive: () => Promise<void>;
  onStartQuiz: () => Promise<void>;
  onNextQuestion: () => Promise<void>;
  onShowResults: () => Promise<void>;
}

export const QuizControls: React.FC<QuizControlsProps> = ({
  isActive,
  isFinished,
  currentQuestionIndex,
  totalQuestions,
  currentQuestion,
  timeRemaining,
  answeredCount,
  totalParticipants,
  showResults,
  loading = false,
  onMakeLive,
  onStartQuiz,
  onNextQuestion,
  onShowResults,
}) => {
  const getQuizStatus = () => {
    if (isFinished) return { text: 'Finished', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (isActive && currentQuestionIndex >= 0 && !showResults) return { text: 'Quiz In Progress', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (isActive && showResults) return { text: 'Showing Results', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    if (isActive) return { text: 'Live - Waiting to Start', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    return { text: 'Not Live', color: 'text-gray-400', bg: 'bg-gray-400/20' };
  };

  const status = getQuizStatus();

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-bold text-white mb-6">Quiz Controls</h2>
      
      {/* Make Live Button */}
      {!isActive && !isFinished && (
        <button
          onClick={onMakeLive}
          disabled={totalQuestions === 0 || loading}
          className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-base sm:text-lg font-semibold transform hover:scale-105 disabled:transform-none mb-4"
        >
          <Users className="w-4 h-4 sm:w-5 sm:h-5" />
          {loading ? 'Making Live...' : 'Make Quiz Live'}
        </button>
      )}

      {/* Start Quiz Button */}
      {isActive && currentQuestionIndex === -1 && !isFinished && (
        <button
          onClick={onStartQuiz}
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-500 disabled:to-gray-600 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-base sm:text-lg font-semibold transform hover:scale-105 disabled:transform-none mb-4"
        >
          <Play className="w-4 h-4 sm:w-5 sm:h-5" />
          {loading ? 'Starting...' : 'Start Quiz'}
        </button>
      )}

      {/* Active Question Controls */}
      {isActive && currentQuestionIndex >= 0 && !isFinished && (
        <div className="space-y-4">
          {/* Current Question Info */}
          {currentQuestion && (
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-lg border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-blue-200 text-sm">
                  Question {currentQuestionIndex + 1} of {totalQuestions}
                </div>
                                 {timeRemaining !== null && timeRemaining !== undefined && (
                   <div className={`text-base sm:text-lg font-bold ${
                     timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-white'
                   }`}>
                    <Clock className="w-4 h-4 inline mr-1" />
                    {timeRemaining}s
                  </div>
                )}
              </div>
              <div className="text-white font-medium text-sm sm:text-base mb-2">
                {currentQuestion.question}
              </div>
              <div className="text-sm text-gray-300 mb-2">
                <Target className="w-4 h-4 inline mr-1" />
                {currentQuestion.points} points | Correct: {currentQuestion.options[currentQuestion.correctAnswer]}
              </div>
              <div className="text-sm text-gray-300">
                {answeredCount}/{totalParticipants} answered
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${totalParticipants > 0 ? (answeredCount / totalParticipants) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onShowResults}
              disabled={loading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-lg transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              {loading ? 'Showing...' : 'Show Results'}
            </button>
            <button
              onClick={onNextQuestion}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              <SkipForward className="w-4 h-4" />
              {loading ? 'Processing...' : (currentQuestionIndex < totalQuestions - 1 ? 'Next Question' : 'Finish Quiz')}
            </button>
          </div>
        </div>
      )}

      {/* Quiz Status Display */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
        <div className="text-sm text-gray-300 mb-2">Quiz Status:</div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${
            isFinished ? 'bg-red-400' :
            isActive && currentQuestionIndex >= 0 && !showResults ? 'bg-green-400 animate-pulse' :
            isActive && showResults ? 'bg-yellow-400 animate-pulse' :
            isActive ? 'bg-yellow-400 animate-pulse' :
            'bg-gray-400'
          }`}></div>
          <span className="text-white font-medium">{status.text}</span>
        </div>
        
        {/* Quick Stats */}
        {totalQuestions > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Questions</div>
              <div className="text-white font-bold">{totalQuestions}</div>
            </div>
            <div>
              <div className="text-gray-400">Participants</div>
              <div className="text-white font-bold">{totalParticipants}</div>
            </div>
          </div>
        )}
      </div>

      {/* Error State for Missing Question */}
      {isActive && currentQuestionIndex >= 0 && !currentQuestion && (
        <div className="mt-4 bg-red-500/20 border border-red-500 p-4 rounded-lg">
          <div className="text-red-400 font-mono font-bold flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            ERROR: No question found at index {currentQuestionIndex}
          </div>
          <div className="text-red-300 font-mono text-sm mt-1">
            Total questions: {totalQuestions}
          </div>
        </div>
      )}

      {/* Warning for No Questions */}
      {totalQuestions === 0 && (
        <div className="mt-4 bg-yellow-500/20 border border-yellow-500 p-4 rounded-lg">
          <div className="text-yellow-400 font-medium flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Add questions to start the quiz
          </div>
          <div className="text-yellow-300 text-sm mt-1">
            You need at least one question to make the quiz live.
          </div>
        </div>
      )}
    </div>
  );
}; 