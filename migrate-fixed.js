// Improved migration script to handle conflicts and ensure complete data transfer
const { createClient } = require('@supabase/supabase-js');
const sqlite3 = require('sqlite3').verbose();

const SUPABASE_URL = 'https://qqzyizvglvxkupssowex.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxenlpenZnbHZ4a3Vwc3Nvd2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyODk2OSwiZXhwIjoyMDc4OTA0OTY5fQ.Dez65KX7Foiup9pp75h568aRJfF7s0vZaOdBMbCSanY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Open SQLite database
const db = new sqlite3.Database('../news-actions-app/db.sqlite3', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

// Check if tables exist and have data
async function checkTableStatus() {
  console.log('Checking Supabase table status...');

  const tables = ['users', 'business_bites_display', 'read_later', 'user_feedback', 'user_watchlists', 'user_preferences'];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ Table ${table}: Does not exist or error - ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: Exists with ${count} records`);
      }
    } catch (error) {
      console.log(`❌ Table ${table}: Error checking - ${error.message}`);
    }
  }
}

async function clearExistingData() {
  console.log('Clearing existing data from Supabase tables...');

  const tables = ['user_preferences', 'user_feedback', 'read_later', 'user_watchlists', 'business_bites_display', 'users'];

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).delete().neq('id', 0); // Delete all records
      if (error) {
        console.log(`⚠️  Warning clearing ${table}: ${error.message}`);
      } else {
        console.log(`🗑️  Cleared data from ${table}`);
      }
    } catch (error) {
      console.log(`❌ Error clearing ${table}: ${error.message}`);
    }
  }
}

async function migrateTable(tableName, transformRow = null) {
  return new Promise((resolve, reject) => {
    console.log(`Migrating table: ${tableName}`);

    db.all(`SELECT * FROM ${tableName}`, async (err, rows) => {
      if (err) {
        console.error(`Error reading ${tableName}:`, err.message);
        reject(err);
        return;
      }

      if (rows.length === 0) {
        console.log(`No data in ${tableName}`);
        resolve();
        return;
      }

      console.log(`Found ${rows.length} records in ${tableName}`);

      // Transform rows if needed
      const transformedRows = transformRow ? rows.map(transformRow) : rows;

      // Insert in smaller batches to avoid conflicts
      const batchSize = 50;
      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < transformedRows.length; i += batchSize) {
        const batch = transformedRows.slice(i, i + batchSize);

        try {
          const { data, error } = await supabase
            .from(tableName)
            .insert(batch)
            .select();

          if (error) {
            console.error(`Error inserting batch into ${tableName} (records ${i}-${i+batchSize}):`, error);
            errorCount += batch.length;
          } else {
            successCount += data.length;
            console.log(`✅ Inserted ${data.length} records into ${tableName} (batch ${Math.floor(i/batchSize) + 1})`);
          }
        } catch (error) {
          console.error(`Exception inserting batch into ${tableName}:`, error);
          errorCount += batch.length;
        }
      }

      console.log(`Migration summary for ${tableName}: ${successCount} successful, ${errorCount} failed`);
      resolve({ success: successCount, errors: errorCount });
    });
  });
}

async function runFullMigration() {
  try {
    console.log('🚀 Starting complete Phase 5 verification and migration...\n');

    // Step 1: Check current status
    console.log('📊 Step 1: Checking current database status');
    await checkTableStatus();
    console.log('');

    // Step 2: Clear existing data
    console.log('🧹 Step 2: Clearing existing data');
    await clearExistingData();
    console.log('');

    // Step 3: Run migration
    console.log('📤 Step 3: Migrating data from SQLite to Supabase');

    const results = {};

    // Migrate users table
    results.users = await migrateTable('users', (row) => ({
      user_id: row.user_id,
      sub: row.sub,
      email: row.email,
      name: row.name,
      picture: row.picture,
      access_type_id: row.access_type_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_active: row.is_active
    }));

    // Migrate business_bites_display
    results.business_bites_display = await migrateTable('business_bites_display', (row) => ({
      news_analysis_id: row.news_analysis_id,
      title: row.title,
      summary: row.summary,
      market: row.market,
      sector: row.sector,
      impact_score: row.impact_score,
      sentiment: row.sentiment,
      link: row.link,
      urlToImage: row.urlToImage,
      content: row.content,
      author: row.author,
      published_at: row.published_at,
      source_system: row.source_system,
      summary_short: row.summary_short,
      business_bites_news_id: row.business_bites_news_id,
      alternative_sources: row.alternative_sources,
      thumbnail_url: row.thumbnail_url,
      rank: row.rank,
      slno: row.slno
    }));

    // Migrate user_preferences
    results.user_preferences = await migrateTable('user_preferences', (row) => ({
      preference_id: row.preference_id,
      user_identifier: row.user_identifier,
      preference_type: row.preference_type,
      item_id: row.item_id,
      item_type: row.item_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    console.log('\n📊 Migration Results Summary:');
    Object.entries(results).forEach(([table, result]) => {
      console.log(`${table}: ${result.success} successful, ${result.errors} errors`);
    });

    // Step 4: Final status check
    console.log('\n🔍 Step 4: Final database status check');
    await checkTableStatus();

    console.log('\n✅ Phase 5 migration process completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify Vercel deployment is active');
    console.log('2. Test API endpoints: https://your-vercel-url.vercel.app/api/news/business-bites');
    console.log('3. Test frontend: https://your-vercel-url.vercel.app');
    console.log('4. Test authentication and user features');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing SQLite database:', err.message);
      } else {
        console.log('SQLite database connection closed.');
      }
    });
  }
}

runFullMigration();
