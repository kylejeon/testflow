import type { Config, AggregatedResult } from '@jest/reporters';
import { TestablyClient, TestResult, TestablyConfig } from '@testably.kr/reporter-core';

const SDK_AGENT = '@testably.kr/jest-reporter/0.0.0-dev';

export interface JestReporterOptions extends Partial<TestablyConfig> {
  /**
   * TC ID 추출 방법:
   * - 'title': it('[TC-001] test name') 패턴에서 추출
   * - 'custom': mapTestCaseId 함수 사용
   * Default: 'title'
   */
  testCaseIdSource?: 'title' | 'custom';
}

class JestReporter {
  private client: TestablyClient;
  private options: JestReporterOptions;

  constructor(_globalConfig: Config.GlobalConfig, options: JestReporterOptions = {}) {
    this.options = options;
    this.client = new TestablyClient(options, SDK_AGENT);
  }

  async onRunComplete(
    _testContexts: Set<unknown>,
    aggregatedResults: AggregatedResult,
  ): Promise<void> {
    const testResults: TestResult[] = [];
    let totalTests = 0;
    let mappedTests = 0;

    for (const suite of aggregatedResults.testResults) {
      for (const test of suite.testResults) {
        totalTests++;
        const tcId = this.extractTestCaseId(test.fullName, suite.testFilePath);
        if (!tcId) {
          if (this.options.verbose) {
            console.log(`[Testably:debug] Skipped (no TC ID): ${test.fullName}`);
          }
          continue;
        }

        mappedTests++;
        testResults.push({
          test_case_id: tcId,
          status: mapStatus(test.status),
          note: test.failureMessages?.join('\n').slice(0, 800) || undefined,
          elapsed: test.duration ?? undefined,
          author: 'Jest CI',
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
      const response = await this.client.uploadResults(testResults);

      if (response.partial_failure) {
        console.warn(`[Testably] ${response.failed_count} results failed to upload`);
      }
    } catch (err) {
      const msg = `[Testably] Upload failed: ${(err as Error).message}`;
      if (this.options.failOnUploadError) throw new Error(msg);
      console.error(msg);
    }
  }

  private extractTestCaseId(fullName: string, filePath: string): string | undefined {
    const source = this.options.testCaseIdSource ?? 'title';

    if (source === 'title') {
      const match = fullName.match(/\[?(TC-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]?/i);
      if (match) return match[1];
    }

    if (source === 'custom' && this.options.mapTestCaseId) {
      return this.options.mapTestCaseId(fullName, filePath);
    }

    return undefined;
  }
}

function mapStatus(status: string): TestResult['status'] {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'pending':
      return 'blocked';
    case 'skipped':
      return 'blocked';
    case 'todo':
      return 'untested';
    default:
      return 'untested';
  }
}

export default JestReporter;
