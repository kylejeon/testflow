# Remix + CircleCI

Remix app with Playwright E2E tests uploaded to Testably via CircleCI.

**TC ID mapping strategy:** `annotation` — programmatic, cleanest for large
test suites that already maintain metadata in code.

```ts
test('user can log in', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-101' });
  // ...
});
```

## Files

- [`playwright.config.ts`](./playwright.config.ts) — reporter registration
- [`tests/example.spec.ts`](./tests/example.spec.ts) — 3 sample tests
- [`.circleci/config.yml`](./.circleci/config.yml) — CircleCI pipeline
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
    testCaseIdSource: 'annotation',
  }],
],
```

### 3. Add 3 CircleCI environment variables

Go to **Project Settings → Environment Variables → Add Variable** and add:

| Name | Value |
|------|-------|
| `TESTABLY_URL` | `https://app.testably.app` |
| `TESTABLY_TOKEN` | `testably_…` |
| `TESTABLY_RUN_ID` | `<uuid>` |

CircleCI masks environment variables in logs automatically.

### 4. Annotate your tests

```ts
import { test } from '@playwright/test';

test('user can log in', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-101' });
  // ...
});
```

The annotation pattern scales well — wrap it in a custom fixture if you want
implicit tagging:

```ts
// tests/_fixtures.ts
export const test = base.extend<{ tc: (id: string) => void }>({
  tc: async ({}, use, testInfo) => {
    await use((id: string) => {
      testInfo.annotations.push({ type: 'testably', description: id });
    });
  },
});

// usage
test('user can log in', async ({ page, tc }) => {
  tc('TC-101');
  // ...
});
```

### 5. Push the branch

CircleCI picks up `.circleci/config.yml` automatically. First pipeline run
installs Playwright browsers; subsequent runs use the cache.

## Matrix / sharding

The example config runs a single-shard job. To parallelize:

```yaml
- run:
    name: Playwright ($CIRCLE_NODE_INDEX)
    command: |
      npx playwright test \
        --shard=$((CIRCLE_NODE_INDEX + 1))/$CIRCLE_NODE_TOTAL
```

`TESTABLY_RUN_ID` **must be identical across all shards** — each shard uploads
its own batch of results to the same run. The reporter de-dupes server-side.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| "Node not found" error | Remove the browser image pin — CircleCI's Node image is ≤ 18. Use `cimg/node:20.x-browsers`. |
| Upload runs but no results appear | Annotations use wrong `type` string. Must be exactly `'testably'` (lowercase, no hyphen). |
| `failOnUploadError: false` but CI still fails | Playwright test failures are separate from upload failures. Check the `expect` assertions. |
| Shards upload out-of-order | Normal — Testably server sorts by test completion time. |

## `dryRun` smoke test

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

Prints `Testably dry run successful` and exits 0 without writing any data.
Useful first-time setup check.
