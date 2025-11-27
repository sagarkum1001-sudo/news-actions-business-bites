import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // Get user from Supabase auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Get user's watchlists
      const { data: watchlists, error } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch watchlists' });
      }

      res.status(200).json({ watchlists });
    } else if (req.method === 'POST') {
      // Create new watchlist
      const { watchlist_name, watchlist_category, market, watchlist_type } = req.body;

      if (!watchlist_name || !watchlist_category || !watchlist_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: watchlist, error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: user.id,
          watchlist_name,
          watchlist_category,
          market: market || 'US',
          watchlist_type
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to create watchlist' });
      }

      res.status(201).json({ watchlist });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
