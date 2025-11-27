import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Markets API: SUPABASE_URL exists:', !!SUPABASE_URL);
console.log('Markets API: SERVICE_ROLE_KEY exists:', !!SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  console.log('Markets API called with method:', req.method);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Markets API: Connecting to Supabase...');
    const { data: markets, error } = await supabase
      .from('business_bites_display')
      .select('market')
      .not('market', 'is', null);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch markets' });
    }

    // Get unique markets
    const uniqueMarkets = [...new Set(markets.map(item => item.market))].sort();

    res.status(200).json({ markets: uniqueMarkets });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
