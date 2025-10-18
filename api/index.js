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

// Load data from JSON file directly (Vercel-compatible approach)
let articlesData = [];
let dataLoaded = false;

function loadArticlesData() {
  try {
    const jsonPath = path.join(process.cwd(), 'db/business_bites_display.json');
    console.log('📄 Loading articles from JSON file:', jsonPath);

    if (fs.existsSync(jsonPath)) {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      articlesData = jsonData;
      dataLoaded = true;
      console.log(`✅ Successfully loaded ${jsonData.length} articles from JSON`);
    } else {
      console.error('❌ JSON file not found:', jsonPath);
    }
  } catch (error) {
    console.error('❌ Error loading JSON data:', error);
  }
}

// Load data on startup
loadArticlesData();

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

  if (!dataLoaded || articlesData.length === 0) {
    console.error('❌ No data loaded');
    return res.status(500).json({ error: 'No data available' });
  }

  const market = req.query.market || 'US';
  const page = parseInt(req.query.page) || 1;
  const perPage = 12; // Show more articles per page for business-bites
  const offset = (page - 1) * perPage;

  console.log(`🔍 Business-bites API called: market=${market}, page=${page}, perPage=${perPage}, offset=${offset}`);

  // Filter articles by market
  const marketArticles = articlesData.filter(article => article.market === market);
  console.log(`📊 Total articles for market ${market}: ${marketArticles.length}`);

  // Group articles by business_bites_news_id and create source_links array
  const articlesMap = new Map();

  marketArticles.forEach(article => {
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

  const totalArticles = articlesMap.size;
  const totalPages = Math.ceil(totalArticles / perPage);

  // Calculate daily summary - use recent articles (last 48 hours)
  const fortyEightHoursAgo = new Date();
  fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);
  const cutoffISO = fortyEightHoursAgo.toISOString();

  const recentArticles = marketArticles.filter(article =>
    new Date(article.published_at) >= new Date(cutoffISO)
  );

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
