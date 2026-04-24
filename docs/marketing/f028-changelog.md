# f028 — Changelog Entry: @testably.kr/playwright-reporter 1.0.1
> 유형: Changelog
> 작성일: 2026-04-22 (revised 2026-04-23 for May 11 stable launch)
> 타겟 채널: packages/playwright/CHANGELOG.md + Testably public changelog
> 관련 기능: f028 Playwright Reporter SDK

---

## CHANGELOG.md entry (Keep a Changelog format)

```markdown
# Changelog

All notable changes to `@testably.kr/playwright-reporter` will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This package uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] — 2026-05-11

First stable public release.

### Added

- **`PlaywrightReporter` class** — implements the Playwright `Reporter` interface
  (`onBegin`, `onTestEnd`, `onEnd`). Batches results (100 per request) and uploads
  them to Testably via `POST /functions/v1/upload-ci-results` when the run
  completes.
- **Four TC ID matching strategies** via `testCaseIdSource` option:
  - `annotation` (default) — `testInfo.annotations.push({ type: 'testably', description: 'TC-42' })`
  - `tag` — `@TC-42` in test title or Playwright tag
  - `title` — `[TC-42]` pattern or UUID in test title
  - `custom` — `mapTestCaseId(title, filePath)` callback
- **Status mapping** — Playwright statuses map to Testably statuses:
  `passed → passed`, `failed/timedOut → failed`, `skipped/interrupted → blocked`,
  other → `untested`.
- **Resilient upload** — exponential backoff retry (1s / 2s / 4s, up to `maxRetries`
  attempts, default 3). Respects `Retry-After` on HTTP 429.
- **`failOnUploadError` option** (default `false`) — upload failures are always
  non-fatal by default. CI exit code is never affected by upload errors unless you
  opt in.
- **`dryRun` mode** — set `TESTABLY_DRY_RUN=true` or `dryRun: true` to validate
  credentials and run ID without writing any data. Useful for first-time setup
  verification.
- **`verbose` option** — logs each test that was skipped due to missing TC ID.
- **Env var fallback** — all three required values (`TESTABLY_URL`, `TESTABLY_TOKEN`,
  `TESTABLY_RUN_ID`) can be injected via environment variables. Explicit options
  take precedence.
- **`PlaywrightReporterOptions` TypeScript type** — fully exported for type-safe
  config in strict-mode TypeScript projects.
- **ESM + CJS dual bundle** — works in both `"type": "module"` and CommonJS projects.

### Notes

- `1.0.1` is the first stable version. The API surface is frozen and will follow
  strict SemVer from here. Prior `0.1.0-alpha.0` and `1.0.0` npm versions were
  pre-release artifacts.
- CI upload requires a **Testably Professional plan or higher**. On Free / Hobby /
  Starter, the server returns HTTP 403 and the reporter prints an upgrade notice.
  CI exit code remains 0.
- `TESTABLY_RUN_ID` must be set before the run starts. A missing value throws a
  `ConfigError` at reporter initialization (Playwright will report a load failure).
  This is intentional — silent misconfiguration is worse than a loud startup error.
- API tokens are never logged, even in `verbose` mode. Use your CI platform's
  secret masking (e.g., `::add-mask::` in GitHub Actions) as an additional layer.
- The reporter does not auto-create test cases for unmapped tests. Only explicitly
  mapped TC IDs are updated.

### Requirements

- `@playwright/test >= 1.40.0` (peer dependency)
- Node.js >= 18
- Testably Professional plan or higher for live uploads
- Three environment variables: `TESTABLY_URL`, `TESTABLY_TOKEN`, `TESTABLY_RUN_ID`

[1.0.1]: https://github.com/kylejeon/testflow/releases/tag/playwright-reporter-v1.0.1
```

---

## Public Changelog Entry (for testably.app/changelog)

### Playwright Reporter SDK — stable 1.0 is here

**Released: 2026-05-11**

You can now connect your Playwright CI runs directly to Testably with a single reporter plugin — officially stable as of today.

Install `@testably.kr/playwright-reporter`, add one line to your `playwright.config.ts`, and set three environment variables in your CI secrets. Every test run automatically lands in your Testably dashboard — pass/fail status, failure notes, timing, and all — ready for AI analysis, trend tracking, and team review.

**What changed for you:**

- Test results from CI no longer need to be entered manually. They arrive automatically as soon as the run finishes.
- Failed tests surface with their Playwright error message directly in the Testably test case view. No digging through CI logs.
- Testably's AI Run Summary and flaky test detection now have continuous, reliable data from every CI run — not just sporadic manual updates.

**How to set it up:**

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

Then follow the 5-minute quick start in the [npm README](https://www.npmjs.com/package/@testably.kr/playwright-reporter).

**Requires:** Testably Professional plan or higher. [See pricing](https://testably.app/pricing).

**Also available now:** Cypress Reporter (`@testably.kr/cypress-reporter`) 1.0.1 stable — same install flow, hooks into Cypress's `after:run` event. **Coming soon:** Jest Reporter.
