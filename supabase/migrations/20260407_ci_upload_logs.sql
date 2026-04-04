-- Migration: 20260407_ci_upload_logs.sql
-- Purpose: Upload history table for CI/CD integrations (SDK source tracking + recent uploads UI)

CREATE TABLE ci_upload_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ci_token_id      UUID        NOT NULL REFERENCES ci_tokens(id),
  ci_token_name    TEXT        NOT NULL,              -- 조인 없이 표시용
  user_id          UUID        NOT NULL REFERENCES auth.users(id),
  run_id           UUID        NOT NULL REFERENCES test_runs(id),
  run_name         TEXT,                              -- 조인 없이 표시용
  project_id       UUID        NOT NULL REFERENCES projects(id),

  total_count      INTEGER     NOT NULL DEFAULT 0,   -- 전송된 총 결과 수
  uploaded_count   INTEGER     NOT NULL DEFAULT 0,
  failed_count     INTEGER     NOT NULL DEFAULT 0,
  partial_failure  BOOLEAN     DEFAULT false,

  format           TEXT        CHECK (format IN ('json', 'junit')),
  source           TEXT        CHECK (source IN ('playwright', 'cypress', 'jest', 'curl', 'python', 'unknown')),
  sdk_version      TEXT,                              -- '@testably/playwright-reporter@1.0.0'
  user_agent       TEXT,                              -- HTTP User-Agent

  stats            JSONB,                             -- { passed, failed, blocked, untested }
  error_message    TEXT,                              -- 실패 시 에러 메시지
  status           TEXT        CHECK (status IN ('success', 'partial', 'failed')) DEFAULT 'success',

  duration_ms      INTEGER,                           -- 전체 처리 시간
  dry_run          BOOLEAN     DEFAULT false,         -- Connection Test 요청은 기록 제외
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- Settings 페이지 최근 업로드 목록 조회용 (user별 최신순)
CREATE INDEX idx_ci_upload_logs_user_recent
  ON ci_upload_logs (user_id, created_at DESC);

-- 프로젝트별 업로드 통계 조회용
CREATE INDEX idx_ci_upload_logs_project
  ON ci_upload_logs (project_id, created_at DESC);

-- RLS
ALTER TABLE ci_upload_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upload logs"
  ON ci_upload_logs FOR SELECT
  USING (auth.uid() = user_id);

-- service role은 RLS bypass (Edge Function에서 insert)
