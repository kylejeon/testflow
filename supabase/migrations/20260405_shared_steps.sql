-- Shared/Reusable Test Steps — DB Migration
-- Tables: shared_steps, shared_step_versions, shared_step_usage
-- RLS policies, indexes, triggers, tier gating helper

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. shared_steps — 공용 스텝 마스터 테이블
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_steps (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 식별자
  custom_id   TEXT NOT NULL DEFAULT '',  -- "SS-001" (트리거로 자동 생성)
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,                      -- "Authentication", "Payment" 등 (선택)

  -- 스텝 데이터
  steps JSONB NOT NULL DEFAULT '[]',     -- [{ "step": "...", "expectedResult": "..." }]

  -- 버전 (수정마다 +1)
  version INTEGER NOT NULL DEFAULT 1,

  -- 사용 통계 캐시
  usage_count INTEGER NOT NULL DEFAULT 0,

  -- 메타
  created_by UUID NOT NULL REFERENCES auth.users(id),
  updated_by UUID             REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 프로젝트 내 custom_id 고유성
CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_steps_custom_id
  ON shared_steps (project_id, custom_id);

-- 프로젝트별 목록 + 검색 최적화
CREATE INDEX IF NOT EXISTS idx_shared_steps_project
  ON shared_steps (project_id, category, name);

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. custom_id 자동 생성 트리거 ("SS-001", "SS-002" ...)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_shared_step_custom_id()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  -- custom_id가 이미 지정된 경우 그대로 사용
  IF NEW.custom_id IS NOT NULL AND NEW.custom_id != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(custom_id FROM 4) AS INTEGER)), 0
  ) INTO max_num
  FROM shared_steps
  WHERE project_id = NEW.project_id
    AND custom_id ~ '^SS-\d+$';

  NEW.custom_id := 'SS-' || LPAD((max_num + 1)::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shared_step_custom_id
  BEFORE INSERT ON shared_steps
  FOR EACH ROW
  EXECUTE FUNCTION generate_shared_step_custom_id();

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. updated_at 자동 갱신 트리거
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_shared_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shared_steps_updated_at
  BEFORE UPDATE ON shared_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_steps_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. shared_step_versions — 버전 이력 (Enterprise 감사 추적)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_step_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_step_id UUID NOT NULL REFERENCES shared_steps(id) ON DELETE CASCADE,

  version        INTEGER NOT NULL,
  steps          JSONB   NOT NULL,   -- 해당 버전의 steps 스냅샷
  name           TEXT    NOT NULL,   -- 해당 버전의 이름

  -- 변경 정보
  changed_by     UUID    NOT NULL REFERENCES auth.users(id),
  change_summary TEXT,               -- "Added step 3, modified step 2"
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (shared_step_id, version)
);

CREATE INDEX IF NOT EXISTS idx_ssv_shared_step
  ON shared_step_versions (shared_step_id, version DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. 히스토리 자동 기록 트리거 (shared_steps UPDATE 시 이전 버전 스냅샷 저장)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_shared_step_version()
RETURNS TRIGGER AS $$
BEGIN
  -- steps 또는 name이 변경된 경우에만 버전 스냅샷 저장
  IF (OLD.steps IS DISTINCT FROM NEW.steps) OR (OLD.name IS DISTINCT FROM NEW.name) THEN
    -- 이전 버전 스냅샷 저장
    INSERT INTO shared_step_versions (shared_step_id, version, steps, name, changed_by, change_summary)
    VALUES (OLD.id, OLD.version, OLD.steps, OLD.name, NEW.updated_by, NULL);

    -- 버전 번호 증가
    NEW.version := OLD.version + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_shared_step_version
  BEFORE UPDATE ON shared_steps
  FOR EACH ROW
  EXECUTE FUNCTION record_shared_step_version();

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. shared_step_usage — 사용 추적 테이블 (TC → Shared Step 역참조 캐시)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shared_step_usage (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_step_id UUID    NOT NULL REFERENCES shared_steps(id) ON DELETE CASCADE,
  test_case_id   UUID    NOT NULL REFERENCES test_cases(id)   ON DELETE CASCADE,
  position       INTEGER NOT NULL,  -- TC steps 배열 내 위치 (0-based)
  linked_version INTEGER NOT NULL,  -- 연결 시점의 Shared Step 버전

  linked_by UUID NOT NULL REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (shared_step_id, test_case_id, position)
);

CREATE INDEX IF NOT EXISTS idx_ssu_test_case
  ON shared_step_usage (test_case_id);

CREATE INDEX IF NOT EXISTS idx_ssu_shared_step
  ON shared_step_usage (shared_step_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. usage_count 캐시 갱신 트리거 (shared_step_usage INSERT/DELETE 시)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_shared_step_usage_count()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  target_id := COALESCE(NEW.shared_step_id, OLD.shared_step_id);

  UPDATE shared_steps
  SET usage_count = (
    SELECT COUNT(DISTINCT test_case_id)
    FROM shared_step_usage
    WHERE shared_step_id = target_id
  )
  WHERE id = target_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ssu_count_update
  AFTER INSERT OR DELETE ON shared_step_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_shared_step_usage_count();

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. RLS 정책
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE shared_steps         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_step_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_step_usage    ENABLE ROW LEVEL SECURITY;

-- shared_steps: 프로젝트 멤버 또는 프로젝트 owner
CREATE POLICY "Project members can manage shared steps"
  ON shared_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = shared_steps.project_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = shared_steps.project_id
        AND p.owner_id = auth.uid()
    )
  );

-- shared_step_versions: 조회 전용 (INSERT는 트리거에서만)
CREATE POLICY "Project members can view shared step versions"
  ON shared_step_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM shared_steps ss
      JOIN project_members pm ON pm.project_id = ss.project_id
      WHERE ss.id = shared_step_versions.shared_step_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM shared_steps ss
      JOIN projects p ON p.id = ss.project_id
      WHERE ss.id = shared_step_versions.shared_step_id
        AND p.owner_id = auth.uid()
    )
  );

-- shared_step_usage: 프로젝트 멤버 또는 owner
CREATE POLICY "Project members can manage shared step usage"
  ON shared_step_usage FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM test_cases tc
      JOIN project_members pm ON pm.project_id = tc.project_id
      WHERE tc.id = shared_step_usage.test_case_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM test_cases tc
      JOIN projects p ON p.id = tc.project_id
      WHERE tc.id = shared_step_usage.test_case_id
        AND p.owner_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Tier Gating 헬퍼 함수
--    Starter+: Shared Steps 사용 가능 (tier >= 2)
--    Enterprise: 버전 히스토리 전체 열람 (tier = 4)
-- ──────────────────────────────────────────────────────────────────────────────

-- 프로젝트의 Shared Steps 수 반환 (Starter limit 확인용)
CREATE OR REPLACE FUNCTION count_shared_steps(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM shared_steps
  WHERE project_id = p_project_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 특정 Shared Step을 사용하는 TC 수 반환
CREATE OR REPLACE FUNCTION count_shared_step_usages(p_shared_step_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT test_case_id)::INTEGER
  FROM shared_step_usage
  WHERE shared_step_id = p_shared_step_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
