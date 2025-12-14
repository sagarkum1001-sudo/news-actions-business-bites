-- Add ticker_symbol column to watchlist_companies table
-- This will enable proper matching between user watchlists and discovered news

ALTER TABLE watchlist_companies
ADD COLUMN ticker_symbol VARCHAR(10);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_watchlist_companies_ticker_symbol
ON watchlist_companies(ticker_symbol);

-- Add comment to document the column
COMMENT ON COLUMN watchlist_companies.ticker_symbol IS 'Stock ticker symbol for company matching (e.g., GOOGL for Google)';

-- Update existing records with ticker symbols by joining with watchlist_lookup table
-- This properly matches item_name to get the correct ticker_symbol
UPDATE watchlist_companies
SET ticker_symbol = watchlist_lookup.ticker_symbol
FROM watchlist_lookup
WHERE watchlist_companies.item_name = watchlist_lookup.item_name
  AND watchlist_lookup.item_type = 'companies'
  AND watchlist_companies.market = watchlist_lookup.market
  AND watchlist_companies.ticker_symbol IS NULL;

-- For companies that have common names but are stored with full names, try fuzzy matching
-- e.g., 'Apple Inc.' should match 'Apple' in lookup table
UPDATE watchlist_companies
SET ticker_symbol = watchlist_lookup.ticker_symbol
FROM watchlist_lookup
WHERE watchlist_companies.item_name ILIKE '%' || watchlist_lookup.item_name || '%'
  AND watchlist_lookup.item_type = 'companies'
  AND watchlist_companies.market = watchlist_lookup.market
  AND watchlist_companies.ticker_symbol IS NULL;

-- Manual fallback mappings for edge cases (if fuzzy matching misses some)
UPDATE watchlist_companies
SET ticker_symbol = CASE
    WHEN item_name = 'Apple Inc.' THEN 'AAPL'
    WHEN item_name = 'Alphabet Inc.' THEN 'GOOGL'
    WHEN item_name = 'Microsoft Corporation' THEN 'MSFT'
    WHEN item_name = 'Tesla Motors' THEN 'TSLA'
    -- Add any remaining manual mappings here
    ELSE ticker_symbol
END
WHERE ticker_symbol IS NULL;

-- Verify the changes
SELECT
    item_name,
    ticker_symbol,
    COUNT(*) as article_count
FROM watchlist_companies
GROUP BY item_name, ticker_symbol
ORDER BY item_name;
