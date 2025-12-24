const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Test with anon key (for client-side operations)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Test with service role (for admin operations)
const supabaseService = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function runDatabaseTests() {
  console.log('🚀 Starting comprehensive Supabase database tests...\n');

  const results = {
    environment: {},
    connectivity: {},
    tables: {},
    users: {},
    read_later: {},
    operations: {}
  };

  try {
    // Phase 1: Environment Variables
    console.log('📋 Phase 1: Environment Variables Check');
    results.environment = {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_ANON_KEY: !!SUPABASE_ANON_KEY ? 'SET (length: ' + SUPABASE_ANON_KEY.length + ')' : 'NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY ? 'SET (length: ' + SUPABASE_SERVICE_ROLE_KEY.length + ')' : 'NOT SET'
    };
    console.log('✅ Environment variables:', results.environment);

    // Phase 2: Basic Connectivity Test
    console.log('\n🔌 Phase 2: Basic Connectivity Test');
    try {
      const { data: testData, error: testError } = await supabaseService
        .from('business_bites_display')
        .select('count')
        .limit(1);

      if (testError) {
        results.connectivity.service_role = { status: 'FAILED', error: testError.message };
        console.log('❌ Service role connectivity failed:', testError.message);
      } else {
        results.connectivity.service_role = { status: 'OK' };
        console.log('✅ Service role connectivity: OK');
      }
    } catch (error) {
      results.connectivity.service_role = { status: 'FAILED', error: error.message };
      console.log('❌ Service role connectivity error:', error.message);
    }

    try {
      const { data: testData, error: testError } = await supabaseAnon
        .from('business_bites_display')
        .select('count')
        .limit(1);

      if (testError) {
        results.connectivity.anon_key = { status: 'FAILED', error: testError.message };
        console.log('❌ Anon key connectivity failed:', testError.message);
      } else {
        results.connectivity.anon_key = { status: 'OK' };
        console.log('✅ Anon key connectivity: OK');
      }
    } catch (error) {
      results.connectivity.anon_key = { status: 'FAILED', error: error.message };
      console.log('❌ Anon key connectivity error:', error.message);
    }

    // Phase 3: Table Existence Check
    console.log('\n📊 Phase 3: Table Existence Check');
    const tablesToCheck = ['read_later', 'user_feedback', 'user_watchlists', 'user_watchlist_items', 'business_bites_display'];

    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabaseService
          .from(table)
          .select('count')
          .limit(1);

        if (error) {
          results.tables[table] = { status: 'FAILED', error: error.message };
          console.log(`❌ Table '${table}' check failed:`, error.message);
        } else {
          results.tables[table] = { status: 'EXISTS' };
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (error) {
        results.tables[table] = { status: 'ERROR', error: error.message };
        console.log(`❌ Table '${table}' error:`, error.message);
      }
    }

    // Phase 4: User Table Analysis
    console.log('\n👤 Phase 4: User Table Analysis');

    // Check if there's a users table or auth.users
    try {
      // Try to access auth.users (this usually requires service role)
      const { data: authUsers, error: authError } = await supabaseService
        .from('auth.users')
        .select('id, email, created_at')
        .limit(5);

      if (authError) {
        results.users.auth_users = { status: 'FAILED', error: authError.message };
        console.log('❌ Auth users access failed:', authError.message);
      } else {
        results.users.auth_users = {
          status: 'OK',
          count: authUsers?.length || 0,
          sample: authUsers?.slice(0, 2) || []
        };
        console.log(`✅ Auth users accessible, count: ${authUsers?.length || 0}`);
        if (authUsers?.length > 0) {
          console.log('📝 Sample users:', authUsers.slice(0, 2));
        }
      }
    } catch (error) {
      results.users.auth_users = { status: 'ERROR', error: error.message };
      console.log('❌ Auth users error:', error.message);
    }

    // Phase 5: Read Later Table Analysis
    console.log('\n📖 Phase 5: Read Later Table Analysis');

    if (results.tables.read_later?.status === 'EXISTS') {
      try {
        // Get table structure
        const { data: structure, error: structError } = await supabaseService
          .from('read_later')
          .select('*')
          .limit(1);

        if (structError) {
          results.read_later.structure = { status: 'FAILED', error: structError.message };
        } else {
          results.read_later.structure = { status: 'OK', sample: structure?.[0] || null };
        }

        // Get record count
        const { count, error: countError } = await supabaseService
          .from('read_later')
          .select('*', { count: 'exact', head: true });

        if (countError) {
          results.read_later.count = { status: 'FAILED', error: countError.message };
        } else {
          results.read_later.count = { status: 'OK', count: count || 0 };
          console.log(`📊 Read later records: ${count || 0}`);
        }

        // Get sample records
        if ((count || 0) > 0) {
          const { data: samples, error: sampleError } = await supabaseService
            .from('read_later')
            .select('*')
            .limit(3);

          if (sampleError) {
            results.read_later.samples = { status: 'FAILED', error: sampleError.message };
          } else {
            results.read_later.samples = { status: 'OK', data: samples };
            console.log('📝 Sample read later records:', samples);
          }
        }

      } catch (error) {
        results.read_later.analysis = { status: 'ERROR', error: error.message };
        console.log('❌ Read later analysis error:', error.message);
      }
    } else {
      console.log('⚠️ Read later table does not exist, skipping analysis');
    }

    // Phase 6: Test Basic Operations
    console.log('\n🔧 Phase 6: Test Basic Operations');

    if (results.tables.read_later?.status === 'EXISTS') {
      // Test SELECT operation
      try {
        const { data: selectData, error: selectError } = await supabaseService
          .from('read_later')
          .select('*')
          .limit(1);

        results.operations.select = selectError
          ? { status: 'FAILED', error: selectError.message }
          : { status: 'OK' };
        console.log(selectError ? '❌ SELECT failed:' : '✅ SELECT works', selectError?.message || '');
      } catch (error) {
        results.operations.select = { status: 'ERROR', error: error.message };
        console.log('❌ SELECT error:', error.message);
      }

      // Test INSERT operation (we'll rollback this test)
      try {
        const testRecord = {
          user_id: 'test-user-' + Date.now(),
          article_id: 'test-article-' + Date.now(),
          title: 'Test Article',
          url: 'https://example.com',
          sector: 'Technology',
          source_system: 'test'
        };

        const { data: insertData, error: insertError } = await supabaseService
          .from('read_later')
          .insert(testRecord)
          .select();

        if (insertError) {
          results.operations.insert = { status: 'FAILED', error: insertError.message };
          console.log('❌ INSERT failed:', insertError.message);
        } else {
          results.operations.insert = { status: 'OK' };
          console.log('✅ INSERT works');

          // Clean up test record
          if (insertData?.[0]?.id) {
            await supabaseService
              .from('read_later')
              .delete()
              .eq('id', insertData[0].id);
          }
        }
      } catch (error) {
        results.operations.insert = { status: 'ERROR', error: error.message };
        console.log('❌ INSERT error:', error.message);
      }
    }

    // Phase 7: RLS Policy Check
    console.log('\n🔒 Phase 7: RLS Policy Check');

    // Try anon key operations (should be restricted by RLS)
    try {
      const { data: rlsData, error: rlsError } = await supabaseAnon
        .from('read_later')
        .select('*')
        .limit(1);

      if (rlsError) {
        results.operations.rls_check = { status: 'RESTRICTED', error: rlsError.message };
        console.log('✅ RLS working - anon operations restricted:', rlsError.message);
      } else {
        results.operations.rls_check = { status: 'NOT_RESTRICTED', data: rlsData };
        console.log('⚠️ RLS not working - anon operations allowed');
      }
    } catch (error) {
      results.operations.rls_check = { status: 'ERROR', error: error.message };
      console.log('❌ RLS check error:', error.message);
    }

  } catch (error) {
    console.error('💥 Test suite error:', error);
    results.overall_error = error.message;
  }

  // Final Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('========================');
  console.log(JSON.stringify(results, null, 2));

  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('==================');

  if (results.connectivity.service_role?.status !== 'OK') {
    console.log('❌ Fix Supabase service role connectivity');
  }

  if (results.tables.read_later?.status !== 'EXISTS') {
    console.log('❌ Create read_later table');
  }

  if (results.users.auth_users?.status !== 'OK') {
    console.log('❌ Fix user authentication setup');
  }

  if ((results.read_later.count?.count || 0) === 0) {
    console.log('ℹ️ No read_later records - users may not be saving articles yet');
  }

  if (results.operations.insert?.status !== 'OK') {
    console.log('❌ Fix database INSERT permissions');
  }

  if (results.operations.rls_check?.status === 'NOT_RESTRICTED') {
    console.log('⚠️ RLS policies may not be properly configured');
  }

  console.log('\n✅ Test completed successfully');
  return results;
}

// Run the tests
runDatabaseTests().catch(console.error);
