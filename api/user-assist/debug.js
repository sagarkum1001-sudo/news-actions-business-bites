const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use service role key for database operations (bypasses RLS)
const supabaseService = createClient(supabaseUrl, supabaseServiceRoleKey);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET for debug endpoint'
    });
  }

  console.log('🔧 DEBUG: Testing user_feedback table access');

  try {
    // Test basic table access
    const { data: testData, error: testError } = await supabaseService
      .from('user_feedback')
      .select('count', { count: 'exact', head: true });

    if (testError) {
      console.error('Table access error:', testError);
      return res.json({
        debug: true,
        table_access: false,
        error: testError.message,
        code: testError.code,
        hint: testError.hint,
        details: testError.details,
        timestamp: new Date().toISOString()
      });
    }

    // Test data retrieval
    const { data: dataTest, error: dataError } = await supabaseService
      .from('user_feedback')
      .select('*')
      .limit(1);

    // Test table schema
    const { data: schemaTest, error: schemaError } = await supabaseService
      .rpc('describe_table', { table_name: 'user_feedback' })
      .catch(() => null); // RPC might not exist, ignore error

    return res.json({
      debug: true,
      table_access: true,
      data_retrieval: dataTest ? true : false,
      record_count: testData || 0,
      has_records: (dataTest && dataTest.length > 0) ? true : false,
      schema_available: schemaTest ? true : false,
      data_error: dataError?.message || null,
      data_code: dataError?.code || null,
      timestamp: new Date().toISOString(),
      environment: {
        supabase_url: supabaseUrl ? 'configured' : 'missing',
        service_role_key: supabaseServiceRoleKey ? 'configured' : 'missing'
      }
    });

  } catch (debugError) {
    console.error('Debug endpoint error:', debugError);
    return res.status(500).json({
      debug: true,
      error: 'Debug endpoint failed',
      details: debugError.message,
      timestamp: new Date().toISOString()
    });
  }
};
