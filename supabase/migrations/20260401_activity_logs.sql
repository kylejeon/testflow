-- ============================================
-- activity_logs 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  is_highlighted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_created
  ON activity_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_actor
  ON activity_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_category
  ON activity_logs(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type
  ON activity_logs(event_type);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their projects"
  ON activity_logs FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);

-- ============================================
-- TRIGGER 1: test_results INSERT → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_test_result()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_tc_title TEXT;
  v_tc_priority TEXT;
  v_tc_custom_id TEXT;
  v_run_name TEXT;
  v_author_user_id UUID;
  v_is_highlighted BOOLEAN := false;
BEGIN
  -- test_case 정보 조회
  SELECT tc.title, tc.priority, tc.custom_id, tc.project_id
  INTO v_tc_title, v_tc_priority, v_tc_custom_id, v_project_id
  FROM test_cases tc
  WHERE tc.id = NEW.test_case_id;

  -- run 이름 조회
  SELECT name INTO v_run_name
  FROM test_runs WHERE id = NEW.run_id;

  -- author를 user_id로 매핑
  SELECT p.id INTO v_author_user_id
  FROM profiles p
  WHERE p.full_name = NEW.author
  LIMIT 1;

  -- Critical TC 실패 시 하이라이트
  IF v_tc_priority = 'critical' AND NEW.status = 'failed' THEN
    v_is_highlighted := true;
  END IF;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata, is_highlighted
  ) VALUES (
    v_project_id,
    v_author_user_id,
    'test_result_' || NEW.status,
    'test_execution',
    'test_result',
    NEW.id,
    jsonb_build_object(
      'tc_title', v_tc_title,
      'tc_custom_id', COALESCE(v_tc_custom_id, ''),
      'status', NEW.status,
      'run_name', v_run_name,
      'run_id', NEW.run_id,
      'test_case_id', NEW.test_case_id,
      'priority', v_tc_priority
    ),
    v_is_highlighted
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_test_result ON test_results;
CREATE TRIGGER trg_log_test_result
  AFTER INSERT ON test_results
  FOR EACH ROW EXECUTE FUNCTION fn_log_test_result();

-- ============================================
-- TRIGGER 2: test_cases INSERT → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_test_case_created()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  SELECT p.id INTO v_actor_id
  FROM profiles p WHERE p.full_name = NEW.created_by LIMIT 1;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata
  ) VALUES (
    NEW.project_id,
    v_actor_id,
    'tc_created',
    'tc_management',
    'test_case',
    NEW.id,
    jsonb_build_object(
      'tc_title', NEW.title,
      'priority', NEW.priority,
      'folder', COALESCE(NEW.folder, ''),
      'lifecycle_status', NEW.lifecycle_status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_test_case_created ON test_cases;
CREATE TRIGGER trg_log_test_case_created
  AFTER INSERT ON test_cases
  FOR EACH ROW EXECUTE FUNCTION fn_log_test_case_created();

-- ============================================
-- TRIGGER 3: test_runs status 변경 → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_run_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'in_progress' AND (OLD.status = 'new' OR OLD.status = 'pending') THEN
      v_event_type := 'run_started';
    ELSIF NEW.status = 'completed' THEN
      v_event_type := 'run_completed';
    ELSE
      RETURN NEW;
    END IF;

    INSERT INTO activity_logs (
      project_id, actor_id, event_type, event_category,
      target_type, target_id, metadata
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      v_event_type,
      'test_execution',
      'test_run',
      NEW.id,
      jsonb_build_object(
        'run_name', NEW.name,
        'status', NEW.status,
        'old_status', OLD.status,
        'milestone_id', NEW.milestone_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_run_status ON test_runs;
CREATE TRIGGER trg_log_run_status
  AFTER UPDATE ON test_runs
  FOR EACH ROW EXECUTE FUNCTION fn_log_run_status_change();

-- ============================================
-- TRIGGER 4: milestones INSERT/UPDATE → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'milestone_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := 'milestone_status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata
  ) VALUES (
    NEW.project_id,
    auth.uid(),
    v_event_type,
    'milestone',
    'milestone',
    NEW.id,
    jsonb_build_object(
      'milestone_name', NEW.name,
      'status', NEW.status,
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'end_date', NEW.end_date,
      'progress', NEW.progress
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_milestone_insert ON milestones;
CREATE TRIGGER trg_log_milestone_insert
  AFTER INSERT ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_log_milestone_change();

DROP TRIGGER IF EXISTS trg_log_milestone_update ON milestones;
CREATE TRIGGER trg_log_milestone_update
  AFTER UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_log_milestone_change();

-- ============================================
-- Realtime 활성화
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
