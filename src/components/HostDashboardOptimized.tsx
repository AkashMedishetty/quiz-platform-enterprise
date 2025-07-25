import React, { useState, useEffect, useMemo } from 'react';
import { Download, Trophy, FileText, Database, BarChart3, Users } from 'lucide-react';
import { useOptimizedSupabaseQuiz } from '../hooks/useOptimizedSupabaseQuiz';
import { TemplateManager } from './TemplateManager';
import { QuestionManager } from './host/QuestionManager';
import { QuizControls } from './host/QuizControls';
import { LiveLeaderboard } from './host/LiveLeaderboard';
import { HostHeader } from './host/HostHeader';
import { supabase } from '../lib/supabase';
import { Question, QuizSettings } from '../types';
import { EnhancedExportManager } from '../lib/exportUtils';

interface HostDashboardOptimizedProps {
  sessionId: string;
  displayCode: string;
  hostId: string;
  onBack: () => void;
}

interface SettingsModalProps {
  settings: QuizSettings;
  onUpdateSettings: (settings: Partial<QuizSettings>) => Promise<void>;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdateSettings, onClose }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Quiz Settings</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-white font-medium mb-2">Quiz Title</label>
          <input
            type="text"
            value={settings.title}
            onChange={(e) => onUpdateSettings({ title: e.target.value })}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        
        <div>
          <label className="block text-white font-medium mb-2">Description</label>
          <textarea
            value={settings.description}
            onChange={(e) => onUpdateSettings({ description: e.target.value })}
            className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 h-24"
          />
        </div>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-white font-medium mb-2">Default Time Limit (seconds)</label>
            <input
              type="number"
              value={settings.defaultTimeLimit}
              onChange={(e) => onUpdateSettings({ defaultTimeLimit: parseInt(e.target.value) || 30 })}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="5"
              max="300"
            />
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Points per Question</label>
            <input
              type="number"
              value={settings.pointsPerQuestion}
              onChange={(e) => onUpdateSettings({ pointsPerQuestion: parseInt(e.target.value) || 100 })}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="10"
              max="1000"
            />
          </div>
        </div>
        
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Scoring Options</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.speedBonus}
                onChange={(e) => onUpdateSettings({ speedBonus: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-white">Speed Bonus</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.streakBonus}
                onChange={(e) => onUpdateSettings({ streakBonus: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-white">Streak Bonus</span>
            </label>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Quiz Options</h3>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowLateJoining}
                onChange={(e) => onUpdateSettings({ allowLateJoining: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-white">Allow Late Joining</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.shuffleQuestions}
                onChange={(e) => onUpdateSettings({ shuffleQuestions: e.target.checked })}
                className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
              />
              <span className="text-white">Shuffle Questions</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex gap-3 mt-8">
        <button
          onClick={onClose}
          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-colors"
        >
          Save Settings
        </button>
        <button
          onClick={onClose}
          className="px-6 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
);

export const HostDashboardOptimized: React.FC<HostDashboardOptimizedProps> = ({
  sessionId,
  displayCode,
  hostId,
  onBack,
}) => {
  const {
    quizState,
    loading,
    error,
    addQuestion,
    startQuestion,
    showResults,
    makeLive,
    startQuiz,
    finishQuiz,
    updateQuizSettings,
    forceRefresh,
    isConnected,
  } = useOptimizedSupabaseQuiz(sessionId);

  const [showSettings, setShowSettings] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Calculate current question and stats
  const currentQuestion = useMemo(() => {
    return quizState.questions[quizState.currentQuestionIndex];
  }, [quizState.questions, quizState.currentQuestionIndex]);

  const topPerformers = useMemo(() => {
    return [...quizState.participants]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [quizState.participants]);

  // Initialize the enhanced export manager
  const exportManager = useMemo(() => {
    return new EnhancedExportManager(quizState);
  }, [quizState]);

  // Timer effect for current question
  useEffect(() => {
    if (quizState.isActive && quizState.currentQuestionStartTime && !quizState.showResults && currentQuestion) {
      const startTime = quizState.currentQuestionStartTime;
      const timeLimit = (currentQuestion.timeLimit || 30) * 1000;
      
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

  // Handler functions
  const handleUpdateDisplayCode = async (code: string) => {
    try {
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ access_code: code })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Force refresh the quiz data to get the updated access code
      await forceRefresh();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ✅ ACCESS CODE UPDATED!<br/>
          <small style="opacity: 0.9;">New code: ${code}</small>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
      
    } catch (error) {
      console.error('Failed to update session code:', error);
      throw error;
    }
  };

  const handleShareLink = () => {
    const currentAccessCode = (quizState as any).accessCode || displayCode;
    const participantLink = currentAccessCode 
      ? `${window.location.origin}?participant=${currentAccessCode}` 
      : `${window.location.origin}?join=${sessionId}`;
    
    navigator.clipboard.writeText(participantLink).then(() => {
      // Create notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          ✅ PARTICIPANT LINK COPIED!<br/>
          <small style="opacity: 0.9;">Share: ${participantLink}</small>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }).catch(() => {
      alert('Participant link: ' + participantLink);
    });
  };

  const handleShareBigScreen = () => {
    const currentAccessCode = (quizState as any).accessCode || displayCode;
    const bigScreenLink = `${window.location.origin}/big-screen/${currentAccessCode}`;
    
    navigator.clipboard.writeText(bigScreenLink).then(() => {
      // Create notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="position: fixed; top: 20px; right: 20px; background: #8B5CF6; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
          📺 BIG SCREEN LINK COPIED!<br/>
          <small style="opacity: 0.9;">Share: ${bigScreenLink}</small>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
    }).catch(() => {
      alert('Big screen link: ' + bigScreenLink);
    });
  };

  const handleOpenBigScreen = () => {
    const currentAccessCode = (quizState as any).accessCode || displayCode;
    window.open(`/big-screen/${currentAccessCode}`, '_blank');
  };

  const handleLoadTemplate = (templateQuestions: Question[], templateSettings: QuizSettings) => {
    alert('Template loading functionality will be implemented');
  };

  const handleCreateSessionFromTemplate = (sessionId: string) => {
    window.location.href = `/host/${sessionId}`;
  };

  // Enhanced Export Functions
  const handleQuickExport = () => {
    exportManager.quickExportResults();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        📊 QUICK EXPORT COMPLETE!<br/>
        <small style="opacity: 0.9;">Results with analytics exported</small>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleFullExport = () => {
    exportManager.fullExportWithDetails();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        📋 FULL EXPORT COMPLETE!<br/>
        <small style="opacity: 0.9;">Complete data with answer details</small>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleParticipantsExport = () => {
    exportManager.exportParticipantsOnly();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        👥 PARTICIPANTS EXPORTED!<br/>
        <small style="opacity: 0.9;">Participant list with institutes</small>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleQuestionAnalyticsExport = () => {
    exportManager.exportQuestionAnalytics();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        📈 ANALYTICS EXPORTED!<br/>
        <small style="opacity: 0.9;">Question performance report</small>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  const handleJSONExport = () => {
    exportManager.exportToJSON();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        💾 JSON EXPORT COMPLETE!<br/>
        <small style="opacity: 0.9;">Raw data in JSON format</small>
      </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 3000);
  };

  // Final Results View with Enhanced Export Options
  if (quizState.showResults && quizState.isFinished) {
    const sortedParticipants = [...quizState.participants].sort((a, b) => b.score - a.score);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-3xl p-6 sm:p-8 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-4 mb-2">
                  <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400" />
                  Final Results
                </h1>
                <p className="text-gray-300 text-lg">{quizState.quizSettings.title}</p>
                <p className="text-sm text-purple-300">Powered by Purplehat Events</p>
              </div>
              
              {/* Enhanced Export Options */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleQuickExport}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Download className="w-4 h-4" />
                    Quick Export
                  </button>
                  <button
                    onClick={handleFullExport}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
                  >
                    <Database className="w-4 h-4" />
                    Full Export
                  </button>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleParticipantsExport}
                    className="bg-purple-500 hover:bg-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <Users className="w-4 h-4" />
                    Participants
                  </button>
                  <button
                    onClick={handleQuestionAnalyticsExport}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <BarChart3 className="w-4 h-4" />
                    Analytics
                  </button>
                  <button
                    onClick={handleJSONExport}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    JSON
                  </button>
                  <button
                    onClick={onBack}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    New Quiz
                  </button>
                </div>
              </div>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-blue-400 mb-1">
                  {quizState.participants.length}
                </div>
                <div className="text-sm text-blue-300">Participants</div>
              </div>
              <div className="bg-green-500/20 border border-green-400/30 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-green-400 mb-1">
                  {quizState.questions.length}
                </div>
                <div className="text-sm text-green-300">Questions</div>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-yellow-400 mb-1">
                  {Math.round(quizState.statistics.averageScore)}
                </div>
                <div className="text-sm text-yellow-300">Avg Score</div>
              </div>
              <div className="bg-purple-500/20 border border-purple-400/30 rounded-xl p-4 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">
                  {Math.max(...sortedParticipants.map(p => p.score), 0)}
                </div>
                <div className="text-sm text-purple-300">High Score</div>
              </div>
            </div>

            {/* Top 3 Winners */}
            {sortedParticipants.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Top 3 Winners
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {sortedParticipants.slice(0, 3).map((participant, index) => (
                    <div
                      key={participant.id}
                      className={`relative overflow-hidden rounded-xl p-6 text-center ${
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-400'
                          : index === 1
                          ? 'bg-gradient-to-br from-gray-400/20 to-gray-600/20 border-2 border-gray-400'
                          : 'bg-gradient-to-br from-orange-400/20 to-orange-600/20 border-2 border-orange-400'
                      }`}
                    >
                      <div className={`text-4xl mb-2 ${index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}`}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1">{participant.name}</h3>
                      <p className="text-sm text-gray-300 mb-1">{participant.mobile}</p>
                      <p className="text-sm text-gray-400 mb-3">{participant.institute || 'Institute not specified'}</p>
                      <div className={`text-2xl font-bold mb-2 ${
                        index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-orange-400'
                      }`}>
                        {participant.score}
                      </div>
                      <div className="text-sm text-gray-400">points</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Participants */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">All Participants</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-600">
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Rank</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Mobile</th>
                      <th className="text-left py-3 px-4 text-gray-300 font-medium">Institute</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-medium">Score</th>
                      <th className="text-right py-3 px-4 text-gray-300 font-medium">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedParticipants.map((participant, index) => (
                      <tr key={participant.id} className="border-b border-gray-700/50 hover:bg-gray-800/30">
                        <td className="py-3 px-4">
                          <span className={`font-bold ${
                            index === 0 ? 'text-yellow-400' : 
                            index === 1 ? 'text-gray-300' : 
                            index === 2 ? 'text-orange-400' : 'text-white'
                          }`}>
                            #{index + 1}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{participant.name}</td>
                        <td className="py-3 px-4 text-gray-300">{participant.mobile}</td>
                        <td className="py-3 px-4 text-gray-400">{participant.institute || 'Not specified'}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-cyan-400 font-bold">{participant.score}</span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-orange-400">{participant.streak > 1 ? `🔥 ${participant.streak}` : '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && quizState.questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono text-sm">LOADING QUIZ DATA...</p>
          <p className="text-gray-500 font-mono text-xs mt-2">Session: {sessionId}</p>
          <div className="mt-4">
            <button
              onClick={forceRefresh}
              className="text-green-400 hover:text-green-300 font-mono text-xs underline mr-4"
            >
              FORCE RELOAD
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-orange-400 hover:text-orange-300 font-mono text-xs underline"
            >
              REFRESH PAGE
            </button>
          </div>
          {!isConnected && (
            <p className="text-red-400 font-mono text-xs mt-2">⚠ REAL-TIME CONNECTION LOST</p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-300 mb-4">Error Loading Quiz</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={forceRefresh}
              className="bg-yellow-500 hover:bg-yellow-600 text-black px-4 py-2 rounded transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onBack}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          settings={quizState.quizSettings}
          onUpdateSettings={updateQuizSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <HostHeader
          quizTitle={quizState.quizSettings.title}
          displayCode={(quizState as any).accessCode || displayCode}
          participantCount={quizState.statistics.totalParticipants}
          onUpdateTitle={(title) => updateQuizSettings({ title })}
          onUpdateDisplayCode={handleUpdateDisplayCode}
          onShareLink={handleShareLink}
          onShareBigScreen={handleShareBigScreen}
          onOpenBigScreen={handleOpenBigScreen}
          onShowTemplates={() => setShowTemplates(!showTemplates)}
          onShowSettings={() => setShowSettings(true)}
          onRefresh={forceRefresh}
          onBack={onBack}
          loading={loading}
        />

        <div className="grid xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Question Management */}
          <div className={`${showTemplates ? 'xl:col-span-1' : 'xl:col-span-2'}`}>
            <QuestionManager
              questions={quizState.questions}
              currentQuestionIndex={quizState.currentQuestionIndex}
              isQuizActive={quizState.isActive}
              defaultTimeLimit={quizState.quizSettings.defaultTimeLimit}
              defaultPoints={quizState.quizSettings.pointsPerQuestion}
              onAddQuestion={addQuestion}
              loading={loading}
            />
          </div>

          {/* Template Manager */}
          {showTemplates && (
            <div>
              <TemplateManager
                questions={quizState.questions}
                settings={quizState.quizSettings}
                hostId={hostId}
                onCreateSession={handleCreateSessionFromTemplate}
                onLoadTemplate={handleLoadTemplate}
              />
            </div>
          )}

          {/* Quiz Controls & Live Stats */}
          <div className={`space-y-6 sm:space-y-8 ${showTemplates ? 'xl:col-span-2' : 'xl:col-span-1'}`}>
            <QuizControls
              isActive={quizState.isActive}
              isFinished={quizState.isFinished}
              currentQuestionIndex={quizState.currentQuestionIndex}
              totalQuestions={quizState.questions.length}
              currentQuestion={quizState.questions[quizState.currentQuestionIndex] || undefined}
              timeRemaining={null}
              answeredCount={Object.keys(quizState.participants.reduce((acc, p) => ({ ...acc, ...p.answers }), {})).length}
              totalParticipants={quizState.participants.length}
              showResults={quizState.showResults}
              loading={loading}
              onMakeLive={makeLive}
              onStartQuiz={startQuiz}
              onNextQuestion={async () => {
                const nextIndex = quizState.currentQuestionIndex + 1;
                console.log('🔄 [HOST] Next question requested - Current:', quizState.currentQuestionIndex, 'Next:', nextIndex, 'Total:', quizState.questions.length);
                if (nextIndex < quizState.questions.length) {
                  console.log('✅ [HOST] Starting question', nextIndex + 1);
                  await startQuestion(nextIndex);
                } else {
                  console.log('🏁 [HOST] Quiz finished - calling finishQuiz');
                  await finishQuiz();
                }
              }}
              onShowResults={showResults}
            />

            <LiveLeaderboard
              participants={quizState.participants}
              totalQuestions={quizState.questions.length}
              averageScore={quizState.statistics.averageScore}
              participationRate={quizState.statistics.participationRate}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}; 