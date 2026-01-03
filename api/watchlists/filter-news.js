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

    // Get items for this watchlist with ticker symbols for matching
    const { data: items, error: itemsError } = await supabaseService
      .from('user_watchlist_items')
      .select('id, item_name')
      .eq('watchlist_id', parseInt(watchlistId));

    console.log(`🔍 DEBUG: Items query result:`, { data: items, error: itemsError });

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

    // Get ticker symbols for these items from watchlist_lookup table
    // Match by item_name to get ticker_symbol
    const { data: lookupData, error: lookupError } = await supabaseService
      .from('watchlist_lookup')
      .select('item_name, ticker_symbol')
      .eq('item_type', watchlist.watchlist_category)
      .in('item_name', itemNames);

    if (lookupError) {
      console.error('Error getting ticker symbols:', lookupError);
      // Continue with item names if lookup fails
    }

    // Create mapping from item_name to ticker_symbol
    const tickerMap = {};
    if (lookupData) {
      lookupData.forEach(item => {
        tickerMap[item.item_name] = item.ticker_symbol;
      });
    }

    // Use ticker symbols for matching if available, otherwise fall back to item names
    const searchTerms = itemNames.map(name => tickerMap[name] || name).filter(term => term);

    console.log(`🔍 Using search terms (ticker symbols preferred):`, searchTerms);

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

    console.log(`🔍 Querying table: ${tableName} for search terms:`, searchTerms);

    // Build query for the discovered news table
    // Column names differ by table:
    // - watchlist_companies: item_name
    // - watchlist_sectors: sector_name
    // - watchlist_topics: topic_name
    let query;
    let matchColumn;

    if (watchlist.watchlist_category === 'companies') {
      matchColumn = 'item_name';
    } else if (watchlist.watchlist_category === 'sectors') {
      matchColumn = 'sector_name';
    } else if (watchlist.watchlist_category === 'topics') {
      matchColumn = 'topic_name';
    } else {
      console.error(`Unknown watchlist category: ${watchlist.watchlist_category}`);
      return res.status(400).json({
        success: false,
        error: 'Unknown watchlist category'
      });
    }

    query = supabaseService
      .from(tableName)
      .select('*')
      .in(matchColumn, itemNames)
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
    console.log(`🔍 DEBUG: Query details - table: ${tableName}, column: ${matchColumn}, values:`, itemNames, 'market:', market);
    console.log(`🔍 DEBUG: First few articles:`, articles.slice(0, 2).map(a => ({ title: a.title, [matchColumn]: a[matchColumn] })));

    // If no articles found in pre-populated tables, do on-demand discovery
    if (articles.length === 0) {
      console.log(`⚠️ No pre-populated articles found for ${watchlist.watchlist_category}. Attempting on-demand discovery...`);

      try {
        // Import the search extractor dynamically
        const { EnhancedMetadataExtractor } = require('../../../news/enhanced_metadata_extractor');

        const searchExtractor = new EnhancedMetadataExtractor();

        // Perform on-demand search for each item
        const discoveredArticles = [];
        for (const itemName of itemNames.slice(0, 3)) { // Limit to first 3 items for performance
          console.log(`🔍 Searching news for: ${itemName}`);

          try {
            const searchResults = searchExtractor.multi_engine_search(`"${itemName}" news`);

            if (searchResults && searchResults.all_results) {
              const itemArticles = searchResults.all_results.slice(0, 5).map(result => ({
                id: Math.random().toString(36).substr(2, 9), // Generate temp ID
                business_bites_news_id: Math.random().toString(36).substr(2, 9),
                title: result.title || 'No Title',
                summary: result.summary || result.title || 'No summary available',
                market: market || watchlist.market || 'US',
                sector: watchlist.watchlist_category === 'sectors' ? itemName : 'Technology',
                company_name: watchlist.watchlist_category === 'companies' ? itemName : null,
                impact_score: 6.5,
                sentiment: 'neutral',
                link: result.url || '#',
                urlToImage: null,
                thumbnail_url: null,
                published_at: result.published_at || new Date().toISOString(),
                source_system: 'On-demand Discovery',
                author: null,
                summary_short: result.summary || result.title || 'No summary available',
                alternative_sources: null,
                rank: 1,
                slno: Math.floor(Math.random() * 10000),
                source_links: [{
                  title: result.title || 'No Title',
                  source: 'On-demand Discovery',
                  url: result.url || '#',
                  published_at: result.published_at || new Date().toISOString(),
                  rank: 1
                }]
              }));

              discoveredArticles.push(...itemArticles);
            }
          } catch (searchError) {
            console.warn(`Search failed for ${itemName}:`, searchError.message);
          }
        }

        // Limit total results and format for frontend
        const limitedArticles = discoveredArticles.slice(0, 20);

        console.log(`✅ On-demand discovery found ${limitedArticles.length} articles`);

        // Update response with discovered articles
        articles.push(...limitedArticles);
        totalArticles = articles.length;
        totalPages = Math.ceil(totalArticles / perPage);

      } catch (discoveryError) {
        console.error('❌ On-demand discovery failed:', discoveryError);
        // Continue with empty results rather than failing
      }
    }

    // Get total count - use same matching logic as main query
    let countQuery = supabaseService
      .from(tableName)
      .select('*', { count: 'exact', head: true })
      .in(matchColumn, itemNames);

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
