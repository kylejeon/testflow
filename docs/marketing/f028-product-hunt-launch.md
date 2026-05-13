# f028 — Product Hunt Launch: Testably (Playwright + Cypress Reporters)
> 유형: Product Hunt
> 작성일: 2026-04-22 (Playwright 단독 버전)
> 묶음 리라이트: 2026-05-13 (Playwright + Cypress 묶음 D-6 카피)
> 발사 예정일: 2026-05-19 (화) KST 16:00 = PT 00:00 PDT
> 타겟 채널: Product Hunt
> 관련 기능: f028 Playwright Reporter SDK + Cypress Reporter SDK

---

## PH Launch Form — 필드별 paste-ready 카피

> 아래 각 섹션을 PH 런칭 폼의 동일 필드에 그대로 붙여 넣으면 됨.
> Char count는 PH 폼 제한 (Tagline 60 / Short description 260) 기준 검증 완료.

---

### 1. Product Name

```
Testably
```

> **선택 이유**: PH 6-month cooldown 룰상 Testably 모(母) 브랜드 노출 기회는 1회. 두 reporter는 플랫폼 feature로 묶어 노출. "Testably Reporters" 같은 sub-brand 보다 검색/브랜드 양쪽 ROI 큼.

---

### 2. Tagline (60 chars max)

```
The QA platform that auto-syncs Playwright & Cypress CI
```

*(54 chars — 6자 마진)*

**Backup options (필요 시 교체용)**:
- `CI test results in your QA dashboard — Playwright & Cypress` *(59)*
- `Sync Playwright + Cypress CI runs to your QA dashboard` *(54)*
- `Your CI test results, live in your QA dashboard` *(47)*
- `QA test management with built-in Playwright + Cypress sync` *(58)*

---

### 3. Short Description / Pitch (260 chars max)

```
Testably is a QA test management platform built for CI-first teams. Add the Playwright or Cypress reporter, set 3 env vars, and every test run auto-syncs to Testably — status, failures, timing. No manual uploads, no scripts. Free plan available.
```

*(245 chars — 15자 마진)*

---

### 4. Topics / Categories (3-5 선택)

PH 검색 가능 토픽 순서대로:

1. **Developer Tools** (메인)
2. **Software Engineering**
3. **Productivity**
4. **SaaS**
5. **Open Source** *(reporter SDK가 npm 공개라서 OK — 단, Testably 본체는 closed source. 부담스러우면 5번 제외)*

---

### 5. Pricing

```
Freemium
```

*(Free plan 있음, Professional 부터 reporter 기능 unlock. PH 표기는 "Freemium" 정확.)*

---

### 6. Links

| 필드 | 값 |
|---|---|
| Website | `https://testably.app` |
| Twitter/X | *(Kyle 본인 핸들 — 비어 있으면 PH 프로필에서 자동 연결)* |
| GitHub | `https://github.com/testably/playwright-reporter` *(저장소 public 여부 확인 필요. private이면 빈 칸)* |
| Producthunt promo code | *(옵션 — 1개월 Professional 무료 코드 발급 가능하면 큰 트래픽 부스트)* |

---

### 7. Maker Comment (첫 댓글 — 라이브 직후 paste)

```
Hey Product Hunt 👋 Kyle here, founder of Testably.

We kept hearing the same story from QA teams: CI pipeline goes green (or red), and someone has to manually update the test management tool afterward. Sometimes copy-paste, sometimes a custom script cobbled together on a Friday. Either way — late, incomplete, or just lost.

So we built Testably with that gap closed from day one: a real QA test management platform (test cases, runs, milestones, Jira integration, AI run summaries) with two first-party CI reporters built in.

- @testably.kr/playwright-reporter — standard Playwright reporter, same plugin interface as `list` or `dot`. Add to `playwright.config.ts`, set 3 env vars, done.
- @testably.kr/cypress-reporter — same idea on the Cypress side. Works with cypress-multi-reporters if you want HTML + Testably side by side.

Both are 1.0.x stable, MIT, on npm. The server-side endpoint has been running in production for months, battle-tested against real CI pipelines.

If your team is already on Playwright or Cypress + a QA tool that doesn't talk to your CI: try the free plan today. Comments, bugs, feature requests — drop them right here, I'm answering all day.
```

*(약 200 words — PH "first comment" sweet spot)*

---

### 8. Gallery / Media (이미지 3-5장)

> CEO가 직접 업로드. 권장 사이즈 **1270×760**, PNG/JPG.

**필수 (최소 3장)**:
1. **OG 카드 재활용** — `public/brand/og-dark-1200x630.png` (이미 production에 있음, 1200×630이라 살짝 위/아래 여백 추가해서 1270×760로 패딩)
2. **3-line setup 코드 스크린샷** — `playwright.config.ts` 다크 테마, reporter 3줄 highlight. (기존 [f028-product-hunt-launch.md §74-83](docs/marketing/f028-product-hunt-launch.md#L74) Image 2 컨셉)
3. **Testably 대시보드 — CI 결과 sync 상태** — Test Run detail view 캡처. "Synced from Playwright CI" 뱃지 보이는 상태.

**권장 추가 (4-5번)**:
4. **Cypress 버전 코드 스니펫** — `cypress.config.ts` 동일 패턴, 두 reporter가 대칭임을 시각화
5. **Before/After 분할 이미지** — 왼쪽 "spreadsheet 수동 업데이트" vs 오른쪽 "Testably 자동 sync"

---

### 9. Launch Tags (옵션)

PH가 자동으로 보여주는 "First product", "Open Source" 등 뱃지. Kyle 계정에 첫 런칭이면 **First product** 자동으로 붙음 — 좋음(첫 런칭자 알고리즘 부스트).

---

## Pre-launch 소셜 카피 (D-3 ~ D-1)

### Twitter / X — D-3 (5/16 토)

```
🚀 Coming Tuesday on Product Hunt:

Testably — a QA test management platform with first-party Playwright + Cypress reporters built in.

3-line CI setup. Zero manual uploads. Free plan available.

Notify me 👉 [PH "Coming Soon" URL]
```

### Twitter / X — D-1 (5/18 월)

```
Tomorrow 9 AM PT on Product Hunt:

Testably is launching 🎉

If you've ever copy-pasted CI results into a QA tool — this one's for you.

→ Auto-sync Playwright runs
→ Auto-sync Cypress runs
→ AI run summaries
→ Free plan + 3-line CI setup

Set a reminder 👉 [PH link]
```

### LinkedIn — D-1 (5/18 월)

```
Tomorrow we're launching Testably on Product Hunt 🚀

Three years of building, and the core insight has stayed the same: QA teams shouldn't have to manually update their test management tool after every CI run.

So we built one that doesn't make you.

✓ Playwright reporter — 3 lines in playwright.config.ts
✓ Cypress reporter — same setup on the Cypress side
✓ AI-generated run summaries
✓ Jira sync
✓ Free plan, no credit card

Launch goes live tomorrow 9 AM PT (May 19).

If you'd like a heads-up when it's live, drop a comment or DM and I'll ping you directly. Upvotes appreciated — but more than anything I want feedback from the people building real CI pipelines.

#QualityAssurance #Playwright #Cypress #DevTools
```

---

## D-day 발사 순서 (5/19 화 KST)

| 시각 (KST) | 액션 | 채널 |
|---|---|---|
| **16:00** | PH 페이지 라이브 확인 → Maker comment paste | Product Hunt |
| **16:05** | Twitter thread 발사 | Twitter/X |
| **16:10** | LinkedIn 포스트 발행 | LinkedIn |
| **16:15** | 이메일 캠페인 발송 (기존 가입자) | Email |
| **17:00** | Dev.to 포스트 2건 (Playwright + Cypress) | Dev.to |
| **18:00 ~ 24:00** | PH 댓글 30분 내 응답 모니터링 | Product Hunt |
| **22:00** | Show HN 포스트 (HN 한정 톤으로 별도 카피) | Hacker News |
| **익일 00:00** | Reddit r/QualityAssurance 포스트 | Reddit |

---

## 옛 Playwright 단독 카피 (참고용, 미사용)

> 묶음 리라이트 이전 4월 22일 작성된 Playwright 단독 카피. 5/19 묶음 런칭에는 사용하지 않음.
> 향후 만약 Cypress 단독 launch 시 (cooldown 종료 후 6개월 뒤)에는 아래 톤 베이스로 재활용 가능.

### Old Tagline (Playwright only)
- `Your Playwright CI results, live in Testably. Zero manual uploads.` *(67 — over 60 limit)*

### Old Description (140 chars)
- `@testably.kr/playwright-reporter` — add one line to `playwright.config.ts` and your CI test results automatically sync to Testably. No scripts, no manual uploads.

### Old Maker Comment (~200 words)
- Hey Product Hunt! Kyle here, founder of Testably... *(Playwright-only 단독 톤, 묶음 카피로 대체됨)*
