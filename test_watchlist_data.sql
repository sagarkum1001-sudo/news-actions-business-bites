-- ===== TEST DATA FOR WATCHLIST NEWS FILTERING =====
-- Sample news articles for watchlist_companies, watchlist_sectors, watchlist_topics tables
-- Phase 3A: Watchlist News Filtering - TEST DATA
-- Updated to match actual PostgreSQL schema (link instead of url, etc.)

-- ===== ALTER TABLES (add item_id foreign key) =====
-- Tables already exist, add item_id column as foreign key to watchlist_lookup.id

-- Add item_id column to watchlist_companies (if not exists)
ALTER TABLE watchlist_companies ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES watchlist_lookup(id);

-- Add item_id column to watchlist_sectors (if not exists)
ALTER TABLE watchlist_sectors ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES watchlist_lookup(id);

-- Add item_id column to watchlist_topics (if not exists)
ALTER TABLE watchlist_topics ADD COLUMN IF NOT EXISTS item_id INTEGER REFERENCES watchlist_lookup(id);

-- Note: After adding item_id column, you may need to populate it with correct IDs:
-- UPDATE watchlist_companies SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = watchlist_companies.item_name LIMIT 1) WHERE item_id IS NULL;
-- UPDATE watchlist_sectors SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = watchlist_sectors.item_name LIMIT 1) WHERE item_id IS NULL;
-- UPDATE watchlist_topics SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = watchlist_topics.item_name LIMIT 1) WHERE item_id IS NULL;

-- ===== INSERT LOOKUP DATA FIRST (for foreign key references) =====
-- Insert only if data doesn't already exist, using auto-generated IDs
INSERT INTO watchlist_lookup (item_name, item_type, market, description, market_cap_rank, ticker_symbol)
SELECT item_name, item_type, market, description, market_cap_rank, ticker_symbol
FROM (VALUES
    ('Apple', 'companies', 'US', 'Apple Inc. - Technology company', 1, 'AAPL'),
    ('Tesla', 'companies', 'US', 'Tesla Inc. - Electric vehicle manufacturer', 2, 'TSLA'),
    ('Amazon', 'companies', 'US', 'Amazon.com Inc. - E-commerce and cloud computing giant', 3, 'AMZN'),
    ('Google', 'companies', 'US', 'Alphabet Inc. (Google) - Search and technology conglomerate', 4, 'GOOGL'),
    ('Technology', 'sectors', 'US', 'Technology sector encompassing software, hardware, and IT services', NULL, NULL),
    ('Healthcare', 'sectors', 'US', 'Healthcare sector including pharmaceuticals and medical devices', NULL, NULL),
    ('AI', 'topics', 'US', 'Artificial Intelligence and machine learning technologies', NULL, NULL),
    ('Cryptocurrency', 'topics', 'US', 'Digital currencies and blockchain technologies', NULL, NULL)
) AS v(item_name, item_type, market, description, market_cap_rank, ticker_symbol)
WHERE NOT EXISTS (
    SELECT 1 FROM watchlist_lookup
    WHERE watchlist_lookup.item_name = v.item_name
    AND watchlist_lookup.item_type = v.item_type
    AND watchlist_lookup.market = v.market
);

-- ===== UPDATE ARTICLE TABLES WITH CORRECT ITEM_ID VALUES =====
-- After running the above, check the actual IDs assigned and update article tables:
-- SELECT id, item_name, item_type FROM watchlist_lookup ORDER BY id;

-- Then update the item_id values in article tables to match:
-- UPDATE watchlist_companies SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Apple' AND item_type = 'companies') WHERE id = 1001;
-- UPDATE watchlist_companies SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Tesla' AND item_type = 'companies') WHERE id = 1003;
-- UPDATE watchlist_companies SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Amazon' AND item_type = 'companies') WHERE id = 1004;
-- UPDATE watchlist_companies SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Google' AND item_type = 'companies') WHERE id = 1005;
-- UPDATE watchlist_sectors SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Technology' AND item_type = 'sectors') WHERE id = 2001;
-- UPDATE watchlist_sectors SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Healthcare' AND item_type = 'sectors') WHERE id = 2002;
-- UPDATE watchlist_topics SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'AI' AND item_type = 'topics') WHERE id = 3001;
-- UPDATE watchlist_topics SET item_id = (SELECT id FROM watchlist_lookup WHERE item_name = 'Cryptocurrency' AND item_type = 'topics') WHERE id = 3002;

-- ===== WATCHLIST_COMPANIES TABLE =====
-- Using item_id as foreign key to watchlist_lookup.id
INSERT INTO watchlist_companies (
    id, item_id, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    1001,
    1, -- Apple
    'US',
    'Apple Reports Record Q4 Earnings, iPhone Sales Surge 15%',
    'Apple Inc. announced record-breaking quarterly earnings with iPhone sales increasing by 15% year-over-year, driven by strong demand for the new iPhone 15 Pro models.',
    'https://example.com/apple-q4-earnings',
    '2024-12-10T08:30:00Z',
    8.5,
    'Bloomberg'
),
(
    1002,
    1, -- Apple
    'US',
    'Apple Stock Hits All-Time High After Earnings Beat',
    'Apple shares reached a new all-time high following better-than-expected earnings results, with analysts upgrading their price targets.',
    'https://example.com/apple-stock-ath',
    '2024-12-10T10:15:00Z',
    7.8,
    'CNBC'
),
(
    1003,
    2, -- Tesla
    'US',
    'Tesla Delivers Record 1.8 Million Vehicles in 2024',
    'Tesla achieved its ambitious production target with 1.8 million vehicle deliveries, surpassing Wall Street expectations and boosting EV market share.',
    'https://example.com/tesla-deliveries-2024',
    '2024-12-08T14:20:00Z',
    9.2,
    'Reuters'
),
(
    1004,
    3, -- Amazon
    'US',
    'Amazon Q4 Revenue Beats Estimates, Cloud Growth Accelerates',
    'Amazon reported fourth-quarter revenue of $170 billion, beating analyst estimates, with AWS cloud computing segment showing 30% year-over-year growth.',
    'https://example.com/amazon-q4-results',
    '2024-12-09T16:45:00Z',
    8.9,
    'Reuters'
),
(
    1005,
    4, -- Google
    'Google Announces Major AI Model Breakthrough',
    'Alphabet Inc. unveiled its most advanced AI model yet, with capabilities surpassing previous generations and opening new possibilities for enterprise applications.',
    'https://example.com/google-ai-breakthrough',
    '2024-12-11T12:30:00Z',
    9.5,
    'The Verge'
);

-- ===== WATCHLIST_SECTORS TABLE =====
-- Using item_id as foreign key to watchlist_lookup.id
INSERT INTO watchlist_sectors (
    id, item_id, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    2001,
    5, -- Technology
    'US',
    'Technology Sector Leads Market Rally, Up 8% This Month',
    'The technology sector has been the strongest performer this month, with major tech stocks driving significant market gains amid AI optimism.',
    'https://example.com/tech-sector-rally',
    '2024-12-11T09:00:00Z',
    7.5,
    'Wall Street Journal'
),
(
    2002,
    6, -- Healthcare
    'US',
    'Healthcare Stocks Surge on New Drug Approvals',
    'Healthcare sector stocks jumped following FDA approval of several breakthrough treatments, with biotech companies seeing significant gains.',
    'https://example.com/healthcare-drug-approvals',
    '2024-12-09T11:30:00Z',
    8.0,
    'Financial Times'
);

-- ===== WATCHLIST_TOPICS TABLE =====
-- Using item_id as foreign key to watchlist_lookup.id
INSERT INTO watchlist_topics (
    id, item_id, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    3001,
    7, -- AI
    'US',
    'AI Revolution Transforms Business Operations Globally',
    'Artificial Intelligence is fundamentally changing how businesses operate, with companies across industries adopting AI for efficiency and innovation.',
    'https://example.com/ai-business-transformation',
    '2024-12-12T07:45:00Z',
    8.8,
    'Forbes'
),
(
    3002,
    8, -- Cryptocurrency
    'US',
    'Cryptocurrency Market Shows Signs of Recovery',
    'Digital assets have shown resilience with Bitcoin and Ethereum prices recovering from recent lows, signaling renewed investor interest.',
    'https://example.com/crypto-market-recovery',
    '2024-12-07T16:10:00Z',
    7.2,
    'CoinDesk'
);

-- ===== USAGE INSTRUCTIONS =====
-- Run these INSERT statements in Supabase SQL Editor to populate test data
--
-- To test watchlist filtering:
-- 1. Create a watchlist with companies: "Apple", "Tesla"
-- 2. Create a watchlist with sectors: "Technology", "Healthcare"
-- 3. Create a watchlist with topics: "AI", "Cryptocurrency"
-- 4. Click on watchlists from navigation submenu
-- 5. Verify articles appear in compact tile format
-- 6. Test item filtering dropdown functionality
