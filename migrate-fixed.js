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
    console.log('🚀 Starting Phase 5 shared content migration (no user data)...\n');

    // Step 1: Check current status
    console.log('📊 Step 1: Checking current database status');
    await checkTableStatus();
    console.log('');

    // Step 2: Clear existing shared data only
    console.log('🧹 Step 2: Clearing existing shared content data');
    try {
      const { error } = await supabase.from('business_bites_display').delete().neq('news_analysis_id', 0);
      if (error) {
        console.log(`⚠️  Warning clearing business_bites_display: ${error.message}`);
      } else {
        console.log(`🗑️  Cleared data from business_bites_display`);
      }
    } catch (error) {
      console.log(`❌ Error clearing business_bites_display: ${error.message}`);
    }
    console.log('');

    // Step 3: Run migration (shared content only)
    console.log('📤 Step 3: Migrating shared content from SQLite to Supabase');

    const results = {};

    // Migrate business_bites_display (main news content - shared across all users)
    results.business_bites_display = await migrateTable('business_bites_display', (row) => ({
      news_analysis_id: row.news_analysis_id,
      title: row.title,
      summary: row.summary,
      market: row.market,
      sector: row.sector,
      impact_score: row.impact_score,
      sentiment: row.sentiment,
      link: row.link,
      url_to_image: row.urlToImage, // Note: column renamed to match new schema
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

    console.log('\n📊 Migration Results Summary:');
    Object.entries(results).forEach(([table, result]) => {
      console.log(`${table}: ${result.success} successful, ${result.errors} errors`);
    });

    // Step 4: Final status check
    console.log('\n🔍 Step 4: Final database status check');
    await checkTableStatus();

    console.log('\n✅ Phase 5 shared content migration completed!');
    console.log('\n📋 Important Notes:');
    console.log('• No user data migrated (users will be created via Google OAuth)');
    console.log('• Only shared content (news articles) migrated');
    console.log('• User-specific data will be created dynamically');
    console.log('\n📋 Next Steps:');
    console.log('1. Verify Vercel deployment is active');
    console.log('2. Test API endpoints: https://your-vercel-url.vercel.app/api/news/business-bites');
    console.log('3. Test frontend: https://your-vercel-url.vercel.app');
    console.log('4. Test Google OAuth user creation');
    console.log('5. Verify user-specific features work (bookmarks, preferences, etc.)');

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
