const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only handle GET requests for lookup
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Only GET requests are supported for lookup.'
    });
  }

  try {
    // ===== LOOKUP SUGGESTIONS FOR AUTOCOMPLETE =====
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
    try {
      let queryBuilder = supabase
        .from('watchlist_lookup')
        .select('*')
        .eq('market', market)
        .ilike('item_name', `%${query}%`)
        .order('market_cap_rank', { ascending: true, nullsLast: true })
        .order('item_name', { ascending: true })
        .limit(parseInt(limit));

      // Add type filter if specified
      if (type && type !== 'all') {
        queryBuilder = queryBuilder.eq('item_type', type);
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

    } catch (error) {
      console.error('Error in lookup query:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error during lookup',
        details: error.message
      });
    }

  } catch (error) {
    console.error('Error in watchlist lookup API:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
};
