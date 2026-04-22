import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { TestablyClient } from '../src/client';
import type { TestResult, UploadResponse } from '../src/types';
import { NonRetryableUploadError, RateLimitError } from '../src/retry';

const baseEnv = {
  TESTABLY_URL: 'https://example.testably.app',
  TESTABLY_TOKEN: 'testably_deadbeefcafebabe',
  TESTABLY_RUN_ID: '00000000-0000-0000-0000-000000000042',
};

function okJson(body: Partial<UploadResponse>): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function makeResult(id: string, status: TestResult['status'] = 'passed'): TestResult {
  return { test_case_id: id, status, elapsed: 100, author: 'Playwright CI' };
}

function applyEnv(): void {
  process.env['TESTABLY_URL'] = baseEnv.TESTABLY_URL;
  process.env['TESTABLY_TOKEN'] = baseEnv.TESTABLY_TOKEN;
  process.env['TESTABLY_RUN_ID'] = baseEnv.TESTABLY_RUN_ID;
}
function clearEnv(): void {
  delete process.env['TESTABLY_URL'];
  delete process.env['TESTABLY_TOKEN'];
  delete process.env['TESTABLY_RUN_ID'];
}

describe('TestablyClient', () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    applyEnv();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    clearEnv();
    // restoreMocks in vitest.config handles spy cleanup
  });

  it('no-op when results is empty', async () => {
    const client = new TestablyClient({}, '@testably.kr/playwright-reporter/test');
    const resp = await client.uploadResults([]);
    expect(resp.uploaded_count).toBe(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends correct payload with json format + Bearer auth + SDK UA headers', async () => {
    fetchSpy.mockImplementation(async () =>
      okJson({
        success: true,
        partial_failure: false,
        message: 'ok',
        stats: { passed: 1, failed: 0, blocked: 0, untested: 0 },
        uploaded_count: 1,
        failed_count: 0,
      }),
    );

    const client = new TestablyClient({}, '@testably.kr/playwright-reporter/0.1.0-alpha.0');
    await client.uploadResults([makeResult('TC-1')]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe(`${baseEnv.TESTABLY_URL}/functions/v1/upload-ci-results`);
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe(`Bearer ${baseEnv.TESTABLY_TOKEN}`);
    expect(headers['User-Agent']).toBe('@testably.kr/playwright-reporter/0.1.0-alpha.0');
    expect(headers['X-Testably-SDK-Version']).toBe(
      '@testably.kr/playwright-reporter/0.1.0-alpha.0',
    );

    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.run_id).toBe(baseEnv.TESTABLY_RUN_ID);
    expect(body.format).toBe('json');
    expect(body.results).toHaveLength(1);
    expect(body.results[0].test_case_id).toBe('TC-1');
  });

  it('splits > 100 results into multiple batches', async () => {
    fetchSpy.mockImplementation(async () =>
      okJson({
        success: true,
        partial_failure: false,
        message: 'ok',
        stats: { passed: 100, failed: 0, blocked: 0, untested: 0 },
        uploaded_count: 100,
        failed_count: 0,
      }),
    );

    const results = Array.from({ length: 250 }, (_, i) => makeResult(`TC-${i + 1}`));
    const client = new TestablyClient({}, 'test');
    const merged = await client.uploadResults(results);

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const firstBody = JSON.parse(
      (fetchSpy.mock.calls[0][1] as RequestInit).body as string,
    );
    const lastBody = JSON.parse(
      (fetchSpy.mock.calls[2][1] as RequestInit).body as string,
    );
    expect(firstBody.results).toHaveLength(100);
    expect(lastBody.results).toHaveLength(50);
    expect(merged.uploaded_count).toBe(300);
  });

  it('throws NonRetryableUploadError on 403 (no retry)', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response('CI/CD integration requires a Professional plan or higher', {
          status: 403,
        }),
    );

    const client = new TestablyClient({}, 'test');
    await expect(client.uploadResults([makeResult('TC-1')])).rejects.toBeInstanceOf(
      NonRetryableUploadError,
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('throws NonRetryableUploadError on 401 with no retry', async () => {
    fetchSpy.mockImplementation(
      async () => new Response('Invalid token', { status: 401 }),
    );
    const client = new TestablyClient({}, 'test');
    await expect(client.uploadResults([makeResult('TC-1')])).rejects.toMatchObject({
      name: 'NonRetryableUploadError',
      status: 401,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('accepts 207 partial_failure as success', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            partial_failure: true,
            message: 'partial',
            stats: { passed: 1, failed: 0, blocked: 0, untested: 0 },
            uploaded_count: 1,
            failed_count: 1,
            failed_test_case_ids: ['TC-XXX'],
          }),
          { status: 207, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const client = new TestablyClient({}, 'test');
    const merged = await client.uploadResults([makeResult('TC-1'), makeResult('TC-2')]);
    expect(merged.partial_failure).toBe(true);
    expect(merged.failed_test_case_ids).toContain('TC-XXX');
  });

  it('testConnection sends dry_run=true', async () => {
    fetchSpy.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            dry_run: true,
            message: 'dry run ok',
            run_name: 'My Run',
            tier: 3,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    const client = new TestablyClient({}, 'test');
    const resp = await client.testConnection();
    expect(resp.dry_run).toBe(true);
    expect(resp.tier).toBe(3);
    const body = JSON.parse((fetchSpy.mock.calls[0][1] as RequestInit).body as string);
    expect(body.dry_run).toBe(true);
  });
});

describe('TestablyClient retry behaviour', () => {
  let fetchSpy: MockInstance<typeof globalThis.fetch>;

  beforeEach(() => {
    applyEnv();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    clearEnv();
  });

  it('retries transient 500 up to maxRetries then throws', async () => {
    fetchSpy.mockImplementation(
      async () => new Response('server error', { status: 500 }),
    );

    const client = new TestablyClient({ maxRetries: 2 }, 'test');
    const promise = client.uploadResults([makeResult('TC-1')]).catch((e) => e);

    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(Error);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it('respects 429 Retry-After header', async () => {
    let attempt = 0;
    fetchSpy.mockImplementation(async () => {
      attempt += 1;
      if (attempt === 1) {
        return new Response('slow down', {
          status: 429,
          headers: { 'Retry-After': '7' },
        });
      }
      return okJson({
        success: true,
        partial_failure: false,
        message: 'ok',
        stats: { passed: 1, failed: 0, blocked: 0, untested: 0 },
        uploaded_count: 1,
        failed_count: 0,
      });
    });

    const client = new TestablyClient({ maxRetries: 2 }, 'test');
    const promise = client.uploadResults([makeResult('TC-1')]);
    await vi.runAllTimersAsync();
    const merged = await promise;
    expect(merged.uploaded_count).toBe(1);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe('RateLimitError', () => {
  it('captures retryAfter', () => {
    const e = new RateLimitError(12);
    expect(e.retryAfter).toBe(12);
    expect(e.name).toBe('RateLimitError');
  });
});
