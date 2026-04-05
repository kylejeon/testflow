// Shared/Reusable Test Steps — TypeScript types

// ── Base step (existing format) ───────────────────────────────────────────────

export interface NormalStep {
  id: string;
  step: string;
  expectedResult: string;
  type?: never;
}

// ── Shared Step reference (embedded in TC steps array) ────────────────────────

export interface SharedStepRef {
  id: string;
  type: 'shared_step_ref';
  shared_step_id: string;
  shared_step_custom_id: string;
  shared_step_name: string;
  shared_step_version: number;
}

// ── Union for TC steps array ──────────────────────────────────────────────────

export type AnyStep = NormalStep | SharedStepRef;

export function isSharedStepRef(step: AnyStep): step is SharedStepRef {
  return (step as SharedStepRef).type === 'shared_step_ref';
}

// ── Shared Step library item ──────────────────────────────────────────────────

export interface SharedTestStep {
  id: string;
  project_id: string;
  custom_id: string;      // "SS-001"
  name: string;
  description: string | null;
  category: string | null;
  tags: string | null;    // comma-separated
  steps: NormalStep[];
  version: number;
  usage_count: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  // joined
  creator?: { full_name: string; email: string } | null;
}

// ── Usage record (TC that references a shared step) ───────────────────────────

export interface SharedStepUsage {
  test_case_id: string;
  custom_id: string;
  title: string;
  folder_path: string | null;
}
