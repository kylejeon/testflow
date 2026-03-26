-- Add description column to test_runs for run-level notes
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS description TEXT NULL;
