-- ============================================================
-- Migration: criteria_presets + criteria_met persistence
-- 설명: Entry/Exit Criteria 프리셋 템플릿 + 체크 상태 DB 저장
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. test_plans에 체크 상태 컬럼 추가
-- ─────────────────────────────────────────────────────────────

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS entry_criteria_met JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS exit_criteria_met  JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN test_plans.entry_criteria_met IS 'boolean[] — entry criteria별 충족 여부. 인덱스는 entry_criteria와 1:1 매칭.';
COMMENT ON COLUMN test_plans.exit_criteria_met  IS 'boolean[] — exit criteria별 충족 여부. 인덱스는 exit_criteria와 1:1 매칭.';

-- ─────────────────────────────────────────────────────────────
-- 2. criteria_presets 테이블 신규 생성
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS criteria_presets (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL CHECK (type IN ('entry', 'exit')),
  text        TEXT        NOT NULL,
  created_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, type, text)
);

CREATE INDEX IF NOT EXISTS idx_criteria_presets_project
  ON criteria_presets (project_id, type);

-- ─────────────────────────────────────────────────────────────
-- 3. RLS 정책
-- ─────────────────────────────────────────────────────────────

ALTER TABLE criteria_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "criteria_presets_select"
  ON criteria_presets FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "criteria_presets_insert"
  ON criteria_presets FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "criteria_presets_delete"
  ON criteria_presets FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- 4. 기본 프리셋 시드 (프로젝트별 최초 사용 시 참고용)
--    실제 삽입은 앱에서 프로젝트별로 처리
-- ─────────────────────────────────────────────────────────────

COMMENT ON TABLE criteria_presets IS 'Entry/Exit Criteria 프리셋 템플릿. 프로젝트별 재사용 가능한 기준 목록.';
