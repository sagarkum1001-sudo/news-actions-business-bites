import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { query, market = 'US', user_id, limit = 10 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    console.log('Search API called with:', { query, market, user_id, limit });

    // Search in business_bites_display table
    // We'll search in title and summary fields
    const searchTerm = query.trim().toLowerCase();

    let searchQuery = supabase
      .from('business_bites_display')
      .select('*')
      .eq('market', market.toUpperCase())
      .or(`title.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`)
      .order('published_at', { ascending: false })
      .limit(parseInt(limit));

    const { data: articles, error } = await searchQuery;

    if (error) {
      console.error('Search database error:', error);
      return res.status(500).json({ error: 'Failed to search articles' });
    }

    console.log(`Found ${articles?.length || 0} articles matching "${query}"`);

    // Group the articles the same way as the main endpoint
    const articlesMap = new Map();

    (articles || []).forEach(article => {
      const key = article.business_bites_news_id || article.news_analysis_id;
      if (!articlesMap.has(key)) {
        articlesMap.set(key, {
          business_bites_news_id: article.business_bites_news_id,
          id: key,
          title: article.title,
          summary: article.summary,
          market: article.market,
          sector: article.sector,
          impact_score: article.impact_score,
          sentiment: article.sentiment,
          link: article.link,
          urlToImage: article.urlToImage,
          thumbnail_url: article.thumbnail_url,
          published_at: article.published_at,
          source_system: article.source_system,
          author: article.author,
          summary_short: article.summary_short,
          alternative_sources: article.alternative_sources,
          rank: article.rank,
          slno: article.slno,
          source_links: []
        });
      }

      // Add source link
      articlesMap.get(key).source_links.push({
        title: article.title,
        source: article.source_system,
        url: article.link,
        published_at: article.published_at,
        rank: article.rank
      });
    });

    const groupedArticles = Array.from(articlesMap.values());

    console.log(`Returning ${groupedArticles.length} grouped articles`);

    res.status(200).json({
      articles: groupedArticles,
      query: query,
      market: market,
      total: groupedArticles.length
    });
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
