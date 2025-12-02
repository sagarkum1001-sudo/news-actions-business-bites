import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  console.log('Read-Later API called with method:', req.method);
  console.log('Environment check:', {
    hasUrl: !!SUPABASE_URL,
    hasAnonKey: !!SUPABASE_ANON_KEY,
    hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
  });

  // Extract JWT token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('Missing or invalid authorization header');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  console.log('Token received, length:', token.length);

  try {
    // Use Supabase client with anon key to verify the JWT token
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Verify the JWT token using Supabase auth
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !user) {
      console.error('JWT verification failed:', authError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('Verified user from JWT:', user.id, user.email);

    if (!user || !user.id) {
      console.error('No user ID found after verification');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      // Get user's read later articles (using service role client that bypasses RLS)
      const { data: bookmarks, error } = await supabase
        .from('read_later')
        .select('*')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch bookmarks' });
      }

      res.status(200).json({ bookmarks });
    } else if (req.method === 'POST') {
      // Add article to read later (using service role client that bypasses RLS)
      const { article_id, title, url, sector, source_system } = req.body;

      if (!article_id || !title || !url) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: bookmark, error } = await supabase
        .from('read_later')
        .insert({
          user_id: user.id,
          article_id,
          title,
          url,
          sector,
          source_system
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to save bookmark' });
      }

      res.status(201).json({ bookmark });
    } else if (req.method === 'DELETE') {
      // Remove article from read later (using service role client that bypasses RLS)
      const { article_id } = req.body;

      if (!article_id) {
        return res.status(400).json({ error: 'Missing article_id' });
      }

      const { error } = await supabase
        .from('read_later')
        .delete()
        .eq('user_id', user.id)
        .eq('article_id', article_id);

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to remove bookmark' });
      }

      res.status(200).json({ message: 'Bookmark removed' });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
