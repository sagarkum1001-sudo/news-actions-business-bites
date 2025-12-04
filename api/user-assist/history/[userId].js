import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get user from JWT token for authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    // Verify the requested userId matches the authenticated user
    if (user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to access this user\'s feedback history'
      });
    }

    console.log(`Getting feedback history for user: ${userId}`);

    // Get all feedback for this user, ordered by newest first
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error getting feedback history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get feedback history',
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      feedback: data,
      count: data.length
    });
  } catch (error) {
    console.error('User assist history API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
