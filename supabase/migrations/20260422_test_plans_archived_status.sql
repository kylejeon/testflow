-- ============================================================
-- test_plans.status CHECK 제약에 'archived' 값 추가
--
-- 배경: Plan Detail Settings의 Danger Zone "Archive plan" 기능에서
-- 플랜을 아카이브(읽기 전용)로 표시할 전용 상태가 필요. 기존
-- 'cancelled' 재활용 대신 의미 분리.
-- ============================================================

ALTER TABLE test_plans DROP CONSTRAINT IF EXISTS test_plans_status_check;

ALTER TABLE test_plans ADD CONSTRAINT test_plans_status_check
  CHECK (status IN ('planning', 'active', 'completed', 'cancelled', 'archived'));

COMMENT ON COLUMN test_plans.status IS
  'planning | active | completed | cancelled | archived. '
  'archived는 Danger Zone에서 명시적으로 설정 — 읽기 전용 상태로 취급.';
