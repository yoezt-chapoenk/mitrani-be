-- Migration script to add business_name column to users table
-- Run this script in your Supabase SQL editor or database client

-- Add business_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN users.business_name IS 'Business name for retailer users, optional for farmers';

-- Verify the column was added
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name = 'business_name';