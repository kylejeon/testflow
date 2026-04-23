import {
  TestablyClient,
  TestResult,
  TestablyConfig,
  NonRetryableUploadError,
} from '@testably.kr/reporter-core';

const SDK_AGENT = '@testably.kr/cypress-reporter/1.0.1';

export interface CypressReporterOptions extends Partial<TestablyConfig> {
  /**
   * TC ID 추출 방법:
   * - 'title' (default): `it('[TC-001] name')` 또는 full title 내 `[TC-001]` / `[<uuid>]`
   * - 'tag': title 말미/중간의 `@TC-001` 토큰
   * - 'custom': `options.mapTestCaseId` 콜백 사용
   *
   * Cypress 는 어노테이션 API 가 없어서 Playwright 의 'annotation' 모드는 제공하지 않습니다.
   */
  testCaseIdSource?: 'title' | 'tag' | 'custom';

  /**
   * dry_run 모드. 서버가 인증/권한/run_id 만 검증하고 DB 에 쓰지 않음.
   * Default: false.
   * 환경변수 `TESTABLY_DRY_RUN=true` 또는 `config.env.TESTABLY_DRY_RUN=true` 로도 활성화 가능.
   */
  dryRun?: boolean;
}

/**
 * Cypress plugin 등록 함수.
 * cypress.config.ts / cypress.config.js 의 setupNodeEvents 에서 호출한다.
 */
export function setupTestablyReporter(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  options: CypressReporterOptions = {},
): void {
  // 설정 우선순위: options.{...} > config.env.TESTABLY_* > process.env.TESTABLY_*
  const envUrl = (config.env?.TESTABLY_URL as string | undefined) ?? process.env.TESTABLY_URL;
  const envToken =
    (config.env?.TESTABLY_TOKEN as string | undefined) ?? process.env.TESTABLY_TOKEN;
  const envRunId =
    (config.env?.TESTABLY_RUN_ID as string | undefined) ?? process.env.TESTABLY_RUN_ID;
  const envDryRun =
    (config.env?.TESTABLY_DRY_RUN as string | undefined) ?? process.env.TESTABLY_DRY_RUN;

  const client = new TestablyClient(
    {
      ...options,
      url: options.url ?? envUrl,
      token: options.token ?? envToken,
      runId: options.runId ?? envRunId,
    },
    SDK_AGENT,
  );

  const dryRun = options.dryRun ?? envDryRun === 'true';

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
        const status = mapCypressStatus(test.state);
        const note = extractNote(test);
        if (options.verbose) {
          console.log(
            `[Testably:debug] Mapped ${tcId} (${status}) from: ${fullTitle}`,
          );
        }
        testResults.push({
          test_case_id: tcId,
          status,
          note,
          elapsed: test.duration ?? undefined,
          author: 'Cypress CI',
        });
      }
    }

    const skipped = totalTests - mappedTests;
    console.log(
      `[Testably] ${totalTests} tests run, ${mappedTests} mapped to Testably, ${skipped} skipped (no TC ID)`,
    );

    // Dry-run: DB 쓰기 없이 연결/권한만 검증
    if (dryRun) {
      try {
        const resp = await client.testConnection();
        const runName = resp.run_name ? `"${resp.run_name}"` : '(unknown)';
        const tier = resp.tier != null ? `tier: ${resp.tier}` : 'tier: ?';
        console.log(`[Testably] Dry run passed. (Run: ${runName}, ${tier})`);
      } catch (err) {
        handleUploadError(err, options);
      }
      return;
    }

    if (testResults.length === 0) {
      return;
    }

    try {
      const response = await client.uploadResults(testResults);

      if (response.partial_failure) {
        const failedIds = response.failed_test_case_ids?.join(', ') ?? '';
        console.warn(
          `[Testably] ${response.failed_count} results failed to upload${failedIds ? `: ${failedIds}` : ''}`,
        );
      }
    } catch (err) {
      handleUploadError(err, options);
    }
  });
}

/**
 * 업로드 실패 처리 — 기본은 CI 를 죽이지 않는다 (exit 0).
 * failOnUploadError=true 일 때만 throw.
 * 플랜 거부(403) 는 업그레이드 안내 메시지만 1회 출력.
 */
function handleUploadError(err: unknown, options: CypressReporterOptions): void {
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
      console.warn('[Testably] Run not found (404). Check TESTABLY_RUN_ID.');
    } else if (err.status === 400) {
      console.warn(`[Testably] Invalid payload (400): ${err.body ?? err.message}`);
    } else {
      console.warn(`[Testably] Upload rejected: ${err.message}`);
    }

    if (options.failOnUploadError) {
      throw new Error(err.message);
    }
    return;
  }

  const msg = `[Testably] Upload failed: ${(err as Error).message}`;
  if (options.failOnUploadError) {
    throw new Error(msg);
  }
  console.error(msg);
}

const UUID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

/**
 * TC ID 추출 (title/tag/custom 3종).
 *
 * - title: `[TC-123]` 또는 `[<uuid>]` 형태 (대괄호 필수).
 * - tag: `@TC-123` 토큰 (앞 공백 또는 문자열 시작 필수 — email@host 오매칭 방지).
 * - custom: options.mapTestCaseId 콜백.
 */
export function extractTestCaseId(
  fullTitle: string,
  filePath: string,
  options: CypressReporterOptions,
): string | undefined {
  const source = options.testCaseIdSource ?? 'title';

  if (source === 'title') {
    const re = new RegExp(`\\[(TC-\\d+|${UUID_PATTERN})\\]`, 'i');
    const match = fullTitle.match(re);
    if (match) return match[1];
    return undefined;
  }

  if (source === 'tag') {
    // 앞 공백 OR 문자열 시작 — `email@host` 같은 경우는 매칭 안 됨.
    const re = new RegExp(`(^|\\s)@(TC-\\d+|${UUID_PATTERN})(\\s|$)`, 'i');
    const match = fullTitle.match(re);
    if (match) return match[2];
    return undefined;
  }

  if (source === 'custom' && options.mapTestCaseId) {
    return options.mapTestCaseId(fullTitle, filePath);
  }

  return undefined;
}

export function mapCypressStatus(state: string | undefined): TestResult['status'] {
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

interface CypressAttemptLike {
  state?: string;
  error?: { message?: string } | null;
}

interface CypressTestLike {
  state?: string;
  displayError?: string | null;
  attempts?: CypressAttemptLike[];
}

export function extractNote(test: CypressTestLike): string | undefined {
  if (test.state === 'passed') return undefined;

  const attempts = test.attempts ?? [];
  const retried = attempts.length > 1;

  const errorBody =
    test.displayError ??
    (retried ? attempts[attempts.length - 1]?.error?.message ?? '' : '');

  if (retried) {
    const prefix = `Retried ${attempts.length - 1} ${
      attempts.length - 1 === 1 ? 'time' : 'times'
    }. `;
    const combined = prefix + (errorBody ?? '');
    const trimmed = combined.trim();
    // trim trailing whitespace if no error body (keep trailing period)
    return trimmed.slice(0, 800) || undefined;
  }

  return errorBody ? errorBody.slice(0, 800) : undefined;
}

export default setupTestablyReporter;
