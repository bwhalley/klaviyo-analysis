-- Migration: Fix Analyses Trigger
-- Description: Remove incorrect trigger that references non-existent updated_at column
-- Date: 2025-11-20
-- Issue: init.sql created a trigger for analyses.updated_at but the column doesn't exist

-- Drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS update_analyses_updated_at ON analyses;

-- Verify the trigger is gone
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_analyses_updated_at'
  ) THEN
    RAISE EXCEPTION 'Failed to drop update_analyses_updated_at trigger';
  END IF;
  
  RAISE NOTICE 'Trigger fix applied successfully';
END $$;

