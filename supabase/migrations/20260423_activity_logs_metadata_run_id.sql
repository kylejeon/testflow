-- ============================================================
-- activity_logs.metadata->>run_id 함수 인덱스
--
-- 배경: plan-detail/page.tsx의 testResultLogsPromise가
--   .in('metadata->>run_id', runIds) 로 JSONB 추출 컬럼 필터.
--   B-tree 인덱스가 없어 대형 테넌트에서 project_id 범위 seq scan 발생.
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_metadata_run_id
  ON activity_logs ((metadata->>'run_id'))
  WHERE metadata ? 'run_id';

COMMENT ON INDEX idx_activity_logs_metadata_run_id IS
  'test_result 타입 activity_logs 조회 최적화 (plan-detail testResultLogsPromise). '
  'partial index — metadata에 run_id 키 있는 행만 대상.';
