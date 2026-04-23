export {
  default,
  setupTestablyReporter,
  extractTestCaseId,
  mapCypressStatus,
  extractNote,
} from './plugin';
export type { CypressReporterOptions } from './plugin';

// Re-export common reporter-core types/errors so consumers don't need a second import.
export {
  ConfigError,
  NonRetryableUploadError,
  UploadError,
  RateLimitError,
} from '@testably.kr/reporter-core';
export type {
  TestablyConfig,
  TestResult,
  UploadResponse,
  DryRunResponse,
} from '@testably.kr/reporter-core';
