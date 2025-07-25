import React, { useState } from 'react';
import { Users, Crown, Zap, Trophy, Clock, Target, Shield, BarChart3, ArrowRight, Play, Settings, Database, Cpu, Network, Terminal } from 'lucide-react';

interface LandingPageProps {
  onSelectRole: (role: 'host' | 'participant') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectRole }) => {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Neon accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      <div className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute right-0 top-0 w-1 h-full bg-gradient-to-b from-transparent via-purple-400 to-transparent"></div>
      
      {/* Floating tech elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-cyan-400 opacity-20 animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl w-full">
          {/* Header Section */}
          <div className="text-center mb-16 lg:mb-24">
            <div className="inline-flex items-center justify-center w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-black border-2 border-cyan-400 rounded-none mb-8 lg:mb-12 relative">
              <div className="absolute inset-0 bg-cyan-400/10 animate-pulse"></div>
              <Terminal className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 text-cyan-400 relative z-10" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-400 animate-ping"></div>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black text-white mb-6 lg:mb-8 tracking-tight">
              QUIZ
              <span className="block text-cyan-400 text-4xl sm:text-5xl lg:text-7xl mt-2">PLATFORM</span>
            </h1>
            
            <div className="inline-flex items-center gap-3 bg-black border border-cyan-400/30 px-6 py-3 mb-8">
              <div className="w-2 h-2 bg-green-400 animate-pulse"></div>
              <span className="text-cyan-400 font-mono text-sm uppercase tracking-wider">REAL-TIME MULTI-DEVICE PLATFORM</span>
              <div className="w-2 h-2 bg-purple-400 animate-pulse"></div>
            </div>
            
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed font-mono">
              PROFESSIONAL INTERACTIVE QUIZ PLATFORM FOR CONFERENCES, CORPORATE EVENTS, AND COMPETITIONS.
              <span className="block mt-2 text-cyan-400">DELIVERING ENGAGING EXPERIENCES WITH ADVANCED SCORING AND REAL-TIME SYNCHRONIZATION.</span>
            </p>
          </div>
          
          {/* Role Selection Cards */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 max-w-6xl mx-auto mb-16 lg:mb-24">
            <button
              onClick={() => onSelectRole('host')}
              onMouseEnter={() => setHoveredCard('host')}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative bg-black border-2 border-orange-500/50 hover:border-orange-400 transition-all duration-300 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-orange-500/5 group-hover:bg-orange-500/10 transition-all duration-300"></div>
              <div className="relative z-10 p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-black border-2 border-orange-400 flex items-center justify-center transition-all duration-300 ${hoveredCard === 'host' ? 'rotate-45' : ''}`}>
                    <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-orange-400 font-mono text-sm mb-1">ROLE_01</div>
                    <div className="text-white font-mono text-xs">ADMINISTRATOR</div>
                  </div>
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">QUIZ HOST</h2>
                
                <p className="text-gray-300 text-base sm:text-lg lg:text-xl mb-8 font-mono leading-relaxed">
                  CREATE AND MANAGE INTERACTIVE QUIZZES WITH REAL-TIME CONTROL, ADVANCED ANALYTICS, AND PROFESSIONAL PRESENTATION FEATURES
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-orange-400/50 flex items-center justify-center mb-2">
                      <Settings className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="text-orange-400 font-mono text-xs uppercase">BUILDER</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-orange-400/50 flex items-center justify-center mb-2">
                      <Play className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="text-orange-400 font-mono text-xs uppercase">CONTROL</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-orange-400/50 flex items-center justify-center mb-2">
                      <BarChart3 className="w-6 h-6 text-orange-400" />
                    </div>
                    <div className="text-orange-400 font-mono text-xs uppercase">ANALYTICS</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-orange-400 font-mono text-sm">INITIALIZE_SESSION</div>
                  <ArrowRight className="w-6 h-6 text-orange-400 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
            </button>
            
            <button
              onClick={() => onSelectRole('participant')}
              onMouseEnter={() => setHoveredCard('participant')}
              onMouseLeave={() => setHoveredCard(null)}
              className="group relative bg-black border-2 border-cyan-500/50 hover:border-cyan-400 transition-all duration-300 transform hover:scale-105"
            >
              <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-all duration-300"></div>
              <div className="relative z-10 p-8 lg:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 bg-black border-2 border-cyan-400 flex items-center justify-center transition-all duration-300 ${hoveredCard === 'participant' ? '-rotate-45' : ''}`}>
                    <Users className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400" />
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-mono text-sm mb-1">ROLE_02</div>
                    <div className="text-white font-mono text-xs">COMPETITOR</div>
                  </div>
                </div>
                
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6 tracking-tight">PARTICIPANT</h2>
                
                <p className="text-gray-300 text-base sm:text-lg lg:text-xl mb-8 font-mono leading-relaxed">
                  JOIN THE QUIZ COMPETITION WITH REAL-TIME SCORING, ACHIEVEMENTS, AND AN ENGAGING INTERACTIVE EXPERIENCE ACROSS ALL DEVICES
                </p>
                
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-cyan-400/50 flex items-center justify-center mb-2">
                      <Network className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-cyan-400 font-mono text-xs uppercase">SYNC</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-cyan-400/50 flex items-center justify-center mb-2">
                      <Trophy className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-cyan-400 font-mono text-xs uppercase">COMPETE</div>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-black border border-cyan-400/50 flex items-center justify-center mb-2">
                      <Target className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="text-cyan-400 font-mono text-xs uppercase">ACHIEVE</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-cyan-400 font-mono text-sm">JOIN_SESSION</div>
                  <ArrowRight className="w-6 h-6 text-cyan-400 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
              </div>
            </button>
          </div>
          
          {/* Tech Specs */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-6xl mx-auto mb-16">
            <div className="text-center group">
              <div className="w-16 h-16 bg-black border border-cyan-400/50 flex items-center justify-center mx-auto mb-4 group-hover:border-cyan-400 transition-colors duration-300">
                <Clock className="w-8 h-8 text-cyan-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-2 font-mono">REAL-TIME SYNC</h3>
              <p className="text-gray-400 text-sm font-mono">INSTANT SYNCHRONIZATION ACROSS ALL DEVICES AND PLATFORMS</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-black border border-purple-400/50 flex items-center justify-center mx-auto mb-4 group-hover:border-purple-400 transition-colors duration-300">
                <Cpu className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-2 font-mono">SMART SCORING</h3>
              <p className="text-gray-400 text-sm font-mono">ADVANCED SCORING WITH SPEED BONUSES AND STREAK MULTIPLIERS</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-black border border-green-400/50 flex items-center justify-center mx-auto mb-4 group-hover:border-green-400 transition-colors duration-300">
                <Trophy className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-2 font-mono">ACHIEVEMENTS</h3>
              <p className="text-gray-400 text-sm font-mono">UNLOCK BADGES AND COMPETE ON DYNAMIC LEADERBOARDS</p>
            </div>
            <div className="text-center group">
              <div className="w-16 h-16 bg-black border border-orange-400/50 flex items-center justify-center mx-auto mb-4 group-hover:border-orange-400 transition-colors duration-300">
                <Database className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mb-2 font-mono">ANALYTICS</h3>
              <p className="text-gray-400 text-sm font-mono">COMPREHENSIVE INSIGHTS AND DETAILED PERFORMANCE METRICS</p>
            </div>
          </div>
          
          {/* System Status */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="bg-black border border-green-400/30 p-6 lg:p-8">
              <h2 className="text-2xl lg:text-3xl font-black text-white mb-6 text-center font-mono">MULTI-EVENT CONFERENCE PLATFORM</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-black border border-green-400/50 flex items-center justify-center mx-auto mb-3">
                    <Network className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 font-mono">MULTIPLE SESSIONS</h3>
                  <p className="text-green-400 text-sm font-mono">HOST MULTIPLE QUIZ SESSIONS SIMULTANEOUSLY FOR DIFFERENT CONFERENCE TRACKS</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-black border border-green-400/50 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 font-mono">UNLIMITED PARTICIPANTS</h3>
                  <p className="text-green-400 text-sm font-mono">SCALE TO HUNDREDS OF PARTICIPANTS ACROSS MULTIPLE DEVICES AND LOCATIONS</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-black border border-green-400/50 flex items-center justify-center mx-auto mb-3">
                    <BarChart3 className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-black text-white mb-2 font-mono">EVENT ANALYTICS</h3>
                  <p className="text-green-400 text-sm font-mono">COMPREHENSIVE ANALYTICS AND REPORTING FOR ALL YOUR CONFERENCE EVENTS</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div className="text-center">
            <div className="inline-flex items-center gap-4 bg-black border border-green-400 px-8 lg:px-12 py-4 lg:py-6">
              <div className="w-4 h-4 bg-green-400 animate-pulse"></div>
              <span className="text-green-400 font-black text-lg lg:text-xl font-mono tracking-wider">PLATFORM READY</span>
              <div className="w-4 h-4 bg-cyan-400 animate-pulse delay-500"></div>
            </div>
            <p className="text-gray-400 text-sm mt-6 max-w-md mx-auto font-mono">
              POWERED BY REAL-TIME DATABASE TECHNOLOGY FOR SEAMLESS MULTI-DEVICE EXPERIENCES
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};