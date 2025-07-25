import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Question, QuizSettings } from '../types';

export interface QuizTemplate {
  id: string;
  title: string;
  description: string;
  created_by: string;
  is_public: boolean;
  settings: QuizSettings;
  created_at: string;
  updated_at: string;
  questions: Question[];
}

export const useQuizTemplates = (hostId: string) => {
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateReadableSessionId = (): string => {
    const adjectives = ['QUICK', 'SMART', 'FAST', 'BOLD', 'BRIGHT', 'SHARP', 'COOL', 'HOT'];
    const nouns = ['QUIZ', 'GAME', 'TEST', 'BATTLE', 'MATCH', 'DUEL'];
    const numbers = Math.floor(Math.random() * 99) + 1;
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}${noun}${numbers.toString().padStart(2, '0')}`;
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch templates (both user's own and public ones)
      const { data: templatesData, error: templatesError } = await supabase
        .from('quiz_templates')
        .select('*')
        .or(`created_by.eq.${hostId},is_public.eq.true`)
        .order('updated_at', { ascending: false });

      if (templatesError) throw templatesError;

      // Fetch questions for each template
      const templatesWithQuestions = await Promise.all(
        (templatesData || []).map(async (template) => {
          const { data: questionsData, error: questionsError } = await supabase
            .from('quiz_template_questions')
            .select('*')
            .eq('template_id', template.id)
            .order('order_index');

          if (questionsError) throw questionsError;

          return {
            ...template,
            questions: questionsData || []
          };
        })
      );

      setTemplates(templatesWithQuestions);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async (
    title: string,
    description: string,
    questions: Question[],
    settings: QuizSettings,
    isPublic: boolean = false
  ): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      // Create template
      const { data: templateData, error: templateError } = await supabase
        .from('quiz_templates')
        .insert({
          title,
          description,
          created_by: hostId,
          is_public: isPublic,
          settings
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Add questions
      if (questions.length > 0) {
        const questionsToInsert = questions.map((question, index) => ({
          template_id: templateData.id,
          question: question.question,
          options: question.options,
          correct_answer: question.correctAnswer,
          time_limit: question.timeLimit,
          points: question.points,
          category: question.category,
          difficulty: question.difficulty,
          order_index: index
        }));

        const { error: questionsError } = await supabase
          .from('quiz_template_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      await fetchTemplates();
      return templateData.id;
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err instanceof Error ? err.message : 'Failed to save template');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('quiz_templates')
        .delete()
        .eq('id', templateId)
        .eq('created_by', hostId);

      if (error) throw error;

      await fetchTemplates();
      return true;
    } catch (err) {
      console.error('Error deleting template:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete template');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createSessionFromTemplate = async (templateId: string): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);

      const template = templates.find(t => t.id === templateId);
      if (!template) throw new Error('Template not found');

      // Create quiz session
      const { data: sessionData, error: sessionError } = await supabase
        .from('quiz_sessions')
        .insert({
          title: template.title,
          description: template.description,
          host_id: hostId,
          template_id: templateId,
          access_code: generateReadableSessionId(),
          settings: template.settings
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Add questions to session
      if (template.questions.length > 0) {
        const questionsToInsert = template.questions.map((question, index) => ({
          quiz_session_id: sessionData.id,
          question: question.question,
          options: question.options,
          correct_answer: question.correctAnswer,
          time_limit: question.timeLimit,
          points: question.points,
          category: question.category,
          difficulty: question.difficulty,
          order_index: index
        }));

        const { error: questionsError } = await supabase
          .from('quiz_questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      return sessionData.id;
    } catch (err) {
      console.error('Error creating session from template:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session from template');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [hostId]);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    saveTemplate,
    deleteTemplate,
    createSessionFromTemplate,
    generateReadableSessionId
  };
};