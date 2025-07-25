/*
  # Fix RLS Policy for Template Questions

  1. Security Updates
    - Update RLS policy for quiz_template_questions to allow proper INSERT operations
    - Ensure users can insert questions for templates they own
    - Maintain security by checking template ownership

  2. Changes
    - Drop existing restrictive policy
    - Create new policy that allows INSERT for template owners
    - Allow SELECT for public templates and owned templates
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage template questions" ON quiz_template_questions;

-- Create separate policies for different operations
CREATE POLICY "Users can insert template questions for own templates"
  ON quiz_template_questions
  FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_templates
      WHERE quiz_templates.id = quiz_template_questions.template_id
      AND quiz_templates.created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
    )
  );

CREATE POLICY "Users can read template questions for accessible templates"
  ON quiz_template_questions
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM quiz_templates
      WHERE quiz_templates.id = quiz_template_questions.template_id
      AND (
        quiz_templates.created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
        OR quiz_templates.is_public = true
      )
    )
  );

CREATE POLICY "Users can update template questions for own templates"
  ON quiz_template_questions
  FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM quiz_templates
      WHERE quiz_templates.id = quiz_template_questions.template_id
      AND quiz_templates.created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
    )
  );

CREATE POLICY "Users can delete template questions for own templates"
  ON quiz_template_questions
  FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM quiz_templates
      WHERE quiz_templates.id = quiz_template_questions.template_id
      AND quiz_templates.created_by = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)
    )
  );