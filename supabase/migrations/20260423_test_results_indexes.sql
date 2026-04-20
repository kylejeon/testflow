-- Performance indexes for test_results
-- Speeds up queries that filter by run_id, and run_id + status combos used in
-- plan-detail, project-detail, stats, and active-runs pages.

CREATE INDEX IF NOT EXISTS idx_test_results_run_id
  ON test_results(run_id);

CREATE INDEX IF NOT EXISTS idx_test_results_run_status
  ON test_results(run_id, status);
