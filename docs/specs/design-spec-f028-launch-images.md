# Design Spec: f028 — Product Hunt Launch Images (3종)

> **작성일:** 2026-04-23
> **작성자:** @designer (Claude)
> **상태:** Draft → CEO Review 대기
> **런칭일:** 2026-05-11 (월) 00:01 PST / 16:01 KST
> **관련 문서:**
> - Dev Spec: `docs/specs/dev-spec-f028-playwright-reporter.md`
> - Launch Plan: `docs/marketing/f028-launch-plan-may11.md`
> - PH Content: `docs/marketing/f028-product-hunt-launch.md`
> - SDK README: `packages/playwright/README.md`
> - UI Guide: `docs/UI_GUIDE.md`
> **산출물:** 마케팅 이미지 3장 (PNG @2x + WebP). 제품 UI 가 아니므로 컴포넌트 재사용/Tailwind 클래스 지시는 최소화하고, 정적 에셋 제작에 필요한 HEX / px 수치로 기술.

---

## 0. 공통 규격 (3장 전체 통일 사항)

### 0.1 캔버스 & 파일 포맷

| 항목 | 값 |
|------|-----|
| **실제 내보내기 크기** | **2540×1520 px** (Product Hunt 1270×760 권장의 **2× 해상도**) |
| 논리 기준 크기 (spec 좌표계) | 1270×760 px (설계용), 본 문서의 ASCII/좌표는 이 기준 |
| Aspect ratio | 1.671 : 1 (PH 기본 갤러리 비율과 동일) |
| PH Safe zone (상하좌우 여백) | 각 변 **40 px** (1270 기준) — PH가 라운드 마스크/호버 shadow를 입히므로 주요 텍스트는 이 안쪽에만 배치 |
| 파일 포맷 | **PNG-24** (primary, 2x), **WebP q=90** (fallback) |
| 파일명 규칙 | `f028-ph-image-{1\|2\|3}-{slug}@2x.png` / `.webp` |
| 최종 파일 크기 상한 | 1.2 MB 이하 (PH 업로드 안정성) |

### 0.2 폰트 스택 (실제 testably.app 웹앱과 동일)

| 용도 | Font family | Source |
|------|-------------|--------|
| 모든 UI 텍스트 (hero, body, 한글) | **Inter** (웹폰트, 400/500/600/700/800/900) | Google Fonts — 실제 `index.html` 에서 로드 |
| 한글 Fallback | **Noto Sans KR** (400-900) | 동일 |
| 브랜드 워드마크 `Testably` | **Pacifico** (400만) | 동일 |
| 코드 스니펫 / 모노스페이스 (tc id, run id, code block) | **JetBrains Mono** (400/500/700) | `src/index.css` 에서 일관적으로 사용 |

### 0.3 브랜드 컬러 (확정 HEX — `tailwind.config.ts` brand/accent 팔레트 기반)

| Token | HEX | 용도 |
|-------|-----|------|
| **brand-500 (Indigo primary)** | **#6366F1** | 주 CTA, 로고 T 마크, 강조 액센트 |
| brand-400 | #818CF8 | Indigo 라이트 (그라디언트 끝, hover) |
| brand-300 | #A5B4FC | 헤드라인 그라디언트 시작 |
| brand-600 | #4F46E5 | 주 CTA hover / deep indigo |
| brand-700 | #4338CA | 딥 인디고 텍스트 (violet icon 위에) |
| brand-50 | #EEF2FF | Indigo 배경 wash |
| **accent-500 (Violet)** | **#8B5CF6** | AI/Summary 액센트 |
| accent-400 | #A78BFA | Violet 라이트 |
| accent-50 | #F5F3FF | Violet 배경 wash |
| **status-passed** | #10B981 (emerald-500) | ✅ 통과 — UNCHANGED |
| status-passed-600 | #16A34A | 진한 passed (아이콘) |
| **status-failed** | #EF4444 (red-500) | ❌ 실패 |
| status-failed-600 | #DC2626 | 진한 failed |
| **status-blocked** | #F59E0B (amber-500) | ⚠️ 차단/skipped |
| status-untested | #94A3B8 (slate-400) | 미실행 |
| slate-900 | #0F172A | Dark 배경 (Image 2 메인) |
| slate-950 | #020617 | Dark 더 깊은 배경 |
| slate-800 | #1E293B | Dark card elevated |
| slate-700 | #334155 | Dark border |
| slate-400 | #94A3B8 | Muted text (dark) |
| slate-200 | #E2E8F0 | Light border |
| slate-50 | #F8FAFC | Light page bg (Image 3) |
| white | #FFFFFF | Light card bg |

### 0.4 그라디언트 프리셋

| 이름 | CSS |
|------|-----|
| **Hero indigo** | `linear-gradient(90deg, #A5B4FC 0%, #6366F1 100%)` — 헤드라인 키워드용 |
| **Brand tri** | `linear-gradient(90deg, #818CF8 0%, #A78BFA 50%, #F472B6 100%)` — "AI-native" 강조용 |
| **Page dark glow (top-left)** | `radial-gradient(circle at 20% 10%, rgba(99,102,241,0.22) 0%, transparent 55%)` |
| **Page dark glow (bottom-right)** | `radial-gradient(circle at 85% 90%, rgba(139,92,246,0.14) 0%, transparent 50%)` |

### 0.5 그림자 프리셋

| 이름 | CSS |
|------|-----|
| Card shadow (light) | `0 4px 6px -1px rgba(16,24,40,0.08), 0 2px 4px -2px rgba(16,24,40,0.05)` |
| Card shadow (elevated light) | `0 20px 25px -5px rgba(16,24,40,0.10), 0 8px 10px -6px rgba(16,24,40,0.08)` |
| Button indigo glow | `0 0 30px rgba(99,102,241,0.30)` |
| Terminal/Code window shadow | `0 40px 80px -20px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06)` |
| Callout bubble shadow | `0 10px 20px -5px rgba(16,24,40,0.15)` |

### 0.6 Dark / Light 배분 (대비 전략)

| Image | Mode | 이유 |
|-------|------|------|
| Image 1 — Before / After split | **좌 Dark (Before) + 우 Light (After)** | 수동작업 피로(검은 터미널) vs 깔끔한 자동 대시보드(밝은 UI) 대비. PH 갤러리 썸네일에서 **좌우 대비**가 즉각 인지됨. |
| Image 2 — 3-line setup | **Full Dark** | VS Code Dark+ 톤. 개발자 친화, PH 목록에서 눈에 띔. |
| Image 3 — Testably dashboard | **Light** | 실제 Testably 앱이 light 테마. 진정성 + dashboard 의 감각. |

### 0.7 베이스라인 그리드

- **8 px baseline grid** 전체 적용
- Horizontal: 12-column (gutter 24 px, margin 40 px)
- 모든 수치는 4 의 배수 (가능하면 8 의 배수)

---

## 1. Image 1 — "Before / After Split"

**Positioning:** Product Hunt Gallery **Image 1 (Hero / Thumbnail 겸용)**. 한 장으로 가치 제안을 전달.

### 1.1 캔버스

- 실제: 2540×1520 (2x)
- 논리: 1270×760
- 배경: **수직 분할** — 좌 50 % `#0F172A` (slate-900), 우 50 % `#F8FAFC` (slate-50)
- 분할선: 1 px, `#E2E8F0` (light), 우측 패널 왼쪽 경계에만
- 좌측 패널에는 top-left radial glow `rgba(99,102,241,0.18)` 깔기

### 1.2 레이아웃 (1270×760 기준 ASCII)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓ BEFORE (Dark) ▓▓▓▓▓▓▓│░░░░░░░░ AFTER (Light) ░░░░░░░░░░░░░░░░░░░░░│
│                                 │                                             │
│  [40,40]  eyebrow BEFORE        │  [675,40] eyebrow AFTER                    │
│  ─────────────────              │  ───────────────                           │
│                                 │                                             │
│  [40,80]                        │  [675,80]                                  │
│  "The old way"                  │  "With Testably Reporter"                  │
│  (H2 32 px white)               │  (H2 32 px slate-900)                      │
│                                 │                                             │
│  [40,140] TERMINAL WINDOW       │  [675,140] BROWSER WINDOW                  │
│  ┌─────────────────────┐        │  ┌──────────────────────────────────┐     │
│  │ ● ● ●   bash        │        │  │ ● ● ●   Testably / Run #1247     │     │
│  ├─────────────────────┤        │  ├──────────────────────────────────┤     │
│  │ $ npx playwright … │        │  │  Checkout Flow (live)            │     │
│  │ Running 45 tests…  │        │  │  ✅ 38  ❌ 3  ⚠️ 4                 │     │
│  │                    │        │  │  ▓▓▓▓▓▓▓▓▓░░ 84% pass           │     │
│  │ ✓  42 passed       │        │  │  ─────────────────               │     │
│  │ ✗  3 failed        │        │  │  ✅ TC-101 login                  │     │
│  │                    │        │  │  ✅ TC-102 add to cart           │     │
│  │ Run complete       │        │  │  ❌ TC-103 checkout  [CI note…]  │     │
│  │ [CURSOR BLINK] ▊   │        │  │  ✅ TC-104 receipt               │     │
│  └─────────────────────┘        │  └──────────────────────────────────┘     │
│                                 │                                             │
│  [40, 480]                      │  [675, 480]                                │
│  ↓ Manual copy-paste…           │  ↑ Auto-synced from CI (live)              │
│  (hand icon + spreadsheet       │  (checkmark + "Synced 6s ago"              │
│   mini-mockup, dimmed)          │   live badge)                              │
│                                 │                                             │
├─────────────────────────────────┴─────────────────────────────────────────────┤
│                                                                               │
│  [BOTTOM STRIP — full width, y=680, height=80, bg #0F172A]                   │
│                                                                               │
│    [T]  Testably  —  Your Playwright CI results, live in Testably.           │
│                       npm i -D @testably.kr/playwright-reporter              │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 섹션별 좌표 & 크기 (1270×760 기준)

| # | 요소 | x | y | w | h | 비고 |
|---|------|---|---|---|---|------|
| 1 | 좌측 Dark panel | 0 | 0 | 635 | 680 | 배경 #0F172A |
| 2 | 우측 Light panel | 635 | 0 | 635 | 680 | 배경 #F8FAFC |
| 3 | Eyebrow "BEFORE" | 40 | 40 | — | 14 | uppercase tracking 2 px, #FB923C (orange-400) |
| 4 | H2 "The old way" | 40 | 68 | 555 | 40 | 32 px / 900 / -0.02em / #FFFFFF |
| 5 | Terminal window | 40 | 140 | 555 | 300 | radius 12, bg #020617, shadow Terminal preset |
| 6 | Terminal title bar | 40 | 140 | 555 | 36 | bg #1E293B, 3 dots (#EF4444/#F59E0B/#10B981, 12 px circles, gap 8) |
| 7 | Terminal body (text) | 64 | 196 | 507 | 232 | font JetBrains Mono 14 / line-height 22 |
| 8 | Footer caption left | 40 | 480 | 555 | 100 | "Manual copy-paste into your QA tool" + sad hand icon |
| 9 | Eyebrow "AFTER" | 675 | 40 | — | 14 | uppercase, #6366F1 (brand-500) |
| 10 | H2 "With Testably Reporter" | 675 | 68 | 555 | 40 | 32 px / 900 / -0.02em / #0F172A |
| 11 | Browser window (dashboard mock) | 675 | 140 | 555 | 300 | radius 12, bg #FFFFFF, shadow Card elevated light |
| 12 | Browser Chrome bar | 675 | 140 | 555 | 36 | bg #F1F5F9, 3 dots same colors as terminal |
| 13 | Dashboard body | 699 | 196 | 507 | 232 | padding 16 inside |
| 14 | Footer caption right | 675 | 480 | 555 | 100 | "Auto-synced from CI — no scripts" + check icon |
| 15 | Bottom strip (full) | 0 | 680 | 1270 | 80 | bg #0F172A |
| 16 | Testably wordmark + tagline | 40 | 700 | — | 40 | logo 32 px + Pacifico 28 px "Testably" + body 14 px slate-400 |
| 17 | npm install code pill | 800 | 712 | 430 | 36 | radius 8, bg #020617 border 1px #334155, JetBrains Mono 13 px #A5B4FC |

### 1.4 타이포그래피 상세

| 요소 | Font | Size / Weight / LH / Letter-spacing | Color |
|------|------|--------------------------------------|-------|
| Eyebrow BEFORE | Inter | 12 / 700 / 16 / 0.18em (tracking-widest), uppercase | #FB923C |
| Eyebrow AFTER | Inter | 12 / 700 / 16 / 0.18em, uppercase | #6366F1 |
| H2 left/right | Inter | 32 / 900 / 40 / -0.02em | #FFFFFF (left), #0F172A (right) |
| Terminal body | JetBrains Mono | 14 / 400 / 22 / 0 | base #E2E8F0; `$` prompt #6366F1; `✓ passed` line `#10B981`; `✗ failed` line `#EF4444`; comments/dim `#64748B` |
| Dashboard TC rows | Inter | 13 / 500 / 20 / 0 | #0F172A (titles), #94A3B8 (TC ids JetBrains Mono 12) |
| Footer caption | Inter | 14 / 500 / 22 | `#94A3B8` (left on dark), `#64748B` (right on light) |
| Bottom tagline | Inter | 16 / 600 / 24 | `#FFFFFF` tagline, `#94A3B8` install snippet |
| "Testably" wordmark | Pacifico | 28 / 400 / 32 | #FFFFFF |

### 1.5 시각 요소 상세

**Terminal window (좌측)**
- Chrome bar: 3 circle dots — red #EF4444, amber #F59E0B, emerald #10B981 (12 px, 8 px gap, x=16, y=vertically centered in 36 px bar)
- "bash" label center-aligned, Inter 12 / 500 / #64748B
- Body padding: `24px 24px`
- Blinking cursor: 8×18 px block, #A5B4FC, positioned after last line
- Typed content (exact text):
  ```
  $ npx playwright test
  Running 45 tests using 4 workers
    ✓ [chromium] login.spec.ts:12 › user can log in (1.2s)
    ✓ [chromium] cart.spec.ts:8 › add to cart (890ms)
    ✗ [chromium] checkout.spec.ts:24 › payment fails (2.3s)
  ...
  42 passed · 3 failed · 4 skipped  (1m 42s)
  ```

**Dashboard mockup (우측)** — 실제 `src/pages/run-detail/page.tsx` 의 축약 재현
- Chrome bar: 같은 3 dots + URL placeholder `testably.app/runs/abcd…` (Inter 12 / 400 / #94A3B8, centered)
- Run header: `Checkout Flow` + "live" pulse badge (바깥 indigo 점 + "live" text-11 px #6366F1)
- 4 KPI chip row (compact): `Total 45` / `✅ 38` / `❌ 3` / `⚠️ 4` — 각 72×28 pill, border #E2E8F0, radius 8
- Progress bar: 8 px height, radius 4, segments emerald 84% + red 7% + amber 9%, gap 1 px
- TC list rows (4개): 각 row 44 px, 구조 `[status icon 16] [TC-ID mono 12 #6366F1] [title] [elapsed 12 #94A3B8]`
  - Row 1: ✅ #10B981 · `TC-101` · `user can log in` · `1.2s`
  - Row 2: ✅ #10B981 · `TC-102` · `add to cart` · `0.9s`
  - Row 3: ❌ #EF4444 · `TC-103` · `payment fails` · `2.3s` + 우측 끝 작은 indigo pill `from CI`
  - Row 4: ✅ #10B981 · `TC-104` · `receipt rendered` · `1.1s`

**Footer captions**
- 왼쪽: `ri-arrow-down-line` 아이콘 18 px #EF4444 + 텍스트 "Manual copy-paste into your QA spreadsheet. 😩"
- 오른쪽: `ri-check-line` 아이콘 18 px #10B981 + 텍스트 "Auto-synced from CI — zero manual steps."
- 두 캡션 baseline 을 y=500 에 맞춰 정렬

**Bottom strip**
- Testably T mark: 32×32 radius 8 bg #6366F1, 중앙 "T" Inter 900 20 px #FFFFFF
- 8 px gap, Pacifico 28 px "Testably" #FFFFFF
- 20 px gap, divider "—" Inter 16 #64748B
- 20 px gap, tagline: `Your Playwright CI results, live in Testably.`
- 우측 정렬 (x=800~1230): code pill
  - 내부 텍스트: `$ npm i -D @testably.kr/playwright-reporter` (JetBrains Mono 13 / 500 / #A5B4FC)
  - pill 배경 #020617, border 1 px #334155, radius 8, padding 8×14

### 1.6 텍스트 카피 (영어 — PH 주력)

| 영역 | Copy |
|------|------|
| Eyebrow L | `BEFORE` |
| H2 L | `The old way` |
| Caption L | `Manual copy-paste into your QA spreadsheet.` |
| Eyebrow R | `AFTER` |
| H2 R | `With Testably Reporter` |
| Caption R | `Auto-synced from CI — zero manual steps.` |
| Tagline | `Your Playwright CI results, live in Testably.` |
| Install | `$ npm i -D @testably.kr/playwright-reporter` |

**EN/KO 판단:** Image 1 은 **EN only**. PH 는 영어권 플랫폼. 한국어 버전은 별도 런칭 포스트(블로그/Linkedin KR)에서 KO로 리메이크 (파일명 `f028-ph-image-1-split-ko@2x.png`).

### 1.7 접근성 & 파일 속성

- 좌측 H2 #FFFFFF on #0F172A → 대비비 19.0 (AAA ✓)
- 우측 H2 #0F172A on #F8FAFC → 대비비 17.4 (AAA ✓)
- Terminal 빨강 `✗` 라인 #EF4444 on #020617 → 5.0 (AA ✓)
- **Alt text (PH caption):** `Side-by-side comparison: terminal Playwright output on the left vs live Testably dashboard populated from CI on the right. Bottom banner: "Your Playwright CI results, live in Testably. npm i -D @testably.kr/playwright-reporter".`

---

## 2. Image 2 — "3-line setup code snippet"

**Positioning:** Product Hunt Gallery **Image 2** — 설치 간편함을 증명.

### 2.1 캔버스

- 실제: 2540×1520 (2x)
- 논리: 1270×760
- 배경: **Full Dark** `#0F172A` (slate-900)
- Ambient glow 2개:
  - 좌상단: radial `rgba(99,102,241,0.22)` 600 px blur
  - 우하단: radial `rgba(139,92,246,0.14)` 500 px blur

### 2.2 레이아웃 (1270×760 기준 ASCII)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [40,40]  eyebrow ◆ 3-STEP SETUP                                              │
│                                                                               │
│  [40,80]  "Ship Playwright results                                            │
│            in 3 lines."                       (H1 56 px white, 2 lines)       │
│                                                                               │
│  [40,210] "5-minute setup. Works with any CI provider."                       │
│           (body 18 px slate-400)                                              │
│                                                                               │
│  ┌──────────────────────────────┐   ┌──────────────────────────────────┐     │
│  │ [60,280] STEP 1              │   │ [660,280] STEP 2                  │     │
│  │ ┌──── Terminal ──────────┐   │   │ ┌─── playwright.config.ts ───┐   │     │
│  │ │ $ npm i -D             │   │   │ │ import { defineConfig } … │   │     │
│  │ │   @testably.kr/…       │   │   │ │ export default defineConfig│   │     │
│  │ │                        │   │   │ │   reporter: [              │   │     │
│  │ │ + added 3 packages     │   │   │ │     ['list'],              │   │     │
│  │ └────────────────────────┘   │   │ │     ['@testably.kr/play…', │   │  ◀  │
│  │                              │   │ │       testCaseIdSource:    │   │  ◀  │
│  │ ① Install                    │   │ │         'title'            │   │  ◀  │
│  │                              │   │ │     }]                     │   │     │
│  │                              │   │ └────────────────────────────┘   │     │
│  │                              │   │ ② Add reporter (3 lines)         │     │
│  └──────────────────────────────┘   └──────────────────────────────────┘     │
│                                                                               │
│  [40, 600] STEP 3                                                             │
│  ┌───── GitHub Actions Secrets ─────────────────────────────────────────┐    │
│  │  🔒 TESTABLY_URL        = https://app.testably.app                   │    │
│  │  🔒 TESTABLY_TOKEN      = testably_•••••••••••••••                   │    │
│  │  🔒 TESTABLY_RUN_ID     = a2b4…-uuid                                 │    │
│  └─────────────────────────────────────────────────────────────────────┘     │
│  ③ Add 3 CI secrets  —  "That's it. Every run now lands in Testably."        │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 섹션별 좌표 & 크기

| # | 요소 | x | y | w | h | 비고 |
|---|------|---|---|---|---|------|
| 1 | Eyebrow `◆ 3-STEP SETUP` | 40 | 40 | — | 16 | `ri-sparkling-2-line` 12 px #A78BFA + text 12 / 700 / 0.18em / #A5B4FC |
| 2 | Hero H1 line 1 | 40 | 68 | 900 | 64 | 56 / 900 / 60 / -0.03em / #FFFFFF — `Ship Playwright results` |
| 3 | Hero H1 line 2 | 40 | 132 | 900 | 64 | same — `in ` + gradient span `3 lines.` (gradient Hero-indigo A5B4FC→6366F1) |
| 4 | Sub copy | 40 | 212 | 900 | 28 | 18 / 400 / 28 / #94A3B8 |
| 5 | STEP 1 card | 40 | 280 | 580 | 300 | see below |
| 6 | STEP 2 card | 660 | 280 | 570 | 300 | see below |
| 7 | STEP 3 card | 40 | 600 | 1190 | 120 | GitHub Secrets mock, full width |
| 8 | Step label `① Install` | inside card, x=60 y=540 | — | — | 16 | Inter 14 / 600 / #A5B4FC with circled number |
| 9 | Step label `② Add reporter (3 lines)` | x=680 y=540 | — | — | 16 | Inter 14 / 600 / #A5B4FC |
| 10 | Step label `③ Add 3 CI secrets` + completion | x=60 y=728 | — | — | 16 | Inter 14 / 600 / #A5B4FC + `— That's it.` in #94A3B8 |

### 2.4 카드 스타일 (Step 1, 2, 3 공통)

- 배경: `#1E293B` (slate-800) 에 linear gradient overlay `rgba(255,255,255,0.02)` 탑바
- Border: 1 px `#334155` (slate-700)
- Border radius: 16
- Padding inside: 20 (chrome bar 제외)
- Shadow: Terminal preset `0 40px 80px -20px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.06)`
- Chrome/title bar (각 카드 상단 36 px): bg `#0F172A`, 3 dots (12 px) 왼쪽 (16 px margin), 제목 센터 Inter 12 / 500 / #94A3B8

### 2.5 Step 2 — Code block (핵심)

**파일 제목:** `playwright.config.ts`

**출처:** `packages/playwright/README.md` §5-minute quick start 3단계 — **그대로 복사** (라인별 정렬 외 수정 없음):

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

**하이라이트 처리:** 세 줄 `['@testably.kr/playwright-reporter', {` / `  testCaseIdSource: 'title',` / `}],` 에 좌측 margin 위치 (x=676) 부터 오른쪽 끝까지 `rgba(99,102,241,0.12)` (indigo-500/12%) 배경 + 좌측 border-left 3 px `#6366F1`. 우측 밖 여백 (카드 바깥, x=1236~1260) 에 small indigo arrow indicator `◀` 3개 (파일 내에서 이 3줄이 '추가된 3줄' 임을 표시).

**Syntax highlighting 팔레트 (VS Code Dark+ 매칭):**

| Token | HEX | 예 |
|-------|-----|----|
| Default text | #E2E8F0 | variable names |
| Keyword (`import`, `export`, `default`) | #C586C0 | |
| Type / Class (`defineConfig`) | #4EC9B0 | function call name |
| String (`'@testably.kr/…'`, `'title'`, `'list'`) | #CE9178 | |
| Property key (`reporter`, `testCaseIdSource`) | #9CDCFE | |
| Punctuation (brackets, commas, semicolons) | #D4D4D4 | |
| Comment (없지만 사용 시) | #6A9955 | |
| Line number gutter | #6B7280 (bg transparent), active line `#C6C6C6` | |

**폰트:** JetBrains Mono 14 / 400 / line-height 22 / letter-spacing 0.

**Line number gutter:** 카드 내부 왼쪽 24 px 폭, 우측 1 px border `#334155`. 라인 번호 1~11, Inter 12 / 400 / #6B7280, 활성 3 줄은 #A5B4FC.

### 2.6 Step 1 — Terminal

- Title bar: `bash — ~/my-project`
- Body content (JetBrains Mono 14 / 22):
  ```
  $ npm i -D @testably.kr/playwright-reporter
  
  added 3 packages, and audited 1284 packages in 2.1s
  found 0 vulnerabilities
  ```
  - `$` prompt: #6366F1
  - `npm i -D` (command): #E2E8F0
  - `@testably.kr/playwright-reporter` (package): #A5B4FC (indigo-300) **bold 500**
  - 로그 출력 (`added …`): #94A3B8
  - `0 vulnerabilities`: green `#10B981`

### 2.7 Step 3 — GitHub Actions Secrets card

- Chrome bar 제목: `GitHub Actions — Secrets` + 작은 GitHub 로고 (`ri-github-fill` 14 px #E2E8F0, 좌 16 px)
- 3 rows, 각 row 32 px, gap 0 (borders 사용)
- Row 구조:
  - Lock icon `ri-lock-line` 14 px #F59E0B (amber-500) — 16 px from left
  - Secret name (JetBrains Mono 13 / 700 / #E2E8F0) — min-width 200 px
  - `=` separator Inter 13 / 400 / #64748B
  - Value (JetBrains Mono 13 / 400)
- 3 rows 내용:
  | Name | Value |
  |------|-------|
  | `TESTABLY_URL` | `https://app.testably.app` (string color `#CE9178`) |
  | `TESTABLY_TOKEN` | `testably_` + (masked) `••••••••••••••••••••••••` (JetBrains Mono 14 / #64748B dots) |
  | `TESTABLY_RUN_ID` | `a2b4c9d1-5e6f-4a8b-9c2d-3e4f5a6b7c8d` (#CE9178) |

### 2.8 텍스트 카피

| 영역 | Copy |
|------|------|
| Eyebrow | `◆ 3-STEP SETUP` |
| H1 line 1 | `Ship Playwright results` |
| H1 line 2 | `in **3 lines.**` (bold + gradient on "3 lines") |
| Sub copy | `5-minute setup. Works with any CI provider.` |
| Step 1 label | `① Install` |
| Step 2 label | `② Add reporter (3 lines)` |
| Step 3 label | `③ Add 3 CI secrets` |
| Step 3 completion suffix | `— That's it. Every run now lands in Testably.` |

**EN/KO:** EN only (PH). KO 버전은 동일 레이아웃, `3줄로 Playwright 결과를 전송하세요.` / `5분이면 완료. 모든 CI 공급자 지원.` / `① 설치` / `② 리포터 등록 (3줄)` / `③ CI secret 3개 추가` / `— 끝. 이제 모든 런이 Testably 에 자동 싱크됩니다.`

### 2.9 접근성

- H1 #FFFFFF on #0F172A: 19.0 (AAA ✓)
- 코드 #E2E8F0 on #1E293B: 12.1 (AAA ✓)
- Indigo #A5B4FC on #1E293B (key tokens): 8.9 (AAA ✓)
- **Alt text:** `Three-step setup: install the npm package, add the reporter to playwright.config.ts (3 highlighted lines), then add 3 secrets in GitHub Actions. Headline: "Ship Playwright results in 3 lines."`

---

## 3. Image 3 — "Results in Testably dashboard"

**Positioning:** Product Hunt Gallery **Image 3** — "실제 제품이 이렇게 생겼다" 증명.

### 3.1 캔버스

- 실제: 2540×1520 (2x)
- 논리: 1270×760
- 배경: **Light** `#F8FAFC` (slate-50), 약한 indigo radial glow `rgba(99,102,241,0.06)` 우상단
- **실제 제품 스크린샷 1 장 + 4 개 annotation overlay** 합성

### 3.2 레이아웃 (1270×760 기준 ASCII)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                                                               │
│  [40,36]  eyebrow ◆ IT JUST WORKS       [1020,36] (empty — callout 3 쪽)     │
│                                                                               │
│  [40,64]  "CI results + AI insights,                                          │
│           in one dashboard."                  (H1 44 px slate-900, 2 lines)   │
│                                                                               │
│  [40,180] ───────── BROWSER WINDOW (screenshot) ──────────────────────────    │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ ● ● ●   testably.app/projects/…/runs/abcd  🔒                        │    │
│  ├──────────────────────────────────────────────────────────────────────┤    │
│  │ ◀ Back to runs                                                        │    │
│  │                                                                       │    │
│  │ Checkout Flow CI Run #1247 🟢 in_progress ▼ 🤖 Automated      [Focus]│◀── │
│  │ Started 2026-05-11 · 93% completed · 45 test cases            (1)   │    │
│  │                                                                       │    │
│  │ [Total 45] [✅ 38] [❌ 3] [⚠️ 4] [⏳ 0]                                │    │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░  93%                                    │    │
│  │                                                                       │    │
│  │ ┌─ AI Run Summary ──────────────────────────────────┐  ┌─ Filters ─┐│    │
│  │ │ ✨ Generated 12s ago                              │  │ …         ││◀── │
│  │ │ 3 failures cluster on payment API timeouts…      │  └───────────┘│ (4)│
│  │ │ Likely cause: slow checkout endpoint.             │               │    │
│  │ └───────────────────────────────────────────────────┘               │    │
│  │                                                                       │    │
│  │ ┌─ Test cases list ──────────────────────────────────────────────┐  │    │
│  │ │ ✅ TC-101  user can log in                     passed    1.2s  │  │    │
│  │ │ ✅ TC-102  add to cart                         passed    0.9s  │  │    │
│  │ │ ❌ TC-103  payment fails on Visa              failed   2.3s    │◀─│(3) │
│  │ │      ⚠  "Timeout 30000ms exceeded waiting for selector …"      │  │    │
│  │ │ ✅ TC-104  receipt rendered                    passed    1.1s  │  │    │
│  │ │ …                                                               │  │    │
│  │ └────────────────────────────────────────────────────────────────┘  │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│  Callout (2): "38 mapped / 4 skipped" at 500, 380                            │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 섹션별 좌표 & 크기

| # | 요소 | x | y | w | h | 비고 |
|---|------|---|---|---|---|------|
| 1 | Eyebrow `◆ IT JUST WORKS` | 40 | 36 | — | 14 | `ri-sparkling-2-line` + text 12 / 700 / tracking-widest / #6366F1 |
| 2 | H1 line 1 | 40 | 60 | 1000 | 56 | 44 / 900 / 52 / -0.02em / #0F172A — `CI results + AI insights,` |
| 3 | H1 line 2 | 40 | 116 | 1000 | 56 | same — `in ` + gradient span `one dashboard.` (gradient Brand tri) |
| 4 | Browser window wrapper | 40 | 200 | 1190 | 520 | radius 16, bg #FFFFFF, Card elevated shadow, border 1 px #E2E8F0 |
| 5 | Chrome bar | 40 | 200 | 1190 | 40 | bg #F1F5F9, 3 dots, URL bar center (compact pill) |
| 6 | Screenshot content area | 40 | 240 | 1190 | 480 | **실제 Testably run-detail 스크린샷 크롭 삽입** |

### 3.4 스크린샷 크롭 영역 (Image 3 메인 소스)

**출처 라우트:** `/projects/:projectId/runs/:runId`
**소스 컴포넌트:** `src/pages/run-detail/page.tsx` (render 된 상태)
**사용 화면 상태:**
- 실제 CI 로부터 업로드된 run 을 하나 시드 데이터로 세팅:
  - Run name: `Checkout Flow CI Run #1247`
  - Status: `in_progress` (파란 pulse dot badge)
  - `is_automated = true` → 🤖 Automated (sky) 뱃지 표시됨
  - Started: 2026-05-11 09:05 KST
  - Total 45 / Passed 38 / Failed 3 / Blocked/Skipped 4 / Untested 0
  - 93 % completed
  - Test cases: 45 개 (TC-101 ~ TC-145), 화면에는 처음 6 행만 보임
- AI Run Summary 카드 활성 (snapshot fresh, 12 초 전 생성)

**크롭 범위 (브라우저 스크린샷 내):**
- src 원본: Testably 웹앱을 1440×900 해상도에서 Chrome DevTools 로 화면 캡처 (devicePixelRatio 2)
- 크롭 박스: **ProjectHeader 바로 아래 ~ Test cases 목록 6 번째 row 아래 10 px 까지**
  - 폴더 사이드바 (left 200 px) **포함** — 실제 product feel 을 위해
- 스크롭된 스크린샷 원본 크기: 약 2880×1920 (2x). Image 3 내부에는 **1190×480 에 fit-cover** (종횡비 유지, 상하 크롭)

**편집 금지 항목:**
- 실제 유저 ID / 이메일 / project name (시연 계정 `demo@testably.app` 의 `Acme Shop` 프로젝트 사용)
- 토큰 / UUID 필드는 마스킹 (`ab••••cd`)

### 3.5 Annotation overlay (4 개)

모두 **fl oating 말풍선 스타일**. 공통 스펙:
- Bubble bg: `#FFFFFF`
- Border: 1.5 px `#6366F1`
- Radius: 12
- Shadow: Callout preset
- Padding: 10 × 14
- Text: Inter 13 / 600 / 18 / #0F172A
- Prefix icon (각 bubble 좌측): indigo-50 bg, 20 px square, radius 6, inside Remix Icon 12 px #6366F1
- Arrow/leader: 1.5 px `#6366F1` solid line, 끝에 6 px dot `#6366F1`

| # | Annotation (label) | Position (x,y of bubble top-left) | Size | Leader 목표 (screenshot 내부 좌표) |
|---|-------------------|-----------------------------------|------|-----------------------------------|
| 1 | `🤖 Synced from Playwright CI` | 970, 240 | 260×48 | 뱃지 🤖 Automated pill (대략 screenshot local 430, 16) |
| 2 | `38 mapped / 4 skipped (no TC id)` | 500, 380 | 290×48 | KPI chip row 의 "✅ 38" 와 "⚠️ 4" 사이 (screenshot local 230, 130) |
| 3 | `Playwright error → Testably note` | 600, 540 | 320×48 | Failed row의 error message 라인 (screenshot local 180, 280) |
| 4 | `AI Run Summary (12s ago)` | 850, 460 | 280×48 | AI Summary card header (screenshot local 600, 220) |

### 3.6 타이포그래피 상세

| 요소 | Font | Size / Weight / LH / LS | Color |
|------|------|--------------------------|-------|
| Eyebrow | Inter | 12 / 700 / 16 / 0.18em, uppercase | #6366F1 |
| H1 line 1 | Inter | 44 / 900 / 52 / -0.02em | #0F172A |
| H1 gradient span | Inter | 44 / 900 / 52 / -0.02em | Brand tri gradient (text-fill-transparent) |
| Annotation text | Inter | 13 / 600 / 18 / 0 | #0F172A |
| Screenshot (실제 렌더링 그대로) | Inter / JetBrains Mono | (제품 스타일 유지) | — |

### 3.7 시각 요소 상세

- Browser Chrome 3 dots: 같은 색 스펙 (12 px circles, 8 px gap, x=60)
- URL pill: `testably.app/projects/acme-shop/runs/1247` Inter 12 / 400 / #64748B, centered, bg #FFFFFF inside darker chrome bar
- Lock icon (URL 앞): `ri-lock-line` 12 px #10B981
- Annotation leader lines: Bezier curve 1.5 px stroke `#6366F1`, endpoint 6 px filled dot, start-point 6 px empty ring (같은 색). Anti-alias 처리.
- Optional subtle `prefers-reduced-motion` safe: 애니메이션 없음, 정적 이미지.

### 3.8 텍스트 카피

| 영역 | EN (primary) | KO (localized variant) |
|------|--------------|------------------------|
| Eyebrow | `◆ IT JUST WORKS` | `◆ 바로 작동합니다` |
| H1 line 1 | `CI results + AI insights,` | `CI 결과와 AI 인사이트를` |
| H1 line 2 | `in one dashboard.` | `한 대시보드에서.` |
| Callout 1 | `🤖 Synced from Playwright CI` | `🤖 Playwright CI 에서 자동 싱크됨` |
| Callout 2 | `38 mapped · 4 skipped (no TC id)` | `38개 매핑됨 · 4개 스킵 (TC ID 없음)` |
| Callout 3 | `Playwright error → Testably note` | `Playwright 에러 → Testably 노트로 자동 전달` |
| Callout 4 | `AI Run Summary — generated 12s ago` | `AI 런 요약 — 12초 전 생성` |

**EN/KO 판단:** Image 3 은 **EN primary, KO variant 제작 권장** — 한국 시장 대상 Loops 이메일 / LinkedIn KR 포스트 때 필요. 제품 스크린샷 내부는 EN UI (실제 `/en` 라우트) 로 고정.

### 3.9 접근성

- H1 #0F172A on #F8FAFC: 17.4 (AAA ✓)
- Annotation #0F172A on #FFFFFF: 18.7 (AAA ✓)
- Indigo leader line #6366F1 on #F8FAFC: 4.6 (AA ✓, leader 는 그래픽 요소이므로 AA 충분)
- **Alt text:** `Screenshot of the Testably run detail page showing a CI-synced Playwright run: 45 total tests, 38 passed, 3 failed, 4 skipped. Four callouts point to: the Playwright CI sync badge, the 38/4 mapping summary, a failed test with Playwright error surfaced as Testably note, and the AI Run Summary card.`

---

## 4. PH 제출 시 활용 매핑

| Slot | Image | File | Alt text (최대 125 chars) | Role |
|------|-------|------|---------------------------|------|
| **Gallery 1 (= Thumbnail)** | Image 1 | `f028-ph-image-1-split@2x.png` | `Side-by-side: manual CI copy-paste vs auto-synced Testably dashboard.` | Thumbnail 겸용 — 처음 5 초 안에 핵심 전달 |
| Gallery 2 | Image 2 | `f028-ph-image-2-setup@2x.png` | `3-line setup: npm install, add reporter, add 3 CI secrets. 5 minutes.` | 설치 쉬움을 증명 |
| Gallery 3 | Image 3 | `f028-ph-image-3-dashboard@2x.png` | `Testably dashboard with live CI results + AI Run Summary.` | Product proof — 진정성 |

> Product Hunt 는 자동으로 첫 번째 갤러리 이미지를 썸네일로 씀. Image 1 을 1번 슬롯에 배치.
> Image 2 는 dev 타겟 CTA. Image 3 는 product proof. 순서 바꾸지 말 것.

---

## 5. 제작 체크리스트 (CEO 용)

### 5.1 툴 추천

| 선택지 | 추천 이미지 | 장점 | 예상 시간 |
|--------|-------------|------|----------|
| **Figma** (추천) | 1, 2, 3 | 벡터, 재수정 용이, 공유 링크. Free tier 충분. | **Image 1: 90 분 / Image 2: 60 분 / Image 3: 45 분** (스크린샷 합성) |
| Tailwind Play + Chrome screenshot | Image 2 | 실제 HTML/CSS 로 코드 블록 렌더링 — 구문강조 정확도 최고. | Image 2 단독 30 분 |
| Excalidraw (보조) | Image 3 의 annotation only | 손그림 느낌 callout. | 15 분 추가 |
| Carbon.now.sh | Image 2 의 code block only | VS Code Dark+ 완벽 재현. 테마 `Dracula` 또는 `VSCode Dark+`, font `JetBrains Mono 14`, padding 32. | 5 분 |
| 실제 Testably 앱 스크린샷 | Image 3 base | 가장 진정성 있음. **무조건 Image 3 는 이 방법 권장.** | 10 분 (샘플 데이터 세팅 포함) |

**하이브리드 권장 플로우:**
1. Image 3 → Testably 데모 계정에 f028 시드 데이터 투입 → Chrome DevTools Device Mode 1440×900 @2x 스크린샷 → Figma 에 import → callout overlay 4 개 합성
2. Image 2 → Carbon.now.sh 로 코드 블록 PNG 내보내기 → Figma 에 import → step 1/3 카드 / eyebrow / headline / step labels 추가
3. Image 1 → Figma 100% 구성 — Terminal 은 텍스트로, Dashboard mock 은 간단한 component

### 5.2 색각이상자 대응 (WCAG AA)

- Image 1 좌측 H2 #FFFFFF on #0F172A → 19.0 (AAA ✓)
- Image 1 Terminal `✗` red #EF4444 on #020617 → 5.0 (AA ✓)
- Image 2 H1 #FFFFFF on #0F172A → 19.0 (AAA ✓)
- Image 2 indigo token #A5B4FC on #1E293B → 8.9 (AAA ✓)
- Image 3 H1 #0F172A on #F8FAFC → 17.4 (AAA ✓)
- ❗ **빨강-초록 색각이상 대응:** 상태 아이콘 옆에 **항상 심볼 함께** (✓/✗/⚠) 사용. Image 1 Dashboard mock 의 TC row 에 ✅/❌ emoji 를 두텁게 표현. Image 3 스크린샷에도 실제 앱이 이미 icon + color 페어링 사용 → 자연스럽게 통과.

### 5.3 파일 내보내기 체크

- [ ] PNG-24 @2x (2540×1520) 3장
- [ ] WebP q=90 @2x (2540×1520) 3장
- [ ] 각 파일 ≤ 1.2 MB (초과 시 Squoosh 로 압축)
- [ ] sRGB 컬러 프로파일 임베드
- [ ] 메타데이터 EXIF 제거 (ImageOptim / squoosh)
- [ ] 파일명 규칙 준수: `f028-ph-image-{1|2|3}-{slug}@2x.{png|webp}`
- [ ] Figma 파일 링크를 `docs/marketing/f028-launch-plan-may11.md` 에 기록

### 5.4 제출 전 검증

- [ ] 3장 모두 Product Hunt preview 에서 round-corner mask 가 주요 텍스트 가리지 않음 (safe zone 40 px 유지 확인)
- [ ] 어두운 방 / 밝은 방 각각에서 시연 (OLED 번인 / 주간 광량 대비)
- [ ] iPhone Safari 에서 PH 모바일 페이지 확인 (갤러리 scroll-snap 시 Image 1 썸네일 시인성)
- [ ] 한 번 더 SDK 버전 1.0.1 로 모든 이미지 내부 표기 고정 (alpha 흔적 0)
- [ ] 코드 스니펫에 `0.1.0-alpha` / `@alpha` 표기 남아있지 않음

---

## 6. 자체 체크리스트 (Design Spec 품질 게이트)

3 장 모두 아래 10 개 항목이 빠짐없이 명세되었는가:

| # | 항목 | Image 1 | Image 2 | Image 3 |
|---|------|:-------:|:-------:|:-------:|
| 1 | 캔버스 규격 (px, aspect, safe zone, bg) | ✓ (§0.1, §1.1) | ✓ (§2.1) | ✓ (§3.1) |
| 2 | 레이아웃 ASCII + 좌표/크기 | ✓ (§1.2, §1.3) | ✓ (§2.2, §2.3) | ✓ (§3.2, §3.3) |
| 3 | 타이포그래피 (font / size / weight / LH / LS / color) | ✓ (§1.4) | ✓ (§2.5, §2.8) | ✓ (§3.6) |
| 4 | 색상 팔레트 HEX 전부 | ✓ (§0.3 공통 + §1 전반) | ✓ (§0.3 + §2.5 SH 팔레트) | ✓ (§0.3 + §3) |
| 5 | 시각 요소 상세 (아이콘 / 그라디언트 / 그림자 / 일러스트) | ✓ (§1.5) | ✓ (§2.4, §2.6, §2.7) | ✓ (§3.5, §3.7) |
| 6 | 텍스트 카피 (모든 표시 텍스트) | ✓ (§1.6) | ✓ (§2.8) | ✓ (§3.8) |
| 7 | 코드 스니펫 (README 정확 복사) | N/A (요약만) | ✓ (§2.5 verbatim) | N/A |
| 8 | 스크린샷 크롭 영역 + annotation overlay | N/A | N/A | ✓ (§3.4, §3.5) |
| 9 | PH 제출 시 활용 (slot / alt / caption) | ✓ (§4) | ✓ (§4) | ✓ (§4) |
| 10 | 제작 체크리스트 (툴 / 시간 / 색각 / 파일) | ✓ (§5) | ✓ (§5) | ✓ (§5) |

**Dark/Light 배분:** Image 1 = Split (좌 Dark + 우 Light), Image 2 = Dark, Image 3 = Light. **요구사항 "최소 1장 Dark + 최소 1장 Light" 충족 ✓**

**Tailwind 클래스 언급 최소화:** ✓ — 모든 수치를 HEX/px 로 직접 명시. Tailwind 토큰 은 `tailwind.config.ts` 참조 근거로만 언급.

**EN/KO 명시:** ✓ — 3 장 모두 EN primary, Image 3 은 KO variant 스펙 제공, Image 1/2 는 "KO 는 별도 채널용" 판단 서술.

---

## 7. 다음 단계 (design → production 핸드오프)

1. **2026-04-24 (목) CEO 리뷰** — 본 스펙의 카피/색상/레이아웃 승인
2. **2026-04-28 ~ 30** — CEO 가 Figma/Carbon/Chrome 로 실제 이미지 3장 제작
3. **2026-05-01 (금)** — PH 초안 등록 때 3 장 업로드 + preview 검증
4. **2026-05-10 (일)** — 런칭 전일 점검 시 최종 PNG/WebP 파일 사이즈/색프로파일 체크
5. **2026-05-11 (월) 00:01 PST** — PH submit (Gallery 순서: 1 → 2 → 3)

> 본 문서는 Design Spec 이며, 실제 이미지 파일은 `docs/marketing/assets/f028/` 에 PNG+WebP 로 저장할 것. 파일 생성 후 이 스펙에 링크 추가.

---

## 8. 산출된 이미지 파일 (2026-04-23 v1)

HTML 소스 + 빌드 스크립트: [`marketing/launch-images-f028/`](../../marketing/launch-images-f028/README.md)

| Slot | 파일 | 크기 | 해상도 |
|------|------|------|--------|
| Gallery 1 (Thumbnail) | [`f028-ph-image-1-split@2x.png`](../marketing/assets/f028/f028-ph-image-1-split@2x.png) | ~407 KB | 2540×1520 |
| Gallery 2 | [`f028-ph-image-2-setup@2x.png`](../marketing/assets/f028/f028-ph-image-2-setup@2x.png) | ~702 KB | 2540×1520 |
| Gallery 3 | [`f028-ph-image-3-dashboard@2x.png`](../marketing/assets/f028/f028-ph-image-3-dashboard@2x.png) | ~476 KB | 2540×1520 |

**재생성 방법:**
```bash
node marketing/launch-images-f028/build.mjs          # 3장 전부
node marketing/launch-images-f028/build.mjs --only=2 # 특정 이미지만
```

**권장 후속 작업:**
- Image 3 의 목업 대시보드를 **실제 Testably 앱 스크린샷**으로 교체 (`image3.html` 의 `.app` 블록을 `<img>` 로 교체 후 재빌드) — 진정성 강화.
- WebP 폴백 생성: `npx @squoosh/cli --webp '{"quality":90}' docs/marketing/assets/f028/*.png`
- Figma 로 re-export 원하면 HTML 의 수치를 그대로 픽셀 단위 Frame 으로 옮기면 됨.
