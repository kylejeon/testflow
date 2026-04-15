-- ============================================================
-- Migration: test_plans_start_end_dates
-- 설명: test_plans 테이블에 start_date, end_date 컬럼 추가
--      (target_date는 이미 존재, start/end 명시적 기간 설정용)
-- ============================================================

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

COMMENT ON COLUMN test_plans.start_date IS 'Plan 실행 시작 예정일 (optional)';
COMMENT ON COLUMN test_plans.end_date   IS 'Plan 실행 완료 예정일 (optional)';
