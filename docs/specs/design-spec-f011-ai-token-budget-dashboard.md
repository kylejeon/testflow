# Design Spec: f011 — AI Token Budget Monitoring Dashboard

> **작성일:** 2026-04-23
> **작성자:** @designer (Phase 3)
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-f011-ai-token-budget-dashboard.md` (22 AC)
> **관련 리서치:** `docs/research/f011-ai-token-budget-dashboard.md`
> **Figma 링크:** N/A (Tailwind-only spec — inline ASCII wireframes below)

---

## 0. Scope 요약 (디자이너 체크)

- 위치: `/settings?tab=ai-usage` (Settings 탭 네비게이션에 신규 탭 추가)
- 캔버스: **Settings 페이지는 라이트 톤 (`bg-slate-50`) 사용** — `docs/UI_GUIDE.md` 의 슬레이트-900 캔버스는 **마케팅 사이트 전용** 이며, 인-앱 Settings 는 기존 `settings/page.tsx` 가 slate-50 배경을 쓴다. 본 명세의 모든 색상 토큰은 **light canvas** 기준이며, 다크모드 매핑은 §8 참조 (다크 모드는 추후 전사 다크화 때 활성화, v1 구현은 라이트 기준만 필수).
- 두 개의 뷰 모드: **Team View** (Owner/Admin) / **Self View** (Member).
- 기준 뷰포트 너비: **1440 px** (사이드바 포함 전체 화면).

---

## 1. 레이아웃 & 기준 너비

### 1-1. 전체 구조 (Settings 페이지 컨테이너 재사용)

Settings 페이지의 기존 shell — fixed 사이드바 `w-60` + header (row 1: breadcrumb / row 2: tab nav) + `<main class="flex-1 overflow-y-auto bg-slate-50">` — 을 그대로 사용. AI Usage 패널은 main 내부 `max-w-[800px]` 제약을 **해제하고 `max-w-[1160px]` 로 확장**한다 (차트/테이블 가독성 우선).

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Fixed sidebar (w-60)  │  Settings Header                                │
│                        │  ┌──────────────────────────────────────────┐   │
│                        │  │ breadcrumb … profile menu                │   │
│                        │  │ Profile · Billing · … · AI Usage (new) ← │   │
│                        │  └──────────────────────────────────────────┘   │
│                        │                                                 │
│                        │  <main bg-slate-50 overflow-y-auto>              │
│                        │   ┌── max-w-[1160px] mx-auto px-4 md:px-8 ──┐    │
│                        │   │                                         │    │
│                        │   │  Page title block  +  Period filter     │    │
│                        │   │                                         │    │
│                        │   │  ┌───── KPI cards (3 or 4) ─────────┐   │    │
│                        │   │  │ Team Usage │ Burn Rate │ ...     │   │    │
│                        │   │  └─────────────────────────────────┘   │    │
│                        │   │                                         │    │
│                        │   │  ┌───── Daily Usage (stacked bar) ──┐   │    │
│                        │   │  │                                  │   │    │
│                        │   │  └──────────────────────────────────┘   │    │
│                        │   │                                         │    │
│                        │   │  ┌── Mode Breakdown ─┐ ┌── Members ─┐   │    │
│                        │   │  │ (table, 5 rows)   │ │ (table)    │   │    │
│                        │   │  └───────────────────┘ └────────────┘   │    │
│                        │   └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1-2. 기준 너비 표

| 영역 | 너비 / Tailwind |
|------|----------------|
| Sidebar (기존) | `w-60` (240 px) |
| Settings header | 전체 폭 |
| AI Usage 컨테이너 | `max-w-[1160px] mx-auto px-4 md:px-8 pt-6 pb-12` |
| KPI 카드 영역 | `grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4` |
| Daily Usage 차트 카드 | 전체폭, 높이 `h-[360px]` (차트 본체 280 px + header 80 px) |
| Mode Breakdown | `xl:col-span-5` (5/12) |
| Member Contribution | `xl:col-span-7` (7/12) |
| 모달 | `max-w-md` (CSV Export 확인용) — 현재는 모달 없이 즉시 다운로드 |

---

## 2. Page Header

```
┌───────────────────────────────────────────────────────────────────────────┐
│  ✨  AI Credit Usage                                                       │
│  text-[1.25rem] font-bold (20/28 700)   text-slate-900                     │
│                                                                           │
│  See how your team is consuming AI credits this period.                   │
│  text-[0.8125rem] text-slate-500                                          │
│                                                                           │
│  ──────────────────────────────────────────────────────────────           │
│                                                                           │
│  [Period ▾ Last 30 days]   [🔄 Refresh]           [⬇ Export CSV]           │
│   rounded-full pill                                      Owner/Admin only  │
└───────────────────────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Title row | `flex items-center gap-3 mb-1` |
| Title icon tile | `w-10 h-10 rounded-[0.625rem] bg-violet-500/10 flex items-center justify-center` — `<i class="ri-sparkling-2-fill text-violet-500 text-xl">` |
| Title text | `text-[1.25rem] font-bold text-slate-900` |
| Subtitle | `text-[0.8125rem] text-slate-500 mb-4` (team view) / `mb-4` (self view: 다른 i18n 키) |
| Divider | `border-t border-slate-200 my-4` |
| Toolbar row | `flex flex-wrap items-center gap-2 mb-6` — Period filter 좌측, flex-1 spacer, Refresh + Export 우측 |

### 2-1. Breadcrumb (Settings header 기존 영역 재사용)

Settings header row 1은 기존 그대로 사용: `Projects > Settings`. AI Usage 탭이 active 되면 tab 버튼이 indigo underline 으로 강조된다 (§2-2).

### 2-2. Tab 버튼 (기존 tab nav 에 추가)

`src/pages/settings/page.tsx` line 1897 의 tab 배열에 **맨 끝에** `ai-usage` 항목 추가:

```ts
{ key: 'ai-usage', label: 'AI Usage', icon: 'ri-sparkling-2-fill', iconColor: '#8B5CF6' }
```

- 탭 active 시 기존 스타일 그대로: `color: #6366F1; border-bottom: 2px solid #6366F1; font-weight: 600`
- 아이콘 컬러는 violet-500(#8B5CF6) — AI 기능 공통 컬러 (기존 `Sidebar AI Usage` 카드의 `text-violet-500` 와 일관)

---

## 3. 컴포넌트 명세 (Team View — Owner/Admin)

### 3-1. Period Filter 드롭다운 (신규 컴포넌트 `PeriodFilter`)

```
┌────────────────────────────────────┐
│ [🔽 Last 30 days ▾]                │  ← trigger
└────────────────────────────────────┘
        ↓ (onClick)
┌────────────────────────────────────┐
│  ✓  Last 30 days                   │  ← active
│     Last 90 days                   │
│     Last 6 months     [Upgrade🔒]  │  ← 플랜 상한 초과 시 disabled
│     Last 12 months    [Upgrade🔒]  │
└────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Trigger 버튼 | `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[0.8125rem] font-medium text-slate-700 hover:border-slate-300 transition-colors` |
| Trigger (open state) | `border-indigo-500 bg-indigo-50 text-indigo-600` |
| Icon (leading) | `<i class="ri-calendar-line text-slate-400 text-[0.875rem]">` |
| Chevron | `<i class="ri-arrow-down-s-line text-slate-400">` (열렸을 때 `rotate-180`) |
| Dropdown | `absolute right-0 top-[calc(100%+4px)] z-50 min-w-[220px] bg-white border border-slate-200 rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1` |
| Dropdown item | `flex items-center justify-between px-3 py-2 text-[0.8125rem] text-slate-700 hover:bg-slate-50 cursor-pointer` |
| Active item | `text-indigo-600 font-semibold` + trailing `<i class="ri-check-line">` |
| Disabled item (플랜 상한 초과) | `opacity-60 cursor-not-allowed` + trailing `<i class="ri-lock-2-line text-slate-400">` + 툴팁 표시 |
| Disabled tooltip | `absolute right-full top-1/2 -translate-y-1/2 mr-2 bg-slate-900 text-white text-[0.6875rem] font-medium rounded px-2 py-1 whitespace-nowrap shadow-lg` |

**동작 (AC-5):**
- Free → `30d` 외 전부 disabled, 툴팁 "Upgrade to Hobby to view longer history"
- Hobby → `6m`, `12m` disabled, 툴팁 "Upgrade to Starter to view longer history"
- Starter → `12m` disabled (tooltip Professional)
- Professional+ → 전부 활성
- Enterprise → `24m` 옵션 추가 (v1 기준은 `12m` 까지. 24m 은 OOS)

**URL sync:** 선택 변경 시 `setSearchParams({ tab: 'ai-usage', period: '30d' })` 로 URL query 반영. 최초 로드 시 `searchParams.get('period')` 로 복원.

### 3-2. KPI 카드 (신규 컴포넌트 `KpiCard`)

Team View 에서 **4개** 카드 가로 배치. Self View 에서 **2개** (This month / Last 30d) 만 노출.

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ THIS MONTH       │ BURN RATE        │ MODE COUNT       │ ACTIVE MEMBERS   │
│ 37 / 150         │ 1.8 credits/day  │ 4 of 7           │ 6 of 8           │
│  credits used    │ est. 68 days     │  modes used      │  team members    │
│ ──────────       │ ●───────── on    │                  │                  │
│ 25% of monthly   │    track         │                  │                  │
│ quota            │                  │                  │                  │
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

#### 카드 1 — This Month (Burn Rate 핵심) — AC-3, AC-12

| 요소 | Tailwind |
|------|----------|
| Container | `bg-white border border-slate-200 rounded-xl p-5 flex flex-col` |
| Eyebrow | `text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 mb-2` |
| Primary metric | `text-[1.75rem] font-bold text-slate-900 leading-none tabular-nums` |
| Divider inline | `<span class="text-slate-400 text-base font-normal ml-1">/ 150</span>` |
| Sub-label | `text-[0.75rem] text-slate-500 mt-1` ("credits used") |
| Progress bar wrap | `mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden` |
| Progress fill | `h-full rounded-full bg-indigo-500` (0–79%) / `bg-amber-500` (80–99%) / `bg-red-500` (100%+) |
| Percent footer | `text-[0.6875rem] text-slate-500 mt-2` ("25% of monthly quota") |

**Enterprise (limit = -1) variant (AC-12):**
- Primary metric: `text-[1.75rem] font-bold text-emerald-600` 로 "Unlimited"
- Sub-label: `{aiUsageCount} used this month`
- Progress bar 미표시
- Footer에 emerald 뱃지 `<span class="inline-flex items-center gap-1 text-[0.6875rem] font-semibold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5">∞ Enterprise</span>`

#### 카드 2 — Burn Rate (AC-3)

| 요소 | Tailwind |
|------|----------|
| Eyebrow | `text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400 mb-2` — "BURN RATE" |
| Primary | `text-[1.75rem] font-bold text-slate-900 tabular-nums` — "1.8 credits/day" |
| Sub-label | `text-[0.75rem] text-slate-500` — "Estimated depletion: May 18" |
| Trend badge (on-track) | `inline-flex items-center gap-1 text-[0.6875rem] font-semibold bg-emerald-50 text-emerald-700 rounded-full px-2 py-0.5 mt-2` — `<i class="ri-check-line">` + "On track" |
| Trend badge (warning) | `bg-amber-50 text-amber-700` — `<i class="ri-alert-line">` + "Usage is outpacing plan" |

**판정 로직 (BR 참고, 개발자 구현):**
- `onTrack`: (credits/day × days_left_in_cycle + used) ≤ limit
- `warning`: 초과 예상. Days-to-depletion 숫자가 `days_left_in_cycle` 보다 작을 때

#### 카드 3 — Mode Count (단순 정보)

| 요소 | Tailwind |
|------|----------|
| Eyebrow | "MODES USED" |
| Primary | `text-[1.75rem] font-bold text-slate-900 tabular-nums` — "4" + `<span class="text-slate-400 text-base">/ 7</span>` |
| Sub-label | "modes used this period" |

#### 카드 4 — Active Members (Team View 전용)

| 요소 | Tailwind |
|------|----------|
| Eyebrow | "ACTIVE MEMBERS" |
| Primary | `text-[1.75rem] font-bold text-slate-900 tabular-nums` — "6" + `<span class="text-slate-400 text-base">/ 8</span>` |
| Sub-label | "members generated AI" |
| Footer avatars | `flex -space-x-2 mt-3` (최대 5개, 그 뒤 `+N` 배지) |

### 3-3. Daily Usage Chart (신규 컴포넌트 `DailyUsageChart`)

#### 차트 타입 의사결정

| 옵션 | 장점 | 단점 | 선택? |
|------|------|------|-------|
| A. **Daily stacked bar by mode** | mode(Testably 차별화 축) 를 막대 segmentation 으로 즉시 전달. 이산 일자 단위에 적합. 경쟁사(Anthropic)가 동일 패턴. | 막대 수 많을 때(90d+) 가독성 하락 | ✅ **기본** |
| B. Daily line (total) + toggle by mode | 최대값 흐름 파악 쉬움 | mode breakdown 한 눈에 안 보임 | ❌ |
| C. Area chart (stacked area by mode) | 누적 흐름 가시화 | 일 단위 sparse 데이터에서 왜곡(0 day가 보간됨) | ❌ |

**선택: A (Daily stacked bar)** — mode 차별화가 기능의 핵심이므로 breakdown 이 항상 보이는 stacked bar 채택. 90d+ 조회 시 막대 폭이 좁아지므로 `barCategoryGap="20%"` 로 조정하고, 120+ 일자는 `XAxis.interval={Math.floor(count/10)}` 로 라벨 thinning.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Daily Usage                                          aria-label=... │
│                                                                     │
│     credits                                                         │
│       ▲                                                             │
│    12 │  ▇                                                          │
│    10 │  ▇   ▇                        ▇                             │
│     8 │  ▇   ▇   ▇       ▇       ▇    ▇                             │
│     6 │  ▇   ▇   ▇   ▇   ▇   ▇   ▇    ▇                             │
│     4 │  ▇   ▇   ▇   ▇   ▇   ▇   ▇    ▇   ▇                         │
│     2 │  ▇   ▇   ▇   ▇   ▇   ▇   ▇    ▇   ▇                         │
│     0 └──────────────────────────────────────────────────────→ date │
│       Apr1 ... Apr7 ... Apr14 ...                                   │
│                                                                     │
│  ● Test Cases (Text)   ● Test Cases (Jira)   ● Test Cases (Session) │
│  ● Run Analysis  ● Plan Assistant  ● Risk Predictor  ● Milestone    │
└─────────────────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind / Recharts prop |
|------|-------------------------|
| Container | `bg-white border border-slate-200 rounded-xl p-5 mb-6` |
| Header row | `flex items-start justify-between mb-4` |
| Title | `text-[0.9375rem] font-semibold text-slate-900` — "Daily Usage" |
| Subtitle | `text-[0.75rem] text-slate-500` — "{{from}} — {{to}} · UTC" |
| Legend dots | `inline-flex items-center gap-1.5 text-[0.75rem] text-slate-600` — `<span class="w-2.5 h-2.5 rounded-full" style="background: #...">` |
| Chart wrapper | `<ResponsiveContainer width="100%" height={280}>` |
| BarChart margin | `{ top: 8, right: 8, left: -16, bottom: 0 }` |
| CartesianGrid | `strokeDasharray="3 3" stroke="#f1f5f9" vertical={false}` |
| XAxis | `tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} interval="preserveEnd"` |
| YAxis | `tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} axisLine={false} allowDecimals={false}` |
| Bar (each mode) | `<Bar dataKey={mode} stackId="a" fill={MODE_COLORS[mode]} radius={[0,0,0,0]}` — 단 최상단 mode 만 `radius=[3,3,0,0]` 동적 계산 |
| Tooltip | `<Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }}` |

#### Mode 색상 매핑 (신규 상수 `MODE_COLORS`, `src/lib/aiUsageMeta.ts`)

팔레트는 **Testably 브랜드 팔레트 (Indigo/Violet accent)** 에서 추출. WCAG AA 대비 유지(AC-17), 7개 mode 각각 고유 hex.

| mode 값 | 라벨 | Tailwind (시각 참조) | Hex (fill) |
|--------|------|---------------------|-----------|
| `text` | Test Cases (Text) | `indigo-500` | `#6366F1` |
| `jira` | Test Cases (Jira) | `sky-500` | `#0EA5E9` |
| `session` | Test Cases (Session) | `cyan-500` | `#06B6D4` |
| `run-summary` | Run Analysis (KD-4 단일 버킷, AC-7) | `violet-500` | `#8B5CF6` |
| `plan-assistant` | Plan Assistant | `pink-500` | `#EC4899` |
| `risk-predictor` | Risk Predictor | `amber-500` | `#F59E0B` |
| `milestone-risk` | Milestone Risk | `emerald-500` | `#10B981` |
| `requirement-suggest` | Requirement Suggestions | `orange-500` | `#F97316` |
| other / unknown | Other | `slate-400` | `#94A3B8` |

> 이유: 각 hex의 light tone(400/500) 은 white 배경 대비 ≥ 4.5:1 (small-text AA) / ≥ 3:1 (graphical object AA) 를 모두 통과. indigo-500 (#6366F1) 은 브랜드 primary 와 동일하여 "text" (가장 많이 쓰이는 기본 TC 생성) 에 배정.

#### Tooltip (Custom)

```
┌────────────────────────────────┐
│  Apr 12, 2026                  │  text-[0.6875rem] font-semibold text-slate-500
├────────────────────────────────┤
│  ● Test Cases (Text)      8    │
│  ● Run Analysis           3    │
│  ● Plan Assistant         1    │
│  ──────────────────────        │
│  Total                   12    │  font-bold
└────────────────────────────────┘
```

- Container: `bg-white border border-slate-200 rounded-lg p-3 shadow-[0_4px_12px_rgba(0,0,0,0.08)] min-w-[180px]`
- Header: `text-[0.6875rem] font-semibold text-slate-500 pb-2 border-b border-slate-100 mb-2`
- Row: `flex items-center justify-between gap-4 text-[0.75rem]` — left=dot+label, right=value (tabular-nums)
- Total: `pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[0.75rem] font-bold text-slate-900`

#### 접근성 (AC-16, AC-17)

- Chart wrapper: `role="img" aria-label={t('settings.aiUsage.chart.ariaLabel')}` — "Daily AI credit usage stacked bar chart"
- 차트 하단에 screen-reader-only `<table>` 로 동일 데이터 제공: `<table class="sr-only">` — Recharts 기본 키보드 내비는 없으므로 SR-table이 AC-16 만족 근거.
- Legend 색상 점: `aria-hidden="true"` (label 텍스트가 의미 전달)

### 3-4. Mode Breakdown 테이블 (신규 컴포넌트 `ModeBreakdownTable`)

AC-6: mode별 합계 credits, 전체 대비 %, 호출 횟수, 내림차순.

```
┌─ Breakdown by Feature ─────────────────────────────┐
│ FEATURE              CREDITS   % OF TOTAL    CALLS │
├────────────────────────────────────────────────────┤
│ ● Test Cases (Text)     20        54.1%       18   │
│ ● Test Cases (Jira)     10        27.0%        9   │
│ ● Run Analysis           4        10.8%        4   │
│ ● Plan Assistant         3         8.1%        3   │
└────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Container | `bg-white border border-slate-200 rounded-xl overflow-hidden` |
| Header row | `flex items-center justify-between px-5 py-3 border-b border-slate-200` |
| Title | `text-[0.9375rem] font-semibold text-slate-900 flex items-center gap-2` — `<i class="ri-pie-chart-line text-violet-500">` |
| Table | `w-full text-sm` |
| thead row | `border-b border-slate-100 bg-slate-50/50` |
| th | `text-left px-4 py-2.5 text-[0.6875rem] font-semibold uppercase tracking-widest text-slate-400` |
| th (numeric cols) | `text-right` |
| tbody tr | `border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors` |
| td (feature) | `px-4 py-3 text-[0.8125rem] text-slate-800 font-medium flex items-center gap-2` + 컬러 dot `<span class="w-2.5 h-2.5 rounded-full shrink-0" style="background: {MODE_COLORS[mode]}">` |
| td (credits) | `px-4 py-3 text-[0.8125rem] text-slate-900 font-semibold tabular-nums text-right` |
| td (%) | `px-4 py-3 text-[0.8125rem] text-slate-500 tabular-nums text-right` |
| td (calls) | `px-4 py-3 text-[0.8125rem] text-slate-500 tabular-nums text-right` |

**정렬 인터랙션 (enhancement, AC-6 필수는 내림차순 기본):**
- th 클릭 시 `aria-sort="descending|ascending"` 토글, 활성 컬럼에 `<i class="ri-arrow-down-line text-indigo-500 ml-1">` 노출.

### 3-5. Member Contribution 테이블 (신규 컴포넌트 `MemberContributionTable`)

AC-8: avatar, name, email, credits 내림차순. AC-9: Self View 에서 미렌더.

```
┌─ Team Contribution ──────────────────────────────────────────────┐
│ MEMBER                                      CREDITS USED   SHARE │
├──────────────────────────────────────────────────────────────────┤
│ [KJ] Kyle Jeon        kyle@testably.app          22       59.5% │
│      ──────────────                           ──────── ● ○ ○ ○  │
│ [LM] Lara Martinez    lara@...                   10       27.0% │
│                                                 ████       %    │
│ [TS] Taro Sato        taro@testably.app           5       13.5% │
│                                                 ██         %    │
├──────────────────────────────────────────────────────────────────┤
│  and 12 more · [ Export CSV ]                                    │
└──────────────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Container | `bg-white border border-slate-200 rounded-xl overflow-hidden` |
| Header | 동일 (§3-4) with title "Team Contribution" + `<i class="ri-team-line text-indigo-500">` |
| thead 컬럼 3개 | MEMBER (text-left) / CREDITS USED (text-right) / SHARE (text-right) |
| tr | 동일 (§3-4) — 단 `min-h-[3.25rem]` 보장 |
| td (member) | `flex items-center gap-3 px-4 py-3` |
| Avatar | 기존 `<Avatar userId={row.user_id} name={row.full_name} email={row.email} size="md" />` (32×32) |
| Name | `text-[0.8125rem] font-semibold text-slate-900 truncate` |
| Email | `text-[0.75rem] text-slate-500 truncate` (full_name 이 있을 때 name 하단에 secondary) |
| Fallback | `full_name` null → email 만 `text-[0.8125rem] font-medium text-slate-700` |
| Credits cell | `px-4 py-3 text-right text-[0.8125rem] font-semibold text-slate-900 tabular-nums` |
| Share cell | `px-4 py-3 text-right` — 텍스트 `"59.5%"` + inline mini bar (w-[60px] h-1 bg-slate-100, fill bg-indigo-500) 가로 배치 `flex items-center justify-end gap-2` |
| Footer row (100행 초과 시) | `px-4 py-3 bg-slate-50 text-[0.75rem] text-slate-500` — "and 12 more" |
| Virtualization 기준 | 100행 초과 시 `@tanstack/react-virtual` 적용, row height 52 px 고정 |

**정렬 기본: credits_sum DESC. email / name 은 클라이언트 JOIN (profiles) 결과 사용.**

---

## 4. Self View (Member 축소 뷰)

AC-2, AC-9, AC-22: Member 는 Team View 의 `BurnRateCard` (self-scope), `DailyUsageChart` (self data), `ModeBreakdownTable` (self data) 만 노출. Member Contribution / Active Members / Export CSV 모두 **미렌더**.

```
┌──────────────────────────────────────────────────────────────┐
│ ✨ My AI Credit Usage                                         │
│ See your personal AI credit consumption this period.         │
│                                                              │
│ [Period ▾ Last 30 days]  [🔄 Refresh]                         │
│                                                              │
│  ┌──────────────┬──────────────┐                             │
│  │ THIS MONTH   │ MY BURN RATE │   ← 2 KPI cards only        │
│  │ 5 / 150      │ 0.4 /day     │                             │
│  └──────────────┴──────────────┘                             │
│                                                              │
│  Daily Usage (stacked bar — my data only)                    │
│                                                              │
│  Breakdown by Feature (my data only)                         │
│                                                              │
│  (Team Contribution 섹션 없음)                                 │
└──────────────────────────────────────────────────────────────┘
```

| 차이점 | 변경 |
|-------|------|
| Title | "My AI Credit Usage" (i18n: `settings.aiUsage.title.self`) |
| Subtitle | "See your personal AI credit consumption this period." (`subtitle.self`) |
| KPI cards | 4개 → 2개 (`grid-cols-1 md:grid-cols-2 gap-4`) |
| KPI 카드 1 | "THIS MONTH" — 개인 한도는 없으므로 팀 한도 대비 개인 몫 표시: `{myUsed} credits used · {myShare}% of team quota` (소분자 텍스트) |
| Export CSV 버튼 | 숨김 |
| Member Contribution 섹션 | 완전 미렌더 |
| 데이터 소스 | RPC 호출 없이 `ai_generation_logs` RLS 직접 쿼리 (AC-22) |

---

## 5. 상태별 화면

### 5-1. 정상 (Loaded, 데이터 존재)

§2–4 의 기본 레이아웃.

### 5-2. Empty State (AC-13) — 데이터 0건

Team View 또는 Self View 모두 공통 EmptyState 컴포넌트 (`src/components/EmptyState.tsx`, v2) 재사용.

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│              [ SparkleIllustration 180px ]                 │
│                                                            │
│              No AI usage yet                               │
│       text-lg font-semibold text-slate-900 (size="md")     │
│                                                            │
│       Start generating test cases with AI to see           │
│       usage here.                                          │
│       text-sm text-slate-500                               │
│                                                            │
│              [ ✨ Try AI Generation ]  (primary)           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

| Props | 값 |
|-------|---|
| `illustration` | `<IllustrationPlaceholder kind="sparkle" />` 또는 신규 AI 일러스트 (없으면 기존 `ri-sparkling-2-fill` 큰 아이콘 + indigo glow) |
| `title` | `t('settings.aiUsage.empty.title')` — "No AI usage yet" |
| `description` | `t('settings.aiUsage.empty.body')` |
| `cta.label` | `t('settings.aiUsage.empty.cta')` — "Try AI Generation" |
| `cta.icon` | `<i class="ri-sparkling-2-line">` |
| `cta.onClick` | `navigate('/projects/:firstProjectId/testcases?generate=ai')` — 프로젝트 없으면 `/projects` |
| `size` | `'md'` |
| `tone` | `'vivid'` (indigo glow) |
| `testId` | `'ai-usage-empty'` |

KPI 카드 영역은 숨기지 않고 **0 값으로 렌더**한다 (0 / 150 credits, 0 credits/day) — 빈 상태 이지만 metric 카드는 유지해 레이아웃 붕괴 방지. 차트·테이블 영역이 EmptyState 로 대체.

### 5-3. Loading State

RPC 진행 중 (TanStack Query `isLoading`). 전체 영역을 Skeleton 으로 대체.

```
┌─ KPI row ──────────────────────────────────────────────────┐
│ [ □ skeleton ] [ □ skeleton ] [ □ skeleton ] [ □ skeleton ] │
├────────────────────────────────────────────────────────────┤
│ [ ──────── skeleton chart block 280px ──────── ]           │
├────────────────────────────────────────────────────────────┤
│ [ table-skeleton ]           [ table-skeleton ]            │
└────────────────────────────────────────────────────────────┘
```

| 요소 | 재사용 |
|------|--------|
| KPI card skeleton | 기존 `Skeleton` 프리미티브 (`src/components/Skeleton.tsx`) — `<div class="bg-white border border-slate-200 rounded-xl p-5"> <Skeleton h-3 w-20 /> <Skeleton mt-3 h-8 w-24 /> <Skeleton mt-2 h-3 w-32 /> <Skeleton mt-3 h-1.5 w-full /> </div>` |
| Chart skeleton | `<div class="bg-white border border-slate-200 rounded-xl p-5"> <Skeleton h-5 w-32 /> <Skeleton mt-4 h-[280px] w-full rounded-lg /> </div>` |
| Table skeleton | 신규 `ModeBreakdownSkeleton` (5 rows × 4 cols) — `ListRowSkeleton` 재사용 불가 (컬럼 구조 다름), 소형 신규 유틸. 또는 `Skeleton` 반복 조합 인라인. |

### 5-4. Error State (AC-14) — RPC 실패

```
┌─ Red banner ────────────────────────────────────────────────┐
│ ⚠  Failed to load AI usage. Please retry.    [ 🔄 Retry ]   │
│ text-[0.8125rem] text-red-700                                │
└─────────────────────────────────────────────────────────────┘

┌─ Chart area — gray placeholder (NOT skeleton) ──────────────┐
│                                                             │
│                 (empty neutral block, h-[280px])             │
│                  bg-slate-100 rounded-xl                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Banner container | `flex items-center gap-3 px-4 py-3 mb-4 rounded-xl border border-red-200 bg-red-50` |
| Icon | `<i class="ri-error-warning-line text-red-500 text-lg shrink-0">` |
| Message | `flex-1 text-[0.8125rem] text-red-700` — `t('settings.aiUsage.error.title')` |
| Retry 버튼 | `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-red-300 hover:bg-red-100 text-[0.75rem] font-semibold text-red-700 transition-colors cursor-pointer` — `<i class="ri-refresh-line">` + "Retry" |
| Chart placeholder | `bg-slate-100 border border-slate-200 rounded-xl h-[280px] flex items-center justify-center text-[0.8125rem] text-slate-400` — "Chart unavailable" (i18n key `settings.aiUsage.error.chartUnavailable`) |

### 5-5. Permission Denied (AC-10 RPC 권한 실패)

RPC 가 빈 결과를 반환하면 UI 는 Empty State 로 자연스럽게 폴백. 그러나 `error.code = '42501'` 이나 명시적 403 응답 시:

```
┌─ Amber banner ──────────────────────────────────────────────┐
│ 🔒  You don't have permission to view team usage.           │
│      Contact your Owner if this is unexpected.              │
│      [ Contact Owner ]                                       │
└─────────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|----------|
| Container | `flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50` |
| Icon | `<i class="ri-lock-2-line text-amber-600 text-lg shrink-0 mt-0.5">` |
| Text block | `flex-1` — title `text-[0.8125rem] font-semibold text-amber-900`, body `text-[0.75rem] text-amber-700 mt-0.5` |
| CTA | `mt-2 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-amber-700 hover:text-amber-900 underline` |

### 5-6. Limit Reached / 근접 (Plan 한도 80%+ 또는 초과)

기존 `UpgradeBanner` 컴포넌트 재사용. Team View 에서는 page header 와 KPI 카드 사이에 삽입.

```
┌─ UpgradeBanner (non-inline card variant) ────────────────────┐
│ 👑  You've used 120 of 150 AI generations this month.        │
│     Upgrade your plan to continue growing your workspace.    │
│                                  [ 👑 Upgrade to unlock → ]  │
└──────────────────────────────────────────────────────────────┘
```

- **80–99%:** `<UpgradeBanner message={t('settings.aiUsage.warning.near', { used, limit })} ctaLabel={t('settings.aiUsage.warning.upgrade')} dismissKey={`ai-usage-near-${currentTier}`}` /> — dismiss 가능, 세션 내 기억
- **100%+:** `hideDismiss` 는 적용 안 함, 동일 banner 에 **message** 만 "You've hit your {{limit}}-credit limit. New AI generations are paused until next cycle." 로 대체

Copy (EN):
- 80–99%: "You've used {{used}} of {{limit}} AI generations this month. Consider upgrading to avoid hitting the limit mid-cycle." → `warning.near`
- 100%+: "You've used all {{limit}} AI generations this month. New generations are paused until your next billing cycle." → `warning.reached`

Copy (KO):
- 80–99%: "이번 달 {{limit}} 크레딧 중 {{used}} 크레딧을 사용했습니다. 한도 도달 전에 플랜 업그레이드를 고려하세요."
- 100%+: "이번 달 AI 크레딧 {{limit}}개를 모두 사용했습니다. 다음 청구 주기까지 새 AI 생성이 중단됩니다."

### 5-7. Offline (네트워크 끊김)

동일 Red banner 스타일 (§5-4) 에 메시지만 교체:
- EN: "Offline. Please check your connection."
- KO: "오프라인입니다. 네트워크 연결을 확인하세요."

---

## 6. 인터랙션 명세

### 6-1. 클릭 / 호버

| 트리거 | 동작 | 애니메이션 |
|--------|------|----------|
| Tab "AI Usage" 클릭 | `setActiveTab('ai-usage')` + URL 쿼리 `?tab=ai-usage` | 탭 underline indigo transition 150ms |
| Period filter 트리거 클릭 | 드롭다운 열기 | fade + translate-y-1 (100ms) |
| 드롭다운 외부 클릭 | 드롭다운 닫기 | fade 100ms |
| Period 선택 (활성 옵션) | 드롭다운 닫기 + `setSearchParams({period})` + refetch | bar chart re-enter animation (Recharts `isAnimationActive={true}` 400ms) |
| Period 선택 (disabled 옵션) | 클릭 무시, hover 시 툴팁 노출 | — |
| Refresh 버튼 | `queryClient.invalidateQueries(['aiUsageBreakdown'])` | 아이콘 `animate-spin` until refetch complete |
| Export CSV 버튼 | 파일 다운로드 시작 (§7 toast 참조) | 버튼 상태: idle → loading (`<i class="ri-loader-4-line animate-spin">`) → idle |
| Bar hover (차트) | Recharts Tooltip 표시 + `cursor={{ fill: 'rgba(99,102,241,0.06)' }}` indigo overlay | — |
| Member row hover | `hover:bg-slate-50/70` | `transition-colors` |
| KPI card (Burn Rate) hover | 기존 카드 그대로, 호버 효과 없음 (정보성) | — |
| UpgradeBanner CTA 클릭 | `navigate('/settings?tab=billing')` | — |
| Empty state CTA "Try AI Generation" | `navigate('/projects/:first/testcases?generate=ai')` | — |

### 6-2. 키보드 (AC-16)

| 키 | 동작 | 포커스 조건 |
|----|------|-----------|
| `Tab` | 포커스 순서: Tab nav → Period filter trigger → Refresh → Export CSV → Error/Upgrade CTA (있으면) → KPI cards (비상호작용, skip) → Mode Breakdown th (정렬 활성 시) → Member Contribution th → Empty state CTA | 기본 |
| `Enter` / `Space` | 포커스 엘리먼트 activate | 버튼/탭 포커스 |
| `Esc` | Period filter 드롭다운 닫기 | 드롭다운 열림 |
| `↑` / `↓` | 드롭다운 옵션 이동 | 드롭다운 열림 |
| `Home` / `End` | 드롭다운 첫/끝 옵션 | 드롭다운 열림 |
| `G` + `A` (G-chord) | (선택 enhancement, v1 OOS) AI Usage 탭으로 이동 | 전역 |
| `Cmd+K` → "AI Usage" | Command Palette 에 "Go to AI Usage" 엔트리 등록 | 전역 |

**포커스 링 (focus-visible):** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white` — 모든 인터랙티브 엘리먼트.

### 6-3. URL Query Sync

- `/settings?tab=ai-usage` — 기본
- `/settings?tab=ai-usage&period=30d` — 선택된 period 유지 (새로고침/공유 가능)
- 유효하지 않은 period (플랜 상한 초과) → 기본값 `30d` 로 fallback + 토스트 미노출 (silent)
- 옵션: `/settings?tab=ai-usage&period=custom&from=2026-03-01&to=2026-04-01` — custom 은 v1 OOS 이지만 파라미터 구조 예약

---

## 7. 토스트 메시지

i18n 키는 모두 `common.toast.*` 또는 `settings.aiUsage.toast.*` 네임스페이스. Sonner/기존 `useToast` 훅 사용.

| 이벤트 | 키 | EN | KO | 타입 |
|--------|----|----|----|----|
| 데이터 로드 실패 | `settings.aiUsage.toast.loadFailed` | "Failed to load AI usage." | "AI 사용량을 불러오지 못했습니다." | error |
| 수동 refresh 성공 | `settings.aiUsage.toast.refreshed` | "AI usage refreshed." | "AI 사용량을 새로고침했습니다." | success |
| 수동 refresh 실패 | `settings.aiUsage.toast.refreshFailed` | "Couldn't refresh. Please retry." | "새로고침 실패. 다시 시도해주세요." | error |
| Export CSV 시작 | `settings.aiUsage.toast.exportStarted` | "Preparing your CSV export…" | "CSV 내보내기를 준비 중입니다…" | info |
| Export CSV 성공 | `settings.aiUsage.toast.exportReady` | "CSV downloaded." | "CSV를 다운로드했습니다." | success |
| Export CSV 실패 | `settings.aiUsage.toast.exportFailed` | "Export failed. Please retry." | "내보내기 실패. 다시 시도해주세요." | error |
| 권한 없음 (직접 접근) | `settings.aiUsage.toast.forbidden` | "You don't have permission to view team usage." | "팀 사용량을 볼 권한이 없습니다." | error |
| 오프라인 감지 | `common.toast.offline` (기존) | "You're offline. Some data may be outdated." | "오프라인입니다. 일부 데이터가 최신이 아닐 수 있습니다." | warning |
| Period 변경 (silent, 토스트 없음) | — | — | — | — |

---

## 8. 반응형 브레이크포인트

기준: 전체 뷰포트 (sidebar `w-60` 포함).

| BP | 뷰포트 | 변경점 |
|----|-------|-------|
| **xl** (≥ 1280 px) | ≥ 1280 px | 기본 레이아웃. KPI 4-col. Mode Breakdown + Member Contribution side-by-side (5/12 + 7/12). |
| **lg** (1024–1279 px) | 1024–1279 | KPI 4-col 유지 (카드 폭 240 px 보장). Mode Breakdown + Member Contribution 여전히 side-by-side, 단 6/6 로 균등. |
| **md** (768–1023 px) | 768–1023 | KPI 2-col × 2-row. Mode Breakdown + Member Contribution **stacked** (full width each). Settings 탭 nav 는 기존대로 horizontal scroll. 차트 높이 280→240 px. |
| **sm** (< 768 px) | 모바일 | Settings sidebar 접힘(햄버거, 기존 패턴). KPI 1-col. Chart 높이 200 px + 범례 wrap 2줄. Mode Breakdown / Member Contribution 테이블이 **카드 뷰**로 전환 (아래 §8-1). Period filter trigger 는 full-width 블록. |

### 8-1. Mobile 카드 뷰 (< 768 px)

Mode Breakdown 테이블:
```
┌──────────────────────────────────────────┐
│ ● Test Cases (Text)          54.1%       │
│   20 credits · 18 calls                  │
└──────────────────────────────────────────┘
```
| 요소 | Tailwind |
|------|----------|
| Card | `bg-white border border-slate-200 rounded-lg px-4 py-3 mb-2` |
| Top row | `flex items-center justify-between gap-2` — left: dot + label, right: percent |
| Sub row | `text-[0.75rem] text-slate-500 mt-0.5 tabular-nums` — "20 credits · 18 calls" |

Member Contribution:
```
┌──────────────────────────────────────────┐
│ [KJ] Kyle Jeon                   22 · 59%│
│      kyle@testably.app                   │
│      [██████░░░░░░░░]                    │
└──────────────────────────────────────────┘
```

### 8-2. KPI 그리드 세부

```html
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
  <!-- 카드 4개 -->
</div>
```

Self View 는 `grid-cols-1 md:grid-cols-2 gap-4 mb-6` (2개만).

---

## 9. 다크모드 색상 매핑

v1 구현에서 Settings 페이지 전체가 라이트 전용이므로 다크 모드는 **스타일만 준비**하고 활성화는 전사 다크 모드 롤아웃 때로 연기. 아래는 Tailwind `dark:` variant 로 병기 작성.

| 요소 | Light | Dark |
|------|-------|------|
| 페이지 bg (Settings main) | `bg-slate-50` | `dark:bg-slate-900` |
| 카드 bg | `bg-white` | `dark:bg-slate-800` |
| 카드 border | `border-slate-200` | `dark:border-white/10` |
| 제목 텍스트 | `text-slate-900` | `dark:text-white` |
| 본문 텍스트 | `text-slate-700` | `dark:text-slate-300` |
| 보조 텍스트 | `text-slate-500` | `dark:text-slate-400` |
| 미세 텍스트 (Eyebrow) | `text-slate-400` | `dark:text-slate-500` |
| 구분선 | `border-slate-100` | `dark:border-white/[0.06]` |
| thead bg | `bg-slate-50/50` | `dark:bg-white/[0.03]` |
| 호버 bg | `hover:bg-slate-50/70` | `dark:hover:bg-white/[0.04]` |
| Progress track | `bg-slate-100` | `dark:bg-slate-700` |
| Progress fill (indigo) | `bg-indigo-500` | `dark:bg-indigo-400` |
| Tooltip bg | `bg-white` | `dark:bg-slate-900` |
| Tooltip border | `border-slate-200` | `dark:border-white/10` |
| Red banner bg | `bg-red-50` | `dark:bg-red-900/20` |
| Red banner border | `border-red-200` | `dark:border-red-800/30` |
| Red banner text | `text-red-700` | `dark:text-red-300` |
| Amber banner bg | `bg-amber-50` | `dark:bg-amber-900/20` |
| Amber banner text | `text-amber-900` / `text-amber-700` | `dark:text-amber-200` / `dark:text-amber-300` |
| Chart axis tick | `fill: #94A3B8` | JS: `fill: #64748B` (dark 환경 감지 시) |
| Chart grid stroke | `stroke: #f1f5f9` | JS: `stroke: #334155` |
| Mode bar fill | 동일 hex (indigo/violet/pink 등) — 다크에서도 대비 유지 (≥ 3:1 verified) | 동일 |

**Recharts 다크 대응:** `useTheme()` 커스텀 훅으로 `stroke` / `fill` / tick color 를 동적 전환. v1 은 light 기준 하드코딩, dark toggle 은 별도 이슈.

---

## 10. 기존 컴포넌트 재사용 목록

### 10-1. 재사용 (수정 없이)

| 컴포넌트 | 경로 | 용도 | ID |
|---------|------|------|----|
| `Avatar` | `src/components/Avatar.tsx` | Member Contribution 각 행 아바타 (32 px `size="md"`, `getAvatarColor` + `getInitials`) | CMP-01 |
| `EmptyState` (v2) | `src/components/EmptyState.tsx` | 0 데이터 시 CTA 포함 빈 상태 | CMP-02 |
| `UpgradeBanner` | `src/components/UpgradeBanner.tsx` | 80%+ / 한도 초과 경고 배너 (card & inline variant 모두) | CMP-03 |
| `Skeleton` 프리미티브 | `src/components/Skeleton.tsx` | KPI / chart / table loading placeholder | CMP-04 |
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | Panel 루트 감싸기 (`<ErrorBoundary section sectionName="AI Usage">`) | CMP-05 |
| `useToast` | `src/components/Toast.tsx` | 모든 토스트 알림 | CMP-06 |
| Tab nav (Settings 내장) | `src/pages/settings/page.tsx` line 1896 | AI Usage 탭 버튼 한 항목만 추가 | CMP-07 |
| `IllustrationPlaceholder` | `src/components/illustrations/IllustrationPlaceholder.tsx` | Empty state 일러스트 (`kind="sparkle"` 또는 `kind="nothing"`) | CMP-08 |
| `ProgressBar` | `src/components/ProgressBar.tsx` | (선택) Burn Rate 카드 progress — 현재 명세는 인라인 div 사용하나 추후 통합 고려 | CMP-09 |

### 10-2. 신규 생성

| 컴포넌트 | 경로 | 역할 | ID |
|---------|------|------|----|
| `AiUsagePanel` | `src/pages/settings/components/AiUsagePanel.tsx` | 탭 루트. 권한 분기 (Team/Self) + 데이터 훅 조합 | NEW-01 |
| `PeriodFilter` | `src/pages/settings/components/ai-usage/PeriodFilter.tsx` | 30d/90d/6m/12m 드롭다운 + 플랜 제한 + URL sync | NEW-02 |
| `KpiCard` | `src/pages/settings/components/ai-usage/KpiCard.tsx` | 공통 KPI 카드 (eyebrow + primary + sub + optional badge/progress) | NEW-03 |
| `BurnRateCard` | `src/pages/settings/components/ai-usage/BurnRateCard.tsx` | `KpiCard` 를 내부 사용하며 burn rate 계산 로직(on-track/warning) 포함 | NEW-04 |
| `DailyUsageChart` | `src/pages/settings/components/ai-usage/DailyUsageChart.tsx` | Recharts stacked bar + custom tooltip + SR table | NEW-05 |
| `ChartTooltip` | `src/pages/settings/components/ai-usage/ChartTooltip.tsx` | Recharts custom tooltip content | NEW-06 |
| `ModeBreakdownTable` | `src/pages/settings/components/ai-usage/ModeBreakdownTable.tsx` | 기능별 credits/%/calls 테이블 | NEW-07 |
| `MemberContributionTable` | `src/pages/settings/components/ai-usage/MemberContributionTable.tsx` | 멤버별 기여도 테이블 (profiles join, 100+ 시 virtualized) | NEW-08 |
| `ExportCsvButton` | `src/pages/settings/components/ai-usage/ExportCsvButton.tsx` | CSV 다운로드 트리거 + loading state + 토스트 | NEW-09 |
| `aiUsageMeta.ts` | `src/lib/aiUsageMeta.ts` | `MODE_COLORS`, `MODE_LABELS`, `normalizeMode()`, `planHistoryLimit()` 상수 모음 | NEW-10 |

**재사용 9개 / 신규 10개.**

---

## 11. 접근성 (AC-16, AC-17)

| 요소 | 처리 |
|------|------|
| 차트 전체 | `role="img" aria-label="Daily AI credit usage stacked bar chart"` (i18n) |
| 차트 대체 데이터 | `<table class="sr-only">` — 일자 × mode × credits, SR 유저도 동일 정보 접근 |
| Period filter | trigger `aria-haspopup="listbox" aria-expanded={open}`, dropdown `role="listbox"`, item `role="option" aria-selected` |
| Tab | 기존 설정 탭은 현재 `<button>` 으로 구현됨 — AI Usage 탭도 동일 패턴 (`role="tab" aria-selected`) 추가 권장 |
| KPI 카드 | `<section aria-label="This month's AI credit usage">` wrapping |
| Export CSV | `<button aria-label="Export AI usage as CSV">` (i18n `settings.aiUsage.export.aria`) |
| Mode breakdown table | `<table>` semantic, th `scope="col"` |
| Member table | 동일, 추가로 `aria-rowcount` (virtualized 시) |
| Decorative icons | 모든 `<i class="ri-...">` 에 `aria-hidden="true"` (label 이 같이 있는 경우) |
| Retry / Upgrade 버튼 | text 포함이라 자동 label — 단 icon-only variant 없음 |
| Color-only 정보 | 차트 범례는 **라벨 텍스트 + 색 점** 병행 (색 단독 의존 금지). Burn rate 상태도 "On track" / "Warning" 텍스트 반드시 동반. |
| 대비 | 모든 본문/tick 텍스트 ≥ AA (slate-500 on white = 4.6:1 ✓). Mode 색상 hex 는 AA graphical object (≥ 3:1) 통과 확인. |
| 포커스 순서 | §6-2 참조 |
| Reduced motion | Recharts `isAnimationActive={!prefersReducedMotion}` — `@media (prefers-reduced-motion: reduce)` 감지 훅 사용 |

---

## 12. 카피 (i18n, EN / KO)

Dev Spec §12 의 47개 키 전부 사용. 본 디자인에서 **추가로 필요한** 키 목록:

| 키 | EN | KO |
|----|----|----|
| `settings.aiUsage.title.self` | "My AI Credit Usage" | "나의 AI 크레딧 사용량" |
| `settings.aiUsage.kpi.modeCountLabel` | "MODES USED" | "사용한 기능" |
| `settings.aiUsage.kpi.modeCountSub` | "of {{total}} modes this period" | "이번 기간 {{total}}개 중" |
| `settings.aiUsage.kpi.activeMembersLabel` | "ACTIVE MEMBERS" | "활성 팀원" |
| `settings.aiUsage.kpi.activeMembersSub` | "members generated AI" | "팀원이 AI를 사용함" |
| `settings.aiUsage.kpi.thisMonthLabel` | "THIS MONTH" | "이번 달" |
| `settings.aiUsage.kpi.thisMonthSub` | "{{pct}}% of monthly quota" | "월간 한도의 {{pct}}%" |
| `settings.aiUsage.chart.period` | "{{from}} — {{to}} · UTC" | "{{from}} — {{to}} · UTC" |
| `settings.aiUsage.chart.total` | "Total" | "합계" |
| `settings.aiUsage.chart.srTableCaption` | "Daily AI credit usage by feature" | "기능별 일일 AI 크레딧 사용량" |
| `settings.aiUsage.warning.near` | "You've used {{used}} of {{limit}} AI generations this month. Consider upgrading to avoid hitting the limit mid-cycle." | "이번 달 {{limit}} 크레딧 중 {{used}} 크레딧을 사용했습니다. 한도 도달 전에 플랜 업그레이드를 고려하세요." |
| `settings.aiUsage.warning.reached` | "You've used all {{limit}} AI generations this month. New generations are paused until your next billing cycle." | "이번 달 AI 크레딧 {{limit}}개를 모두 사용했습니다. 다음 청구 주기까지 새 AI 생성이 중단됩니다." |
| `settings.aiUsage.warning.upgrade` | "Upgrade plan" | "플랜 업그레이드" |
| `settings.aiUsage.forbidden.title` | "You don't have permission to view team usage." | "팀 사용량을 볼 권한이 없습니다." |
| `settings.aiUsage.forbidden.body` | "Contact your Owner if this is unexpected." | "예상하지 못한 경우 오너에게 문의하세요." |
| `settings.aiUsage.forbidden.cta` | "Contact Owner" | "오너에게 문의" |
| `settings.aiUsage.error.chartUnavailable` | "Chart unavailable" | "차트를 표시할 수 없습니다" |
| `settings.aiUsage.offline` | "You're offline. Some data may be outdated." | "오프라인입니다. 일부 데이터가 최신이 아닐 수 있습니다." |
| `settings.aiUsage.toast.loadFailed` | "Failed to load AI usage." | "AI 사용량을 불러오지 못했습니다." |
| `settings.aiUsage.toast.refreshed` | "AI usage refreshed." | "AI 사용량을 새로고침했습니다." |
| `settings.aiUsage.toast.refreshFailed` | "Couldn't refresh. Please retry." | "새로고침 실패. 다시 시도해주세요." |
| `settings.aiUsage.toast.exportStarted` | "Preparing your CSV export…" | "CSV 내보내기를 준비 중입니다…" |
| `settings.aiUsage.toast.exportReady` | "CSV downloaded." | "CSV를 다운로드했습니다." |
| `settings.aiUsage.toast.exportFailed` | "Export failed. Please retry." | "내보내기 실패. 다시 시도해주세요." |
| `settings.aiUsage.export.aria` | "Export AI usage as CSV" | "AI 사용량을 CSV로 내보내기" |
| `settings.aiUsage.period.label` | "Period" | "기간" |
| `settings.aiUsage.period.triggerAria` | "Select period" | "기간 선택" |

**Dev Spec §12 키 + 추가 26개 = 총 73개 i18n 키** (AC-15 요구 20개 초과 달성).

---

## 13. 성공 기준 매핑 (Dev Spec 22 AC → 디자인)

| AC | 디자인 구현 위치 |
|----|------------------|
| AC-1 Tab 추가 + URL 딥링크 | §2-2 Tab 버튼, §6-3 URL sync |
| AC-2 Owner/Admin vs Member 뷰 분기 | §3 (Team) vs §4 (Self) |
| AC-3 Burn Rate 카드 | §3-2 카드 2 BurnRate |
| AC-4 Stacked bar chart (mode별, 30d 기본) | §3-3 DailyUsageChart + §3-3 MODE_COLORS (7개) |
| AC-5 기간 필터 + 플랜 제한 disable + 툴팁 | §3-1 PeriodFilter, §6-1 disabled state |
| AC-6 Mode Breakdown 테이블 (credits, %, calls, DESC) | §3-4 ModeBreakdownTable |
| AC-7 run-summary → "Run Analysis" 라벨 | §3-3 MODE_COLORS + MODE_LABELS (`run-summary` → "Run Analysis") |
| AC-8 Member Contribution avatar+name+email+credits DESC | §3-5 MemberContributionTable |
| AC-9 Self View 에서 Member Contribution 미렌더 | §4 "Member Contribution 섹션 완전 미렌더" |
| AC-10 RPC SECURITY DEFINER | 디자인 영향 없음 (권한 없을 시 §5-5 Permission banner 대비) |
| AC-11 RPC p95 < 500ms | §5-3 Loading Skeleton 디자인으로 대기 시간 커버 |
| AC-12 Enterprise Unlimited 표기 | §3-2 카드 1 Enterprise variant |
| AC-13 Empty State | §5-2 EmptyState 재사용, "Try AI Generation" CTA |
| AC-14 에러 배너 + Retry + 회색 placeholder | §5-4 Error State |
| AC-15 i18n EN/KO | §12 전체 카피 73개 키 |
| AC-16 키보드 전용 동작 + `aria-label` | §6-2, §11 접근성 |
| AC-17 브랜드 팔레트 + AA 대비 | §3-3 MODE_COLORS hex, §11 대비 검증 |
| AC-18 Export CSV (Team View 만) | §3 Toolbar 우측 ExportCsvButton, §4 Self View 미노출 |
| AC-19 기존 사이드바 카드 유지 + "View Details" 링크 | 별도 파일 수정 (project-detail/page.tsx:1272–1315 에 Link 추가) — 본 스펙은 Settings 내 디자인에 집중, 아래 §14 참조 |
| AC-20 마이그레이션 idempotent | 디자인 영향 없음 |
| AC-21 composite index | 디자인 영향 없음 |
| AC-22 Self View RLS 직접 쿼리 | §4 데이터 소스 명시 |

### 13-1. 관련 외부 수정 (AC-19) — project-detail 사이드바

기존 사이드바 카드(`src/pages/project-detail/page.tsx:1296`) 의 `Link` 를 변경/추가:

```diff
- <Link to="/settings?tab=billing" className="text-[11px] text-indigo-600 ...">
-   Upgrade <i className="ri-arrow-right-up-line text-xs" />
- </Link>
+ {/* 기존 Upgrade 링크 유지 (한도 근접 시) */}
+ <Link to="/settings?tab=ai-usage" className="text-[11px] text-indigo-600 font-medium hover:text-indigo-700 flex items-center gap-0.5">
+   {t('settings.aiUsage.viewDetails')} <i className="ri-arrow-right-up-line text-xs" />
+ </Link>
```

"View Details" 링크는 Plan: … 라벨 다음 동일 행에 배치. Upgrade 배너(80%+)는 기존 유지.

---

## 14. Export CSV 상세 (AC-18)

```
ai-usage-2026-04-23.csv
─────────────────────────────────────────────
date,user_email,mode,credits
2026-04-01,kyle@testably.app,text,3
2026-04-01,lara@testably.app,jira,2
2026-04-02,taro@testably.app,run-summary,1
...
```

- 헤더: `date,user_email,mode,credits` (BOM 없이 UTF-8 plain)
- 파일명: `ai-usage-{YYYY-MM-DD}.csv` (i18n `settings.aiUsage.export.filename`)
- date 포맷: `YYYY-MM-DD` (UTC)
- mode: raw value (`run-summary` 그대로 — 데이터 파이프라인 호환성. UI 에만 라벨 변환)
- credits: integer, 집계 전 개별 row 가 아닌 RPC 반환 grouped row 를 그대로 flatten
- 정렬: date ASC, user_email ASC
- 생성 방식: 브라우저 Blob + `<a download>` (서버 호출 없음, 현재 RPC 결과 재사용)
- 권한: Team View (Owner/Admin) 에서만 버튼 노출. Self View 는 완전 미렌더 (AC-18 "Team View에서만 노출")

**버튼 스타일:**
```html
<button class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[0.8125rem] font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
  <i class="ri-download-2-line text-slate-500"></i>
  Export CSV
</button>
```

Loading 중: 아이콘을 `ri-loader-4-line animate-spin` 로 swap, 라벨 "Exporting…".

---

## 15. Progressive Disclosure / Speed First 점검

| 원칙 | 반영 |
|------|------|
| Speed First | 상단 4 KPI 카드 → 3초 안에 "이번 달 얼마 썼는지 / 한도 근접 여부" 파악. 차트는 2번째 시선 아래. |
| Keyboard First | Tab / Enter / Esc / ↑↓ 로 모든 주요 액션 가능. Cmd+K 엔트리 등록. |
| Distraction-free | KPI 카드 hover 효과 없음 (정보 소비 방해 금지). 차트 색상도 하드 코드로 통일. 배너는 정말 필요할 때(80%+)만 등장. |
| Progressive Disclosure | 기본 30d view. 90d/6m 은 드롭다운 숨김. Custom 구간은 v1 OOS. "Tokens used" 세부 수치도 OOS. |
| Consistent | Settings tab nav 기존 스타일 그대로, 패널 내부도 기존 Settings 섹션들과 동일 `bg-white border border-slate-200 rounded-[0.625rem]` 변종 (`rounded-xl` 로 약간 강화) 사용. Avatar/EmptyState/UpgradeBanner 재사용으로 시각 일관성 보장. |

---

## 16. Open Questions / Followup

- **Q1.** Command Palette "Go to AI Usage" 엔트리는 v1 필수인가 nice-to-have 인가? → 현재는 nice-to-have. Dev Spec AC 에 없으므로 생략, 별도 폴로업.
- **Q2.** Enterprise 24m 옵션은 v1 에서 노출할 것인가? → Dev Spec §4-4 에 `Enterprise = 24개월` 이므로 **옵션은 노출하되** 데이터 존재 여부(RPC 반환 크기)에 따라 실질 표시. UI 에 문구 "Last 24 months" 포함.
- **Q3.** Member Contribution 테이블에서 조직 role 표시(Owner/Admin/Member 등)도 필요? → v1 OOS. 이름+이메일만. 후속에서 role badge 추가 고려.
- **Q4.** 차트 위 범례 클릭 시 toggle (Recharts `<Legend onClick>`) 기능? → nice-to-have. v1 에선 범례는 정적(표시만).
- **Q5.** 월 경계 표시 (차트 x축 위에 월 레이블)? → v1 에선 x축 tick (Apr 1, Apr 7, ...) 만 사용. 월 경계 구분선은 OOS.

---

## 디자인 개발 착수 전 체크리스트

- [x] 모든 상태가 정의되었는가 (정상 §3–4, 빈 §5-2, 로딩 §5-3, 에러 §5-4, 권한없음 §5-5, 한도 §5-6, 오프라인 §5-7)
- [x] Tailwind 클래스가 구체적으로 명시되었는가 (§2, §3, §5, §8)
- [x] 다크모드 색상 매핑이 있는가 (§9)
- [x] 기존 컴포넌트 재사용 목록이 있는가 (§10-1, 9개)
- [x] 신규 컴포넌트 목록이 있는가 (§10-2, 10개)
- [x] 인터랙션 (클릭 §6-1, 호버 §6-1, 키보드 §6-2, URL sync §6-3) 이 정의되었는가
- [x] 반응형 브레이크포인트별 변경점이 있는가 (§8, xl/lg/md/sm)
- [x] 토스트 메시지가 en/ko 모두 있는가 (§7, §12)
- [x] 관련 개발지시서의 22개 AC 와 일치하는가 (§13 매핑 표)
- [x] 접근성(ARIA, 키보드, 대비) 이 정의되었는가 (§11)
- [x] Owner vs Member 뷰 분기가 전부 다뤄졌는가 (§3 Team, §4 Self)
- [x] 차트 타입 선택 근거가 있는가 (§3-3 의사결정 표)
