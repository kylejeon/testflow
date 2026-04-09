-- Add github_issues JSONB column to test_results
-- Stores GitHub issues linked during test result creation
-- Format: [{number: int, url: text, repo: text}]
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS github_issues JSONB DEFAULT '[]';
