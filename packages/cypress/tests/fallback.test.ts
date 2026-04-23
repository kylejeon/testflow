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

function fakeConfig(env: Record<string, unknown> = {}): Cypress.PluginConfigOptions {
  return { env } as unknown as Cypress.PluginConfigOptions;
}

describe('setupTestablyReporter — non-retryable 4xx fallback', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('403 plan gate → warn + NOT throw (exit 0 path)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(
        async () =>
          new Response('CI/CD integration requires Professional', { status: 403 }),
      );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).resolves.toBeUndefined();

    const joined = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/Professional plan/i);
    expect(joined).toMatch(/test run itself has NOT failed/i);
    // 403 is non-retryable → only 1 fetch
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('401 invalid token → warn + NOT throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Invalid token', { status: 401 }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).resolves.toBeUndefined();
    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Invalid API token')),
    ).toBe(true);
  });

  it('404 run_id not found → warn + NOT throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Run not found', { status: 404 }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).resolves.toBeUndefined();
    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Run not found')),
    ).toBe(true);
  });

  it('400 invalid payload → warn + NOT throw', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('bad body', { status: 400 }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).resolves.toBeUndefined();
    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Invalid payload')),
    ).toBe(true);
  });

  it('failOnUploadError=true → 403 re-throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('plan', { status: 403 }),
    );
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title', failOnUploadError: true },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).rejects.toThrow();
  });
});

describe('setupTestablyReporter — dryRun activation sources', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('options.dryRun=true → POSTs with dry_run:true, no results', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          message: 'ok',
          run_name: 'Nightly E2E',
          tier: 3,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title', dryRun: true },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.dry_run).toBe(true);
    expect(body.results).toBeUndefined();
    expect(
      logSpy.mock.calls.some((c) => c.join(' ').includes('Dry run passed')),
    ).toBe(true);
  });

  it('process.env.TESTABLY_DRY_RUN=true → triggers dry-run mode', async () => {
    process.env['TESTABLY_DRY_RUN'] = 'true';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, dry_run: true, message: 'ok', tier: 3 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.dry_run).toBe(true);
  });

  it('config.env.TESTABLY_DRY_RUN=true → triggers dry-run mode', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, dry_run: true, message: 'ok', tier: 3 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig({ TESTABLY_DRY_RUN: 'true' }),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const body = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.dry_run).toBe(true);
  });

  it('dry-run 403 → falls through to non-retryable handler (exit 0)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('plan', { status: 403 }),
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title', dryRun: true },
    );
    await expect(
      fire(makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })])),
    ).resolves.toBeUndefined();
    expect(
      warnSpy.mock.calls.some((c) => c.join(' ').includes('Professional plan')),
    ).toBe(true);
  });
});
