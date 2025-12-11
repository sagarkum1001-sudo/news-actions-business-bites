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

  const url = req.url || '';

  // ===== ROUTE INDIVIDUAL ARTICLES =====
  if (url.includes('/article/')) {
    return handleIndividualArticle(req, res);
  }

  // ===== ROUTE NEWS FEED =====
  else {
    return handleNewsFeed(req, res);
  }
}

// ===== INDIVIDUAL ARTICLE HANDLER =====
async function handleIndividualArticle(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract article ID from URL
    const articleIdMatch = req.url.match(/\/article\/([^\/]+)/);
    if (!articleIdMatch) {
      return res.status(400).json({ error: 'Invalid article URL format' });
    }

    const id = articleIdMatch[1];
    console.log('Article API called with ID:', id, 'Type:', typeof id);

    // Try multiple strategies to find the article
    let articles = null;
    let error = null;

    // Strategy 1: Try exact match on business_bites_news_id or news_analysis_id
    let result = await supabase
      .from('business_bites_display')
      .select('*')
      .or(`business_bites_news_id.eq.${id},news_analysis_id.eq.${id}`)
      .order('published_at', { ascending: false });

    if (result.error) {
      console.error('Strategy 1 error:', result.error);
      error = result.error;
    } else if (result.data && result.data.length > 0) {
      console.log('Strategy 1 found articles:', result.data.length);
      articles = result.data;
    }

    // Strategy 2: If no results, try treating ID as slno (integer)
    if (!articles && !isNaN(id)) {
      console.log('Strategy 2: Trying slno match for ID:', id);
      result = await supabase
        .from('business_bites_display')
        .select('*')
        .eq('slno', parseInt(id))
        .order('published_at', { ascending: false });

      if (result.error) {
        console.error('Strategy 2 error:', result.error);
      } else if (result.data && result.data.length > 0) {
        console.log('Strategy 2 found articles:', result.data.length);
        articles = result.data;
      }
    }

    // Strategy 3: If still no results, try partial match on titles or search for related articles
    if (!articles) {
      console.log('Strategy 3: Trying broader search for ID:', id);
      result = await supabase
        .from('business_bites_display')
        .select('*')
        .ilike('business_bites_news_id', `%${id}%`)
        .order('published_at', { ascending: false })
        .limit(10);

      if (result.error) {
        console.error('Strategy 3 error:', result.error);
      } else if (result.data && result.data.length > 0) {
        console.log('Strategy 3 found articles:', result.data.length);
        articles = result.data;
      }
    }

    if (error && !articles) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch article' });
    }

    if (!articles || articles.length === 0) {
      console.log('No articles found for ID:', id);
      // Log some sample data to understand the schema
      const { data: sampleData } = await supabase
        .from('business_bites_display')
        .select('business_bites_news_id, news_analysis_id, slno, title')
        .limit(5);

      console.log('Sample data from database:', sampleData);
      return res.status(404).json({ error: 'Article not found', id: id });
    }

    // Group the articles the same way as the main endpoint
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

    // Get the specific article by ID - handle type conversion
    let article = null;

    // Try exact match first
    article = articlesMap.get(id);

    // If not found, try converting types
    if (!article) {
      // Try as number if id is string
      if (typeof id === 'string' && !isNaN(id)) {
        article = articlesMap.get(parseInt(id));
      }
      // Try as string if id is number
      else if (typeof id === 'number') {
        article = articlesMap.get(id.toString());
      }
    }

    if (!article) {
      console.log('Article not found in map. Available keys:', Array.from(articlesMap.keys()));
      console.log('Requested id:', id, 'Type:', typeof id);
      return res.status(404).json({
        error: 'Article not found',
        requested_id: id,
        available_ids: Array.from(articlesMap.keys())
      });
    }

    res.status(200).json({
      article: article
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== NEWS FEED HANDLER =====
async function handleNewsFeed(req, res) {
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
