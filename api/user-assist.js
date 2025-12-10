const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use service role key for database operations (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);
// Use anon key for JWT verification
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ===== DEBUG ENDPOINT =====
  if (req.method === 'GET' && req.url?.includes('/debug')) {
    console.log('🔧 DEBUG: Testing user_feedback table access');

    try {
      // Test basic table access
      const { data: testData, error: testError } = await supabaseService
        .from('user_feedback')
        .select('count', { count: 'exact', head: true });

      if (testError) {
        console.error('Table access error:', testError);
        return res.json({
          debug: true,
          table_access: false,
          error: testError.message,
          code: testError.code,
          hint: testError.hint,
          details: testError.details
        });
      }

      // Test RLS policies
      const { data: rlsTest, error: rlsError } = await supabaseService
        .from('user_feedback')
        .select('*')
        .limit(1);

      return res.json({
        debug: true,
        table_access: true,
        rls_test: rlsTest ? true : false,
        record_count: testData,
        error: rlsError?.message || null,
        code: rlsError?.code || null
      });

    } catch (debugError) {
      console.error('Debug endpoint error:', debugError);
      return res.json({
        debug: true,
        error: 'Debug endpoint failed',
        details: debugError.message
      });
    }
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
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    const userId = user.id;
    const url = req.url || '';
    console.log(`🔍 USER-ASSIST API - Method: ${req.method}, URL: ${url}, User: ${userId}`);

    // ===== SUBMIT FEEDBACK =====
    if (req.method === 'POST') {
      console.log(`📝 Submitting user feedback for user: ${userId}`);
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

      // Enhanced debugging context
      const debugContext = {
        userAgent: req.headers['user-agent'] || 'Unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
        language: req.headers['accept-language'] || 'Unknown',
        url: req.headers['referer'] || 'Unknown',
        timestamp: new Date().toISOString(),
        userId: userId,
        ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown',
        viewport: req.headers['sec-ch-ua-mobile'] ? 'mobile' : 'desktop'
      };

      const { data, error } = await supabaseService
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
        feedback_id: data.id
      });
    }

    // ===== GET FEEDBACK HISTORY =====
    else if (req.method === 'GET') {
      console.log(`📋 Getting user feedback history for user: ${userId}`);

      try {
        // First check if table exists
        const { data: tableCheck, error: tableError } = await supabaseService
          .from('user_feedback')
          .select('count', { count: 'exact', head: true });

        if (tableError) {
          console.error('Table check error:', tableError);
          return res.status(500).json({
            success: false,
            error: 'Database table issue',
            details: `Table access error: ${tableError.message}`,
            code: tableError.code
          });
        }

        console.log('Table exists, proceeding with query');

        const { data: feedback, error } = await supabaseService
          .from('user_feedback')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user feedback:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch feedback history',
            details: error.message,
            code: error.code,
            hint: error.hint
          });
        }

        console.log(`Found ${feedback?.length || 0} feedback items for user ${userId}`);

        return res.json({
          success: true,
          feedback: feedback || [],
          count: feedback?.length || 0
        });
      } catch (unexpectedError) {
        console.error('Unexpected error in GET feedback:', unexpectedError);
        return res.status(500).json({
          success: false,
          error: 'Unexpected database error',
          details: unexpectedError.message
        });
      }
    }

    // ===== CLOSE/RESOLVE FEEDBACK =====
    else if (req.method === 'PUT') {
      // Extract action and feedback ID from URL
      // URL patterns: /close/123 or /resolve/123
      const closeMatch = url.match(/\/close\/([^\/]+)/);
      const resolveMatch = url.match(/\/resolve\/([^\/]+)/);

      let feedbackId, action;
      if (closeMatch) {
        feedbackId = closeMatch[1];
        action = 'close';
      } else if (resolveMatch) {
        feedbackId = resolveMatch[1];
        action = 'resolve';
      } else {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format. Expected /close/:id or /resolve/:id'
        });
      }

      console.log(`🔒 ${action === 'close' ? 'Closing' : 'Resolving'} user feedback for user: ${userId}, ID: ${feedbackId}`);

      const newStatus = action === 'close' ? 'closed' : 'resolved';

      const { error } = await supabaseService
        .from('user_feedback')
        .update({ status: newStatus })
        .eq('id', feedbackId)
        .eq('user_id', userId);

      if (error) {
        console.error(`Error ${action}ing feedback:`, error);
        return res.status(500).json({
          success: false,
          error: `Failed to ${action} feedback`,
          details: error.message
        });
      }

      return res.json({
        success: true,
        message: `Feedback ${action}d successfully`
      });
    }

    // ===== UNSUPPORTED METHOD =====
    else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed for user-assist API'
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
