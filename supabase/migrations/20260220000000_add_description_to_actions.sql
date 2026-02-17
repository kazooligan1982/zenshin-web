-- Add description column to actions table for storing action details/notes
ALTER TABLE actions ADD COLUMN IF NOT EXISTS description TEXT;
