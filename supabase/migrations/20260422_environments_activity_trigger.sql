-- ============================================================================
-- Environments → activity_logs trigger (Dev Spec v2 §5 / AC-V14~V16)
--
-- INSERT → event_type='environment_created'
-- UPDATE (is_active flip) → 'environment_activated' / 'environment_deactivated'
-- UPDATE (other fields)  → 'environment_updated'
-- DELETE → 'environment_deleted'
--
-- All INSERTs into activity_logs go through this trigger; exceptions are
-- swallowed so the underlying CRUD on environments never fails due to logging.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_log_environment_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_project_id UUID;
  v_target_id  UUID;
  v_metadata   JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'environment_created';
    v_project_id := NEW.project_id;
    v_target_id  := NEW.id;
    v_metadata := jsonb_build_object(
      'name',            NEW.name,
      'os_name',         COALESCE(NEW.os_name, ''),
      'os_version',      COALESCE(NEW.os_version, ''),
      'browser_name',    COALESCE(NEW.browser_name, ''),
      'browser_version', COALESCE(NEW.browser_version, ''),
      'device_type',     NEW.device_type
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_project_id := NEW.project_id;
    v_target_id  := NEW.id;

    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      -- is_active 단독 변경이든 겸해서 변경이든 activated/deactivated로만 기록 (중복 방지)
      v_event_type := CASE WHEN NEW.is_active
                           THEN 'environment_activated'
                           ELSE 'environment_deactivated'
                      END;
    ELSIF (OLD.name, OLD.os_name, OLD.os_version, OLD.browser_name, OLD.browser_version,
           OLD.device_type, OLD.description)
          IS DISTINCT FROM
          (NEW.name, NEW.os_name, NEW.os_version, NEW.browser_name, NEW.browser_version,
           NEW.device_type, NEW.description) THEN
      v_event_type := 'environment_updated';
    ELSE
      -- meaningful change 없음 → no-op (audit noise 방지)
      RETURN NEW;
    END IF;

    v_metadata := jsonb_build_object(
      'name',         NEW.name,
      'os_name',      COALESCE(NEW.os_name, ''),
      'browser_name', COALESCE(NEW.browser_name, ''),
      'device_type',  NEW.device_type,
      'is_active',    NEW.is_active
    );

  ELSIF TG_OP = 'DELETE' THEN
    v_event_type := 'environment_deleted';
    v_project_id := OLD.project_id;
    v_target_id  := OLD.id;
    v_metadata := jsonb_build_object(
      'name',         OLD.name,
      'os_name',      COALESCE(OLD.os_name, ''),
      'browser_name', COALESCE(OLD.browser_name, ''),
      'device_type',  OLD.device_type
    );
  END IF;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata
  ) VALUES (
    v_project_id,
    auth.uid(),
    v_event_type,
    'settings',
    'environment',
    v_target_id,
    v_metadata
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- 로깅 실패가 원본 CRUD 트랜잭션을 막지 않도록 함.
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- Triggers
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_log_environment_insert ON environments;
CREATE TRIGGER trg_log_environment_insert
  AFTER INSERT ON environments
  FOR EACH ROW EXECUTE FUNCTION fn_log_environment_change();

DROP TRIGGER IF EXISTS trg_log_environment_update ON environments;
CREATE TRIGGER trg_log_environment_update
  AFTER UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION fn_log_environment_change();

DROP TRIGGER IF EXISTS trg_log_environment_delete ON environments;
CREATE TRIGGER trg_log_environment_delete
  AFTER DELETE ON environments
  FOR EACH ROW EXECUTE FUNCTION fn_log_environment_change();
