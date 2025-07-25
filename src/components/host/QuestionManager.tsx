import React, { useState } from 'react';
import { Plus, Upload, X, Save, Edit2, Clock, Target } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  optionImages?: string[];
  correctAnswer: number;
  timeLimit?: number;
  points?: number;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  orderIndex: number;
  imageUrl?: string;
}

interface NewQuestion {
  question: string;
  options: string[];
  optionImages: string[];
  correctAnswer: number;
  timeLimit: number;
  points: number;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  imageUrl: string;
}

interface QuestionManagerProps {
  questions: Question[];
  currentQuestionIndex: number;
  isQuizActive: boolean;
  defaultTimeLimit: number;
  defaultPoints: number;
  onAddQuestion: (question: Omit<Question, 'id' | 'orderIndex'>) => Promise<void>;
  loading?: boolean;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({
  questions,
  currentQuestionIndex,
  isQuizActive,
  defaultTimeLimit,
  defaultPoints,
  onAddQuestion,
  loading = false
}) => {
  const [newQuestion, setNewQuestion] = useState<NewQuestion>({
    question: '',
    options: ['', '', '', ''],
    optionImages: ['', '', '', ''],
    correctAnswer: 0,
    timeLimit: defaultTimeLimit,
    points: defaultPoints,
    category: '',
    difficulty: 'medium',
    imageUrl: '',
  });

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

  const handleAddQuestion = async () => {
    if (newQuestion.question.trim() && newQuestion.options.every(opt => opt.trim())) {
      try {
        await onAddQuestion({
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
        
        // Reset form
        setNewQuestion({
          question: '',
          options: ['', '', '', ''],
          optionImages: ['', '', '', ''],
          correctAnswer: 0,
          timeLimit: defaultTimeLimit,
          points: defaultPoints,
          category: '',
          difficulty: 'medium',
          imageUrl: '',
        });
      } catch (err) {
        console.error('Failed to add question:', err);
        alert('Failed to add question. Please try again.');
      }
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Question Management</h2>
      
      {/* Add Question Form */}
      {!isQuizActive && (
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

          {/* Category and Difficulty */}
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
          
          {/* Time Limit and Points */}
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
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-500 text-white p-3 sm:p-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 font-semibold transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            {loading ? 'Adding...' : 'Add Question'}
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className={`p-3 sm:p-4 rounded-lg transition-all duration-300 ${
              index === currentQuestionIndex
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
                    <Target className="w-3 h-3 inline mr-1" />
                    {question.points} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 