/**
 * AC-H3: TypeScript strict mode integration.
 *
 * A real user `cypress.config.ts` sample under `tests/fixtures/strict-tsconfig/`
 * MUST compile cleanly with:
 *   - strict: true
 *   - noImplicitAny: true
 *   - all strict-family flags on
 *
 * We run `tsc --noEmit` against the fixture project and assert exit code 0.
 * This guards the public `.d.ts` shape against future regressions (e.g., an
 * `any` leaking into the plugin signature, an implicit-return path, etc.).
 */
import { describe, expect, it } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

describe('AC-H3: strict tsconfig fixture', () => {
  const fixtureDir = resolve(__dirname, '../fixtures/strict-tsconfig');
  const tsconfigPath = resolve(fixtureDir, 'tsconfig.json');
  const configSample = resolve(fixtureDir, 'cypress.config.ts');

  it('fixture files exist (cypress.config.ts + strict tsconfig.json)', () => {
    expect(existsSync(tsconfigPath)).toBe(true);
    expect(existsSync(configSample)).toBe(true);
  });

  it(
    'user cypress.config.ts compiles under strict:true with zero type errors',
    () => {
      // If tsc finds errors, execSync throws and includes stderr; we surface it.
      let output = '';
      try {
        output = execSync(
          `npx tsc --noEmit -p "${tsconfigPath}"`,
          {
            cwd: resolve(__dirname, '../..'),
            stdio: 'pipe',
            encoding: 'utf8',
          },
        );
      } catch (err) {
        const e = err as { stdout?: string; stderr?: string; message: string };
        throw new Error(
          `strict tsc compile failed:\n${e.stdout ?? ''}\n${e.stderr ?? ''}\n${e.message}`,
        );
      }
      // tsc in --noEmit strict mode on a clean file prints nothing.
      expect(output).toBe('');
    },
    30_000,
  );
});
