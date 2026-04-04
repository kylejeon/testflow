import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult as PWTestResult,
  FullResult,
} from '@playwright/test/reporter';
import { TestablyClient, TestResult, TestablyConfig } from '@testably/reporter-core';

const SDK_AGENT = '@testably/playwright-reporter/1.0.0';

export interface PlaywrightReporterOptions extends Partial<TestablyConfig> {
  /**
   * TC ID 추출 방법:
   * - 'annotation': test.info().annotations 에서 { type: 'testably', description: 'TC-001' } 추출
   * - 'tag': @TC-001 태그에서 추출
   * - 'title': 테스트 제목에서 [TC-001] 패턴 추출
   * - 'custom': mapTestCaseId 함수 사용
   * Default: 'annotation'
   */
  testCaseIdSource?: 'annotation' | 'tag' | 'title' | 'custom';
}

class PlaywrightReporter implements Reporter {
  private client: TestablyClient;
  private results: TestResult[] = [];
  private options: PlaywrightReporterOptions;
  private totalTests = 0;
  private mappedTests = 0;

  constructor(options: PlaywrightReporterOptions = {}) {
    this.options = options;
    this.client = new TestablyClient(options, SDK_AGENT);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onBegin(_config: FullConfig, _suite: Suite): void {
    this.results = [];
    this.totalTests = 0;
    this.mappedTests = 0;
  }

  onTestEnd(test: TestCase, result: PWTestResult): void {
    this.totalTests++;

    const tcId = this.extractTestCaseId(test);
    if (!tcId) {
      if (this.options.verbose) {
        console.log(`[Testably:debug] Skipped (no TC ID): ${test.title}`);
      }
      return;
    }

    this.mappedTests++;
    this.results.push({
      test_case_id: tcId,
      status: mapStatus(result.status),
      note: extractNote(result),
      elapsed: result.duration,
      author: 'Playwright CI',
    });
  }

  async onEnd(_result: FullResult): Promise<void> {
    const skipped = this.totalTests - this.mappedTests;
    console.log(
      `[Testably] ${this.totalTests} tests run, ${this.mappedTests} mapped to Testably, ${skipped} skipped (no TC ID)`,
    );

    if (this.results.length === 0) {
      return;
    }

    try {
      const response = await this.client.uploadResults(this.results);

      if (response.partial_failure) {
        console.warn(`[Testably] ${response.failed_count} results failed to upload`);
      }
    } catch (err) {
      const msg = `[Testably] Upload failed: ${(err as Error).message}`;
      if (this.options.failOnUploadError) {
        throw new Error(msg);
      }
      console.error(msg);
    }
  }

  /**
   * TC ID 추출 로직.
   * 우선순위: annotation → tag → title → custom
   */
  private extractTestCaseId(test: TestCase): string | undefined {
    const source = this.options.testCaseIdSource ?? 'annotation';

    // 1. Annotation: annotations에서 type='testably' 찾기
    if (source === 'annotation' || source === 'tag') {
      const annotation = test.annotations.find((a) => a.type === 'testably');
      if (annotation?.description) return annotation.description;
    }

    // 2. Tag: @TC-001 형식의 태그에서 추출
    if (source === 'tag' || source === 'annotation') {
      for (const tag of test.tags) {
        const match = tag.match(/@?(TC-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
        if (match) return match[1];
      }
    }

    // 3. Title: [TC-001] 패턴
    if (source === 'title') {
      const match = test.title.match(
        /\[(TC-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]/i,
      );
      if (match) return match[1];
    }

    // 4. Custom mapper
    if (source === 'custom' && this.options.mapTestCaseId) {
      return this.options.mapTestCaseId(test.title, test.location.file);
    }

    return undefined;
  }
}

function mapStatus(status: PWTestResult['status']): TestResult['status'] {
  switch (status) {
    case 'passed':
      return 'passed';
    case 'failed':
      return 'failed';
    case 'timedOut':
      return 'failed';
    case 'skipped':
      return 'blocked';
    case 'interrupted':
      return 'blocked';
    default:
      return 'untested';
  }
}

function extractNote(result: PWTestResult): string | undefined {
  if (result.status === 'passed') return undefined;
  const errors = result.errors.map((e) => e.message ?? e.stack ?? '').join('\n');
  return errors.slice(0, 800) || undefined;
}

export default PlaywrightReporter;
