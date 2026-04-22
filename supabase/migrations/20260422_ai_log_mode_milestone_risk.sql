-- ============================================================
-- ai_generation_logs.mode CHECK 제약에 'milestone-risk' 추가
--
-- 배경:
--   milestone-risk-predictor Edge Function 은 mode='milestone-risk' 로
--   INSERT 해 왔지만 20260415_ai_credits_used.sql CHECK 제약에
--   해당 값이 누락되어 모든 insert 가 silent fail 되었다 (error 체크 없는
--   코드 경로). 결과: AI 사용량 카운터가 증가하지 않음.
--
-- 수정:
--   기존 11개 mode 에 'milestone-risk' 1개 추가.
--   다른 제약은 그대로 유지.
-- ============================================================

ALTER TABLE ai_generation_logs
  DROP CONSTRAINT IF EXISTS ai_generation_logs_mode_check;

ALTER TABLE ai_generation_logs
  ADD CONSTRAINT ai_generation_logs_mode_check
  CHECK (mode IN (
    -- 기존
    'text', 'session', 'jira', 'run-summary', 'requirement-suggest',
    'plan-assistant', 'risk-predictor', 'burndown-insight',
    'activity-summary', 'issues-analysis', 'tag-heatmap-insight',
    -- 추가: milestone AI risk insight (20260420_milestone_ai_risk_cache.sql 와 함께 사용)
    'milestone-risk'
  ));
