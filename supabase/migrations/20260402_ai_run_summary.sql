-- AI Run Summary 기능을 위한 ai_generation_logs 테이블 확장
-- mode 체크 제약을 확장하고 input_data/output_data JSONB 컬럼 추가

-- 1. mode 체크 제약 확장 (text, session, jira, run-summary 허용)
ALTER TABLE ai_generation_logs
  DROP CONSTRAINT IF EXISTS ai_generation_logs_mode_check;

ALTER TABLE ai_generation_logs
  ADD CONSTRAINT ai_generation_logs_mode_check
  CHECK (mode IN ('text', 'session', 'jira', 'run-summary'));

-- 2. input_data / output_data JSONB 컬럼 추가 (캐싱용)
ALTER TABLE ai_generation_logs
  ADD COLUMN IF NOT EXISTS input_data JSONB,
  ADD COLUMN IF NOT EXISTS output_data JSONB;

-- 3. run_id 기반 캐시 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_input_run_id
  ON ai_generation_logs ((input_data->>'run_id'))
  WHERE mode = 'run-summary';
