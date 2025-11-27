import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create tables for frontend-only mode
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        sub TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        name TEXT,
        picture TEXT,
        access_type_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );`,

      // Access types
      `CREATE TABLE IF NOT EXISTS access_types (
        access_type_id SERIAL PRIMARY KEY,
        access_type_name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // Business bites display
      `CREATE TABLE IF NOT EXISTS business_bites_display (
        news_analysis_id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        summary TEXT,
        market TEXT NOT NULL,
        sector TEXT NOT NULL,
        impact_score REAL,
        sentiment TEXT,
        link TEXT,
        urlToImage TEXT,
        content TEXT,
        author TEXT,
        published_at TIMESTAMP,
        source_system TEXT DEFAULT 'Postgres_Migrated',
        summary_short TEXT,
        business_bites_news_id INTEGER,
        alternative_sources TEXT,
        thumbnail_url TEXT,
        rank INTEGER DEFAULT 1,
        slno INTEGER
      );`,

      // Read later
      `CREATE TABLE IF NOT EXISTS read_later (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        article_id INTEGER NOT NULL,
        title TEXT,
        url TEXT,
        sector TEXT,
        source_system TEXT,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`,

      // User feedback
      `CREATE TABLE IF NOT EXISTS user_feedback (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(user_id),
        type TEXT NOT NULL CHECK(type IN ('bug_report', 'feature_request')),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'closed')),
        priority TEXT DEFAULT 'low' CHECK(priority IN ('low', 'high', 'critical')),
        debug_context TEXT,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        closed_at TIMESTAMP NULL
      );`,

      // User watchlists
      `CREATE TABLE IF NOT EXISTS user_watchlists (
        id SERIAL PRIMARY KEY,
        user_id TEXT DEFAULT 'default_user',
        watchlist_name TEXT NOT NULL,
        watchlist_category TEXT DEFAULT 'general',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        market TEXT DEFAULT 'US',
        watchlist_type TEXT DEFAULT 'companies' CHECK(watchlist_type IN ('companies', 'sectors', 'topics'))
      );`,

      // User preferences
      `CREATE TABLE IF NOT EXISTS user_preferences (
        preference_id SERIAL PRIMARY KEY,
        user_identifier TEXT NOT NULL,
        preference_type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        item_type TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );`
    ];

    // Execute table creation
    for (const sql of tables) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('Error creating table:', error);
        return res.status(500).json({ error: 'Failed to create tables', details: error });
      }
    }

    // Insert default access type
    const { error: insertError } = await supabase
      .from('access_types')
      .upsert([{ access_type_id: 1, access_type_name: 'user', description: 'Standard user access' }]);

    if (insertError) {
      console.error('Error inserting default data:', insertError);
    }

    // Create indexes
    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_market_sector ON business_bites_display(market, sector);`,
      `CREATE INDEX IF NOT EXISTS idx_published_at ON business_bites_display(published_at);`,
      `CREATE INDEX IF NOT EXISTS idx_impact_score ON business_bites_display(impact_score);`,
      `CREATE INDEX IF NOT EXISTS idx_slno ON business_bites_display(slno);`,
      `CREATE INDEX IF NOT EXISTS idx_users_sub ON users(sub);`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
      `CREATE INDEX IF NOT EXISTS idx_users_access_type ON users(access_type_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);`,
      `CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);`,
      `CREATE INDEX IF NOT EXISTS idx_watchlists_user ON user_watchlists(user_id);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS user_preferences_user_identifier_preference_type_item_id_item_type_uniq ON user_preferences (user_identifier, preference_type, item_id, item_type);`,
      `CREATE INDEX IF NOT EXISTS user_pref_user_type_idx ON user_preferences (user_identifier, preference_type);`,
      `CREATE INDEX IF NOT EXISTS user_pref_item_idx ON user_preferences (item_id, item_type);`,
      `CREATE INDEX IF NOT EXISTS user_pref_type_idx ON user_preferences (preference_type);`
    ];

    for (const sql of indexes) {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('Error creating index:', error);
      }
    }

    res.status(200).json({ message: 'Database setup completed successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: 'Database setup failed', details: error.message });
  }
}
