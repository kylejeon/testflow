-- consent_logs: 개인정보보호법 입증책임 대응용 동의 이력 영구 저장
CREATE TABLE IF NOT EXISTS consent_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,                         -- 가입 당시 이메일 (user_id가 null이어도 추적)
  consent_type TEXT NOT NULL,         -- 'signup' | 'cookie' | 'reconsent' 등
  policy_version TEXT NOT NULL,       -- 약관 버전 식별자 (예: 'tos-2026-04-10')
  consents JSONB NOT NULL,            -- {tos:true, privacy:true, marketing:false, ...}
  ip_address INET,
  user_agent TEXT,
  source TEXT,                        -- 'web' | 'mobile' 등
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_consent_logs_user_id ON consent_logs(user_id);
CREATE INDEX idx_consent_logs_email ON consent_logs(email);
CREATE INDEX idx_consent_logs_created_at ON consent_logs(created_at DESC);

ALTER TABLE consent_logs ENABLE ROW LEVEL SECURITY;

-- INSERT: anon/authenticated 모두 가능 (회원가입 시점에는 anon)
CREATE POLICY "consent_logs_insert" ON consent_logs FOR INSERT WITH CHECK (true);

-- SELECT: 본인 또는 service_role만
CREATE POLICY "consent_logs_select_own" ON consent_logs FOR SELECT
  USING (auth.uid() = user_id);
