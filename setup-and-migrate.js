// Complete database setup and migration script
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

async function createTables() {
  console.log('Creating database tables...');

  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      user_id SERIAL PRIMARY KEY,
      sub TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      picture TEXT,
      access_type_id INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true
    );`,

    // Access types
    `CREATE TABLE IF NOT EXISTS access_types (
      access_type_id SERIAL PRIMARY KEY,
      access_type_name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // Business bites display
    `CREATE TABLE IF NOT EXISTS business_bites_display (
      news_analysis_id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT,
      market TEXT NOT NULL,
      sector TEXT NOT NULL,
      impact_score REAL,
      sentiment TEXT,
      link TEXT,
      urlToImage TEXT,
      content TEXT,
      author TEXT,
      published_at TIMESTAMP,
      source_system TEXT DEFAULT 'Postgres_Migrated',
      summary_short TEXT,
      business_bites_news_id INTEGER,
      alternative_sources TEXT,
      thumbnail_url TEXT,
      rank INTEGER DEFAULT 1,
      slno INTEGER
    );`,

    // Read later
    `CREATE TABLE IF NOT EXISTS read_later (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      article_id INTEGER NOT NULL,
      title TEXT,
      url TEXT,
      sector TEXT,
      source_system TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // User feedback
    `CREATE TABLE IF NOT EXISTS user_feedback (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('bug_report', 'feature_request')),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'closed')),
      priority TEXT DEFAULT 'low' CHECK(priority IN ('low', 'high', 'critical')),
      debug_context TEXT,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      resolved_at TIMESTAMP NULL,
      closed_at TIMESTAMP NULL
    );`,

    // User watchlists
    `CREATE TABLE IF NOT EXISTS user_watchlists (
      id SERIAL PRIMARY KEY,
      user_id TEXT DEFAULT 'default_user',
      watchlist_name TEXT NOT NULL,
      watchlist_category TEXT DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      market TEXT DEFAULT 'US',
      watchlist_type TEXT DEFAULT 'companies' CHECK(watchlist_type IN ('companies', 'sectors', 'topics'))
    );`,

    // User preferences
    `CREATE TABLE IF NOT EXISTS user_preferences (
      preference_id SERIAL PRIMARY KEY,
      user_identifier TEXT NOT NULL,
      preference_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      item_type TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    );`
  ];

  for (const sql of tables) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error('Error creating table:', error);
        console.error('SQL:', sql);
        throw error;
      }
    } catch (error) {
      console.error('Error executing SQL:', error);
      throw error;
    }
  }

  // Insert default access type
  const { error: insertError } = await supabase
    .from('access_types')
    .upsert([{ access_type_id: 1, access_type_name: 'user', description: 'Standard user access' }]);

  if (insertError) {
    console.error('Error inserting default data:', insertError);
  }

  console.log('Tables created successfully!');
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
  console.log('Starting data migration...');

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

    // Skip access_types as it's already inserted during table creation
    console.log('Skipping access_types (already exists)');

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
    throw error;
  }
}

async function main() {
  try {
    // Note: Tables must be created manually in Supabase SQL editor first
    console.log('Note: Please create tables manually in Supabase SQL editor before running migration');
    console.log('Skipping table creation (not supported via API)');
    await migrateData();
    console.log('Data migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
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

main();
