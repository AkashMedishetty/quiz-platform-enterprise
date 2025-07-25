/*
  # Create Quiz Application Database Schema

  1. New Tables
    - `quiz_sessions`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `host_id` (text)
      - `is_active` (boolean, default false)
      - `is_finished` (boolean, default false)
      - `current_question_index` (integer, default -1)
      - `current_question_start_time` (timestamptz, nullable)
      - `show_results` (boolean, default false)
      - `settings` (jsonb)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

    - `quiz_questions`
      - `id` (uuid, primary key)
      - `quiz_session_id` (uuid, foreign key)
      - `question` (text)
      - `options` (text array)
      - `correct_answer` (integer)
      - `time_limit` (integer, default 30)
      - `points` (integer, default 100)
      - `category` (text, nullable)
      - `difficulty` (text, default 'medium')
      - `order_index` (integer)
      - `created_at` (timestamptz, default now())

    - `quiz_participants`
      - `id` (uuid, primary key)
      - `quiz_session_id` (uuid, foreign key)
      - `name` (text)
      - `score` (integer, default 0)
      - `streak` (integer, default 0)
      - `badges` (text array, default '{}')
      - `avatar_color` (text)
      - `joined_at` (timestamptz, default now())
      - `last_seen` (timestamptz, default now())

    - `quiz_answers`
      - `id` (uuid, primary key)
      - `quiz_session_id` (uuid, foreign key)
      - `participant_id` (uuid, foreign key)
      - `question_id` (uuid, foreign key)
      - `answer_index` (integer)
      - `is_correct` (boolean)
      - `time_to_answer` (numeric)
      - `points_earned` (integer)
      - `answered_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add policies for public access (suitable for quiz application)

  3. Indexes
    - Add indexes for better query performance
*/

-- Create quiz_sessions table
CREATE TABLE IF NOT EXISTS quiz_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  host_id text NOT NULL,
  is_active boolean DEFAULT false,
  is_finished boolean DEFAULT false,
  current_question_index integer DEFAULT -1,
  current_question_start_time timestamptz,
  show_results boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quiz_questions table
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_answer integer NOT NULL,
  time_limit integer DEFAULT 30,
  points integer DEFAULT 100,
  category text,
  difficulty text DEFAULT 'medium',
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create quiz_participants table
CREATE TABLE IF NOT EXISTS quiz_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  name text NOT NULL,
  score integer DEFAULT 0,
  streak integer DEFAULT 0,
  badges text[] DEFAULT '{}',
  avatar_color text DEFAULT 'bg-gradient-to-r from-blue-400 to-purple-400',
  joined_at timestamptz DEFAULT now(),
  last_seen timestamptz DEFAULT now()
);

-- Create quiz_answers table
CREATE TABLE IF NOT EXISTS quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_session_id uuid REFERENCES quiz_sessions(id) ON DELETE CASCADE,
  participant_id uuid REFERENCES quiz_participants(id) ON DELETE CASCADE,
  question_id uuid REFERENCES quiz_questions(id) ON DELETE CASCADE,
  answer_index integer NOT NULL,
  is_correct boolean NOT NULL,
  time_to_answer numeric NOT NULL,
  points_earned integer DEFAULT 0,
  answered_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (suitable for quiz application)
-- Quiz Sessions policies
CREATE POLICY "Allow public read access to quiz sessions"
  ON quiz_sessions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to quiz sessions"
  ON quiz_sessions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to quiz sessions"
  ON quiz_sessions
  FOR UPDATE
  TO public
  USING (true);

-- Quiz Questions policies
CREATE POLICY "Allow public read access to quiz questions"
  ON quiz_questions
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to quiz questions"
  ON quiz_questions
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to quiz questions"
  ON quiz_questions
  FOR UPDATE
  TO public
  USING (true);

-- Quiz Participants policies
CREATE POLICY "Allow public read access to quiz participants"
  ON quiz_participants
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to quiz participants"
  ON quiz_participants
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Allow public update access to quiz participants"
  ON quiz_participants
  FOR UPDATE
  TO public
  USING (true);

-- Quiz Answers policies
CREATE POLICY "Allow public read access to quiz answers"
  ON quiz_answers
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow public insert access to quiz answers"
  ON quiz_answers
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_session_id ON quiz_questions(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_id ON quiz_participants(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id ON quiz_answers(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant_id ON quiz_answers(participant_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON quiz_answers(question_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for quiz_sessions updated_at
CREATE TRIGGER update_quiz_sessions_updated_at
    BEFORE UPDATE ON quiz_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();