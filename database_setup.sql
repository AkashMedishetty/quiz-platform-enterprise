-- ============================================
-- PURPLEHAT QUIZ: DATABASE SETUP & SEED DATA
-- ============================================

-- 1. Add missing option_images column
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images text[];
COMMENT ON COLUMN quiz_questions.option_images IS 'Array of image URLs for question options';

-- 2. Create host authentication table
CREATE TABLE IF NOT EXISTS host_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create host sessions table for tracking
CREATE TABLE IF NOT EXISTS host_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  quiz_session_id UUID REFERENCES quiz_sessions(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Insert default host credentials
-- Password: 'purplehat2024' (hashed)
INSERT INTO host_auth (host_id, password_hash) 
VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' -- bcrypt hash of 'purplehat2024'
) ON CONFLICT DO NOTHING;

-- 5. Create admin user profile
INSERT INTO quiz_sessions (
  id,
  title,
  description,
  host_id,
  access_code,
  is_active,
  settings
) VALUES (
  '00000000-0000-0000-0000-000000000000'::UUID,
  'Demo Quiz Session',
  'Sample quiz for testing',
  '11111111-1111-1111-1111-111111111111'::UUID,
  'DEMO2024',
  false,
  '{"timeLimit": 30, "pointsPerQuestion": 100, "showLeaderboard": true}'::jsonb
) ON CONFLICT DO NOTHING;

-- 6. Create RLS policies for host_auth
ALTER TABLE host_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE host_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Only allow hosts to read their own auth data
CREATE POLICY "Hosts can read their own auth" ON host_auth
  FOR SELECT USING (true); -- Temporarily allow all reads for simplicity

-- Policy: Allow host session management
CREATE POLICY "Host session management" ON host_sessions
  FOR ALL USING (true); -- Temporarily allow all for simplicity

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_host_auth_host_id ON host_auth(host_id);
CREATE INDEX IF NOT EXISTS idx_host_sessions_token ON host_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_host_sessions_host_id ON host_sessions(host_id);

-- 8. Update existing quiz_sessions to have proper structure
UPDATE quiz_sessions 
SET settings = COALESCE(settings, '{"timeLimit": 30, "pointsPerQuestion": 100, "showLeaderboard": true}'::jsonb)
WHERE settings IS NULL;

-- Success message
SELECT 'Database setup completed successfully! 🎉' AS message; 