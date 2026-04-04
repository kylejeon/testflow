// RTM (Requirements Traceability Matrix) shared types

export type RequirementPriority = 'P1' | 'P2' | 'P3' | 'P4';
export type RequirementStatus = 'draft' | 'active' | 'deprecated';
export type RequirementSource = 'manual' | 'jira' | 'csv';

export interface Requirement {
  id: string;
  project_id: string;
  custom_id: string;
  title: string;
  description: string | null;
  priority: RequirementPriority;
  category: string | null;
  status: RequirementStatus;
  parent_id: string | null;
  source: RequirementSource;
  external_id: string | null;
  external_url: string | null;
  external_status: string | null;
  external_type: string | null;
  last_synced_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Joined
  creator?: { full_name: string; email: string } | null;
}

export interface RequirementTCLink {
  id: string;
  requirement_id: string;
  test_case_id: string;
  linked_by: string;
  linked_at: string;
  note: string | null;
  // Joined
  test_case?: {
    id: string;
    custom_id: string;
    title: string;
    priority: string;
    folder_path: string | null;
  } | null;
}

export interface RequirementHistory {
  id: string;
  requirement_id: string;
  user_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  change_summary: string | null;
  related_tc_id: string | null;
  created_at: string;
  user?: { full_name: string; email: string } | null;
}

// Coverage data returned from a joined query
export interface RequirementCoverage {
  requirement_id: string;
  total_linked_tcs: number;
  executed_tcs: number;
  passed_tcs: number;
  failed_tcs: number;
  blocked_tcs: number;
  coverage_pct: number;
}

// Matrix cell data for the RTM view
export interface MatrixCell {
  requirement_id: string;
  test_case_id: string;
  // Latest result status for this TC in context of the selected run (null = not linked)
  status: 'passed' | 'failed' | 'blocked' | 'untested' | null;
  result_id: string | null;
  note: string | null;
  executed_at: string | null;
  executor?: string | null;
}

export interface RTMMatrixData {
  requirements: Requirement[];
  testCases: Array<{ id: string; custom_id: string; title: string }>;
  cells: MatrixCell[];
  coverage: RequirementCoverage[];
}

// Gap types
export type GapType = 'no_tc' | 'no_exec' | 'fail';

export interface RequirementGap {
  requirement: Requirement;
  gap_type: GapType;
}
