import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // Extract JWT token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  // Get user from Supabase auth using the token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    console.error('Auth error:', authError);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      // Check if article is bookmarked
      const { article_id } = req.query;

      if (!article_id) {
        return res.status(400).json({ error: 'Missing article_id' });
      }

      const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', article_id)
        .eq('item_type', 'article')
        .eq('preference_type', 'bookmark');

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to check preference' });
      }

      res.status(200).json({ isBookmarked: preferences.length > 0 });
    } else if (req.method === 'POST') {
      // Add user preference
      const { preference_type, item_id, item_type } = req.body;

      if (!preference_type || !item_id || !item_type) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const { data: preference, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: user.id,
          preference_type,
          item_id,
          item_type
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return res.status(500).json({ error: 'Failed to add preference' });
      }

      res.status(201).json({ preference });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
