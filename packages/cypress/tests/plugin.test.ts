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

function fakeConfig(env: Record<string, unknown> = {}): Cypress.PluginConfigOptions {
  // We only read .env in the plugin; other fields aren't needed.
  return { env } as unknown as Cypress.PluginConfigOptions;
}

describe('setupTestablyReporter — event registration', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('registers an after:run listener on the provided on() callback', () => {
    const on = vi.fn();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    expect(on).toHaveBeenCalledTimes(1);
    expect(on.mock.calls[0][0]).toBe('after:run');
    expect(typeof on.mock.calls[0][1]).toBe('function');
  });

  it('ignores malformed results (no runs array) without throwing', async () => {
    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(fire({})).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('setupTestablyReporter — payload & upload', () => {
  beforeEach(() => Object.assign(process.env, baseEnv));
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
    delete process.env['TESTABLY_DRY_RUN'];
  });

  it('posts to /functions/v1/upload-ci-results with author="Cypress CI"', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );

    await fire(
      makeRunResult([
        makeTest({ title: ['login flow', '[TC-42] user can log in'], state: 'passed' }),
      ]),
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://example.testably.app/functions/v1/upload-ci-results');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.run_id).toBe('run-42');
    expect(body.format).toBe('json');
    expect(body.results).toHaveLength(1);
    expect(body.results[0].test_case_id).toBe('TC-42');
    expect(body.results[0].author).toBe('Cypress CI');
    expect(body.results[0].status).toBe('passed');
  });

  it('sends SDK agent headers (User-Agent + X-Testably-SDK-Version = cypress-reporter/1.0.1)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
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

    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers['User-Agent']).toBe('@testably.kr/cypress-reporter/1.0.1');
    expect(headers['X-Testably-SDK-Version']).toBe(
      '@testably.kr/cypress-reporter/1.0.1',
    );
  });

  it('skips upload when no test has a TC id (no network call)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([
        makeTest({ title: ['suite', 'no TC marker'], state: 'passed' }),
      ]),
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('prints a run summary with total/mapped/skipped counts', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUploadResponse());
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([
        makeTest({ title: ['[TC-1] a'], state: 'passed' }),
        makeTest({ title: ['no marker'], state: 'passed' }),
      ]),
    );

    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/2 tests run, 1 mapped to Testably, 1 skipped/);
  });

  it('batches 150 results into 2 fetch calls (100 per batch in core)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => okUploadResponse());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title' },
    );

    const tests = Array.from({ length: 150 }, (_, i) =>
      makeTest({ title: [`[TC-${i + 1}] test ${i + 1}`], state: 'passed' }),
    );
    await fire(makeRunResult(tests));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('verbose: logs skipped + mapped per test', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okUploadResponse());
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig(),
      { testCaseIdSource: 'title', verbose: true },
    );
    await fire(
      makeRunResult([
        makeTest({ title: ['[TC-1] a'], state: 'passed' }),
        makeTest({ title: ['no marker'], state: 'passed' }),
      ]),
    );
    const joined = logSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/\[Testably:debug\] Mapped TC-1/);
    expect(joined).toMatch(/\[Testably:debug\] Skipped \(no TC ID\): .*no marker/);
  });

  it('207 partial_failure → warn with failed_test_case_ids, exit 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          success: false,
          partial_failure: true,
          message: 'partial',
          stats: { passed: 0, failed: 1, blocked: 0, untested: 0 },
          uploaded_count: 1,
          failed_count: 1,
          failed_test_case_ids: ['TC-9'],
        }),
        { status: 207, headers: { 'Content-Type': 'application/json' } },
      ),
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
      fire(
        makeRunResult([makeTest({ title: ['[TC-9] x'], state: 'failed' })]),
      ),
    ).resolves.toBeUndefined();
    const joined = warnSpy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(joined).toMatch(/TC-9/);
  });
});

describe('setupTestablyReporter — config resolution priority', () => {
  beforeEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });
  afterEach(() => {
    delete process.env['TESTABLY_URL'];
    delete process.env['TESTABLY_TOKEN'];
    delete process.env['TESTABLY_RUN_ID'];
  });

  it('uses options.{url,token,runId} when provided (highest priority)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig({
        TESTABLY_URL: 'https://env-config.test',
        TESTABLY_TOKEN: 'env-config-tok',
        TESTABLY_RUN_ID: 'env-config-run',
      }),
      {
        url: 'https://opts.test',
        token: 'opts-tok',
        runId: 'opts-run',
        testCaseIdSource: 'title',
      },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://opts.test/functions/v1/upload-ci-results');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.run_id).toBe('opts-run');
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: 'Bearer opts-tok',
    });
  });

  it('falls back to config.env.TESTABLY_* when options missing', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig({
        TESTABLY_URL: 'https://cfg-env.test',
        TESTABLY_TOKEN: 'cfg-env-tok',
        TESTABLY_RUN_ID: 'cfg-env-run',
      }),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://cfg-env.test/functions/v1/upload-ci-results');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.run_id).toBe('cfg-env-run');
  });

  it('falls back to process.env.TESTABLY_* when options + config.env missing', async () => {
    process.env['TESTABLY_URL'] = 'https://proc-env.test';
    process.env['TESTABLY_TOKEN'] = 'proc-env-tok';
    process.env['TESTABLY_RUN_ID'] = 'proc-env-run';

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
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
    const [url] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://proc-env.test/functions/v1/upload-ci-results');
  });

  it('config.env.TESTABLY_* takes precedence over process.env', async () => {
    process.env['TESTABLY_URL'] = 'https://proc-env.test';
    process.env['TESTABLY_TOKEN'] = 'proc-env-tok';
    process.env['TESTABLY_RUN_ID'] = 'proc-env-run';

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(okUploadResponse());
    vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const { on, fire } = createPluginEventsCapture();
    setupTestablyReporter(
      on as unknown as Cypress.PluginEvents,
      fakeConfig({
        TESTABLY_URL: 'https://cfg-env.test',
        TESTABLY_TOKEN: 'cfg-env-tok',
        TESTABLY_RUN_ID: 'cfg-env-run',
      }),
      { testCaseIdSource: 'title' },
    );
    await fire(
      makeRunResult([makeTest({ title: ['[TC-1] x'], state: 'passed' })]),
    );
    const [url] = fetchSpy.mock.calls[0];
    // config.env wins
    expect(url).toBe('https://cfg-env.test/functions/v1/upload-ci-results');
  });

  it('throws ConfigError at setup time when all sources are empty', () => {
    expect(() =>
      setupTestablyReporter(
        (() => undefined) as unknown as Cypress.PluginEvents,
        fakeConfig(),
        { testCaseIdSource: 'title' },
      ),
    ).toThrow(/TESTABLY_URL|required/i);
  });
});
