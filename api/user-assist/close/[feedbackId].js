import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { feedbackId } = req.query;

    if (!feedbackId) {
      return res.status(400).json({ error: 'Feedback ID is required' });
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

    const userId = user.id;

    console.log(`Closing feedback item ${feedbackId} for user ${userId}`);

    // Update the feedback item to closed status
    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString()
      })
      .eq('id', feedbackId)
      .eq('user_id', userId)
      .eq('status', 'resolved')
      .select()
      .single();

    if (error) {
      console.error('Error closing feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to close feedback',
        details: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Feedback not found or not in resolved status'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback closed successfully'
    });
  } catch (error) {
    console.error('User assist close API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
