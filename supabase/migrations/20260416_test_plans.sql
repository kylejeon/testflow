-- ============================================================
-- Migration: test_plans_and_milestones_p0
-- 설명: Test Plans & Milestones P0 MVP — DB 스키마 변경
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. milestones 테이블 확장
-- ─────────────────────────────────────────────────────────────

-- 1-A. 자기참조 parent_id (이미 parent_milestone_id 존재하므로 스킵 확인 후 추가)
-- Note: parent_milestone_id 는 이미 존재하는 컬럼임. 아래는 새 컬럼들만 추가.

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false;

-- ─────────────────────────────────────────────────────────────
-- 2. test_plans 테이블 신규 생성
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS test_plans (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  milestone_id  UUID        REFERENCES milestones(id) ON DELETE SET NULL,
  name          TEXT        NOT NULL,
  description   TEXT,
  status        TEXT        NOT NULL DEFAULT 'planning'
                CHECK (status IN ('planning', 'active', 'completed', 'cancelled')),
  priority      TEXT        NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  owner_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  target_date   DATE,
  entry_criteria  JSONB     NOT NULL DEFAULT '[]',
  exit_criteria   JSONB     NOT NULL DEFAULT '[]',
  is_locked     BOOLEAN     NOT NULL DEFAULT false,
  snapshot_id   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_test_plans_project_id
  ON test_plans (project_id);

CREATE INDEX IF NOT EXISTS idx_test_plans_milestone_id
  ON test_plans (milestone_id)
  WHERE milestone_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_test_plans_status
  ON test_plans (project_id, status);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION fn_update_test_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_test_plans_updated_at ON test_plans;
CREATE TRIGGER trg_test_plans_updated_at
  BEFORE UPDATE ON test_plans
  FOR EACH ROW
  EXECUTE FUNCTION fn_update_test_plans_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. test_plan_test_cases 조인 테이블
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS test_plan_test_cases (
  test_plan_id  UUID NOT NULL REFERENCES test_plans(id) ON DELETE CASCADE,
  test_case_id  UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (test_plan_id, test_case_id)
);

CREATE INDEX IF NOT EXISTS idx_test_plan_test_cases_plan
  ON test_plan_test_cases (test_plan_id);

CREATE INDEX IF NOT EXISTS idx_test_plan_test_cases_case
  ON test_plan_test_cases (test_case_id);

-- ─────────────────────────────────────────────────────────────
-- 4. test_runs 테이블 수정 — test_plan_id 추가
-- ─────────────────────────────────────────────────────────────

-- test_plan_id: NULLABLE (기존 Run은 모두 NULL → "Ad-hoc" 분류)
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS test_plan_id UUID REFERENCES test_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_test_runs_test_plan_id
  ON test_runs (test_plan_id)
  WHERE test_plan_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. RLS 정책 추가
-- ─────────────────────────────────────────────────────────────

-- test_plans RLS
ALTER TABLE test_plans ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버는 읽기 가능
CREATE POLICY "test_plans_select"
  ON test_plans FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- 프로젝트 멤버는 쓰기 가능
CREATE POLICY "test_plans_insert"
  ON test_plans FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "test_plans_update"
  ON test_plans FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "test_plans_delete"
  ON test_plans FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- test_plan_test_cases RLS (test_plan 통해 권한 상속)
ALTER TABLE test_plan_test_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "test_plan_test_cases_select"
  ON test_plan_test_cases FOR SELECT
  USING (
    test_plan_id IN (
      SELECT id FROM test_plans WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "test_plan_test_cases_insert"
  ON test_plan_test_cases FOR INSERT
  WITH CHECK (
    test_plan_id IN (
      SELECT id FROM test_plans WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "test_plan_test_cases_delete"
  ON test_plan_test_cases FOR DELETE
  USING (
    test_plan_id IN (
      SELECT id FROM test_plans WHERE project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 6. Activity log — test_plan 이벤트 타입 지원
-- ─────────────────────────────────────────────────────────────

-- activity_logs 테이블에 test_plan target_type 지원 확인 (이미 TEXT면 OK)
-- event_type 체크 제약이 있다면 확장, 없으면 스킵
DO $$
BEGIN
  -- target_type CHECK 제약 해제 (없으면 예외 무시)
  BEGIN
    ALTER TABLE activity_logs
      DROP CONSTRAINT IF EXISTS activity_logs_target_type_check;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- ─────────────────────────────────────────────────────────────
-- 7. Rollup helper — Plan 집계 뷰
-- ─────────────────────────────────────────────────────────────

-- test_plan 별 TC 수 / Run 수 / Pass Rate 빠른 집계 뷰
CREATE OR REPLACE VIEW vw_test_plan_stats AS
SELECT
  tp.id                                                           AS plan_id,
  tp.project_id,
  tp.milestone_id,
  tp.name,
  tp.status,
  tp.priority,
  tp.target_date,
  tp.created_at,
  tp.updated_at,
  COUNT(DISTINCT tptc.test_case_id)                              AS tc_count,
  COUNT(DISTINCT tr.id)                                          AS run_count,
  COALESCE(SUM(tr.passed), 0)                                    AS total_passed,
  COALESCE(SUM(tr.failed), 0)                                    AS total_failed,
  COALESCE(SUM(tr.untested), 0)                                  AS total_untested,
  CASE
    WHEN COALESCE(SUM(tr.passed + tr.failed + tr.blocked + tr.retest), 0) > 0
    THEN ROUND(
      SUM(tr.passed)::NUMERIC /
      SUM(tr.passed + tr.failed + tr.blocked + tr.retest) * 100, 1
    )
    ELSE 0
  END                                                             AS pass_rate
FROM test_plans tp
LEFT JOIN test_plan_test_cases tptc ON tptc.test_plan_id = tp.id
LEFT JOIN test_runs tr ON tr.test_plan_id = tp.id
GROUP BY
  tp.id, tp.project_id, tp.milestone_id, tp.name,
  tp.status, tp.priority, tp.target_date, tp.created_at, tp.updated_at;

-- ─────────────────────────────────────────────────────────────
-- 8. 마이그레이션 완료 체크포인트
-- ─────────────────────────────────────────────────────────────

COMMENT ON TABLE test_plans IS 'Test Plans — Milestone 아래 계획 단위. milestone_id NULL = Ad-hoc Plan.';
COMMENT ON TABLE test_plan_test_cases IS 'Plan에 포함된 TC 스냅샷 조인 테이블.';
COMMENT ON COLUMN test_runs.test_plan_id IS 'NULL = Ad-hoc Run (Milestone Direct 또는 독립 실행).';
