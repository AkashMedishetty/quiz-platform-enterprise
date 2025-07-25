-- URGENT: Run this in Supabase SQL Editor to fix "Failed to fetch" errors

-- Add the missing option_images column
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images text[];

-- Success message
SELECT 'Database fixed! option_images column added successfully.' AS message; 