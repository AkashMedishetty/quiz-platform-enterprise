-- Add option_images column to quiz_questions table
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images text[];

-- Add comment for clarity
COMMENT ON COLUMN quiz_questions.option_images IS 'Array of image URLs for question options'; 