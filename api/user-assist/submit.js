import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user from JWT token
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

    const { type, title, description } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: type and description'
      });
    }

    if (!['bug_report', 'feature_request'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "bug_report" or "feature_request"'
      });
    }

    // Auto-extract title from description if not provided
    let finalTitle = title;
    if (!finalTitle || finalTitle.trim() === '') {
      const firstSentence = description.split(/[.!?]/)[0].trim();
      if (firstSentence.length > 50) {
        finalTitle = firstSentence.substring(0, 47) + '...';
      } else {
        finalTitle = firstSentence || description.substring(0, 50);
      }
    }

    // Enhanced debugging context collection
    const debugContext = {
      userAgent: req.headers['user-agent'] || 'Unknown',
      platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
      language: req.headers['accept-language'] || 'Unknown',
      url: req.headers['referer'] || 'Unknown',
      timestamp: new Date().toISOString(),
      userId: userId,
      sessionDuration: 'Unknown',
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
      viewport: req.headers['sec-ch-ua-mobile'] ? 'mobile' : 'desktop',
      timezone: req.headers['timezone'] || 'Unknown',
      screenResolution: req.headers['screen-resolution'] || 'Unknown',
      currentMarket: req.headers['current-market'] || 'Unknown',
      userType: req.headers['user-type'] || 'Unknown'
    };

    console.log(`Submitting ${type} for user ${userId}: ${finalTitle}`);

    // Insert feedback into database
    const { data, error } = await supabaseAdmin
      .from('user_feedback')
      .insert({
        user_id: userId,
        type: type,
        title: finalTitle,
        description: description,
        debug_context: debugContext
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting user feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit feedback',
        details: error.message
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      feedback_id: data.id,
      auto_generated_title: !title || title.trim() === ''
    });
  } catch (error) {
    console.error('User assist submit API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
