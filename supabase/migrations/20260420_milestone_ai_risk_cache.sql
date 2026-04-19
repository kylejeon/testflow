-- ============================================================
-- Milestone AI Risk Insight 캐시 컬럼
-- 24h TTL, milestone-risk-predictor Edge Function이 read/write
-- 관련 스펙: docs/specs/dev-spec-milestone-ai-risk-insight.md §5
-- ============================================================

ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS ai_risk_cache JSONB NULL;

COMMENT ON COLUMN milestones.ai_risk_cache IS
  'Claude-generated risk analysis result. Structure: { generated_at, stale_after, risk_level, confidence, summary, bullets[], recommendations[], meta }. TTL 24h — considered stale if generated_at < now() - 24h. NULL = no analysis run yet.';

-- generated_at 빠른 비교용 index (milestone 많은 경우 유용)
CREATE INDEX IF NOT EXISTS idx_milestones_ai_risk_generated_at
  ON milestones ((ai_risk_cache->>'generated_at'))
  WHERE ai_risk_cache IS NOT NULL;

-- RLS 정책 변경 없음.
-- 기존 milestones RLS가 JSONB 컬럼에도 그대로 적용됨:
--   SELECT: project_members 소속 유저
--   UPDATE: role IN ('owner', 'admin', 'manager', 'tester')
-- Edge Function은 SUPABASE_SERVICE_ROLE_KEY로 RLS bypass UPDATE.
