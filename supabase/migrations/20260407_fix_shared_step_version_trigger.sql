-- Fix shared step version trigger to always save history when steps/name/version changes
-- Previously only saved history if steps OR name changed, missing cases where
-- version was bumped without content changes.

CREATE OR REPLACE FUNCTION record_shared_step_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Save snapshot whenever steps, name, OR version changes
  IF (OLD.steps IS DISTINCT FROM NEW.steps)
     OR (OLD.name IS DISTINCT FROM NEW.name)
     OR (OLD.version IS DISTINCT FROM NEW.version) THEN

    -- Only insert if this version isn't already recorded (idempotency guard)
    INSERT INTO shared_step_versions (shared_step_id, version, steps, name, changed_by, change_summary)
    VALUES (OLD.id, OLD.version, OLD.steps, OLD.name, NEW.updated_by, NULL)
    ON CONFLICT DO NOTHING;

    -- Increment version if not already bumped by caller
    IF NEW.version = OLD.version THEN
      NEW.version := OLD.version + 1;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
