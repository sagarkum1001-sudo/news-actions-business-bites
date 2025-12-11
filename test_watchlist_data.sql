-- ===== TEST DATA FOR WATCHLIST NEWS FILTERING =====
-- Sample news articles for watchlist_companies, watchlist_sectors, watchlist_topics tables
-- Phase 3A: Watchlist News Filtering - TEST DATA

-- ===== WATCHLIST_COMPANIES TABLE =====
INSERT INTO watchlist_companies (
    id, title, summary, url, company_name, market, published_at, source_system,
    impact_score, sentiment, urlToImage, author, summary_short, alternative_sources, rank, slno
) VALUES
(
    1001,
    'Apple Reports Record Q4 Earnings, iPhone Sales Surge 15%',
    'Apple Inc. announced record-breaking quarterly earnings with iPhone sales increasing by 15% year-over-year, driven by strong demand for the new iPhone 15 Pro models.',
    'https://example.com/apple-q4-earnings',
    'Apple',
    'US',
    '2024-12-10T08:30:00Z',
    'Bloomberg',
    8.5,
    'positive',
    'https://example.com/apple-image.jpg',
    'Sarah Johnson',
    'Apple reports record Q4 earnings with 15% iPhone sales growth',
    NULL,
    1,
    1001
),
(
    1002,
    'Apple Stock Hits All-Time High After Earnings Beat',
    'Apple shares reached a new all-time high following better-than-expected earnings results, with analysts upgrading their price targets.',
    'https://example.com/apple-stock-ath',
    'Apple',
    'US',
    '2024-12-10T10:15:00Z',
    'CNBC',
    7.8,
    'positive',
    'https://example.com/apple-stock-image.jpg',
    'Mike Chen',
    'Apple stock hits all-time high after earnings beat expectations',
    NULL,
    1,
    1002
),
(
    1003,
    'Tesla Delivers Record 1.8 Million Vehicles in 2024',
    'Tesla achieved its ambitious production target with 1.8 million vehicle deliveries, surpassing Wall Street expectations and boosting EV market share.',
    'https://example.com/tesla-deliveries-2024',
    'Tesla',
    'US',
    '2024-12-08T14:20:00Z',
    'Reuters',
    9.2,
    'positive',
    'https://example.com/tesla-delivery-image.jpg',
    'Emma Davis',
    'Tesla delivers record 1.8 million vehicles in 2024',
    NULL,
    1,
    1003
);

-- ===== WATCHLIST_SECTORS TABLE =====
INSERT INTO watchlist_sectors (
    id, title, summary, url, sector_name, market, published_at, source_system,
    impact_score, sentiment, urlToImage, author, summary_short, alternative_sources, rank, slno
) VALUES
(
    2001,
    'Technology Sector Leads Market Rally, Up 8% This Month',
    'The technology sector has been the strongest performer this month, with major tech stocks driving significant market gains amid AI optimism.',
    'https://example.com/tech-sector-rally',
    'Technology',
    'US',
    '2024-12-11T09:00:00Z',
    'Wall Street Journal',
    7.5,
    'positive',
    'https://example.com/tech-sector-image.jpg',
    'David Wilson',
    'Technology sector leads market rally with 8% monthly gains',
    NULL,
    1,
    2001
),
(
    2002,
    'Healthcare Stocks Surge on New Drug Approvals',
    'Healthcare sector stocks jumped following FDA approval of several breakthrough treatments, with biotech companies seeing significant gains.',
    'https://example.com/healthcare-drug-approvals',
    'Healthcare',
    'US',
    '2024-12-09T11:30:00Z',
    'Financial Times',
    8.0,
    'positive',
    'https://example.com/healthcare-image.jpg',
    'Lisa Park',
    'Healthcare stocks surge on new drug approvals',
    NULL,
    1,
    2002
);

-- ===== WATCHLIST_TOPICS TABLE =====
INSERT INTO watchlist_topics (
    id, title, summary, url, topic_name, market, published_at, source_system,
    impact_score, sentiment, urlToImage, author, summary_short, alternative_sources, rank, slno
) VALUES
(
    3001,
    'AI Revolution Transforms Business Operations Globally',
    'Artificial Intelligence is fundamentally changing how businesses operate, with companies across industries adopting AI for efficiency and innovation.',
    'https://example.com/ai-business-transformation',
    'AI',
    'US',
    '2024-12-12T07:45:00Z',
    'Forbes',
    8.8,
    'positive',
    'https://example.com/ai-image.jpg',
    'Robert Kim',
    'AI revolution transforms business operations across industries',
    NULL,
    1,
    3001
),
(
    3002,
    'Cryptocurrency Market Shows Signs of Recovery',
    'Digital assets have shown resilience with Bitcoin and Ethereum prices recovering from recent lows, signaling renewed investor interest.',
    'https://example.com/crypto-market-recovery',
    'Cryptocurrency',
    'US',
    '2024-12-07T16:10:00Z',
    'CoinDesk',
    7.2,
    'neutral',
    'https://example.com/crypto-image.jpg',
    'Alex Thompson',
    'Cryptocurrency market shows signs of recovery after recent volatility',
    NULL,
    1,
    3002
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
