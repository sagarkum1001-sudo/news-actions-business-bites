import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  try {
    console.log('Testing database connection...');

    // Test environment variables
    const envCheck = {
      hasUrl: !!SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY,
      url: SUPABASE_URL ? 'SET' : 'NOT SET',
      anonKey: SUPABASE_ANON_KEY ? 'SET (length: ' + SUPABASE_ANON_KEY.length + ')' : 'NOT SET',
      serviceKey: SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET'
    };

    console.log('Environment variables:', envCheck);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({
        error: 'Missing environment variables',
        envCheck
      });
    }

    // Test database connection with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Test basic connection
    const { data: testData, error: testError } = await supabase
      .from('business_bites_display')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Database connection test failed:', testError);
      return res.status(500).json({
        error: 'Database connection failed',
        envCheck,
        dbError: testError
      });
    }

    // Test read_later table existence
    const { data: tableData, error: tableError } = await supabase
      .from('read_later')
      .select('count')
      .limit(1);

    console.log('Database tests completed successfully');

    res.status(200).json({
      success: true,
      message: 'Database connection successful',
      envCheck,
      business_bites_display: testError ? 'FAILED' : 'OK',
      read_later_table: tableError ? 'FAILED' : 'OK',
      tableError: tableError ? tableError.message : null
    });

  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      error: 'Test failed',
      details: error.message,
      stack: error.stack
    });
  }
}
