import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupTestablyReporter } from '../src/plugin';
import {
  createPluginEventsCapture,
  makeRunResult,
  makeTest,
} from './fixtures/cypress-run-result';

const baseEnv = {
  TESTABLY_URL: 'https://example.testably.app',
  TESTABLY_TOKEN: 'testably_tok',
  TESTABLY_RUN_ID: 'run-42',
};

function fakeConfig(): Cypress.PluginConfigOptions {
  return { env: {} } as unknown as Cypress.PluginConfigOptions;
}

function okUploadResponse() {
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

describe('setupTestablyReporter — retry semantics (core-driven)', () => {
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
      .mockImplementation(async () => new Response('boom', { status: 500 }));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    const promise = fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toBeUndefined();
    // 1 initial + 3 retries = 4
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    expect(
      errSpy.mock.calls.some((c) => c.join(' ').includes('Upload failed')),
    ).toBe(true);
  });

  it('recovers on attempt 2 (500 → 200)', async () => {
    let n = 0;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      n += 1;
      if (n === 1) return new Response('boom', { status: 500 });
      return okUploadResponse();
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    const p = fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    await vi.runAllTimersAsync();
    await expect(p).resolves.toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('failOnUploadError=true: all-500 retries → re-throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      async () => new Response('boom', { status: 500 }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title', failOnUploadError: true },
    );
    const promise = fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    // Silence unhandled rejection: attach a no-op catch up front so the
    // rejection isn't treated as unhandled by vitest before runAllTimersAsync.
    promise.catch(() => undefined);
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toThrow();
  });
});
