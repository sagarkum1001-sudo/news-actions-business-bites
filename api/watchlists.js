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

    // ===== GET ALL USER WATCHLISTS =====
    console.log(`DEBUG: req.method=${req.method}, req.url=${req.url}`);
    if (req.method === 'GET') {
      console.log(`Getting all watchlists for user: ${userId}`);

      // Get all watchlists for the user
      const { data: watchlists, error } = await supabase
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
          const { data: items, error: itemsError } = await supabase
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

    // ===== CREATE NEW WATCHLIST =====
    else if (req.method === 'POST' && req.url.includes('/create')) {
      const { name, type, market } = req.body;

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

      console.log(`Creating watchlist "${trimmedName}" (${type}) for user: ${userId}`);

      // Check current watchlist count for this user (max 10)
      const { count, error: countError } = await supabase
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
      const { data: existing, error: duplicateError } = await supabase
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
      const { data, error } = await supabase
        .from('user_watchlists')
        .insert({
          user_id: userId,
          watchlist_name: trimmedName,
          watchlist_category: type,
          market: market || 'US'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating watchlist:', error);
        if (error.code === '23505') { // Unique constraint violation
          return res.status(409).json({
            success: false,
            error: 'Watchlist name already exists',
            message: 'A watchlist with this name already exists for your account.'
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to create watchlist',
          details: error.message
        });
      }

      console.log(`✅ Watchlist "${trimmedName}" created successfully with ID: ${data.id}`);

      return res.json({
        success: true,
        message: 'Watchlist created successfully',
        watchlist_id: data.id,
        watchlist: {
          id: data.id,
          user_id: userId,
          name: trimmedName,
          type: type,
          items: [],
          created_at: data.created_at
        }
      });
    }

    // ===== ADD ITEM TO WATCHLIST =====
    else if (req.method === 'POST' && req.url.match(/\/(\d+)\/items$/)) {
      const watchlistId = req.url.match(/\/(\d+)\/items$/)[1];
      const { item_name } = req.body;

      if (!watchlistId || !item_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: watchlist_id and item_name'
        });
      }

      // First, get watchlist details to set the correct market and type
      const { data: watchlist, error: watchlistError } = await supabase
        .from('user_watchlists')
        .select('market, watchlist_category, user_id')
        .eq('id', watchlistId)
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

      console.log(`Adding item "${item_name}" to watchlist: ${watchlistId} (${watchlist.market})`);

      const { data, error } = await supabase
        .from('user_watchlist_items')
        .insert({
          watchlist_id: parseInt(watchlistId),
          item_name: item_name,
          market: watchlist.market,
          watchlist_type: watchlist.watchlist_category,
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

      return res.json({
        success: true,
        message: 'Item added to watchlist successfully',
        item_id: data.id
      });
    }

    // ===== REMOVE ITEM FROM WATCHLIST =====
    else if (req.method === 'DELETE' && req.url.match(/\/(\d+)\/items$/)) {
      const watchlistId = req.url.match(/\/(\d+)\/items$/)[1];
      const { item_name } = req.body;

      if (!watchlistId || !item_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: watchlist_id and item_name'
        });
      }

      console.log(`Removing item "${item_name}" from watchlist: ${watchlistId}`);

      const { error } = await supabase
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

      return res.json({
        success: true,
        message: 'Item removed from watchlist successfully'
      });
    }

    // ===== DELETE WATCHLIST =====
    else if (req.method === 'DELETE' && req.url.match(/\/(\d+)$/)) {
      const watchlistId = req.url.match(/\/(\d+)$/)[1];

      if (!watchlistId) {
        return res.status(400).json({
          success: false,
          error: 'Missing watchlist_id parameter'
        });
      }

      console.log(`Deleting watchlist: ${watchlistId}`);

      // Delete the watchlist (items will be deleted automatically due to CASCADE)
      const { error } = await supabase
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

      return res.json({
        success: true,
        message: 'Watchlist deleted successfully'
      });
    }

    // ===== FILTER NEWS BY WATCHLIST =====
    else if (req.method === 'GET' && req.url.match(/\/(\d+)\/filter-news$/)) {
      const watchlistId = req.url.match(/\/(\d+)\/filter-news$/)[1];
      const market = req.query.market || 'US';
      const page = parseInt(req.query.page) || 1;
      const perPage = 50; // Show more articles for watchlist filtering
      const offset = (page - 1) * perPage;

      console.log(`🔍 FILTER-NEWS: Starting request for watchlist ${watchlistId}, market: ${market}, page: ${page}`);

      // Get watchlist details
      const { data: watchlist, error: watchlistError } = await supabase
        .from('user_watchlists')
        .select('*')
        .eq('id', watchlistId)
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
      const { data: items, error: itemsError } = await supabase
        .from('user_watchlist_items')
        .select('id, item_name')
        .eq('watchlist_id', watchlistId);

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

      const query = supabase
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
      const { count, error: countError } = await supabase
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

    // ===== UNSUPPORTED METHOD =====
    else {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Error in watchlists API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
