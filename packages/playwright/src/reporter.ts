import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult as PWTestResult,
  FullResult,
} from '@playwright/test/reporter';
import {
  TestablyClient,
  TestResult,
  TestablyConfig,
  NonRetryableUploadError,
} from '@testably/reporter-core';

const SDK_AGENT = '@testably/playwright-reporter/0.1.0-alpha.0';

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
  /**
   * dry_run 모드. 서버가 인증/권한/run_id 만 검증하고 DB에 쓰지 않음.
   * Default: false (env: TESTABLY_DRY_RUN=true 로 활성 가능)
   */
  dryRun?: boolean;
}

class PlaywrightReporter implements Reporter {
  private client: TestablyClient;
  private results: TestResult[] = [];
  private options: PlaywrightReporterOptions;
  private totalTests = 0;
  private mappedTests = 0;
  private dryRun: boolean;

  constructor(options: PlaywrightReporterOptions = {}) {
    this.options = options;
    this.client = new TestablyClient(options, SDK_AGENT);
    this.dryRun =
      options.dryRun ?? process.env['TESTABLY_DRY_RUN'] === 'true';
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

    // Dry-run 모드: DB 쓰기 없이 연결/권한만 검증
    if (this.dryRun) {
      try {
        const resp = await this.client.testConnection();
        const runName = resp.run_name ? `"${resp.run_name}"` : '(unknown)';
        const tier = resp.tier != null ? `tier: ${resp.tier}` : 'tier: ?';
        console.log(`[Testably] Dry run passed. (Run: ${runName}, ${tier})`);
      } catch (err) {
        this.handleUploadError(err);
      }
      return;
    }

    if (this.results.length === 0) {
      return;
    }

    try {
      const response = await this.client.uploadResults(this.results);

      if (response.partial_failure) {
        const failedIds = response.failed_test_case_ids?.join(', ') ?? '';
        console.warn(
          `[Testably] ${response.failed_count} results failed to upload${failedIds ? `: ${failedIds}` : ''}`,
        );
      }
    } catch (err) {
      this.handleUploadError(err);
    }
  }

  /**
   * 업로드 실패 처리 — 기본은 CI 를 죽이지 않는다 (exit 0).
   * failOnUploadError=true 일 때만 throw.
   * 플랜 거부(403) 는 업그레이드 안내 메시지만 1회 출력.
   */
  private handleUploadError(err: unknown): void {
    if (err instanceof NonRetryableUploadError) {
      if (err.status === 403) {
        console.warn(
          '[Testably] Upload skipped: this feature requires a Professional plan or higher.',
        );
        console.warn(
          '[Testably] Upgrade at https://testably.app/billing — test run itself has NOT failed.',
        );
      } else if (err.status === 401) {
        console.warn('[Testably] Invalid API token (401). Check TESTABLY_TOKEN.');
      } else if (err.status === 404) {
        console.warn(
          '[Testably] Run not found (404). Check TESTABLY_RUN_ID.',
        );
      } else if (err.status === 400) {
        console.warn(
          `[Testably] Invalid payload (400): ${err.body ?? err.message}`,
        );
      } else {
        console.warn(`[Testably] Upload rejected: ${err.message}`);
      }

      if (this.options.failOnUploadError) {
        throw new Error(err.message);
      }
      return;
    }

    const msg = `[Testably] Upload failed: ${(err as Error).message}`;
    if (this.options.failOnUploadError) {
      throw new Error(msg);
    }
    console.error(msg);
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
        const match = tag.match(
          /@?(TC-\d+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
        );
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
