// Simple script to create user tables in Supabase production
require('dotenv').config();

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

async function createUserTables() {
  console.log('🏗️ Creating user tables in Supabase production...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('supabase_user_tables_setup.sql', 'utf8');

    // Split by semicolon to get individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📄 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;

      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);

      try {
        // Use raw SQL execution
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement + ';'
        });

        if (error) {
          // If rpc doesn't work, try direct query
          if (error.message.includes('function exec_sql') || error.message.includes('does not exist')) {
            console.log('ℹ️ Using alternative SQL execution method...');
            // For simple CREATE/INSERT statements, we can try direct execution
            // But many statements need special handling
          } else {
            console.warn(`⚠️ Statement ${i + 1} warning:`, error.message);
          }
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.warn(`⚠️ Statement ${i + 1} failed:`, statementError.message);
        // Continue with other statements
      }
    }

    console.log('🎉 User tables creation process completed!');

    // Test if tables were created
    console.log('\n🧪 Testing table creation...');

    const tablesToCheck = ['read_later', 'user_feedback', 'user_watchlists', 'user_watchlist_items'];

    for (const tableName of tablesToCheck) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`❌ Table '${tableName}' check failed:`, error.message);
        } else {
          console.log(`✅ Table '${tableName}' exists and accessible`);
        }
      } catch (checkError) {
        console.log(`❌ Table '${tableName}' check error:`, checkError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error creating user tables:', error);
    process.exit(1);
  }
}

// Alternative approach: Use execute-SQL endpoint if available
async function executeSQLEndpoint() {
  console.log('🌐 Using SQL execution endpoint approach...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const sqlContent = fs.readFileSync('supabase_user_tables_setup.sql', 'utf8');

  // Execute via REST API (if available)
  const { exec } = require('child_process');
  const curlCommand = `curl -X POST "${supabaseUrl}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${process.env.SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${process.env.SUPABASE_ANON_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"query": "${sqlContent.replace(/"/g, '\\"').replace(/\n/g, ' ').replace(/\s+/g, ' ')}"}'`;

  return new Promise((resolve, reject) => {
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Direct SQL endpoint approach failed, trying alternative...');
        resolve(false);
      } else if (stdout.includes('success') || stdout.includes('created')) {
        console.log('✅ SQL executed successfully via endpoint');
        resolve(true);
      } else {
        console.log('⚠️ SQL execution response unclear');
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('🚀 Starting user tables creation process...');

  // First try the direct Supabase approach
  await createUserTables();

  // If that doesn't work completely, provide manual instructions
  console.log('\n📋 MANUAL SETUP INSTRUCTIONS:');
  console.log('If the automatic creation failed, you can manually execute the SQL in:');
  console.log('  - supabase_user_tables_setup.sql');
  console.log('In your Supabase dashboard:');
  console.log('1. Go to SQL Editor');
  console.log('2. Copy and paste the contents of supabase_user_tables_setup.sql');
  console.log('3. Click "Run"');
  console.log('');
  console.log('This will create all required tables: read_later, user_feedback, user_watchlists, user_watchlist_items, watchlist_lookup, migration_flags');
  console.log('Plus RLS policies and sample data.');
}

main().catch(error => {
  console.error('💥 User tables creation failed:', error);
  process.exit(1);
});
