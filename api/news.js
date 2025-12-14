import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return handleNewsFeed(req, res);
}

// ===== NEWS FEED HANDLER =====
async function handleNewsFeed(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      market,
      sector,
      search
    } = req.query;

    let query = supabase
      .from('business_bites_display')
      .select('*')
      .order('published_at', { ascending: false });

    // Add market filter only if specified (case-insensitive comparison)
    if (market) {
      query = query.ilike('market', market);
    }

    // Add sector filter if provided
    if (sector) {
      query = query.eq('sector', sector);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    // No pagination - return all articles
    const { data: articles, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch news' });
    }

    // Group articles by business_bites_news_id (similar to local logic)
    const articlesMap = new Map();

    articles.forEach(article => {
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
          urlToImage: article.urlToImage,  // Direct from database
          thumbnail_url: article.thumbnail_url,  // Direct from database
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

    res.status(200).json({
      articles: groupedArticles,
      total: groupedArticles.length
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
