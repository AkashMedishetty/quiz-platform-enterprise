import React, { useState, useEffect } from 'react';
import { Users, Trophy, Clock, Target, Eye, Play, Pause, SkipForward, Settings, Download, Monitor, Smartphone, Tablet, TrendingUp, Activity, Award, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LiveQuiz {
  id: string;
  title: string;
  description: string;
  access_code: string;
  host_id: string;
  is_active: boolean;
  is_finished: boolean;
  current_question_index: number;
  show_results: boolean;
  created_at: string;
  updated_at: string;
  participant_count: number;
  question_count: number;
  average_score: number;
  completion_rate: number;
}

interface LiveQuizDashboardProps {
  onSelectQuiz: (quizId: string, accessCode: string) => void;
  onCreateNew: () => void;
  onBack: () => void;
}

export const LiveQuizDashboard: React.FC<LiveQuizDashboardProps> = ({
  onSelectQuiz,
  onCreateNew,
  onBack,
}) => {
  const [liveQuizzes, setLiveQuizzes] = useState<LiveQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const loadLiveQuizzes = async () => {
    try {
      setError(null);
      
      // SIMPLIFIED: Get basic quiz info only - NO ANALYTICS to prevent API flooding
      const { data: quizzes, error: quizzesError } = await supabase
        .from('quiz_sessions')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(20); // Limit results

      if (quizzesError) throw quizzesError;

      // Basic quiz list with minimal processing
      const quizzesWithAnalytics: LiveQuiz[] = (quizzes || []).map((quiz) => ({
        ...quiz,
        participant_count: 0, // Will be loaded on-demand
        question_count: 0,    // Will be loaded on-demand
        average_score: 0,     // Will be loaded on-demand
        completion_rate: 0,   // Will be loaded on-demand
      }));

      setLiveQuizzes(quizzesWithAnalytics);
    } catch (err) {
      console.error('Error loading live quizzes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load live quizzes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveQuizzes();
    
    // DISABLED: Stop API flooding - refresh only on user action
    // const interval = setInterval(loadLiveQuizzes, 10000);
    // setRefreshInterval(interval);
    
    return () => {
      // Cleanup removed since auto-refresh is disabled
    };
  }, []);

  const getQuizStatus = (quiz: LiveQuiz) => {
    if (quiz.is_finished) return { text: 'Finished', color: 'text-red-400', bg: 'bg-red-400/20' };
    if (quiz.current_question_index >= 0) return { text: 'In Progress', color: 'text-green-400', bg: 'bg-green-400/20' };
    if (quiz.is_active) return { text: 'Live - Waiting', color: 'text-yellow-400', bg: 'bg-yellow-400/20' };
    return { text: 'Not Active', color: 'text-gray-400', bg: 'bg-gray-400/20' };
  };

  const getDeviceIcon = () => {
    const userAgent = navigator.userAgent;
    if (/Mobile|Android|iPhone/.test(userAgent)) {
      return <Smartphone className="w-4 h-4 text-gray-400" />;
    } else if (/Tablet|iPad/.test(userAgent)) {
      return <Tablet className="w-4 h-4 text-gray-400" />;
    }
    return <Monitor className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-pulse" />
          <div className="text-2xl font-black text-white mb-4 font-mono">LOADING LIVE QUIZZES</div>
          <div className="text-cyan-400 font-mono">SCANNING FOR ACTIVE SESSIONS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Neon accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
      
      <div className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 font-mono tracking-tight">
                LIVE QUIZ DASHBOARD
              </h1>
              <div className="flex items-center gap-3 text-cyan-400 font-mono text-lg">
                <Activity className="w-5 h-5 animate-pulse" />
                <span className="font-bold tracking-wider">REAL-TIME MONITORING</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onCreateNew}
                className="bg-green-500 hover:bg-green-400 text-white px-6 py-3 font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                CREATE NEW QUIZ
              </button>
              <button
                onClick={loadLiveQuizzes}
                className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                REFRESH
              </button>
              <button
                onClick={onBack}
                className="bg-black border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white px-6 py-3 font-mono font-bold uppercase tracking-wider transition-colors"
              >
                BACK TO HOME
              </button>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-500/20 border border-red-500 p-4 mb-8">
              <div className="text-red-400 font-mono font-bold">ERROR: {error}</div>
            </div>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <div className="bg-black border border-cyan-400/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-6 h-6 text-cyan-400" />
                <span className="text-cyan-400 font-mono font-bold text-sm">LIVE QUIZZES</span>
              </div>
              <div className="text-3xl font-black text-white">{liveQuizzes.length}</div>
            </div>
            
            <div className="bg-black border border-green-400/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-6 h-6 text-green-400" />
                <span className="text-green-400 font-mono font-bold text-sm">TOTAL PARTICIPANTS</span>
              </div>
              <div className="text-3xl font-black text-white">
                {liveQuizzes.reduce((sum, quiz) => sum + quiz.participant_count, 0).toLocaleString()}
              </div>
            </div>
            
            <div className="bg-black border border-purple-400/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Play className="w-6 h-6 text-purple-400" />
                <span className="text-purple-400 font-mono font-bold text-sm">IN PROGRESS</span>
              </div>
              <div className="text-3xl font-black text-white">
                {liveQuizzes.filter(quiz => quiz.current_question_index >= 0 && !quiz.is_finished).length}
              </div>
            </div>
            
            <div className="bg-black border border-orange-400/50 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-6 h-6 text-orange-400" />
                <span className="text-orange-400 font-mono font-bold text-sm">AVG SCORE</span>
              </div>
              <div className="text-3xl font-black text-white">
                {liveQuizzes.length > 0 
                  ? Math.round(liveQuizzes.reduce((sum, quiz) => sum + quiz.average_score, 0) / liveQuizzes.length).toLocaleString()
                  : 0
                }
              </div>
            </div>
          </div>

          {/* Live Quizzes Grid */}
          {liveQuizzes.length === 0 ? (
            <div className="text-center py-16">
              <Activity className="w-24 h-24 text-gray-600 mx-auto mb-6 animate-pulse" />
              <div className="text-3xl sm:text-4xl font-black text-gray-400 mb-4 font-mono tracking-wider">NO LIVE QUIZZES FOUND</div>
              <div className="text-gray-500 font-mono text-lg mb-8">CREATE A NEW QUIZ TO GET STARTED</div>
              <button
                onClick={onCreateNew}
                className="bg-green-500 hover:bg-green-400 text-white px-8 py-4 font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-2 mx-auto"
              >
                <Play className="w-5 h-5" />
                CREATE YOUR FIRST QUIZ
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {liveQuizzes.map((quiz) => {
                const status = getQuizStatus(quiz);
                
                return (
                  <div
                    key={quiz.id}
                    className="bg-black border border-gray-600 hover:border-cyan-400 p-6 transition-all duration-300 cursor-pointer transform hover:scale-105"
                    onClick={() => onSelectQuiz(quiz.id, quiz.access_code)}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-black text-white mb-2 font-mono">{quiz.title}</h3>
                        <div className="text-gray-400 font-mono text-sm mb-3">{quiz.description}</div>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="bg-black border border-cyan-400 px-3 py-1">
                            <div className="text-cyan-400 font-mono text-xs font-bold">SESSION CODE</div>
                            <div className="text-white font-mono text-lg font-black">{quiz.access_code}</div>
                          </div>
                          
                          <div className={`px-3 py-1 border ${status.bg} ${status.color}`}>
                            <div className="font-mono text-xs font-bold">{status.text}</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-gray-400 font-mono text-xs mb-1">CREATED</div>
                        <div className="text-white font-mono text-sm">
                          {new Date(quiz.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    {/* Analytics */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-black border border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Users className="w-4 h-4 text-blue-400" />
                          <span className="text-blue-400 font-mono text-xs font-bold">PARTICIPANTS</span>
                        </div>
                        <div className="text-white font-mono text-xl font-black">{quiz.participant_count.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-black border border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-green-400" />
                          <span className="text-green-400 font-mono text-xs font-bold">QUESTIONS</span>
                        </div>
                        <div className="text-white font-mono text-xl font-black">{quiz.question_count}</div>
                      </div>
                      
                      <div className="bg-black border border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="w-4 h-4 text-yellow-400" />
                          <span className="text-yellow-400 font-mono text-xs font-bold">AVG SCORE</span>
                        </div>
                        <div className="text-white font-mono text-xl font-black">{quiz.average_score.toLocaleString()}</div>
                      </div>
                      
                      <div className="bg-black border border-gray-700 p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Award className="w-4 h-4 text-purple-400" />
                          <span className="text-purple-400 font-mono text-xs font-bold">COMPLETION</span>
                        </div>
                        <div className="text-white font-mono text-xl font-black">{quiz.completion_rate}%</div>
                      </div>
                    </div>

                    {/* Progress */}
                    {quiz.current_question_index >= 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 font-mono text-xs font-bold">PROGRESS</span>
                          <span className="text-white font-mono text-sm">
                            {quiz.current_question_index + 1}/{quiz.question_count}
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 transition-all duration-500"
                            style={{ width: `${((quiz.current_question_index + 1) / quiz.question_count) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/big-screen/${quiz.access_code}`, '_blank');
                        }}
                        className="flex-1 bg-purple-500 hover:bg-purple-400 text-white px-3 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                        <Monitor className="w-3 h-3" />
                        BIG SCREEN
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectQuiz(quiz.id, quiz.access_code);
                        }}
                        className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                      >
                        <Settings className="w-3 h-3" />
                        MANAGE
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};