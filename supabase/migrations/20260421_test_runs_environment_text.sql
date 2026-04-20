-- ============================================================
-- Fix: test_runs.environment (legacy freeform text) 컬럼 추가
--
-- 배경:
--   Dev Spec은 "test_runs.environment TEXT 컬럼 유지(legacy fallback)"를 전제로
--   작성됐으나 해당 컬럼이 베이스 스키마(Studio GUI로 생성)에 존재하지 않음.
--   프론트 INSERT/UPDATE가 environment 필드를 쓰면서 PostgREST 에러 발생.
--
-- 조치:
--   ADD COLUMN IF NOT EXISTS 로 자립. 구조화 필드는 environment_id, 표시용 텍스트는
--   environment. 둘 다 쓰는 dual-write 패턴 유지.
-- ============================================================

ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS environment TEXT NULL;

COMMENT ON COLUMN test_runs.environment IS
  'Display text (freeform) for environment. Written alongside environment_id for backward compat and UI display without join.';

NOTIFY pgrst, 'reload schema';
