/*
  # Quiz Templates and Session Management

  1. New Tables
    - `quiz_templates`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `created_by` (text, host identifier)
      - `is_public` (boolean, for sharing templates)
      - `settings` (jsonb, quiz configuration)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `quiz_template_questions`
      - `id` (uuid, primary key)
      - `template_id` (uuid, foreign key)
      - `question` (text)
      - `options` (text array)
      - `correct_answer` (integer)
      - `time_limit` (integer)
      - `points` (integer)
      - `category` (text)
      - `difficulty` (text)
      - `order_index` (integer)

  2. Enhanced Sessions
    - Add `template_id` to link sessions to templates
    - Add `scheduled_start_time` for planned events
    - Add `access_code` for additional security

  3. Security
    - Enable RLS on all new tables
    - Add policies for template management
    - Add policies for session access control
*/

-- Quiz Templates Table
CREATE TABLE IF NOT EXISTS quiz_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  created_by text NOT NULL,
  is_public boolean DEFAULT false,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quiz Template Questions Table
CREATE TABLE IF NOT EXISTS quiz_template_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid REFERENCES quiz_templates(id) ON DELETE CASCADE,
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

-- Add template reference to quiz sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_sessions' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE quiz_sessions ADD COLUMN template_id uuid REFERENCES quiz_templates(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_sessions' AND column_name = 'scheduled_start_time'
  ) THEN
    ALTER TABLE quiz_sessions ADD COLUMN scheduled_start_time timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_sessions' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE quiz_sessions ADD COLUMN access_code text;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_templates_created_by ON quiz_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_quiz_templates_public ON quiz_templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_quiz_template_questions_template_id ON quiz_template_questions(template_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_template_id ON quiz_sessions(template_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_scheduled ON quiz_sessions(scheduled_start_time) WHERE scheduled_start_time IS NOT NULL;

-- Enable RLS
ALTER TABLE quiz_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_template_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Templates
CREATE POLICY "Users can create templates"
  ON quiz_templates
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Users can read own templates and public templates"
  ON quiz_templates
  FOR SELECT
  TO public
  USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub' OR is_public = true);

CREATE POLICY "Users can update own templates"
  ON quiz_templates
  FOR UPDATE
  TO public
  USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own templates"
  ON quiz_templates
  FOR DELETE
  TO public
  USING (created_by = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for Template Questions
CREATE POLICY "Users can manage template questions"
  ON quiz_template_questions
  FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM quiz_templates 
      WHERE id = template_id 
      AND (created_by = current_setting('request.jwt.claims', true)::json->>'sub' OR is_public = true)
    )
  );

-- Update trigger for templates
CREATE OR REPLACE FUNCTION update_quiz_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quiz_templates_updated_at
  BEFORE UPDATE ON quiz_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_templates_updated_at();