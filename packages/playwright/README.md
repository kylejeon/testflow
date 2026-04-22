# @testably/playwright-reporter

Official [Playwright](https://playwright.dev/) reporter for
[Testably](https://testably.app) — upload your Playwright test results to a
Testably test run automatically from any CI provider.

> **Status:** `0.1.0-alpha.0` — early access. API is stable but may get
> additive changes before `1.0`.
>
> **Server plan:** requires a Testably **Professional** plan or higher.
> Free / Hobby / Starter plans will receive an HTTP 403 and the reporter
> will print an upgrade notice without failing CI.

---

## Install

```bash
npm install --save-dev @testably/playwright-reporter
```

Peer dependency: `@playwright/test >= 1.40.0`.

## 5-minute quick start

1. In Testably, go to **Settings → CI/CD Tokens** and generate a token
   (format: `testably_<32 hex chars>`).
2. Add three environment variables to your CI provider (example: GitHub
   Actions):

   ```yaml
   # .github/workflows/e2e.yml
   env:
     TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
     TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
     TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
   ```

3. Register the reporter in `playwright.config.ts`:

   ```ts
   import { defineConfig } from '@playwright/test';

   export default defineConfig({
     reporter: [
       ['list'],
       ['@testably/playwright-reporter', {
         testCaseIdSource: 'title',
       }],
     ],
   });
   ```

4. Reference Testably test case IDs in your specs (`TC-<n>` or a Testably
   UUID). Using the `title` strategy this looks like:

   ```ts
   test('[TC-42] user can log in', async ({ page }) => { /* ... */ });
   ```

5. Run your tests. When `onEnd` fires, the reporter batches results
   (100 per request) and POSTs them to `/functions/v1/upload-ci-results`.

---

## Configuration

All options can be set through the `playwright.config.ts` reporter tuple or
through environment variables (environment takes lower precedence than
explicit options).

| Option / env var | Default | Description |
|------------------|---------|-------------|
| `url` / `TESTABLY_URL` | — (required) | Testably base URL, e.g. `https://app.testably.app`. |
| `token` / `TESTABLY_TOKEN` | — (required) | CI token. **Always set via env var, never hard-code.** |
| `runId` / `TESTABLY_RUN_ID` | — (required) | Target Testably run UUID. |
| `testCaseIdSource` | `'annotation'` | One of `annotation` / `tag` / `title` / `custom`. See below. |
| `mapTestCaseId` | — | Callback used when `testCaseIdSource === 'custom'`. Receives `(title, filePath)` and returns a TC id or `undefined`. |
| `failOnUploadError` | `false` | When `true`, a failed upload re-throws and fails the whole run. Keep this `false` on day one so you can't break CI with a bad token. |
| `maxRetries` | `3` | Retries per batch. Exponential backoff: 1s / 2s / 4s (capped at 30s). |
| `dryRun` / `TESTABLY_DRY_RUN=true` | `false` | Verify the URL / token / `runId` only. The server responds `200` without writing to the database. |
| `verbose` | `false` | Log each skipped (no TC id) test. |

---

## Matching tests to Testably

Every reported result needs a Testably test-case id. Pick one strategy and
stick with it across the project — the reporter checks strategies in this
order and stops at the first match.

### 1. `annotation` (default — cleanest if you're on Playwright 1.40+)

```ts
test('user can log in', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-42' });
  // ...
});
```

### 2. `tag`

Use Playwright's built-in tag support. Both `@TC-42` and UUID-style tags
match.

```ts
test('user can log in @TC-42', async ({ page }) => { /* ... */ });
// or: test('login', { tag: '@TC-42' }, async ({ page }) => { ... });
```

### 3. `title`

Put the id in brackets inside the test title:

```ts
test('[TC-42] user can log in', async ({ page }) => { /* ... */ });
```

### 4. `custom`

Supply your own mapper — handy when you keep a JSON map of file-to-TC:

```ts
reporter: [['@testably/playwright-reporter', {
  testCaseIdSource: 'custom',
  mapTestCaseId: (title, filePath) => mapping[filePath]?.[title],
}]]
```

Tests that can't be mapped are **skipped silently** — the run summary line
reports the count:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

---

## Status mapping

| Playwright status | Testably status |
|-------------------|-----------------|
| `passed` | `passed` |
| `failed` / `timedOut` | `failed` |
| `skipped` / `interrupted` | `blocked` |
| _other_ | `untested` |

The first 800 characters of the first error message are attached as the
Testably `note` on non-passed results.

---

## Dry-run the connection

Before you wire up a real run, verify credentials without writing anything:

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

The reporter prints:

```
[Testably] Dry run passed. (Run: "My Run", tier: 3)
```

---

## Troubleshooting

### `Upload skipped: this feature requires a Professional plan or higher`

Your CI token belongs to a project whose owner is on Free / Hobby / Starter.
Upgrade at **Billing → Plans** — the run itself has NOT failed, so your CI
pipeline keeps exit code 0.

### `Invalid API token (401)`

- The token was revoked or never existed. Re-issue it in **Settings →
  CI/CD Tokens**.
- You're pointing `TESTABLY_URL` at the wrong Testably environment.

### `Run not found (404)`

- The run was deleted or locked.
- `TESTABLY_RUN_ID` is a UUID — make sure you copied the id, not the
  user-facing run name.

### `N tests run, 0 mapped, N skipped (no TC ID)`

Tests don't contain a recognizable TC id for the `testCaseIdSource` you
picked. Double-check the strategy and the pattern.

### Upload hangs or retries forever

The client caps retries at `maxRetries` (default 3) and respects
`Retry-After` on 429 responses. If your CI hangs, you likely have a network
proxy swallowing requests — set `verbose: true` to see per-batch logs.

### `npm ERR! peer dep @playwright/test@>=1.40.0`

Upgrade Playwright. The reporter relies on the 1.40+ `TestResult.errors[]`
and `TestCase.annotations[]` shapes.

---

## Security

- The reporter sends exactly three bits of secret data: the bearer token
  (`Authorization` header), the run id (body), and the test results. It
  never logs any of them.
- Never put a raw `token:` string in `playwright.config.ts`. Use
  `TESTABLY_TOKEN` env var and the CI platform's secret store.
- In GitHub Actions, add `::add-mask::<token>` at the top of your workflow
  if you ever have to echo the value.

---

## License

[MIT](./LICENSE) — Testably, 2026.
