-- Migration script to update otp_verifications table schema
-- Run this in your Supabase SQL Editor

-- First, check if the table exists and what columns it has
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'otp_verifications'
ORDER BY ordinal_position;

-- If the table doesn't exist, create it with the correct schema
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register', 'login')) DEFAULT 'register',
    user_data JSONB NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If the table exists but is missing columns, add them
-- Add purpose column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_verifications' AND column_name = 'purpose') THEN
        ALTER TABLE otp_verifications ADD COLUMN purpose VARCHAR(20) NOT NULL DEFAULT 'register' CHECK (purpose IN ('register', 'login'));
    END IF;
END $$;

-- Add is_verified column if it doesn't exist (rename from is_used if needed)
DO $$ 
BEGIN
    -- Check if is_used exists and is_verified doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_verifications' AND column_name = 'is_used') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_verifications' AND column_name = 'is_verified') THEN
        ALTER TABLE otp_verifications RENAME COLUMN is_used TO is_verified;
    -- If neither exists, add is_verified
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_verifications' AND column_name = 'is_verified') THEN
        ALTER TABLE otp_verifications ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add attempts column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'otp_verifications' AND column_name = 'attempts') THEN
        ALTER TABLE otp_verifications ADD COLUMN attempts INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update any existing records to have default values
UPDATE otp_verifications 
SET purpose = 'register' 
WHERE purpose IS NULL;

UPDATE otp_verifications 
SET is_verified = FALSE 
WHERE is_verified IS NULL;

UPDATE otp_verifications 
SET attempts = 0 
WHERE attempts IS NULL;

-- Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'otp_verifications'
ORDER BY ordinal_position;

-- Show any existing data
SELECT COUNT(*) as total_records FROM otp_verifications;
SELECT * FROM otp_verifications ORDER BY created_at DESC LIMIT 5;