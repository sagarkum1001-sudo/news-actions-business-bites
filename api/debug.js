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

  try {
    // Get all markets and their counts
    const { data: allData, error: allError } = await supabase
      .from('business_bites_display')
      .select('market')
      .limit(1000);

    if (allError) {
      return res.status(500).json({ error: allError.message });
    }

    // Count by market
    const marketCounts = {};
    allData.forEach(item => {
      const market = item.market || 'Unknown';
      marketCounts[market] = (marketCounts[market] || 0) + 1;
    });

    // Get sample China articles
    const { data: chinaData, error: chinaError } = await supabase
      .from('business_bites_display')
      .select('*')
      .eq('market', 'China')
      .limit(5);

    // Try different case variations
    const { data: chinaLowerData, error: chinaLowerError } = await supabase
      .from('business_bites_display')
      .select('*')
      .eq('market', 'china')
      .limit(5);

    const { data: chinaUpperData, error: chinaUpperError } = await supabase
      .from('business_bites_display')
      .select('*')
      .eq('market', 'CHINA')
      .limit(5);

    res.status(200).json({
      total_articles: allData.length,
      market_counts: marketCounts,
      china_exact_case: {
        count: chinaData ? chinaData.length : 0,
        error: chinaError?.message,
        sample: chinaData ? chinaData.slice(0, 2) : []
      },
      china_lowercase: {
        count: chinaLowerData ? chinaLowerData.length : 0,
        error: chinaLowerError?.message,
        sample: chinaLowerData ? chinaLowerData.slice(0, 2) : []
      },
      china_uppercase: {
        count: chinaUpperData ? chinaUpperData.length : 0,
        error: chinaUpperError?.message,
        sample: chinaUpperData ? chinaUpperData.slice(0, 2) : []
      }
    });

  } catch (error) {
    console.error('Debug API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
