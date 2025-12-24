// Test script to verify Supabase table structure and data
// Run with: node test_supabase_connection.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection and table structure...\n');

  try {
    // Test 1: Check business_bites_display table exists and get sample data
    console.log('📊 Testing business_bites_display table...');
    const { data: articles, error: articlesError, count } = await supabase
      .from('business_bites_display')
      .select('*', { count: 'exact' })
      .limit(3);

    if (articlesError) {
      console.error('❌ business_bites_display table error:', articlesError.message);
    } else {
      console.log(`✅ business_bites_display table exists`);
      console.log(`📊 Total records: ${count}`);
      console.log(`📊 Sample records: ${articles ? articles.length : 0}`);

      if (articles && articles.length > 0) {
        console.log('📋 First article columns:', Object.keys(articles[0]));
        console.log('📋 First article sample:', {
          id: articles[0].news_analysis_id || articles[0].id,
          title: articles[0].title?.substring(0, 50) + '...',
          market: articles[0].market,
          sector: articles[0].sector,
          published_at: articles[0].published_at
        });
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Check user-related tables
    const userTables = ['user_watchlists', 'user_watchlist_items', 'user_feedback', 'user_read_later'];

    for (const table of userTables) {
      console.log(`📊 Testing ${table} table...`);
      const { data, error, count: tableCount } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error(`❌ ${table} table error:`, error.message);
      } else {
        console.log(`✅ ${table} table exists (${tableCount} records)`);
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2.5: Check watchlist discovery tables
    const watchlistTables = ['watchlist_companies', 'watchlist_sectors', 'watchlist_topics', 'watchlist_lookup'];

    for (const table of watchlistTables) {
      console.log(`📊 Testing ${table} table...`);
      const { data, error, count: tableCount } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error(`❌ ${table} table error:`, error.message);
      } else {
        console.log(`✅ ${table} table exists (${tableCount} records)`);
        if (data && data.length > 0) {
          console.log(`📋 Sample columns:`, Object.keys(data[0]));
        }
      }
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Simulate the API query that the frontend makes
    console.log('🔍 Testing API query simulation...');
    const { data: apiTest, error: apiError } = await supabase
      .from('business_bites_display')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(5);

    if (apiError) {
      console.error('❌ API query simulation failed:', apiError.message);
    } else {
      console.log(`✅ API query successful - returned ${apiTest?.length || 0} articles`);
      if (apiTest && apiTest.length > 0) {
        console.log('📋 API response structure check:');
        const first = apiTest[0];
        const expectedFields = ['title', 'summary', 'market', 'sector', 'impact_score', 'sentiment', 'link', 'published_at', 'source_system', 'business_bites_news_id'];
        const missingFields = expectedFields.filter(field => !(field in first));

        if (missingFields.length === 0) {
          console.log('✅ All expected fields present');
        } else {
          console.log('⚠️ Missing fields:', missingFields);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSupabaseConnection().then(() => {
  console.log('\n🏁 Supabase connection test completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Test failed with error:', error);
  process.exit(1);
});
