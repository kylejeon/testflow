-- AI credit-weighted quota system
-- credits_used 컬럼 추가: 기능별 가중치(1 또는 2) 저장
-- 기존 행은 DEFAULT 1로 처리되어 하위 호환성 유지

ALTER TABLE ai_generation_logs
  ADD COLUMN IF NOT EXISTS credits_used INT NOT NULL DEFAULT 1;

-- mode 체크 제약 확장 — 신규 AI 기능 모드 추가 (Test Plans & Milestones와 함께 구현 예정)
ALTER TABLE ai_generation_logs
  DROP CONSTRAINT IF EXISTS ai_generation_logs_mode_check;

ALTER TABLE ai_generation_logs
  ADD CONSTRAINT ai_generation_logs_mode_check
  CHECK (mode IN (
    -- 기존 기능
    'text', 'session', 'jira', 'run-summary', 'requirement-suggest',
    -- 신규 기능 (예정)
    'plan-assistant', 'risk-predictor', 'burndown-insight',
    'activity-summary', 'issues-analysis', 'tag-heatmap-insight'
  ));

-- credits_used 집계 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_credits
  ON ai_generation_logs (user_id, step, created_at DESC)
  INCLUDE (credits_used);
