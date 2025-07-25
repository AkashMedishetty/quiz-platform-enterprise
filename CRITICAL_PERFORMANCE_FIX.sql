-- CRITICAL PERFORMANCE FIXES FOR QUIZ APPLICATION
-- Run this IMMEDIATELY in Supabase SQL Editor to fix 10+ second loading times

-- 1. ESSENTIAL INDEXES (These are CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_id ON quiz_sessions(id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_active ON quiz_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_access_code ON quiz_sessions(access_code);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_session_order ON quiz_questions(quiz_session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_session ON quiz_questions(quiz_session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_score ON quiz_participants(quiz_session_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session ON quiz_participants(quiz_session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session ON quiz_answers(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_participant_question ON quiz_answers(participant_id, question_id);

-- 2. ROW LEVEL SECURITY POLICIES (Enable but make permissive for development)
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Permissive policies for development (ADJUST FOR PRODUCTION!)
CREATE POLICY "Allow all operations on quiz_sessions" ON quiz_sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_questions" ON quiz_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_participants" ON quiz_participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on quiz_answers" ON quiz_answers FOR ALL USING (true);

-- 3. REALTIME PUBLICATION (Enable real-time for tables)
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_questions;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE quiz_answers;

-- 4. ANALYZE TABLES (Update query planner statistics)
ANALYZE quiz_sessions;
ANALYZE quiz_questions;
ANALYZE quiz_participants;
ANALYZE quiz_answers;

-- 5. CHECK IF INDEXES WERE CREATED
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('quiz_sessions', 'quiz_questions', 'quiz_participants', 'quiz_answers')
ORDER BY tablename, indexname; 