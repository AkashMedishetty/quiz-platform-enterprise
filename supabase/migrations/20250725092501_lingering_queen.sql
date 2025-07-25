/*
  # Add mobile column to quiz_participants table and image support to questions

  1. Changes
    - Add `mobile` column to `quiz_participants` table
    - Column is required (NOT NULL) for participant identification
    - Add index for performance on mobile number lookups
    - Add image support columns to quiz_questions table

  2. Security
    - No changes to existing RLS policies needed
    - Mobile column inherits existing table permissions
*/

-- Add mobile column to quiz_participants table
ALTER TABLE quiz_participants 
ADD COLUMN mobile text NOT NULL DEFAULT '';

-- Add image support columns to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN image_url text,
ADD COLUMN option_images text[];

-- Add index for mobile number lookups (performance optimization)
CREATE INDEX IF NOT EXISTS idx_quiz_participants_mobile 
ON quiz_participants(mobile);

-- Add index for session + mobile combination (for duplicate checking)
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_mobile 
ON quiz_participants(quiz_session_id, mobile);