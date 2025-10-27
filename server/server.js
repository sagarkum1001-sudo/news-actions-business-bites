const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize environment-aware database helper
const DatabaseHelper = require('./db-helper');
let dbHelper;

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url} - ${new Date().toISOString()}`);
  next();
});

// Initialize database helper and start server setup
async function initializeServer() {
  try {
    dbHelper = new DatabaseHelper();

    // Wait for database connection (important for async initialization)
    await new Promise(resolve => {
      const checkConnection = async () => {
        if (dbHelper.dbClient) {
          console.log('✅ Database connection established, starting server setup...');
          setupServer();
          resolve();
        } else {
          setTimeout(checkConnection, 100); // Check again in 100ms
        }
      };
      checkConnection();
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    // Fallback: start server anyway
    setupServer();
  }
}

// Main server setup function
async function setupServer() {
  console.log('🚀 Setting up Express server...');

  // Middleware
  app.use(cors({
    origin: ['*'], // In production, restrict to your domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRFToken', 'X-Requested-With'],
    credentials: true
  }));

  app.use(express.json());
  app.use(express.static('public'));

  // Environment-aware session configuration
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_REGION !== undefined;

  if (isProduction) {
    console.log('🌐 Production environment detected');

    // Production: Use in-memory sessions for serverless
    app.use(session({
      secret: process.env.SESSION_SECRET || 'vercel-production-secret-2025',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false, // Vercel handles HTTPS
        httpOnly: true,
        sameSite: 'lax'
      }
    }));

    // Mock user authentication for demo (replace with real OAuth later)
    app.use((req, res, next) => {
      if (!req.session.user) {
        req.session.user = {
          id: 1,
          username: 'demo_user',
          email: 'demo@vercel.production'
        };
      }
      req.user = req.session.user;
      next();
    });

  } else {
    console.log('💻 Development environment detected');

    // Development: Use SQLite-backed sessions
    const SQLiteStore = require('connect-sqlite3')(session);

    app.use(session({
      store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
      secret: process.env.SESSION_SECRET || 'development-local-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax'
      }
    }));
  }

  // Initialize database for development
  if (!isProduction) {
    console.log('📊 SQLite database initialized for development');
  }

  // Add API routes
  setupApiRoutes();

  // Serve the main page
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Catch-all handler for SPA routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 News and Actions server running on http://localhost:${PORT}`);
    console.log(`📡 Available endpoints:`);
    console.log(`  GET  /api/markets`);
    console.log(`  GET  /api/sectors`);
    console.log(`  GET  /api/news/business-bites/`);
    console.log(`  GET  /api/test`);
    console.log(`  POST /api/refresh-news`);
    console.log(`  GET  /api/search-similar`);
  });
}

// API Routes setup
function setupApiRoutes() {

  // Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('🧪 Test endpoint called!');
    res.json({
      message: 'Test endpoint working',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHelper?.isProduction ? 'Supabase' : 'SQLite'
    });
  });

  // Markets endpoint
  app.get('/api/markets', async (req, res) => {
    try {
      const markets = ['US', 'China', 'EU', 'India', 'Crypto'];

      // Try to get unique markets from database
      if (dbHelper) {
        try {
          const result = await dbHelper.query('business_bites_display', {
            columns: 'DISTINCT market',
            orderBy: { column: 'market', ascending: true }
          });

          if (result.rows && result.rows.length > 0) {
            const dbMarkets = result.rows.map(row => row.market).filter(Boolean);
            if (dbMarkets.length > 0) {
              res.json(dbMarkets);
              return;
            }
          }
        } catch (dbError) {
          console.log('Could not fetch markets from database, using default list');
        }
      }

      res.json(markets);
    } catch (error) {
      console.error('Error in markets endpoint:', error);
      res.json(['US', 'China', 'EU', 'India', 'Crypto']); // Fallback
    }
  });

  // Sectors endpoint
  app.get('/api/sectors', async (req, res) => {
    try {
      const sectors = ['Technology', 'Healthcare', 'Finance', 'Energy', 'Manufacturing', 'Retail', 'Real Estate'];

      // Try to get unique sectors from database
      if (dbHelper) {
        try {
          const result = await dbHelper.query('business_bites_display', {
            columns: 'DISTINCT sector',
            orderBy: { column: 'sector', ascending: true }
          });

          if (result.rows && result.rows.length > 0) {
            const dbSectors = result.rows.map(row => row.sector).filter(Boolean);
            if (dbSectors.length > 0) {
              res.json(dbSectors);
              return;
            }
          }
        } catch (dbError) {
          console.log('Could not fetch sectors from database, using default list');
        }
      }

      res.json(sectors);
    } catch (error) {
      console.error('Error in sectors endpoint:', error);
      res.json(['Technology', 'Healthcare', 'Finance', 'Energy', 'Manufacturing', 'Retail', 'Real Estate']); // Fallback
    }
  });

  // Business-bites endpoint - MAIN ENDPOINT for articles
  app.get('/api/news/business-bites/', async (req, res) => {
    console.log('🚀 Business-bites endpoint HIT! URL:', req.url);
    console.log('🚀 Business-bites endpoint HIT! Query:', JSON.stringify(req.query));
    console.log('🚀 Business-bites endpoint HIT! Method:', req.method);

    try {
      const market = req.query.market || 'US';
      const page = parseInt(req.query.page) || 1;
      const perPage = 12; // Show more articles per page for business-bites

      console.log(`🔍 Business-bites API called: market=${market}, page=${page}, perPage=${perPage}`);

      if (!dbHelper) {
        console.error('Database helper not initialized');
        return res.status(500).json({ error: 'Database not available' });
      }

      // Use the database helper's specialized method
      const result = await dbHelper.getBusinessBitesArticles(market, page, perPage);

      // Calculate daily summary - use recent articles (last 48 hours)
      let dailySummary = null;
      try {
        const fortyEightHoursAgo = new Date();
        fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

        let recentData = [];
        if (dbHelper.isProduction) {
          // Supabase query for recent articles
          const { data, error } = await dbHelper.dbClient
            .from('business_bites_display')
            .select('impact_score, published_at')
            .eq('market', market)
            .gte('published_at', fortyEightHoursAgo.toISOString());

          if (!error && data) {
            recentData = data;
          }
        } else {
          // SQLite query for recent articles
          const sql = `
            SELECT impact_score, published_at
            FROM business_bites_display
            WHERE market = ? AND datetime(published_at) >= datetime(?)
          `;

          const recentResult = await new Promise((resolve, reject) => {
            dbHelper.dbClient.all(sql, [market, fortyEightHoursAgo.toISOString()], (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          });
          recentData = recentResult;
        }

        // Calculate statistics
        const totalArticlesToday = recentData.length;
        const avgImpactScore = totalArticlesToday > 0 ?
          (recentData.reduce((sum, article) => sum + (article.impact_score || 0), 0) / totalArticlesToday).toFixed(1) : 0;

        // Determine market sentiment
        let sentiment = 'neutral';
        if (avgImpactScore >= 7.5) sentiment = 'positive';
        else if (avgImpactScore <= 5.5) sentiment = 'negative';

        if (totalArticlesToday > 0) {
          dailySummary = {
            total_articles: totalArticlesToday,
            avg_impact_score: parseFloat(avgImpactScore),
            sentiment: sentiment,
            summary: `Market activity shows ${sentiment} sentiment with ${totalArticlesToday} articles averaging ${avgImpactScore} impact score.`
          };
        }
      } catch (summaryError) {
        console.log('Error calculating daily summary:', summaryError.message);
      }

      // Return formatted response matching the expected format
      res.json({
        articles: result.articles,
        market: market,
        pagination: {
          current_page: result.currentPage,
          total_pages: result.totalPages,
          total_articles: result.totalArticles,
          has_previous: result.currentPage > 1,
          has_next: result.currentPage < result.totalPages,
          previous_page: result.currentPage > 1 ? result.currentPage - 1 : null,
          next_page: result.currentPage < result.totalPages ? result.currentPage + 1 : null
        },
        daily_summary: dailySummary
      });

    } catch (error) {
      console.error('❌ Error in business-bites endpoint:', error);
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);

      res.status(500).json({
        error: error.message || 'Database query failed',
        market: req.query.market || 'US',
        pagination: {
          current_page: 1,
          total_pages: 1,
          total_articles: 0,
          has_previous: false,
          has_next: false,
          previous_page: null,
          next_page: null
        },
        articles: []
      });
    }
  });

  // User Preferences endpoints - for Read Later functionality
  app.get('/api/user-preferences/', async (req, res) => {
    console.log('📋 User preferences get endpoint called');
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id parameter required'
        });
      }

      console.log(`Loading preferences for user_id: ${user_id}`);

      // For now, return empty read_later array (we can enhance this later with proper table)
      // In production, you'd have a read_later table
      const userPreferences = {
        read_later: [], // Empty array for now - will be populated from localStorage on client
        watchlist: [],
        favorites: [],
        user_id: user_id
      };

      console.log(`📊 Loaded user preferences for user ${user_id}`);

      res.json({
        success: true,
        user_preferences: userPreferences,
        message: 'User preferences loaded successfully'
      });

    } catch (error) {
      console.error('Error loading user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to load user preferences',
        details: error.message
      });
    }
  });

  app.post('/api/user-preferences/add/', async (req, res) => {
    try {
      console.log('➕ User preferences add endpoint called');
      const { user_id, preference_type, item_id, item_type } = req.body;

      if (!user_id || !preference_type || !item_id || !item_type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: user_id, preference_type, item_id, item_type'
        });
      }

      console.log(`Adding ${preference_type} item: ${item_id} (${item_type}) for user ${user_id}`);

      // For Read Later functionality, we mainly handle business_bites_news_id
      if (preference_type === 'read_later' && item_type === 'article') {
        // Get article details if possible
        try {
          const articleDetails = await dbHelper.query('business_bites_display', {
            filters: { business_bites_news_id: item_id },
            limit: 1
          });

          const article = articleDetails.rows && articleDetails.rows.length > 0 ? articleDetails.rows[0] : null;

          console.log(`✅ Added article ${item_id} to ${preference_type} for user ${user_id}`);

          res.json({
            success: true,
            message: `${preference_type} item added successfully`,
            data: {
              user_id,
              preference_type,
              item_id,
              item_type,
              article_title: article ? article.title : 'Unknown Article',
              article_link: article ? article.link : '#',
              added_at: new Date().toISOString()
            }
          });
        } catch (articleError) {
          console.log(`Could not fetch article details: ${articleError.message}`);
          // Still succeed but with basic response
          res.json({
            success: true,
            message: `${preference_type} item added successfully`,
            data: {
              user_id,
              preference_type,
              item_id,
              item_type,
              added_at: new Date().toISOString()
            }
          });
        }
      } else {
        // Handle other preference types (could extend later)
        res.json({
          success: true,
          message: `${preference_type} item added successfully`,
          data: {
            user_id,
            preference_type,
            item_id,
            item_type,
            added_at: new Date().toISOString()
          }
        });
      }

    } catch (error) {
      console.error('Error adding to user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add to user preferences',
        details: error.message
      });
    }
  });

  app.delete('/api/user-preferences/remove/:preference_type/:item_id/', async (req, res) => {
    try {
      console.log('➖ User preferences remove endpoint called');
      const { preference_type, item_id } = req.params;
      const { user_id } = req.query;

      if (!preference_type || !item_id || !user_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: preference_type, item_id, user_id'
        });
      }

      console.log(`Removing ${preference_type} item: ${item_id} for user ${user_id}`);

      // For now, just acknowledge the removal (client handles localStorage)
      // In production, you'd remove from actual database tables

      res.json({
        success: true,
        message: `${preference_type} item removed successfully`,
        data: {
          user_id,
          preference_type,
          item_id,
          removed_at: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error removing from user preferences:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove from user preferences',
        details: error.message
      });
    }
  });

  // Additional placeholder endpoints for search functionality
  app.get('/api/search-similar', async (req, res) => {
    try {
      const { query, market = 'US', user_id } = req.query;

      // Authentication check - require user_id
      console.log('🔍 Search request - user_id:', user_id);
      if (!user_id) {
        console.log('❌ Authentication failed: no user_id provided');
        return res.status(400).json({
          error: 'Authentication required',
          query: query,
          articles: [],
          totalResults: 0
        });
      }

      if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
      }

      console.log(`🔍 Searching for: "${query}" in market: ${market} (User: ${user_id})`);

      // Basic search implementation - search in title and summary
      let searchResults = [];
      if (dbHelper) {
        try {
          // Simple text search in title and summary
          const titleResults = await dbHelper.query('business_bites_display', {
            filters: { market: market },
            orderBy: { column: 'published_at', ascending: false },
            limit: 20
          });

          searchResults = titleResults.rows.filter(article =>
            article.title && article.title.toLowerCase().includes(query.toLowerCase())
          ).slice(0, 10);

          console.log(`✅ Found ${searchResults.length} articles matching "${query}"`);
        } catch (searchError) {
          console.log(`Search error: ${searchError.message}`);
          searchResults = [];
        }
      }

      // Format results to match expected structure
      const formattedResults = searchResults.map(article => ({
        title: article.title || 'No Title',
        description: article.summary || 'No summary available',
        url: article.link,
        urlToImage: article.urlToImage,
        publishedAt: article.published_at,
        source: {
          id: article.source_system?.toLowerCase().replace(/\s+/g, '-'),
          name: article.source_system || 'Unknown Source'
        },
        author: article.author,
        content: article.summary,
        business_bites_news_id: article.business_bites_news_id,
        market: article.market,
        sector: article.sector,
        impact_score: article.impact_score,
        sentiment: article.sentiment
      }));

      // For backward compatibility, provide basic Google search URLs
      const googleResults = [{
        title: `${query} - Latest News`,
        description: `Find comprehensive information about ${query} from trusted financial sources.`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}+news&tbm=nws`,
        publishedAt: new Date().toISOString(),
        source: {
          id: 'google-search',
          name: 'Google Search'
        },
        isGoogleResult: true
      }];

      res.json({
        query: query,
        totalResults: formattedResults.length + googleResults.length,
        articles: formattedResults,
        googleResults: googleResults,
        market: market
      });

    } catch (error) {
      console.error('Error in search endpoint:', error);
      res.status(500).json({
        error: 'Search failed',
        query: req.query.query || '',
        articles: [],
        googleResults: [],
        totalResults: 0
      });
    }
  });

  // Placeholder refresh endpoint
  app.post('/api/refresh-news', async (req, res) => {
    try {
      console.log('Manual news refresh requested...');
      // For now, just acknowledge - in production you'd trigger news fetching
      res.json({
        success: true,
        message: 'News refresh acknowledged (placeholder)',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error refreshing news:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'News refresh failed'
      });
    }
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});

// Start the server initialization
initializeServer().catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
