-- Requirements Traceability Matrix (RTM) — DB Migration
-- Tables: requirements, requirement_tc_links, requirement_history
-- Materialized View: requirement_coverage_summary
-- RLS policies, indexes, triggers

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. requirements — 요구사항 마스터 테이블
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 식별자
  custom_id TEXT NOT NULL DEFAULT '',       -- "REQ-001" (트리거로 자동 생성)
  title TEXT NOT NULL,
  description TEXT,

  -- 분류
  priority TEXT DEFAULT 'P3'
    CHECK (priority IN ('P1', 'P2', 'P3', 'P4')),
  category TEXT,                            -- 자유 입력 (Authentication, Payment 등)
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'deprecated')),

  -- 계층 구조 (1-depth: parent → children)
  parent_id UUID REFERENCES requirements(id) ON DELETE SET NULL,

  -- 외부 소스 연동
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'jira', 'csv')),
  external_id TEXT,                         -- Jira Issue Key: "PROJ-101"
  external_url TEXT,                        -- Jira Issue 브라우저 URL
  external_status TEXT,                     -- Jira 상태: "In Progress"
  external_type TEXT,                       -- Jira Issue Type: "Story", "Epic"
  last_synced_at TIMESTAMPTZ,

  -- 메타
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 프로젝트 내 custom_id 고유성 (트리거가 채운 후 체크)
CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_custom_id
  ON requirements (project_id, custom_id);

-- 프로젝트별 목록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_requirements_project
  ON requirements (project_id, status, priority);

-- Jira external_id로 빠른 조회 (source='jira' 행만)
CREATE INDEX IF NOT EXISTS idx_requirements_external
  ON requirements (project_id, source, external_id)
  WHERE source = 'jira';

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_requirements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requirements_updated_at
  BEFORE UPDATE ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_requirements_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. custom_id 자동 생성 트리거 ("REQ-001", "REQ-002" ...)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_requirement_custom_id()
RETURNS TRIGGER AS $$
DECLARE
  max_num INTEGER;
BEGIN
  -- custom_id가 이미 지정된 경우(CSV import 등) 그대로 사용
  IF NEW.custom_id IS NOT NULL AND NEW.custom_id != '' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(custom_id FROM 5) AS INTEGER)), 0
  ) INTO max_num
  FROM requirements
  WHERE project_id = NEW.project_id
    AND custom_id ~ '^REQ-\d+$';

  NEW.custom_id := 'REQ-' || LPAD((max_num + 1)::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_requirement_custom_id
  BEFORE INSERT ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION generate_requirement_custom_id();

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. requirement_tc_links — Requirement ↔ TC Many:Many 연결
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_tc_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  test_case_id   UUID NOT NULL REFERENCES test_cases(id)  ON DELETE CASCADE,

  linked_by UUID NOT NULL REFERENCES auth.users(id),
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,                                -- 연결 사유 (선택)

  UNIQUE (requirement_id, test_case_id)
);

-- TC → 연결된 Requirement 역방향 조회
CREATE INDEX IF NOT EXISTS idx_rtc_links_tc
  ON requirement_tc_links (test_case_id);

-- Requirement → 연결된 TC 조회
CREATE INDEX IF NOT EXISTS idx_rtc_links_req
  ON requirement_tc_links (requirement_id);

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. requirement_history — 변경 이력 (감사 추적, Enterprise)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS requirement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id),

  action_type TEXT NOT NULL CHECK (action_type IN (
    'created', 'updated', 'deprecated', 'reactivated',
    'tc_linked', 'tc_unlinked',
    'jira_synced', 'imported'
  )),

  field_name     TEXT,     -- 변경된 필드명 (action_type='updated' 시)
  old_value      TEXT,
  new_value      TEXT,
  change_summary TEXT,     -- 사람이 읽기 쉬운 변경 요약

  -- TC 연결/해제 이벤트 참조
  related_tc_id UUID REFERENCES test_cases(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_req_history_req
  ON requirement_history (requirement_id, created_at DESC);

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. RLS 정책
-- ──────────────────────────────────────────────────────────────────────────────
ALTER TABLE requirements          ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_tc_links  ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_history   ENABLE ROW LEVEL SECURITY;

-- requirements: 프로젝트 멤버 또는 프로젝트 생성자
CREATE POLICY "Project members can manage requirements"
  ON requirements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = requirements.project_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = requirements.project_id
        AND p.created_by = auth.uid()
    )
  );

-- requirement_tc_links: 요구사항이 속한 프로젝트의 멤버
CREATE POLICY "Project members can manage requirement-tc links"
  ON requirement_tc_links FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM requirements r
      JOIN project_members pm ON pm.project_id = r.project_id
      WHERE r.id = requirement_tc_links.requirement_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM requirements r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = requirement_tc_links.requirement_id
        AND p.created_by = auth.uid()
    )
  );

-- requirement_history: 조회 전용 (INSERT는 서버 사이드에서만)
CREATE POLICY "Project members can view requirement history"
  ON requirement_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM requirements r
      JOIN project_members pm ON pm.project_id = r.project_id
      WHERE r.id = requirement_history.requirement_id
        AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM requirements r
      JOIN projects p ON p.id = r.project_id
      WHERE r.id = requirement_history.requirement_id
        AND p.created_by = auth.uid()
    )
  );

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. requirement_coverage_summary — Materialized View
--    각 Requirement의 TC 연결 수 + 실행/통과 집계
--    test_results는 TC당 최신 결과만 사용 (DISTINCT ON)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS requirement_coverage_summary AS
SELECT
  r.id              AS requirement_id,
  r.project_id,
  r.custom_id,
  r.title,
  r.priority,
  r.status,
  r.source,
  r.external_id,

  COUNT(DISTINCT rtl.test_case_id)                                             AS total_linked_tcs,
  COUNT(DISTINCT CASE WHEN tr.status IS NOT NULL THEN rtl.test_case_id END)    AS executed_tcs,
  COUNT(DISTINCT CASE WHEN tr.status = 'passed'  THEN rtl.test_case_id END)    AS passed_tcs,
  COUNT(DISTINCT CASE WHEN tr.status = 'failed'  THEN rtl.test_case_id END)    AS failed_tcs,
  COUNT(DISTINCT CASE WHEN tr.status = 'blocked' THEN rtl.test_case_id END)    AS blocked_tcs,

  CASE
    WHEN COUNT(DISTINCT rtl.test_case_id) = 0 THEN 0
    ELSE ROUND(
      COUNT(DISTINCT CASE WHEN tr.status IS NOT NULL THEN rtl.test_case_id END)::NUMERIC
      / COUNT(DISTINCT rtl.test_case_id) * 100
    , 1)
  END AS coverage_pct,

  -- Gap 분류
  CASE
    WHEN COUNT(DISTINCT rtl.test_case_id) = 0 THEN 'no_tc'        -- Critical: TC 없음
    WHEN COUNT(DISTINCT CASE WHEN tr.status IS NOT NULL THEN rtl.test_case_id END) = 0 THEN 'no_exec'  -- Warning: TC 있지만 미실행
    WHEN COUNT(DISTINCT CASE WHEN tr.status IN ('failed','blocked') THEN rtl.test_case_id END) > 0 THEN 'fail'  -- High: 실패/차단 있음
    ELSE 'covered'
  END AS gap_type

FROM requirements r
LEFT JOIN requirement_tc_links rtl ON rtl.requirement_id = r.id
LEFT JOIN (
  -- TC당 최신 test_result만 (가장 최근 Run 기준)
  SELECT DISTINCT ON (test_case_id)
    test_case_id,
    status
  FROM test_results
  ORDER BY test_case_id, created_at DESC
) tr ON tr.test_case_id = rtl.test_case_id
WHERE r.status = 'active'
GROUP BY r.id, r.project_id, r.custom_id, r.title, r.priority, r.status, r.source, r.external_id;

-- 고유 인덱스 (CONCURRENTLY 새로고침용)
CREATE UNIQUE INDEX IF NOT EXISTS idx_req_coverage_summary_id
  ON requirement_coverage_summary (requirement_id);

-- 프로젝트별 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_req_coverage_summary_project
  ON requirement_coverage_summary (project_id);

-- Gap 유형별 필터 인덱스
CREATE INDEX IF NOT EXISTS idx_req_coverage_summary_gap
  ON requirement_coverage_summary (project_id, gap_type);

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. MV 새로고침 함수 (pg_cron 또는 수동 호출용)
--    test_results / requirement_tc_links 변경 후 커버리지 재계산
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_requirement_coverage()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY requirement_coverage_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- pg_cron 스케줄 등록 (Supabase Dashboard에서 활성화된 경우)
-- SELECT cron.schedule('refresh-rtm-coverage', '* * * * *', 'SELECT refresh_requirement_coverage()');

-- ──────────────────────────────────────────────────────────────────────────────
-- 8. 히스토리 자동 기록 트리거 (requirements INSERT/UPDATE)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION record_requirement_history()
RETURNS TRIGGER AS $$
DECLARE
  fields TEXT[] := ARRAY['title','description','priority','category','status','parent_id','external_id','external_status'];
  f TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO requirement_history (requirement_id, user_id, action_type, change_summary)
    VALUES (NEW.id, NEW.created_by, 'created', 'Requirement created: ' || NEW.custom_id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOREACH f IN ARRAY fields LOOP
      IF (row_to_json(OLD)->>f) IS DISTINCT FROM (row_to_json(NEW)->>f) THEN
        INSERT INTO requirement_history (
          requirement_id, user_id, action_type,
          field_name, old_value, new_value, change_summary
        ) VALUES (
          NEW.id, NEW.created_by, 'updated',
          f,
          row_to_json(OLD)->>f,
          row_to_json(NEW)->>f,
          f || ' changed from "' || COALESCE(row_to_json(OLD)->>f,'null') || '" to "' || COALESCE(row_to_json(NEW)->>f,'null') || '"'
        );
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_requirement_history
  AFTER INSERT OR UPDATE ON requirements
  FOR EACH ROW
  EXECUTE FUNCTION record_requirement_history();

-- ──────────────────────────────────────────────────────────────────────────────
-- 9. Tier Gating 헬퍼 함수
--    Starter: 50개 limit 체크용 (클라이언트/Edge Function에서 호출)
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION count_active_requirements(p_project_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM requirements
  WHERE project_id = p_project_id
    AND status != 'deprecated';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
