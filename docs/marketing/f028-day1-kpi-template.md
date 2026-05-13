# f028 — Day 1 KPI Capture Template
> 유형: KPI Template
> 작성일: 2026-05-13
> 타겟 채널: Internal (CEO / PM)
> 관련 기능: f028 Playwright Reporter 1.0.1 + Cypress Reporter 1.0.1

---

> **How to use:** Fill in each table within 24 hours of each channel going live.
> Capture the "24h" column at exactly T+24 from first post on that channel.
> "1 week" and "1 month" columns are follow-up captures — add them to your calendar now.

---

## Launch Context

| Field | Value |
|---|---|
| Playwright soft-launch date | 2026-05-11 (npm publish only — no external posts) |
| Playwright full-launch date | 2026-05-13 (retroactive external posts) |
| Cypress launch date | 2026-05-13 |
| npm packages | `@testably.kr/playwright-reporter@1.0.1`, `@testably.kr/cypress-reporter@1.0.1` |
| PH submission date | ________ (fill when submitted) |
| HN submission date | ________ (fill when submitted) |

---

## A. Product Hunt

| Metric | T+6h | T+24h | T+48h | 1 week |
|---|---|---|---|---|
| Upvotes | | | | |
| Day ranking (overall) | | | | |
| Day ranking (Developer Tools category) | | | | |
| Comments received | | | | |
| Comments responded to | | | | |
| PH-referred signups (UTM: `utm_source=producthunt`) | | | | |
| PH-referred Professional upgrades | | | | |

**Notes / notable comments:**

```
(paste standout PH comments here)
```

---

## B. npm Downloads

| Package | Day 1 | Day 3 | Day 7 | Day 30 |
|---|---|---|---|---|
| `@testably.kr/playwright-reporter` weekly DL | | | | |
| `@testably.kr/cypress-reporter` weekly DL | | | | |
| `@testably.kr/reporter-core` weekly DL | | | | |

**How to check:**
```bash
npm view @testably.kr/playwright-reporter dist-tags
# npm weekly download stats: npmjs.com/package/@testably.kr/playwright-reporter
```

**Target (from launch plan §6 / §9.4):**
- Playwright Day 1: 50+ | Day 7: 500+
- Cypress Day 1: 30+ | Day 7: 150+

---

## C. Testably Signups & Conversions

| Metric | T+24h | 1 week | 1 month |
|---|---|---|---|
| New signups (total) | | | |
| Signups attributed to f028 launch (UTM / referrer) | | | |
| Free plan activations | | | |
| Professional plan trials started | | | |
| Professional → paid conversions | | | |
| Professional upgrade inquiries (Intercom tag: `playwright-reporter`) | | | |
| Unique workspaces calling `upload-ci-results` endpoint | | | |

**Target (from launch plan §1):**
- Professional upgrade inquiries: 5+ (Playwright), 2+ (Cypress)
- CI-integrated external teams: 10+

---

## D. Twitter / X

| Metric | Playwright thread | Cypress thread |
|---|---|---|
| Impressions at T+24h | | |
| Likes at T+24h | | |
| Reposts at T+24h | | |
| Replies at T+24h | | |
| Profile clicks | | |
| Link clicks (npm / testably.app) | | |
| Impressions at 1 week | | |

**Notable replies / quote-tweets:**
```
(paste here)
```

---

## E. Dev.to

| Metric | Playwright post | Cypress post |
|---|---|---|
| Views at T+24h | | |
| Reactions at T+24h | | |
| Comments at T+24h | | |
| Saves / bookmarks | | |
| Views at 1 week | | |
| Reactions at 1 week | | |
| Canonical link rendering correctly (yes/no) | | |

---

## F. Hacker News

| Metric | Value |
|---|---|
| Points at T+1h | |
| Points at T+6h | |
| Final points | |
| Peak ranking on /front | |
| Peak ranking on /show | |
| Total comments | |
| Comments responded to | |
| HN-referred signups | |

**Notable technical questions raised:**
```
(paste here — these become FAQ / docs improvement candidates)
```

---

## G. LinkedIn

| Metric | CEO personal post | Company page post |
|---|---|---|
| Impressions at T+24h | | |
| Reactions at T+24h | | |
| Comments at T+24h | | |
| Reposts at T+24h | | |
| Link clicks | | |
| Impressions at 1 week | | |

---

## H. GitHub

| Metric | T+24h | 1 week | 1 month |
|---|---|---|---|
| Repo stars (total) | | | |
| Star delta since launch | | | |
| Issues opened (f028 related) | | | |
| PRs / contributions | | | |
| forks | | | |

---

## I. Google Search Console

*Pull from GSC → Performance → Queries tab. Filter by date range starting launch day.*

| Metric | 1 week post-launch | 1 month post-launch |
|---|---|---|
| Total impressions (testably.app) | | |
| Total clicks | | |
| Avg. CTR | | |
| Impressions: "playwright reporter" | | |
| Clicks: "playwright reporter" | | |
| Impressions: "cypress reporter" | | |
| Clicks: "cypress reporter" | | |
| Impressions: "playwright ci integration" | | |
| Impressions: "cypress ci integration" | | |
| New pages indexed | | |

**Blog pages to verify indexed:**
- [ ] `https://testably.app/blog/playwright-reporter-ci-integration`
- [ ] `https://testably.app/blog/cypress-reporter-ci-integration`

---

## J. 1-Month Retrospective Prompts

Fill these out 30 days after launch. Keep it under 1 page.

**What worked:**
```
(channels / copy that drove measurable results)
```

**What did not work:**
```
(channels / copy with low ROI — deprioritize next time)
```

**Biggest surprise:**
```
```

**Top 3 feature requests surfaced from launch:**
```
1.
2.
3.
```

**Decision: Jest reporter launch approach** (based on what worked here):
```
(apply lessons to f028 Jest reporter launch)
```

---

*Template version: f028 / 2026-05-13. Archive this file with filled values after each capture.*
