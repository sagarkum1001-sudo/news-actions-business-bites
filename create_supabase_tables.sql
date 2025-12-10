-- Create required tables for News Actions Business Bites in Supabase
-- Run this script in Supabase SQL Editor

-- User watchlists table
CREATE TABLE IF NOT EXISTS user_watchlists (
  id SERIAL PRIMARY KEY,
  user_id TEXT DEFAULT 'default_user',
  watchlist_name TEXT NOT NULL,
  watchlist_category TEXT DEFAULT 'general',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  market TEXT DEFAULT 'US',
  watchlist_type TEXT DEFAULT 'companies' CHECK(watchlist_type IN ('companies', 'sectors', 'topics'))
);

-- User watchlist items table
CREATE TABLE IF NOT EXISTS user_watchlist_items (
  id SERIAL PRIMARY KEY,
  watchlist_id INTEGER NOT NULL REFERENCES user_watchlists(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  market TEXT DEFAULT 'US',
  watchlist_type TEXT DEFAULT 'companies',
  user_id TEXT DEFAULT 'default_user',
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(watchlist_id, item_name)
);

-- Watchlist lookup table (for autocomplete)
CREATE TABLE IF NOT EXISTS watchlist_lookup (
  id SERIAL PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK(item_type IN ('companies', 'sectors', 'topics')),
  market TEXT DEFAULT 'US',
  description TEXT,
  market_cap_rank INTEGER,
  ticker_symbol TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_name, item_type, market)
);

-- User feedback table (for bug reports and feature requests)
CREATE TABLE IF NOT EXISTS user_feedback (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('bug_report', 'feature_request')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'closed')),
  debug_context JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user_id ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_items_watchlist_id ON user_watchlist_items(watchlist_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_lookup_item_name ON watchlist_lookup(item_name);
CREATE INDEX IF NOT EXISTS idx_watchlist_lookup_market ON watchlist_lookup(market);
CREATE INDEX IF NOT EXISTS idx_watchlist_lookup_type ON watchlist_lookup(item_type);

-- Enable Row Level Security (RLS)
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_watchlists
CREATE POLICY "Users can view their own watchlists" ON user_watchlists
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own watchlists" ON user_watchlists
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own watchlists" ON user_watchlists
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own watchlists" ON user_watchlists
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for user_watchlist_items
CREATE POLICY "Users can view their own watchlist items" ON user_watchlist_items
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own watchlist items" ON user_watchlist_items
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own watchlist items" ON user_watchlist_items
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own watchlist items" ON user_watchlist_items
  FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for user_feedback
CREATE POLICY "Users can view their own feedback" ON user_feedback
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own feedback" ON user_feedback
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own feedback" ON user_feedback
  FOR UPDATE USING (auth.uid()::text = user_id);
