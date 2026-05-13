# f028 — Launch Actions Bundle: Playwright (retroactive 5/11) + Cypress (5/13)
> 유형: Launch Actions Bundle
> 작성일: 2026-05-13
> 타겟 채널: Product Hunt / Dev.to / Twitter / Hacker News / LinkedIn
> 관련 기능: f028 Playwright Reporter SDK 1.0.1, Cypress Reporter SDK 1.0.1

---

> **How to use this file:** Each section is a self-contained, copy-paste-ready block.
> Work through sections A → F in order on launch day. No further editing required —
> fill in `[LINK]` placeholders with live URLs before posting.

---

## Section A — Product Hunt

### A3. Recommendation (read first)

**Recommended: Option A2 — Single combined launch ("SDK family" framing).**

Rationale: 5/11 external actions were never executed (no PH listing, no Dev.to, no HN),
so there is no duplicate-submission risk. A combined launch leads with the broader story
("Playwright + Cypress reporters, same 3 env vars, one dashboard") which is a stronger
hook than either reporter alone. It also avoids the awkward optics of a "sub-launch"
appearing two days after a launch that the community never actually saw.

Use Option A1 only if PH's system flags the combined listing as duplicate of an
unreleased draft that was never submitted publicly.

---

### A1. Cypress Sub-launch (fallback option — use only if combined launch is blocked)

**Product name:** Testably Cypress Reporter

**Tagline (55 chars):**
```
Cypress CI results, live in Testably. Zero manual uploads.
```

**Description (260 chars):**
```
@testably.kr/cypress-reporter closes the gap between your Cypress CI pipeline and your QA dashboard. One npm install, one setupNodeEvents line, three env vars. Every run auto-syncs — pass/fail, failure notes, timing. AI analysis fires on landing. Professional plan.
```

**Hunter intro comment:**

Hey Product Hunt — Kyle here, founder of Testably.

Two days ago we shipped the Playwright reporter. Today the Cypress side of the family is live: `@testably.kr/cypress-reporter@1.0.1`.

Same philosophy: hook into the framework's native event (`after:run`), batch results, upload automatically when the run finishes. Tag your specs with `[TC-42]` in `it()` or `describe()` and results map to your Testably test cases without a config file.

Three env vars. One `setupNodeEvents` call. No custom upload scripts.

We built this because we were tired of Cypress runs disappearing into CI logs. The pass/fail data exists — it just never made it to the dashboard where the QA team actually works.

Full setup in 5 minutes: `npm install --save-dev @testably.kr/cypress-reporter`

Drop questions in the comments or open an issue. Happy to help with setup.

**Gallery image captions (3 images):**
- Image 1: "Before: Cypress results die in the CI log. After: Every run lands in Testably automatically."
- Image 2: "One setupNodeEvents call. Three env vars. That's the full setup."
- Image 3: "Pass/fail per test case, failure notes, AI run summary — all from your Cypress CI run."

---

### A2. Combined Launch — Playwright + Cypress "SDK Family" (recommended)

**Product name:** Testably CI Reporters — Playwright & Cypress

**Tagline (58 chars):**
```
Playwright + Cypress CI results, auto-synced to Testably.
```

**Description (260 chars):**
```
Two reporters. Same 3 env vars. Every Playwright and Cypress CI run lands in your Testably QA dashboard automatically — pass/fail, failure notes, timing. AI analysis fires on landing. No custom scripts. No manual uploads. Professional plan, flat-rate pricing.
```

**Hunter intro comment (post immediately after submission goes live):**

Hey Product Hunt — Kyle here, founder of Testably.

We spent the last few months building the piece that's always been missing between CI and test management: reporters that actually close the loop automatically.

Today both are stable on npm:

- `@testably.kr/playwright-reporter@1.0.1` — hooks into Playwright's `onEnd`
- `@testably.kr/cypress-reporter@1.0.1` — hooks into Cypress's `after:run`

Both share the same core (`@testably.kr/reporter-core`), the same three env vars (`TESTABLY_URL`, `TESTABLY_TOKEN`, `TESTABLY_RUN_ID`), and land results in the same Testably dashboard — where your team writes test cases, tracks milestones, and gets AI run summaries.

The setup is genuinely 5 minutes. Install the package, add one line to your config, add three CI secrets. That's it. We built `dryRun` mode so you can verify credentials before committing to a real run — no silent misconfiguration.

What lands in the dashboard once it's wired up:
- Pass/fail per test case, sourced from CI (not manually entered)
- Playwright/Cypress error messages surfaced as inline notes on failed cases
- AI Run Summary generated automatically on every upload
- Flaky test detection running on continuous CI data
- Pass rate trend charts across every run

Requires Testably Professional plan ($99/month flat-rate, up to 20 members). Start free at testably.app — no credit card required.

Jest reporter is coming next. If you use multiple frameworks, watch the changelog.

Drop questions in the comments or open an issue on GitHub. If you're already using Testably: try it today and let us know what you think.

**Gallery image captions (3 images — same assets as A1, update text):**
- Image 1: "CI results used to die in the terminal. Now they land in Testably automatically."
- Image 2: "Playwright or Cypress — same 3 env vars, same 5-minute setup."
- Image 3: "Pass/fail, failure notes, AI summary, flaky detection — in one dashboard."

---

## Section B — Dev.to Crossposts

### B1. Playwright Post (retroactive — was not published on 5/11, post today)

Copy-paste the entire block below as a new Dev.to post. The frontmatter is Dev.to-compatible.
Set `published: true` only when you are ready to go live.

```markdown
---
title: "Ship Your Playwright Test Results to a QA Dashboard in 3 Lines"
published: true
tags: playwright, qa, testing, ci, devops
canonical_url: https://testably.app/blog/playwright-reporter-ci-integration
cover_image: https://testably.app/og/playwright-reporter-ci-integration.png
---

If your Playwright CI results aren't automatically syncing to your QA dashboard,
you're losing data on every single run. Here's how to fix it in 5 minutes.

## The CI result blackhole

You run `npx playwright test` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information vanishes.

Maybe someone screenshots the terminal output and pastes it into Jira. Maybe a team
lead manually updates the test run in your QA tool. Maybe — and this is the most
common outcome — nobody does anything, and that run's results live and die inside the
CI log, unavailable for trend analysis, unreachable from the test management dashboard
where your team actually makes decisions.

This is the CI result blackhole: a gap between the automation infrastructure your
developers manage and the QA workflow your testers live in. Both systems are doing
their jobs. They're just not talking to each other.

## The usual workarounds and why they fail

Most teams patch this gap in one of three ways.

**Custom upload scripts.** Someone writes a Python or Node script that parses the
JUnit XML output and POSTs it to the QA tool's API. Works until the QA tool's API
changes, the script author leaves, or the XML format shifts after a Playwright upgrade.
Maintenance cost: unpredictable.

**Jira as the bridge.** Every failed test automatically opens a Jira ticket. Useful
for bug tracking but not a QA dashboard. You still don't know pass rate trends, which
test cases are consistently flaky, or how this run's results compare to the last milestone.

**Manual updates.** The QA lead opens the test management tool after every CI run and
marks results by hand. Time cost: 10-30 minutes per run. Error rate: higher than anyone
admits.

What you actually want is CI results flowing directly into your test case management
platform — automatically, reliably, with zero manual steps.

## The fix: one reporter, three env vars

`@testably.kr/playwright-reporter` is a standard Playwright reporter plugin that
uploads your test results to Testably the moment the run completes.

**Step 1: Install**

```bash
npm install --save-dev @testably.kr/playwright-reporter
```

Peer dependency: `@playwright/test >= 1.40.0`.

**Step 2: Add to `playwright.config.ts`**

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

**Step 3: Add three CI secrets**

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

That's the entire setup. Run `npx playwright test` and results appear in your
Testably dashboard automatically.

## Mapping tests to test cases

Tag your tests with `[TC-42]` in the title (or use annotations):

```ts
test('[TC-42] user can log in with valid credentials', async ({ page }) => {
  // ...
});
```

Tests without a recognizable ID are skipped gracefully:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

The reporter also supports annotation, tag, and custom mapper strategies — see the
full README for details.

## What lands in the dashboard

- Pass/fail status per test case, sourced directly from Playwright
- Playwright error messages surfaced as inline notes on failed cases
- AI Run Summary generated automatically on every upload (Professional plan)
- Flaky test detection running on continuous CI data
- Pass rate trends across every run

## Before you go live: dry run

Verify credentials before committing to a real run:

```bash
TESTABLY_DRY_RUN=true npx playwright test
```

The reporter validates auth and run ID without writing any data.

## Get started

- **Install:** `npm install --save-dev @testably.kr/playwright-reporter`
- **Full docs:** [npmjs.com/package/@testably.kr/playwright-reporter](https://www.npmjs.com/package/@testably.kr/playwright-reporter)
- **Testably account:** [testably.app](https://testably.app) — starts free, no credit card required
- **CI/CD integration** requires Testably Professional plan ($99/month flat-rate, up to 20 members)

Cypress reporter (`@testably.kr/cypress-reporter@1.0.1`) is also live today — same
install flow, hooks into `after:run`. Jest reporter is coming soon.

`1.0.1` = stable API, SemVer-followed. Safe to pin in CI.
```

---

### B2. Cypress Post (publish today, 5/13)

Copy-paste the entire block below as a new Dev.to post.

```markdown
---
title: "Ship Cypress Test Results to Your QA Dashboard in 3 Lines"
published: true
tags: cypress, qa, testing, ci, devops
canonical_url: https://testably.app/blog/cypress-reporter-ci-integration
cover_image: https://testably.app/og/cypress-reporter-ci-integration.png
---

`@testably.kr/cypress-reporter@1.0.1` is live on npm today. One install, one
`setupNodeEvents` call, three env vars — every Cypress run auto-syncs to Testably.

## The CI result blackhole

You run `npx cypress run` in CI. 42 tests pass. 3 fail. The pipeline exits.

And then the information vanishes.

Maybe someone screenshots the terminal and pastes it into Jira. Maybe a team lead
manually updates the test run in your QA tool. Maybe — and this is the most common
outcome — nobody does anything, and that run's results live and die inside the CI log.

This is the gap between the automation infrastructure your developers manage and the
QA workflow your testers live in. Both systems are doing their jobs. They're just not
talking to each other.

## The fix: one plugin, three env vars

`@testably.kr/cypress-reporter` is a standard Cypress plugin that uploads your test
results to Testably the moment the run completes — hooked into Cypress's `after:run`
event.

**Step 1: Install**

```bash
npm install --save-dev @testably.kr/cypress-reporter
```

Peer dependency: `cypress >= 12.0.0`.

**Step 2: Register in `cypress.config.ts`**

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

CommonJS project? `require('@testably.kr/cypress-reporter')` works — the package
ships both ESM and CJS bundles.

**Step 3: Add three CI secrets**

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

The plugin enforces a whitespace boundary so email addresses (`user@domain.com`)
don't match accidentally.

Tests without a recognizable ID are skipped gracefully:

```
[Testably] 42 tests run, 38 mapped to Testably, 4 skipped (no TC ID)
```

## Cypress → Testably status mapping

| Cypress state | Testably status |
|---|---|
| `passed` | `passed` |
| `failed` | `failed` |
| `pending` (`it.skip`) | `blocked` |
| `skipped` | `blocked` |

If Cypress retried a test, the failure note is prefixed with `Retried N time(s).`

## What lands in the dashboard

- Pass/fail per test case, sourced from Cypress CI (not manually entered)
- Cypress error messages as inline notes on failed cases
- AI Run Summary generated automatically on every upload (Professional plan)
- Flaky test detection running on continuous CI data
- Pass rate trends across every run

## Before you go live: dry run

```bash
TESTABLY_DRY_RUN=true npx cypress run
```

Validates auth and run ID without writing any data. You can also pass `dryRun: true`
directly to `setupTestablyReporter`.

## Get started

- **Install:** `npm install --save-dev @testably.kr/cypress-reporter`
- **Full docs:** [npmjs.com/package/@testably.kr/cypress-reporter](https://www.npmjs.com/package/@testably.kr/cypress-reporter)
- **Testably account:** [testably.app](https://testably.app) — starts free, no credit card required
- **CI/CD integration** requires Testably Professional plan ($99/month flat-rate, up to 20 members)

Already using the Playwright reporter? Same three env vars, same dashboard, different
framework. Jest reporter is coming soon.

`1.0.1` = stable API, SemVer-followed. Safe to pin in CI.
```

---

## Section C — Twitter / X Threads

### C1. Cypress 5/13 Launch Thread (post today — standalone, not a reply)

Post each tweet as a separate reply in a thread. Start a new thread — this is a
full-launch thread, not a reply to the 5/11 draft.

---

**Tweet 1 — Hook**

Cypress users: `@testably.kr/cypress-reporter@1.0.1` is live on npm today.

One install, one `setupNodeEvents` call, three env vars. Every Cypress CI run
auto-syncs to your Testably QA dashboard.

Here's how it works:

---

**Tweet 2 — The problem**

Most teams have a gap between Cypress and their QA tool.

CI runs finish. Results appear in the terminal. Then they disappear.

Someone has to manually update the test run — or write a custom upload script —
or just not bother. That's how flaky test patterns stay invisible for months.

---

**Tweet 3 — The setup**

The fix is one block in `cypress.config.ts`:

```ts
import { setupTestablyReporter } from '@testably.kr/cypress-reporter';

setupNodeEvents(on, config) {
  setupTestablyReporter(on, config, {
    testCaseIdSource: 'title',
  });
  return config;
}
```

Plus three env vars in CI secrets. That's the full setup.

---

**Tweet 4 — TC mapping**

Tag specs with `[TC-42]` in `it()` or `describe()`:

```ts
it('[TC-42] checkout flow completes', () => { ... });

// Or on describe — applies to all children:
describe('[TC-101] auth suite', () => { ... });
```

Tests without an ID are skipped gracefully, not silently dropped.

---

**Tweet 5 — What you get**

Once wired up, every Cypress run lands in Testably with:

- Pass/fail per test case from CI data
- Cypress error messages as inline notes on failed cases
- AI Run Summary generated automatically
- Flaky detection running on continuous data
- Pass rate trends across every run

---

**Tweet 6 — Family framing**

Same family as the Playwright reporter (shipped Monday).

Both packages share `@testably.kr/reporter-core`. Same three env vars. Same
dashboard. Different framework.

If your team runs both Playwright and Cypress: one Testably workspace covers both.

---

**Tweet 7 — CTA**

Install:
```
npm install --save-dev @testably.kr/cypress-reporter
```

Docs: npmjs.com/package/@testably.kr/cypress-reporter

Requires Testably Professional plan ($99/mo flat-rate, up to 20 members).
Start free at testably.app

Jest reporter is coming next.

#Cypress #QA #TestAutomation #CI #DevTools #SoftwareTesting

---

### C2. Playwright Retroactive Thread (post today — "soft launch → full launch" framing)

Post as a new standalone thread. Tone: builder sharing what they shipped, no apology
for the timing.

---

**Tweet 1 — Hook**

We did a quiet launch of `@testably.kr/playwright-reporter` earlier this week.

Here's what it does, why we built it, and what we learned shipping the first
production-grade CI reporter for Testably:

---

**Tweet 2 — The problem we were solving**

The pattern we kept seeing: Playwright runs finish in CI, pass/fail data exists,
and then it evaporates.

The QA dashboard stays stale. Flaky tests stay invisible. Trend charts stay flat
because the data never arrives.

The fix isn't complex — it's just a reporter that actually uploads the results.

---

**Tweet 3 — What we shipped**

`@testably.kr/playwright-reporter@1.0.1` — a standard Playwright reporter that
hooks into `onEnd` and uploads results to Testably automatically.

No custom scripts. No manual updates. No data loss.

Four TC ID matching strategies (annotation, tag, title, custom).
Exponential backoff retries. `dryRun` mode for safe first-time setup.

---

**Tweet 4 — The setup (3 lines)**

```ts
// playwright.config.ts
reporter: [
  ['list'],
  ['@testably.kr/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
],
```

```yaml
# CI env vars
TESTABLY_URL, TESTABLY_TOKEN, TESTABLY_RUN_ID
```

That's it. Works with GitHub Actions, GitLab CI, Jenkins — any CI that can run
`npx playwright test`.

---

**Tweet 5 — What lands in the dashboard**

- Pass/fail per test case, sourced from CI (not manually entered)
- Playwright error messages as inline notes on failed cases — no digging through CI logs
- AI Run Summary fires automatically on upload
- Flaky detection now has continuous data to work with
- Pass rate trends across every run to `main`

---

**Tweet 6 — Cypress is live too**

Cypress reporter shipped today (`@testably.kr/cypress-reporter@1.0.1`).

Same three env vars. Same dashboard. The Playwright and Cypress reporters share a
common core — if you run both frameworks, one Testably workspace covers both.

Jest reporter is next.

---

**Tweet 7 — CTA**

Playwright: `npm i -D @testably.kr/playwright-reporter`
Cypress: `npm i -D @testably.kr/cypress-reporter`

Full docs: npmjs.com/package/@testably.kr/playwright-reporter

Both require Testably Professional plan. Start free at testably.app

`1.0.1` = stable API, strict SemVer. Safe to pin in CI.

#Playwright #Cypress #QA #TestAutomation #CI #DevTools #SoftwareTesting

---

## Section D — Hacker News Show HN

### D1. Title + First Comment

**Title:**

```
Show HN: Testably Reporter – auto-sync Playwright/Cypress CI results to your QA dashboard
```

**First comment (post immediately after submission):**

Hey HN — Kyle here, founder of Testably (https://testably.app).

We shipped two CI reporter packages this week:

- `@testably.kr/playwright-reporter@1.0.1` (npm)
- `@testably.kr/cypress-reporter@1.0.1` (npm)

The problem they solve: there's always a gap between where your automated tests run (CI) and where your QA team actually works (a test management tool). Playwright or Cypress finishes, results appear in the terminal, and then they disappear — unless someone manually enters them or wires up a custom upload script.

Both reporters hook into the framework's native completion event (`onEnd` for Playwright, `after:run` for Cypress), batch the results, and POST them to the Testably backend when the run finishes. Tag your tests with `[TC-42]` in the title and results map to existing test cases automatically. Tests without an ID are counted in a summary and skipped — not silently dropped.

The setup is three env vars (`TESTABLY_URL`, `TESTABLY_TOKEN`, `TESTABLY_RUN_ID`) plus one line in your config. Both packages share `@testably.kr/reporter-core` — same auth, same error handling, same retry logic. We shipped `dryRun` mode so you can validate credentials before committing to a real run.

What lands in the Testably dashboard: pass/fail per test case sourced from CI, Playwright/Cypress error messages as inline notes on failed cases, AI-generated run summary, flaky test detection running on continuous data, and pass rate trend charts across every run.

Testably itself is a test case management SaaS — think TestRail but with a modern UI, flat-rate pricing (not per-seat), and 13 built-in AI features. Free plan available, CI integration requires Professional ($99/month, up to 20 members).

Both packages are `1.0.1` stable with strict SemVer from here. Jest reporter is next.

Happy to answer questions about the implementation — particularly the TC ID matching logic, the retry/backoff approach, or anything about the `upload-ci-results` edge function on the server side.

---

### D2. HN Launch Time Recommendations (KST)

HN's algorithm weights early velocity heavily. The best window is weekday mornings
Pacific Time (PT), when the HN audience is most active.

| Option | PT time | KST time | Notes |
|---|---|---|---|
| **Option 1 (best)** | Tue–Thu 06:00 PT | Tue–Thu 22:00 KST | Peak HN morning slot, fastest velocity |
| **Option 2** | Tue–Thu 07:00 PT | Tue–Thu 23:00 KST | Still strong; slightly past peak |
| **Option 3** | Mon 06:00 PT | Mon 22:00 KST | Monday works but slightly lower engagement than midweek |
| **Option 4** | Fri 06:00 PT | Fri 22:00 KST | Acceptable; avoid if Options 1–3 are available |

**Recommendation for this week:** Post tonight (Wed 5/13) at 22:00 KST (Thu 5/14 06:00 PT).
This captures the Thursday morning PT audience, which is consistently one of the highest-
engagement windows on HN. Stay online for 2 hours after posting to respond to early comments
— response speed in the first hour materially affects ranking.

---

## Section E — LinkedIn

### E1. CEO Personal Post (founder story tone)

**Post:**

We shipped two CI reporter packages this week that I've wanted to build for a long time.

The pattern I kept seeing: teams run Playwright or Cypress in CI, the test results exist, and then they evaporate. Someone has to manually update the QA tool — or write a one-off upload script — or just not bother. The data that should be driving quality decisions gets stuck in CI logs where nobody looks.

We built `@testably.kr/playwright-reporter` and `@testably.kr/cypress-reporter` to close that gap. Both are stable on npm today (`1.0.1`). One install, one config line, three env vars, and every CI run automatically lands in your Testably dashboard — pass/fail per test case, error messages as inline notes, AI run summary generated on landing.

The setup is genuinely 5 minutes. We added `dryRun` mode specifically because we've seen enough "misconfigured CI secrets" war stories to know that silent failure is worse than a loud startup error.

Both reporters share a common core (`@testably.kr/reporter-core`). Same three env vars whether you're on Playwright or Cypress. Same dashboard. If you run both frameworks, one Testably workspace covers both. Jest reporter is next.

If your team uses Playwright or Cypress in CI and you're still manually updating your test management tool after every run — try this. It takes less time to set up than reading this post.

Playwright: https://www.npmjs.com/package/@testably.kr/playwright-reporter
Cypress: https://www.npmjs.com/package/@testably.kr/cypress-reporter
Start free: https://testably.app

#QA #TestAutomation #Playwright #Cypress #CI #SoftwareTesting #DevTools #SaaS

---

### E2. Testably Company Page Post (product launch tone)

**Post:**

Two CI reporter packages are now stable on npm:

- `@testably.kr/playwright-reporter@1.0.1`
- `@testably.kr/cypress-reporter@1.0.1`

Both close the same gap: your automated test results exist in CI but never make it to your QA dashboard. These reporters hook into each framework's native completion event and upload results to Testably automatically — no custom scripts, no manual updates.

What your team gets after a 5-minute setup:

- Pass/fail status per test case, sourced directly from CI data
- Playwright or Cypress error messages surfaced as inline notes on failed cases
- AI Run Summary generated automatically on every upload
- Flaky test detection running on continuous CI data (not sporadic manual inputs)
- Pass rate trend charts across every run

Both packages share the same three env vars and the same Testably dashboard. If you run Playwright and Cypress in the same pipeline, one workspace covers both.

Requires Testably Professional plan — $99/month flat-rate for up to 20 members. No per-seat pricing.

Start free at testably.app. Jest reporter coming soon.

#TestAutomation #QA #Playwright #Cypress #CI #SoftwareTesting #QATools

---

## Section F — Launch Order + Timeline

### F1. SSR Fix Complete — Launch Immediately (no time restriction)

Once SSR is confirmed working, fire these channels in order without waiting:

| Step | Channel | Action | Time needed |
|---|---|---|---|
| 1 | Dev.to — Playwright | Post B1 block (copy-paste frontmatter + body) | 5 min |
| 2 | Dev.to — Cypress | Post B2 block | 5 min |
| 3 | Twitter — Cypress thread | Post C1 (7 tweets) | 10 min |
| 4 | Twitter — Playwright retroactive thread | Post C2 (7 tweets) | 10 min |
| 5 | LinkedIn — CEO personal | Post E1 | 3 min |
| 6 | LinkedIn — Company page | Post E2 | 3 min |

**Total time: ~36 minutes.** No scheduling needed — post live immediately.

### F2. Product Hunt — Next PT Day (KST evening)

PH resets at 00:01 PT daily. To maximize Day 1 vote window, submit at or just after reset.

- **Target:** 00:01–00:30 PT the night after SSR fix (= KST 16:01–16:30 the same day, or
  KST next-day if it's already past 16:00 today)
- **If today 5/13 KST it is past 16:30:** submit tomorrow (5/14) at KST 16:01
- Post the hunter intro comment (A2 block) within 5 minutes of the listing going live
- Share the PH link immediately in your personal network / Discord / Slack communities

### F3. Hacker News — Wednesday or Thursday PT Morning (KST evening)

- **Best slot this week:** Wed 5/13 22:00 KST (= Thu 5/14 06:00 PT)
- Use D1 title and first comment exactly as written
- Stay online for at least 90 minutes after posting to respond to early comments
- Do not post HN and PH within the same 6-hour window — stagger to avoid attention split

### F4. Post-Launch Monitoring Checklist

Check these within 24 hours of each channel firing:

**Product Hunt**
- [ ] Listing is visible and indexed (search "Testably" on PH)
- [ ] Hunter intro comment is pinned as first comment
- [ ] Responding to all comments within 15 minutes during first 6 hours
- [ ] Vote count tracked hourly for first 12 hours

**Dev.to**
- [ ] Both posts visible at dev.to/@[handle]
- [ ] Canonical URLs are set correctly (check page source for `<link rel="canonical">`)
- [ ] Tag pages showing posts (#playwright, #cypress)
- [ ] Reactions and comments monitored; reply within 2 hours

**Twitter**
- [ ] Both threads fully posted (7 tweets each, no truncation)
- [ ] Code snippet tweets rendering correctly (not broken by 280-char limit)
- [ ] Monitoring replies and quote-tweets for first 24 hours

**LinkedIn**
- [ ] CEO post published (not saved as draft)
- [ ] Company page post published
- [ ] Responding to comments within 4 hours

**Hacker News**
- [ ] Submission visible on /new or /show
- [ ] First comment posted within 3 minutes of submission
- [ ] Monitoring for 2 hours post-submission; reply to all technical questions

**npm**
- [ ] `npm view @testably.kr/playwright-reporter dist-tags` → `latest: 1.0.1`
- [ ] `npm view @testably.kr/cypress-reporter dist-tags` → `latest: 1.0.1`
- [ ] Weekly download counts visible after 24h on npmjs.com

---

*End of Launch Actions Bundle. All copy above is final and copy-paste ready.
Replace `[LINK]` placeholders and cover_image URLs with live assets before posting.*
