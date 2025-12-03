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

    console.log('Debug endpoint called with ID:', id);

    // Get a sample of articles to understand the structure
    const { data: sampleArticles, error: sampleError } = await supabase
      .from('business_bites_display')
      .select('business_bites_news_id, news_analysis_id, slno, title')
      .limit(10);

    if (sampleError) {
      console.error('Sample error:', sampleError);
      return res.status(500).json({ error: 'Failed to get sample data', details: sampleError });
    }

    console.log('Sample articles:', sampleArticles);

    // If an ID is provided, try to find it
    if (id) {
      console.log('Searching for ID:', id, 'Type:', typeof id);

      // Strategy 1: business_bites_news_id or news_analysis_id
      const { data: strategy1, error: error1 } = await supabase
        .from('business_bites_display')
        .select('*')
        .or(`business_bites_news_id.eq.${id},news_analysis_id.eq.${id}`)
        .limit(5);

      // Strategy 2: slno
      const { data: strategy2, error: error2 } = await supabase
        .from('business_bites_display')
        .select('*')
        .eq('slno', parseInt(id) || id)
        .limit(5);

      // Strategy 3: partial match
      const { data: strategy3, error: error3 } = await supabase
        .from('business_bites_display')
        .select('*')
        .ilike('business_bites_news_id', `%${id}%`)
        .limit(5);

      const results = {
        requested_id: id,
        strategy1: {
          found: strategy1?.length || 0,
          error: error1?.message,
          data: strategy1
        },
        strategy2: {
          found: strategy2?.length || 0,
          error: error2?.message,
          data: strategy2
        },
        strategy3: {
          found: strategy3?.length || 0,
          error: error3?.message,
          data: strategy3
        }
      };

      console.log('Search results:', JSON.stringify(results, null, 2));

      return res.status(200).json({
        sample_articles: sampleArticles,
        search_results: results
      });
    }

    // Just return sample data
    res.status(200).json({
      sample_articles: sampleArticles,
      message: 'Provide an id parameter to search for specific articles'
    });
  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
