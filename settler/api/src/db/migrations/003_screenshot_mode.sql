-- Add screenshot_url column to arguments table
ALTER TABLE arguments ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Update mode check constraint to include 'screenshot'
ALTER TABLE arguments DROP CONSTRAINT IF EXISTS arguments_mode_check;
ALTER TABLE arguments ADD CONSTRAINT arguments_mode_check
  CHECK (mode IN ('live', 'turn_based', 'screenshot'));
