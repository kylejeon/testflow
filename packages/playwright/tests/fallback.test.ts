import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaywrightReporter from '../src/reporter';

const baseEnv = {
  TESTABLY_URL: 'https://example.testably.app',
  TESTABLY_TOKEN: 'testably_tok',
  TESTABLY_RUN_ID: 'run-42',
};

function fakeCase(title: string) {
  return {
    title,
    annotations: [],
    tags: [],
    location: { file: '/repo/x.spec.ts', line: 1, column: 1 },
  };
}
function fakeResult() {
  return { status: 'passed' as const, duration: 10, errors: [] };
}

describe('PlaywrightReporter — fallback & plan gating', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('403 plan gate → warn + NOT throw (exit 0 path)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        'CI/CD integration requires a Professional plan or higher',
        { status: 403 },
      ),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());

    // Must NOT throw
    await expect(reporter.onEnd({})).resolves.toBeUndefined();
    const joined = warnSpy.mock.calls.map((a) => a.join(' ')).join('\n');
    expect(joined).toMatch(/Professional plan/i);
    expect(joined).toMatch(/test run itself has NOT failed/i);
    // Only one upload attempt — 403 is non-retryable
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('401 invalid token → warn + NOT throw', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Invalid token', { status: 401 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());
    await expect(reporter.onEnd({})).resolves.toBeUndefined();

    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Invalid API token')),
    ).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('404 run_id not found → warn + NOT throw', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Run not found', { status: 404 }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());
    await expect(reporter.onEnd({})).resolves.toBeUndefined();
    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Run not found')),
    ).toBe(true);
    warnSpy.mockRestore();
    fetchSpy.mockRestore();
  });

  it('failOnUploadError=true → 403 re-throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('plan', { status: 403 }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reporter = new PlaywrightReporter({
      testCaseIdSource: 'title',
      failOnUploadError: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());
    await expect(reporter.onEnd({})).rejects.toThrow();
  });

  it('dry_run via env var: calls /functions/v1/upload-ci-results with dry_run:true, no DB writes', async () => {
    process.env['TESTABLY_DRY_RUN'] = 'true';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: 'ok',
          run_name: 'E2E',
          tier: 3,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());
    await reporter.onEnd({});

    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.dry_run).toBe(true);
    expect(body.results).toBeUndefined();
    expect(logSpy.mock.calls.some((c) => c.join(' ').includes('Dry run passed'))).toBe(
      true,
    );
    fetchSpy.mockRestore();
    logSpy.mockRestore();
  });
});
