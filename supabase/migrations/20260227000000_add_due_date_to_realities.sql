-- Add due_date column to realities table for comparison mode (Vision/Reality deadline)
ALTER TABLE realities ADD COLUMN IF NOT EXISTS due_date DATE;
