// Migration script to export from SQLite and import to Supabase
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qqzyizvglvxkupssowex.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxenlpenZnbHZ4a3Vwc3Nvd2V4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzMyODk2OSwiZXhwIjoyMDc4OTA0OTY5fQ.Dez65K7Foiup9pp75h568aRJfF7s0vZaOdBMbCSanY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Open SQLite database
const db = new sqlite3.Database('../db.sqlite3', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

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

      // Transform rows if needed
      const transformedRows = transformRow ? rows.map(transformRow) : rows;

      // Insert in batches
      const batchSize = 100;
      for (let i = 0; i < transformedRows.length; i += batchSize) {
        const batch = transformedRows.slice(i, i + batchSize);
        try {
          const { error } = await supabase.from(tableName).insert(batch);
          if (error) {
            console.error(`Error inserting batch into ${tableName}:`, error);
            reject(error);
            return;
          }
        } catch (error) {
          console.error(`Error inserting batch into ${tableName}:`, error);
          reject(error);
          return;
        }
      }

      console.log(`Migrated ${rows.length} rows to ${tableName}`);
      resolve();
    });
  });
}

async function migrateData() {
  try {
    // Migrate users table
    await migrateTable('users', (row) => ({
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

    // Migrate access_types
    await migrateTable('access_types');

    // Migrate business_bites_display (limit to recent articles for testing)
    await migrateTable('business_bites_display', (row) => ({
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
    await migrateTable('user_preferences', (row) => ({
      preference_id: row.preference_id,
      user_identifier: row.user_identifier,
      preference_type: row.preference_type,
      item_id: row.item_id,
      item_type: row.item_type,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
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

migrateData();
