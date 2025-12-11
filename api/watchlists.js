// ===== CONSOLIDATED WATCHLISTS API =====
// Handles all watchlist operations in a single endpoint
// Phase 2D: Watchlist API Consolidation

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
    // Parse URL to determine operation
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(p => p);

    console.log(`🔍 WATCHLISTS API - Method: ${req.method}, Path: ${url.pathname}, User: TBD`);

    // ===== LOOKUP/AUTOCOMPLETE (No Auth Required) =====
    if (req.method === 'GET' && pathParts.includes('lookup')) {
      return handleLookup(req, res, supabaseService);
    }

    // ===== AUTHENTICATION REQUIRED FOR ALL OTHER OPERATIONS =====
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
    console.log(`🔍 WATCHLISTS API - Method: ${req.method}, Path: ${url.pathname}, User: ${userId}`);

    // ===== LIST ALL USER WATCHLISTS =====
    if (req.method === 'GET' && pathParts.length === 1) {
      return handleListWatchlists(req, res, supabaseService, userId);
    }

    // ===== CREATE NEW WATCHLIST =====
    if (req.method === 'POST' && pathParts.length === 1) {
      return handleCreateWatchlist(req, res, supabaseService, userId);
    }

    // ===== WATCHLIST-SPECIFIC OPERATIONS =====
    if (pathParts.length >= 2) {
      const watchlistId = pathParts[1];

      // Filter news by watchlist
      if (req.method === 'GET' && pathParts.includes('filter-news')) {
        return handleFilterNews(req, res, supabaseService, userId, watchlistId);
      }

      // Add item to watchlist
      if (req.method === 'POST' && pathParts.includes('items')) {
        return handleAddItem(req, res, supabaseService, userId, watchlistId);
      }

      // Remove item from watchlist
      if (req.method === 'DELETE' && pathParts.includes('items')) {
        return handleRemoveItem(req, res, supabaseService, userId, watchlistId);
      }

      // Delete watchlist
      if (req.method === 'DELETE') {
        return handleDeleteWatchlist(req, res, supabaseService, userId, watchlistId);
      }
    }

    // ===== UNSUPPORTED OPERATION =====
    return res.status(404).json({
      success: false,
      error: 'Endpoint not found'
    });

  } catch (error) {
    console.error('Error in consolidated watchlists API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};

// ===== LOOKUP/AUTOCOMPLETE HANDLER =====
async function handleLookup(req, res, supabaseService) {
  const { query = '', market = 'US', type = 'companies', limit = 8 } = req.query;

  console.log(`🔍 LOOKUP API: query="${query}", market="${market}", type="${type}", limit=${limit}`);

  if (!query || query.length < 2) {
    return res.json({
      success: true,
      results: { companies: [], sectors: [], topics: [] },
      suggestion: null
    });
  }

  // Query the watchlist_lookup table for real data
  let queryBuilder;

  if (type === 'companies') {
    queryBuilder = supabaseService
      .from('watchlist_lookup')
      .select('*')
      .eq('market', market)
      .eq('item_type', 'companies')
      .or(`item_name.ilike.%${query}%,ticker_symbol.ilike.%${query}%`)
      .order('market_cap_rank', { ascending: true, nullsLast: true })
      .order('item_name', { ascending: true })
      .limit(parseInt(limit));
  } else if (type && type !== 'all') {
    queryBuilder = supabaseService
      .from('watchlist_lookup')
      .select('*')
      .eq('market', market)
      .eq('item_type', type)
      .ilike('item_name', `%${query}%`)
      .order('item_name', { ascending: true })
      .limit(parseInt(limit));
  } else {
    queryBuilder = supabaseService
      .from('watchlist_lookup')
      .select('*')
      .eq('market', market)
      .ilike('item_name', `%${query}%`)
      .order('market_cap_rank', { ascending: true, nullsLast: true })
      .order('item_name', { ascending: true })
      .limit(parseInt(limit));
  }

  const { data: suggestions, error } = await queryBuilder;

  if (error) {
    console.error('Error querying watchlist_lookup:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to query lookup data',
      details: error.message
    });
  }

  // Group results by type
  const results = { companies: [], sectors: [], topics: [] };

  suggestions.forEach(item => {
    const resultItem = {
      item_name: item.item_name,
      item_type: item.item_type,
      market: item.market,
      description: item.description,
      market_cap_rank: item.market_cap_rank,
      ticker_symbol: item.ticker_symbol
    };

    if (results[item.item_type]) {
      results[item.item_type].push(resultItem);
    }
  });

  // Check if we found matches
  let suggestion = null;
  const totalResults = Object.values(results).flat().length;

  if (totalResults === 0) {
    suggestion = {
      message: `"${query}" not found in our ${market} ${type} database. Would you like to submit a feature request to add it?`,
      item_name: query,
      type: type
    };
  }

  console.log(`✅ Found ${totalResults} matches for "${query}" in ${market} ${type}`);

  return res.json({
    success: true,
    results: results,
    suggestion: suggestion,
    query: query,
    market: market,
    type: type
  });
}

// ===== LIST USER WATCHLISTS HANDLER =====
async function handleListWatchlists(req, res, supabaseService, userId) {
  console.log(`📋 Getting all watchlists for user: ${userId}`);

  const { data: watchlists, error } = await supabaseService
    .from('user_watchlists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting watchlists:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get watchlists',
      details: error.message
    });
  }

  // Get items for each watchlist
  const watchlistsWithItems = await Promise.all(
    watchlists.map(async (watchlist) => {
      const { data: items, error: itemsError } = await supabaseService
        .from('user_watchlist_items')
        .select('item_name')
        .eq('watchlist_id', watchlist.id)
        .order('added_at', { ascending: false });

      if (itemsError) {
        console.error('Error getting watchlist items:', itemsError);
        return { ...watchlist, items: [] };
      }

      return {
        ...watchlist,
        items: items.map(item => item.item_name)
      };
    })
  );

  return res.json({
    success: true,
    watchlists: watchlistsWithItems,
    count: watchlistsWithItems.length
  });
}

// ===== CREATE WATCHLIST HANDLER =====
async function handleCreateWatchlist(req, res, supabaseService, userId) {
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

  console.log(`➕ Creating watchlist "${trimmedName}" (${type}) for user: ${userId} with ${items?.length || 0} items`);

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
    if (watchlistError.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'Watchlist name already exists',
        message: 'A watchlist with this name already exists for your account.'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to create watchlist',
      details: watchlistError.message
    });
  }

  console.log(`✅ Watchlist "${trimmedName}" created successfully with ID: ${watchlist.id}`);

  // Add items to the watchlist if provided
  let addedItems = [];
  if (items && Array.isArray(items) && items.length > 0) {
    console.log(`📝 Adding ${items.length} items to watchlist ${watchlist.id}`);

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
}

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
  const columnName = watchlist.watchlist_category === 'companies' ? 'company_name' :
                    watchlist.watchlist_category === 'sectors' ? 'sector_name' : 'topic_name';

  const query = supabaseService
    .from(tableName)
    .select('*')
    .in(columnName, itemNames)
    .eq('market', market)
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
    .select('*', { count: 'exact', head: true })
    .in(columnName, itemNames)
    .eq('market', market);

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
    sector: watchlist.watchlist_category === 'sectors' ? article.sector_name : 'Technology',
    company_name: watchlist.watchlist_category === 'companies' ? article.company_name : null,
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
