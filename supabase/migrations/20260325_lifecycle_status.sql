-- Add lifecycle_status column to test_cases table
-- Draft = work in progress, Active = ready for runs, Deprecated = retired
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active'
  CHECK (lifecycle_status IN ('draft', 'active', 'deprecated'));

-- Index for fast filter queries by project + lifecycle status
CREATE INDEX IF NOT EXISTS idx_tc_lifecycle ON test_cases(project_id, lifecycle_status);
