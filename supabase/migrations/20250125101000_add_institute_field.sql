-- Add institute field to quiz_participants table
ALTER TABLE quiz_participants 
ADD COLUMN institute TEXT NOT NULL DEFAULT 'Not specified';

-- Add comment for documentation
COMMENT ON COLUMN quiz_participants.institute IS 'Institute or organization of the participant';

-- Create index for institute field for better query performance
CREATE INDEX idx_quiz_participants_institute ON quiz_participants(institute);

-- Update any existing participants to have a default institute value
UPDATE quiz_participants 
SET institute = 'Legacy Participant' 
WHERE institute IS NULL OR institute = ''; 