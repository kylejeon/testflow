/**
 * AC-H2 fixture: legacy CJS cypress.config.js sample.
 *
 * Represents the exact 3-line install pattern that a user on
 * `cypress.config.js` (no "type": "module") would write. Exists primarily
 * so the `cjs-config.test.ts` integration can spawn a node subprocess
 * that `require()`s this file against the real built CJS bundle.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const { defineConfig } = require('cypress');
const { setupTestablyReporter } = require('@testably.kr/cypress-reporter');

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      setupTestablyReporter(on, config, {
        testCaseIdSource: 'title',
      });
      return config;
    },
  },
});
