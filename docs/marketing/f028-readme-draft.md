# f028 — README Draft: @testably.kr/playwright-reporter
> 유형: Package README Draft
> 작성일: 2026-04-22
> 타겟 채널: npm / GitHub (packages/playwright-reporter/README.md)
> 관련 기능: f028 Playwright Reporter SDK
> 주의: 이 파일은 드래프트입니다. 실제 packages/ 디렉터리는 수정하지 마십시오.

---

```markdown
# @testably.kr/playwright-reporter

[![npm version](https://img.shields.io/npm/v/@testably.kr/playwright-reporter?color=0a7ea4&label=npm)](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
[![npm downloads](https://img.shields.io/npm/dw/@testably.kr/playwright-reporter?color=0a7ea4)](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
[![license](https://img.shields.io/npm/l/@testably.kr/playwright-reporter)](./LICENSE)
[![playwright](https://img.shields.io/badge/playwright-%3E%3D1.40.0-green)](https://playwright.dev/)

Official [Playwright](https://playwright.dev/) reporter for [Testably](https://testably.app) — automatically upload your CI test results to a Testably test run when your suite finishes.

> **Status:** `1.0.1` — stable. API is frozen and follows strict SemVer.
>
> **Plan requirement:** Testably **Professional plan or higher** ($99/month, up to 20 members).
> Free / Hobby / Starter accounts receive HTTP 403 and an upgrade notice. CI exit code is always 0.

---

## Install

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

**Peer dependency:** `@playwright/test >= 1.40.0`

---

## Quick start (3 steps)

### 1. Generate a CI token

In Testably, go to **Settings → CI/CD Tokens** and create a new token. Copy the value — it starts with `testably_` and won't be shown again.

### 2. Add three secrets to your CI provider

```yaml
# .github/workflows/e2e.yml  (GitHub Actions example)
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

| Variable | Description |
|---|---|
| `TESTABLY_URL` | Your Testably workspace URL, e.g. `https://app.testably.app` |
| `TESTABLY_TOKEN` | The CI token you generated in step 1 |
| `TESTABLY_RUN_ID` | UUID of the Testably test run to populate |

For GitLab CI or Jenkins, add these as masked environment variables using your platform's secret management.

### 3. Register the reporter

```ts
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],                               // keep your existing reporters
    ['@testably.kr/playwright-reporter', {
      testCaseIdSource: 'title',            // or 'annotation', 'tag', 'custom'
    }],
  ],
});
```

Run `npx playwright test`. When the suite finishes, results are batched and uploaded automatically.

---

## Environment variables

| Variable | Option equivalent | Required | Description |
|---|---|---|---|
| `TESTABLY_URL` | `url` | Yes | Testably workspace base URL |
| `TESTABLY_TOKEN` | `token` | Yes | CI token (`testably_<32 hex>`). Always use env var — never hard-code in config. |
| `TESTABLY_RUN_ID` | `runId` | Yes | Target test run UUID |
| `TESTABLY_DRY_RUN` | `dryRun` | No | Set `true` to validate credentials without writing data |

---

## All options

```ts
import type { PlaywrightReporterOptions } from '@testably.kr/playwright-reporter';
```

| Option | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | `TESTABLY_URL` | Testably workspace URL |
| `token` | `string` | `TESTABLY_TOKEN` | CI token. Prefer env var. |
| `runId` | `string` | `TESTABLY_RUN_ID` | Target run UUID |
| `testCaseIdSource` | `'annotation' \| 'tag' \| 'title' \| 'custom'` | `'annotation'` | Strategy for mapping tests to Testably TCs |
| `mapTestCaseId` | `(title: string, filePath: string) => string \| undefined` | — | Custom mapper; used when `testCaseIdSource === 'custom'` |
| `failOnUploadError` | `boolean` | `false` | If `true`, a failed upload throws and fails the whole run |
| `maxRetries` | `number` | `3` | Max retries per batch. Backoff: 1s / 2s / 4s |
| `dryRun` | `boolean` | `false` | Validate only, no DB writes |
| `verbose` | `boolean` | `false` | Log each test skipped due to missing TC ID |

Option values take precedence over environment variables.

---

## Matching tests to Testably test cases

Every result needs a Testably test case ID. Choose one strategy and apply it consistently across your suite.

### `annotation` (default)

Cleanest approach for new suites. Keeps test titles readable.

```ts
test('user can log in with valid credentials', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-42' });
  // ...
});
```

### `title`

Put the ID in brackets anywhere in the test title. Works well for migrating existing suites.

```ts
test('[TC-42] user can log in with valid credentials', async ({ page }) => {
  // ...
});
```

UUID-format IDs also work: `test('[550e8400-e29b-41d4-a716-446655440000] ...', ...)`.

### `tag`

Uses Playwright's built-in tag syntax.

```ts
test('user can log in @TC-42', async ({ page }) => { /* ... */ });
// or:
test('user can log in', { tag: '@TC-42' }, async ({ page }) => { /* ... */ });
```

### `custom`

Supply your own mapping function. Useful for teams with an existing ID mapping file.

```ts
reporter: [['@testably.kr/playwright-reporter', {
  testCaseIdSource: 'custom',
  mapTestCaseId: (title, filePath) => myMappingTable[filePath]?.[title],
}]]
```

Tests without a recognized ID are **skipped gracefully** — they do not fail CI. The run summary reports the count:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

---

## Status mapping

| Playwright status | Testably status |
|---|---|
| `passed` | `passed` |
| `failed` / `timedOut` | `failed` |
| `skipped` / `interrupted` | `blocked` |
| anything else | `untested` |

The first 800 characters of the first Playwright error message are attached as the Testably `note` on non-passed results.

---

## Dry-run verification

Before pointing the reporter at a live run, verify credentials and run ID without writing any data:

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

Expected output:

```
[Testably] Dry run passed. (Run: "Sprint 42 Regression", tier: 3)
```

---

## FAQ

**Q: Does a failed upload break my CI pipeline?**
No. `failOnUploadError` defaults to `false`. Upload errors are logged as warnings and the reporter always exits with code 0 by default. Set `failOnUploadError: true` only if you want strict enforcement.

**Q: What happens if I'm on Free / Hobby / Starter?**
The server returns HTTP 403. The reporter prints:
```
[Testably] Upload skipped: this feature requires a Professional plan (current: Hobby).
[Testably] Upgrade at https://testably.app/billing — test run itself has NOT failed.
```
CI exits 0. Your test results are unaffected.

**Q: Can I use this without setting `TESTABLY_RUN_ID`?**
No. A missing `runId` (and no `TESTABLY_RUN_ID` env var) causes a `ConfigError` at reporter initialization, which Playwright surfaces as a load failure. This is intentional — silent misconfiguration is harder to debug than an explicit startup error.

**Q: Does the reporter create new test cases for unmapped tests?**
No. Only tests explicitly mapped to existing Testably TC IDs are uploaded. Unmapped tests are counted and logged, not created.

**Q: Does this work with parallel Playwright workers?**
Yes. Playwright guarantees `onEnd` is called exactly once per reporter instance, regardless of how many workers ran. The reporter buffers all results from `onTestEnd` calls and flushes them in a single batch sequence in `onEnd`.

**Q: What Playwright versions are supported?**
`>= 1.40.0`. The reporter depends on stable `TestResult.errors[]` and `TestCase.annotations[]` shapes introduced in 1.40.

---

## Troubleshooting

### `Upload skipped: this feature requires a Professional plan`

Your token belongs to a project on Free, Hobby, or Starter. Upgrade at **Billing → Plans** in your Testably workspace. CI exit code remains 0.

### `Invalid API token (401)`

The token was revoked, expired, or the value was copied incorrectly. Generate a new token in **Settings → CI/CD Tokens**. Also verify `TESTABLY_URL` points to the correct environment.

### `Run not found (404)`

`TESTABLY_RUN_ID` is a UUID, not the run name. Copy it from the run's URL in Testably. The run may also have been deleted or locked.

### `N tests run, 0 mapped, N skipped (no TC ID)`

None of your tests contain a TC ID that matches the `testCaseIdSource` you configured. Verify the strategy and the expected pattern:
- `title`: tests must contain `[TC-N]` or a UUID in brackets
- `annotation`: tests must call `testInfo.annotations.push({ type: 'testably', ... })`
- `tag`: test title or tag must include `@TC-N`

### Upload retries or hangs

The client retries up to `maxRetries` times (default 3) with exponential backoff, and respects `Retry-After` on HTTP 429. If CI hangs, a network proxy may be intercepting requests. Set `verbose: true` to see per-batch logs and confirm requests are reaching the server.

### `npm ERR! peer dep @playwright/test@">=1.40.0"`

Upgrade Playwright: `npm install --save-dev @playwright/test@latest`. The reporter uses `TestResult.errors[]` and `TestCase.annotations[]` which stabilized in 1.40.

---

## Security

- The reporter sends exactly three pieces of sensitive data: the bearer token (Authorization header), the run ID (request body), and test results. None are ever logged — even in `verbose` mode.
- Never put `token: 'testably_abc...'` as a literal string in `playwright.config.ts`. Use `TESTABLY_TOKEN` as an env var and let your CI platform's secret store handle it.
- In GitHub Actions, add `echo "::add-mask::$TESTABLY_TOKEN"` early in your workflow as an extra safeguard against accidental log output.

---

## Contributing

This package is part of the Testably SDK monorepo. Issues and pull requests are welcome on [GitHub](https://github.com/kylejeon/testflow).

---

## License

[MIT](./LICENSE) — Testably, 2026.
```
