import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { market } = req.query;

    let query = supabase
      .from('business_bites_display')
      .select('sector')
      .not('sector', 'is', null);

    // Filter by market if provided
    if (market) {
      query = query.eq('market', market.toUpperCase());
    }

    const { data: sectors, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch sectors' });
    }

    // Get unique sectors
    const uniqueSectors = [...new Set(sectors.map(item => item.sector))].sort();

    res.status(200).json({ sectors: uniqueSectors });
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
