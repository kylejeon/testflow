import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaywrightReporter from '../src/reporter';

/**
 * Minimal Playwright TestCase / TestResult shapes for unit tests.
 * We don't import from @playwright/test/reporter to avoid DOM types —
 * we only need the subset the reporter reads.
 */
type Annotation = { type: string; description?: string };
type PWStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
interface FakeTestCase {
  title: string;
  annotations: Annotation[];
  tags: string[];
  location: { file: string; line: number; column: number };
}
interface FakeTestResult {
  status: PWStatus;
  duration: number;
  errors: Array<{ message?: string; stack?: string }>;
}

function testCase(overrides: Partial<FakeTestCase> = {}): FakeTestCase {
  return {
    title: 'some test',
    annotations: [],
    tags: [],
    location: { file: '/repo/tests/example.spec.ts', line: 1, column: 1 },
    ...overrides,
  };
}
function testResult(
  overrides: Partial<FakeTestResult> = {},
): FakeTestResult {
  return {
    status: 'passed',
    duration: 123,
    errors: [],
    ...overrides,
  };
}

const baseEnv = {
  TESTABLY_URL: 'https://example.testably.app',
  TESTABLY_TOKEN: 'testably_tok',
  TESTABLY_RUN_ID: 'run-42',
};

function okUpload() {
  return new Response(
    JSON.stringify({
      success: true,
      partial_failure: false,
      message: 'ok',
      stats: { passed: 1, failed: 0, blocked: 0, untested: 0 },
      uploaded_count: 1,
      failed_count: 0,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('PlaywrightReporter — TC ID extraction', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
  });
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('annotation mode: reads { type:"testably", description:"TC-123" }', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'annotation' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(
      testCase({
        title: 'login works',
        annotations: [{ type: 'testably', description: 'TC-123' }],
      }),
      testResult({ status: 'passed' }),
    );
    await reporter.onEnd({});

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.results[0].test_case_id).toBe('TC-123');
    expect(body.results[0].status).toBe('passed');
    fetchSpy.mockRestore();
  });

  it('tag mode: reads @TC-999 tag', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'tag' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(
      testCase({ title: 'checkout', tags: ['@smoke', '@TC-999'] }),
      testResult({ status: 'failed', errors: [{ message: 'boom' }] }),
    );
    await reporter.onEnd({});

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.results[0].test_case_id).toBe('TC-999');
    expect(body.results[0].status).toBe('failed');
    expect(body.results[0].note).toBe('boom');
    fetchSpy.mockRestore();
  });

  it('title mode: extracts [TC-7] from title', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(
      testCase({ title: '[TC-7] user can sign up' }),
      testResult({ status: 'passed' }),
    );
    reporter.onTestEnd(
      testCase({ title: 'no marker here' }), // skipped — no TC ID
      testResult({ status: 'passed' }),
    );
    await reporter.onEnd({});

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.results).toHaveLength(1);
    expect(body.results[0].test_case_id).toBe('TC-7');
    fetchSpy.mockRestore();
  });

  it('custom mode: uses mapTestCaseId callback', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    const reporter = new PlaywrightReporter({
      testCaseIdSource: 'custom',
      mapTestCaseId: (name: string) => (name.includes('login') ? 'TC-500' : undefined),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(testCase({ title: 'login works' }), testResult());
    reporter.onTestEnd(testCase({ title: 'random test' }), testResult());
    await reporter.onEnd({});

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.results).toHaveLength(1);
    expect(body.results[0].test_case_id).toBe('TC-500');
    fetchSpy.mockRestore();
  });

  it('status mapping: passed / failed / timedOut / skipped / interrupted', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(testCase({ title: '[TC-1] a' }), testResult({ status: 'passed' }));
    reporter.onTestEnd(testCase({ title: '[TC-2] b' }), testResult({ status: 'failed' }));
    reporter.onTestEnd(
      testCase({ title: '[TC-3] c' }),
      testResult({ status: 'timedOut' }),
    );
    reporter.onTestEnd(
      testCase({ title: '[TC-4] d' }),
      testResult({ status: 'skipped' }),
    );
    reporter.onTestEnd(
      testCase({ title: '[TC-5] e' }),
      testResult({ status: 'interrupted' }),
    );
    await reporter.onEnd({});

    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.results.map((r: { status: string }) => r.status)).toEqual([
      'passed',
      'failed',
      'failed',
      'blocked',
      'blocked',
    ]);
    fetchSpy.mockRestore();
  });

  it('no results → no network call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(testCase({ title: 'no marker' }), testResult());
    await reporter.onEnd({});
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe('PlaywrightReporter — payload format', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });

  it('emits POST to /functions/v1/upload-ci-results with json format + results array', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUpload());
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(testCase({ title: '[TC-1] x' }), testResult());
    await reporter.onEnd({});

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(
      'https://example.testably.app/functions/v1/upload-ci-results',
    );
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.run_id).toBe('run-42');
    expect(body.format).toBe('json');
    expect(body.results[0].author).toBe('Playwright CI');
    fetchSpy.mockRestore();
  });
});
