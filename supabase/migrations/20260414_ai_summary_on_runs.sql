-- Add AI summary persistence columns to test_runs
ALTER TABLE test_runs
  ADD COLUMN IF NOT EXISTS ai_summary JSONB NULL,
  ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ NULL;

-- ai_summary stores: { result: AISummaryResult, snapshot: { total, passed, failed, blocked } }
-- ai_summary_generated_at is set when the summary is saved
