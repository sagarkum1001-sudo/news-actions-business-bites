-- Create users table for Google OAuth authentication
-- Run this in your Supabase SQL editor or dashboard

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  picture VARCHAR(500),
  login_method VARCHAR(50) DEFAULT 'google',
  user_type VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for Google ID lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY IF NOT EXISTS "Users can read own data" ON users
  FOR SELECT USING (auth.uid()::text = google_id);

-- Policy: Allow insert for new users
CREATE POLICY IF NOT EXISTS "Allow user creation" ON users
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own data
CREATE POLICY IF NOT EXISTS "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = google_id);

-- Grant necessary permissions (optional, usually handled by Supabase)
-- GRANT USAGE ON SCHEMA public TO anon, authenticated;
-- GRANT ALL ON users TO anon, authenticated;
