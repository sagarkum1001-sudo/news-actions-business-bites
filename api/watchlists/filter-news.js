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
    const watchlistId = req.query.id || req.query.watchlistId;
    const market = req.query.market;  // Remove default to allow all markets
    const page = parseInt(req.query.page) || 1;
    const perPage = 50; // Show more articles for watchlist filtering
    const offset = (page - 1) * perPage;

    console.log(`🔍 FILTER-NEWS API: watchlist ${watchlistId}, market: ${market}, page: ${page}, user: ${userId}`);

    // Get watchlist details
    const { data: watchlist, error: watchlistError } = await supabaseService
      .from('user_watchlists')
      .select('*')
      .eq('id', parseInt(watchlistId))
      .single();

    if (watchlistError || !watchlist) {
      console.log(`❌ Watchlist not found: ${watchlistId}`);
      return res.status(404).json({
        success: false,
        error: 'Watchlist not found'
      });
    }

    // Verify ownership
    if (watchlist.user_id !== userId) {
      console.log(`❌ Access denied for user ${userId} on watchlist ${watchlistId}`);
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    console.log(`✅ Found watchlist: ${watchlist.watchlist_name} (${watchlist.watchlist_category})`);

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

    console.log(`📋 Watchlist has ${itemNames.length} items:`, itemNames);

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

    console.log(`🔍 Querying table: ${tableName} for items:`, itemNames);

    // Build query for the discovered news table
    // Filter directly by item_name in the watchlist table
    let query = supabaseService
      .from(tableName)
      .select('*')
      .in('item_name', itemNames)
      .order('published_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    // Only filter by market if market is specified
    if (market) {
      query = query.eq('market', market);
    }

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
    let countQuery = supabaseService
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .in('item_name', itemNames);

    // Only filter by market if market is specified
    if (market) {
      countQuery = countQuery.eq('market', market);
    }

    const { count, error: countError } = await countQuery;

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

    console.log(`📊 Total articles: ${totalArticles}, Pages: ${totalPages}`);

    // Format articles to match expected frontend format
    const formattedArticles = articles.map(article => ({
      id: article.id, // Frontend expects 'id' property
      business_bites_news_id: article.id,
      title: article.title,
      summary: article.summary || article.title,
      market: article.market,
      sector: watchlist.watchlist_category === 'sectors' ? article.item_name : 'Technology',
      company_name: watchlist.watchlist_category === 'companies' ? article.item_name : null,
      impact_score: article.impact_score || 6.5,
      sentiment: article.sentiment || 'neutral',
      link: article.link || article.url,
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
        url: article.link || article.url,
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

    console.log(`✅ Returning ${formattedArticles.length} formatted articles`);
    return res.json(response);

  } catch (error) {
    console.error('Error in filter-news API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
