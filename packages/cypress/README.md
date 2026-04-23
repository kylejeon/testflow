# @testably.kr/cypress-reporter

Official [Cypress](https://cypress.io) plugin for [Testably](https://testably.app) —
upload Cypress end-to-end test results to a Testably test run automatically from
any CI provider.

> **Status:** `1.0.1` — stable. API is frozen and follows strict SemVer.
>
> **Server plan:** requires a Testably **Professional** plan or higher.
> Free / Hobby / Starter plans will receive an HTTP 403 and the reporter
> will print an upgrade notice without failing CI.
>
> **Sibling SDK:** if you're on Playwright, see
> [`@testably.kr/playwright-reporter`](https://www.npmjs.com/package/@testably.kr/playwright-reporter).
> Both packages share the same core, same env vars, and the same error matrix.

---

## Install

```bash
npm install --save-dev @testably.kr/cypress-reporter
```

Peer dependency: `cypress >= 12.0.0`. Cypress 10 / 11 are past EOL and are
not supported.

## 5-minute quick start

1. In Testably, open **Settings → CI/CD Tokens** and generate a token
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

3. Register the plugin in `cypress.config.ts`:

   ```ts
   import { defineConfig } from 'cypress';
   import { setupTestablyReporter } from '@testably.kr/cypress-reporter';

   export default defineConfig({
     e2e: {
       setupNodeEvents(on, config) {
         setupTestablyReporter(on, config, { testCaseIdSource: 'title' });
         return config;
       },
     },
   });
   ```

   Using legacy CommonJS (`cypress.config.js`)? The package ships both
   bundles, so this works too:

   ```js
   const { defineConfig } = require('cypress');
   const { setupTestablyReporter } = require('@testably.kr/cypress-reporter');

   module.exports = defineConfig({
     e2e: {
       setupNodeEvents(on, config) {
         setupTestablyReporter(on, config, { testCaseIdSource: 'title' });
         return config;
       },
     },
   });
   ```

4. Reference Testably test case IDs in your specs (`TC-<n>` or a Testably
   UUID). Using the `title` strategy this looks like:

   ```ts
   // cypress/e2e/login.cy.ts
   describe('login', () => {
     it('[TC-42] user can log in', () => {
       cy.visit('/login');
       // ...
     });
   });
   ```

5. Run `npx cypress run`. When Cypress fires `after:run`, the plugin
   batches results (100 per request) and POSTs them to
   `/functions/v1/upload-ci-results`.

---

## Configuration

All options can be set on the `setupTestablyReporter` call or via environment
variables. Explicit options win over environment.

| Option / env var | Default | Description |
|------------------|---------|-------------|
| `url` / `TESTABLY_URL` | — (required) | Testably base URL, e.g. `https://app.testably.app`. |
| `token` / `TESTABLY_TOKEN` | — (required) | CI token. **Always set via env var — never hard-code.** |
| `runId` / `TESTABLY_RUN_ID` | — (required) | Target Testably run UUID. |
| `testCaseIdSource` | `'title'` | One of `title` / `tag` / `custom`. See below. |
| `mapTestCaseId` | — | Callback used when `testCaseIdSource === 'custom'`. Receives `(fullTitle, filePath)` and returns a TC id or `undefined`. |
| `failOnUploadError` | `false` | When `true`, a failed upload re-throws and fails the whole run. Keep this `false` on day one so a bad token can't break CI. |
| `maxRetries` | `3` | Retries per batch. Exponential backoff: 1s / 2s / 4s (capped at 30s). |
| `dryRun` / `TESTABLY_DRY_RUN=true` | `false` | Verify the URL / token / `runId` only. The server responds `200` without writing to the database. Also reads `config.env.TESTABLY_DRY_RUN`. |
| `verbose` | `false` | Log each skipped (no TC id) and each mapped test. |

### Env var fallback order

```
options.{url,token,runId,dryRun}
  > config.env.TESTABLY_*     (cypress.env.json or --env flags)
  > process.env.TESTABLY_*    (shell / CI secrets)
  > ConfigError               (fail-fast at plugin registration)
```

---

## Matching tests to Testably

Every reported result needs a Testably test-case id. Pick one strategy and
stick with it across the project — the plugin only runs the strategy you
choose. Tests that cannot be mapped are **skipped silently** and the run
summary reports how many were skipped:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

### 1. `title` (default)

Put the id in brackets inside the `it()` (or `describe()`) title:

```ts
it('[TC-42] user can log in', () => { /* ... */ });
// also works nested — the full chain is joined with " > "
describe('[TC-42] login', () => {
  it('happy path', () => { /* ... */ });
});
```

UUIDs work too: `it('[a1b2c3d4-e5f6-7890-abcd-ef1234567890] login')`.

### 2. `tag`

Cypress itself has no tags API, but the community convention is to add
`@TC-<n>` as a suffix (or free-standing token) inside the title. The plugin
enforces a whitespace boundary so an email address like `email@domain.com`
will **not** match:

```ts
it('should log in @TC-7', () => { /* ... */ });
it('@TC-12 checkout flow', () => { /* ... */ });
```

### 3. `custom`

Supply your own mapper — handy when you keep a JSON map of file-to-TC:

```ts
setupTestablyReporter(on, config, {
  testCaseIdSource: 'custom',
  mapTestCaseId: (fullTitle, filePath) => mapping[filePath]?.[fullTitle],
});
```

### Why no `annotation` strategy?

Unlike Playwright, Cypress doesn't expose a `test.info().annotations` API.
The annotation strategy is intentionally omitted from this plugin. Use
`title` (simplest) or `tag` (if you already tag specs for grep/selection).

---

## Status mapping

| Cypress state | Testably status |
|---------------|-----------------|
| `passed` | `passed` |
| `failed` | `failed` |
| `pending` | `blocked` (`it.skip`, `describe.skip`) |
| `skipped` | `blocked` (dynamic skip or `before` failure) |
| _anything else_ | `untested` (forward-compat fallback) |

The first 800 characters of `displayError` are attached to the Testably
`note` for non-passing results.

If Cypress retried a test (`retries: N` in your config), the `note` is
prefixed with `Retried N time(s). ` before the error body. The final status
always reflects the **last** attempt — so a test that fails once then passes
is reported as `passed` with no note (mirrors Playwright).

---

## Dry-run the connection

Before wiring up a real run, verify credentials without writing anything:

```bash
TESTABLY_DRY_RUN=true npx cypress run
```

The reporter prints:

```
[Testably] Dry run passed. (Run: "Nightly E2E", tier: 3)
```

You can also pass `dryRun: true` directly to `setupTestablyReporter`, or
set `TESTABLY_DRY_RUN=true` inside `cypress.env.json`.

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
picked. Double-check the strategy and the pattern (`[TC-123]` with brackets
for `title`, `@TC-123` with a leading whitespace for `tag`).

### Upload hangs or retries forever

The client caps retries at `maxRetries` (default 3) and respects
`Retry-After` on 429 responses. If your CI hangs, you likely have a network
proxy swallowing requests — set `verbose: true` to see per-test mapping
logs.

### `cypress open` doesn't upload

`after:run` only fires in headless mode (`cypress run`). Interactive
`cypress open` sessions are a no-op by design.

### Component tests

Component tests are supported on a best-effort basis — the plugin
registers the same `after:run` handler against
`component.setupNodeEvents`. Formal support is planned for v1.1.

---

## Security

- The plugin sends exactly three bits of secret data: the bearer token
  (`Authorization` header), the run id (body), and the test results. It
  never logs any of them.
- Never put a raw `token:` string in `cypress.config.ts`. Use
  `TESTABLY_TOKEN` env var and the CI platform's secret store.
- In GitHub Actions, add `::add-mask::<token>` at the top of your workflow
  if you ever have to echo the value.
- `npm publish --provenance` is enabled on CI, so you can verify the
  publish source on the npm package page.

---

## Cypress version support

| Cypress | Supported |
|---------|-----------|
| 12.x | yes |
| 13.x | yes |
| 14.x | yes (forward-compat — reports `untested` for any brand-new state) |
| ≤ 11 | no (EOL; upgrade Cypress) |

---

## License

[MIT](./LICENSE) — Testably, 2026.
