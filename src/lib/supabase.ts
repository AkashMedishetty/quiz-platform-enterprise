import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 100,
    },
  },
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: false,
  },
});

export type Database = {
  public: {
    Tables: {
      quiz_sessions: {
        Row: {
          id: string;
          title: string;
          description: string;
          host_id: string;
          is_active: boolean;
          is_finished: boolean;
          current_question_index: number;
          current_question_start_time: string | null;
          show_results: boolean;
          settings: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          host_id: string;
          is_active?: boolean;
          is_finished?: boolean;
          current_question_index?: number;
          current_question_start_time?: string | null;
          show_results?: boolean;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          host_id?: string;
          is_active?: boolean;
          is_finished?: boolean;
          current_question_index?: number;
          current_question_start_time?: string | null;
          show_results?: boolean;
          settings?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_session_id: string;
          question: string;
          options: string[];
          correct_answer: number;
          time_limit: number;
          points: number;
          category: string | null;
          difficulty: string;
          order_index: number;
          created_at: string;
          image_url: string | null;
        };
        Insert: {
          id?: string;
          quiz_session_id: string;
          question: string;
          options: string[];
          correct_answer: number;
          time_limit?: number;
          points?: number;
          category?: string | null;
          difficulty?: string;
          order_index: number;
          created_at?: string;
          image_url?: string | null;
        };
        Update: {
          id?: string;
          quiz_session_id?: string;
          question?: string;
          options?: string[];
          correct_answer?: number;
          time_limit?: number;
          points?: number;
          category?: string | null;
          difficulty?: string;
          order_index?: number;
          created_at?: string;
          image_url?: string | null;
        };
      };
      quiz_participants: {
        Row: {
          id: string;
          quiz_session_id: string;
          name: string;
          score: number;
          streak: number;
          badges: string[];
          avatar_color: string;
          joined_at: string;
          last_seen: string;
          mobile: string;
        };
        Insert: {
          id?: string;
          quiz_session_id: string;
          name: string;
          score?: number;
          streak?: number;
          badges?: string[];
          avatar_color?: string;
          joined_at?: string;
          last_seen?: string;
          mobile?: string;
        };
        Update: {
          id?: string;
          quiz_session_id?: string;
          name?: string;
          score?: number;
          streak?: number;
          badges?: string[];
          avatar_color?: string;
          joined_at?: string;
          last_seen?: string;
          mobile?: string;
        };
      };
      quiz_answers: {
        Row: {
          id: string;
          quiz_session_id: string;
          participant_id: string;
          question_id: string;
          answer_index: number;
          is_correct: boolean;
          time_to_answer: number;
          points_earned: number;
          answered_at: string;
        };
        Insert: {
          id?: string;
          quiz_session_id: string;
          participant_id: string;
          question_id: string;
          answer_index: number;
          is_correct: boolean;
          time_to_answer: number;
          points_earned: number;
          answered_at?: string;
        };
        Update: {
          id?: string;
          quiz_session_id?: string;
          participant_id?: string;
          question_id?: string;
          answer_index?: number;
          is_correct?: boolean;
          time_to_answer?: number;
          points_earned?: number;
          answered_at?: string;
        };
      };
    };
  };
};