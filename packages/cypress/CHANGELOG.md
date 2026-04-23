# Changelog

All notable changes to `@testably.kr/cypress-reporter` are documented in this
file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-05-13

Initial public release — the official Testably plugin for [Cypress](https://cypress.io).
Shipped 2 days after the Playwright reporter launch with the same `3-line setup`
experience, identical environment variables, and the same error-handling matrix.

### Added

- `setupTestablyReporter(on, config, options?)` plugin for
  `cypress.config.{ts,js}` — registers an `after:run` listener that uploads
  Cypress results to a Testably run.
- Three test-case ID extraction strategies: `title` (default, `[TC-123]`),
  `tag` (`@TC-123` suffix/token with whitespace anchor to avoid email
  false-matches), and `custom` (`mapTestCaseId` callback).
- Automatic batching of results (100 per request) and exponential-backoff
  retry (1s / 2s / 4s, up to `maxRetries=3` by default) for transient 5xx /
  429 errors — delegated to `@testably.kr/reporter-core`.
- Plan-gate fallback: on HTTP 403 the reporter prints an upgrade notice and
  leaves CI green. Set `failOnUploadError: true` to opt in to hard failure.
- 401 / 404 / 400 / 207 handling with one-line warnings; no retry storm.
- Dry-run mode — activate via `options.dryRun`, `TESTABLY_DRY_RUN=true`,
  **or** `config.env.TESTABLY_DRY_RUN=true` in `cypress.env.json`.
- Retry-aware note composition: when `test.attempts.length > 1` the Testably
  `note` is prefixed with `Retried N time(s). ` before the error body.
- `User-Agent: @testably.kr/cypress-reporter/1.0.1` +
  `X-Testably-SDK-Version` on every request so uploads show up as
  `source=cypress` in Testably.

### Differences from `@testably.kr/playwright-reporter`

- No `annotation` strategy — Cypress does not expose an annotation API.
  Default strategy is `'title'` (Playwright defaults to `'annotation'`).
- Results are collected at the `after:run` boundary (a single batch per
  headless `cypress run`), not per-test.
- `author` field on every uploaded result is `"Cypress CI"`.

### Notes

- Requires `cypress >= 12.0.0` (Cypress 10.x reached EOL in 2024).
- Requires a Testably **Professional** plan or higher on the server side.
  Free / Hobby / Starter plans will receive an HTTP 403 and the reporter will
  log an upgrade notice without failing CI.
- Locked dependency on `@testably.kr/reporter-core@1.0.1` to guarantee
  parity with `@testably.kr/playwright-reporter@1.0.1`.

[Unreleased]: https://github.com/kylejeon/testflow/compare/sdk-cypress-v1.0.1...HEAD
[1.0.1]: https://github.com/kylejeon/testflow/releases/tag/sdk-cypress-v1.0.1
