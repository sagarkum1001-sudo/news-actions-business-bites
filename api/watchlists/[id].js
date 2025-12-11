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
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
    }

    const userId = user.id;
    const watchlistId = req.query.id;

    console.log(`🔍 WATCHLISTS [id] API - Method: ${req.method}, ID: ${watchlistId}, Path: ${req.url}`);

    // ===== FILTER NEWS BY WATCHLIST =====
    if (req.method === 'GET' && req.url.includes('filter-news')) {
      return handleFilterNews(req, res, supabaseService, userId, watchlistId);
    }

    // ===== ADD ITEM TO WATCHLIST =====
    if (req.method === 'POST' && req.url.includes('/items')) {
      return handleAddItem(req, res, supabaseService, userId, watchlistId);
    }

    // ===== REMOVE ITEM FROM WATCHLIST =====
    if (req.method === 'DELETE' && req.url.includes('/items')) {
      return handleRemoveItem(req, res, supabaseService, userId, watchlistId);
    }

    // ===== DELETE WATCHLIST =====
    if (req.method === 'DELETE') {
      return handleDeleteWatchlist(req, res, supabaseService, userId, watchlistId);
    }

    // ===== UNSUPPORTED OPERATION =====
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found for watchlist operations'
    });

  } catch (error) {
    console.error('Error in watchlists [id] API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// ===== DELETE WATCHLIST HANDLER =====
async function handleDeleteWatchlist(req, res, supabaseService, userId, watchlistId) {
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

// ===== ADD ITEM TO WATCHLIST HANDLER =====
async function handleAddItem(req, res, supabaseService, userId, watchlistId) {
  console.log(`➕ ADD ITEM REQUEST - watchlistId: ${watchlistId}, User: ${userId}, Body:`, req.body);

  const { item_name } = req.body;

  if (!watchlistId || !item_name) {
    console.log(`❌ ADD ITEM ERROR - Missing parameters: watchlistId=${watchlistId}, item_name=${item_name}`);
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: watchlist_id and item_name'
    });
  }

  // First verify the watchlist belongs to the user
  const { data: existingWatchlist, error: fetchError } = await supabaseService
    .from('user_watchlists')
    .select('id, user_id, watchlist_name, market, watchlist_category')
    .eq('id', parseInt(watchlistId))
    .single();

  if (fetchError || !existingWatchlist) {
    console.log(`❌ ADD ITEM ERROR - Watchlist not found: ${watchlistId}`);
    return res.status(404).json({
      success: false,
      error: 'Watchlist not found'
    });
  }

  if (existingWatchlist.user_id !== userId) {
    console.log(`❌ ADD ITEM ERROR - Access denied for user ${userId} on watchlist ${watchlistId}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied - watchlist does not belong to user'
    });
  }

  console.log(`✅ ADD ITEM - Verified ownership for watchlist "${existingWatchlist.watchlist_name}"`);

  // Check if item already exists in this watchlist
  const { data: existingItem, error: itemCheckError } = await supabaseService
    .from('user_watchlist_items')
    .select('id')
    .eq('watchlist_id', parseInt(watchlistId))
    .eq('item_name', item_name)
    .single();

  if (itemCheckError && itemCheckError.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error checking existing item:', itemCheckError);
    return res.status(500).json({
      success: false,
      error: 'Database error while checking for existing item',
      details: itemCheckError.message
    });
  }

  if (existingItem) {
    console.log(`⚠️ ADD ITEM - Item "${item_name}" already exists in watchlist ${watchlistId}`);
    return res.status(409).json({
      success: false,
      error: 'Item already exists in this watchlist'
    });
  }

  // Add the item to the watchlist
  const { data, error } = await supabaseService
    .from('user_watchlist_items')
    .insert({
      watchlist_id: parseInt(watchlistId),
      item_name: item_name,
      market: existingWatchlist.market,
      watchlist_type: existingWatchlist.watchlist_category,
      user_id: userId
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding item to watchlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to add item to watchlist',
      details: error.message
    });
  }

  console.log(`✅ ADD ITEM - Successfully added "${item_name}" to watchlist ${watchlistId}`);

  return res.json({
    success: true,
    message: 'Item added to watchlist successfully',
    item_id: data.id,
    item: {
      id: data.id,
      name: item_name,
      watchlist_id: watchlistId
    }
  });
}

// ===== REMOVE ITEM FROM WATCHLIST HANDLER =====
async function handleRemoveItem(req, res, supabaseService, userId, watchlistId) {
  console.log(`➖ REMOVE ITEM REQUEST - watchlistId: ${watchlistId}, User: ${userId}, Body:`, req.body);

  const { item_name } = req.body;

  if (!watchlistId || !item_name) {
    console.log(`❌ REMOVE ITEM ERROR - Missing parameters: watchlistId=${watchlistId}, item_name=${item_name}`);
    return res.status(400).json({
      success: false,
      error: 'Missing required parameters: watchlist_id and item_name'
    });
  }

  // First verify the watchlist belongs to the user
  const { data: existingWatchlist, error: fetchError } = await supabaseService
    .from('user_watchlists')
    .select('id, user_id, watchlist_name')
    .eq('id', parseInt(watchlistId))
    .single();

  if (fetchError || !existingWatchlist) {
    console.log(`❌ REMOVE ITEM ERROR - Watchlist not found: ${watchlistId}`);
    return res.status(404).json({
      success: false,
      error: 'Watchlist not found'
    });
  }

  if (existingWatchlist.user_id !== userId) {
    console.log(`❌ REMOVE ITEM ERROR - Access denied for user ${userId} on watchlist ${watchlistId}`);
    return res.status(403).json({
      success: false,
      error: 'Access denied - watchlist does not belong to user'
    });
  }

  console.log(`✅ REMOVE ITEM - Verified ownership for watchlist "${existingWatchlist.watchlist_name}"`);

  // Remove the item from the watchlist
  const { error } = await supabaseService
    .from('user_watchlist_items')
    .delete()
    .eq('watchlist_id', parseInt(watchlistId))
    .eq('item_name', item_name);

  if (error) {
    console.error('Error removing item from watchlist:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to remove item from watchlist',
      details: error.message
    });
  }

  console.log(`✅ REMOVE ITEM - Successfully removed "${item_name}" from watchlist ${watchlistId}`);

  return res.json({
    success: true,
    message: 'Item removed from watchlist successfully'
  });
}

// ===== FILTER NEWS BY WATCHLIST HANDLER =====
async function handleFilterNews(req, res, supabaseService, userId, watchlistId) {
  const market = req.query.market || 'US';
  const page = parseInt(req.query.page) || 1;
  const perPage = 50; // Show more articles for watchlist filtering
  const offset = (page - 1) * perPage;

  console.log(`🔍 FILTER-NEWS: Starting request for watchlist ${watchlistId}, market: ${market}, page: ${page}`);

  // Get watchlist details
  const { data: watchlist, error: watchlistError } = await supabaseService
    .from('user_watchlists')
    .select('*')
    .eq('id', parseInt(watchlistId))
    .single();

  if (watchlistError || !watchlist) {
    return res.status(404).json({
      success: false,
      error: 'Watchlist not found'
    });
  }

  // Verify ownership
  if (watchlist.user_id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'Access denied'
    });
  }

  console.log(`Found watchlist: ${watchlist.watchlist_name} (${watchlist.watchlist_category})`);

  // Get items for this watchlist
  const { data: items, error: itemsError } = await supabaseService
    .from('user_watchlist_items')
    .select('id, item_name')
    .eq('watchlist_id', parseInt(watchlistId));

  if (itemsError) {
    console.error('Error getting watchlist items:', itemsError);
    return res.status(500).json({
      success: false,
      error: 'Failed to get watchlist items',
      details: itemsError.message
    });
  }

  const itemNames = items.map(item => item.item_name);

  console.log(`Watchlist has ${itemNames.length} items:`, itemNames);

  if (itemNames.length === 0) {
    return res.json({
      success: true,
      articles: [],
      pagination: { current_page: 1, total_pages: 0, total_articles: 0 },
      watchlist: {
        id: watchlist.id,
        name: watchlist.watchlist_name,
        type: watchlist.watchlist_category,
        user_id: watchlist.user_id,
        items: itemNames
      },
      message: 'Watchlist is empty'
    });
  }

  // Query appropriate discovered news table based on watchlist type
  const tableName = `watchlist_${watchlist.watchlist_category}`;

  // Build query for the discovered news table
  // Join with watchlist_lookup to get item names for filtering
  const query = supabaseService
    .from(tableName)
    .select(`
      *,
      watchlist_lookup!inner(item_name, item_type, market)
    `)
    .eq('market', market)
    .in('watchlist_lookup.item_name', itemNames)
    .order('published_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  const { data: articles, error: articlesError } = await query;

  if (articlesError) {
    console.error(`❌ DB ERROR in ${tableName} query:`, articlesError);
    return res.status(500).json({
      success: false,
      error: 'Failed to get watchlist articles',
      details: articlesError.message
    });
  }

  console.log(`✅ Found ${articles.length} articles from ${tableName} table`);

  // Get total count
  const { count, error: countError } = await supabaseService
    .from(tableName)
    .select('*, watchlist_lookup!inner(item_name)', { count: 'exact', head: true })
    .eq('market', market)
    .in('watchlist_lookup.item_name', itemNames);

  if (countError) {
    console.error('Error getting article count:', countError);
    return res.status(500).json({
      success: false,
      error: 'Failed to get article count',
      details: countError.message
    });
  }

  const totalArticles = count;
  const totalPages = Math.ceil(totalArticles / perPage);

  // Format articles to match expected frontend format
  const formattedArticles = articles.map(article => ({
    business_bites_news_id: article.id,
    title: article.title,
    summary: article.summary || article.title,
    market: article.market,
    sector: watchlist.watchlist_category === 'sectors' ? article.item_name : 'Technology',
    company_name: watchlist.watchlist_category === 'companies' ? article.item_name : null,
    impact_score: article.impact_score || 6.5,
    sentiment: article.sentiment || 'neutral',
    link: article.url,
    urlToImage: null,
    thumbnail_url: null,
    published_at: article.published_at || article.discovered_at,
    source_system: article.source_system || 'Watchlist',
    author: null,
    summary_short: article.summary || article.title,
    alternative_sources: null,
    rank: 1,
    slno: article.id,
    source_links: [{
      title: article.title,
      source: article.source_system || 'Watchlist',
      url: article.url,
      published_at: article.published_at || article.discovered_at,
      rank: 1
    }]
  }));

  const response = {
    success: true,
    articles: formattedArticles,
    articles_count: formattedArticles.length,
    market: market,
    watchlist: {
      id: watchlist.id,
      name: watchlist.watchlist_name,
      type: watchlist.watchlist_category,
      user_id: watchlist.user_id,
      items: itemNames
    },
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_articles: totalArticles,
      has_previous: page > 1,
      has_next: page < totalPages,
      previous_page: page > 1 ? page - 1 : null,
      next_page: page < totalPages ? page + 1 : null
    }
  };

  return res.json(response);
}
