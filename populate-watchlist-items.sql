-- Populate watchlist_items table with market-specific default data
-- This provides the lookup values for users to choose from when creating watchlists

-- Insert top companies by market
-- US Companies (Top 10)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
('Apple Inc.', 'company', 'US'),
('Microsoft Corporation', 'company', 'US'),
('Amazon.com Inc.', 'company', 'US'),
('Alphabet Inc.', 'company', 'US'),
('Meta Platforms Inc.', 'company', 'US'),
('Tesla Inc.', 'company', 'US'),
('NVIDIA Corporation', 'company', 'US'),
('Berkshire Hathaway', 'company', 'US'),
('Johnson & Johnson', 'company', 'US'),
('JPMorgan Chase & Co.', 'company', 'US')
ON CONFLICT (item_name, item_type, market) DO NOTHING;

-- China Companies (Top 10)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
('Alibaba Group', 'company', 'China'),
('Tencent Holdings', 'company', 'China'),
('China Mobile', 'company', 'China'),
('ICBC', 'company', 'China'),
('China Construction Bank', 'company', 'China'),
('Ping An Insurance', 'company', 'China'),
('China Merchants Bank', 'company', 'China'),
('Bank of China', 'company', 'China'),
('Agricultural Bank of China', 'company', 'China'),
('BYD Company', 'company', 'China')
ON CONFLICT (item_name, item_type, market) DO NOTHING;

-- EU Companies (Top 10)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
('ASML Holding', 'company', 'EU'),
('SAP SE', 'company', 'EU'),
('Siemens AG', 'company', 'EU'),
('TotalEnergies', 'company', 'EU'),
('Sanofi', 'company', 'EU'),
('Allianz', 'company', 'EU'),
('L''Oréal', 'company', 'EU'),
('Deutsche Telekom', 'company', 'EU'),
('BNP Paribas', 'company', 'EU'),
('AXA', 'company', 'EU')
ON CONFLICT (item_name, item_type, market) DO NOTHING;

-- India Companies (Top 10)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
('Reliance Industries', 'company', 'India'),
('Tata Consultancy Services', 'company', 'India'),
('HDFC Bank', 'company', 'India'),
('ICICI Bank', 'company', 'India'),
('Hindustan Unilever', 'company', 'India'),
('ITC Limited', 'company', 'India'),
('Infosys Limited', 'company', 'India'),
('Kotak Mahindra Bank', 'company', 'India'),
('Larsen & Toubro', 'company', 'India'),
('Bajaj Finance', 'company', 'India')
ON CONFLICT (item_name, item_type, market) DO NOTHING;

-- Crypto Companies/Projects (Top 10)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
('Bitcoin', 'company', 'Crypto'),
('Ethereum', 'company', 'Crypto'),
('Binance', 'company', 'Crypto'),
('Coinbase', 'company', 'Crypto'),
('Solana', 'company', 'Crypto'),
('Cardano', 'company', 'Crypto'),
('Polkadot', 'company', 'Crypto'),
('Chainlink', 'company', 'Crypto'),
('Avalanche', 'company', 'Crypto'),
('Polygon', 'company', 'Crypto')
ON CONFLICT (item_name, item_type, market) DO NOTHING;

-- Insert market-specific sectors (5 per market)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
-- US Sectors
('Technology', 'sector', 'US'),
('Healthcare', 'sector', 'US'),
('Financial Services', 'sector', 'US'),
('Consumer Discretionary', 'sector', 'US'),
('Energy', 'sector', 'US'),
-- China Sectors
('Technology', 'sector', 'China'),
('Financial Services', 'sector', 'China'),
('Consumer Discretionary', 'sector', 'China'),
('Industrials', 'sector', 'China'),
('Healthcare', 'sector', 'China'),
-- EU Sectors
('Automotive', 'sector', 'EU'),
('Technology', 'sector', 'EU'),
('Healthcare', 'sector', 'EU'),
('Financial Services', 'sector', 'EU'),
('Energy', 'sector', 'EU'),
-- India Sectors
('Information Technology', 'sector', 'India'),
('Financial Services', 'sector', 'India'),
('Healthcare', 'sector', 'India'),
('Consumer Goods', 'sector', 'India'),
('Energy', 'sector', 'India'),
-- Crypto Sectors
('Cryptocurrency', 'sector', 'Crypto'),
('Blockchain', 'sector', 'Crypto'),
('DeFi', 'sector', 'Crypto'),
('NFTs', 'sector', 'Crypto'),
('Web3', 'sector', 'Crypto')
ON CONFLICT (item_name, item_type) DO NOTHING;

-- Insert market-specific topics (5 per market)
INSERT INTO watchlist_items (item_name, item_type, market) VALUES
-- US Topics
('Artificial Intelligence', 'topic', 'US'),
('Electric Vehicles', 'topic', 'US'),
('Cybersecurity', 'topic', 'US'),
('Cloud Computing', 'topic', 'US'),
('Fintech Innovation', 'topic', 'US'),
-- China Topics
('5G Technology', 'topic', 'China'),
('Electric Vehicles', 'topic', 'China'),
('Artificial Intelligence', 'topic', 'China'),
('E-commerce', 'topic', 'China'),
('Semiconductors', 'topic', 'China'),
-- EU Topics
('Automotive', 'topic', 'EU'),
('Renewable Energy', 'topic', 'EU'),
('Healthcare', 'topic', 'EU'),
('Artificial Intelligence', 'topic', 'EU'),
('Sustainable Investing', 'topic', 'EU'),
-- India Topics
('Fintech Innovation', 'topic', 'India'),
('Digital Payments', 'topic', 'India'),
('Education Technology', 'topic', 'India'),
('E-commerce', 'topic', 'India'),
('Renewable Energy', 'topic', 'India'),
-- Crypto Topics
('Cryptocurrency', 'topic', 'Crypto'),
('Blockchain', 'topic', 'Crypto'),
('DeFi', 'topic', 'Crypto'),
('NFTs', 'topic', 'Crypto'),
('Web3', 'topic', 'Crypto')
ON CONFLICT (item_name, item_type) DO NOTHING;
