# Ship Cypress Test Results to Your QA Dashboard in 3 Lines
> 유형: SEO Blog
> 작성일: 2026-04-28
> 타겟 채널: Blog (testably.app/blog/cypress-reporter-ci-integration)
> 관련 기능: f028 Cypress Reporter SDK

---

**SEO Meta**
- **Title tag:** Ship Cypress Test Results to Your QA Dashboard in 3 Lines | Testably
- **Meta description:** @testably.kr/cypress-reporter — every Cypress run auto-syncs to Testably. One npm install, one setupNodeEvents line, three env vars.
- **Target keywords:** cypress reporter, cypress ci integration, cypress test results dashboard, CI test management, cypress testably
- **og:image suggestion:** Dark-themed code editor screenshot showing the `cypress.config.ts` setupNodeEvents setup with Testably dashboard result visible in split pane. Dimensions: 1200x630.
- **Canonical URL:** `https://testably.app/blog/cypress-reporter-ci-integration`

---

## The CI result blackhole

You run `npx cypress run` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information vanishes.

Maybe someone screenshots the terminal output and pastes it into Jira. Maybe a team lead manually updates the test run in your QA tool. Maybe — and this is the most common outcome — nobody does anything, and that run's results live and die inside the CI log, unavailable for trend analysis, unreachable from the test management dashboard where your team actually makes decisions.

This is the CI result blackhole: a gap between the automation infrastructure your developers manage and the QA workflow your testers live in. Both systems are doing their jobs. They're just not talking to each other.

---

## The usual workarounds and why they fail

Most teams patch this gap in one of three ways.

**Custom upload scripts.** Someone writes a Python or Node script that parses the JUnit XML output and POSTs it to the QA tool's API. Works until the QA tool's API changes, the script author leaves, or the XML format shifts after a Cypress upgrade. Maintenance cost: unpredictable.

**Jira as the bridge.** Every failed test automatically opens a Jira ticket. This is useful for bug tracking but it's not a QA dashboard. You still don't know pass rate trends, which test cases are consistently flaky, or how this run's results compare to the last milestone.

**Manual updates.** The QA lead opens the test management tool after every CI run and marks results by hand. Time cost: 10-30 minutes per run. Error rate: higher than anyone admits.

None of these solutions are wrong. They're just the wrong tool for the problem. What you actually want is the CI results flowing directly into your test case management platform — automatically, reliably, with zero manual steps.

---

## The fix: one reporter, three env vars

`@testably.kr/cypress-reporter` is a standard Cypress plugin that uploads your test results to Testably the moment the run completes — hooked into Cypress's `after:run` event.

Here is the entire setup.

**Step 1: Install the package**

```bash
npm install --save-dev @testably.kr/cypress-reporter
```

Peer dependency: `cypress >= 12.0.0`. Cypress 10 / 11 are past EOL and are not supported.

**Step 2: Register the plugin in `cypress.config.ts`**

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

On CommonJS projects (`cypress.config.js`)? The package ships both bundles — `require('@testably.kr/cypress-reporter')` works as-is.

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

That's it. Run `npx cypress run` and results appear in your Testably dashboard automatically.

---

## Mapping Cypress tests to Testably test cases

The reporter needs to know which Cypress test corresponds to which Testably test case. There are three strategies — pick the one that fits your team's workflow.

**Title strategy (easiest for existing suites)**

Put the Testably test case ID in brackets inside `it()` — or inside `describe()` for the whole block:

```ts
// cypress/e2e/login.cy.ts
describe('login', () => {
  it('[TC-42] user can log in with valid credentials', () => {
    cy.visit('/login');
    // ...
  });
});

// ID on describe works too — applies to all its children
describe('[TC-101] checkout flow', () => {
  it('happy path', () => { /* ... */ });
});
```

Set `testCaseIdSource: 'title'` in `setupTestablyReporter` (shown above). No other changes needed. UUIDs work in addition to `TC-<n>` format.

**Tag strategy**

Cypress doesn't have a native annotations API, so the community convention is to embed `@TC-<n>` as a token inside the title. The plugin enforces a whitespace boundary, so an email address like `user@domain.com` will not match accidentally:

```ts
it('should log in @TC-7', () => { /* ... */ });
it('@TC-12 checkout flow', () => { /* ... */ });
```

Set `testCaseIdSource: 'tag'`.

**Custom mapper (for teams with existing ID schemes)**

If your test file paths or titles already encode some identifier that maps to Testably IDs, you can supply a callback:

```ts
setupTestablyReporter(on, config, {
  testCaseIdSource: 'custom',
  mapTestCaseId: (fullTitle, filePath) => myMappingTable[filePath]?.[fullTitle],
});
```

Tests without a recognizable ID are skipped gracefully — the run summary tells you exactly how many:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

> **Why no annotation strategy?** Unlike Playwright, Cypress doesn't expose a `testInfo.annotations` API. If your team migrated from Playwright and relied on annotations there, the title or tag strategy is the direct equivalent in Cypress.

---

## What you see in the Testably dashboard

Once the reporter uploads results, your Testably test run reflects the full picture.

**Pass/fail status per test case.** Every mapped test case gets its result updated based on what Cypress reported. The mapping is direct:

| Cypress state | Testably status |
|---------------|-----------------|
| `passed` | `passed` |
| `failed` | `failed` |
| `pending` (`it.skip`, `describe.skip`) | `blocked` |
| `skipped` (dynamic skip or `before` failure) | `blocked` |

**Failure notes.** The first 800 characters of Cypress's `displayError` are attached as the Testably `note` on failed results. Stack trace, assertion diffs, and custom error messages surface directly in the test case view without leaving Testably. If Cypress retried a test (`retries: N` in your config), the note is prefixed with `Retried N time(s).` so you always know how many attempts it took.

**AI run summary.** Testably's AI run summary analyzes the uploaded results and generates a natural-language summary of what passed, what failed, and what patterns are worth investigating. This fires automatically on Professional plans.

**Flaky test detection.** If the same test case oscillates between `passed` and `failed` across multiple runs, Testably's flaky analysis flags it. With automated uploads from CI, this analysis now has real data to work with — not just manually-entered results.

**Trend charts.** The dashboard tracks pass rate over time. With CI uploads running on every merge to `main`, you get a continuous, reliable signal rather than sporadic manual data points.

---

## Before you go live: test the connection

Don't commit to a real run before you've verified the credentials work. Use dry-run mode:

```bash
TESTABLY_DRY_RUN=true npx cypress run
```

The reporter sends the request to the server (so auth and run ID are validated) but the server writes nothing to the database. You'll see:

```
[Testably] Dry run passed. (Run: "Nightly E2E", tier: 3)
```

You can also pass `dryRun: true` directly to `setupTestablyReporter`, or set `TESTABLY_DRY_RUN=true` inside `cypress.env.json` — all three routes resolve the same way.

If you see `Upload skipped: this feature requires a Professional plan or higher`, the token belongs to an account below Professional tier. Upgrade at **Billing → Plans** — the test run itself finishes with exit code 0, so CI isn't broken.

---

## Next steps

- **Generate a CI token:** Settings → CI/CD Tokens in your Testably workspace
- **Install:** `npm install --save-dev @testably.kr/cypress-reporter`
- **Full options reference:** [npm README](https://www.npmjs.com/package/@testably.kr/cypress-reporter)
- **Source:** [github.com/kylejeon/testflow](https://github.com/kylejeon/testflow/tree/main/packages/cypress)
- **Don't have a Testably account?** [Start free](https://testably.app) — no credit card required. CI/CD integration requires the Professional plan ($99/month flat-rate, up to 20 members).

Already using the Playwright reporter? `@testably.kr/cypress-reporter` is from the same family — both packages share `@testably.kr/reporter-core`, the same env vars, and the same error matrix. Same three secrets, same dashboard, different framework. Jest reporter is coming soon.

**About `1.0.1`:** stable API, SemVer-followed. No breaking changes without a major version bump — safe to pin in your CI.
