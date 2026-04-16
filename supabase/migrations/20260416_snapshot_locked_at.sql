ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS snapshot_locked_at TIMESTAMPTZ;

COMMENT ON COLUMN test_plans.snapshot_locked_at IS
  'Snapshot lock timestamp. Used as baseline for drift detection: TCs with updated_at > snapshot_locked_at are considered drifted.';
