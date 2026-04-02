-- ============================================================
-- CI 업로드 실패 Dead Letter Queue (DLQ) + 재시도 추적
-- ============================================================
-- 목적:
--   upload-ci-results에서 개별 테스트 결과 upsert 실패 시
--   데이터 유실 없이 DLQ에 보관 → 재시도 또는 수동 처리 가능
--
-- 흐름:
--   1. 벌크 upsert 시도 (fast path)
--   2. 실패 시 → 개별 upsert로 fallback (partial success)
--   3. 개별 실패 레코드 → failed_uploads_dlq에 INSERT
--   4. API 응답에 partial success 정보 포함
--   5. DLQ 레코드는 재업로드 시 자동 resolved 처리
-- ============================================================

-- ── 1. DLQ 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS failed_uploads_dlq (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 원본 요청 정보
  run_id          uuid        NOT NULL REFERENCES test_runs(id) ON DELETE CASCADE,
  ci_token_id     uuid,                         -- 어떤 CI 토큰에서 발생했는지
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  -- 실패한 레코드 원본 (재시도에 사용)
  raw_record      jsonb       NOT NULL,
  -- 오류 정보
  error_message   text        NOT NULL,
  error_code      text,                         -- DB 오류 코드 (SQLSTATE 등)
  -- 재시도 추적
  retry_count     int         NOT NULL DEFAULT 0,
  max_retries     int         NOT NULL DEFAULT 3,
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'retrying', 'resolved', 'dead')),
  -- 타임스탬프
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_retried_at timestamptz,
  resolved_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dlq_run_id
  ON failed_uploads_dlq (run_id);
CREATE INDEX IF NOT EXISTS idx_dlq_status
  ON failed_uploads_dlq (status)
  WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_dlq_user_created
  ON failed_uploads_dlq (user_id, created_at DESC);

-- ── 2. RLS: 서비스 롤 + 프로젝트 멤버 조회 ───────────────────
ALTER TABLE failed_uploads_dlq ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버는 자신의 런에 속한 DLQ 항목 조회 가능
CREATE POLICY "project_members_can_view_dlq"
  ON failed_uploads_dlq FOR SELECT
  USING (
    run_id IN (
      SELECT tr.id FROM test_runs tr
      JOIN project_members pm ON pm.project_id = tr.project_id
      WHERE pm.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE는 서비스 롤만 (Edge Function에서 처리)
CREATE POLICY "service_role_manage_dlq"
  ON failed_uploads_dlq FOR INSERT
  WITH CHECK (false);

CREATE POLICY "service_role_update_dlq"
  ON failed_uploads_dlq FOR UPDATE
  USING (false);

-- ── 3. DLQ 집계 뷰 (모니터링용) ──────────────────────────────
CREATE OR REPLACE VIEW dlq_summary AS
SELECT
  r.project_id,
  d.run_id,
  d.status,
  COUNT(*)                           AS record_count,
  MIN(d.created_at)                  AS oldest_failure,
  MAX(d.created_at)                  AS latest_failure,
  SUM(d.retry_count)                 AS total_retries
FROM failed_uploads_dlq d
JOIN test_runs r ON r.id = d.run_id
GROUP BY r.project_id, d.run_id, d.status;

COMMENT ON VIEW dlq_summary IS
  'Aggregated DLQ status per run. Visible to project members via RLS on base table.';

-- ── 4. 재시도 상태 전이 함수 ─────────────────────────────────
-- Edge Function이 재시도 성공 시 호출
CREATE OR REPLACE FUNCTION resolve_dlq_record(p_dlq_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE failed_uploads_dlq
  SET status      = 'resolved',
      resolved_at = now()
  WHERE id = p_dlq_id;
END;
$$;

-- max_retries 초과 시 'dead' 상태로 전이
CREATE OR REPLACE FUNCTION mark_dlq_dead_if_exhausted(p_dlq_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE failed_uploads_dlq
  SET status = 'dead'
  WHERE id = p_dlq_id
    AND retry_count >= max_retries
    AND status != 'resolved';
END;
$$;

-- ── 5. 오래된 DLQ 레코드 정리 함수 (30일 경과 resolved/dead) ──
CREATE OR REPLACE FUNCTION cleanup_dlq(p_days int DEFAULT 30)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM failed_uploads_dlq
  WHERE status IN ('resolved', 'dead')
    AND created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- ── 주석 ──────────────────────────────────────────────────────
COMMENT ON TABLE failed_uploads_dlq IS
  'Dead Letter Queue for failed CI upload records. '
  'Populated by upload-ci-results Edge Function on partial failure. '
  'status: pending → retrying → resolved | dead';
