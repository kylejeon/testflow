-- TC Versioning: Phase 1-3 DB Migration
-- Adds Major/Minor version system, formalizes test_case_history, adds snapshot table

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. test_cases: add version columns
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS version_major INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_minor INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version_status TEXT NOT NULL DEFAULT 'published'
    CHECK (version_status IN ('draft', 'published'));

-- Composite index for version lookups
CREATE INDEX IF NOT EXISTS idx_tc_version ON test_cases(id, version_major, version_minor);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. test_case_history: formalize schema (table may already exist in prod)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_case_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Version info
  version_major INTEGER NOT NULL DEFAULT 1,
  version_minor INTEGER NOT NULL DEFAULT 0,
  version_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (version_status IN ('draft', 'published')),

  -- Change info
  action_type TEXT NOT NULL DEFAULT 'updated'
    CHECK (action_type IN ('created', 'updated', 'published', 'restored', 'partial_restored', 'deprecated', 'status_changed')),
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,

  -- Auto-generated summary: "Updated priority (high→critical), added 1 step"
  change_summary TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to existing history table (safe to run multiple times)
ALTER TABLE test_case_history
  ADD COLUMN IF NOT EXISTS version_major INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_minor INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version_status TEXT NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS change_summary TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tch_test_case ON test_case_history(test_case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tch_version ON test_case_history(test_case_id, version_major, version_minor);
CREATE INDEX IF NOT EXISTS idx_tch_published ON test_case_history(test_case_id, version_status)
  WHERE version_status = 'published';

-- RLS
ALTER TABLE test_case_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view history for their project TCs" ON test_case_history;
CREATE POLICY "Users can view history for their project TCs"
  ON test_case_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM test_cases tc
      JOIN project_members pm ON pm.project_id = tc.project_id
      WHERE tc.id = test_case_history.test_case_id
        AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert history for their project TCs" ON test_case_history;
CREATE POLICY "Users can insert history for their project TCs"
  ON test_case_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. test_case_version_snapshots: store full TC state at each Published version
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS test_case_version_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_case_id UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  version_major INTEGER NOT NULL,
  version_minor INTEGER NOT NULL,

  -- Full TC snapshot (preserves exact state at publish time)
  snapshot JSONB NOT NULL,
  -- {title, description, precondition, priority, steps, expected_result,
  --  folder, tags, assignee, is_automated, lifecycle_status}

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tcvs_unique
  ON test_case_version_snapshots(test_case_id, version_major, version_minor);

CREATE INDEX IF NOT EXISTS idx_tcvs_tc ON test_case_version_snapshots(test_case_id);

-- RLS
ALTER TABLE test_case_version_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view snapshots for their project TCs" ON test_case_version_snapshots;
CREATE POLICY "Users can view snapshots for their project TCs"
  ON test_case_version_snapshots FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM test_cases tc
      JOIN project_members pm ON pm.project_id = tc.project_id
      WHERE tc.id = test_case_version_snapshots.test_case_id
        AND pm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert snapshots for their project TCs" ON test_case_version_snapshots;
CREATE POLICY "Users can insert snapshots for their project TCs"
  ON test_case_version_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM test_cases tc
      JOIN project_members pm ON pm.project_id = tc.project_id
      WHERE tc.id = test_case_version_snapshots.test_case_id
        AND pm.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. test_results: add TC version reference (for Run↔Version snapshot linking)
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS tc_version_major INTEGER,
  ADD COLUMN IF NOT EXISTS tc_version_minor INTEGER,
  ADD COLUMN IF NOT EXISTS tc_snapshot_id UUID REFERENCES test_case_version_snapshots(id);

CREATE INDEX IF NOT EXISTS idx_tr_tc_version ON test_results(test_case_id, tc_version_major, tc_version_minor);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Back-fill: set version_major=1, version_minor=0, version_status='published'
--    for all existing test cases (they start at v1.0 Published)
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE test_cases
SET
  version_major = 1,
  version_minor = 0,
  version_status = 'published'
WHERE version_major = 1 AND version_minor = 0;

-- Back-fill history records: assign version_major=1, version_minor=0 to existing entries
UPDATE test_case_history
SET
  version_major = 1,
  version_minor = 0,
  version_status = CASE WHEN action_type = 'created' THEN 'published' ELSE 'draft' END
WHERE version_major = 1 AND version_minor = 0 AND action_type IN ('created', 'updated', 'restored', 'status_changed');
