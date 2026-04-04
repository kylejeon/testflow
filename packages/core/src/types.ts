export interface TestablyConfig {
  /** Testably API endpoint. Default: process.env.TESTABLY_URL */
  url?: string;
  /** CI Token. Default: process.env.TESTABLY_TOKEN */
  token?: string;
  /** Run ID to upload results to. Default: process.env.TESTABLY_RUN_ID */
  runId?: string;
  /** Test Case ID mapping strategy. Default: 'annotation' */
  testCaseIdMapping?: 'title' | 'annotation' | 'tag' | 'custom';
  /** Custom mapper function: test name → Testably TC ID */
  mapTestCaseId?: (testName: string, filePath: string) => string | undefined;
  /** Whether to fail CI if upload fails. Default: false */
  failOnUploadError?: boolean;
  /** Max retry attempts. Default: 3 */
  maxRetries?: number;
  /** Enable verbose logging. Default: false */
  verbose?: boolean;
}

export interface TestResult {
  test_case_id: string;
  status: 'passed' | 'failed' | 'blocked' | 'untested' | 'retest';
  note?: string;
  elapsed?: number; // ms
  author?: string;  // Default: 'CI/CD'
}

export interface UploadResponse {
  success: boolean;
  partial_failure: boolean;
  message: string;
  stats: {
    passed: number;
    failed: number;
    blocked: number;
    untested: number;
  };
  uploaded_count: number;
  failed_count: number;
  failed_test_case_ids?: string[];
}

export interface DryRunResponse {
  success: boolean;
  dry_run: true;
  message: string;
  run_name?: string;
  tier?: number;
  latency_ms?: number;
}
