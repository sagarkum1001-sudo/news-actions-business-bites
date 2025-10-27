// Environment-aware database helper for SQLite and Supabase
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');

// Detect environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_REGION !== undefined;

console.log(`📊 Database mode: ${isProduction ? 'Supabase (Production)' : 'SQLite (Development)'}`);

class DatabaseHelper {
  constructor() {
    this.isProduction = isProduction;
    this.dbClient = null;
    this.initializeConnection();
  }

  async initializeConnection() {
    if (this.isProduction) {
      // Production: Try Supabase first
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        try {
          this.dbClient = createClient(supabaseUrl, supabaseKey);
          console.log('✅ Connected to Supabase for production');

          // Test connection
          const { data, error } = await this.dbClient
            .from('business_bites_display')
            .select('count', { count: 'exact', head: true });

          if (error) {
            console.log(`Supabase connection test failed: ${error.message}`);
            console.log('Switching to fallback static files...');
            this.initializeStaticFiles();
          } else {
            console.log(`✅ Found ${data} records in Supabase business_bites_display table`);
          }
        } catch (error) {
          console.error('❌ Failed to connect to Supabase:', error.message);
          console.log('Using fallback static files for production...');
          this.initializeStaticFiles();
        }
      } else {
        console.log('ℹ️ Supabase credentials not configured, using fallback static files');
        this.initializeStaticFiles();
      }
    } else {
      // Development: Use SQLite
      this.initializeSQLite();
    }
  }

  initializeStaticFiles() {
    this.isProduction = false; // Ensure it's marked as non-production for fallback
    console.log('ℹ️ Using static JSON files for data source');

    // Load data from static files (same format as successful deployment)
    try {
      const fs = require('fs');
      const path = require('path');

      const dataPath = path.join(__dirname, 'db', 'business_bites_display.json');
      if (fs.existsSync(dataPath)) {
        const rawData = fs.readFileSync(dataPath, 'utf8');
        this.staticData = JSON.parse(rawData);
        console.log(`✅ Loaded ${this.staticData.length || 0} articles from static files`);
      } else {
        console.log('⚠️ Static data file not found, creating empty dataset');
        this.staticData = [];
      }
    } catch (error) {
      console.error('❌ Failed to load static files:', error.message);
      this.staticData = [];
    }
  }

  initializeSQLite() {
    this.isProduction = false; // Ensure it's marked as non-production
    this.dbClient = new sqlite3.Database('./db.sqlite3', (err) => {
      if (err) {
        console.error('❌ SQLite Error:', err.message);
      } else {
        console.log('✅ Connected to SQLite database for development');
      }
    });
  }

  // Universal query method - handles databases and static files
  async query(table, options = {}) {
    try {
      if (this.isProduction && this.dbClient && this.dbClient.select) {
        // Supabase query
        return await this.supabaseQuery(table, options);
      } else if (this.isProduction && this.staticData) {
        // Static files query (production fallback)
        return await this.staticFilesQuery(table, options);
      } else {
        // SQLite query (development)
        return await this.sqliteQuery(table, options);
      }
    } catch (error) {
      console.error('❌ Database query error:', error);
      // Fallback to SQLite query if Supabase fails
      if (this.isProduction && !this.fallbackMode) {
        console.log('🔄 Fallback to SQLite query...');
        this.fallbackMode = true;
        return await this.sqliteQuery(table, options);
      }
      throw error;
    }
  }

  async supabaseQuery(table, options) {
    try {
      let query = this.dbClient.from(table);

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
      }

      // Apply limits
      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      // Select columns
      const columns = options.columns || '*';
      query = query.select(columns);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        rows: data || [],
        rowCount: count || (data ? data.length : 0)
      };
    } catch (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
  }

  async staticFilesQuery(table, options) {
    try {
      // For static files, we only support business_bites_display data
      if (table !== 'business_bites_display') {
        return { rows: [], rowCount: 0 };
      }

      let data = this.staticData || [];

      // Apply filters
      if (options.filters) {
        data = data.filter(item => {
          return Object.entries(options.filters).every(([key, value]) => {
            return item[key] === value;
          });
        });
      }

      // Apply ordering
      if (options.orderBy) {
        data = data.sort((a, b) => {
          const aVal = a[options.orderBy.column];
          const bVal = b[options.orderBy.column];
          const ascending = options.orderBy.ascending ? 1 : -1;
          return (aVal < bVal ? -1 : aVal > bVal ? 1 : 0) * ascending;
        });
      }

      // Get total count before pagination
      const totalCount = data.length;

      // Apply pagination
      if (options.offset || options.limit) {
        const offset = options.offset || 0;
        const limit = options.limit || data.length;
        data = data.slice(offset, offset + limit);
      }

      console.log(`Static files query: ${data.length} records returned`);

      return {
        rows: data,
        rowCount: totalCount
      };
    } catch (error) {
      console.error('Static files query error:', error);
      return { rows: [], rowCount: 0 };
    }
  }

  async sqliteQuery(table, options) {
    return new Promise((resolve, reject) => {
      try {
        let sql = `SELECT ${options.columns || '*'} FROM ${table}`;
        let params = [];

        // Apply filters (WHERE clause)
        if (options.filters) {
          const conditions = [];
          Object.entries(options.filters).forEach(([key, value]) => {
            conditions.push(`${key} = ?`);
            params.push(value);
          });
          if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        // Apply ordering
        if (options.orderBy) {
          sql += ` ORDER BY ${options.orderBy.column} ${options.orderBy.ascending ? 'ASC' : 'DESC'}`;
        }

        // Apply limits and offsets
        if (options.limit) {
          sql += ` LIMIT ${options.limit}`;
        }
        if (options.offset) {
          sql += ` OFFSET ${options.offset}`;
        }

        console.log(`Executing SQLite query: ${sql}`, params);

        this.dbClient.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              rows: rows || [],
              rowCount: rows ? rows.length : 0
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Specialized methods for complex queries
  async getBusinessBitesArticles(market, page = 1, perPage = 12) {
    try {
      const offset = (page - 1) * perPage;

      if (this.isProduction && this.dbClient && this.dbClient.select) {
        // Supabase complex query using RPC or direct table access
        return await this.getBusinessBitesFromSupabase(market, offset, perPage);
      } else if (this.isProduction && this.staticData) {
        // Static files fallback for production
        return await this.getBusinessBitesFromStaticFiles(market, offset, perPage);
      } else {
        // SQLite complex query (development)
        return await this.getBusinessBitesFromSQLite(market, offset, perPage);
      }
    } catch (error) {
      console.error('Error getting business bites articles:', error);
      throw error;
    }
  }

  async getBusinessBitesFromSupabase(market, offset, perPage) {
    // For Supabase, we'd need to handle the complex grouping logic
    // For now, return a basic implementation
    const { data, error, count } = await this.dbClient
      .from('business_bites_display')
      .select('*')
      .eq('market', market)
      .order('published_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw error;

    // Basic grouping emulation (simplified)
    const articles = [];
    const uniqueIds = [...new Set(data.map(item => item.business_bites_news_id))];

    uniqueIds.slice(0, perPage).forEach(newsId => {
      const items = data.filter(item => item.business_bites_news_id === newsId);
      const primary = items[0];

      articles.push({
        ...primary,
        source_links: items.map(item => ({
          title: item.title,
          source: item.source_system,
          url: item.link,
          published_at: item.published_at,
          rank: item.rank
        }))
      });
    });

    return {
      articles,
      totalArticles: count || articles.length,
      totalPages: Math.ceil((count || articles.length) / perPage),
      currentPage: Math.floor(offset / perPage) + 1
    };
  }

  async getBusinessBitesFromStaticFiles(market, offset, perPage) {
    try {
      // Filter by market
      let filteredData = (this.staticData || []).filter(item => item.market === market);

      // Group by business_bites_news_id and sort by published_at
      const articlesMap = new Map();

      // Sort all data by published_at first
      filteredData = filteredData.sort((a, b) =>
        new Date(b.published_at) - new Date(a.published_at)
      );

      filteredData.forEach(article => {
        const newsId = article.business_bites_news_id;

        if (!articlesMap.has(newsId)) {
          articlesMap.set(newsId, {
            ...article,
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

      // Convert map to array and apply pagination
      const allArticles = Array.from(articlesMap.values());
      const totalArticles = allArticles.length;
      const totalPages = Math.ceil(totalArticles / perPage);

      // Apply pagination after grouping
      const articles = allArticles.slice(offset, offset + perPage);
      const currentPage = Math.floor(offset / perPage) + 1;

      console.log(`📊 Static files: ${articles.length} articles, total: ${totalArticles}, page: ${currentPage}/${totalPages}`);

      return {
        articles,
        totalArticles,
        totalPages,
        currentPage
      };
    } catch (error) {
      console.error('Error getting business bites from static files:', error);
      return { articles: [], totalArticles: 0, totalPages: 0, currentPage: 1 };
    }
  }

  async getBusinessBitesFromSQLite(market, offset, perPage) {
    return new Promise((resolve, reject) => {
      // Complex SQLite query to group articles by business_bites_news_id
      const sql = `
        SELECT * FROM business_bites_display
        WHERE market = ?
        ORDER BY business_bites_news_id, rank
        LIMIT ? OFFSET ?
      `;

      this.dbClient.all(sql, [market, perPage, offset], (err, rawArticles) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(`📊 Found ${rawArticles.length} raw SQLite records for market ${market}`);

        // Group articles by business_bites_news_id and create source_links array (same as original)
        const articlesMap = new Map();

        rawArticles.forEach(article => {
          const newsId = article.business_bites_news_id;

          if (!articlesMap.has(newsId)) {
            articlesMap.set(newsId, {
              ...article,
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

        const articles = Array.from(articlesMap.values());

        console.log(`📊 After SQLite grouping: ${articles.length} articles`);

        // Get total count for pagination
        this.dbClient.get(`SELECT COUNT(DISTINCT business_bites_news_id) as total FROM business_bites_display WHERE market = ?`,
          [market], (countErr, countResult) => {
            if (countErr) {
              reject(countErr);
              return;
            }

            const totalArticles = countResult.total;
            const totalPages = Math.ceil(totalArticles / perPage);

            resolve({
              articles,
              totalArticles,
              totalPages,
              currentPage: Math.floor(offset / perPage) + 1
            });
          });
      });
    });
  }
}

module.exports = DatabaseHelper;
