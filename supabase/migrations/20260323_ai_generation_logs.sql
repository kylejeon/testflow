-- AI 생성 로그 테이블 (사용량 추적 + 피드백)
CREATE TABLE IF NOT EXISTS ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 생성 모드
  mode TEXT NOT NULL CHECK (mode IN ('text', 'session')),

  -- 입력
  input_text TEXT,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- 생성 결과 통계
  titles_generated INT DEFAULT 0,
  titles_selected INT DEFAULT 0,
  cases_saved INT DEFAULT 0,

  -- 모델 정보
  model_used TEXT DEFAULT 'claude-sonnet-4-20250514',
  tokens_used INT DEFAULT 0,
  latency_ms INT DEFAULT 0,

  -- 스텝 (step1=titles, step2=details)
  step INT DEFAULT 1 CHECK (step IN (1, 2)),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_user_id ON ai_generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_project_id ON ai_generation_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_generation_logs_created_at ON ai_generation_logs(created_at DESC);

-- RLS 활성화
ALTER TABLE ai_generation_logs ENABLE ROW LEVEL SECURITY;

-- 본인 로그만 조회/삽입 가능
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_generation_logs' AND policyname = 'Users can view own ai generation logs'
  ) THEN
    CREATE POLICY "Users can view own ai generation logs"
      ON ai_generation_logs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_generation_logs' AND policyname = 'Users can insert own ai generation logs'
  ) THEN
    CREATE POLICY "Users can insert own ai generation logs"
      ON ai_generation_logs FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
