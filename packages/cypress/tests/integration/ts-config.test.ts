/**
 * AC-H2: TypeScript (ESM) consumer integration.
 *
 * Verifies that a user who installs `@testably.kr/cypress-reporter` and
 * imports it from a TS/ESM `cypress.config.ts` gets:
 *   1. A callable `setupTestablyReporter` function (named + default export).
 *   2. The exported error classes / types available.
 *   3. The shape matches what the README documents.
 *
 * We import directly from the built ESM bundle (`dist/index.mjs`) so we're
 * exercising exactly what end users see after `npm install`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('AC-H2: TS/ESM consumer shape (dist/index.mjs)', () => {
  it('named export setupTestablyReporter is a function', async () => {
    const mod = await import('../../dist/index.mjs');
    expect(typeof mod.setupTestablyReporter).toBe('function');
    // Cypress plugin signature: (on, config, options?) → void.
    expect(mod.setupTestablyReporter.length).toBeGreaterThanOrEqual(2);
  });

  it('default export equals setupTestablyReporter (both import styles work)', async () => {
    const mod = await import('../../dist/index.mjs');
    expect(mod.default).toBeDefined();
    expect(mod.default).toBe(mod.setupTestablyReporter);
  });

  it('re-exports core error classes (ConfigError, NonRetryableUploadError, etc.)', async () => {
    const mod = await import('../../dist/index.mjs');
    expect(typeof mod.ConfigError).toBe('function');
    expect(typeof mod.NonRetryableUploadError).toBe('function');
    expect(typeof mod.UploadError).toBe('function');
    expect(typeof mod.RateLimitError).toBe('function');
  });

  it('generated .d.ts declares CypressReporterOptions with documented fields', () => {
    // Inspect the declaration file rather than re-import it — reading it is
    // enough to guarantee consumers on strict TS get the right shape.
    const dts = readFileSync(
      resolve(__dirname, '../../dist/index.d.ts'),
      'utf8',
    );
    expect(dts).toMatch(/interface CypressReporterOptions/);
    expect(dts).toMatch(/testCaseIdSource\?\s*:\s*'title'\s*\|\s*'tag'\s*\|\s*'custom'/);
    expect(dts).toMatch(/dryRun\?\s*:\s*boolean/);
    // annotation mode should NOT be offered (Cypress has no annotation API).
    // Only allow the JSDoc comment that explains the omission.
    const typeUnionOnly = dts
      .replace(/\/\*\*[\s\S]*?\*\//g, '') // strip JSDoc blocks
      .replace(/\/\/[^\n]*/g, ''); // strip line comments
    expect(typeUnionOnly).not.toMatch(/'annotation'/);
  });

  it('setupTestablyReporter function signature type is exported', () => {
    const dts = readFileSync(
      resolve(__dirname, '../../dist/index.d.ts'),
      'utf8',
    );
    expect(dts).toMatch(/function setupTestablyReporter/);
    expect(dts).toMatch(/Cypress\.PluginEvents/);
    expect(dts).toMatch(/Cypress\.PluginConfigOptions/);
  });
});
