import React, { useState, useEffect } from 'react';
import { Users, Trophy, Clock, Target, Eye, Play, Pause, SkipForward, Settings, Download, Monitor, Smartphone, Tablet, TrendingUp, Activity, Award, Zap, RefreshCw, Edit2, Check, X, Upload, Image, Plus, Save } from 'lucide-react';
import { useSupabaseQuiz } from '../hooks/useSupabaseQuiz.tsx';
import { TemplateManager } from './TemplateManager';
import { unifiedSync } from '../lib/realtimeSync';
import { supabase } from '../lib/supabase';
import { Question, QuizSettings } from '../types';

interface HostDashboardProps {
  sessionId: string;
  displayCode: string;
  hostId: string;
  onBack: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
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
    setLoading,
    forceUpdate,
  } = useSupabaseQuiz(sessionId);

  // DISABLED: Sync causing loops - will fix after performance issues resolved
  // useEffect(() => {
  //   if (!sessionId) return;
  //   console.log('⚡ [HOST] Setting up unified sync for session:', sessionId);
  //   // Temporarily disabled to fix performance
  // }, [sessionId]);
  
  // Manual refresh instead of real-time (temporary)
  useEffect(() => {
    if (!sessionId) return;
    
    // Refresh data every 5 seconds instead of real-time
    const interval = setInterval(() => {
      if (forceUpdate) {
        console.log('🔄 [HOST] Manual refresh');
        forceUpdate();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId, forceUpdate]);

  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    optionImages: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: quizState.quizSettings.defaultTimeLimit,
    points: quizState.quizSettings.pointsPerQuestion,
    category: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    imageUrl: '',
  });
  const [showSettings, setShowSettings] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showQuestionPreview, setShowQuestionPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingQuizName, setEditingQuizName] = useState(false);
  const [editingSessionCode, setEditingSessionCode] = useState(false);
  const [tempQuizName, setTempQuizName] = useState(quizState.quizSettings.title);
  const [tempSessionCode, setTempSessionCode] = useState(displayCode);

  // Debug logging for state changes
  useEffect(() => {
    console.log('🎮 [HOST UI] COMPONENT STATE:', {
      currentQuestionIndex: quizState.currentQuestionIndex,
      isActive: quizState.isActive,
      showResults: quizState.showResults,
      questionsLength: quizState.questions.length,
      timestamp: Date.now()
    });
  }, [quizState.currentQuestionIndex, quizState.isActive, quizState.showResults, quizState.questions.length]);

  // Timer for current question
  useEffect(() => {
    if (quizState.isActive && quizState.currentQuestionStartTime && !quizState.showResults) {
      const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
      const timeLimit = (currentQuestion?.timeLimit || quizState.quizSettings.defaultTimeLimit) * 1000;
      
      const interval = setInterval(() => {
        const elapsed = Date.now() - quizState.currentQuestionStartTime!;
        const remaining = Math.max(0, timeLimit - elapsed);
        setTimeRemaining(Math.ceil(remaining / 1000));
        
        if (remaining <= 0) {
          clearInterval(interval);
          showResults();
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setTimeRemaining(null);
    }
  }, [quizState.isActive, quizState.currentQuestionStartTime, quizState.showResults, quizState.currentQuestionIndex, showResults]);

  const handleAddQuestion = async () => {
    if (newQuestion.question.trim() && newQuestion.options.every(opt => opt.trim())) {
      const startTime = Date.now();
      console.log('⏱️ [HOST] Adding question started at:', new Date().toISOString());
      
      try {
        await addQuestion({
          question: newQuestion.question,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
          timeLimit: newQuestion.timeLimit,
          points: newQuestion.points,
          category: newQuestion.category,
          difficulty: newQuestion.difficulty,
          imageUrl: newQuestion.imageUrl,
          optionImages: newQuestion.optionImages,
        });
        
        const duration = Date.now() - startTime;
        console.log(`✅ [HOST] Question added in ${duration}ms`);
        
        setNewQuestion({
          question: '',
          options: ['', '', '', ''],
          optionImages: ['', '', '', ''],
          correctAnswer: 0,
          timeLimit: quizState.quizSettings.defaultTimeLimit,
          points: quizState.quizSettings.pointsPerQuestion,
          category: '',
          difficulty: 'medium',
          imageUrl: '',
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        console.error(`❌ [HOST] Failed to add question after ${duration}ms:`, err);
        alert(`Failed to add question after ${duration}ms. Please try again.`);
      }
    }
  };

  // Image upload handlers
  const handleQuestionImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewQuestion(prev => ({ ...prev, imageUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOptionImageUpload = (optionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewQuestion(prev => {
          const newOptionImages = [...prev.optionImages];
          newOptionImages[optionIndex] = event.target?.result as string;
          return { ...prev, optionImages: newOptionImages };
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeQuestionImage = () => {
    setNewQuestion(prev => ({ ...prev, imageUrl: '' }));
  };

  const removeOptionImage = (optionIndex: number) => {
    setNewQuestion(prev => {
      const newOptionImages = [...prev.optionImages];
      newOptionImages[optionIndex] = '';
      return { ...prev, optionImages: newOptionImages };
    });
  };

  // Quiz name and session code editing
  const handleSaveQuizName = async () => {
    try {
      await updateQuizSettings({ title: tempQuizName });
      setEditingQuizName(false);
    } catch (error) {
      console.error('Failed to update quiz name:', error);
    }
  };

  const handleSaveSessionCode = async () => {
    try {
      // Update session code in database
      const { error } = await supabase
        .from('quiz_sessions')
        .update({ access_code: tempSessionCode })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      setEditingSessionCode(false);
      // Update the display code
      window.location.href = `/host/${sessionId}`;
    } catch (error) {
      console.error('Failed to update session code:', error);
    }
  };

  const handleMakeLive = async () => {
    try {
      await makeLive();
    } catch (error) {
      console.error('Failed to make quiz live:', error);
      alert(error instanceof Error ? error.message : 'Failed to make quiz live');
    }
  };

  const handleStartQuiz = async () => {
    try {
      console.log('Starting quiz...');
      await startQuiz();
      console.log('Quiz started successfully');
      // Force component re-render immediately
      if (forceUpdate) forceUpdate();
    } catch (error) {
      console.error('Failed to start quiz:', error);
      alert(error instanceof Error ? error.message : 'Failed to start quiz');
    }
  };

  const handleNextQuestion = async () => {
    console.log('Moving to next question...');
    console.log('Current question index:', quizState.currentQuestionIndex);
    console.log('Total questions:', quizState.questions.length);
    try {
      setLoading(true);
      const nextIndex = quizState.currentQuestionIndex + 1;
      if (nextIndex < quizState.questions.length) {
        console.log('Starting question', nextIndex + 1);
        await startQuestion(nextIndex);
      } else {
        console.log('Finishing quiz...');
        await finishQuiz();
      }
      console.log('Next question operation completed successfully');
      // Force component re-render immediately
      if (forceUpdate) forceUpdate();
    } catch (error) {
      console.error('Failed to move to next question:', error);
      alert(error instanceof Error ? error.message : 'Failed to proceed to next question');
    } finally {
      setLoading(false);
    }
  };

  const handleShowResults = async () => {
    console.log('Host clicked Show Results');
    try {
      setLoading(true);
      await showResults();
      console.log('Show results completed successfully');
      // Force component re-render immediately
      if (forceUpdate) forceUpdate();
    } catch (error) {
      console.error('Failed to show results:', error);
      alert(error instanceof Error ? error.message : 'Failed to show results');
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    // Create comprehensive Excel-compatible CSV data
    const csvData = [];
    
    // Quiz Summary Header
    csvData.push(['QUIZ RESULTS EXPORT']);
    csvData.push(['Quiz Title:', quizState.quizSettings.title]);
    csvData.push(['Description:', quizState.quizSettings.description]);
    csvData.push(['Export Date:', new Date().toLocaleString()]);
    csvData.push(['Total Questions:', quizState.questions.length]);
    csvData.push(['Total Participants:', quizState.participants.length]);
    csvData.push(['Average Score:', Math.round(quizState.statistics.averageScore)]);
    csvData.push(['Participation Rate:', Math.round(quizState.statistics.participationRate) + '%']);
    csvData.push([]);
    
    // Participant Results Header
    csvData.push([
      'Rank',
      'Name',
      'Mobile',
      'Final Score',
      'Correct Answers',
      'Total Questions',
      'Accuracy %',
      'Best Streak',
      'Badges Earned',
      'Join Time',
      'Total Answer Time (s)',
      'Average Time Per Question (s)'
    ]);
    
    // Sort participants by score
    const sortedParticipants = [...quizState.participants].sort((a, b) => b.score - a.score);
    
    // Add participant data with detailed analytics
    sortedParticipants.forEach((participant, index) => {
      const answers = Object.values(participant.answers);
      const correctAnswers = answers.filter(a => a.isCorrect).length;
      const totalAnswerTime = answers.reduce((sum, a) => sum + a.timeToAnswer, 0);
      const avgTimePerQuestion = answers.length > 0 ? totalAnswerTime / answers.length : 0;
      const accuracy = quizState.questions.length > 0 ? (correctAnswers / quizState.questions.length) * 100 : 0;
      
      csvData.push([
        index + 1,
        participant.name,
        participant.mobile,
        participant.score,
        correctAnswers,
        quizState.questions.length,
        Math.round(accuracy * 10) / 10, // One decimal place
        participant.streak,
        participant.badges.join('; '),
        new Date(participant.joinedAt).toLocaleString(),
        Math.round(totalAnswerTime * 10) / 10,
        Math.round(avgTimePerQuestion * 10) / 10
      ]);
    });
    
    csvData.push([]);
    
    // Question Analysis Header
    csvData.push(['QUESTION ANALYSIS']);
    csvData.push([
      'Question #',
      'Question Text',
      'Correct Answer',
      'Total Responses',
      'Correct Responses',
      'Accuracy Rate %',
      'Average Response Time (s)',
      'Difficulty',
      'Points'
    ]);
    
    // Add question analytics
    quizState.questions.forEach((question, index) => {
      const questionAnswers = sortedParticipants
        .map(p => p.answers[question.id])
        .filter(a => a);
      
      const correctCount = questionAnswers.filter(a => a.isCorrect).length;
      const totalResponses = questionAnswers.length;
      const accuracy = totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;
      const avgResponseTime = questionAnswers.length > 0 
        ? questionAnswers.reduce((sum, a) => sum + a.timeToAnswer, 0) / questionAnswers.length 
        : 0;
      
      csvData.push([
        index + 1,
        question.question,
        question.options[question.correctAnswer],
        totalResponses,
        correctCount,
        Math.round(accuracy * 10) / 10,
        Math.round(avgResponseTime * 10) / 10,
        question.difficulty || 'medium',
        question.points || quizState.quizSettings.pointsPerQuestion
      ]);
    });
    
    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Create and download file
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purplehat-quiz-results-${quizState.quizSettings.title.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadTemplate = (templateQuestions: Question[], templateSettings: QuizSettings) => {
    // This would need to be implemented in the useSupabaseQuiz hook
    // For now, we'll show a message
    alert('Template loading functionality needs to be implemented in the quiz hook');
  };

  const handleCreateSessionFromTemplate = (sessionId: string) => {
    // Navigate to the new session
    window.location.href = `/host/${sessionId}`;
  };

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const sortedParticipants = [...quizState.participants].sort((a, b) => b.score - a.score);
  const answeredCount = currentQuestion ? 
    quizState.participants.filter(p => p.answers[currentQuestion.id]).length : 0;

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

  // Settings Modal
  const SettingsModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Quiz Settings</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-white font-medium mb-2">Quiz Title</label>
            <input
              type="text"
              value={quizState.quizSettings.title}
              onChange={(e) => updateQuizSettings({ title: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          
          <div>
            <label className="block text-white font-medium mb-2">Description</label>
            <textarea
              value={quizState.quizSettings.description}
              onChange={(e) => updateQuizSettings({ description: e.target.value })}
              className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 h-24"
            />
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-white font-medium mb-2">Default Time Limit (seconds)</label>
              <input
                type="number"
                value={quizState.quizSettings.defaultTimeLimit}
                onChange={(e) => updateQuizSettings({ defaultTimeLimit: parseInt(e.target.value) || 30 })}
                className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                min="5"
                max="300"
              />
            </div>
            
            <div>
              <label className="block text-white font-medium mb-2">Points per Question</label>
              <input
                type="number"
                value={quizState.quizSettings.pointsPerQuestion}
                onChange={(e) => updateQuizSettings({ pointsPerQuestion: parseInt(e.target.value) || 100 })}
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
                  checked={quizState.quizSettings.speedBonus}
                  onChange={(e) => updateQuizSettings({ speedBonus: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
                />
                <span className="text-white">Speed Bonus</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={quizState.quizSettings.streakBonus}
                  onChange={(e) => updateQuizSettings({ streakBonus: e.target.checked })}
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
                  checked={quizState.quizSettings.allowLateJoining}
                  onChange={(e) => updateQuizSettings({ allowLateJoining: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
                />
                <span className="text-white">Allow Late Joining</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={quizState.quizSettings.shuffleQuestions}
                  onChange={(e) => updateQuizSettings({ shuffleQuestions: e.target.checked })}
                  className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400"
                />
                <span className="text-white">Shuffle Questions</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setShowSettings(false)}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition-colors"
          >
            Save Settings
          </button>
          <button
            onClick={() => setShowSettings(false)}
            className="px-6 bg-gray-600 hover:bg-gray-700 text-white p-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  // Final Results View
  if (quizState.showResults && quizState.isFinished) {
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
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={exportResults}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors flex items-center gap-2 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  Export Results
                </button>
                <button
                  onClick={onBack}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors text-sm sm:text-base"
                >
                  New Quiz
                </button>
              </div>
            </div>
            
            {/* Statistics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-xl p-4 sm:p-6 border border-blue-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                  <span className="text-blue-200 font-medium text-sm sm:text-base">Participants</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{quizState.statistics.totalParticipants}</div>
              </div>
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl p-4 sm:p-6 border border-green-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 text-green-400" />
                  <span className="text-green-200 font-medium text-sm sm:text-base">Avg Score</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{Math.round(quizState.statistics.averageScore).toLocaleString()}</div>
              </div>
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl p-4 sm:p-6 border border-purple-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  <span className="text-purple-200 font-medium text-sm sm:text-base">Participation</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{Math.round(quizState.statistics.participationRate)}%</div>
              </div>
              <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 sm:p-6 border border-orange-500/30">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                  <span className="text-orange-200 font-medium text-sm sm:text-base">Questions</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold text-white">{quizState.questions.length}</div>
              </div>
            </div>
            
            {/* Leaderboard */}
            <div className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Final Leaderboard</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedParticipants.map((participant, index) => (
                  <div
                    key={participant.id}
                    className={`flex items-center justify-between p-4 sm:p-6 rounded-xl transition-all duration-300 ${
                      index === 0
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-400/50 shadow-2xl'
                        : index === 1
                        ? 'bg-gradient-to-r from-gray-400/20 to-gray-500/20 border border-gray-400/50'
                        : index === 2
                        ? 'bg-gradient-to-r from-orange-600/20 to-yellow-600/20 border border-orange-400/50'
                        : 'bg-gray-800/50 border border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-base sm:text-lg ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg' :
                        index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' :
                        index === 2 ? 'bg-gradient-to-r from-orange-400 to-yellow-500 text-black' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-white font-semibold text-lg sm:text-xl">{participant.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {participant.badges.map(badge => (
                            <span key={badge} className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300 text-xs">
                              {badge.replace('-', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold text-white">
                        {participant.score}
                      </div>
                      <div className="text-xs sm:text-sm text-gray-300">
                        {Math.round((participant.score / (quizState.questions.length * quizState.quizSettings.pointsPerQuestion)) * 100)}% efficiency
                      </div>
                      {participant.streak > 0 && (
                        <div className="text-xs text-orange-300">
                          🔥 {participant.streak} streak
                        </div>
                      )}
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

  if (loading && quizState.questions.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-cyan-400 font-mono text-sm">LOADING QUIZ DATA...</p>
          <p className="text-gray-500 font-mono text-xs mt-2">Session: {sessionId}</p>
          <div className="mt-4 space-x-4">
            <button
              onClick={() => {
                console.log('🔄 Force reload triggered');
                if (forceUpdate) forceUpdate();
              }}
              className="text-green-400 hover:text-green-300 font-mono text-xs underline"
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
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-8 text-center max-w-md">
          <h2 className="text-xl font-bold text-red-300 mb-4">Error Loading Quiz</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4">
      {/* Cyberpunk grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,165,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,165,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Neon accent lines */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
      
      {showSettings && <SettingsModal />}
      
      <div className="max-w-7xl mx-auto">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 font-mono tracking-tight">HOST DASHBOARD</h1>
            <div className="flex items-center gap-2 mb-2">
              {editingQuizName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempQuizName}
                    onChange={(e) => setTempQuizName(e.target.value)}
                    className="bg-black border border-orange-400 text-orange-400 px-2 py-1 font-mono font-bold text-lg"
                  />
                  <button onClick={handleSaveQuizName} className="text-green-400 hover:text-green-300">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingQuizName(false)} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-orange-400 text-lg font-mono font-bold">{quizState.quizSettings.title}</p>
                  <button onClick={() => {
                    setTempQuizName(quizState.quizSettings.title);
                    setEditingQuizName(true);
                  }} className="text-orange-400 hover:text-orange-300">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingSessionCode ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-300 font-mono">SESSION CODE:</span>
                  <input
                    type="text"
                    value={tempSessionCode}
                    onChange={(e) => setTempSessionCode(e.target.value.toUpperCase())}
                    className="bg-black border border-orange-400 text-orange-300 px-2 py-1 font-mono text-sm"
                  />
                  <button onClick={handleSaveSessionCode} className="text-green-400 hover:text-green-300">
                    <Save className="w-3 h-3" />
                  </button>
                  <button onClick={() => setEditingSessionCode(false)} className="text-red-400 hover:text-red-300">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-orange-300 font-mono">SESSION CODE: {displayCode}</p>
                  <button onClick={() => {
                    setTempSessionCode(displayCode);
                    setEditingSessionCode(true);
                  }} className="text-orange-300 hover:text-orange-200">
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => {
                const shareableLink = `${window.location.origin}?join=${sessionId}`;
                navigator.clipboard.writeText(shareableLink).then(() => {
                  // Create a temporary notification element
                  const notification = document.createElement('div');
                  notification.innerHTML = `
                    <div style="position: fixed; top: 20px; right: 20px; background: #10B981; color: white; padding: 16px; border-radius: 8px; z-index: 9999; font-family: monospace; font-weight: bold; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                      ✅ SHAREABLE LINK COPIED!<br/>
                      <small style="opacity: 0.9;">Share: ${shareableLink}</small>
                    </div>
                  `;
                  document.body.appendChild(notification);
                  setTimeout(() => document.body.removeChild(notification), 3000);
                }).catch(() => {
                  alert('Shareable link: ' + shareableLink);
                });
              }}
              className="bg-black border border-green-400/50 hover:border-green-400 text-green-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
            >
                          <Users className="w-4 h-4" />
            SHARE LINK
          </button>
          
          <button
            onClick={() => {
              console.log('🔄 [HOST] Manual refresh triggered for session:', sessionId);
              // Force reload data instead of full page refresh
              if (forceUpdate) {
                forceUpdate();
              } else {
                window.location.reload();
              }
            }}
            className="bg-black border border-orange-400/50 hover:border-orange-400 text-orange-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            REFRESH
          </button>
            <button
              onClick={() => {
                const bigScreenUrl = `${window.location.origin}/big-screen/${displayCode}`;
                console.log('🎮 [HOST] Opening big screen at:', bigScreenUrl);
                window.open(bigScreenUrl, '_blank', 'width=1920,height=1080,fullscreen=yes');
              }}
              className="bg-black border border-purple-400/50 hover:border-purple-400 text-purple-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
            >
              <Monitor className="w-4 h-4" />
              BIG SCREEN
            </button>
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="bg-black border border-green-400/50 hover:border-green-400 text-green-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              TEMPLATES
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="bg-black border border-orange-400/50 hover:border-orange-400 text-orange-400 hover:text-white px-3 sm:px-4 py-2 transition-colors flex items-center gap-2 text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
            >
              <Settings className="w-4 h-4" />
              SETTINGS
            </button>
            <div className="bg-black border border-cyan-400/50 px-4 sm:px-6 py-2 text-cyan-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="text-sm sm:text-base font-mono font-bold">{quizState.statistics.totalParticipants.toLocaleString()} PARTICIPANTS</span>
            </div>
            <button
              onClick={onBack}
              className="bg-black border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white px-4 sm:px-6 py-2 transition-colors text-sm sm:text-base font-mono font-bold uppercase tracking-wider"
            >
              BACK TO HOME
            </button>
          </div>
        </div>

        <div className="grid xl:grid-cols-3 gap-6 sm:gap-8">
          {/* Question Management */}
          <div className={`${showTemplates ? 'xl:col-span-1' : 'xl:col-span-2'} bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6`}>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Question Management</h2>
            
            {!quizState.isActive && (
              <div className="space-y-4 mb-8">
                {/* Question Input */}
                <input
                  type="text"
                  placeholder="Enter your question..."
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  className="w-full p-3 sm:p-4 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                />
                
                {/* Question Image Upload */}
                <div className="space-y-2">
                  <label className="block text-gray-300 text-sm">Question Image (Optional)</label>
                  <div className="flex items-center gap-4">
                    <label className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded cursor-pointer flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload Image
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQuestionImageUpload}
                        className="hidden"
                      />
                    </label>
                    {newQuestion.imageUrl && (
                      <button
                        onClick={removeQuestionImage}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Remove
                      </button>
                    )}
                  </div>
                  {newQuestion.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={newQuestion.imageUrl}
                        alt="Question preview"
                        className="max-w-xs max-h-32 object-contain border border-gray-600 rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Category (optional)"
                    value={newQuestion.category}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, category: e.target.value }))}
                    className="p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                  />
                  <select
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, difficulty: e.target.value as 'easy' | 'medium' | 'hard' }))}
                    className="p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Time Limit (seconds)</label>
                    <input
                      type="number"
                      value={newQuestion.timeLimit}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 30 }))}
                      className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                      min="5"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm mb-2">Points</label>
                    <input
                      type="number"
                      value={newQuestion.points}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, points: parseInt(e.target.value) || 100 }))}
                      className="w-full p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                      min="10"
                      max="1000"
                    />
                  </div>
                </div>
                
                {/* Answer Options with Image Upload */}
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={`Option ${index + 1}...`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion(prev => ({ ...prev, options: newOptions }));
                        }}
                        className="flex-1 p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm sm:text-base"
                      />
                      <button
                        onClick={() => setNewQuestion(prev => ({ ...prev, correctAnswer: index }))}
                        className={`px-3 sm:px-4 py-3 rounded-lg transition-colors font-bold text-sm sm:text-base ${
                          newQuestion.correctAnswer === index
                            ? 'bg-green-500 text-white shadow-lg'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                    
                    {/* Option Image Upload */}
                    <div className="flex items-center gap-2 ml-4">
                      <label className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded cursor-pointer flex items-center gap-1 text-xs">
                        <Upload className="w-3 h-3" />
                        Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleOptionImageUpload(index, e)}
                          className="hidden"
                        />
                      </label>
                      {newQuestion.optionImages[index] && (
                        <button
                          onClick={() => removeOptionImage(index)}
                          className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded flex items-center gap-1 text-xs"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    
                    {/* Option Image Preview */}
                    {newQuestion.optionImages[index] && (
                      <div className="ml-4">
                        <img
                          src={newQuestion.optionImages[index]}
                          alt={`Option ${index + 1} preview`}
                          className="max-w-24 max-h-16 object-contain border border-gray-600 rounded"
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={handleAddQuestion}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold transform hover:scale-105 text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  Add Question
                </button>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {quizState.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 sm:p-4 rounded-lg transition-all duration-300 ${
                    index === quizState.currentQuestionIndex
                      ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 border-2 border-blue-400 shadow-lg'
                      : 'bg-gray-800/50 border border-gray-600 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-white font-medium mb-2 text-sm sm:text-base">
                        Q{index + 1}: {question.question}
                      </div>
                      {question.imageUrl && (
                        <div className="mb-2">
                          <img
                            src={question.imageUrl}
                            alt="Question"
                            className="max-w-32 max-h-20 object-contain border border-gray-600 rounded"
                          />
                        </div>
                      )}
                      <div className="text-gray-300 text-xs sm:text-sm mb-2">
                        Correct: {question.options[question.correctAnswer]}
                      </div>
                      {question.optionImages?.some(img => img) && (
                        <div className="flex gap-1 mb-2">
                          {question.optionImages.map((img, imgIndex) => (
                            img && (
                              <img
                                key={imgIndex}
                                src={img}
                                alt={`Option ${imgIndex + 1}`}
                                className="w-8 h-8 object-contain border border-gray-600 rounded"
                              />
                            )
                          ))}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
                        {question.category && (
                          <span className="px-2 py-1 bg-blue-500/20 rounded-full text-blue-300">
                            {question.category}
                          </span>
                        )}
                        <span className={`px-2 py-1 rounded-full ${
                          question.difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
                          question.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {question.difficulty}
                        </span>
                        <span className="text-gray-400">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {question.timeLimit}s
                        </span>
                        <span className="text-gray-400">
                          {question.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Manager */}
          {showTemplates && (
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
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
          <div className="space-y-6 xl:space-y-8">
            {/* Quiz Controls */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-6">Quiz Controls</h2>
              
              {!quizState.isActive && !quizState.isFinished && (
                <button
                  onClick={handleMakeLive}
                  disabled={quizState.questions.length === 0}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-500 disabled:to-gray-600 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-base sm:text-lg font-semibold transform hover:scale-105 disabled:transform-none mb-4"
                >
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  Make Quiz Live
                </button>
              )}

              {quizState.isActive && quizState.currentQuestionIndex === -1 && !quizState.isFinished && (
                <button
                  onClick={handleStartQuiz}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-base sm:text-lg font-semibold transform hover:scale-105 mb-4"
                >
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                  {loading ? 'STARTING...' : 'START QUIZ'}
                </button>
              )}

              {quizState.isActive && quizState.currentQuestionIndex >= 0 && !quizState.isFinished && (
                <div className="space-y-4">
                  {!currentQuestion && (
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded-lg">
                      <div className="text-red-400 font-mono font-bold">ERROR: No question found at index {quizState.currentQuestionIndex}</div>
                      <div className="text-red-300 font-mono text-sm">Total questions: {quizState.questions.length}</div>
                    </div>
                  )}
                  
                  {currentQuestion && (
                    <>
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 p-4 rounded-lg border border-blue-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-blue-200 text-sm">
                        Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}
                      </div>
                      {timeRemaining !== null && (
                        <div className={`text-base sm:text-lg font-bold ${
                          timeRemaining <= 5 ? 'text-red-400' : 'text-white'
                        }`}>
                          <Clock className="w-4 h-4 inline mr-1" />
                          {timeRemaining}s
                        </div>
                      )}
                    </div>
                    <div className="text-white font-medium text-sm sm:text-base">{currentQuestion.question}</div>
                    <div className="mt-2 text-sm text-gray-300">
                      {answeredCount}/{quizState.participants.length} answered
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${quizState.participants.length > 0 ? (answeredCount / quizState.participants.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                    </>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={handleShowResults}
                      disabled={loading}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-lg transition-colors text-sm sm:text-base"
                    >
                      {loading ? 'SHOWING...' : 'SHOW RESULTS'}
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white p-2 sm:p-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                    >
                      <SkipForward className="w-4 h-4" />
                      {loading ? 'PROCESSING...' : (quizState.currentQuestionIndex < quizState.questions.length - 1 ? 'NEXT QUESTION' : 'FINISH QUIZ')}
                    </button>
                  </div>
                </div>
              )}

              {/* Quiz Status Display */}
              <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="text-sm text-gray-300 mb-2">Quiz Status:</div>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    quizState.isFinished ? 'bg-red-400' :
                    quizState.isActive && quizState.currentQuestionIndex >= 0 && !quizState.showResults ? 'bg-green-400 animate-pulse' :
                    quizState.isActive && quizState.showResults ? 'bg-yellow-400 animate-pulse' :
                    quizState.isActive ? 'bg-yellow-400 animate-pulse' :
                    'bg-gray-400'
                  }`}></div>
                  <span className="text-white font-medium">
                    {quizState.isFinished ? 'Finished' :
                     quizState.isActive && quizState.currentQuestionIndex >= 0 && quizState.showResults ? 'Showing Results' :
                     quizState.isActive && quizState.currentQuestionIndex >= 0 && !quizState.showResults ? 'Quiz In Progress' :
                     quizState.isActive ? 'Live - Waiting to Start' :
                     'Not Live'}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-white">Live Leaderboard</h3>
                  <div className="text-sm text-gray-400 font-mono">
                    TOP {Math.min(10, sortedParticipants.length)} OF {quizState.statistics.totalParticipants.toLocaleString()}
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
                  {sortedParticipants.map((participant, index) => (
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
                          {Object.keys(participant.answers).length}/{quizState.questions.length} answered
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
                      <div className="text-lg font-bold text-white">{Math.round(quizState.statistics.averageScore).toLocaleString()}</div>
                      <div className="text-xs text-gray-400 font-mono">AVG SCORE</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{Math.round(quizState.statistics.participationRate)}%</div>
                      <div className="text-xs text-gray-400 font-mono">PARTICIPATION</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{sortedParticipants.filter(p => p.streak > 1).length}</div>
                      <div className="text-xs text-gray-400 font-mono">ON STREAK</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};