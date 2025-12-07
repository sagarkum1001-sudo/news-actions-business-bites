const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase clients
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only POST requests are supported.'
    });
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

    // ===== CREATE NEW WATCHLIST =====
    const { name, type, market, items } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: name and type',
        validation_errors: {
          name: !name ? 'Watchlist name is required' : null,
          type: !type ? 'Watchlist type is required' : null
        }
      });
    }

    // Enhanced validation
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name cannot be empty',
        validation_errors: { name: 'Name cannot be just whitespace' }
      });
    }

    if (trimmedName.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Watchlist name is too long',
        validation_errors: { name: 'Name must be 50 characters or less' }
      });
    }

    if (!['sectors', 'companies', 'topics'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid watchlist type',
        validation_errors: { type: 'Must be "sectors", "companies", or "topics"' }
      });
    }

    console.log(`Creating watchlist "${trimmedName}" (${type}) for user: ${userId} with ${items?.length || 0} items`);

    // Check current watchlist count for this user (max 10)
    const { count, error: countError } = await supabaseService
      .from('user_watchlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error checking watchlist count:', countError);
      return res.status(500).json({
        success: false,
        error: 'Database error while checking watchlist count',
        details: countError.message
      });
    }

    if (count >= 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum watchlist limit reached',
        message: 'You can have up to 10 watchlists. Please delete an existing watchlist before creating a new one.',
        current_count: count,
        max_allowed: 10,
        suggestion: 'Consider consolidating similar watchlists or removing unused ones'
      });
    }

    // Check for duplicate watchlist names for this user
    const { data: existing, error: duplicateError } = await supabaseService
      .from('user_watchlists')
      .select('id')
      .eq('user_id', userId)
      .eq('watchlist_name', trimmedName)
      .single();

    if (duplicateError && duplicateError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking for duplicate watchlist:', duplicateError);
      return res.status(500).json({
        success: false,
        error: 'Database error while checking for duplicates',
        details: duplicateError.message
      });
    }

    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Watchlist name already exists',
        message: `You already have a watchlist named "${trimmedName}". Please choose a different name.`,
        suggestion: 'Try adding a number or descriptor to make it unique (e.g., "Tech Stocks 2")'
      });
    }

    // Create the watchlist
    const { data: watchlist, error: watchlistError } = await supabaseService
      .from('user_watchlists')
      .insert({
        user_id: userId,
        watchlist_name: trimmedName,
        watchlist_category: type,
        market: market || 'US'
      })
      .select()
      .single();

    if (watchlistError) {
      console.error('Error creating watchlist:', watchlistError);
      console.error('Error details:', JSON.stringify(watchlistError, null, 2));
      if (watchlistError.code === '23505') { // Unique constraint violation
        return res.status(409).json({
          success: false,
          error: 'Watchlist name already exists',
          message: 'A watchlist with this name already exists for your account.'
        });
      }
      if (watchlistError.code === '42P01') { // Table doesn't exist
        return res.status(500).json({
          success: false,
          error: 'Database table not found',
          message: 'The user_watchlists table does not exist. Please run the database setup script.',
          details: 'Table user_watchlists not found in database'
        });
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to create watchlist',
        details: watchlistError.message,
        code: watchlistError.code
      });
    }

    console.log(`✅ Watchlist "${trimmedName}" created successfully with ID: ${watchlist.id}`);

    // Add items to the watchlist if provided
    let addedItems = [];
    if (items && Array.isArray(items) && items.length > 0) {
      console.log(`Adding ${items.length} items to watchlist ${watchlist.id}`);

      const itemsToInsert = items.map(itemName => ({
        watchlist_id: watchlist.id,
        item_name: itemName,
        market: market || 'US',
        watchlist_type: type,
        user_id: userId
      }));

      const { data: insertedItems, error: itemsError } = await supabaseService
        .from('user_watchlist_items')
        .insert(itemsToInsert)
        .select('item_name');

      if (itemsError) {
        console.error('Error adding items to watchlist:', itemsError);
        // Don't fail the entire request if items fail, just log it
        console.warn('Watchlist created but failed to add items:', itemsError.message);
      } else {
        addedItems = insertedItems.map(item => item.item_name);
        console.log(`✅ Added ${addedItems.length} items to watchlist:`, addedItems);
      }
    }

    return res.json({
      success: true,
      message: 'Watchlist created successfully',
      watchlist_id: watchlist.id,
      watchlist: {
        id: watchlist.id,
        user_id: userId,
        name: trimmedName,
        type: type,
        items: addedItems,
        created_at: watchlist.created_at
      }
    });

  } catch (error) {
    console.error('Error in watchlist create API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
