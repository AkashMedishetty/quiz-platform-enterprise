import React from 'react';
import { Users, Clock, QrCode, Smartphone } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  mobile: string;
  avatarColor: string;
  joinedAt: number;
}

interface BigScreenWaitingDisplayProps {
  quizTitle: string;
  quizDescription: string;
  accessCode: string;
  participants: Participant[];
  totalQuestions: number;
}

export const BigScreenWaitingDisplay: React.FC<BigScreenWaitingDisplayProps> = ({
  quizTitle,
  quizDescription,
  accessCode,
  participants,
  totalQuestions,
}) => {
  const joinUrl = `${window.location.origin}?join=${accessCode}`;
  
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:100px_100px]"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400 opacity-60 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
      
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      
      <div className="relative z-10 p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl sm:text-8xl font-black text-white mb-6 font-mono tracking-tight">
            QUIZ PLATFORM
          </h1>
          <div className="text-3xl sm:text-4xl text-cyan-400 font-mono font-bold tracking-wider mb-4">
            INTERACTIVE QUIZ PLATFORM
          </div>
          <div className="text-xl text-gray-400 font-mono">
            PROFESSIONAL CONFERENCE QUIZ SYSTEM
          </div>
        </div>

        {/* Quiz Information */}
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 mb-12">
          {/* Quiz Details */}
          <div className="bg-black/80 backdrop-blur-sm border-2 border-cyan-400 rounded-3xl p-8">
            <div className="text-cyan-400 font-mono font-bold text-xl mb-4">QUIZ SESSION</div>
            <h2 className="text-4xl font-black text-white mb-4 font-mono">{quizTitle}</h2>
            <p className="text-gray-300 font-mono text-lg mb-6">{quizDescription}</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/50 border border-gray-600 rounded-lg p-4 text-center">
                <div className="text-yellow-400 font-mono text-sm font-bold mb-1">QUESTIONS</div>
                <div className="text-white font-mono text-3xl font-black">{totalQuestions}</div>
              </div>
              <div className="bg-black/50 border border-gray-600 rounded-lg p-4 text-center">
                <div className="text-green-400 font-mono text-sm font-bold mb-1">PARTICIPANTS</div>
                <div className="text-white font-mono text-3xl font-black">{participants.length}</div>
              </div>
            </div>
          </div>

          {/* Join Instructions */}
          <div className="bg-black/80 backdrop-blur-sm border-2 border-purple-400 rounded-3xl p-8">
            <div className="text-purple-400 font-mono font-bold text-xl mb-6">HOW TO JOIN</div>
            
            {/* Access Code */}
            <div className="bg-black border-2 border-yellow-400 rounded-2xl p-6 mb-6">
              <div className="text-yellow-400 font-mono font-bold text-sm mb-2">ACCESS CODE</div>
              <div className="text-white font-mono text-6xl font-black text-center tracking-wider">
                {accessCode}
              </div>
            </div>
            
            {/* Instructions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center font-mono font-bold text-black">
                  1
                </div>
                <div className="text-white font-mono">
                  <Smartphone className="w-5 h-5 inline mr-2" />
                  Open your mobile device
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center font-mono font-bold text-black">
                  2
                </div>
                <div className="text-white font-mono">Navigate to: {window.location.origin}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-purple-400 rounded-full flex items-center justify-center font-mono font-bold text-black">
                  3
                </div>
                <div className="text-white font-mono">Enter access code: <span className="text-yellow-400 font-bold">{accessCode}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Waiting Status */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-black/80 backdrop-blur-sm border border-orange-400 rounded-2xl p-6">
            <div className="flex items-center justify-center gap-6">
              <div className="w-6 h-6 bg-orange-400 animate-pulse rounded-full"></div>
              <span className="text-orange-400 font-mono font-bold text-2xl tracking-wider">
                WAITING FOR HOST TO START QUIZ
              </span>
              <div className="w-6 h-6 bg-cyan-400 animate-pulse delay-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Participants Display */}
        {participants.length > 0 && (
          <div className="max-w-6xl mx-auto">
            <div className="bg-black/80 backdrop-blur-sm border border-green-400 rounded-3xl p-8">
              <div className="flex items-center justify-center gap-4 mb-8">
                <Users className="w-8 h-8 text-green-400" />
                <div className="text-green-400 font-mono font-bold text-2xl">
                  PARTICIPANTS ONLINE: {participants.length}
                </div>
              </div>
              
              {/* Participants Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 max-h-96 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="bg-black/50 border border-gray-600 rounded-lg p-4 text-center">
                    <div className={`w-16 h-16 ${participant.avatarColor} rounded-full flex items-center justify-center font-bold text-xl text-white mb-3 mx-auto`}>
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-white font-mono font-bold text-sm mb-1 truncate">
                      {participant.name}
                    </div>
                    <div className="text-gray-400 font-mono text-xs truncate">
                      {participant.mobile}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Join Animation */}
              <div className="mt-8 text-center">
                <div className="flex items-center justify-center gap-2 text-green-400 font-mono text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-75"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce delay-150"></div>
                  <span className="ml-2">PARTICIPANTS JOINING...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Participants Message */}
        {participants.length === 0 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-black/80 backdrop-blur-sm border border-gray-600 rounded-2xl p-12 text-center">
              <Users className="w-24 h-24 text-gray-600 mx-auto mb-6" />
              <div className="text-gray-400 font-mono text-xl font-bold mb-2">NO PARTICIPANTS YET</div>
              <div className="text-gray-500 font-mono">Participants will appear here as they join the quiz</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="text-gray-500 font-mono text-sm">
            © 2024 Purplehat Events | Professional Conference Technology Solutions
          </div>
        </div>
      </div>
    </div>
  );
}; 