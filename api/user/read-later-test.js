import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  console.log('Read-Later Test API called with method:', req.method);

  // Extract JWT token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    // Set auth context
    supabase.auth.setAuth(token);

    // Get user info
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return res.status(401).json({ error: 'Invalid token', details: authError?.message });
    }

    console.log('Authenticated user:', user.id, user.email);

    if (req.method === 'GET') {
      // Try to get read later items - this should work with RLS
      const { data: bookmarks, error } = await supabase
        .from('read_later')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({
          error: 'Failed to fetch bookmarks',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
      }

      return res.status(200).json({ bookmarks: bookmarks || [] });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Test API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
  }
}
