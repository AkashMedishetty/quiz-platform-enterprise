import React from 'react';
import { Trophy, Award, Target, Crown, Medal, Star } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Participant {
  id: string;
  name: string;
  mobile: string;
  score: number;
  streak: number;
  badges: string[];
  avatarColor: string;
}

interface ParticipantResultsProps {
  isQuizFinished: boolean;
  currentQuestion?: Question;
  myParticipant: Participant;
  participants: Participant[];
  totalQuestions: number;
  quizTitle: string;
  onReturnHome: () => void;
}

export const ParticipantResults: React.FC<ParticipantResultsProps> = ({
  isQuizFinished,
  currentQuestion,
  myParticipant,
  participants,
  totalQuestions,
  quizTitle,
  onReturnHome,
}) => {
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
  const myRank = sortedParticipants.findIndex(p => p.id === myParticipant.id) + 1;

  if (isQuizFinished) {
    // Final Quiz Results
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Celebration background */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900 via-black to-orange-900">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,215,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,215,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
        
        {/* Celebration particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
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
        
        {/* Neon accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
        
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
                <Trophy className="w-12 h-12 text-black" />
              </div>
              
              <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 font-mono tracking-tight">
                QUIZ COMPLETE
              </h1>
              
              <div className="text-yellow-400 font-mono text-lg font-bold tracking-wider mb-6">
                FINAL RESULTS
              </div>
              
              <div className="text-white font-mono text-xl">{quizTitle}</div>
            </div>

            {/* My Results */}
            <div className="bg-black/80 backdrop-blur-sm border-2 border-yellow-400 rounded-2xl p-6 mb-8 shadow-2xl">
              <div className="text-center">
                <div className="text-yellow-400 font-mono font-bold mb-2">YOUR PERFORMANCE</div>
                <div className="text-white font-mono text-3xl font-black mb-4">{myParticipant.name}</div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-yellow-400 font-mono text-xs font-bold mb-1">RANK</div>
                    <div className="text-white font-mono text-2xl font-black">#{myRank}</div>
                  </div>
                  <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-green-400 font-mono text-xs font-bold mb-1">SCORE</div>
                    <div className="text-white font-mono text-2xl font-black">{myParticipant.score}</div>
                  </div>
                  <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-orange-400 font-mono text-xs font-bold mb-1">STREAK</div>
                    <div className="text-white font-mono text-2xl font-black">{myParticipant.streak}</div>
                  </div>
                  <div className="bg-black/50 border border-gray-600 rounded-lg p-4">
                    <div className="text-purple-400 font-mono text-xs font-bold mb-1">BADGES</div>
                    <div className="text-white font-mono text-2xl font-black">{myParticipant.badges.length}</div>
                  </div>
                </div>
                
                {/* Performance Message */}
                <div className="mt-6 p-4 bg-black/50 border border-yellow-400/50 rounded-lg">
                  <div className="text-yellow-400 font-mono font-bold mb-2">
                    {myRank === 1 ? '🏆 CHAMPION!' :
                     myRank <= 3 ? '🏅 PODIUM FINISH!' :
                     myRank <= participants.length / 2 ? '⭐ STRONG PERFORMANCE!' :
                     '💪 GREAT EFFORT!'}
                  </div>
                  <div className="text-white font-mono text-sm">
                    {myRank === 1 ? 'Outstanding! You dominated this quiz!' :
                     myRank <= 3 ? 'Excellent work! You made it to the top!' :
                     myRank <= participants.length / 2 ? 'Well done! Above average performance!' :
                     'Keep practicing! Every quiz makes you better!'}
                  </div>
                </div>
                
                {/* Badges Display */}
                {myParticipant.badges && myParticipant.badges.length > 0 && (
                  <div className="mt-4">
                    <div className="text-purple-400 font-mono text-sm font-bold mb-2">ACHIEVEMENTS UNLOCKED</div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {myParticipant.badges.map((badge, index) => (
                        <span key={index} className="px-3 py-1 bg-purple-500/20 border border-purple-400 text-purple-300 font-mono text-xs font-bold rounded">
                          {badge.replace('-', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-400 rounded-2xl p-6 mb-8 shadow-2xl">
              <div className="text-cyan-400 font-mono font-bold mb-4 text-center">FINAL LEADERBOARD</div>
              
              {/* Top 3 Podium */}
              {sortedParticipants.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-6">
                  {/* 2nd Place */}
                  <div className="text-center">
                    <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <div className="bg-gray-400/20 border border-gray-400 rounded-lg p-3 h-20 flex flex-col justify-end">
                      <div className="text-gray-300 font-mono font-bold text-sm">{sortedParticipants[1]?.name}</div>
                      <div className="text-white font-mono text-lg">{sortedParticipants[1]?.score}</div>
                    </div>
                  </div>

                  {/* 1st Place */}
                  <div className="text-center">
                    <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-2 animate-bounce" />
                    <div className="bg-yellow-400/20 border border-yellow-400 rounded-lg p-4 h-24 flex flex-col justify-end">
                      <div className="text-yellow-300 font-mono font-bold">{sortedParticipants[0]?.name}</div>
                      <div className="text-white font-mono text-xl">{sortedParticipants[0]?.score}</div>
                    </div>
                  </div>

                  {/* 3rd Place */}
                  <div className="text-center">
                    <Star className="w-7 h-7 text-orange-400 mx-auto mb-2" />
                    <div className="bg-orange-400/20 border border-orange-400 rounded-lg p-3 h-16 flex flex-col justify-end">
                      <div className="text-orange-300 font-mono font-bold text-sm">{sortedParticipants[2]?.name}</div>
                      <div className="text-white font-mono">{sortedParticipants[2]?.score}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Full Rankings */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sortedParticipants.slice(0, 10).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                      participant.id === myParticipant.id
                        ? 'bg-cyan-400/20 border-cyan-400 shadow-lg'
                        : index === 0
                        ? 'bg-yellow-400/20 border-yellow-400'
                        : index === 1
                        ? 'bg-gray-400/20 border-gray-400'
                        : index === 2
                        ? 'bg-orange-400/20 border-orange-400'
                        : 'bg-gray-800/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-orange-400 text-black' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold">{participant.name}</div>
                        {participant.streak > 1 && (
                          <div className="text-orange-300 font-mono text-xs">🔥 {participant.streak} streak</div>
                        )}
                      </div>
                    </div>
                    <div className="text-white font-mono font-bold text-lg">
                      {participant.score.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Home Button */}
            <div className="text-center">
              <button
                onClick={onReturnHome}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white px-8 py-4 font-mono font-bold uppercase tracking-wider transition-all duration-300 rounded-lg transform hover:scale-105"
              >
                RETURN TO HOME
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // Question Results (interim)
    return (
      <div className="min-h-screen bg-black relative overflow-hidden">
        {/* Results background */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-900 via-black to-emerald-900">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,165,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,165,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>
        
        {/* Neon accent lines */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
        
        <div className="relative z-10 p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-4 font-mono tracking-tight">
                QUESTION RESULTS
              </h1>
              <div className="text-orange-400 font-mono text-lg font-bold tracking-wider">
                QUESTION ANALYSIS
              </div>
            </div>

            {/* Question and Correct Answer */}
            {currentQuestion && (
              <div className="bg-black/80 backdrop-blur-sm border border-green-400 rounded-2xl p-6 mb-8 shadow-2xl">
                <div className="text-green-400 font-mono font-bold mb-4">CORRECT ANSWER</div>
                <div className="text-white font-mono text-xl font-bold mb-4">{currentQuestion.question}</div>
                <div className="bg-green-500/20 border border-green-400 rounded-lg p-4">
                  <div className="text-green-300 font-mono font-bold text-lg flex items-center gap-2">
                    <Award className="w-6 h-6" />
                    {currentQuestion.options[currentQuestion.correctAnswer]}
                  </div>
                </div>
              </div>
            )}

            {/* Current Standings */}
            <div className="bg-black/80 backdrop-blur-sm border border-cyan-400 rounded-2xl p-6 shadow-2xl">
              <div className="text-cyan-400 font-mono font-bold mb-4 text-center">CURRENT STANDINGS</div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {sortedParticipants.slice(0, 10).map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${
                      participant.id === myParticipant.id
                        ? 'bg-cyan-400/20 border-cyan-400 shadow-lg'
                        : index === 0
                        ? 'bg-yellow-400/20 border-yellow-400'
                        : 'bg-gray-800/50 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-sm ${
                        index === 0 ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-mono font-bold">{participant.name}</div>
                        {participant.streak > 1 && (
                          <div className="text-orange-300 font-mono text-xs">🔥 {participant.streak} streak</div>
                        )}
                      </div>
                    </div>
                    <div className="text-white font-mono font-bold text-lg">
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
}; 