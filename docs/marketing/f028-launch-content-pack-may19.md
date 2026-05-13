# f028 — D-Day Launch Content Pack: Testably (May 19, 2026)
> 유형: Launch Content Pack
> 작성일: 2026-05-13
> 타겟 채널: Product Hunt / Twitter / LinkedIn / Email / Dev.to / Hacker News / Reddit
> 관련 기능: Testably Platform + @testably.kr/playwright-reporter 1.0.1 + @testably.kr/cypress-reporter 1.0.1
> 런칭 예정: 2026-05-19 (화) KST 16:00 = PT 00:00 PDT

---

> **How to use this file:**
> Work top to bottom. Each section is self-contained and copy-paste ready.
> Before posting, do a global search-replace on all `[PLACEHOLDER]` values listed in Section 5.
> Promo code `PRODUCTHUNT` is used verbatim — do not modify it.

---

## Section 1 — Pre-Launch Teasers

### 1-1. Twitter/X — D-3 (5/16 토, "Coming Tuesday" 톤)

> Target: 250 chars max. Actual: ~230 chars.

```
Coming Tuesday on Product Hunt:

Testably — QA test management with first-party Playwright & Cypress reporters built in.

3 env vars. Zero manual uploads. Free plan available.

Get notified early: [PH_COMING_SOON_URL]
```

---

### 1-2. Twitter/X — D-1 (5/18 월, "Tomorrow 9 AM PT" 톤)

> Target: 250 chars max. Actual: ~240 chars.

```
Tomorrow 9 AM PT on Product Hunt:

Testably is launching.

If you've ever copied CI results into a QA tool by hand — this one syncs automatically.

→ Playwright CI: 3 env vars
→ Cypress CI: same setup
→ AI run summaries
→ Free plan

[PH_COMING_SOON_URL]
```

---

### 1-3. LinkedIn — D-1 (5/18 월)

> Target: ~180 words. Actual: ~175 words.

```
Tomorrow we're launching Testably on Product Hunt.

The problem Testably was built to solve: CI pipelines finish running Playwright or Cypress tests, the results exist — and then they disappear into logs. Someone has to manually update the QA tool. Or write a one-off upload script. Or just leave the dashboard stale.

We built Testably to close that gap from the start. It's a QA test management platform with two first-party CI reporters built in — one for Playwright, one for Cypress. Same three env vars. Same five-minute setup. Every run lands in the dashboard automatically.

What you get:
- Test case management with milestone tracking and Jira sync
- Pass/fail per test case sourced from CI — not manually entered
- AI-generated run summaries on every upload
- Flaky test detection running on continuous CI data
- Flat-rate pricing — no per-seat fees

Launch goes live tomorrow at 9 AM PT (May 19).

If you'd like a heads-up when it's live, drop a comment and I'll ping you directly.

#QualityAssurance #Playwright #Cypress #DevTools
```

---

## Section 2 — D-Day Launch Copy (5/19 화 KST 16:00 라이브 직후)

---

### 2-1. Twitter/X Thread (7 tweets)

Post each tweet as a reply in the same thread. T1 starts the thread.

---

**T1 — Headline**

```
Testably is live on Product Hunt today.

QA test management + first-party Playwright and Cypress CI reporters — one platform, 5-minute setup.

Check it out and share your thoughts: [PH_LAUNCH_URL]
```

---

**T2 — Problem statement**

```
Here's the gap that exists in most CI pipelines:

Playwright finishes. 38 tests pass, 4 fail. The run exits.

And then nothing. Someone manually updates the QA dashboard — or writes a custom script — or doesn't bother.

That failure data, those flaky patterns, those trend lines — all of it stays trapped in the CI log.
```

---

**T3 — Solution**

```
Testably closes that gap.

It's a full QA test management platform — test cases, runs, milestones, Jira sync, AI summaries — with two CI reporters built in:

@testably.kr/playwright-reporter (hooks into onEnd)
@testably.kr/cypress-reporter (hooks into after:run)

Both are 1.0.1 stable on npm. MIT licensed.
```

---

**T4 — Playwright setup**

```
Playwright setup (3 lines in playwright.config.ts):

```ts
reporter: [
  ['list'],
  ['@testably.kr/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
],
```

Add 3 CI secrets: TESTABLY_URL, TESTABLY_TOKEN, TESTABLY_RUN_ID

Run npx playwright test — results land in Testably automatically.
```

---

**T5 — Cypress setup**

```
Cypress setup (same idea, cypress.config.ts):

```ts
import { setupTestablyReporter } from '@testably.kr/cypress-reporter';

setupNodeEvents(on, config) {
  setupTestablyReporter(on, config, {
    testCaseIdSource: 'title',
  });
  return config;
}
```

Same 3 env vars. Works with cypress-multi-reporters if you want HTML reports alongside.
```

---

**T6 — Platform features**

```
Once CI is wired up, Testably adds:

- AI run summary generated on every upload
- Flaky test detection running on continuous CI data
- Pass rate trend charts across every run
- Jira & GitHub issue sync
- TestRail importer (migrate in minutes)
- 13 built-in AI features across the platform

Flat-rate pricing — no per-seat fees. Starts free.
```

---

**T7 — CTA**

```
We'd love your feedback — especially from teams already on Playwright or Cypress in CI.

Check it out: [PH_LAUNCH_URL]

Use code PRODUCTHUNT for 3 months of Professional free (expires 2026-06-19, max 500).

npm i -D @testably.kr/playwright-reporter
npm i -D @testably.kr/cypress-reporter

testably.app — free plan, no credit card required.
```

---

### 2-2. LinkedIn Launch Post

> Target: 220-280 words. Actual: ~260 words.

```
Most CI pipelines have a quiet problem: the test results exist, and nobody sees them.

Playwright runs finish. Cypress runs finish. Pass/fail data lives in the CI log for 30 days and then disappears — while the QA dashboard stays manually updated, partially updated, or just stale.

We built Testably because that gap shouldn't require a custom upload script to close.

Testably is a QA test management platform — test cases, runs, milestones, Jira sync, 13 AI features — with two first-party CI reporters built in from the start.

Here's the entire Playwright setup:

```ts
// playwright.config.ts
reporter: [
  ['list'],
  ['@testably.kr/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
],
```

Add TESTABLY_URL, TESTABLY_TOKEN, TESTABLY_RUN_ID as CI secrets. Run your pipeline. Results appear in Testably automatically — pass/fail per test case, error messages as inline notes, AI run summary generated on landing.

The Cypress reporter works the same way. Same three env vars. Same dashboard. If you run both frameworks, one Testably workspace covers both.

Both packages are 1.0.1 stable on npm. MIT licensed.

We're launching on Product Hunt today. If you're on a team that's been copying CI results into a QA tool by hand — this is built for you.

Check it out: [PH_LAUNCH_URL]
Use code PRODUCTHUNT for 3 months of Professional free (expires June 19).

testably.app — free plan, no credit card required.

#QualityAssurance #Playwright #Cypress #DevTools #TestAutomation
```

---

### 2-3. Email Campaign — 기존 가입자 대상

#### Subject Line Options (A/B 테스트용)

```
Option A: Playwright & Cypress now auto-sync to your Testably dashboard
Option B: We're on Product Hunt today — and there's a 3-month free code inside
Option C: No more copying CI results by hand
```

#### Preheader

```
Testably just launched on Product Hunt. Use PRODUCTHUNT for 3 months of Pro free.
```

#### Email Body

```
Hey there,

Big day for us — Testably is live on Product Hunt right now.

If you've been waiting for Playwright or Cypress CI integration, it's here. Two first-party reporters — one for each framework — that automatically sync every CI run to your Testably dashboard.

The setup takes about 5 minutes:
- npm install @testably.kr/playwright-reporter (or cypress-reporter)
- Add one line to your config
- Add 3 env vars as CI secrets

That's it. Every run lands in Testably automatically — pass/fail per test case, error messages as inline notes on failed cases, AI run summary generated on landing.

Both reporters are 1.0.1 stable on npm. MIT licensed. They share the same three env vars, so if you run both Playwright and Cypress, one workspace covers both.

[See it on Product Hunt →] ([PH_LAUNCH_URL])

And as a thank-you to early users: use code PRODUCTHUNT at checkout for 3 months of Professional free. Expires June 19, 2026. First 500 only.

Thanks for being here,
Kyle

P.S. Code PRODUCTHUNT — 3 months Professional free. testably.app/pricing
```

> **CTA button text:** "See it on Product Hunt"

---

### 2-4. Dev.to Post — Playwright

```markdown
---
title: "How to sync Playwright CI results to your QA dashboard in 3 lines"
published: true
tags: playwright, testing, qa, cicd
canonical_url: https://testably.app/blog/playwright-reporter-ci-integration
cover_image: https://testably.app/og/playwright-reporter-ci-integration.png
---

If your Playwright CI results aren't automatically reaching your QA dashboard, you're losing data on every single run. Here's how to fix it in 5 minutes.

## The problem: the CI result gap

You run `npx playwright test` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information evaporates.

Maybe someone screenshots the terminal and pastes it into Jira. Maybe a team lead manually updates the test run in your QA tool. Maybe — and this is the most common outcome — nobody does anything, and that run's results live and die inside the CI log, invisible to trend analysis and unreachable from the test management dashboard where decisions get made.

This is the CI result gap: automation infrastructure and QA workflow running in parallel without talking to each other.

## Why the usual workarounds fail

**Custom upload scripts.** A Python or Node script parses JUnit XML and POSTs to the QA tool's API. Works until the API changes, the script author leaves, or the XML schema shifts after a Playwright upgrade.

**Jira as the bridge.** Failed tests open Jira tickets. Useful for bug tracking — but you still have no pass rate trends, no flaky test history, no milestone-level coverage view.

**Manual updates.** The QA lead updates the test management tool after every CI run. Time cost: 10–30 minutes per run. Error rate: higher than anyone admits.

## The fix: one reporter, three env vars

`@testably.kr/playwright-reporter` is a standard Playwright reporter that uploads your results to Testably the moment the run completes — hooked into Playwright's native `onEnd` event.

### Step 1: Install

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

Peer dependency: `@playwright/test >= 1.40.0`.

### Step 2: Add to `playwright.config.ts`

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['@testably.kr/playwright-reporter', {
      testCaseIdSource: 'title',
    }],
  ],
});
```

### Step 3: Add three CI secrets

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

That's the complete setup. Run `npx playwright test` and results appear in your Testably dashboard automatically. Works with GitHub Actions, GitLab CI, Jenkins — any runner that can execute `npx playwright test`.

## Mapping tests to test cases

Tag tests with `[TC-42]` in the title:

```ts
test('[TC-42] user can log in with valid credentials', async ({ page }) => {
  // ...
});
```

Tests without a recognizable ID are skipped gracefully — counted in a summary, not silently dropped:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

The reporter also supports annotation, tag, and custom mapper strategies. See the full README for details.

## What lands in the dashboard

- Pass/fail status per test case, sourced directly from CI
- Playwright error messages surfaced as inline notes on failed cases
- AI Run Summary generated automatically on every upload (Professional plan)
- Flaky test detection running on continuous CI data
- Pass rate trend charts across every run

## Before going live: dry run

Verify credentials before committing to a real run:

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

The reporter validates auth and run ID without writing any data. Useful for confirming secrets are wired up correctly.

## Get started

- **Install:** `npm install --save-dev @testably.kr/playwright-reporter`
- **Full docs:** [npmjs.com/package/@testably.kr/playwright-reporter](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
- **Testably account:** [testably.app](https://testably.app) — starts free, no credit card required
- **CI/CD integration** requires Testably Professional plan ($99/month flat-rate, up to 20 members)

Use code `PRODUCTHUNT` at checkout for 3 months of Professional free (expires June 19, 2026).

The Cypress reporter is live too — [How to sync Cypress CI results to your QA dashboard in 3 lines](https://dev.to/testably/how-to-sync-cypress-ci-results-to-your-qa-dashboard-in-3-lines) — same install flow, same three env vars, different framework.

`@testably.kr/playwright-reporter@1.0.1` — stable API, strict SemVer. Safe to pin in CI.

---

*We launched Testably on Product Hunt today. If this was useful, we'd appreciate you checking it out: [PH_LAUNCH_URL]*
```

---

### 2-5. Dev.to Post — Cypress

```markdown
---
title: "How to sync Cypress CI results to your QA dashboard in 3 lines"
published: true
tags: cypress, testing, qa, cicd
canonical_url: https://testably.app/blog/cypress-reporter-ci-integration
cover_image: https://testably.app/og/cypress-reporter-ci-integration.png
---

`@testably.kr/cypress-reporter@1.0.1` is stable on npm. One install, one `setupNodeEvents` call, three env vars — every Cypress CI run auto-syncs to Testably.

This is the sibling post to [How to sync Playwright CI results to your QA dashboard in 3 lines](https://dev.to/testably/how-to-sync-playwright-ci-results-to-your-qa-dashboard-in-3-lines). Same philosophy, Cypress-specific implementation.

## The problem: CI results that never reach the dashboard

You run `npx cypress run` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information evaporates.

Maybe someone screenshots the terminal and pastes it into Jira. Maybe a team lead manually updates the test run in your QA tool. Maybe — and this is the most common outcome — nobody does anything, and that run's results live and die in the CI log.

Your automation infrastructure and your QA workflow are running in parallel without talking to each other.

## Why the usual workarounds fail

**cypress-multi-reporters alone.** Generates JUnit XML or HTML locally, but doesn't send that data to your test management platform. You still need a custom script to bridge the gap.

**Manual updates.** The QA lead updates the test management tool after every run. Time cost: 10–30 minutes. Error rate: higher than anyone admits.

**Jira tickets per failure.** Useful for bug tracking, but you get no pass rate trends, no flaky test history, no milestone-level coverage view.

## The fix: one plugin, three env vars

`@testably.kr/cypress-reporter` is a Cypress plugin that uploads test results to Testably the moment the run completes — hooked into Cypress's native `after:run` event.

### Step 1: Install

```bash
npm install --save-dev @testably.kr/cypress-reporter
```

Peer dependency: `cypress >= 12.0.0`.

### Step 2: Register in `cypress.config.ts`

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

CommonJS project? `require('@testably.kr/cypress-reporter')` works — the package ships both ESM and CJS bundles.

### Step 3: Add three CI secrets

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

Run `npx cypress run` and results appear in Testably automatically.

## Mapping Cypress tests to test cases

**Title strategy (easiest for existing suites)**

```ts
describe('login', () => {
  it('[TC-42] user can log in with valid credentials', () => {
    cy.visit('/login');
    // ...
  });
});

// ID on describe applies to all children
describe('[TC-101] checkout flow', () => {
  it('happy path', () => { /* ... */ });
});
```

**Tag strategy**

```ts
it('should log in @TC-7', () => { /* ... */ });
```

The plugin enforces a whitespace boundary so email addresses (`user@domain.com`) don't match accidentally.

Tests without a recognizable ID are skipped gracefully:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

## Cypress status mapping

| Cypress state | Testably status |
|---|---|
| `passed` | `passed` |
| `failed` | `failed` |
| `pending` (`it.skip`) | `blocked` |
| `skipped` | `blocked` |

If Cypress retried a test, the failure note is prefixed with `Retried N time(s).`

## What lands in the dashboard

- Pass/fail per test case, sourced directly from Cypress CI
- Cypress error messages surfaced as inline notes on failed cases
- AI Run Summary generated automatically on every upload (Professional plan)
- Flaky test detection running on continuous CI data
- Pass rate trend charts across every run

## Works with cypress-multi-reporters

If your team already uses `cypress-multi-reporters` for HTML + JUnit output, the Testably reporter integrates cleanly alongside it:

```js
// .mocharc.js or reporter config
module.exports = {
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'mochawesome, @testably.kr/cypress-reporter',
    // ...
  },
};
```

## Before going live: dry run

```bash
TESTABLY_DRY_RUN=true npx cypress run
```

Validates auth and run ID without writing any data. You can also pass `dryRun: true` directly to `setupTestablyReporter`.

## Get started

- **Install:** `npm install --save-dev @testably.kr/cypress-reporter`
- **Full docs:** [npmjs.com/package/@testably.kr/cypress-reporter](https://www.npmjs.com/package/@testably.kr/cypress-reporter)
- **Testably account:** [testably.app](https://testably.app) — starts free, no credit card required
- **CI/CD integration** requires Testably Professional plan ($99/month flat-rate, up to 20 members)

Use code `PRODUCTHUNT` at checkout for 3 months of Professional free (expires June 19, 2026).

Already on the Playwright reporter? Same three env vars, same dashboard. See the sibling post: [How to sync Playwright CI results to your QA dashboard in 3 lines](https://dev.to/testably/how-to-sync-playwright-ci-results-to-your-qa-dashboard-in-3-lines).

`@testably.kr/cypress-reporter@1.0.1` — stable API, strict SemVer. Safe to pin in CI.

---

*We launched Testably on Product Hunt today. If this was useful, we'd appreciate you checking it out: [PH_LAUNCH_URL]*
```

---

### 2-6. Show HN (KST 22:00 = PT 06:00)

#### Title

```
Show HN: Testably – QA test management with Playwright + Cypress CI sync (testably.app)
```

#### OP Comment (post immediately after submission, ~150 words)

```
Hey HN — Kyle here, founder of Testably (https://testably.app).

We shipped two CI reporter packages this week:

- @testably.kr/playwright-reporter@1.0.1 (hooks into Playwright's onEnd)
- @testably.kr/cypress-reporter@1.0.1 (hooks into Cypress's after:run)

The problem they solve: there's a persistent gap between where automated tests run (CI) and where QA teams actually work (a test management tool). Both reporters hook into the framework's native completion event, batch results, and POST them to the Testably backend automatically. Tag tests with [TC-42] in the title and results map to existing test cases. Tests without an ID are counted and skipped — not silently dropped.

Setup is three env vars (TESTABLY_URL, TESTABLY_TOKEN, TESTABLY_RUN_ID) plus one config line. Both packages share @testably.kr/reporter-core — same auth, same retry/backoff logic. We ship dryRun mode so you can validate credentials without writing data.

The Testably platform itself is a test case management SaaS — test cases, runs, milestones, Jira sync, 13 built-in AI features, flat-rate pricing (not per-seat). Free plan available; CI integration requires Professional ($99/month, up to 20 members).

Happy to go deep on the TC ID matching logic, the after:run batching approach, or the upload-ci-results edge function architecture. And yes, Jest reporter is next.

(Launching on Product Hunt today too — promo code PRODUCTHUNT for 3 months Pro free if anyone wants to try it.)
```

---

### 2-7. Reddit r/QualityAssurance (KST 익일 00:00)

#### Title

```
[Discussion] Auto-syncing Playwright/Cypress CI results to test management tools — built a free reporter, happy to answer questions
```

#### Body (~200 words)

```
Been lurking here for a while and wanted to share something we built that directly addresses a pattern I kept seeing discussed: the gap between CI automation and test management dashboards.

The setup at most teams I talked to: Playwright or Cypress runs in CI, results appear in the terminal, and then they're gone. Someone manually updates the QA tool — or writes a one-off script that's held together with duct tape — or just doesn't bother, leaving the dashboard stale.

We built first-party reporters for both frameworks that close this gap automatically:

- @testably.kr/playwright-reporter — hooks into Playwright's onEnd event
- @testably.kr/cypress-reporter — hooks into Cypress's after:run event

Both are on npm (1.0.1, MIT), and the setup is three env vars plus one config line. Tag your tests with [TC-42] in the title and results map to your test cases automatically. Tests without an ID are counted and skipped gracefully, not silently dropped.

We also built dryRun mode specifically because misconfigured CI secrets are a common failure point — validate credentials before committing to a real run.

Curious whether this matches the pattern others have seen, and what workarounds your teams are currently using.

---

Maker here — happy to answer any questions about implementation or the tradeoffs we made. We launched on Product Hunt today if anyone wants to check out the full platform: [PH_LAUNCH_URL]
```

---

## Section 3 — PH Comment Response Templates (FAQ)

> All responses are paste-ready. Personalize the opening line if the commenter used a name.

---

**Q1: "What makes this different from TestRail / Zephyr / Xray?"**

```
Great question — a few things stand out:

First, CI integration is a first-class feature here, not a plugin or an afterthought. The Playwright and Cypress reporters are built and maintained by us, not third-party connectors.

Second, pricing: Testably is flat-rate per team, not per-seat. TestRail, Zephyr, and Xray all charge per user — costs scale with headcount. We don't.

Third, setup time. TestRail's onboarding typically takes days to weeks for a team migration. Testably is designed to be running in under 5 minutes.

And we have 13 built-in AI features — run summaries, flaky detection, coverage gap analysis, risk prediction — that are native to the platform, not add-ons.

Pricing starts free: https://testably.app/pricing
```

---

**Q2: "Does it work with our CI provider (X)?"**

```
Most likely yes — the reporters are framework-level, not CI-provider-level.

Both @testably.kr/playwright-reporter and @testably.kr/cypress-reporter work anywhere you can run `npx playwright test` or `npx cypress run`. That includes GitHub Actions, GitLab CI, Jenkins, CircleCI, Bitbucket Pipelines, and any other runner that supports Node.js.

Setup is three environment variables (TESTABLY_URL, TESTABLY_TOKEN, TESTABLY_RUN_ID) as CI secrets, plus one line in your config file. If your CI can set env vars and run npm scripts, it works.

If you hit anything unexpected with your specific setup, open an issue on GitHub or drop details here — happy to help debug.
```

---

**Q3: "Is the reporter open source?"**

```
Both reporters are MIT licensed and published on npm — you can inspect the full source there.

@testably.kr/playwright-reporter: https://www.npmjs.com/package/@testably.kr/playwright-reporter
@testably.kr/cypress-reporter: https://www.npmjs.com/package/@testably.kr/cypress-reporter

The shared core (@testably.kr/reporter-core) is also MIT. The Testably platform itself (the web app and backend) is closed source — that's the SaaS side.

If you find a bug or want to contribute to the reporter packages, issues and PRs are welcome.
```

---

**Q4: "How do you map test results to existing test cases?"**

```
The reporter supports four strategies for matching CI results to Testably test cases:

1. **Title** (default): include [TC-42] anywhere in the test name — `test('[TC-42] login works', ...)`
2. **Annotation**: use Playwright's `test.info().annotations` to attach a TC ID programmatically
3. **Tag**: include @TC-42 in the test title (Cypress-style tag syntax also supported)
4. **Custom mapper**: provide your own function that receives the test result and returns a TC ID

Tests without a recognizable ID are counted in a summary and skipped gracefully — they don't cause errors, and you can see how many unmapped results came through.

If you have an existing test suite you want to instrument without touching every test title, the annotation or custom mapper strategies give you the most flexibility.
```

---

**Q5: "What if our test names don't include test case IDs?"**

```
Totally valid concern — retrofitting [TC-42] tags into an existing suite of hundreds of tests is painful.

A few practical options:

1. **Custom mapper**: pass a function to testCaseIdSource that derives the TC ID from the test path, file name, or any other property — no test name changes needed.
2. **Gradual rollout**: start tagging new tests going forward. Untagged tests are skipped without error and counted in the summary.
3. **Annotation strategy**: Playwright supports test.info().annotations, so you can attach TC IDs in beforeEach hooks or test fixtures without touching test titles.

We built the graceful skip behavior specifically for teams with large existing suites — you don't have to tag everything before you start seeing value.
```

---

**Q6: "Is there an API?"**

```
Yes — Testably has a REST API with project-scoped API tokens.

You can use it to create test runs, update test case results, manage test cases, and query run history programmatically. The CI reporters use the same API surface internally, so anything you see flowing through the reporter is also accessible directly.

API tokens are available on all paid plans (Hobby and above). Documentation is at testably.app/docs — and if you need a specific endpoint that isn't covered, let us know. Happy to prioritize based on actual use cases.
```

---

**Q7: "Do you support webhook events?"**

```
Yes — Testably supports custom webhooks with per-event channel configuration.

You can subscribe to events like test run completed, milestone status changes, test case failures, and team activity. Each event type can route to a separate endpoint if needed.

Webhook configuration is available on Starter plan and above. Slack and Microsoft Teams notifications are also built in on Starter+, if you want team alerts without wiring up a custom webhook.

If you need a specific event type that isn't in the current list, drop the use case here — we track feature requests from comments like these.
```

---

**Q8: "How does pricing work for larger teams?"**

```
Testably uses flat-rate team pricing — no per-seat fees.

The tiers by team size:
- Free: up to 2 members, 1 project, 100 test cases — permanently free
- Hobby: $19/mo — up to 5 members, 3 projects
- Starter: $49/mo — up to 5 members, 10 projects, unlimited test cases
- Professional: $99/mo — up to 20 members, unlimited everything, CI reporters
- Enterprise S: $249/mo — 21–50 members
- Enterprise M: $499/mo — 51–100 members
- Enterprise L: custom pricing — 100+ members

CI/CD integration (the Playwright and Cypress reporters) requires Professional plan. For a team of 10, that's $9.90/person/month — and the price doesn't go up when you add the 11th member.

Full pricing: https://testably.app/pricing
```

---

**Q9: "Can we self-host?"**

```
Not currently — Testably is a hosted SaaS. Self-hosted deployment isn't on the current roadmap for the standard tiers.

Enterprise L (100+ members, custom pricing) includes dedicated infrastructure options — if your compliance requirements need data residency or isolated infrastructure, that's the right conversation to have. Reach out at the Enterprise inquiry link on the pricing page.

If self-hosting is a hard requirement for your team at a smaller scale, I'd be curious about the specific driver (data sovereignty, air-gap network, etc.) — it helps us understand how common this is and whether it should move up the roadmap.
```

---

**Q10: "What about iOS/Android testing? Appium?"**

```
Appium support isn't available yet — the current CI reporters are Playwright and Cypress only, both targeting web/browser automation.

Mobile testing (Appium, XCTest, Espresso) is on the roadmap. We're building toward it, but I don't want to give a timeline I can't commit to — watch the changelog at testably.app for updates.

In the meantime, if your team runs both web and mobile tests, you can use Testably for the web-side test case management and CI sync today, and mobile test cases can be managed manually in the platform (the test case management features work independently of CI reporters).

If Appium integration is critical for your team's evaluation, let me know — it helps prioritize.
```

---

## Section 4 — D-Day Timeline Checklist

| 시각 (KST) | 액션 | 채널 | 카피 위치 (이 문서 내) |
|---|---|---|---|
| 16:00 | PH 페이지 라이브 확인. 라이브 즉시 Maker Comment paste (f028-product-hunt-launch.md §7) | Product Hunt | f028-product-hunt-launch.md §Maker Comment |
| 16:05 | Twitter thread 발사 (T1~T7 순서대로 reply-chain으로) | Twitter/X | §2-1 |
| 16:10 | LinkedIn 포스트 게시 | LinkedIn | §2-2 |
| 16:15 | 이메일 캠페인 발송 (기존 가입자 전체) | Email (Loops.so) | §2-3 |
| 17:00 | Dev.to Playwright 편 게시 | Dev.to | §2-4 |
| 17:05 | Dev.to Cypress 편 게시 (Playwright 편에 cross-link 확인 후) | Dev.to | §2-5 |
| 22:00 | Show HN 포스트 (제목 + OP 댓글 즉시 게시) | Hacker News | §2-6 |
| 익일 00:00 | Reddit r/QualityAssurance 포스트 | Reddit | §2-7 |
| 16:00 ~ 24:00 | PH 댓글 30분 이내 응답 (목표: 모든 댓글). FAQ 템플릿 §3 활용. | Product Hunt | §3 |

**Notes:**
- PH와 HN은 같은 6시간 윈도우에 동시 고노출 금지. 스케줄 그대로 유지 (PH 16:00, HN 22:00).
- Dev.to 두 편은 Playwright → Cypress 순서로 게시. Cypress 편이 Playwright 편 URL을 cross-link하므로 반드시 Playwright 먼저.
- 이메일 발송 전 subject line A/B 옵션 중 하나 선택 후 Loops.so에 설정.

---

## Section 5 — Placeholder 목록

D-day 전에 아래 5개 placeholder를 전부 채운 뒤 전체 파일에서 검색-치환(Find & Replace)하세요.

| Placeholder | 설명 | 확정값 / 채우는 시점 |
|---|---|---|
| `[PH_LAUNCH_URL]` | Product Hunt 라이브 URL | 현재 가정값: `https://www.producthunt.com/posts/testably`. D-day 16:00 KST 라이브 후 실제 URL로 교체. |
| `[PH_COMING_SOON_URL]` | PH "Coming Soon" 페이지 URL | D-3 (5/16) 전까지 PH에서 Coming Soon 페이지 생성 후 채움. 없으면 `[PH_LAUNCH_URL]`로 대체. |
| `[LOOM_DEMO_URL]` | 제품 데모 Loom URL | D-5~D-3 (5/14~5/16) 사이 녹화 후 채움. PH 갤러리 또는 Maker Comment에 추가 활용 가능. |
| `[CEO_TWITTER_HANDLE]` | Kyle 본인 트위터 핸들 | 계정 확정 시 채움. 없으면 빈 칸으로 두거나 섹션에서 제거. |
| `[GETTESTABLY_TWITTER]` | Testably 공식 트위터 | 확정값: `@gettestably` |

---

*End of Launch Content Pack. All copy above is final and copy-paste ready.*
*Fill in all 5 placeholders before D-day (2026-05-19 KST 16:00).*
*Promo code PRODUCTHUNT — 3 months Professional free, expires 2026-06-19, max 500 redemptions.*
