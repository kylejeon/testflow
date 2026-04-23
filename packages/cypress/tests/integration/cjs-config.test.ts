/**
 * AC-H2: CommonJS consumer integration (real `require()` semantics).
 *
 * A user with `cypress.config.js` (no `"type": "module"` in package.json)
 * writes `const { setupTestablyReporter } = require('@testably.kr/cypress-reporter')`.
 *
 * We verify this by writing a CJS probe script to a temp file and spawning
 * Node against it. This exercises the exact resolution path a CJS consumer
 * hits — vitest itself is ESM so a `.cjs`/`.js` test file can't import
 * vitest APIs directly.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';

describe('AC-H2: CJS consumer (dist/index.js via require)', () => {
  const distCjsPath = resolve(__dirname, '../../dist/index.js');
  const fixtureSample = resolve(
    __dirname,
    '../fixtures/cjs-consumer/cypress.config.js',
  );
  let scratchDir = '';

  beforeAll(() => {
    scratchDir = mkdtempSync(join(tmpdir(), 'testably-cypress-cjs-'));
  });
  afterAll(() => {
    if (scratchDir) rmSync(scratchDir, { recursive: true, force: true });
  });

  function runNode(source: string): string {
    const file = join(scratchDir, `probe-${Date.now()}-${Math.random()}.cjs`);
    writeFileSync(file, source, 'utf8');
    return execFileSync(process.execPath, [file], {
      stdio: 'pipe',
      encoding: 'utf8',
    });
  }

  it('built CJS bundle exists (dist/index.js)', () => {
    expect(existsSync(distCjsPath)).toBe(true);
  });

  it('CJS fixture cypress.config.js exists (user-facing sample)', () => {
    expect(existsSync(fixtureSample)).toBe(true);
  });

  it('require(dist/index.js) exposes setupTestablyReporter + re-exports', () => {
    const source = `
      const mod = require(${JSON.stringify(distCjsPath)});
      const checks = {
        setup: typeof mod.setupTestablyReporter,
        defaultExp: typeof mod.default,
        sameRef: mod.default === mod.setupTestablyReporter,
        ConfigError: typeof mod.ConfigError,
        NonRetryable: typeof mod.NonRetryableUploadError,
        UploadError: typeof mod.UploadError,
        RateLimit: typeof mod.RateLimitError,
      };
      process.stdout.write(JSON.stringify(checks));
    `;
    const out = runNode(source);
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.setup).toBe('function');
    expect(parsed.defaultExp).toBe('function');
    expect(parsed.sameRef).toBe(true);
    expect(parsed.ConfigError).toBe('function');
    expect(parsed.NonRetryable).toBe('function');
    expect(parsed.UploadError).toBe('function');
    expect(parsed.RateLimit).toBe('function');
  });

  it('CJS consumer call site registers after:run handler without throwing', () => {
    const source = `
      process.env.TESTABLY_URL = 'https://example.testably.app';
      process.env.TESTABLY_TOKEN = 'testably_tok';
      process.env.TESTABLY_RUN_ID = 'run-1';
      const { setupTestablyReporter } = require(${JSON.stringify(distCjsPath)});
      const calls = [];
      const on = (evt, handler) => { calls.push([evt, typeof handler]); };
      const config = { env: {} };
      setupTestablyReporter(on, config, { testCaseIdSource: 'title' });
      process.stdout.write(JSON.stringify({ count: calls.length, evt: calls[0][0], htype: calls[0][1] }));
    `;
    const out = runNode(source);
    const parsed = JSON.parse(out) as {
      count: number;
      evt: string;
      htype: string;
    };
    expect(parsed.count).toBe(1);
    expect(parsed.evt).toBe('after:run');
    expect(parsed.htype).toBe('function');
  });
});
