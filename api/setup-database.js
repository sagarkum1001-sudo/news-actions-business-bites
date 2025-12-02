import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Use service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting database setup...');

    // Check if tables already exist
    const { data: existingTables, error: tableCheckError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['read_later', 'user_feedback', 'user_watchlists', 'user_watchlist_items']);

    if (tableCheckError) {
      console.log('Table check failed, proceeding with creation...');
    }

    // Create read_later table
    const { error: readLaterError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.read_later (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          article_id TEXT NOT NULL,
          title TEXT,
          url TEXT,
          sector TEXT,
          source_system TEXT,
          added_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(user_id, article_id)
        );

        ALTER TABLE public.read_later ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own read later items" ON public.read_later;
        CREATE POLICY "Users can view their own read later items"
        ON public.read_later FOR SELECT
        USING (auth.jwt() ->> 'sub' = user_id);

        DROP POLICY IF EXISTS "Users can insert their own read later items" ON public.read_later;
        CREATE POLICY "Users can insert their own read later items"
        ON public.read_later FOR INSERT
        WITH CHECK (auth.jwt() ->> 'sub' = user_id);

        DROP POLICY IF EXISTS "Users can delete their own read later items" ON public.read_later;
        CREATE POLICY "Users can delete their own read later items"
        ON public.read_later FOR DELETE
        USING (auth.jwt() ->> 'sub' = user_id);

        CREATE INDEX IF NOT EXISTS idx_read_later_user_id ON public.read_later(user_id);
        CREATE INDEX IF NOT EXISTS idx_read_later_article_id ON public.read_later(article_id);
      `
    });

    if (readLaterError) {
      console.error('Error creating read_later table:', readLaterError);
    } else {
      console.log('read_later table created successfully');
    }

    // Create user_feedback table
    const { error: feedbackError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.user_feedback (
          id BIGSERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('bug_report', 'feature_request')),
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'closed')),
          debug_context JSONB,
          submitted_at TIMESTAMPTZ DEFAULT NOW(),
          resolved_at TIMESTAMPTZ,
          closed_at TIMESTAMPTZ
        );

        ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their own feedback" ON public.user_feedback;
        CREATE POLICY "Users can view their own feedback"
        ON public.user_feedback FOR SELECT
        USING (auth.jwt() ->> 'sub' = user_id);

        DROP POLICY IF EXISTS "Users can submit feedback" ON public.user_feedback;
        CREATE POLICY "Users can submit feedback"
        ON public.user_feedback FOR INSERT
        WITH CHECK (auth.jwt() ->> 'sub' = user_id);

        CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON public.user_feedback(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON public.user_feedback(status);
      `
    });

    if (feedbackError) {
      console.error('Error creating user_feedback table:', feedbackError);
    } else {
      console.log('user_feedback table created successfully');
    }

    // Test the read_later table by trying to select from it
    const { data: testData, error: testError } = await supabase
      .from('read_later')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Error testing read_later table:', testError);
      return res.status(500).json({
        error: 'Database setup failed',
        details: testError.message
      });
    }

    console.log('Database setup completed successfully');
    res.status(200).json({
      success: true,
      message: 'Database tables created successfully',
      tables: ['read_later', 'user_feedback']
    });

  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({
      error: 'Database setup failed',
      details: error.message
    });
  }
}
