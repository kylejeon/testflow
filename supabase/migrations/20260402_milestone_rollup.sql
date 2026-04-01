-- Migration: milestone_rollup_support
-- 설명: Parent milestone의 roll-up 집계 지원을 위한 스키마 변경

-- 1. milestones 테이블에 집계 모드 관련 컬럼 추가
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS date_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (date_mode IN ('auto', 'manual'));
-- date_mode: 'auto' = sub 기간에서 자동 계산, 'manual' = 수동 입력 유지

-- 2. 인덱스 추가 (parent → sub 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_milestones_parent_id
  ON milestones (parent_milestone_id)
  WHERE parent_milestone_id IS NOT NULL;

-- 3. parent의 집계 통계를 위한 DB Function (선택적)
CREATE OR REPLACE FUNCTION fn_milestone_rollup_stats(p_milestone_id UUID)
RETURNS TABLE (
  total_tcs BIGINT,
  completed_tcs BIGINT,
  passed_tcs BIGINT,
  failed_tcs BIGINT,
  blocked_tcs BIGINT,
  retest_tcs BIGINT,
  pass_rate NUMERIC,
  coverage_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH target_milestones AS (
    -- parent 자신 + 모든 sub milestones
    SELECT id FROM milestones WHERE id = p_milestone_id
    UNION ALL
    SELECT id FROM milestones WHERE parent_milestone_id = p_milestone_id
  ),
  target_runs AS (
    SELECT tr.id AS run_id, tr.test_case_ids
    FROM test_runs tr
    JOIN target_milestones tm ON tr.milestone_id = tm.id
  ),
  -- 각 run의 TC별 최신 결과
  latest_results AS (
    SELECT DISTINCT ON (tres.test_case_id, tres.run_id)
      tres.run_id,
      tres.test_case_id,
      tres.status
    FROM test_results tres
    JOIN target_runs trun ON tres.run_id = trun.run_id
    ORDER BY tres.test_case_id, tres.run_id, tres.created_at DESC
  ),
  -- TC별 집계
  tc_stats AS (
    SELECT
      unnest(tr.test_case_ids) AS tc_id,
      tr.run_id
    FROM target_runs tr
  ),
  final_stats AS (
    SELECT
      ts.tc_id,
      ts.run_id,
      COALESCE(lr.status, 'untested') AS status
    FROM tc_stats ts
    LEFT JOIN latest_results lr ON lr.test_case_id = ts.tc_id AND lr.run_id = ts.run_id
  )
  SELECT
    COUNT(*)::BIGINT AS total_tcs,
    COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest'))::BIGINT AS completed_tcs,
    COUNT(*) FILTER (WHERE status = 'passed')::BIGINT AS passed_tcs,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_tcs,
    COUNT(*) FILTER (WHERE status = 'blocked')::BIGINT AS blocked_tcs,
    COUNT(*) FILTER (WHERE status = 'retest')::BIGINT AS retest_tcs,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'passed')::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest')) * 100, 1
      )
      ELSE 0
    END AS pass_rate,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest'))::NUMERIC /
        COUNT(*) * 100, 1
      )
      ELSE 0
    END AS coverage_rate
  FROM final_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Activity log 트리거에 roll-up 이벤트 추가
-- Sub milestone 변경 시 parent도 activity_logs에 기록
CREATE OR REPLACE FUNCTION fn_log_parent_milestone_rollup()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- sub milestone 변경 시 parent에 대한 로그 생성
  IF NEW.parent_milestone_id IS NOT NULL THEN
    v_parent_id := NEW.parent_milestone_id;
    INSERT INTO activity_logs (
      project_id, actor_id, action, target_type, target_id,
      metadata, created_at
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      'milestone_rollup_updated',
      'milestone',
      v_parent_id,
      jsonb_build_object(
        'sub_milestone_id', NEW.id,
        'sub_milestone_name', NEW.name,
        'change_type', TG_OP
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_parent_rollup ON milestones;
CREATE TRIGGER trg_log_parent_rollup
  AFTER INSERT OR UPDATE ON milestones
  FOR EACH ROW
  WHEN (NEW.parent_milestone_id IS NOT NULL)
  EXECUTE FUNCTION fn_log_parent_milestone_rollup();
