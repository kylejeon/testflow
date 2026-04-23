-- ============================================================
-- f001 — Environment AI Insights 캐시 컬럼
-- 24h TTL, env-ai-insights Edge Function 이 read/write
-- 관련 스펙: docs/specs/dev-spec-f001-f002-env-ai-insights.md §5
--
-- 적용 방식: CEO 가 Supabase Dashboard SQL Editor 에서 수동 실행.
--            f011 / f018 선례와 동일.
-- ============================================================

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS ai_env_insights_cache JSONB NULL;

ALTER TABLE test_plans
  ADD COLUMN IF NOT EXISTS ai_env_insights_cached_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN test_plans.ai_env_insights_cache IS
  'Claude-generated env×TC coverage insights. Structure: { generated_at, stale_after, headline, critical_env, critical_reason, coverage_gap_tc, coverage_gap_reason, recommendations[], confidence, meta: { model, tokens_used, latency_ms, locale, input_snapshot: { total_tcs, total_envs, overall_pass_rate, executed_count } } }. TTL 24h — stale if generated_at < now() - 24h. NULL = no analysis yet.';

COMMENT ON COLUMN test_plans.ai_env_insights_cached_at IS
  'Denormalized timestamp of ai_env_insights_cache.generated_at for index-only scans. Updated alongside ai_env_insights_cache by env-ai-insights Edge Function (service_role RLS bypass).';

-- 부분 인덱스 — cache 있는 row 에 대한 staleness 체크 빠르게
CREATE INDEX IF NOT EXISTS idx_test_plans_ai_env_insights_cached_at
  ON test_plans (ai_env_insights_cached_at)
  WHERE ai_env_insights_cache IS NOT NULL;

-- RLS 정책 변경 없음. 기존 test_plans RLS 를 그대로 상속:
--   SELECT: project_members 소속 유저
--   UPDATE: role IN ('owner','admin','manager','tester')
-- Edge Function 은 SUPABASE_SERVICE_ROLE_KEY 로 RLS bypass UPDATE.

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Rollback:
--   DROP INDEX IF EXISTS idx_test_plans_ai_env_insights_cached_at;
--   ALTER TABLE test_plans DROP COLUMN IF EXISTS ai_env_insights_cached_at;
--   ALTER TABLE test_plans DROP COLUMN IF EXISTS ai_env_insights_cache;
--   NOTIFY pgrst, 'reload schema';
-- ============================================================
