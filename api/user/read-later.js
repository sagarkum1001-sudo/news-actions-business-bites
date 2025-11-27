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
      // Get user's read later articles
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
      // Add article to read later
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
      // Remove article from read later
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
