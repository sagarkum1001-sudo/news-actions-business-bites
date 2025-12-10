const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize Supabase clients
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return res.status(500).json({
      success: false,
      error: 'Server configuration error'
    });
  }

  // Use service role key for database operations (bypasses RLS)
  const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);
  // Use anon key for JWT verification
  const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

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
    const watchlistId = req.query.id; // Vercel provides this from [id].js

    console.log(`🔍 DELETE WATCHLIST - ID: ${watchlistId}, User: ${userId}`);

    // ===== DELETE WATCHLIST =====
    if (req.method === 'DELETE') {
      if (!watchlistId) {
        return res.status(400).json({
          success: false,
          error: 'Missing watchlist_id parameter'
        });
      }

      console.log(`🗑️ Deleting watchlist: ${watchlistId} for user: ${userId}`);

      // First verify the watchlist belongs to the user
      const { data: existingWatchlist, error: fetchError } = await supabaseService
        .from('user_watchlists')
        .select('id, user_id, watchlist_name')
        .eq('id', parseInt(watchlistId))
        .single();

      if (fetchError) {
        console.error('Error fetching watchlist:', fetchError);
        return res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        });
      }

      if (existingWatchlist.user_id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - watchlist does not belong to user'
        });
      }

      console.log(`✅ Verified ownership - deleting watchlist "${existingWatchlist.watchlist_name}"`);

      // Delete the watchlist (items will be deleted automatically due to CASCADE)
      const { error } = await supabaseService
        .from('user_watchlists')
        .delete()
        .eq('id', parseInt(watchlistId))
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting watchlist:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete watchlist',
          details: error.message
        });
      }

      console.log(`✅ Watchlist deleted successfully: ${watchlistId}`);

      return res.json({
        success: true,
        message: 'Watchlist deleted successfully',
        watchlist_id: watchlistId
      });
    }

    // ===== UNSUPPORTED METHOD =====
    else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed for this endpoint'
      });
    }

  } catch (error) {
    console.error('Error in watchlist [id] API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
