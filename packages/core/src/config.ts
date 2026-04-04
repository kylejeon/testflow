import { TestablyConfig } from './types';

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export type ResolvedConfig = Required<Omit<TestablyConfig, 'mapTestCaseId'>> & {
  mapTestCaseId: (testName: string, filePath: string) => string | undefined;
};

export function resolveConfig(partial: Partial<TestablyConfig>): ResolvedConfig {
  const url = partial.url || process.env['TESTABLY_URL'];
  const token = partial.token || process.env['TESTABLY_TOKEN'];
  const runId = partial.runId || process.env['TESTABLY_RUN_ID'];

  if (!url) throw new ConfigError('TESTABLY_URL is required (env var or config.url)');
  if (!token) throw new ConfigError('TESTABLY_TOKEN is required (env var or config.token)');
  if (!runId) throw new ConfigError('TESTABLY_RUN_ID is required (env var or config.runId)');

  return {
    url: url.replace(/\/+$/, ''), // trailing slash 제거
    token,
    runId,
    testCaseIdMapping: partial.testCaseIdMapping ?? 'annotation',
    mapTestCaseId: partial.mapTestCaseId ?? (() => undefined),
    failOnUploadError: partial.failOnUploadError ?? false,
    maxRetries: partial.maxRetries ?? 3,
    verbose: partial.verbose ?? false,
  };
}
