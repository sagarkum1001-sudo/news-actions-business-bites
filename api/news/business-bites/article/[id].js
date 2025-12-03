import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Article ID is required' });
    }

    // Fetch all articles with the same business_bites_news_id or news_analysis_id
    // This handles the grouped article structure
    const { data: articles, error } = await supabase
      .from('business_bites_display')
      .select('*')
      .or(`business_bites_news_id.eq.${id},news_analysis_id.eq.${id}`)
      .order('published_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch article' });
    }

    if (!articles || articles.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
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

    // Get the specific article by ID
    const article = articlesMap.get(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.status(200).json({
      article: article
    });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
