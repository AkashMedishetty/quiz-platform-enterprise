import React from 'react';
import { Users, Smartphone, Tablet, Monitor, Trophy, Award, Zap, Target } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  mobile: string;
  score: number;
  streak: number;
  badges: string[];
  avatarColor?: string;
  joinedAt: number;
  lastSeen: string;
  answers: { [questionId: string]: any };
}

interface LiveLeaderboardProps {
  participants: Participant[];
  totalQuestions: number;
  averageScore: number;
  participationRate: number;
  loading?: boolean;
}

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({
  participants,
  totalQuestions,
  averageScore,
  participationRate,
  loading = false
}) => {
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);

  // Get device type icons for participants
  const getDeviceIcon = (lastSeen: string) => {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return <Smartphone className="w-3 h-3 text-gray-400" />;
    } else if (/Tablet|iPad/.test(userAgent)) {
      return <Tablet className="w-3 h-3 text-gray-400" />;
    }
    return <Monitor className="w-3 h-3 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-white">Live Leaderboard</h3>
          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin"></div>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 font-mono text-sm">Loading participants...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-white">Live Leaderboard</h3>
        <div className="text-sm text-gray-400 font-mono">
          TOP {Math.min(10, sortedParticipants.length)} OF {participants.length.toLocaleString()}
        </div>
      </div>
      
      {sortedParticipants.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <div className="text-gray-400 font-mono text-sm">NO PARTICIPANTS YET</div>
          <div className="text-gray-500 font-mono text-xs mt-1">WAITING FOR PLAYERS TO JOIN...</div>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sortedParticipants.slice(0, 10).map((participant, index) => (
            <div 
              key={participant.id} 
              className={`flex justify-between items-center p-3 rounded-lg border transition-all duration-300 ${
                index === 0 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-400/50 shadow-lg' 
                  : index === 1
                  ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/50'
                  : index === 2
                  ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border-orange-400/50'
                  : 'bg-gray-800/50 border-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg' :
                  index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' :
                  index === 2 ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black' :
                  'bg-gray-600 text-white'
                }`}>
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-medium text-sm sm:text-base">{participant.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs">
                    {getDeviceIcon(participant.lastSeen)}
                    <span className="text-gray-400 font-mono">{participant.mobile}</span>
                    {participant.badges.length > 0 && (
                      <div className="flex gap-1">
                        {participant.badges.slice(0, 2).map(badge => (
                          <span key={badge} className="px-1 py-0.5 bg-blue-500/20 rounded text-blue-300 text-xs font-mono">
                            {badge.split('-')[0]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-base sm:text-lg">{participant.score.toLocaleString()}</div>
                <div className="text-gray-400 text-xs font-mono">
                  {Object.keys(participant.answers).length}/{totalQuestions} answered
                </div>
                {participant.streak > 1 && (
                  <div className="text-orange-300 text-xs font-bold">🔥{participant.streak}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Quick Stats */}
      {sortedParticipants.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-600">
          <div className="text-center">
            <div className="text-lg font-bold text-white">{Math.round(averageScore).toLocaleString()}</div>
            <div className="text-xs text-gray-400 font-mono">AVG SCORE</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{Math.round(participationRate)}%</div>
            <div className="text-xs text-gray-400 font-mono">PARTICIPATION</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-white">{sortedParticipants.filter(p => p.streak > 1).length}</div>
            <div className="text-xs text-gray-400 font-mono">ON STREAK</div>
          </div>
        </div>
      )}

      {/* Top Performer Highlights */}
      {sortedParticipants.length >= 3 && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-sm text-gray-400 font-mono mb-2">TOP PERFORMERS</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            {sortedParticipants.slice(0, 3).map((participant, index) => (
              <div key={participant.id} className="text-center">
                <div className={`text-xs font-bold ${
                  index === 0 ? 'text-yellow-400' :
                  index === 1 ? 'text-gray-400' :
                  'text-orange-400'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {participant.name}
                </div>
                <div className="text-white font-mono">{participant.score}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievement Overview */}
      {sortedParticipants.some(p => p.badges.length > 0) && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <div className="text-sm text-gray-400 font-mono mb-2">ACHIEVEMENTS EARNED</div>
          <div className="flex flex-wrap gap-1">
            {Array.from(
              new Set(
                sortedParticipants
                  .flatMap(p => p.badges)
                  .slice(0, 6)
              )
            ).map(badge => (
              <span key={badge} className="px-2 py-1 bg-purple-500/20 border border-purple-400/50 rounded text-purple-300 text-xs font-mono">
                {badge.replace('-', ' ').toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 