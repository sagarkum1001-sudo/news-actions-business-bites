-- ===== TEST DATA FOR WATCHLIST NEWS FILTERING =====
-- Sample news articles for watchlist_companies, watchlist_sectors, watchlist_topics tables
-- Phase 3A: Watchlist News Filtering - TEST DATA
-- Updated to match actual PostgreSQL schema (link instead of url, etc.)

-- ===== CREATE TABLES (if they don't exist) =====
-- Note: These match the schema shown by the user for watchlist_sectors

-- Note: watchlist_companies table already exists in Supabase
-- Check actual column names before running INSERT statements
-- The API expects 'company_name' but table may use different column name

CREATE TABLE IF NOT EXISTS watchlist_sectors (
    id SERIAL PRIMARY KEY,
    sector_name TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'US',
    title TEXT NULL,
    summary TEXT NULL,
    link TEXT NULL,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    impact_score NUMERIC(3, 1) NULL,
    source_system TEXT NULL DEFAULT 'Watchlist_Discovery',
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist_topics (
    id SERIAL PRIMARY KEY,
    topic_name TEXT NOT NULL,
    market TEXT NOT NULL DEFAULT 'US',
    title TEXT NULL,
    summary TEXT NULL,
    link TEXT NULL,
    published_at TIMESTAMP WITH TIME ZONE NULL,
    impact_score NUMERIC(3, 1) NULL,
    source_system TEXT NULL DEFAULT 'Watchlist_Discovery',
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT CURRENT_TIMESTAMP
);

-- ===== WATCHLIST_COMPANIES TABLE =====
-- Note: Using 'name' instead of 'company_name' since table exists but may have different column names
INSERT INTO watchlist_companies (
    id, item_name, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    1001,
    'Apple',
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
    'Apple',
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
    'Tesla',
    'US',
    'Tesla Delivers Record 1.8 Million Vehicles in 2024',
    'Tesla achieved its ambitious production target with 1.8 million vehicle deliveries, surpassing Wall Street expectations and boosting EV market share.',
    'https://example.com/tesla-deliveries-2024',
    '2024-12-08T14:20:00Z',
    9.2,
    'Reuters'
);

-- ===== WATCHLIST_SECTORS TABLE =====
INSERT INTO watchlist_sectors (
    id, sector_name, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    2001,
    'Technology',
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
    'Healthcare',
    'US',
    'Healthcare Stocks Surge on New Drug Approvals',
    'Healthcare sector stocks jumped following FDA approval of several breakthrough treatments, with biotech companies seeing significant gains.',
    'https://example.com/healthcare-drug-approvals',
    '2024-12-09T11:30:00Z',
    8.0,
    'Financial Times'
);

-- ===== WATCHLIST_TOPICS TABLE =====
INSERT INTO watchlist_topics (
    id, topic_name, market, title, summary, link, published_at, impact_score, source_system
) VALUES
(
    3001,
    'AI',
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
    'Cryptocurrency',
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
