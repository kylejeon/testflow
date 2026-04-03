-- ============================================================
-- Testably Production DB — Pending SQL
-- Generated: 2026-03-30
-- ============================================================
--
-- 확인 결과: 모든 migration SQL이 프로덕션에 적용 완료되었습니다.
--
-- 적용 완료 항목:
--   [v] profiles 컬럼 추가 (timezone, date_format, time_format, default_project_id, language, auto_detect_tz, avatar_url)
--   [v] jira_settings user_id 컬럼 + UNIQUE + RLS 정책
--   [v] test_runs description 컬럼
--   [v] test_cases lifecycle_status 컬럼
--   [v] test_results resolved_at 컬럼
--   [v] integrations + integration_logs 테이블 + RLS
--   [v] ai_generation_logs 테이블
--   [v] NOTIFY pgrst, 'reload schema'
--
-- 아래는 만약 적용이 안 된 경우를 대비한 안전한 재실행용 SQL입니다.
-- IF NOT EXISTS / IF EXISTS 조건이 포함되어 있어 이미 적용된 DB에서도 안전하게 실행 가능합니다.
-- ============================================================


-- ============================================================
-- 1. jira_settings 백필 (user_id가 NULL인 행이 남아있을 경우)
--    용도: RLS 정책 적용 후 user_id가 NULL이면 해당 행에 접근 불가
--    CEO의 실제 user_id로 교체 필요
-- ============================================================
UPDATE jira_settings
SET user_id = '9bf1810b-1b53-44d4-ba50-f8dfbf39333c'
WHERE user_id IS NULL;


-- ============================================================
-- 2. PostgREST 스키마 캐시 리로드
--    용도: ALTER TABLE 후 Supabase API가 새 컬럼을 인식하도록 갱신
--    이미 실행했더라도 재실행해도 무해합니다
-- ============================================================
NOTIFY pgrst, 'reload schema';


-- ============================================================
-- jira_created_issues 테이블 (2026-04-04)
-- Flaky AI Analyze에서 Jira 이슈 생성 기록 — 새로고침 후에도 "Created" 상태 유지
-- ============================================================

CREATE TABLE IF NOT EXISTS jira_created_issues (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pattern_name  TEXT        NOT NULL,
  jira_issue_key TEXT       NOT NULL,
  created_by    UUID        REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, pattern_name)
);

CREATE INDEX IF NOT EXISTS idx_jira_created_issues_project
  ON jira_created_issues (project_id);

ALTER TABLE jira_created_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can read jira_created_issues"
  ON jira_created_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = jira_created_issues.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "project members can insert jira_created_issues"
  ON jira_created_issues FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = jira_created_issues.project_id
        AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "creator can delete jira_created_issues"
  ON jira_created_issues FOR DELETE
  USING (created_by = auth.uid());

NOTIFY pgrst, 'reload schema';
