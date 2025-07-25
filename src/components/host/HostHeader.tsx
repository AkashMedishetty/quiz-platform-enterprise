import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Users, Monitor, Plus, Settings, RefreshCw } from 'lucide-react';

interface HostHeaderProps {
  quizTitle: string;
  displayCode: string;
  participantCount: number;
  onUpdateTitle: (title: string) => Promise<void>;
  onUpdateDisplayCode: (code: string) => Promise<void>;
  onShareLink: () => void;
  onShareBigScreen?: () => void;
  onOpenBigScreen: () => void;
  onShowTemplates: () => void;
  onShowSettings: () => void;
  onRefresh: () => void;
  onBack: () => void;
  loading?: boolean;
}

export const HostHeader: React.FC<HostHeaderProps> = ({
  quizTitle,
  displayCode,
  participantCount,
  onUpdateTitle,
  onUpdateDisplayCode,
  onShareLink,
  onShareBigScreen,
  onOpenBigScreen,
  onShowTemplates,
  onShowSettings,
  onRefresh,
  onBack,
  loading = false
}) => {
  const [editingQuizName, setEditingQuizName] = useState(false);
  const [editingSessionCode, setEditingSessionCode] = useState(false);
  const [tempQuizName, setTempQuizName] = useState(quizTitle);
  const [tempSessionCode, setTempSessionCode] = useState(displayCode);

  // Sync temp values with props when they change externally
  useEffect(() => {
    if (!editingQuizName) {
      setTempQuizName(quizTitle);
    }
  }, [quizTitle, editingQuizName]);

  useEffect(() => {
    if (!editingSessionCode) {
      setTempSessionCode(displayCode);
    }
  }, [displayCode, editingSessionCode]);

  const handleSaveQuizName = async () => {
    try {
      await onUpdateTitle(tempQuizName);
      setEditingQuizName(false);
    } catch (error) {
      console.error('Failed to update quiz name:', error);
      alert('Failed to update quiz name. Please try again.');
    }
  };

  const handleSaveSessionCode = async () => {
    try {
      await onUpdateDisplayCode(tempSessionCode);
      setEditingSessionCode(false);
    } catch (error) {
      console.error('Failed to update session code:', error);
      alert('Failed to update session code. Please try again.');
    }
  };

  const handleCancelQuizName = () => {
    setTempQuizName(quizTitle);
    setEditingQuizName(false);
  };

  const handleCancelSessionCode = () => {
    setTempSessionCode(displayCode);
    setEditingSessionCode(false);
  };

  return (
    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
      {/* Left Side - Quiz Info */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 font-mono tracking-tight">
          HOST DASHBOARD
        </h1>
        
        {/* Quiz Title */}
        <div className="flex items-center gap-2 mb-2">
          {editingQuizName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={tempQuizName}
                onChange={(e) => setTempQuizName(e.target.value)}
                className="bg-black border border-orange-400 text-orange-400 px-2 py-1 font-mono font-bold text-lg min-w-0 flex-1"
                placeholder="Enter quiz title..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveQuizName();
                  if (e.key === 'Escape') handleCancelQuizName();
                }}
                autoFocus
              />
              <button 
                onClick={handleSaveQuizName} 
                className="text-green-400 hover:text-green-300 p-1"
                disabled={loading}
              >
                <Save className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCancelQuizName} 
                className="text-red-400 hover:text-red-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-orange-400 text-lg font-mono font-bold">{quizTitle}</p>
              <button 
                onClick={() => {
                  setTempQuizName(quizTitle);
                  setEditingQuizName(true);
                }} 
                className="text-orange-400 hover:text-orange-300 p-1"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        
        {/* Session Code */}
        <div className="flex items-center gap-2">
          {editingSessionCode ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-orange-300 font-mono">SESSION CODE:</span>
              <input
                type="text"
                value={tempSessionCode}
                onChange={(e) => setTempSessionCode(e.target.value.toUpperCase())}
                className="bg-black border border-orange-400 text-orange-300 px-2 py-1 font-mono text-sm"
                placeholder="ENTER CODE..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveSessionCode();
                  if (e.key === 'Escape') handleCancelSessionCode();
                }}
                autoFocus
              />
              <button 
                onClick={handleSaveSessionCode} 
                className="text-green-400 hover:text-green-300 p-1"
                disabled={loading}
              >
                <Save className="w-3 h-3" />
              </button>
              <button 
                onClick={handleCancelSessionCode} 
                className="text-red-400 hover:text-red-300 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-sm text-orange-300 font-mono">SESSION CODE: {displayCode}</p>
              <button 
                onClick={() => {
                  setTempSessionCode(displayCode);
                  setEditingSessionCode(true);
                }} 
                className="text-orange-300 hover:text-orange-200 p-1"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Right Side - Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {/* Share Participant Link */}
        <button
          onClick={onShareLink}
          className="bg-black border border-green-400/50 hover:border-green-400 text-green-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          <Users className="w-4 h-4" />
          SHARE QUIZ
        </button>
        
        {/* Share Big Screen Link */}
        {onShareBigScreen && (
          <button
            onClick={onShareBigScreen}
            className="bg-black border border-purple-400/50 hover:border-purple-400 text-purple-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
          >
            <Monitor className="w-4 h-4" />
            SHARE SCREEN
          </button>
        )}
        
        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="bg-black border border-orange-400/50 hover:border-orange-400 disabled:border-gray-600 text-orange-400 hover:text-white disabled:text-gray-500 px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'REFRESHING' : 'REFRESH'}
        </button>
          
        {/* Big Screen */}
        <button
          onClick={onOpenBigScreen}
          className="bg-black border border-purple-400/50 hover:border-purple-400 text-purple-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          <Monitor className="w-4 h-4" />
          BIG SCREEN
        </button>
        
        {/* Templates */}
        <button
          onClick={onShowTemplates}
          className="bg-black border border-green-400/50 hover:border-green-400 text-green-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" />
          TEMPLATES
        </button>
        
        {/* Settings */}
        <button
          onClick={onShowSettings}
          className="bg-black border border-orange-400/50 hover:border-orange-400 text-orange-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          <Settings className="w-4 h-4" />
          SETTINGS
        </button>
        
        {/* Participant Count */}
        <div className="bg-black border border-cyan-400/50 px-4 sm:px-6 py-2 text-cyan-400 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span className="text-sm sm:text-base font-mono font-bold">
            {participantCount.toLocaleString()} PARTICIPANTS
          </span>
        </div>
        
        {/* Back Button */}
        <button
          onClick={onBack}
          className="bg-black border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white px-4 sm:px-6 py-2 transition-colors text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
        >
          BACK TO HOME
        </button>
      </div>
    </div>
  );
}; 