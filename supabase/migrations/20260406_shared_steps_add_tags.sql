-- shared_steps: add missing tags column
-- The tags field was defined in the TypeScript type and UI but omitted
-- from the original 20260405_shared_steps.sql migration, causing 400
-- errors on INSERT/UPDATE.

ALTER TABLE shared_steps
  ADD COLUMN IF NOT EXISTS tags TEXT;

COMMENT ON COLUMN shared_steps.tags IS 'Comma-separated tags (e.g. "login, smoke")';
