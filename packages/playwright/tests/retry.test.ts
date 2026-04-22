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

describe('PlaywrightReporter — retry semantics', () => {
  beforeEach(() => {
    Object.assign(process.env, baseEnv);
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });

  it('transient 500 retried 3 times (default maxRetries) then gives up (no throw)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('boom', { status: 500 }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());

    const promise = reporter.onEnd({});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    // 1 initial + 3 retries = 4
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(
      errSpy.mock.calls.some((c) => c.join(' ').includes('Upload failed')),
    ).toBe(true);

    fetchSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('recovers on attempt 2 (transient 500 → 200)', async () => {
    let call = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      call += 1;
      if (call === 1) return new Response('boom', { status: 500 });
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
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reporter = new PlaywrightReporter({ testCaseIdSource: 'title' }) as any;
    reporter.onBegin({}, {});
    reporter.onTestEnd(fakeCase('[TC-1] x'), fakeResult());

    const promise = reporter.onEnd({});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    fetchSpy.mockRestore();
  });
});
