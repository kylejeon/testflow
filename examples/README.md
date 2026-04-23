# Testably Playwright Reporter — Integration Examples

Real-world examples showing how to wire
[`@testably.kr/playwright-reporter`](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
into common framework + CI combinations.

Each sub-directory is a minimal, self-contained reference you can copy the
config files from (or clone the whole thing and run `npm install` to inspect).

## Examples

| Directory | Framework | CI Provider | Highlights |
|-----------|-----------|-------------|------------|
| [`nextjs-github-actions/`](./nextjs-github-actions) | Next.js 15 | GitHub Actions | `@TC-101` tag-based mapping, per-PR runs, secret masking |
| [`nuxt-gitlab-ci/`](./nuxt-gitlab-ci)               | Nuxt 3     | GitLab CI      | `[TC-101]` title-based mapping, pipeline secrets, `dryRun` gate |
| [`remix-circleci/`](./remix-circleci)               | Remix      | CircleCI       | Annotation-based mapping, matrix job, `failOnUploadError=false` |

## What every example contains

- **`playwright.config.ts`** — reporter registered alongside your existing reporters
- **`tests/example.spec.ts`** — 3–4 tests demonstrating each TC ID mapping strategy
- **CI workflow file** — ready to drop into the target provider
- **`.env.example`** — the 3 required secrets (`TESTABLY_URL`, `TESTABLY_TOKEN`, `TESTABLY_RUN_ID`)
- **`README.md`** — copy-paste setup + "what to change for your project" section

## Choosing a TC ID mapping strategy

| Strategy | When to pick it | Example |
|----------|-----------------|---------|
| `annotation` (default) | Programmatic control; you already attach custom metadata to tests | `test.info().annotations.push({ type: 'testably', description: 'TC-101' })` |
| `tag` | Playwright 1.42+ with `@tag` syntax; keeps titles clean | `test('@TC-101 user can log in', …)` |
| `title` | Human-readable test titles; team writes `[TC-101]` prefix | `test('[TC-101] user can log in', …)` |
| `custom` | Existing TMS has non-Testably IDs that need mapping | `mapTestCaseId: (title) => mappings[title] ?? null` |

All examples use a different strategy on purpose so you can see each in action.

## Run an example locally

```bash
# 1. Clone
git clone https://github.com/kylejeon/testflow.git
cd testflow/examples/nextjs-github-actions

# 2. Install the reporter (and Playwright)
npm install

# 3. Set the 3 required env vars (or use dryRun to smoke-test without hitting Testably)
cp .env.example .env
# edit .env or export:
export TESTABLY_URL=https://app.testably.app
export TESTABLY_TOKEN=testably_...
export TESTABLY_RUN_ID=<uuid-from-testably>

# 4. Run the tests. Results upload automatically when the suite finishes.
npx playwright test
```

No `TESTABLY_RUN_ID` yet? Create a run in Testably (Runs → "New Run") and copy
the run ID from the URL.

## Requirements

- Node.js ≥ 18
- `@playwright/test` ≥ 1.40
- Testably **Professional** plan or higher for real uploads
  (Free / Hobby / Starter plans receive HTTP 403 and the reporter logs an upgrade
  notice without failing CI — try `dryRun: true` to confirm connectivity.)

## Need a framework or CI that isn't here?

The reporter is a plain Playwright reporter — it works anywhere Playwright does.
Open an issue on [`github.com/kylejeon/testflow`](https://github.com/kylejeon/testflow/issues)
and we'll add your combination to this gallery.
