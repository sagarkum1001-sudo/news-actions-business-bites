import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      market = 'US',
      sector,
      page = 1,
      limit = 12,
      search
    } = req.query;

    let query = supabase
      .from('business_bites_display')
      .select('*')
      .eq('market', market.toUpperCase())
      .order('published_at', { ascending: false });

    // Add sector filter if provided
    if (sector) {
      query = query.eq('sector', sector);
    }

    // Add search filter if provided
    if (search) {
      query = query.or(`title.ilike.%${search}%,summary.ilike.%${search}%`);
    }

    // Pagination
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;
    query = query.range(from, to);

    const { data: articles, error, count } = await query;

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
          id: key,
          title: article.title,
          summary: article.summary,
          market: article.market,
          sector: article.sector,
          impact_score: article.impact_score,
          published_at: article.published_at,
          source_links: []
        });
      }

      // Add source link
      articlesMap.get(key).source_links.push({
        source: article.source_system,
        url: article.link,
        urlToImage: article.urlToImage,
        author: article.author
      });
    });

    const groupedArticles = Array.from(articlesMap.values());

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('business_bites_display')
      .select('*', { count: 'exact', head: true })
      .eq('market', market.toUpperCase());

    res.status(200).json({
      articles: groupedArticles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
