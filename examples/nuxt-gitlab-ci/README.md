# Nuxt 3 + GitLab CI

Nuxt app with Playwright E2E tests uploaded to Testably via GitLab CI/CD
pipelines.

**TC ID mapping strategy:** `title` — human-readable test titles with
`[TC-…]` prefix.

```ts
test('[TC-101] user can log in', async ({ page }) => { … })
```

## Files

- [`playwright.config.ts`](./playwright.config.ts) — reporter registration
- [`tests/example.spec.ts`](./tests/example.spec.ts) — 3 sample tests
- [`.gitlab-ci.yml`](./.gitlab-ci.yml) — pipeline with secrets masking
- [`.env.example`](./.env.example) — required variables
- [`package.json`](./package.json) — dependencies

## Wire it up in 5 minutes

### 1. Install the reporter

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

### 2. Register in `playwright.config.ts`

```ts
reporter: [
  ['list'],
  ['@testably.kr/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
],
```

### 3. Add 3 masked variables in GitLab

Go to **Settings → CI/CD → Variables → Add variable** and add each of these
with "Masked" checked (so they never appear in job logs):

| Key | Type | Masked | Value |
|-----|------|--------|-------|
| `TESTABLY_URL` | Variable | ✅ | `https://app.testably.app` |
| `TESTABLY_TOKEN` | Variable | ✅ | `testably_…` |
| `TESTABLY_RUN_ID` | Variable | ✅ | `<uuid>` |

GitLab will warn if a value can't be masked — ensure it's ≥ 8 chars and
contains only Base64-safe characters. Testably tokens satisfy both.

### 4. Prefix your test titles with `[TC-###]`

```ts
test('[TC-101] user can log in', async ({ page }) => { ... });
test('[TC-102] add to cart',     async ({ page }) => { ... });
```

The reporter extracts `TC-101` via regex from the title. UUID-style IDs
(e.g. `[abcd1234-5678-…]`) are also accepted.

### 5. Commit the `.gitlab-ci.yml`

Push the branch — GitLab's pipeline runs automatically. Watch the `e2e` job
for the line `X results uploaded to Testably (run: <uuid>)`.

## Pre-merge gating

By default `failOnUploadError: false` keeps MRs unblocked when Testably is
momentarily unreachable. If you want a hard dependency, the pipeline below
already uses `allow_failure: false` on the `e2e` job — flip
`failOnUploadError: true` in the config to enforce it.

### Running only on merge requests

```yaml
rules:
  - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

Already in the example pipeline. Remove this block to run on every push.

## `dryRun` smoke test

Before plugging real run IDs, verify authentication from CI with no side
effects:

```yaml
script:
  - TESTABLY_DRY_RUN=true npx playwright test --project=chromium --grep "@TC-"
```

Exit 0 + log line `Testably dry run successful` = credentials + run id OK.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Value appears unmasked in logs | GitLab masking rejected the value. Regenerate the token with only `[a-zA-Z0-9+/=@:._-]` characters. |
| `HTTP 404 — Run not found` | `TESTABLY_RUN_ID` is stale (run was deleted) or copied wrong. Create a fresh run in Testably. |
| Pipeline succeeds but no results in Testably | Upload step ran *after* pipeline exit due to `after_script` placement. Keep the Playwright run in `script:`. |
