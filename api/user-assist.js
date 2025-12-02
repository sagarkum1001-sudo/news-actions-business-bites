const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // ===== SUBMIT USER FEEDBACK =====
    if (req.method === 'POST') {
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
      const { data, error } = await supabase
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

      return res.json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback_id: data.id,
        auto_generated_title: !title || title.trim() === ''
      });
    }

    // ===== GET USER FEEDBACK HISTORY =====
    else if (req.method === 'GET') {
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

      return res.json({
        success: true,
        feedback: data,
        count: data.length
      });
    }

    // ===== RESOLVE FEEDBACK (ADMIN FUNCTION) =====
    else if (req.method === 'PUT' && req.url.includes('/resolve/')) {
      // Extract feedback ID from URL
      const feedbackId = req.url.split('/resolve/')[1]?.split('/')[0];

      if (!feedbackId) {
        return res.status(400).json({
          success: false,
          error: 'Missing feedback ID'
        });
      }

      const { resolution_notes } = req.body;

      console.log(`Resolving feedback item ${feedbackId} for user ${userId}`);

      // Update the feedback item to resolved status
      const updateData = {
        status: 'resolved',
        resolved_at: new Date().toISOString()
      };

      // Add resolution notes to debug context if provided
      if (resolution_notes) {
        // First get current debug context
        const { data: currentFeedback, error: fetchError } = await supabase
          .from('user_feedback')
          .select('debug_context')
          .eq('id', feedbackId)
          .eq('user_id', userId)
          .single();

        if (fetchError) {
          console.error('Error fetching current feedback:', fetchError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback details',
            details: fetchError.message
          });
        }

        // Merge resolution notes with existing debug context
        const existingContext = currentFeedback.debug_context || {};
        updateData.debug_context = {
          ...existingContext,
          resolution_notes: resolution_notes,
          resolved_timestamp: updateData.resolved_at
        };
      }

      const { data, error } = await supabase
        .from('user_feedback')
        .update(updateData)
        .eq('id', feedbackId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .select()
        .single();

      if (error) {
        console.error('Error resolving feedback:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to resolve feedback',
          details: error.message
        });
      }

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Feedback not found or not in pending status'
        });
      }

      return res.json({
        success: true,
        message: 'Feedback marked as resolved successfully'
      });
    }

    // ===== CLOSE RESOLVED FEEDBACK =====
    else if (req.method === 'PUT' && req.url.includes('/close/')) {
      // Extract feedback ID from URL
      const feedbackId = req.url.split('/close/')[1]?.split('/')[0];

      if (!feedbackId) {
        return res.status(400).json({
          success: false,
          error: 'Missing feedback ID'
        });
      }

      console.log(`Closing feedback item ${feedbackId} for user ${userId}`);

      // Update the feedback item to closed status
      const { data, error } = await supabase
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

      return res.json({
        success: true,
        message: 'Feedback closed successfully'
      });
    }

    // ===== UNSUPPORTED METHOD =====
    else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Error in user-assist API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
