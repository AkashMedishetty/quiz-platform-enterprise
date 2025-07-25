import React, { useState } from 'react';
import { Save, Play, Trash2, Copy, Calendar, Lock, Globe, Plus, Search, Filter, Clock, Target, Users, Eye } from 'lucide-react';
import { useQuizTemplates, QuizTemplate } from '../hooks/useQuizTemplates';
import { Question, QuizSettings } from '../types';

interface TemplateManagerProps {
  questions: Question[];
  settings: QuizSettings;
  hostId: string;
  onCreateSession: (sessionId: string) => void;
  onLoadTemplate: (questions: Question[], settings: QuizSettings) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  questions,
  settings,
  hostId,
  onCreateSession,
  onLoadTemplate,
}) => {
  const {
    templates,
    loading,
    error,
    saveTemplate,
    createSessionFromTemplate,
    deleteTemplate,
    generateReadableSessionId,
  } = useQuizTemplates(hostId);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuizTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPublic, setFilterPublic] = useState<'all' | 'mine' | 'public'>('all');

  // Save current quiz as template
  const [saveForm, setSaveForm] = useState({
    title: '',
    description: '',
    isPublic: false,
  });

  // Create session form
  const [createForm, setCreateForm] = useState({
    scheduledStartTime: '',
    accessCode: '',
    sessionIdFormat: 'readable' as 'short' | 'long' | 'readable' | 'custom',
    customLength: 8,
  });

  const handleSaveTemplate = async () => {
    if (!saveForm.title.trim()) return;

    try {
      await saveTemplate(
        saveForm.title,
        saveForm.description,
        questions,
        settings,
        saveForm.isPublic
      );
      
      setShowSaveModal(false);
      setSaveForm({ title: '', description: '', isPublic: false });
    } catch (err) {
      console.error('Failed to save template:', err);
    }
  };

  const handleLoadTemplate = async (template: QuizTemplate) => {
    try {
      onLoadTemplate(template.questions, template.settings);
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedTemplate) return;

    try {
      const finalSessionId = await createSessionFromTemplate(selectedTemplate.id);

      if (finalSessionId) {
        onCreateSession(finalSessionId);
      }
      setShowCreateModal(false);
      setSelectedTemplate(null);
      setCreateForm({
        scheduledStartTime: '',
        accessCode: '',
        sessionIdFormat: 'readable',
        customLength: 8,
      });
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterPublic === 'all' ||
                         (filterPublic === 'mine' && template.created_by === hostId) ||
                         (filterPublic === 'public' && template.is_public);
    
    return matchesSearch && matchesFilter;
  });

  // Save Template Modal
  const SaveTemplateModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border-2 border-cyan-400 max-w-2xl w-full p-8">
        <h2 className="text-3xl font-black text-white mb-8 font-mono tracking-wider">SAVE AS TEMPLATE</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-cyan-400 font-mono font-bold mb-3 uppercase tracking-wider">
              TEMPLATE TITLE *
            </label>
            <input
              type="text"
              value={saveForm.title}
              onChange={(e) => setSaveForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-4 bg-black border-2 border-gray-600 focus:border-cyan-400 text-white font-mono uppercase tracking-wider focus:outline-none"
              placeholder="ENTER TEMPLATE NAME..."
              required
            />
          </div>
          
          <div>
            <label className="block text-cyan-400 font-mono font-bold mb-3 uppercase tracking-wider">
              DESCRIPTION
            </label>
            <textarea
              value={saveForm.description}
              onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-4 bg-black border-2 border-gray-600 focus:border-cyan-400 text-white font-mono focus:outline-none h-24"
              placeholder="DESCRIBE THIS TEMPLATE..."
            />
          </div>
          
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              id="isPublic"
              checked={saveForm.isPublic}
              onChange={(e) => setSaveForm(prev => ({ ...prev, isPublic: e.target.checked }))}
              className="w-5 h-5"
            />
            <label htmlFor="isPublic" className="text-white font-mono font-bold uppercase tracking-wider">
              MAKE PUBLIC (OTHERS CAN USE THIS TEMPLATE)
            </label>
          </div>
          
          <div className="bg-black border border-gray-600 p-4">
            <div className="text-gray-400 font-mono text-sm space-y-1">
              <div>QUESTIONS: {questions.length}</div>
              <div>TIME LIMIT: {settings.defaultTimeLimit}S</div>
              <div>POINTS: {settings.pointsPerQuestion}</div>
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleSaveTemplate}
            disabled={!saveForm.title.trim()}
            className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-600 text-black disabled:text-gray-400 p-4 font-mono font-black uppercase tracking-wider transition-colors"
          >
            <Save className="w-5 h-5 inline mr-2" />
            SAVE TEMPLATE
          </button>
          <button
            onClick={() => setShowSaveModal(false)}
            className="px-8 bg-black border-2 border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white p-4 font-mono font-black uppercase tracking-wider transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );

  // Create Session Modal
  const CreateSessionModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border-2 border-orange-400 max-w-2xl w-full p-8">
        <h2 className="text-3xl font-black text-white mb-8 font-mono tracking-wider">CREATE LIVE SESSION</h2>
        
        {selectedTemplate && (
          <div className="bg-black border border-orange-400 p-4 mb-6">
            <div className="text-orange-400 font-mono font-bold mb-2">SELECTED TEMPLATE:</div>
            <div className="text-white font-mono text-xl font-bold">{selectedTemplate.title}</div>
                              <div className="text-gray-400 font-mono text-sm">{selectedTemplate.questions.length} QUESTIONS</div>
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label className="block text-orange-400 font-mono font-bold mb-3 uppercase tracking-wider">
              SESSION ID FORMAT
            </label>
            <select
              value={createForm.sessionIdFormat}
              onChange={(e) => setCreateForm(prev => ({ ...prev, sessionIdFormat: e.target.value as any }))}
              className="w-full p-4 bg-black border-2 border-gray-600 focus:border-orange-400 text-white font-mono focus:outline-none"
            >
              <option value="readable">READABLE (QUICKQUIZ123)</option>
              <option value="short">SHORT (ABC123)</option>
              <option value="long">LONG (ABC123DEF456)</option>
              <option value="custom">CUSTOM LENGTH</option>
            </select>
            
            {createForm.sessionIdFormat === 'custom' && (
              <input
                type="number"
                value={createForm.customLength}
                onChange={(e) => setCreateForm(prev => ({ ...prev, customLength: parseInt(e.target.value) || 8 }))}
                className="w-full p-4 bg-black border-2 border-gray-600 focus:border-orange-400 text-white font-mono focus:outline-none mt-2"
                placeholder="CUSTOM LENGTH (4-20)"
                min="4"
                max="20"
              />
            )}
          </div>
          
          <div>
            <label className="block text-orange-400 font-mono font-bold mb-3 uppercase tracking-wider">
              SCHEDULED START TIME (OPTIONAL)
            </label>
            <input
              type="datetime-local"
              value={createForm.scheduledStartTime}
              onChange={(e) => setCreateForm(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
              className="w-full p-4 bg-black border-2 border-gray-600 focus:border-orange-400 text-white font-mono focus:outline-none"
            />
          </div>
          
          <div>
            <label className="block text-orange-400 font-mono font-bold mb-3 uppercase tracking-wider">
              ACCESS CODE (OPTIONAL)
            </label>
            <input
              type="text"
              value={createForm.accessCode}
              onChange={(e) => setCreateForm(prev => ({ ...prev, accessCode: e.target.value }))}
              className="w-full p-4 bg-black border-2 border-gray-600 focus:border-orange-400 text-white font-mono uppercase tracking-wider focus:outline-none"
              placeholder="ADDITIONAL SECURITY CODE..."
            />
          </div>
        </div>
        
        <div className="flex gap-4 mt-8">
          <button
            onClick={handleCreateSession}
            className="flex-1 bg-orange-500 hover:bg-orange-400 text-black p-4 font-mono font-black uppercase tracking-wider transition-colors"
          >
            <Play className="w-5 h-5 inline mr-2" />
            CREATE LIVE SESSION
          </button>
          <button
            onClick={() => {
              setShowCreateModal(false);
              setSelectedTemplate(null);
            }}
            className="px-8 bg-black border-2 border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white p-4 font-mono font-black uppercase tracking-wider transition-colors"
          >
            CANCEL
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-black border-2 border-purple-400 p-6">
      {showSaveModal && <SaveTemplateModal />}
      {showCreateModal && <CreateSessionModal />}
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black text-white font-mono tracking-wider">QUIZ TEMPLATES</h2>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowSaveModal(true)}
            disabled={questions.length === 0}
            className="bg-purple-500 hover:bg-purple-400 disabled:bg-gray-600 text-white disabled:text-gray-400 px-6 py-3 font-mono font-bold uppercase tracking-wider transition-colors"
          >
            <Save className="w-4 h-4 inline mr-2" />
            SAVE CURRENT
          </button>
        </div>
      </div>
      
      {/* Search and Filter */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-black border-2 border-gray-600 focus:border-purple-400 text-white font-mono focus:outline-none"
            placeholder="SEARCH TEMPLATES..."
          />
        </div>
        
        <select
          value={filterPublic}
          onChange={(e) => setFilterPublic(e.target.value as any)}
          className="w-full p-3 bg-black border-2 border-gray-600 focus:border-purple-400 text-white font-mono focus:outline-none"
        >
          <option value="all">ALL TEMPLATES</option>
          <option value="mine">MY TEMPLATES</option>
          <option value="public">PUBLIC TEMPLATES</option>
        </select>
      </div>
      
      {/* Templates Grid */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-purple-400 font-mono">LOADING TEMPLATES...</div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 font-mono">NO TEMPLATES FOUND</div>
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="bg-black border border-gray-600 hover:border-purple-400 p-4 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-mono font-bold text-lg">{template.title}</h3>
                    {template.is_public && (
                      <div className="bg-green-500/20 border border-green-500 px-2 py-1">
                        <Globe className="w-3 h-3 inline mr-1 text-green-400" />
                        <span className="text-green-400 font-mono text-xs font-bold">PUBLIC</span>
                      </div>
                    )}
                  </div>
                  
                  {template.description && (
                    <p className="text-gray-400 font-mono text-sm mb-3">{template.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 text-xs text-gray-400 font-mono">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {template.questions.length} QUESTIONS
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {template.settings?.defaultTimeLimit || 30}S
                    </div>
                    <div>UPDATED: {new Date(template.updated_at).toLocaleDateString()}</div>
                  </div>
                </div>
                
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleLoadTemplate(template)}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black px-3 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-colors"
                    title="Load Template"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowCreateModal(true);
                    }}
                    className="bg-orange-500 hover:bg-orange-400 text-black px-3 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-colors"
                    title="Create Live Session"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  
                  {template.created_by === hostId && (
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      className="bg-red-500 hover:bg-red-400 text-white px-3 py-2 font-mono font-bold text-xs uppercase tracking-wider transition-colors"
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500 p-4 mt-4">
          <div className="text-red-400 font-mono font-bold">ERROR: {error}</div>
        </div>
      )}
    </div>
  );
};