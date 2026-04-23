# Next.js 15 + GitHub Actions

Minimal Next.js app (App Router) with Playwright E2E tests that upload to
Testably on every PR via GitHub Actions.

**TC ID mapping strategy:** `tag` — Playwright 1.42+ tag syntax.

```ts
test('user can log in', { tag: '@TC-101' }, async ({ page }) => { … })
```

## Files

- [`playwright.config.ts`](./playwright.config.ts) — reporter registration
- [`tests/example.spec.ts`](./tests/example.spec.ts) — 3 sample tests
- [`.github/workflows/e2e.yml`](./.github/workflows/e2e.yml) — CI pipeline
- [`.env.example`](./.env.example) — required secrets
- [`package.json`](./package.json) — dependencies

## Wire it up in 5 minutes

### 1. Install the reporter

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

### 2. Register in `playwright.config.ts`

Keep your existing reporters. Add one line:

```ts
reporter: [
  ['list'],
  ['@testably.kr/playwright-reporter', { testCaseIdSource: 'tag' }],
],
```

### 3. Add 3 GitHub Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret**
and add:

| Name | Value | Notes |
|------|-------|-------|
| `TESTABLY_URL` | `https://app.testably.app` | Same for every workspace |
| `TESTABLY_TOKEN` | `testably_…` | From Testably → Settings → CI/CD Tokens |
| `TESTABLY_RUN_ID` | `<uuid>` | Usually generated per-PR via the Testably API. For a quick start, hard-code a single run ID and reuse it. |

Need dynamic run IDs per PR? The reporter also accepts `TESTABLY_RUN_ID` from a
preceding step's output — wire a script that calls `POST /functions/v1/runs`
to create a run and exports the ID. We'll ship a helper action for this in v1.1.

### 4. Tag your tests

```ts
test('user can log in', { tag: '@TC-101' }, async ({ page }) => { ... });
```

The `tag` strategy reads Playwright's native `tag` option (1.42+). If you're on
older Playwright, switch to `testCaseIdSource: 'title'` and prefix titles with
`[TC-101] user can log in`.

### 5. Push a commit

The workflow runs on every PR. Check the "Upload" line in the `Run Playwright`
step to confirm `X results uploaded to Testably (run: <uuid>)`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ConfigError: TESTABLY_RUN_ID is required` | Secret not set in the right environment (repo vs. environment-specific). |
| `HTTP 403 — Professional plan required` | Workspace is on Free/Hobby/Starter. Reporter prints upgrade notice, CI still passes. |
| `0 tests mapped` | Tags use `@TC-…` but `testCaseIdSource` is set to `annotation`. Match one to the other. |
| Workflow runs twice per PR | GitHub default — `on: push` + `on: pull_request` both fire. Use only `pull_request` for PR-only runs. |

## Customizing for your real app

This example ships minimal placeholder tests that hit `https://example.com`.
Swap in your own `baseURL` + tests:

```ts
// playwright.config.ts
use: {
  baseURL: process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000',
},

// And add a Playwright `webServer` block to spin up your dev server:
webServer: {
  command: 'npm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: !process.env.CI,
},
```
