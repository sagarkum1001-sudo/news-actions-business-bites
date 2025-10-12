const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Database path - use environment variable or default
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../db/data.db');

// Initialize SQLite Database
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    console.error('Database path:', DB_PATH);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database');
    console.log('Database file path:', DB_PATH);
    initializeDatabase();
  }
});

// Initialize database - check if business_bites_display table exists
function initializeDatabase() {
  db.serialize(() => {
    // Check if business_bites_display table exists
    db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='business_bites_display'`, (err, row) => {
      if (err) {
        console.error('Error checking for business_bites_display table:', err);
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
    });

    console.log('Database initialized - serving business_bites_display data only');
  });
}

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
  res.json({
    message: 'Business Bites API working',
    timestamp: new Date().toISOString(),
    database: DB_PATH
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: DB_PATH,
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

// Vercel serverless function handler
export default function handler(req, res) {
  return app(req, res);
}

// For local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Business Bites server running on http://localhost:${PORT}`);
    console.log(`📡 Available endpoints:`);
    console.log(`  GET  /api/markets`);
    console.log(`  GET  /api/sectors`);
    console.log(`  GET  /api/news/business-bites/`);
    console.log(`  GET  /api/test`);
    console.log(`  GET  /health`);
    console.log(`📁 Database: ${DB_PATH}`);
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
