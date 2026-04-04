import { TestablyClient, TestResult, TestablyConfig } from '@testably/reporter-core';

const SDK_AGENT = '@testably/cypress-reporter/1.0.0';

export interface CypressReporterOptions extends Partial<TestablyConfig> {
  /**
   * TC ID 추출 방법:
   * - 'title': it('[TC-001] test name') 패턴에서 추출
   * - 'custom': mapTestCaseId 함수 사용
   * Default: 'title'
   */
  testCaseIdSource?: 'title' | 'custom';
}

/**
 * Cypress plugin 등록 함수.
 * cypress.config.ts의 setupNodeEvents에서 호출한다.
 */
export function setupTestablyReporter(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: CypressReporterOptions = {},
): void {
  const client = new TestablyClient(
    {
      ...options,
      url: options.url ?? (config.env?.TESTABLY_URL as string | undefined) ?? process.env.TESTABLY_URL,
      token: options.token ?? (config.env?.TESTABLY_TOKEN as string | undefined) ?? process.env.TESTABLY_TOKEN,
      runId: options.runId ?? (config.env?.TESTABLY_RUN_ID as string | undefined) ?? process.env.TESTABLY_RUN_ID,
    },
    SDK_AGENT,
  );

  on('after:run', async (results) => {
    if (!results || !('runs' in results)) return;

    const testResults: TestResult[] = [];
    let totalTests = 0;
    let mappedTests = 0;

    for (const run of results.runs) {
      for (const test of run.tests) {
        totalTests++;
        const fullTitle = test.title.join(' > ');
        const tcId = extractTestCaseId(fullTitle, run.spec.relative, options);
        if (!tcId) {
          if (options.verbose) {
            console.log(`[Testably:debug] Skipped (no TC ID): ${fullTitle}`);
          }
          continue;
        }

        mappedTests++;
        testResults.push({
          test_case_id: tcId,
          status: mapCypressStatus(test.state),
          note: extractNote(test),
          elapsed: test.duration ?? undefined,
          author: 'Cypress CI',
        });
      }
    }

    const skipped = totalTests - mappedTests;
    console.log(
      `[Testably] ${totalTests} tests run, ${mappedTests} mapped to Testably, ${skipped} skipped (no TC ID)`,
    );

    if (testResults.length === 0) {
      return;
    }

    try {
      const response = await client.uploadResults(testResults);

      if (response.partial_failure) {
        console.warn(`[Testably] ${response.failed_count} results failed to upload`);
      }
    } catch (err) {
      const msg = `[Testably] Upload failed: ${(err as Error).message}`;
      if (options.failOnUploadError) throw new Error(msg);
      console.error(msg);
    }
  });
}

function extractTestCaseId(
  fullTitle: string,
  filePath: string,
  options: CypressReporterOptions,
): string | undefined {
  const source = options.testCaseIdSource ?? 'title';

  if (source === 'title') {
    const match = fullTitle.match(/\[?(TC-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]?/i);
    if (match) return match[1];
  }

  if (source === 'custom' && options.mapTestCaseId) {
    return options.mapTestCaseId(fullTitle, filePath);
  }

  return undefined;
}

function mapCypressStatus(state: string): TestResult['status'] {
  switch (state) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'blocked';
    case 'skipped':
      return 'blocked';
    default:
      return 'untested';
  }
}

function extractNote(test: CypressCommandLine.TestResult): string | undefined {
  if (test.state === 'passed') return undefined;
  const err = test.displayError;
  return err ? err.slice(0, 800) : undefined;
}

export default setupTestablyReporter;
