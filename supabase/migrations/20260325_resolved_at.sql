-- Add resolved_at column to test_results for Avg Response Time calculation
ALTER TABLE test_results ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL;

-- Index for efficient aggregation queries on resolved_at
CREATE INDEX IF NOT EXISTS idx_test_results_resolved_at ON test_results(resolved_at) WHERE resolved_at IS NOT NULL;
