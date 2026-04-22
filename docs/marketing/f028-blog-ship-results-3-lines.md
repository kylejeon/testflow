# Ship Your Playwright Test Results to Testably in 3 Lines
> 유형: SEO Blog
> 작성일: 2026-04-22
> 타겟 채널: Blog (testably.app/blog)
> 관련 기능: f028 Playwright Reporter SDK

---

**SEO Meta**
- **Title tag:** Ship Playwright Test Results to Your QA Dashboard in 3 Lines | Testably
- **Meta description:** Stop losing CI test data. `@testably/playwright-reporter` syncs every Playwright run to Testably automatically — one npm install, one config line, three env vars.
- **Target keywords:** playwright reporter, playwright ci integration, playwright test results dashboard, CI test management, playwright testably
- **og:image suggestion:** Dark-themed code editor screenshot showing the 3-line `playwright.config.ts` setup with Testably dashboard result visible in split pane. Dimensions: 1200x630.
- **Canonical URL:** `https://testably.app/blog/playwright-reporter-ci-integration`

---

## The CI result blackhole

You run `npx playwright test` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information vanishes.

Maybe someone screenshots the terminal output and pastes it into Jira. Maybe a team lead manually updates the test run in your QA tool. Maybe — and this is the most common outcome — nobody does anything, and that run's results live and die inside the CI log, unavailable for trend analysis, unreachable from the test management dashboard where your team actually makes decisions.

This is the CI result blackhole: a gap between the automation infrastructure your developers manage and the QA workflow your testers live in. Both systems are doing their jobs. They're just not talking to each other.

---

## The usual workarounds and why they fail

Most teams patch this gap in one of three ways.

**Custom upload scripts.** Someone writes a Python or Node script that parses the JUnit XML output and POSTs it to the QA tool's API. Works until the QA tool's API changes, the script author leaves, or the XML format shifts after a Playwright upgrade. Maintenance cost: unpredictable.

**Jira as the bridge.** Every failed test automatically opens a Jira ticket. This is useful for bug tracking but it's not a QA dashboard. You still don't know pass rate trends, which test cases are consistently flaky, or how this run's results compare to the last milestone.

**Manual updates.** The QA lead opens the test management tool after every CI run and marks results by hand. Time cost: 10-30 minutes per run. Error rate: higher than anyone admits.

None of these solutions are wrong. They're just the wrong tool for the problem. What you actually want is the CI results flowing directly into your test case management platform — automatically, reliably, with zero manual steps.

---

## The fix: one reporter, three env vars

`@testably/playwright-reporter` is a standard Playwright reporter plugin that uploads your test results to Testably the moment the run completes.

Here is the entire setup.

**Step 1: Install the package**

```bash
npm install --save-dev @testably/playwright-reporter
```

Peer dependency: `@playwright/test >= 1.40.0`.

**Step 2: Add the reporter to `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],  // keep your existing reporters
    ['@testably/playwright-reporter', {
      testCaseIdSource: 'title',
    }],
  ],
});
```

**Step 3: Add three secrets to your CI provider**

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

- `TESTABLY_URL` — your Testably workspace URL, e.g. `https://app.testably.app`
- `TESTABLY_TOKEN` — a CI token generated in **Settings → CI/CD Tokens** (format: `testably_<32 hex chars>`)
- `TESTABLY_RUN_ID` — the UUID of the Testably test run you want to populate

That's it. Run `npx playwright test` and results appear in your Testably dashboard automatically.

---

## Mapping Playwright tests to Testably test cases

The reporter needs to know which Playwright test corresponds to which Testably test case. There are four strategies — pick the one that fits your team's workflow.

**Title strategy (easiest for existing suites)**

Put the Testably test case ID in brackets anywhere in the test title:

```ts
test('[TC-42] user can log in with valid credentials', async ({ page }) => {
  // ...
});
```

Set `testCaseIdSource: 'title'` in your config (shown above). No other changes needed.

**Annotation strategy (cleanest for new suites)**

Use Playwright's native annotation system. This keeps the title readable and the metadata separate:

```ts
test('user can log in with valid credentials', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: 'testably', description: 'TC-42' });
  // ...
});
```

Set `testCaseIdSource: 'annotation'` (this is also the default if you don't specify).

**Tag strategy**

```ts
test('user can log in @TC-42', async ({ page }) => { /* ... */ });
```

**Custom mapper (for teams with existing ID schemes)**

If your test file paths or titles already encode some identifier that maps to Testably IDs, you can supply a callback:

```ts
reporter: [['@testably/playwright-reporter', {
  testCaseIdSource: 'custom',
  mapTestCaseId: (title, filePath) => myMappingTable[filePath]?.[title],
}]]
```

Tests without a recognizable ID are skipped gracefully — the run summary tells you exactly how many:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

---

## What you see in the Testably dashboard

Once the reporter uploads results, your Testably test run reflects the full picture:

**Pass/fail status per test case.** Every mapped test case gets its result updated — `passed`, `failed`, `blocked`, or `untested` — based on what Playwright reported. `failed` and `timedOut` map to `failed`; `skipped` and `interrupted` map to `blocked`.

**Failure notes.** The first 800 characters of Playwright's error message are attached as the Testably `note` on failed results. That means the stack trace, expected vs. received values, and any custom error messages surface directly in the test case view without leaving Testably.

**AI run summary.** Testably's AI run summary analyzes the uploaded results and generates a natural-language summary of what passed, what failed, and what patterns are worth investigating. This fires automatically on Professional plans.

**Flaky test detection.** If the same test case oscillates between `passed` and `failed` across multiple runs, Testably's flaky analysis flags it. With automated uploads from CI, this analysis now has real data to work with — not just manually-entered results.

**Trend charts.** The dashboard tracks pass rate over time. With CI uploads running on every merge to `main`, you get a continuous, reliable signal rather than sporadic manual data points.

---

## Before you go live: test the connection

Don't commit to a real run before you've verified the credentials work. Use dry-run mode:

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

The reporter sends the request to the server (so auth and run ID are validated) but the server writes nothing to the database. You'll see:

```
[Testably] Dry run passed. (Run: "Sprint 42 Regression", tier: 3)
```

If you see `Upload skipped: this feature requires a Professional plan (current: Hobby)`, the token belongs to an account below Professional tier. Upgrade at **Billing → Plans** — the test run itself finishes with exit code 0, so CI isn't broken.

---

## Next steps

- **Generate a CI token:** Settings → CI/CD Tokens in your Testably workspace
- **Install:** `npm install --save-dev @testably/playwright-reporter`
- **Full options reference:** [npm README](https://www.npmjs.com/package/@testably/playwright-reporter)
- **Don't have a Testably account?** [Start free](https://testably.app) — no credit card required. CI/CD integration requires the Professional plan ($99/month flat-rate, up to 20 members).

Cypress and Jest reporter support is coming soon as part of the same SDK family (`@testably/cypress-reporter`, `@testably/jest-reporter`). If your team uses multiple frameworks, watch the changelog.
