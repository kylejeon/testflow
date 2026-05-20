---
slug: testably-product-hunt-launch-retrospective
title: We Just Launched Testably on Product Hunt — Here's What Happened
description: An honest retrospective on Testably's Product Hunt launch — what worked, what didn't, and the numbers behind the day. Posted 24 hours after going live.
publishDate: 2026-05-20
readTime: 7 min read
category: Behind the Build
icon: ri-rocket-2-line
---

# We Just Launched Testably on Product Hunt — Here's What Happened

> **Status placeholder**: This post is published 24 hours after the launch goes live on 2026-05-19. All numbers below are TBD until the day closes.

Yesterday at 9:00 AM Pacific Time, Testably went live on Product Hunt. As I write this, the launch day has just ended. Here's an honest accounting of what we shipped, what worked, what didn't, and what we'd do differently next time.

---

## TL;DR

- **Final rank**: `{TBD — fill in: #N of the day in [Category]}`
- **Upvotes**: `{TBD}`
- **Comments**: `{TBD}`
- **Sessions on testably.app**: `{TBD}` *(from Google Analytics)*
- **New signups**: `{TBD}`
- **`PRODUCTHUNT` code redemptions**: `{TBD / 500 cap}`
- **What it took to ship**: ~6 days of preparation, one bundled launch covering Testably + two CI reporters.

---

## What we launched

We bundled three things into one launch:

1. **Testably** — the QA test management platform (test cases, runs, milestones, AI, Jira sync).
2. **`@testably.kr/playwright-reporter`** — first-party Playwright CI reporter.
3. **`@testably.kr/cypress-reporter`** — first-party Cypress CI reporter.

We chose the bundle over launching each separately because Product Hunt's 6-month cooldown means the Testably parent brand only gets one shot. Launching just one reporter would have burned that exposure on a single SDK.

The pitch:

> The QA platform that auto-syncs Playwright & Cypress CI. Add the reporter to your config, set 3 env vars, and every CI run lands in Testably — no manual uploads, no scripts.

---

## The numbers

### Traffic

`{TBD — paste Google Analytics screenshot}`

- **Peak hour**: `{TBD}`, with `{TBD}` concurrent users
- **Top countries**: `{TBD}`
- **Bounce rate**: `{TBD}%`
- **Average session duration**: `{TBD}`

### Conversion

| Funnel step | Count | Rate |
|---|---|---|
| PH page views | `{TBD}` | — |
| → Click through to testably.app | `{TBD}` | `{TBD}%` |
| → Sign up (free plan) | `{TBD}` | `{TBD}%` |
| → Apply `PRODUCTHUNT` code | `{TBD}` | `{TBD}%` |
| → Complete Professional checkout | `{TBD}` | `{TBD}%` |

### Promo code

We offered `PRODUCTHUNT` for 3 months of Testably Professional free, capped at 500 redemptions, expiring 2026-06-19. As of writing:

- **Redemptions on D-day**: `{TBD}` of 500
- **Geographic spread**: `{TBD}`

---

## What worked

`{TBD — fill in 3-5 specific things that worked. Examples to consider:}`

### 1. The bundle decision

`{TBD — was the bundle the right call? Did people respond to the "platform + two reporters" story, or did they get confused?}`

### 2. The Loom demo

`{TBD — did the 1-minute demo carry the page? Look at PH analytics → "Watched the demo" if available, and tie it to upvote conversion}`

### 3. The promo code

`{TBD — was 3-months-free the right offer? Did people complete the funnel, or did the offer attract free-rider signups who never converted to paid?}`

### 4. The maker comment

`{TBD — engagement rate on the first comment, replies to it}`

### 5. Channel sequencing

`{TBD — did the planned sequence (Twitter → LinkedIn → Email → Dev.to → HN → Reddit) compound, or did one channel dominate?}`

---

## What we'd do differently

`{TBD — fill in 3-5 honest observations. Be specific, not vague. Examples to consider:}`

### 1. `{TBD — e.g., "Submit a Hunter ahead of time"}`

`{TBD — the why}`

### 2. `{TBD — e.g., "More gallery imagery focused on the dashboard, not the code"}`

`{TBD}`

### 3. `{TBD — e.g., "Twitter teaser too generic; the D-1 post should have shown a result, not promised one"}`

`{TBD}`

---

## The Promo Code Story

We set `PRODUCTHUNT` up in Paddle Billing with these specifics:

- **Discount**: 100% off, recurring for 3 billing periods
- **Limited to**: Testably Professional monthly plan only
- **Cap**: 500 redemptions total
- **Expires**: 2026-06-19

The recurring 3-month-free part is the unusual call. Most PH promos give one month or a percentage discount. We bet that 3 months of full Professional access would (a) be a strong PH-community-only signal and (b) give users enough time to fully evaluate the platform before deciding to pay.

`{TBD — after D-day, evaluate: did people actually redeem this? Did they activate and stay engaged for 3 months? Too early to tell on D+1, but note observable signals like activation rate.}`

---

## The cost

Cost transparency, in case it's useful for other founders considering a similar launch:

| Item | Cost |
|---|---|
| Product Hunt submission | Free |
| Loom Standard (already had) | $0 incremental |
| Paddle Billing transaction fees on promo redemptions | `{TBD — depends on redemptions}` |
| Forgone subscription revenue (3 months × N redemptions × $99/mo) | `{TBD}` |
| Total time invested (prep + day-of) | ~50 hours |

---

## What's next

`{TBD — fill in honest next-step. Options to consider:}`

- **If launch went well**: How we'll convert the inbound interest into long-term users. Onboarding improvements, Activation metrics watch.
- **If launch was middling**: What we'd test next. Different positioning? Different audience? Different channel?
- **If launch was bad**: What we learned and where we go from here. Honesty is more interesting to read than spin.

**The reporters**: Both `@testably.kr/playwright-reporter` and `@testably.kr/cypress-reporter` are 1.0.x stable on npm. We're shipping a Jest reporter next, then an xUnit-format generic importer.

**The platform**: We have a roadmap of features lined up. The PH launch was about getting the platform in front of teams who haven't heard of us — not about teasing the next big feature.

---

## Thanks

To everyone who upvoted, commented, asked tough questions, found bugs, or shared the page — thank you. Specifically:

`{TBD — list 5-10 people who helped, by Twitter/PH handle. Be specific. "@harrycaster gave us early feedback on the Cypress reporter API" beats "thanks to everyone".}`

And to the QA teams who'd been telling us for months that the CI-to-test-management gap was the worst part of their week — you're the reason we shipped this.

The code `PRODUCTHUNT` is still live until 2026-06-19. If you missed launch day, you didn't miss the deal. [Try Testably free](https://testably.app/signup), use the code on the Professional plan, and you get 3 months on the house.

---

*Kyle is the founder of [Testably](https://testably.app). You can find him on [X/Twitter @gettestably](https://x.com/gettestably) or in the Testably comments — he answers every one.*

---

## CEO 발행 체크리스트 (이 파일 위쪽 머리말은 publish 시 삭제)

이 파일은 D+1 (5/20) 발행을 위한 골격이야. 발행 직전 채워야 할 placeholder 모두 `{TBD...}` 표기. 검색 치환으로 한 번에 채울 수 있게 모두 동일 패턴.

### 발행 순서
1. 위 markdown의 `{TBD...}` 모두 실제 값으로 치환
2. "Status placeholder" 박스 (상단) 삭제
3. "CEO 발행 체크리스트" 섹션 (이 부분) 삭제
4. `src/pages/blog/testably-product-hunt-launch-retrospective/page.tsx` 신규 생성 — 마케터의 다른 블로그 페이지처럼 단순 article layout 사용 (`AlternativesArticleLayout`는 alternatives용이라 다른 레이아웃 필요할 수 있음; 가장 간단한 건 `BlogArticleLayout` 만들거나 기존 `_shared` 레이아웃 재활용)
5. `src/pages/blog/posts.ts` 에 신규 BlogPost 엔트리 추가:
   ```ts
   {
     slug: 'testably-product-hunt-launch-retrospective',
     title: 'We Just Launched Testably on Product Hunt — Here\'s What Happened',
     description: '...',
     publishDate: '2026-05-20',
     readTime: '7 min read',
     category: 'Behind the Build',
     icon: 'ri-rocket-2-line',
   }
   ```
6. `src/router/config.tsx` 에 라우트 등록
7. `npm run build` → 91 라우트 prerender 자동 (scanner가 posts.ts 읽음)
8. claude push → main 머지 → 배포
9. Twitter / LinkedIn / Hacker News 회고 포스트 분배

### KPI 데이터 수집 가이드 (D+1 아침)
- **Google Analytics 4** (G-JGL5DDYQR8): testably.app 24h Sessions + Bounce + Avg duration
- **Product Hunt**: PH 페이지에서 upvote / comment / rank
- **Paddle**: vendors.paddle.com → Discounts → PRODUCTHUNT → Redemption count
- **Supabase** (직접 SQL):
  ```sql
  SELECT COUNT(*) FROM auth.users WHERE created_at >= '2026-05-19 16:00 KST';
  SELECT COUNT(*) FROM subscriptions WHERE provider='paddle' AND created_at >= '2026-05-19 16:00 KST';
  ```

### 톤 가이드 (필수)
- **솔직**: "What we'd do differently" 섹션은 진짜 약점을 적어. PH 1위 못 했어도 그게 더 읽기 좋음.
- **구체적**: "감사합니다" 보다 "@handle helped us with X" 형태로.
- **반-과장**: "exploded", "viral", "blew up" 같은 표현 X.
- **숫자 우선**: 형용사 대신 실제 수치 인용.
