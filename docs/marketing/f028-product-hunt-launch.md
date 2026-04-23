# f028 — Product Hunt Launch: @testably.kr/playwright-reporter
> 유형: Product Hunt
> 작성일: 2026-04-22
> 타겟 채널: Product Hunt
> 관련 기능: f028 Playwright Reporter SDK

---

## Tagline

**Your Playwright CI results, live in Testably. Zero manual uploads.**

*(57 characters)*

**Backup options:**
- "Ship Playwright test results to your QA dashboard in 3 lines" *(60 chars)*
- "Stop losing CI test data. Sync Playwright runs to Testably automatically." *(too long — trim)*
- "Playwright + Testably: CI results auto-synced to your QA dashboard" *(66 chars — use if limit is flexible)*

---

## Short Description (tagline alt — fits the PH "tagline" field)

Stop copy-pasting CI results. One reporter, 3 env vars, and every Playwright run lands directly in Testably.

---

## Product Description

### Short (140 chars)

`@testably.kr/playwright-reporter` — add one line to `playwright.config.ts` and your CI test results automatically sync to Testably. No scripts, no manual uploads.

### Long (260 chars)

`@testably.kr/playwright-reporter` closes the gap between your CI pipeline and your QA dashboard. Add the reporter to `playwright.config.ts`, set 3 env vars in your CI secrets, and every test run lands in Testably automatically — status, failures, timing, and all. Tag tests with `[TC-42]` in the title (or use annotations/tags) and results map to existing Testably test cases without any configuration file. Built for teams already on Playwright 1.40+. Requires a Testably Professional plan.

---

## Maker Comment (First Comment — 150-200 words)

Hey Product Hunt! Kyle here, founder of Testably.

We've heard this story dozens of times: the CI pipeline goes green (or red), and someone has to manually update the test run in the QA tool. Sometimes it's copy-paste, sometimes it's a custom script cobbled together on a Friday afternoon. Either way, the information arrives late, incomplete, or not at all.

`@testably.kr/playwright-reporter` is our fix for that. It's a standard Playwright reporter — the same plugin interface as the built-in `list` or `dot` reporters — that batches your test results and uploads them to Testably the moment `onEnd` fires.

The setup is genuinely three lines: install the package, add it to your `reporter` array, and drop three env vars into your CI secrets. That's it.

We're shipping `1.0.1` stable today — the API is frozen, the server-side `upload-ci-results` endpoint has been running in production for months, and the reporter has been battle-tested against real Playwright CI pipelines. Strict SemVer from here on.

If you're already using Testably and Playwright: try it today. Questions or bugs? Drop them in the comments or open an issue on GitHub.

---

## Maker Profile Bullet Points (3)

1. **The CI result blackhole, solved** — `@testably.kr/playwright-reporter` auto-syncs every Playwright run to your Testably dashboard. No scripts, no manual updates, no lost data.
2. **3-line setup, 0 new infrastructure** — One npm install, one config line, three CI secrets. Works with GitHub Actions, GitLab CI, Jenkins, and any CI that can run `npx playwright test`.
3. **Built on Testably's AI-native QA platform** — Results land in the same dashboard where your team writes test cases, runs AI analysis, tracks milestones, and generates run summaries. Professional plan or higher.

---

## Launch Image Concepts (3 screenshots — guide for designer)

### Image 1: "The Before/After split"
**Format:** Split-screen illustration (left: dark, right: light)
- Left half: A terminal showing a Playwright run ending with `42 passed, 3 failed`, followed by a developer manually typing into a QA spreadsheet. Label: "Before Testably Reporter"
- Right half: Same terminal output, but below it a clean animation of the Testably dashboard populating with live results — green/red status indicators, test names, timing. Label: "After"
- Bottom strip: `npm install --save-dev @testably.kr/playwright-reporter`
- Tone: dark background, accent colors matching Testably brand

### Image 2: "3-line setup code snippet"
**Format:** Macbook mockup or code editor window, dark theme
- Show `playwright.config.ts` open in VS Code dark theme
- Highlight exactly the 3 lines being added:
  ```ts
  ['@testably.kr/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
  ```
- Small annotation arrows: "1. Install" pointing to a terminal pane, "2. Add reporter" pointing to the config lines, "3. Add 3 env vars" pointing to a GitHub Secrets panel
- Caption below: "5-minute setup. Works with any CI provider."

### Image 3: "Results in Testably dashboard"
**Format:** Browser screenshot (Testably app) with annotation callouts
- Show a Testably Test Run detail view with results populated from CI
- Callout bubbles:
  - "Synced from Playwright CI" badge on the run header
  - "38 mapped / 4 skipped" summary line
  - A failed test with the Playwright error message surfaced as the Testably `note`
- Small "AI Run Summary" card visible in corner (showing Testably's AI features work on top of imported data)
- Caption: "CI results + AI insights, in one dashboard"
