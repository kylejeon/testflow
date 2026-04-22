# f028 — Twitter/X Thread: @testably/playwright-reporter
> 유형: Social Media
> 작성일: 2026-04-22
> 타겟 채널: Twitter/X
> 관련 기능: f028 Playwright Reporter SDK

---

## Thread (7 tweets)

---

**Tweet 1 — Hook**

If your Playwright CI results aren't automatically syncing to your QA dashboard, you're losing data on every single run.

We just shipped `@testably/playwright-reporter` to fix that.

Here's how it works (and how to set it up in 5 minutes):

---

**Tweet 2 — The problem**

Most teams have this gap:

CI runs → results appear in the terminal → and then disappear forever.

Someone has to manually update the test run. Or write a custom upload script. Or just... not bother.

This is how pass/fail trends get lost and flaky tests stay hidden for months.

---

**Tweet 3 — The solution**

`@testably/playwright-reporter` is a standard Playwright reporter that uploads results to Testably automatically when `onEnd` fires.

No custom scripts. No manual updates. No data loss.

---

**Tweet 4 — Setup code**

3 lines of actual setup:

```ts
// playwright.config.ts
reporter: [
  ['list'],
  ['@testably/playwright-reporter', {
    testCaseIdSource: 'title',
  }],
],
```

```yaml
# .github/workflows/e2e.yml
env:
  TESTABLY_URL:    ${{ secrets.TESTABLY_URL }}
  TESTABLY_TOKEN:  ${{ secrets.TESTABLY_TOKEN }}
  TESTABLY_RUN_ID: ${{ secrets.TESTABLY_RUN_ID }}
```

That's the full setup.

---

**Tweet 5 — TC mapping**

Tag your tests with `[TC-42]` in the title (or use Playwright annotations):

```ts
test('[TC-42] user can log in', async ({ page }) => {
  // ...
});
```

The reporter maps results to existing Testably test cases automatically. Tests without an ID are skipped and counted in the summary — not silently dropped.

---

**Tweet 6 — What you get in the dashboard**

Once results sync, Testably gives you:

- Pass/fail per test case, with Playwright error messages as inline notes
- AI run summary generated automatically
- Flaky test detection across runs
- Pass rate trends over time — not just "did this run pass"

---

**Tweet 7 — CTA**

Install: `npm i -D @testably/playwright-reporter`

Full docs + troubleshooting: npmjs.com/package/@testably/playwright-reporter

Requires Testably Professional plan. Start free at testably.app

Cypress and Jest reporters are coming next.

---

**Hashtag suggestions:**
`#Playwright` `#QA` `#TestAutomation` `#CI` `#SoftwareTesting` `#DevTools` `#GitHub` `#TypeScript`

**Suggested visuals:**
- Tweet 3: Short screen recording (GIF) of a Playwright run finishing in terminal → Testably dashboard populating with results
- Tweet 4: Code snippet screenshot (dark theme, VS Code style)
- Tweet 6: Screenshot of Testably dashboard showing CI-imported results with AI summary card visible

---

## LinkedIn Version (single post)

**Title:** We just shipped @testably/playwright-reporter — CI test results, automatically synced to your QA dashboard.

---

If you use Playwright for E2E testing, you've probably felt this friction: the CI run finishes, results appear in the terminal, and then someone has to manually update your test management tool. Or write a one-off upload script. Or the data just gets lost.

We built `@testably/playwright-reporter` to close that gap.

It's a standard Playwright reporter plugin — the same interface as the built-in `list` or `html` reporters. Add it to your `playwright.config.ts`, set three environment variables in your CI secrets, and every run automatically populates your Testably test cases with real results.

**What you get:**
- Pass/fail status per test case, sourced directly from Playwright
- Playwright error messages surfaced as inline notes on failed cases
- Testably's AI Run Summary and flaky detection running on real CI data
- Pass rate trends across every run — not just one-off data points

**Setup is genuinely 5 minutes:**
```
npm install --save-dev @testably/playwright-reporter
```
Then add the reporter to your config and three env vars to your CI secrets. Done.

Available now as `0.1.0-alpha.0`. Requires Testably Professional plan or higher.

Full docs: npmjs.com/package/@testably/playwright-reporter

Happy to answer questions in the comments. If you're already using Testably and Playwright — give it a try and let us know what you think.

---

#QA #TestAutomation #Playwright #CI #DevTools #SoftwareTesting #SaaS
