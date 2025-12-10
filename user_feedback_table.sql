-- Run this in Supabase SQL Editor to fix user-assist functionality

-- First, add missing columns to existing user_feedback table
ALTER TABLE user_feedback
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS debug_context JSONB;

-- Update any existing records to have created_at if they don't
UPDATE user_feedback
SET created_at = CURRENT_TIMESTAMP
WHERE created_at IS NULL;

-- Enable RLS (if not already enabled)
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create policies (will not error if they already exist)
CREATE POLICY IF NOT EXISTS "Users can view their own feedback" ON user_feedback
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own feedback" ON user_feedback
  FOR UPDATE USING (auth.uid()::text = user_id);

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_feedback'
ORDER BY ordinal_position;
