import React from 'react';
import { Clock, Target, CheckCircle, XCircle, Smartphone } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  imageUrl?: string;
  optionImages?: string[];
}

interface Participant {
  id: string;
  name: string;
  mobile: string;
  score: number;
  streak: number;
  avatarColor: string;
}

interface ParticipantQuestionProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timeRemaining: number | null;
  selectedAnswer: number | null;
  hasAnswered: boolean;
  myParticipant: Participant;
  loading: boolean;
  showResults: boolean;
  onSelectAnswer: (answerIndex: number) => Promise<void>;
}

export const ParticipantQuestion: React.FC<ParticipantQuestionProps> = ({
  question,
  questionIndex,
  totalQuestions,
  timeRemaining,
  selectedAnswer,
  hasAnswered,
  myParticipant,
  loading,
  showResults,
  onSelectAnswer,
}) => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Dynamic background based on time remaining */}
      <div className={`absolute inset-0 transition-all duration-1000 ${
        timeRemaining && timeRemaining <= 5 
          ? 'bg-gradient-to-br from-red-900 via-black to-red-900' 
          : 'bg-gradient-to-br from-blue-900 via-black to-purple-900'
      }`}>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>
      
      {/* Neon accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      
      <div className="relative z-10 p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-cyan-400 font-mono font-bold">
              QUESTION {questionIndex + 1} OF {totalQuestions}
            </div>
            <div className="flex items-center gap-4">
              {timeRemaining !== null && (
                <div className={`text-2xl font-black font-mono transition-all duration-300 ${
                  timeRemaining <= 5 ? 'text-red-400 animate-pulse scale-110' : 'text-white'
                }`}>
                  <Clock className="w-6 h-6 inline mr-2" />
                  {timeRemaining}s
                </div>
              )}
              <div className="text-white font-mono">
                <Target className="w-5 h-5 inline mr-1" />
                {question.points} PTS
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-black/80 backdrop-blur-sm border-2 border-cyan-400 rounded-2xl p-6 sm:p-8 mb-8 shadow-2xl">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 font-mono leading-tight">
              {question.question}
            </h2>
            
            {/* Question Image */}
            {question.imageUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={question.imageUrl}
                  alt="Question"
                  className="max-w-full max-h-64 object-contain rounded-lg border border-cyan-400/50"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            
            {/* Answer Options */}
            <div className="grid gap-4">
              {question.options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => !hasAnswered && !loading && timeRemaining !== 0 && onSelectAnswer(index)}
                  disabled={hasAnswered || timeRemaining === 0 || loading}
                  className={`p-4 sm:p-6 text-left transition-all duration-300 font-mono font-bold text-lg border-2 rounded-lg ${
                    hasAnswered
                      ? selectedAnswer === index
                        ? index === question.correctAnswer
                          ? 'bg-green-500/20 border-green-400 text-green-300'
                          : 'bg-red-500/20 border-red-400 text-red-300'
                        : index === question.correctAnswer
                        ? 'bg-green-500/20 border-green-400 text-green-300'
                        : 'bg-gray-800/50 border-gray-600 text-gray-400'
                      : 'bg-black border-gray-600 text-white hover:border-cyan-400 hover:bg-cyan-400/10 cursor-pointer transform hover:scale-105'
                  } ${timeRemaining === 0 || loading ? 'cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Option Letter */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center font-mono font-black text-xl border-2 ${
                        hasAnswered && selectedAnswer === index
                          ? index === question.correctAnswer
                            ? 'bg-green-400 border-green-400 text-black'
                            : 'bg-red-400 border-red-400 text-white'
                          : hasAnswered && index === question.correctAnswer
                          ? 'bg-green-400 border-green-400 text-black'
                          : 'bg-gray-800 border-gray-600 text-white'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      
                      {/* Option Image */}
                      {question.optionImages?.[index] && (
                        <img
                          src={question.optionImages[index]}
                          alt={`Option ${index + 1}`}
                          className="w-16 h-16 object-contain rounded border border-gray-600"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      
                      <span className="flex-1">{option}</span>
                    </div>
                    
                    {/* Answer Status Icons */}
                    {hasAnswered && showResults && (
                      <div className="ml-4">
                        {selectedAnswer === index && index === question.correctAnswer && (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        )}
                        {selectedAnswer === index && index !== question.correctAnswer && (
                          <XCircle className="w-6 h-6 text-red-400" />
                        )}
                        {selectedAnswer !== index && index === question.correctAnswer && (
                          <CheckCircle className="w-6 h-6 text-green-400" />
                        )}
                      </div>
                    )}
                    {hasAnswered && !showResults && selectedAnswer === index && (
                      <div className="ml-4">
                        <Clock className="w-6 h-6 text-cyan-400" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            {/* Answer Status Messages */}
            {hasAnswered && !showResults && (
              <div className="mt-6 p-4 bg-black/50 border border-cyan-400/50 rounded-lg">
                <div className="text-cyan-400 font-mono font-bold text-center flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  ANSWER SUBMITTED - WAITING FOR RESULTS
                </div>
              </div>
            )}
            
            {timeRemaining === 0 && !hasAnswered && (
              <div className="mt-6 p-4 bg-red-500/20 border border-red-400 rounded-lg">
                <div className="text-red-400 font-mono font-bold text-center flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5" />
                  TIME'S UP!
                </div>
              </div>
            )}
            
            {loading && (
              <div className="mt-6 p-4 bg-blue-500/20 border border-blue-400 rounded-lg">
                <div className="text-blue-400 font-mono font-bold text-center flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                  SUBMITTING ANSWER...
                </div>
              </div>
            )}
          </div>

          {/* My Stats */}
          {myParticipant && (
            <div className="bg-black/80 backdrop-blur-sm border border-purple-400/50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${myParticipant.avatarColor} rounded-full flex items-center justify-center font-mono font-bold text-white`}>
                    {myParticipant.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-white font-mono font-bold">{myParticipant.name}</div>
                    <div className="text-gray-400 font-mono text-sm flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      {myParticipant.mobile}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-mono font-bold text-xl">{myParticipant.score.toLocaleString()}</div>
                  <div className="text-purple-400 font-mono text-sm">
                    {myParticipant.streak > 1 && `🔥 ${myParticipant.streak} streak`}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Critical Time Warning */}
          {timeRemaining !== null && timeRemaining <= 10 && timeRemaining > 0 && !hasAnswered && (
            <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
              <div className="bg-red-500/90 border-4 border-red-400 rounded-2xl p-8 text-center animate-pulse">
                <div className="text-white font-mono font-black text-4xl mb-2">{timeRemaining}</div>
                <div className="text-red-200 font-mono font-bold">SECONDS LEFT!</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 