-- Add due_date column to charts table if it doesn't exist
ALTER TABLE charts ADD COLUMN IF NOT EXISTS due_date DATE;
