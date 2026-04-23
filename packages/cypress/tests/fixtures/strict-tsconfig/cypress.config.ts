/**
 * AC-H3 fixture: minimal `cypress.config.ts` sample that strict-mode TS users
 * will write. Compiles with `strict: true` + `noImplicitAny: true` and MUST
 * produce zero type errors when the shipped `.d.ts` is resolved.
 *
 * Mirrors Dev Spec §8 "cypress.config.ts" example.
 */
import { defineConfig } from 'cypress';
import { setupTestablyReporter } from '@testably.kr/cypress-reporter';

export default defineConfig({
  e2e: {
    baseUrl: 'https://example.com',
    setupNodeEvents(on, config) {
      setupTestablyReporter(on, config, {
        testCaseIdSource: 'title',
        // dryRun is optional — typed as boolean | undefined.
        dryRun: process.env['TESTABLY_DRY_RUN'] === 'true',
      });
      return config;
    },
  },
});
