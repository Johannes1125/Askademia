-- Migration: Add rating, feedback, and rated_at columns to conversations table
-- Run this in Supabase SQL Editor to add rating functionality

-- Add rating column (1-5 stars)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add feedback column (optional text feedback)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS feedback TEXT CHECK (LENGTH(feedback) <= 1000);

-- Add rated_at timestamp (when the conversation was rated)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

-- Create index for faster queries on rated conversations
CREATE INDEX IF NOT EXISTS idx_conversations_rating ON conversations(rating) WHERE rating IS NOT NULL;

-- Verify the columns were added (optional - you can run this to check)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'conversations' 
-- AND column_name IN ('rating', 'feedback', 'rated_at');

