-- ============================================================
-- Folders 테이블 생성 + test_cases에 tags/folder 컬럼 추가
-- 프론트엔드가 이미 참조 중 → 런타임 오류 해소
-- ============================================================
--
-- 구조:
--   folders: 프로젝트 단위 폴더 관리 (id, project_id, name, icon, color)
--   test_cases.folder: 폴더명을 비정규화 저장 (text, FK 아님)
--   test_cases.tags: 쉼표 구분 태그 문자열 (text, nullable)
--
-- 하위 호환:
--   - ADD COLUMN IF NOT EXISTS 사용 → 이미 존재해도 오류 없음
--   - folders 기존 데이터 없으므로 CREATE TABLE IF NOT EXISTS만으로 충분
-- ============================================================

-- ── 1. folders 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS folders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  icon        text        NOT NULL DEFAULT 'ri-folder-line',  -- Remixicon CSS class
  color       text        NOT NULL DEFAULT 'gray'
              CHECK (color IN (
                'indigo','violet','pink','emerald','amber',
                'cyan','red','teal','orange','blue','gray'
              )),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folders_name_per_project UNIQUE (project_id, name)
);

CREATE INDEX IF NOT EXISTS idx_folders_project_id
  ON folders (project_id);

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION update_folders_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_folders_updated_at ON folders;
CREATE TRIGGER trg_folders_updated_at
  BEFORE UPDATE ON folders
  FOR EACH ROW
  EXECUTE FUNCTION update_folders_updated_at();

-- ── 2. folders RLS ────────────────────────────────────────────
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;

-- 프로젝트 멤버는 해당 프로젝트 폴더 전체 CRUD 가능
CREATE POLICY "project_members_manage_folders"
  ON folders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = folders.project_id
        AND project_members.user_id    = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = folders.project_id
        AND project_members.user_id    = auth.uid()
    )
  );

-- ── 3. test_cases: folder 컬럼 ───────────────────────────────
-- 폴더명을 비정규화 저장 (folders.name과 일치, FK 아님)
-- 프론트엔드가 이름 기반으로 조회하므로 text 타입 유지
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS folder text;

CREATE INDEX IF NOT EXISTS idx_test_cases_folder
  ON test_cases (project_id, folder)
  WHERE folder IS NOT NULL;

-- ── 4. test_cases: tags 컬럼 ─────────────────────────────────
-- 쉼표 구분 태그 문자열 (예: "smoke,regression,auth")
-- 프론트엔드에서 split(',') 방식으로 처리
ALTER TABLE test_cases
  ADD COLUMN IF NOT EXISTS tags text;

CREATE INDEX IF NOT EXISTS idx_test_cases_tags
  ON test_cases USING gin (string_to_array(tags, ','))
  WHERE tags IS NOT NULL;

-- ── 5. 주석 ──────────────────────────────────────────────────
COMMENT ON TABLE folders IS
  'Project-scoped folders for organizing test cases. '
  'test_cases.folder stores the folder name (denormalized text, not FK).';

COMMENT ON COLUMN test_cases.folder IS
  'Denormalized folder name from folders.name. '
  'Null means the test case is in the root (unfiled).';

COMMENT ON COLUMN test_cases.tags IS
  'Comma-separated tag strings (e.g. "smoke,regression,login"). '
  'Frontend splits on comma for display and filtering.';
