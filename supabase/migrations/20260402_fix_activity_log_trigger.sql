-- ============================================================
-- HOTFIX: fn_log_test_case_created trigger
--
-- 원인: test_cases.created_by는 user UUID (uuid 타입)인데
--       트리거에서 profiles.full_name (text)과 비교하여
--       "operator does not exist: text = uuid" (PG code 42883) 에러 발생.
--
-- 수정: full_name 대신 profiles.id (uuid)로 직접 비교
-- ============================================================

CREATE OR REPLACE FUNCTION fn_log_test_case_created()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  -- created_by는 user UUID — profiles.id로 직접 매핑 (full_name이 아님)
  SELECT p.id INTO v_actor_id
  FROM profiles p
  WHERE p.id = NEW.created_by::uuid
  LIMIT 1;

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
EXCEPTION WHEN OTHERS THEN
  -- 로그 기록 실패가 TC 생성을 막지 않도록 예외 처리
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 재등록 (함수만 교체되므로 DROP/CREATE 불필요, 이미 연결됨)
-- 기존 trg_log_test_case_created 트리거는 새 함수를 자동으로 사용
