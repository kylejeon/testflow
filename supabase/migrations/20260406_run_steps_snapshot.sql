-- Add steps_snapshot to test_runs
-- Stores a {[tc_id]: FlatStep[]} snapshot of all TC steps (with SharedStepRefs expanded)
-- captured at run creation time, so live edits to TCs/Shared Steps don't affect ongoing runs.

ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS steps_snapshot JSONB;
