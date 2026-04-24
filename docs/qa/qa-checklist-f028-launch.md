# f028 SDK Launch — Pre-Launch Manual QA Checklist

> **When to run:** 2026-05-10 (T-1) — day before launch.
> **How long:** ~90 minutes single pass. Re-run any failed section once, then
> decide Ship / Hold.
> **Who:** CEO (Kyle). Use a real browser, not automation.
>
> **Outcome:** Fill in the Pass/Fail boxes in-line, paste the result into
> `docs/qa/qa-checklist-f028-launch-<date>.md` as an evidence artifact
> before flipping the launch switch.

---

## 0. Environment setup (5 min)

- [ ] Using **production** Supabase + production Testably URL (not local/staging)
- [ ] Browser: Chrome (Incognito) + Safari + Firefox (one pass each for Section 1)
- [ ] Three test accounts ready:
  - **Owner** account — workspace owner, paid plan
  - **Admin** account — org admin, paid plan
  - **Member** account — invited member, any plan
- [ ] Screen recorder (Loom / QuickTime) open for any failure → evidence

---

## 1. Golden Path — Playwright SDK Integration (25 min)

### 1.1 Install + local dry-run
- [ ] Fresh `npm install --save-dev @testably.kr/playwright-reporter @playwright/test` in a blank repo
- [ ] Verify installed version is **`1.0.1`** (not 1.0.0 and not 0.1.0-alpha.0)
- [ ] Version ping:
      `cat node_modules/@testably.kr/playwright-reporter/package.json | grep '"version"'` → `"1.0.1"`
      (there is no `bin`, so `npx playwright-reporter --version` is unsupported)
- [ ] Copy `examples/nextjs-github-actions/playwright.config.ts` + `tests/` into repo
- [ ] `TESTABLY_DRY_RUN=true npx playwright test` →
      - exit 0 (ignoring the intentionally-failing sample test)
      - log `[Testably] Dry run passed. (Run: "...", tier: N)` **when** token+run_id point to a real workspace/run
      - OR `[Testably] Run not found (404).` / `401 Invalid API token.` — credentials-related, not a code bug
      - OR `[Testably] Dry run failed: fetch failed` — URL unreachable (rare)

### 1.2 End-to-end real upload
- [ ] Create a fresh run in Testably (Owner account): **Runs → New Run → paste UUID**
- [ ] Export real env vars: `TESTABLY_URL` / `TESTABLY_TOKEN` / `TESTABLY_RUN_ID`
- [ ] `npx playwright test` with the 5 sample tests (4 tagged `@TC-101`~`@TC-104`,
      1 intentionally unmapped to demonstrate partial-coverage migration)
- [ ] Summary log reads `[Testably] 5 tests run, 4 mapped to Testably, 1 skipped (no TC ID)`
- [ ] Open the run in Testably → 4 test cases show `passed / failed` status
      matching the local run (TC-103 fails intentionally)
- [ ] Failed test's `note` column contains the Playwright error message
      (timeout string, locator assertion, etc.)

### 1.3 TC ID strategy smoke tests
- [ ] Switch config to `testCaseIdSource: 'title'` — titles prefixed `[TC-101]` still map
- [ ] Switch to `testCaseIdSource: 'annotation'` — `testInfo.annotations.push(...)` still maps
- [ ] Switch to `testCaseIdSource: 'tag'` — `{ tag: '@TC-101' }` still maps
- [ ] `testCaseIdSource: 'custom'` with a simple `mapTestCaseId` function — still maps

### 1.4 Error paths
- [ ] Wrong token → reporter prints `401 Invalid API token`. **CI exit code 0**
      (unless `failOnUploadError: true`)
- [ ] Non-existent run_id → reporter prints `404 Run not found`. CI exit 0
- [ ] `TESTABLY_RUN_ID` empty → reporter throws `ConfigError` at startup
      (Playwright load failure, loud)
- [ ] Free/Hobby/Starter workspace token → reporter prints upgrade notice. CI exit 0
- [ ] Network offline → 3 retries logged, final failure, CI exit 0

---

## 2. Golden Path — AI Usage Dashboard (f011) (15 min)

Run as **Owner** on a workspace that has ≥ 10 AI generations in the last 14 days.

- [ ] Navigate to `Settings → AI Usage`
- [ ] Panel loads within 3s; no raw `settings.aiUsage.mode.*` strings anywhere
- [ ] KPI 1 "**THIS MONTH**" number matches the project sidebar's
      `AI Usage — X / Y generations this month` card (both should be
      calendar-month-to-date)
- [ ] KPI 2 "BURN RATE" shows `X/day` and "On track" or a warning state
- [ ] KPI 3 "MODES USED" shows `M / 9`
- [ ] KPI 4 "ACTIVE MEMBERS" shows `A / B`
- [ ] Daily Usage stacked bar chart renders with **translated** mode labels
      (Test Cases (Text), Run Analysis, Plan Assistant, etc.) — **not** i18n keys
- [ ] Breakdown by Feature table renders translated feature names + credits + %
- [ ] Team Contribution table shows avatars + names + credit totals
- [ ] Period filter dropdown has 5 options: **This month (default)** / Last 30 days
      / Last 90 days / Last 6 months / Last 12 months
- [ ] Switching period updates the chart + tables, and `?period=...` URL param
- [ ] Export CSV → file named `ai-usage-YYYY-MM-DD.csv` with 5 columns:
      `date,user_name,user_email,feature,credits`
- [ ] CSV rows only cover the selected period (e.g. if "This month" → no March rows)
- [ ] CSV `feature` column uses human-readable labels ("Test Cases (Text)"
      not `text`)

### Role checks
- [ ] Log in as **Admin** on same workspace → Team View renders with same data
- [ ] Log in as **Member** → sees Self View only (no team breakdown, no Export CSV button)
- [ ] Member hitting `/settings?tab=ai-usage&view=team` manually →
      403 Forbidden banner appears (not Empty State, not crash)

### UI toggle
- [ ] EN → KO language toggle: period labels become "이번 달 / 최근 30일 / …"
- [ ] Mode labels become "테스트케이스 (텍스트) / 런 분석 / …"

---

## 3. Regression — core flows not touched by launch (30 min)

Quick sanity that recent SDK + observability changes did not break the main app.

### 3.1 Auth
- [ ] Sign up with new email → email confirmation arrives
- [ ] Sign in with existing account → redirected to project list
- [ ] Sign in with Korean locale cookie → UI starts in KO (no flip-flop)

### 3.2 Project → Test Case → Run
- [ ] Create new project (Owner account)
- [ ] Add 3 test cases with priority/tags
- [ ] Start a manual test run → mark all 3 (pass/fail/blocked)
- [ ] AI Run Summary generates within 10s, shows narrative + recommendations
- [ ] Export run to PDF → PDF downloads, contains all 3 results
- [ ] Export run to CSV → CSV columns are not shifted, dates populate

### 3.3 Milestone
- [ ] Create milestone, attach the test run above
- [ ] Open milestone detail → progress %, KPIs, AI Risk Analysis render
- [ ] AI Risk Analysis: credit counter increments (check `Settings → AI Usage`
      within 60s — the new call should appear in the breakdown)

### 3.4 AI Plan Assistant
- [ ] Create a Test Plan via AI (Milestones page → AI Optimize)
- [ ] Plan appears in the list
- [ ] Open plan detail → TCs mapped, AI Optimize (Add TCs) also works

### 3.5 Integrations
- [ ] Invite a team member by email → invitation email arrives within 60s
- [ ] Accept invitation (open incognito, click the link) → joins project successfully
- [ ] Jira / GitHub integrations settings load without errors (no actual sync needed)

### 3.6 Settings
- [ ] Language toggle EN ↔ KO sticks after page refresh
- [ ] Settings tabs all load: Profile / Preferences / Team / Billing /
      **AI Usage** / Notifications / Integrations
- [ ] No raw i18n keys visible anywhere in the Settings area

---

## 4. Cross-browser smoke (10 min)

Perform Section 1.2 + 2 once on each:

- [ ] **Chrome** (latest stable)
- [ ] **Safari** (latest)
- [ ] **Firefox** (latest)

Known acceptable quirks:
- Safari prompts for Downloads permission on first CSV export — confirm once
- Firefox may render emoji icons slightly differently — not a blocker

---

## 5. npm + GitHub audit (10 min)

### 5.1 npm registry
- [ ] `npm view @testably.kr/playwright-reporter` → `latest: 1.0.1`
- [ ] `npm view @testably.kr/reporter-core` → `latest: 1.0.1`
- [ ] Both have `dist.tarball` URLs that resolve (HTTP 200)
- [ ] README on the npm page matches `packages/playwright/README.md`
      (Status line reads "**1.0.1** — stable", not alpha)

### 5.2 GitHub repo
- [ ] `sdk-playwright-v1.0.1` tag exists and points to a commit that passed
      the `publish-sdk.yml` workflow (tag SHA may predate current `main` HEAD
      if a post-tag hotfix landed — verify via npm tarball integrity + Actions
      log, not `main == tag`)
- [ ] Repo root README features the "SDK Packages" section prominently
- [ ] `examples/` directory contains all 3 example sub-dirs + top-level README
- [ ] `CODEOWNERS` + `FUNDING.yml` present under `.github/`
- [ ] Latest Actions run on `main` is green (CI + smoke tests)

### 5.3 Landing page + docs

> **Note**: testably.app is a client-rendered SPA. `curl` returns the shell
> HTML with no visible content — use a real browser to verify the rendered
> copy/links below.

- [ ] `testably.app/pricing` — Professional plan lists "Playwright CI reporter" under features
- [ ] `testably.app/blog/playwright-reporter-stable` — blog post is live, correct date
- [ ] All links in the blog → 200 (no broken npm/github/docs links)

---

## 6. Launch day dependencies (5 min)

- [ ] Product Hunt page draft has all 3 hero images attached (sizes correct)
- [ ] Twitter thread scheduled in Typefully/Buffer with correct launch time
- [ ] `.github/workflows/publish-sdk.yml` changes since the successful 1.0.1
      publish are **non-regressive** for the hotfix publish path — skim the
      diff; any change must still run `npm ci → tsc → tests → build → publish`
      with `--provenance` intact. (Net-positive fixes like the dependency
      pre-build are fine.)

---

## Ship / Hold decision

Tick exactly one:

- [ ] **Ship** — all sections pass, no P0s, ≤ 2 P2 cosmetic issues logged for post-launch
- [ ] **Ship with known issues** — P0/P1 count = 0, document open P2s in
      `docs/qa/qa-checklist-f028-launch-<date>.md`
- [ ] **Hold** — any failure in §1 (SDK core path) or §2 role checks. Fix,
      bump to `1.0.2`, re-run this checklist on the hotfix.

Signed: ____________________________ Date: __________
