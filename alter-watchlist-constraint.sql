-- Alter script to update watchlist_items unique constraint
-- This updates the existing constraint without losing data

-- IMPORTANT: Run these commands ONE BY ONE in Supabase SQL Editor

-- Step 1: First, find the exact constraint name (run this first)
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'watchlist_items'::regclass
-- AND contype = 'u';  -- 'u' for unique constraints

-- Step 2: Drop the existing unique constraint (replace 'constraint_name' with actual name from Step 1)
-- Example: ALTER TABLE watchlist_items DROP CONSTRAINT watchlist_items_item_name_item_type_key;

-- Quick check - try these common constraint names:
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Try to find and drop the constraint
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'watchlist_items'::regclass
    AND contype = 'u'
    AND conname LIKE '%item_name%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE watchlist_items DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    ELSE
        RAISE NOTICE 'No unique constraint found on item_name columns';
    END IF;
END $$;

-- Step 3: Add the new unique constraint including market
ALTER TABLE watchlist_items ADD CONSTRAINT watchlist_items_unique_name_type_market
UNIQUE (item_name, item_type, market);

-- Step 4: Verify the constraint was added
SELECT
    conname as constraint_name,
    conkey as column_numbers,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'watchlist_items'::regclass
AND contype = 'u';

-- Expected output should show: watchlist_items_unique_name_type_market
