import React from 'react';
import { Users, ArrowLeft } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  mobile: string;
  avatarColor: string;
}

interface ParticipantWaitingRoomProps {
  quizTitle: string;
  quizDescription: string;
  participantName: string;
  participantMobile: string;
  participants: Participant[];
  onBack: () => void;
}

export const ParticipantWaitingRoom: React.FC<ParticipantWaitingRoomProps> = ({
  quizTitle,
  quizDescription,
  participantName,
  participantMobile,
  participants,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Neon accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-2xl">
          {/* Quiz Ready Icon */}
          <div className="w-24 h-24 bg-black border-2 border-cyan-400 flex items-center justify-center mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-cyan-400/10 animate-pulse"></div>
            <Users className="w-12 h-12 text-cyan-400 relative z-10" />
          </div>
          
          {/* Status Title */}
          <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 font-mono tracking-tight">
            STANDBY MODE
          </h1>
          
          {/* Participant Status Card */}
          <div className="bg-black border border-cyan-400/50 p-6 mb-8">
            <div className="text-cyan-400 font-mono font-bold mb-2">PARTICIPANT STATUS</div>
            <div className="text-white font-mono text-xl font-black mb-4">{participantName}</div>
            <div className="text-gray-400 font-mono text-sm">MOBILE: {participantMobile}</div>
          </div>
          
          {/* Quiz Information Card */}
          <div className="bg-black border border-yellow-400/50 p-6 mb-8">
            <div className="text-yellow-400 font-mono font-bold mb-2">QUIZ SESSION</div>
            <div className="text-white font-mono text-2xl font-black mb-2">{quizTitle}</div>
            <div className="text-gray-400 font-mono text-sm">{quizDescription}</div>
          </div>
          
          {/* Waiting Status */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-4 h-4 bg-yellow-400 animate-pulse"></div>
            <span className="text-yellow-400 font-mono font-bold text-lg tracking-wider">
              WAITING FOR HOST TO START QUIZ
            </span>
            <div className="w-4 h-4 bg-cyan-400 animate-pulse delay-500"></div>
          </div>
          
          {/* Participants List */}
          {participants.length > 0 && (
            <div className="bg-black border border-purple-400/50 p-6 mb-8">
              <div className="text-purple-400 font-mono font-bold mb-4">
                PARTICIPANTS ONLINE: {participants.length}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
                {participants.slice(0, 12).map((participant) => (
                  <div key={participant.id} className="text-white font-mono text-sm p-2 bg-gray-800/50 border border-gray-600">
                    <div className={`w-8 h-8 ${participant.avatarColor} rounded-full flex items-center justify-center font-bold text-xs text-white mb-1 mx-auto`}>
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">{participant.name}</div>
                  </div>
                ))}
                {participants.length > 12 && (
                  <div className="text-gray-400 font-mono text-sm p-2 bg-gray-800/50 border border-gray-600 flex items-center justify-center">
                    +{participants.length - 12} more
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Connection Status */}
          <div className="bg-black border border-green-400/50 p-4 mb-8">
            <div className="flex items-center justify-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-mono font-bold text-sm tracking-wider">
                CONNECTED TO QUIZ SESSION
              </span>
            </div>
          </div>
          
          {/* Back Button */}
          <button
            onClick={onBack}
            className="bg-black border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white px-6 py-3 font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-4 h-4" />
            LEAVE QUIZ
          </button>
          
          {/* Help Text */}
          <div className="text-center mt-8">
            <p className="text-gray-500 font-mono text-xs">
              Stay on this page. The quiz will start automatically when the host begins.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}; 