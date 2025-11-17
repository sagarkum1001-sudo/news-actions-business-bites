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
  useDemoAuth: process.env.DEMO_MODE_ENABLED !== 'false' && (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production'),
  useSupabase: process.env.USE_SUPABASE === 'true' && !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  useSQLite: !process.env.USE_SUPABASE
};

console.log('🌍 Environment Configuration:');
console.log(`  NODE_ENV: ${ENVIRONMENT.NODE_ENV}`);
console.log(`  VERCEL_ENV: ${ENVIRONMENT.VERCEL_ENV}`);
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
app.get('/api/news/business-bites/', (req, res) => {
  console.log('🚀 Business-bites endpoint HIT! URL:', req.url);
  console.log('🚀 Business-bites endpoint HIT! Query:', JSON.stringify(req.query));
  console.log('🚀 Business-bites endpoint HIT! Method:', req.method);

  const market = req.query.market || 'US';
  const page = parseInt(req.query.page) || 1;
  const perPage = 12; // Show more articles per page for business-bites
  const offset = (page - 1) * perPage;

  console.log(`🔍 Business-bites API called: market=${market}, page=${page}, perPage=${perPage}, offset=${offset}`);

  // First check if table exists and has data
  db.get(`SELECT COUNT(*) as count FROM business_bites_display WHERE market = ?`, [market], (err, countResult) => {
    if (err) {
      console.error('❌ Count query error:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`📊 Total articles for market ${market}: ${countResult.count}`);

    // Get articles for the market from business_bites_display table, grouped by business_bites_news_id
    db.all(`SELECT * FROM business_bites_display WHERE market = ? ORDER BY business_bites_news_id, rank`,
           [market], (err, rawArticles) => {
      if (err) {
        console.error('❌ Database error in business-bites:', err.message);
        res.status(500).json({ error: err.message });
        return;
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
        .slice(offset, offset + perPage);

      console.log(`📊 After grouping: ${articles.length} unique articles for market ${market}`);
      if (articles.length > 0) {
        console.log(`📝 First article: ${articles[0].title.substring(0, 50)}...`);
        console.log(`📝 Source links: ${articles[0].source_links.length}`);
      }

      // Get total count for pagination (count unique business_bites_news_id)
      db.get(`SELECT COUNT(DISTINCT business_bites_news_id) as total FROM business_bites_display WHERE market = ?`, [market], (err, countResult) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        const totalArticles = countResult.total;
        const totalPages = Math.ceil(totalArticles / perPage);

        // Calculate daily summary - use recent articles (last 48 hours) instead of just today
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        // Convert to ISO for database comparison
        const cutoffISO = fortyEightHoursAgo.toISOString();

        db.all(`SELECT * FROM business_bites_display WHERE market = ? AND datetime(published_at) >= datetime(?)`,
               [market, cutoffISO], (err, recentArticles) => {
          if (err) {
            console.log('Error getting recent articles:', err);
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
        });
      });
    });
  });
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
  app.post('/api/user-preferences/add/', (req, res) => {
    try {
      console.log('👤 User preferences add endpoint called');
      const { user_id, preference_type, item_id, item_type } = req.body;

      if (preference_type === 'read_later' && item_type === 'article') {
        db.get(`SELECT * FROM business_bites_display WHERE business_bites_news_id = ? LIMIT 1`,
               [item_id], (err, article) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: 'Failed to fetch article details'
            });
          }

          if (!article) {
            return res.status(404).json({
              success: false,
              error: 'Article not found'
            });
          }

          db.run(`INSERT OR REPLACE INTO read_later (user_id, article_id, title, url, sector, source_system)
                  VALUES (?, ?, ?, ?, ?, ?)`,
                  [user_id, item_id, article.title, article.link, article.sector, article.source_system],
                  function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                error: 'Failed to save to read later'
              });
            }

            res.json({
              success: true,
              message: 'Successfully added to read later',
              data: { read_later_id: this.lastID, article_id: item_id }
            });
          });
        });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Unsupported preference type'
        });
      }

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to add to user preferences'
      });
    }
  });

  // Read Later functionality
  app.post('/api/user/read-later/', (req, res) => {
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

      db.run(`INSERT OR REPLACE INTO read_later (user_id, article_id, title, url, sector, source_system)
              VALUES (?, ?, ?, ?, ?, ?)`,
              [user_id, finalArticleId, title, finalUrl, sector, source_system],
              function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to save article to read later'
          });
        }

        res.json({
          success: true,
          message: 'Article saved to read later',
          read_later_id: this.lastID
        });
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to save article to read later'
      });
    }
  });

  // Get read later articles
  app.get('/api/user/read-later/:user_id', (req, res) => {
    try {
      const { user_id } = req.params;

      db.all(`SELECT * FROM read_later WHERE user_id = ? ORDER BY added_at DESC`,
             [user_id], (err, rows) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to get read later articles'
          });
        }

        res.json({
          success: true,
          articles: rows,
          count: rows.length
        });
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get read later articles'
      });
    }
  });

  // Remove from read later
  app.delete('/api/user/read-later/', (req, res) => {
    try {
      const { user_id, article_id } = req.body;

      db.run(`DELETE FROM read_later WHERE user_id = ? AND article_id = ?`,
             [user_id, article_id], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to remove article from read later'
          });
        }

        res.json({
          success: true,
          message: 'Article removed from read later',
          deleted: this.changes > 0
        });
      });

    } catch (error) {
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
  app.post('/api/user-assist/submit', (req, res) => {
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

      db.run(`INSERT INTO user_feedback (user_id, type, title, description, debug_context)
              VALUES (?, ?, ?, ?, ?)`,
              [user_id, type, finalTitle, description, JSON.stringify(debugContext)],
              function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to submit feedback'
          });
        }

        res.json({
          success: true,
          message: 'Feedback submitted successfully',
          feedback_id: this.lastID
        });
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }
  });

  // Get user feedback history
  app.get('/api/user-assist/history/:user_id', (req, res) => {
    try {
      const { user_id } = req.params;

      db.all(`SELECT * FROM user_feedback WHERE user_id = ? ORDER BY submitted_at DESC`,
             [user_id], (err, rows) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to get feedback history'
          });
        }

        res.json({
          success: true,
          feedback: rows,
          count: rows.length
        });
      });

    } catch (error) {
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

      db.all(`SELECT * FROM user_watchlists WHERE user_id = ? ORDER BY created_at DESC`,
             [user_id], (err, watchlists) => {
        if (err) {
          console.error('Error getting watchlists:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to get watchlists'
          });
        }

        const watchlistPromises = watchlists.map(watchlist => {
          return new Promise((resolve, reject) => {
            db.all(`SELECT item_name FROM user_watchlist_items WHERE watchlist_id = ? ORDER BY added_at DESC`,
                   [watchlist.id], (err, items) => {
              if (err) reject(err);
              else resolve({
                ...watchlist,
                items: items.map(item => item.item_name)
              });
            });
          });
        });

        Promise.all(watchlistPromises).then(results => {
          res.json({
            success: true,
            watchlists: results,
            count: results.length
          });
        }).catch(error => {
          console.error('Error getting watchlist items:', error);
          res.status(500).json({
            success: false,
            error: 'Failed to get watchlist items'
          });
        });
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

      db.get(`SELECT COUNT(*) as count FROM user_watchlists WHERE user_id = ?`, [user_id], (err, result) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Database error while checking watchlist count'
          });
        }

        if (result.count >= 10) {
          return res.status(400).json({
            success: false,
            error: 'Maximum watchlist limit reached',
            current_count: result.count,
            max_allowed: 10
          });
        }

        db.get(`SELECT id FROM user_watchlists WHERE user_id = ? AND watchlist_name = ?`, [user_id, trimmedName], (err, existing) => {
          if (err) {
            return res.status(500).json({
              success: false,
              error: 'Database error while checking for duplicates'
            });
          }

          if (existing) {
            return res.status(409).json({
              success: false,
              error: 'Watchlist name already exists'
            });
          }

          db.run(`INSERT INTO user_watchlists (user_id, watchlist_name, watchlist_category, market) VALUES (?, ?, ?, ?)`,
                 [user_id, trimmedName, type, market], function(err) {
            if (err) {
              return res.status(500).json({
                success: false,
                error: 'Failed to create watchlist'
              });
            }

            console.log(`✅ Watchlist "${trimmedName}" created successfully with ID: ${this.lastID}`);

            res.json({
              success: true,
              message: 'Watchlist created successfully',
              watchlist_id: this.lastID,
              watchlist: {
                id: this.lastID,
                user_id: user_id,
                name: trimmedName,
                type: type,
                items: [],
                created_at: new Date().toISOString()
              }
            });
          });
        });
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

      db.get(`SELECT market, watchlist_category, user_id FROM user_watchlists WHERE id = ?`,
             [watchlist_id], (err, watchlist) => {
        if (err) {
          console.error('Error getting watchlist details:', err);
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

        db.run(`INSERT INTO user_watchlist_items (watchlist_id, item_name, market, watchlist_type, user_id) VALUES (?, ?, ?, ?, ?)`,
               [watchlist_id, item_name, watchlist.market, watchlist.watchlist_category, watchlist.user_id], function(err) {
          if (err) {
            return res.status(500).json({
              success: false,
              error: 'Failed to add item to watchlist'
            });
          }

          res.json({
            success: true,
            message: 'Item added to watchlist successfully',
            item_id: this.lastID
          });
        });
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

      db.run(`DELETE FROM user_watchlist_items WHERE watchlist_id = ? AND item_name = ?`,
             [watchlist_id, item_name], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to remove item from watchlist'
          });
        }

        res.json({
          success: true,
          message: 'Item removed from watchlist successfully',
          deleted: this.changes > 0
        });
      });

    } catch (error) {
      console.error('Error in remove item from watchlist endpoint:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove item from watchlist'
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

      db.run(`DELETE FROM user_watchlists WHERE id = ?`, [watchlist_id], function(err) {
        if (err) {
          return res.status(500).json({
            success: false,
            error: 'Failed to delete watchlist'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            error: 'Watchlist not found'
          });
        }

        res.json({
          success: true,
          message: 'Watchlist deleted successfully',
          deleted: true
        });
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

// Export for Vercel serverless functions
module.exports = app;

// Log all registered routes before starting server
console.log('🔍 Registered Routes:');
const routes = [];
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    routes.push(`  ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
  } else if (middleware.name === 'router') {
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        routes.push(`  ${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
      }
    });
  }
});

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Unified News Actions Business Bites Server running on http://localhost:${PORT}`);
    console.log(`📡 API Endpoints Summary:`);
    console.log(`  Core APIs:`);
    console.log(`    GET  /api/markets`);
    console.log(`    GET  /api/sectors`);
    console.log(`    GET  /api/news/business-bites/`);
    console.log(`    GET  /api/test`);
    console.log(`    GET  /api/features`);

    if (FEATURE_FLAGS.READ_LATER_ENABLED) {
      console.log(`  Read Later APIs:`);
      console.log(`    POST /api/user-preferences/add/`);
      console.log(`    POST /api/user/read-later/`);
      console.log(`    GET  /api/user/read-later/:user_id`);
      console.log(`    DEL  /api/user/read-later/`);
    }

    if (FEATURE_FLAGS.USER_ASSIST_ENABLED) {
      console.log(`  User Assist APIs:`);
      console.log(`    POST /api/user-assist/submit`);
      console.log(`    GET  /api/user-assist/history/:user_id`);
    }

    if (FEATURE_FLAGS.SEARCH_ENABLED) {
      console.log(`  Search APIs:`);
      console.log(`    GET  /api/search-similar`);
    }

    if (FEATURE_FLAGS.WATCHLIST_ENABLED) {
      console.log(`  Watchlist APIs:`);
      console.log(`    GET  /api/watchlists/:user_id`);
      console.log(`    POST /api/watchlists/create`);
      console.log(`    POST /api/watchlists/:watchlist_id/items`);
      console.log(`    DEL  /api/watchlists/:watchlist_id/items`);
      console.log(`    DEL  /api/watchlists/:watchlist_id`);
    }

    if (FEATURE_FLAGS.WATCHLIST_NEWS_DISCOVERY) {
      console.log(`  News Discovery APIs:`);
      console.log(`    POST /api/watchlist/discover-news`);
    }

    console.log(`  Auth APIs:`);
    console.log(`    POST /api/users/lookup-or-create/`);
    console.log(`    POST /api/auth/session`);
    console.log(`    POST /api/articles/access`);
    console.log(`    GET  /api/articles/:id`);
    console.log(`    GET  /health`);
    console.log(`📁 Database: ${ENVIRONMENT.useSupabase ? 'Supabase' : 'SQLite (' + (db ? 'Connected' : 'Disconnected') + ')'}`);
    console.log(`🌍 Environment: ${ENVIRONMENT.NODE_ENV || 'development'}`);
    console.log(`🔑 Auth Mode: ${ENVIRONMENT.useGoogleAuth ? 'Google OAuth' : ENVIRONMENT.useDemoAuth ? 'Demo Auth' : 'Anonymous'}`);
    console.log(`🚩 Features: ${Object.entries(FEATURE_FLAGS).filter(([k,v]) => v).map(([k,v]) => k).join(', ')}`);
  });

  // Graceful shutdown for local development
  process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
      process.exit(0);
    });
  });
}
