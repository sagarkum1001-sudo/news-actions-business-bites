const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// Conditionally import axios and spawn
let axios, spawn;
try {
  axios = require('axios');
  const childProcess = require('child_process');
  spawn = childProcess.spawn;
} catch (error) {
  console.log('ℹ️ Optional modules not available (axios, child_process)');
}

// Feature flag system
const FEATURE_FLAGS = {
  USE_SUPABASE: process.env.USE_SUPABASE === 'true',
  GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED === 'true',
  DEMO_MODE_ENABLED: process.env.DEMO_MODE_ENABLED !== 'false',
  WATCHLIST_ENABLED: true,
  USER_ASSIST_ENABLED: true,
  READ_LATER_ENABLED: true,
  SEARCH_ENABLED: true,
  WATCHLIST_NEWS_DISCOVERY: true
};

// Environment detection
const ENVIRONMENT = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  VERCEL_ENV: process.env.VERCEL_ENV,
  isProduction: process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production',
  isLocal: process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production',
  useGoogleAuth: process.env.GOOGLE_AUTH_ENABLED === 'true' && (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'),
  useDemoAuth: process.env.DEMO_MODE_ENABLED !== 'false' && (process.env.NODE_ENV !== 'production' && ENVIRONMENT.NODE_ENV !== 'production' && ENVIRONMENT.VERCEL_ENV !== 'production'),
  useSupabase: process.env.USE_SUPABASE === 'true' && !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  useSQLite: !process.env.USE_SUPABASE
};

// CRITICAL DEBUGGING - Check if this serverless function is running
console.log('🚀 SERVERLESS FUNCTION STARTED');
console.log('🔍 Environment Check:');
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  VERCEL_ENV: ${process.env.VERCEL_ENV}`);
console.log(`  GOOGLE_AUTH_ENABLED: ${process.env.GOOGLE_AUTH_ENABLED}`); // Explicit check
console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
console.log(`  SERVER_TIME: ${new Date().toISOString()}`);
console.log('✅ Serverless function initialized');

console.log('🌍 Environment Configuration:');
console.log(`  NODE_ENV: ${ENVIRONMENT.NODE_ENV}`);
console.log(`  VERCEL_ENV: ${ENVIRONMENT.VERCEL_ENV}`);
console.log(`  GOOGLE_AUTH_ENABLED: ${process.env.GOOGLE_AUTH_ENABLED}`);
console.log(`  GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}`);
console.log(`  isProduction: ${ENVIRONMENT.isProduction}`);
console.log(`  Authentication: ${ENVIRONMENT.useGoogleAuth ? 'Google OAuth' : ENVIRONMENT.useDemoAuth ? 'Demo Auth' : 'Anonymous'}`);
console.log(`  Database: ${ENVIRONMENT.useSupabase ? 'Supabase' : 'SQLite'}`);
console.log('🚩 Feature Flags:', FEATURE_FLAGS);

// Initialize Supabase client (conditionally)
let supabase = null;
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
} catch (error) {
  console.log('ℹ️ Supabase module not available, using SQLite mode');
  supabase = null;
}

// Legacy environment variables for backward compatibility
const isLocalEnv = ENVIRONMENT.isLocal;
const useGoogleAuth = ENVIRONMENT.useGoogleAuth;

// Initialize database
let db = null;

async function initializeDatabaseConnection() {
  if (!supabase && !ENVIRONMENT.isProduction) {
    console.log('⚠️ Supabase not available, falling back to SQLite');
    ENVIRONMENT.useSupabase = false;
    ENVIRONMENT.useSQLite = true;
  }

  if (supabase && (ENVIRONMENT.useSupabase || ENVIRONMENT.isProduction)) {
    try {
      console.log('🗄️ Using Supabase database (production/serverless optimized)');

      // Test Supabase connection
      const { data, error } = await supabase
        .from('business_bites_display')
        .select('count', { count: 'exact', head: true });

      if (error) {
        console.warn('⚠️ Supabase connection test failed:', error.message);
        console.log('Falling back to SQLite for production...');
        ENVIRONMENT.useSupabase = false;
        ENVIRONMENT.useSQLite = true;
      } else {
        console.log('✅ Supabase database connected successfully');
        db = supabase; // Set db to supabase client
        createUserTables(); // Initialize user tables
        return;
      }
    } catch (error) {
      console.warn('⚠️ Supabase initialization error:', error.message);
      console.log('Falling back to SQLite for production...');
      ENVIRONMENT.useSupabase = false;
      ENVIRONMENT.useSQLite = true;
    }
  }

  // SQLite fallback (for development or when Supabase fails in production)
  if (ENVIRONMENT.useSQLite || !ENVIRONMENT.isProduction) {
    const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../db/data.db');

    try {
      const sqlite3 = require('sqlite3').verbose();
      const dbPath = ENVIRONMENT.isProduction ?
        path.join(process.cwd(), 'db', 'data.db') : // Vercel absolute path
        DB_PATH; // Local development

      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err);
          console.error('Database path:', dbPath);
          db = null;
          return;
        } else {
          console.log('Connected to SQLite database');
          console.log('Database file path:', dbPath);
          initializeSQLiteDatabase(); // Use separate function for clarity
        }
      });
    } catch (error) {
      console.error('Failed to load SQLite3 module:', error.message);
      db = null;
    }
  }
}

function initializeSQLiteDatabase() {
  if (!db) return;

  // Check if business_bites_display table exists
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='business_bites_display'`, [], (err, row) => {
    if (err) {
      console.error('Error checking table:', err);
      return;
    }

    if (row) {
      console.log('✅ business_bites_display table found - ready to serve data');
      // Log some statistics about the data
      db.get(`SELECT COUNT(*) as count FROM business_bites_display`, (err, result) => {
        if (!err && result) {
          console.log(`📊 Total articles in business_bites_display: ${result.count}`);
        }
      });
    } else {
      console.log('⚠️ business_bites_display table not found - attempting to load from JSON export');

      // Try to load data from JSON export
      const jsonPath = path.join(__dirname, '../db/business_bites_display.json');
      if (fs.existsSync(jsonPath)) {
        console.log('📄 Found JSON export, loading data...');
        loadDataFromJSON(jsonPath);
      } else {
        console.log('❌ No JSON export found. Please run: npm run export-data');
      }
    }

    // Create unified user tables for additional features
    createUserTables();
  });
}

// Production: Always use Supabase (no SQLite fallback in serverless)
if (ENVIRONMENT.isProduction || process.env.NODE_ENV === 'production') {
  console.log('🚀 Production mode detected - initializing Supabase');
  const { createClient } = require('@supabase/supabase-js');
  const supabaseUrl = process.env.SUPABASE_URL || 'https://qqzyizvglvxkupssowex.supabase.co';
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in production');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  db = supabase; // Use Supabase as the database abstraction
  ENVIRONMENT.useSupabase = true;
  ENVIRONMENT.useSQLite = false;

  console.log('✅ Supabase database initialized for production');
} else {
  // Development: Use SQLite (not supported in serverless)
  const DATABASE_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../db/data.db');
  const sqlite3 = require('sqlite3').verbose();
  db = new sqlite3.Database(DATABASE_PATH, (err) => {
    if (err) {
      console.error('Error opening SQLite database:', err);
      db = null;
    } else {
      console.log('🏠 Connected to local SQLite database for development');
    }
  });
  ENVIRONMENT.useSupabase = false;
  ENVIRONMENT.useSQLite = true;
}



const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));

// Request size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Only allow HTTPS in production
  if (ENVIRONMENT.isProduction && !req.secure && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
    return;
  }

  next();
});

// Input validation and sanitization middleware
app.use((req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    // Remove potentially dangerous characters and limit length
    return str.replace(/[<>\"'&]/g, '').substring(0, 1000);
  };

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }

  next();
});

app.use(express.static(path.join(__dirname, '../public')));

// Initialize auto-close feedback if user assist is enabled
if (FEATURE_FLAGS.USER_ASSIST_ENABLED && db) {
  // Auto-close resolved feedback items after 3 days
  const autoCloseResolvedFeedback = () => {
    console.log('🔄 Running auto-close for resolved feedback items...');

    if (!db) return;

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffISO = threeDaysAgo.toISOString();

    // Find and close resolved items older than 3 days
    db.run(`UPDATE user_feedback SET status = 'closed', closed_at = CURRENT_TIMESTAMP
            WHERE status = 'resolved' AND resolved_at < ?`,
            [cutoffISO], function(err) {
      if (err) {
        console.error('Error auto-closing resolved feedback:', err);
        return;
      }

      if (this.changes > 0) {
        console.log(`✅ Auto-closed ${this.changes} resolved feedback items older than 3 days`);
      } else {
        console.log('ℹ️ No resolved feedback items to auto-close');
      }
    });
  };

  // Run auto-close check every 24 hours
  setInterval(autoCloseResolvedFeedback, 24 * 60 * 60 * 1000);
}

// Debug middleware to log all requests (limit in production)
app.use((req, res, next) => {
  if (!ENVIRONMENT.isProduction) {
    console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  }
  next();
});

// Create unified user tables
function createUserTables() {
  // Read Later table
  db.run(`CREATE TABLE IF NOT EXISTS read_later (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    article_id TEXT NOT NULL,
    title TEXT,
    url TEXT,
    sector TEXT,
    source_system TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, article_id)
  )`, (err) => {
    if (err) {
      console.error('Error creating read_later table:', err);
    } else {
      console.log('✅ read_later table ready');
    }
  });

  // User feedback table for User Assist
  db.run(`CREATE TABLE IF NOT EXISTS user_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bug_report', 'feature_request')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'resolved', 'closed')),
    debug_context TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    closed_at DATETIME
  )`, (err) => {
    if (err) {
      console.error('Error creating user_feedback table:', err);
    } else {
      console.log('✅ user_feedback table ready');
    }
  });

  // Unified watchlist system
  db.run(`CREATE TABLE IF NOT EXISTS migration_flags (
    flag_name TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating migration_flags table:', err);
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS user_watchlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    watchlist_name TEXT NOT NULL,
    watchlist_category TEXT NOT NULL CHECK(watchlist_category IN ('sectors', 'companies', 'topics')),
    market TEXT DEFAULT 'US',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, watchlist_name)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_watchlists table:', err);
    } else {
      console.log('✅ user_watchlists table ready');
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS user_watchlist_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    watchlist_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    market TEXT DEFAULT 'US',
    watchlist_type TEXT DEFAULT 'companies' CHECK(watchlist_type IN ('companies', 'sectors', 'topics')),
    user_id TEXT DEFAULT 'default_user',
    FOREIGN KEY (watchlist_id) REFERENCES user_watchlists (id) ON DELETE CASCADE,
    UNIQUE(watchlist_id, item_name)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_watchlist_items table:', err);
    } else {
      console.log('✅ user_watchlist_items table ready');
    }
  });
}

// Database abstraction layer
class DatabaseAdapter {
  constructor() {
    this.type = ENVIRONMENT.useSupabase ? 'supabase' : 'sqlite';
  }

  async getBusinessBitesArticles(market, page = 1, perPage = 12) {
    if (this.type === 'supabase') {
      return this.getBusinessBitesFromSupabase(market, page, perPage);
    } else {
      return this.getBusinessBitesFromSQLite(market, page, perPage);
    }
  }

  async getBusinessBitesFromSQLite(market, page, perPage) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * perPage;

      db.get(`SELECT COUNT(*) as count FROM business_bites_display WHERE market = ?`, [market], (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }

        db.all(`SELECT * FROM business_bites_display WHERE market = ? ORDER BY business_bites_news_id, rank`,
               [market], (err, rawArticles) => {
          if (err) {
            reject(err);
            return;
          }

          const articlesMap = new Map();
          rawArticles.forEach(article => {
            const newsId = article.business_bites_news_id;

            if (!articlesMap.has(newsId)) {
              articlesMap.set(newsId, {
                business_bites_news_id: article.business_bites_news_id,
                title: article.title,
                summary: article.summary,
                market: article.market,
                sector: article.sector,
                impact_score: article.impact_score,
                sentiment: article.sentiment,
                link: article.link,
                urlToImage: article.urlToImage,
                thumbnail_url: article.thumbnail_url,
                published_at: article.published_at,
                source_system: article.source_system,
                author: article.author,
                summary_short: article.summary_short,
                alternative_sources: article.alternative_sources,
                rank: article.rank,
                slno: article.slno,
                source_links: []
              });
            }

            articlesMap.get(newsId).source_links.push({
              title: article.title,
              source: article.source_system,
              url: article.link,
              published_at: article.published_at,
              rank: article.rank
            });
          });

          const articles = Array.from(articlesMap.values())
            .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
            .slice(offset, offset + perPage);

          db.get(`SELECT COUNT(DISTINCT business_bites_news_id) as total FROM business_bites_display WHERE market = ?`,
                 [market], (err, countResult) => {
            if (err) {
              reject(err);
              return;
            }

            const totalArticles = countResult.total;
            const totalPages = Math.ceil(totalArticles / perPage);

            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
            const cutoffISO = fortyEightHoursAgo.toISOString();

            db.all(`SELECT * FROM business_bites_display WHERE market = ? AND datetime(published_at) >= datetime(?)`,
                   [market, cutoffISO], (err, recentArticles) => {
              if (err) {
                recentArticles = [];
              }

              const totalArticlesToday = recentArticles.length;
              const avgImpactScore = totalArticlesToday > 0 ?
                (recentArticles.reduce((sum, article) => sum + (article.impact_score || 0), 0) / totalArticlesToday).toFixed(1) : 0;

              let sentiment = 'neutral';
              if (avgImpactScore >= 7.5) sentiment = 'positive';
              else if (avgImpactScore <= 5.5) sentiment = 'negative';

              const dailySummary = totalArticlesToday > 0 ? {
                total_articles: totalArticlesToday,
                avg_impact_score: parseFloat(avgImpactScore),
                sentiment: sentiment,
                summary: `Market activity shows ${sentiment} sentiment with ${totalArticlesToday} articles averaging ${avgImpactScore} impact score.`
              } : null;

              resolve({
                articles: articles,
                market: market,
                pagination: {
                  current_page: page,
                  total_pages: totalPages,
                  total_articles: totalArticles,
                  has_previous: page > 1,
                  has_next: page < totalPages,
                  previous_page: page > 1 ? page - 1 : null,
                  next_page: page < totalPages ? page + 1 : null
                },
                daily_summary: dailySummary
              });
            });
          });
        });
      });
    });
  }

  async getBusinessBitesFromSupabase(market, page, perPage) {
    // Supabase implementation would go here
    return {
      articles: [],
      market: market,
      pagination: {
        current_page: page,
        total_pages: 0,
        total_articles: 0,
        has_previous: false,
        has_next: false
      },
      daily_summary: null,
      message: 'Supabase implementation pending'
    };
  }
}

// Initialize database adapter
const dbAdapter = ENVIRONMENT.useSQLite ? new DatabaseAdapter() : null;

// Load data from JSON export file
function loadDataFromJSON(jsonPath) {
  try {
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📊 Loading ${jsonData.length} records from JSON export`);

    // Create table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS business_bites_display (
      business_bites_news_id INTEGER,
      slno INTEGER,
      title TEXT,
      summary TEXT,
      market TEXT,
      sector TEXT,
      impact_score REAL,
      sentiment TEXT,
      link TEXT,
      urlToImage TEXT,
      thumbnail_url TEXT,
      published_at TEXT,
      source_system TEXT,
      author TEXT,
      alternative_sources TEXT,
      rank INTEGER
    )`, (err) => {
      if (err) {
        console.error('Error creating table:', err);
        return;
      }

      // Insert data
      const stmt = db.prepare(`INSERT OR REPLACE INTO business_bites_display
        (business_bites_news_id, slno, title, summary, market, sector, impact_score, sentiment,
         link, urlToImage, thumbnail_url, published_at, source_system, author, alternative_sources, rank)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

      let inserted = 0;
      jsonData.forEach(row => {
        stmt.run([
          row.business_bites_news_id,
          row.slno,
          row.title,
          row.summary,
          row.market,
          row.sector,
          row.impact_score,
          row.sentiment,
          row.link,
          row.urlToImage,
          row.thumbnail_url,
          row.published_at,
          row.source_system,
          row.author,
          row.alternative_sources,
          row.rank
        ]);
        inserted++;
      });

      stmt.finalize();
      console.log(`✅ Successfully loaded ${inserted} records into database`);
    });

  } catch (error) {
    console.error('Error loading data from JSON:', error);
  }
}

// API Routes

// Authentication middleware
function requireAuth(req, res, next) {
  // For now, all users are free users - no authentication required
  // This middleware is ready for future paid user restrictions
  req.user = { type: 'free', id: 'anonymous' };
  next();
}

// Markets endpoint
app.get('/api/markets', (req, res) => {
  const markets = ['US', 'China', 'EU', 'India', 'Crypto', 'Japan', 'Brazil', 'Mexico', 'Indonesia', 'Thailand'];
  res.json(markets);
});

// Sectors endpoint
app.get('/api/sectors', (req, res) => {
  const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Manufacturing', 'Retail', 'Real Estate'];
  res.json(sectors);
});

// Test endpoint
app.get('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called!');
  const dbStatus = db ? 'connected' : 'disconnected';
  res.json({
    message: 'Business Bites API working',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    environment: ENVIRONMENT.useSupabase ? 'Supabase' : 'SQLite',
    serverless: true
  });
});

// Business-bites endpoint that returns articles with pagination and summaries
app.get('/api/news/business-bites/', async (req, res) => {
  console.log('🚀 Business-bites endpoint HIT! URL:', req.url);
  console.log('🚀 Business-bites endpoint HIT! Query:', JSON.stringify(req.query));
  console.log('🚀 Business-bites endpoint HIT! Method:', req.method);

  const market = req.query.market || 'US';
  const page = parseInt(req.query.page) || 1;
  const perPage = 12; // Show more articles per page for business-bites
  const offset = (page - 1) * perPage;

  console.log(`🔍 Business-bites API called: market=${market}, page=${page}, perPage=${perPage}, offset=${offset}`);

  try {
    // Get total count for the market
    const { data: countData, error: countError } = await db
      .from('business_bites_display')
      .select('*', { count: 'exact', head: false })
      .eq('market', market);

    if (countError) {
      console.error('❌ Supabase count query error:', countError);
      return res.status(500).json({ error: countError.message });
    }

    const totalArticles = countData ? countData.length : 0;
    console.log(`📊 Total articles for market ${market}: ${totalArticles}`);

    // Get articles for the market
    const { data: rawArticles, error: queryError } = await db
      .from('business_bites_display')
      .select('*')
      .eq('market', market)
      .order('business_bites_news_id', { ascending: true })
      .order('rank', { ascending: true })
      .range(offset, offset + perPage - 1);

    if (queryError) {
      console.error('❌ Supabase query error:', queryError);
      return res.status(500).json({ error: queryError.message });
    }

    console.log(`📊 Found ${rawArticles.length} raw records for market ${market}`);

    // Group articles by business_bites_news_id and create source_links array
    const articlesMap = new Map();

    rawArticles.forEach(article => {
      const newsId = article.business_bites_news_id;

      if (!articlesMap.has(newsId)) {
        // Create main article object (using the first article as primary)
        articlesMap.set(newsId, {
          business_bites_news_id: article.business_bites_news_id,
          title: article.title,
          summary: article.summary,
          market: article.market,
          sector: article.sector,
          impact_score: article.impact_score,
          sentiment: article.sentiment,
          link: article.link,
          urlToImage: article.urlToImage,
          thumbnail_url: article.thumbnail_url,
          published_at: article.published_at,
          source_system: article.source_system,
          author: article.author,
          summary_short: article.summary_short,
          alternative_sources: article.alternative_sources,
          rank: article.rank,
          slno: article.slno,
          source_links: []
        });
      }

      // Add this source to the source_links array
      articlesMap.get(newsId).source_links.push({
        title: article.title,
        source: article.source_system,
        url: article.link,
        published_at: article.published_at,
        rank: article.rank
      });
    });

    // Convert map to array and sort by published_at DESC
    const articles = Array.from(articlesMap.values())
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, perPage); // Apply pagination here after sorting

    console.log(`📊 After grouping: ${articles.length} unique articles for market ${market}`);
    if (articles.length > 0) {
      console.log(`📝 First article: ${articles[0].title.substring(0, 50)}...`);
      console.log(`📝 Source links: ${articles[0].source_links.length}`);
    }

    const totalPages = Math.ceil(totalArticles / perPage);

    // Get recent articles for daily summary (last 48 hours)
    const fortyEightHoursAgo = new Date();
    fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
    const cutoffISO = fortyEightHoursAgo.toISOString();

    const { data: recentArticles, error: recentError } = await db
      .from('business_bites_display')
      .select('*')
      .eq('market', market)
      .gte('published_at', cutoffISO);

    if (recentError) {
      console.log('Error getting recent articles:', recentError);
      recentArticles = [];
    }

    // Calculate daily statistics
    const totalArticlesToday = recentArticles.length;
    const avgImpactScore = totalArticlesToday > 0 ?
      (recentArticles.reduce((sum, article) => sum + (article.impact_score || 0), 0) / totalArticlesToday).toFixed(1) : 0;

    // Determine market sentiment based on average impact
    let sentiment = 'neutral';
    if (avgImpactScore >= 7.5) sentiment = 'positive';
    else if (avgImpactScore <= 5.5) sentiment = 'negative';

    const dailySummary = totalArticlesToday > 0 ? {
      total_articles: totalArticlesToday,
      avg_impact_score: parseFloat(avgImpactScore),
      sentiment: sentiment,
      summary: `Market activity shows ${sentiment} sentiment with ${totalArticlesToday} articles averaging ${avgImpactScore} impact score.`
    } : null;

    // Return formatted response
    res.json({
      articles: articles,
      market: market,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_articles: totalArticles,
        has_previous: page > 1,
        has_next: page < totalPages,
        previous_page: page > 1 ? page - 1 : null,
        next_page: page < totalPages ? page + 1 : null
      },
      daily_summary: dailySummary
    });

  } catch (error) {
    console.error('❌ Business-bites endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve the landing page
app.get('/landing', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/landing.html'));
});

// Authentication API endpoints - Phase 2C: Session Management
app.post('/api/auth/session', async (req, res) => {
  console.log('🔐 Session creation request:', JSON.stringify(req.body, null, 2));

  const { user_type, login_method, google_user } = req.body;

  if (!user_type) {
    console.error('❌ Missing user_type in session creation');
    return res.status(400).json({ error: 'Missing user_type' });
  }

  try {
    let sessionData;

    if (login_method === 'demo') {
      // Demo user session - always allow
      sessionData = await createDemoSession(google_user);
    } else if (login_method === 'google') {
      // Google authenticated session
      sessionData = await createGoogleSession(google_user);
    } else {
      // Anonymous or unknown login method
      sessionData = await createAnonymousSession(user_type);
    }

    console.log('✅ Created user session:', {
      session_id: sessionData.session_id,
      user_type: user_type,
      login_method: login_method,
      has_google_user: !!google_user
    });

    // Store session in memory (for Vercel serverless, this is per-request)
    // In production, you'd use Redis or a database
    if (!global.sessions) global.sessions = new Map();
    global.sessions.set(sessionData.session_id, sessionData);

    res.json(sessionData);

  } catch (error) {
    console.error('❌ Session creation error:', error);
    res.status(500).json({
      error: 'Session creation failed',
      message: error.message
    });
  }
});

// Demo session creation - always succeeds for local development
async function createDemoSession(user) {
  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    session_id: sessionId,
    user_id: user?.id || 'demo_user_123',
    user_type: 'free',
    login_method: 'demo',
    permissions: ['read', 'write', 'admin'], // Full permissions for demo
    google_user: user || null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
}

// Google session creation - validates user data
async function createGoogleSession(user) {
  if (!user || !user.id || !user.email) {
    throw new Error('Invalid Google user data');
  }

  const sessionId = `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    session_id: sessionId,
    user_id: user.id,
    user_type: 'free', // Could be upgraded to paid later
    login_method: 'google',
    permissions: ['read'], // Basic permissions, can be extended
    google_user: user,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
}

// Anonymous session creation - limited permissions
async function createAnonymousSession(userType) {
  const sessionId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    session_id: sessionId,
    user_id: `anon_${Date.now()}`,
    user_type: userType || 'free',
    login_method: 'anonymous',
    permissions: ['read'], // Limited permissions
    google_user: null,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString() // 1 hour only
  };
}

app.post('/api/articles/access', (req, res) => {
  const { session_id, article_id, user_type } = req.body;

  if (!session_id || !article_id) {
    return res.status(400).json({ error: 'Missing session_id or article_id' });
  }

  // Log the access (in production, store in database)
  console.log(`📊 Article access logged: Session ${session_id}, Article ${article_id}, User type: ${user_type || 'free'}`);

  // In a real implementation, you'd store this in the article_access_logs table
  // For now, just acknowledge the access
  res.json({
    success: true,
    message: 'Article access logged',
    session_id: session_id,
    article_id: article_id,
    user_type: user_type || 'free',
    timestamp: new Date().toISOString()
  });
});

// Get individual article by ID
app.get('/api/articles/:id', (req, res) => {
  const articleId = req.params.id;

  console.log(`🔍 Fetching article ${articleId} for landing page`);

  // Get article from database
  db.get(`SELECT * FROM business_bites_display WHERE business_bites_news_id = ? LIMIT 1`, [articleId], (err, article) => {
    if (err) {
      console.error('Error fetching article:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Return article data for the landing page
    res.json({
      business_bites_news_id: article.business_bites_news_id,
      title: article.title,
      summary: article.summary,
      market: article.market,
      sector: article.sector,
      impact_score: article.impact_score,
      sentiment: article.sentiment,
      link: article.link,
      url: article.link, // fallback
      urlToImage: article.urlToImage,
      thumbnail_url: article.thumbnail_url,
      published_at: article.published_at,
      source_system: article.source_system,
      author: article.author
    });
  });
});

// ===== ADDITIONAL CONSOLIDATED ENDPOINTS =====

// Feature flag status endpoint
app.get('/api/features', (req, res) => {
  res.json({
    features: FEATURE_FLAGS,
    environment: ENVIRONMENT,
    timestamp: new Date().toISOString()
  });
});

// Unified user lookup/create endpoint
app.post('/api/users/lookup-or-create/', async (req, res) => {
  try {
    console.log('👤 User lookup/create endpoint called');
    const { sub, email, name, picture } = req.body;

    if (!sub || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: sub and email'
      });
    }

    console.log(`Looking up/creating user: ${sub} (${email})`);

    // Create session based on environment
    const sessionData = await createDemoSession({ sub, email, name, picture });

    const user = {
      user_id: sessionData.user_id,
      sub: sub,
      email: email,
      name: name || email.split('@')[0],
      picture: picture,
      access_type_name: 'Premium User',
      access_description: 'Full access to all features'
    };

    res.json({
      success: true,
      user: user,
      session: sessionData,
      message: ENVIRONMENT.useGoogleAuth ? 'Google user created/updated successfully' : 'Demo user created/updated successfully',
      created: true
    });

  } catch (error) {
    console.error('Error in user lookup/create:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to lookup or create user',
      details: error.message
    });
  }
});

// ===== FEATURE-FLAGGED ENDPOINTS =====

// Read Later functionality (if enabled)
if (FEATURE_FLAGS.READ_LATER_ENABLED && db) {

  // Add to Read Later
  app.post('/api/user-preferences/add/', async (req, res) => {
    try {
      console.log('👤 User preferences add endpoint called');
      const { user_id, preference_type, item_id, item_type } = req.body;

      if (preference_type === 'read_later' && item_type === 'article') {
        const { data: articles, error: articleError } = await db
          .from('business_bites_display')
          .select('*')
          .eq('business_bites_news_id', item_id)
          .limit(1);

        if (articleError) {
          console.error('Article fetch error:', articleError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch article details'
          });
        }

        if (!articles || articles.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Article not found'
          });
        }

        const article = articles[0];

        const { data, error: insertError } = await db
          .from('read_later')
          .upsert({
            user_id: user_id,
            article_id: item_id,
            title: article.title,
            url: article.link,
            sector: article.sector,
            source_system: article.source_system
          }, {
            onConflict: 'user_id,article_id'
          })
          .select();

        if (insertError) {
          console.error('Read later upsert error:', insertError);
          return res.status(500).json({
            success: false,
            error: 'Failed to save to read later'
          });
        }

        res.json({
          success: true,
          message: 'Successfully added to read later',
          data: { read_later_id: data[0].id, article_id: item_id }
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Unsupported preference type'
        });
      }

    } catch (error) {
      console.error('User preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add to user preferences'
      });
    }
  });

  // Read Later functionality
  app.post('/api/user/read-later/', async (req, res) => {
    try {
      const { user_id, article_id, business_bites_news_id, title, url, link, sector, source_system } = req.body;
      const finalArticleId = article_id || business_bites_news_id;
      const finalUrl = url || link;

      if (!user_id || !finalArticleId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id and article_id'
        });
      }

      const { data, error } = await db
        .from('read_later')
        .upsert({
          user_id: user_id,
          article_id: finalArticleId,
          title: title,
          url: finalUrl,
          sector: sector,
          source_system: source_system
        }, {
          onConflict: 'user_id,article_id'
        })
        .select();

      if (error) {
        console.error('Read later upsert error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to save article to read later'
        });
      }

      res.json({
        success: true,
        message: 'Article saved to read later',
        read_later_id: data[0].id
      });

    } catch (error) {
      console.error('Read later endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to save article to read later'
      });
    }
  });

  // Get read later articles
  app.get('/api/user/read-later/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;

      const { data: articles, error } = await db
        .from('read_later')
        .select('*')
        .eq('user_id', user_id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Read later select error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to get read later articles'
        });
      }

      res.json({
        success: true,
        articles: articles || [],
        count: articles ? articles.length : 0
      });

    } catch (error) {
      console.error('Read later endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get read later articles'
      });
    }
  });

  // Remove from read later
  app.delete('/api/user/read-later/', async (req, res) => {
    try {
      const { user_id, article_id } = req.body;

      if (!user_id || !article_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id and article_id'
        });
      }

      const { data, error } = await db
        .from('read_later')
        .delete()
        .eq('user_id', user_id)
        .eq('article_id', article_id);

      if (error) {
        console.error('Read later delete error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove article from read later'
        });
      }

      res.json({
        success: true,
        message: 'Article removed from read later',
        deleted: true
      });

    } catch (error) {
      console.error('Read later delete endpoint error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove article from read later'
      });
    }
  });
}

// User Assist system (if enabled)
if (FEATURE_FLAGS.USER_ASSIST_ENABLED && db) {
  // Submit user feedback
  app.post('/api/user-assist/submit', async (req, res) => {
    try {
      const { user_id, type, title, description } = req.body;

      if (!user_id || !type || !description) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters'
        });
      }

      if (!['bug_report', 'feature_request'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid type'
        });
      }

      let finalTitle = title;
      if (!finalTitle || finalTitle.trim() === '') {
        const firstSentence = description.split(/[.!?]/)[0].trim();
        finalTitle = firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;
      }

      const debugContext = {
        userAgent: req.headers['user-agent'] || 'Unknown',
        platform: req.headers['sec-ch-ua-platform'] || 'Unknown',
        timestamp: new Date().toISOString(),
        userId: user_id
      };

      const { data, error } = await db
        .from('user_feedback')
        .insert({
          user_id: user_id,
          type: type,
          title: finalTitle,
          description: description,
          debug_context: JSON.stringify(debugContext)
        })
        .select();

      if (error) {
        console.error('User feedback insert error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to submit feedback'
        });
      }

      res.json({
        success: true,
        message: 'Feedback submitted successfully',
        feedback_id: data[0].id
      });

    } catch (error) {
      console.error('User assist submit error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }
  });

  // Get user feedback history
  app.get('/api/user-assist/history/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;

      const { data: feedback, error } = await db
        .from('user_feedback')
        .select('*')
        .eq('user_id', user_id)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('User feedback select error:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to get feedback history'
        });
      }

      res.json({
        success: true,
        feedback: feedback || [],
        count: feedback ? feedback.length : 0
      });

    } catch (error) {
      console.error('User assist history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get feedback history'
      });
    }
  });
}

// Search functionality (if enabled)
if (FEATURE_FLAGS.SEARCH_ENABLED && db) {
  app.get('/api/search-similar', async (req, res) => {
    try {
      console.log('🔍 Search endpoint called');
      const { query, market, user_id } = req.query;

      if (!query || !market) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: query and market'
        });
      }

      console.log(`Searching for "${query}" in ${market} market`);

      const searchQuery = `
        SELECT DISTINCT business_bites_news_id, title, summary, link, source_system, published_at, sector, impact_score
        FROM business_bites_display
        WHERE market = ?
        AND (title LIKE ? OR summary LIKE ?)
        ORDER BY published_at DESC
        LIMIT 20
      `;

      const searchTerm = `%${query}%`;

      db.all(searchQuery, [market, searchTerm, searchTerm], (err, rows) => {
        if (err) {
          console.error('Error searching articles:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to search articles'
          });
        }

        console.log(`Found ${rows.length} articles matching "${query}"`);

        const articles = rows.map(row => ({
          id: row.business_bites_news_id,
          title: row.title,
          summary: row.summary,
          url: row.link,
          source: {
            name: row.source_system || 'Unknown'
          },
          publishedAt: row.published_at,
          sector: row.sector,
          impact_score: row.impact_score
        }));

        res.json({
          success: true,
          articles: articles,
          count: articles.length,
          query: query,
          market: market
        });
      });

    } catch (error) {
      console.error('Error in search endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
        details: error.message
      });
    }
  });
}

// Watchlist APIs (if enabled)
if (FEATURE_FLAGS.WATCHLIST_ENABLED && db) {

  // Get all user's watchlists
  app.get('/api/watchlists/:user_id', async (req, res) => {
    try {
      const { user_id } = req.params;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing user_id parameter'
        });
      }

      console.log(`Getting all watchlists for user: ${user_id}`);

      const { data: watchlists, error: watchlistsError } = await db
        .from('user_watchlists')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (watchlistsError) {
        console.error('Error getting watchlists:', watchlistsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to get watchlists'
        });
      }

      // Get items for each watchlist
      const watchlistWithItemsPromises = watchlists.map(async (watchlist) => {
        const { data: items, error: itemsError } = await db
          .from('user_watchlist_items')
          .select('item_name')
          .eq('watchlist_id', watchlist.id)
          .order('added_at', { ascending: false });

        if (itemsError) {
          console.error('Error getting watchlist items:', itemsError);
          return {
            ...watchlist,
            items: []
          };
        }

        return {
          ...watchlist,
          items: items.map(item => item.item_name)
        };
      });

      const results = await Promise.all(watchlistWithItemsPromises);

      res.json({
        success: true,
        watchlists: results,
        count: results.length
      });

    } catch (error) {
      console.error('Error in get watchlists endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get watchlists'
      });
    }
  });

  // Create a new watchlist
  app.post('/api/watchlists/create', async (req, res) => {
    try {
      const { user_id, name, type, market } = req.body;

      if (!user_id || !name || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id, name, type'
        });
      }

      const trimmedName = name.trim();
      if (trimmedName.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Watchlist name cannot be empty'
        });
      }

      if (trimmedName.length > 50) {
        return res.status(400).json({
          success: false,
          error: 'Watchlist name is too long'
        });
      }

      if (!['sectors', 'companies', 'topics'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid watchlist type'
        });
      }

      console.log(`Creating watchlist "${trimmedName}" (${type}) for user: ${user_id}`);

      // Check current watchlist count for this user (max 10)
      const { data: watchlistCount, error: countError } = await db
        .from('user_watchlists')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user_id);

      if (countError) {
        console.error('Error checking watchlist count:', countError);
        return res.status(500).json({
          success: false,
          error: 'Database error while checking watchlist count'
        });
      }

      if (watchlistCount >= 10) {
        return res.status(400).json({
          success: false,
          error: 'Maximum watchlist limit reached',
          current_count: watchlistCount,
          max_allowed: 10
        });
      }

      // Check for duplicate watchlist names for this user
      const { data: existingWatchlist, error: duplicateError } = await db
        .from('user_watchlists')
        .select('id')
        .eq('user_id', user_id)
        .eq('watchlist_name', trimmedName)
        .single();

      if (duplicateError && duplicateError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking for duplicate watchlist:', duplicateError);
        return res.status(500).json({
          success: false,
          error: 'Database error while checking for duplicates'
        });
      }

      if (existingWatchlist) {
        return res.status(409).json({
          success: false,
          error: 'Watchlist name already exists'
        });
      }

      // Create the watchlist
      const { data: newWatchlist, error: insertError } = await db
        .from('user_watchlists')
        .insert({
          user_id: user_id,
          watchlist_name: trimmedName,
          watchlist_category: type,
          market: market || 'US'
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error creating watchlist:', insertError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create watchlist'
        });
      }

      console.log(`✅ Watchlist "${trimmedName}" created successfully with ID: ${newWatchlist.id}`);

      res.json({
        success: true,
        message: 'Watchlist created successfully',
        watchlist_id: newWatchlist.id,
        watchlist: {
          id: newWatchlist.id,
          user_id: user_id,
          name: trimmedName,
          type: type,
          items: [],
          created_at: newWatchlist.created_at
        }
      });

    } catch (error) {
      console.error('Error in create watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error while creating watchlist'
      });
    }
  });

  // Add item to watchlist
  app.post('/api/watchlists/:watchlist_id/items', async (req, res) => {
    try {
      const { watchlist_id } = req.params;
      const { item_name } = req.body;

      if (!watchlist_id || !item_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: watchlist_id and item_name'
        });
      }

      // Get watchlist details first
      const { data: watchlist, error: watchlistError } = await db
        .from('user_watchlists')
        .select('market, watchlist_category, user_id')
        .eq('id', parseInt(watchlist_id))
        .single();

      if (watchlistError) {
        console.error('Error getting watchlist details:', watchlistError);
        return res.status(500).json({
          success: false,
          error: 'Failed to get watchlist details'
        });
      }

      if (!watchlist) {
        return res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        });
      }

      console.log(`Adding item "${item_name}" to watchlist: ${watchlist_id}`);

      // Add item to watchlist
      const { data: newItem, error: insertError } = await db
        .from('user_watchlist_items')
        .insert({
          watchlist_id: parseInt(watchlist_id),
          item_name: item_name,
          market: watchlist.market,
          watchlist_type: watchlist.watchlist_category,
          user_id: watchlist.user_id
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding item to watchlist:', insertError);
        // Handle duplicate entry
        if (insertError.code === '23505') { // PostgreSQL unique constraint violation
          return res.status(409).json({
            success: false,
            error: 'Item already exists in this watchlist'
          });
        }
        return res.status(500).json({
          success: false,
          error: 'Failed to add item to watchlist'
        });
      }

      res.json({
        success: true,
        message: 'Item added to watchlist successfully',
        item_id: newItem.id
      });

    } catch (error) {
      console.error('Error in add item to watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add item to watchlist'
      });
    }
  });

  // Remove item from watchlist
  app.delete('/api/watchlists/:watchlist_id/items', async (req, res) => {
    try {
      const { watchlist_id } = req.params;
      const { item_name } = req.body;

      if (!watchlist_id || !item_name) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: watchlist_id and item_name'
        });
      }

      console.log(`Removing item "${item_name}" from watchlist: ${watchlist_id}`);

      const { data, error } = await db
        .from('user_watchlist_items')
        .delete()
        .eq('watchlist_id', parseInt(watchlist_id))
        .eq('item_name', item_name);

      if (error) {
        console.error('Error removing item from watchlist:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove item from watchlist'
        });
      }

      res.json({
        success: true,
        message: 'Item removed from watchlist successfully',
        deleted: true
      });

    } catch (error) {
      console.error('Error in remove item from watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove item from watchlist'
      });
    }
  });

  // Filter news by watchlist
  app.get('/api/watchlists/:watchlist_id/filter-news', async (req, res) => {
    try {
      const { watchlist_id } = req.params;
      const { market = 'US', page = 1, per_page = 12 } = req.query;

      if (!watchlist_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing watchlist_id parameter'
        });
      }

      console.log(`Filtering news for watchlist: ${watchlist_id} in market: ${market}`);

      // Get the watchlist details
      const { data: watchlist, error: watchlistError } = await db
        .from('user_watchlists')
        .select('*')
        .eq('id', parseInt(watchlist_id))
        .single();

      if (watchlistError) {
        console.error('Error getting watchlist:', watchlistError);
        return res.status(500).json({
          success: false,
          error: 'Failed to get watchlist details'
        });
      }

      if (!watchlist) {
        return res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        });
      }

      // Get all items in this watchlist
      const { data: watchlistItems, error: itemsError } = await db
        .from('user_watchlist_items')
        .select('item_name')
        .eq('watchlist_id', parseInt(watchlist_id))
        .order('added_at', { ascending: false });

      if (itemsError) {
        console.error('Error getting watchlist items:', itemsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to get watchlist items'
        });
      }

      if (!watchlistItems || watchlistItems.length === 0) {
        // Return empty results if watchlist has no items
        return res.json({
          success: true,
          articles: [],
          pagination: {
            current_page: parseInt(page),
            total_pages: 0,
            total_articles: 0,
            has_previous: false,
            has_next: false,
            previous_page: null,
            next_page: null
          },
          watchlist: {
            id: watchlist.id,
            name: watchlist.watchlist_name,
            type: watchlist.watchlist_category,
            market: watchlist.market,
            items: []
          },
          message: 'Watchlist is empty'
        });
      }

      console.log(`Found ${watchlistItems.length} items in watchlist "${watchlist.watchlist_name}"`);

      // Build search terms from watchlist items
      const itemNames = watchlistItems.map(item => item.item_name);
      console.log('Watchlist items:', itemNames);

      // Query for articles that match the watchlist criteria
      let query = db
        .from('business_bites_display')
        .select('*')
        .eq('market', market);

      // Build OR conditions for each watchlist item based on watchlist type
      let matchConditions = [];
      itemNames.forEach(itemName => {
        // Create search terms: exact match, title case, lowercase variations
        const searchTerms = [
          itemName.toLowerCase(),
          itemName.charAt(0).toUpperCase() + itemName.slice(1).toLowerCase(),
          itemName.toUpperCase()
        ];

        searchTerms.forEach(term => {
          // Match in title
          matchConditions.push(`title.ilike.%${term}%`);
          matchConditions.push(`summary.ilike.%${term}%`);

          // Match by sector for sector-based watchlists
          if (watchlist.watchlist_category === 'sectors') {
            matchConditions.push(`sector.ilike.%${term}%`);
          }
        });
      });

      // Apply OR conditions (Supabase doesn't have a direct way, so we need to use individual queries)
      const totalPromises = matchConditions.map(condition => {
        const parts = condition.split('.');
        const field = parts[0];
        const operator = parts[1];
        const value = parts.slice(2).join('.');

        if (operator === 'ilike') {
          return db
            .from('business_bites_display')
            .select('*', { count: 'exact', head: true })
            .eq('market', market)
            .ilike(field, value.replace('%', ''));
        }
        return Promise.resolve(0);
      });

      // First, get total count (simplified - we'll use the articles count)
      const offset = (parseInt(page) - 1) * parseInt(per_page);

      // We'll use a simplified approach: search for articles and apply filtering
      let articlesQuery = db
        .from('business_bites_display')
        .select('*')
        .eq('market', market);

      // Instead of complex OR conditions, let's use a more direct approach
      // Get all articles and filter client-side based on the item names
      const { data: allArticles, error: articlesError } = await db
        .from('business_bites_display')
        .select('*')
        .eq('market', market)
        .order('business_bites_news_id', { ascending: true })
        .order('rank', { ascending: true })
        .range(offset, offset + parseInt(per_page) - 1);

      if (articlesError) {
        console.error('Error fetching articles:', articlesError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch articles'
        });
      }

      console.log(`Fetched ${allArticles.length} raw articles from market ${market}`);

      // Filter articles based on watchlist items
      // This is a simplified approach - we could optimize this later
      let filteredArticles = [];

      // Use different matching logic based on watchlist type
      if (watchlist.watchlist_category === 'companies') {
        // For companies, match against title and summary
        filteredArticles = allArticles.filter(article => {
          const title = (article.title || '').toLowerCase();
          const summary = (article.summary || '').toLowerCase();

          return itemNames.some(itemName => {
            const itemLower = itemName.toLowerCase();
            return title.includes(itemLower) || summary.includes(itemLower);
          });
        });
      } else if (watchlist.watchlist_category === 'sectors') {
        // For sectors, match against sector field primarily, then title/summary
        filteredArticles = allArticles.filter(article => {
          const sector = (article.sector || '').toLowerCase();
          const title = (article.title || '').toLowerCase();
          const summary = (article.summary || '').toLowerCase();

          return itemNames.some(itemName => {
            const itemLower = itemName.toLowerCase();
            return sector.includes(itemLower) ||
                   title.includes(itemLower) ||
                   summary.includes(itemLower);
          });
        });
      } else if (watchlist.watchlist_category === 'topics') {
        // For topics, match broadly in title and summary
        filteredArticles = allArticles.filter(article => {
          const title = (article.title || '').toLowerCase();
          const summary = (article.summary || '').toLowerCase();

          return itemNames.some(itemName => {
            const itemLower = itemName.toLowerCase();
            return title.includes(itemLower) || summary.includes(itemLower);
          });
        });
      }

      console.log(`Filtered down to ${filteredArticles.length} articles matching watchlist items`);

      // Group articles by business_bites_news_id and create source_links array
      const articlesMap = new Map();

      filteredArticles.forEach(article => {
        const newsId = article.business_bites_news_id;

        if (!articlesMap.has(newsId)) {
          articlesMap.set(newsId, {
            business_bites_news_id: article.business_bites_news_id,
            title: article.title,
            summary: article.summary,
            market: article.market,
            sector: article.sector,
            impact_score: article.impact_score,
            sentiment: article.sentiment,
            link: article.link,
            urlToImage: article.urlToImage,
            thumbnail_url: article.thumbnail_url,
            published_at: article.published_at,
            source_system: article.source_system,
            author: article.author,
            summary_short: article.summary_short,
            alternative_sources: article.alternative_sources,
            rank: article.rank,
            slno: article.slno,
            source_links: []
          });
        }

        articlesMap.get(newsId).source_links.push({
          title: article.title,
          source: article.source_system,
          url: article.link,
          published_at: article.published_at,
          rank: article.rank
        });
      });

      // Convert map to array and sort by published_at DESC
      const finalArticles = Array.from(articlesMap.values())
        .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
        .slice(0, parseInt(per_page));

      console.log(`Final processed articles: ${finalArticles.length}`);

      // Get total count of all possible matching articles (simplified)
      // This is an approximation - in production you'd want to use a more efficient query
      const totalMatches = filteredArticles.length;
      const totalPages = Math.ceil(totalMatches / parseInt(per_page));

      // Return formatted response
      res.json({
        success: true,
        articles: finalArticles,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_articles: totalMatches,
          has_previous: parseInt(page) > 1,
          has_next: parseInt(page) < totalPages,
          previous_page: parseInt(page) > 1 ? parseInt(page) - 1 : null,
          next_page: parseInt(page) < totalPages ? parseInt(page) + 1 : null
        },
        watchlist: {
          id: watchlist.id,
          name: watchlist.watchlist_name,
          type: watchlist.watchlist_category,
          market: watchlist.market,
          items: itemNames
        }
      });

    } catch (error) {
      console.error('Error in filter news by watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to filter news by watchlist'
      });
    }
  });

  // Delete a watchlist
  app.delete('/api/watchlists/:watchlist_id', async (req, res) => {
    try {
      const { watchlist_id } = req.params;

      if (!watchlist_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing watchlist_id parameter'
        });
      }

      console.log(`Deleting watchlist: ${watchlist_id}`);

      // First verify the watchlist exists (optional)
      const { data: existingWatchlist, error: checkError } = await db
        .from('user_watchlists')
        .select('id, watchlist_name')
        .eq('id', parseInt(watchlist_id))
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking watchlist existence:', checkError);
        return res.status(500).json({
          success: false,
          error: 'Failed to verify watchlist exists'
        });
      }

      if (!existingWatchlist) {
        return res.status(404).json({
          success: false,
          error: 'Watchlist not found'
        });
      }

      // Delete the watchlist (CASCADE will delete associated items)
      const { error: deleteError } = await db
        .from('user_watchlists')
        .delete()
        .eq('id', parseInt(watchlist_id));

      if (deleteError) {
        console.error('Error deleting watchlist:', deleteError);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete watchlist'
        });
      }

      console.log(`✅ Watchlist "${existingWatchlist.watchlist_name}" deleted successfully`);

      res.json({
        success: true,
        message: 'Watchlist deleted successfully',
        deleted: true,
        watchlist_id: watchlist_id
      });

    } catch (error) {
      console.error('Error in delete watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete watchlist'
      });
    }
  });
}

// Watchlist news discovery (if enabled)
if (FEATURE_FLAGS.WATCHLIST_NEWS_DISCOVERY && db) {
  app.post('/api/watchlist/discover-news', async (req, res) => {
    try {
      const { user_id, market, watchlist_type } = req.body;

      if (!user_id || !market || !watchlist_type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id, market, watchlist_type'
        });
      }

      if (!['sectors', 'companies', 'topics'].includes(watchlist_type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid watchlist_type'
        });
      }

      console.log(`📰 Discovering news for ${watchlist_type} watchlist of user ${user_id} in ${market} market`);

      // Run the watchlist news fetcher script
      const scriptPath = path.join(__dirname, '../watchlist_news_fetcher.py');
      const pythonProcess = spawn('python3', [scriptPath, '--type', watchlist_type, '--market', market, '--user-id', user_id], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ News discovery completed for ${watchlist_type}`);
          res.json({
            success: true,
            message: `News discovery completed for ${watchlist_type} watchlist`,
            market: market,
            watchlist_type: watchlist_type,
            user_id: user_id,
            output: stdout.trim()
          });
        } else {
          console.error(`❌ News discovery failed for ${watchlist_type}: ${stderr}`);
          res.status(500).json({
            success: false,
            error: `News discovery failed: ${stderr.trim()}`,
            market: market,
            watchlist_type: watchlist_type,
            user_id: user_id
          });
        }
      });

      pythonProcess.on('error', (error) => {
        console.error(`❌ Error running news discovery: ${error.message}`);
        res.status(500).json({
          success: false,
          error: `Failed to run news discovery: ${error.message}`,
          market: market,
          watchlist_type: watchlist_type,
          user_id: user_id
        });
      });

    } catch (error) {
      console.error('Error in watchlist discover news endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to discover news for watchlist',
        details: error.message
      });
    }
  });
}

// Auth configuration endpoint
app.get('/api/auth-config', (req, res) => {
  console.log('🔧 Auth config requested - current ENV:', {
    GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    useGoogleAuth: ENVIRONMENT.useGoogleAuth
  });

  res.json({
    status: 'success',
    data: {
      useGoogleAuth: ENVIRONMENT.useGoogleAuth,
      useDemoAuth: ENVIRONMENT.useDemoAuth,
      googleClientId: process.env.GOOGLE_CLIENT_ID || null,
      authMode: ENVIRONMENT.useGoogleAuth ? 'google' : 'demo'
    },
    rawEnvVars: {
      GOOGLE_AUTH_ENABLED: process.env.GOOGLE_AUTH_ENABLED,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT_SET'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    features: FEATURE_FLAGS,
    database: ENVIRONMENT.useSupabase ? 'Supabase' : 'SQLite',
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// For Vercel serverless functions - export the app
// In Vercel environment, we cannot use app.listen() as Vercel handles this
// This must be the last line for Vercel serverless functions
module.exports = app;

// Log configuration for debugging
console.log('� Serverless Function Module Loaded');
console.log('🔧 Vercel ready - awaiting function calls');
console.log(`🌍 NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`🌍 VERCEL_ENV: ${process.env.VERCEL_ENV}`);
console.log(`🔑 GOOGLE_AUTH_ENABLED: ${process.env.GOOGLE_AUTH_ENABLED}`);
