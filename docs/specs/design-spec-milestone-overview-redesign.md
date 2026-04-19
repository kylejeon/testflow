# Design Spec: Milestone Overview Redesign + Issues Tab Metadata

> **작성일:** 2026-04-19
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-milestone-overview-redesign.md`
> **참조 목업:** `desi/mockup_3_milestone_burndown.html` (상단 Intel 영역의 레퍼런스)
> **영향 페이지:**
> - `src/pages/milestone-detail/page.tsx` (탭 재편 + Overview 신규)
> - `src/pages/plan-detail/page.tsx` (Issues 탭 `<IssuesList />` 치환)
> - `src/pages/project-milestones/MilestonePlanList.tsx` (Open detailed view 버튼 추가)
> - 신규 공통 컴포넌트: `src/components/issues/*`, `src/pages/milestone-detail/OverviewTab.tsx` 외 §13 참조

---

## 0. 디자인 원칙 & 맥락

### 0-1. 디자인 DNA 준수

Testably 앱 내부(인증 후 영역)는 **라이트 테마 + 화이트 카드 + indigo primary** 톤이다. `UI_GUIDE.md`의 다크 슬레이트 톤은 **마케팅/랜딩 페이지 전용**이며, 본 디자인 스펙은 **앱 내부 스타일(`src/index.css` 기반 CSS 변수)**을 따른다.

| 영역 | 스타일 |
|------|--------|
| 페이지 배경 | `var(--bg-muted)` = `#f9fafb` (`.main-panel` 기본) |
| 카드 배경 | `#fff` |
| 카드 보더 | `1px solid var(--border)` = `#e5e7eb` |
| 카드 라운드 | `var(--radius-lg)` = `10px` |
| Primary | `var(--primary)` = `#6366f1` (indigo) |
| Success / Danger / Warning / Violet | 기존 CSS 변수 그대로 (`--success`, `--danger`, `--warning`, `--violet`) |

> **중요:** `mockup_3`는 “밀도 있게 담는 구도”의 레퍼런스일 뿐, **Testably 앱의 기존 CSS 변수·타이포·뱃지 시스템**을 최종 소스로 한다. `mockup_3`의 하드코딩 hex 값은 해당 CSS 변수로 치환한다.

### 0-2. 디자인 원칙 재확인 (Testably UX)

- **Speed First** — Overview 탭 하나에서 건강도/실패/AI 인사이트/실행 목록을 모두 확인.
- **Distraction-free** — 기존 5개 탭(Results/Status/Burndown/Activity/Issues) → **3탭(Overview/Activity/Issues)** 으로 축소.
- **Consistent** — Plan Detail과 Milestone Detail의 Issues 탭은 **완전히 동일한 렌더 컴포넌트**(`<IssuesList />`)를 사용.
- **Progressive Disclosure** — Intel 카드 각각은 필요 시 “View all / deep link” 링크로 상세 탭으로 이동.

---

## 1. 레이아웃 (Overview 탭)

### 1-1. 데스크톱 (≥ 1280px) 전체 구조

```
┌─ 기존 Breadcrumb / Detail Head / Wide Progress / Stats Row (기존 유지) ───────────────┐
├─ Content Tab Row (신규 3개) ────────────────────────────────────────────────────────┤
│  [ Overview ] [ Activity ] [ Issues ]    ← 기존 5개 → 3개                             │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ ────────── Scrollable Content (padding 20px 24px) ──────────                         │
│                                                                                      │
│ ┌─ Overview Row (2 col grid) ─────────────────────────────────────────────┐         │
│ │ ┌── Chart Card (1.55fr) ──────────┐  ┌── Intel Column (1fr) ─────────┐  │         │
│ │ │ Burndown Chart (Recharts/SVG)   │  │ 2×N Grid (10px gap)           │  │         │
│ │ │ — 높이 200px                     │  │                               │  │         │
│ │ │ ──────────────────────          │  │  [Failed&Blocked] [Velocity7d]│  │         │
│ │ │ KPI Strip (4 inline)            │  │  [Top-Fail Tags] [ETA vs Tgt] │  │         │
│ │ │ Remain│Executed│Vel│PassRate    │  │  [──── AI Insight (span 2) ─] │  │         │
│ │ └─────────────────────────────────┘  │  [──── 24h Activity (span 2)─]│  │         │
│ │                                      └───────────────────────────────┘  │         │
│ └─────────────────────────────────────────────────────────────────────────┘         │
│                                                                                      │
│ ┌─ Execution Sections (stack, gap 14px) ─────────────────────────────────┐          │
│ │  [Sec-Head] Sub Milestones  <count>                                     │          │
│ │  [Sec-Card rows...]                                                     │          │
│ │  [Sec-Head] Test Plans      <count>    ← 신규                           │          │
│ │  [Sec-Card rows...]                                                     │          │
│ │  [Sec-Head] Runs            <count>  [●Planned ●Milestone-direct]       │          │
│ │  [Sec-Card rows...]                                                     │          │
│ │  [Sec-Head] Exploratory     <count>                                     │          │
│ │  [Sec-Card rows...]                                                     │          │
│ └─────────────────────────────────────────────────────────────────────────┘          │
│                                                                                      │
│ ┌─ Contributors — Top 5 (full width, single card) ───────────────────────┐          │
│ │  (기존 Status 탭의 Contributors 카드 그대로 이동)                         │          │
│ └─────────────────────────────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 1-2. 기준 너비 & 반응형 (Overview 전용)

| 브레이크포인트 | Overview Row | Intel Grid | Execution Row | 변경 내용 |
|--------------|--------------|-----------|--------------|-----------|
| ≥ 1280px (xl) | `grid-template-columns: minmax(0,1.55fr) minmax(0,1fr)` · gap 14px | 2 col · gap 10px | 기존 `.sec-card .row` 그대로 | 기본 |
| 1024–1279px (lg) | `1.3fr / 1fr` · gap 12px | 2 col 유지 | 동일 | Intel 카드 padding `10px 12px → 10px` |
| 768–1023px (md) | **`1fr` (단일 컬럼, Chart → Intel 순서)** | 2 col 유지 | `.sec-card .row` grid 축소 (`30px minmax(200px,1.5fr) minmax(160px,1fr) auto auto`) | stats-mini 줄바꿈 허용 |
| < 768px (sm) | 1fr | **1 col (카드 전부 단독)** | `.sec-card .row` flex-column 전환 — 아이콘 + 이름 1줄, 나머지 메타 1줄 | Run type 뱃지는 이름 아래 줄 |

### 1-3. 기존 레이아웃 기준 (유지되는 부분)

- `.detail-head` (제목 + Edit/Complete 버튼), `.detail-progress`, `.stats-row`는 **기존 그대로 유지**.
- `.detail-tabs`의 **탭 항목만 5→3개로 축소**, 스타일은 동일.
- Scrollable Content 영역 padding: 기존 `1.25rem 1.5rem` 유지.

---

## 2. 컬러 토큰

### 2-1. 기존 CSS 변수 (재활용)

| 용도 | 변수 | 값 | 비고 |
|------|------|------|------|
| 페이지 / 스크롤 영역 | `--bg-muted` | `#f9fafb` | 그대로 |
| 서브틀 칩/바 | `--bg-subtle` | `#f3f4f6` | Intel 내부 mini-bar 트랙 |
| 카드 보더 | `--border` | `#e5e7eb` | |
| Primary (indigo) | `--primary` | `#6366f1` | Burndown actual 라인, Today marker, Planned 닷 |
| Primary soft | `--primary-50` / `--primary-100` | `#eef2ff` / `#e0e7ff` | sparkline 막대 베이스 |
| Success | `--success` / `--success-600` | `#22c55e` / `#16a34a` | Pass Rate KPI, Pass dot |
| Danger | `--danger` / `--danger-600` | `#ef4444` / `#dc2626` | Failed/Blocked 숫자, Top-Fail bar |
| Warning | `--warning` | `#f59e0b` | ETA behind, Blocked dot |
| Violet | `--violet` / `--violet-50` / `--violet-100` | `#7c3aed` / `#f5f3ff` / `#ede9fe` | AI Insight, Exploratory |
| Blue | `--blue` | `#3b82f6` | info feed-dot |
| Orange | `--orange` | `#f97316` | adhoc run type (참고 — 본 스펙엔 미사용) |

### 2-2. 신규 토큰 정의 (2건만)

`src/index.css`의 `:root {}` 블록에 추가:

```css
/* ─── Milestone Overview ─────────────────────────────── */
--mo-intel-gap: 10px;
--mo-chart-height: 200px;
--mo-sparkline-height: 42px;
--mo-row-grid: 30px minmax(220px, 1.5fr) minmax(180px, 1.4fr) auto auto auto;

/* ─── Run type dot (mockup_3 재활용) ───────────────────── */
/* 이미 .run-type-dot.planned / .run-type-dot.mdirect CSS는 index.css:163-167에 있음 (재활용) */
```

> **신규 CSS 변수는 2개만 추가** (chart height, row grid). 나머지는 모두 기존 토큰으로 처리. 이유: 불필요한 토큰 확산 방지.

### 2-3. Issue Metadata 뱃지 색상 매핑 (BR-1 ~ BR-4)

| Priority (유틸 `issueMetadata.ts` 출력값) | 뱃지 CSS | 배경 | 글자 | 비고 |
|-----|-----|-----|-----|-----|
| `critical` | `.sev .sev-crit` (기존) | `#991b1b` | `#fff` | Jira "Highest" → Critical |
| `high` | `.sev .sev-major` (기존) | `var(--danger-50)` | `var(--danger-600)` | Jira "High" / GH `priority/high` |
| `medium` | `.sev .sev-medium` (**신규**) | `var(--warning-50)` | `var(--warning)` | Jira "Medium" / 기본값 없음 |
| `low` | `.sev .sev-minor` (기존 이름 재활용) | `var(--bg-subtle)` | `var(--text-muted)` | Jira "Low/Lowest" |
| `none` ("—") | 없음 (빈 문자열 "—" 텍스트만) | — | `var(--text-subtle)` | |

| Status (status dot + 라벨) | 닷 컬러 | 라벨 배경 | 라벨 글자 | Jira / GitHub 매핑 |
|-----|-----|-----|-----|-----|
| `open` | `var(--danger)` | `var(--danger-50)` | `var(--danger-600)` | Jira "To Do" / GH "open" |
| `in_progress` | `var(--warning)` | `var(--warning-50)` | `var(--warning)` | Jira "In Progress" |
| `resolved` | `var(--success-600)` | `var(--success-50)` | `var(--success-600)` | Jira "Done"/"Resolved" |
| `closed` | `#9ca3af` (text-subtle) | `var(--bg-subtle)` | `var(--text-muted)` | Jira "Closed" / GH "closed" |
| `unknown` (원문 그대로) | `var(--text-subtle)` | `var(--bg-subtle)` | `var(--text-muted)` | fallback |

> `.iss-status.open / .prog / .resolved`는 `index.css:297-300`에 이미 존재 → **재활용**. 새로 추가할 클래스: `.iss-status.closed` (닫힘) 1개만.

---

## 3. 타이포그래피

앱 내부 기본 폰트는 Inter + JetBrains Mono (코드/ID용). `_shared.css`와 동일 톤.

| 역할 | 크기 | weight | color | 비고 |
|------|------|--------|-------|------|
| Card 패널 헤더 (panel-head) | `10px` | 600 | `var(--text-muted)` | `text-transform: uppercase; letter-spacing: 0.05em;` |
| KPI 라벨 | `9.5px` | 500 | `var(--text-muted)` | uppercase, letter-spacing 0.04em |
| KPI 값 | `17px` | 700 | `var(--text)` | line-height 1.1 |
| KPI 서브 (vs yesterday) | `10.5px` | 400 | `var(--text-muted)` | |
| Intel card content (blocked-row, tag-row, feed-row) | `11.5px` | 400/600 | `var(--text)` | |
| Chart 축 레이블 | `8px` | 400 | `#9ca3af` | SVG `<text>` font-family Inter |
| Section Head (Sub Milestones, Test Plans 등) | `12px` | 600 | `var(--text-muted)` | uppercase, letter-spacing 0.04em |
| Section Row name | `13px` | 600 | `var(--text)` | |
| Section Row sub | `11px` | 400 | `var(--text-muted)` | |
| Run linkage 뱃지 | `10.5px` | 500 | — | 기존 `.linkage-planned` / `.linkage-mdirect` |
| Issue priority 뱃지 | `11px` | 600 | — | 기존 `.sev` |
| Issue status pill | `11px` | 600 | — | 기존 `.iss-status` |
| Issue key (JIRA/GH) | `12px` | 600 | `var(--primary)` | JetBrains Mono |
| "Last synced X ago" | `11px` | 400 | `var(--text-subtle)` | |
| "Refresh now" 버튼 | `.btn .btn-sm` | — | — | 기존 |

---

## 4. 컴포넌트 스펙 (Overview 상단 Intel 영역)

### 4-1. `<BurndownChart />` 카드 (chart-card)

#### 구조

```
┌─ .chart-card (bg #fff, border, radius 10, overflow hidden, flex column) ───┐
│ ┌─ .chart-head (padding 9 12, border-bottom) ─────────────────────────┐   │
│ │  📈 Burndown     [Ideal] [Actual] [Scope] [Projected]   [7d|30d|All] │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│ ┌─ .chart-body (padding 4 8, flex 1) ─────────────────────────────────┐   │
│ │  Recharts LineChart, height 200px                                    │   │
│ │   - Ideal line: dashed `#9ca3af` stroke 1.2px                        │   │
│ │   - Actual line: `var(--primary)` stroke 2px (solid)                 │   │
│ │   - Projected (from today → end): `#a5b4fc` stroke 1.2 dashed        │   │
│ │   - Today marker: `var(--primary)` vertical dashed + "Today" rect     │   │
│ │   - Callout rect (dark #111827): "N remaining" + "ideal M · gap ±X"  │   │
│ │   - Target line: `var(--danger)` vertical dashed + "Target" pill     │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
│ ┌─ .kpi-strip (grid 4 col, border-top) ───────────────────────────────┐   │
│ │  Remaining │ Velocity 7d │ Pass Rate │ ETA                          │   │
│ └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

#### CSS (신규 추가, Milestone Overview 전용 스코프)

```css
/* src/index.css 에 추가 */
.mo-chart-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; }
.mo-chart-head { padding: 9px 12px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border); }
.mo-chart-title { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px; }
.mo-chart-body { padding: 4px 8px; flex: 1; min-height: 200px; }
.mo-legend { display: flex; gap: 10px; font-size: 10px; color: var(--text-muted); }
.mo-legend .sw { width: 14px; height: 2px; border-radius: 1px; display: inline-block; vertical-align: middle; margin-right: 4px; }
.mo-legend .sw.ideal { background: var(--text-subtle); }
.mo-legend .sw.actual { background: var(--primary); }
.mo-legend .sw.scope { background: var(--warning); }
.mo-legend .sw.projected { background: #a5b4fc; }
.mo-range-tabs { display: flex; gap: 3px; margin-left: auto; background: var(--bg-subtle); padding: 2px; border-radius: 6px; }
.mo-range-tab { font-size: 10px; padding: 2px 7px; border-radius: 4px; cursor: pointer; color: var(--text-muted); border: 0; background: transparent; font-family: inherit; }
.mo-range-tab.active { background: #fff; color: var(--text); font-weight: 500; box-shadow: var(--shadow-sm); }

/* KPI strip (4 inline) */
.mo-kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--border); }
.mo-kpi { padding: 8px 10px; border-left: 1px solid var(--border); }
.mo-kpi:first-child { border-left: 0; }
.mo-kpi .l { font-size: 9.5px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
.mo-kpi .v { font-size: 17px; font-weight: 700; line-height: 1.1; margin-top: 2px; color: var(--text); }
.mo-kpi .sub { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; line-height: 1.3; }
.mo-kpi .delta { font-size: 10.5px; font-weight: 600; }
.mo-kpi .delta.up   { color: var(--danger-600); }
.mo-kpi .delta.down { color: var(--success-600); }
```

#### Recharts 구현 가이드

- **라이브러리:** `recharts` (기존 의존성). `LineChart`, `Line`, `XAxis`, `YAxis`, `CartesianGrid`, `ReferenceLine`, `Tooltip` 사용.
- **Series 구성:**
  ```ts
  data = [{ date, ideal, actual, scope, projected }, ...] // 날짜별 30d
  ```
- **Line 설정:**
  - ideal: `strokeDasharray="4 3"`, `stroke="#9ca3af"`, `strokeWidth={1.2}`, `dot={false}`
  - actual: `stroke="var(--primary)"`, `strokeWidth={2}`, `dot={false}`
  - projected: `strokeDasharray="2 2"`, `stroke="#a5b4fc"`, `strokeWidth={1.2}`, `dot={false}`
  - scope: `strokeDasharray="3 2"`, `stroke="var(--warning)"`, `strokeWidth={1.2}`, opacity 0.7
- **Today `<ReferenceLine>`:** `stroke="var(--primary)"`, `strokeDasharray="2 2"`, label with offset.
- **Target `<ReferenceLine x={endDate}>`:** `stroke="var(--danger)"`, `strokeDasharray="2 2"`.
- **Tooltip:** 기본 Recharts tooltip. `contentStyle={{ background: '#111827', border: 'none', borderRadius: 4, color: '#fff', fontSize: 11 }}`.
- **Range tabs (7d/30d/All):** 클라이언트 상태 `chartRange`로 data slice. 기본 `30d`. (AC-C3 요구: 기본은 30d)

#### KPI Strip 데이터 (AC-C3 준수)

| 위치 | 라벨 | 값 | 서브 텍스트 | 데이터 소스 |
|------|------|----|-----------|-----------|
| 1 | Remaining | `tcStats.untested` (숫자) | `▲/▼ N vs yesterday` | 기존 tcStats + 어제 스냅샷 (없으면 서브 생략) |
| 2 | Executed | `tcStats.total - tcStats.untested` | `{총 count} total` | 기존 tcStats |
| 3 | Velocity | `velocity7d` (TC/day) | `▲/▼ X% vs prior 7d` | 신규 계산 (최근 7일 executed / 7) |
| 4 | Pass Rate | `tcStats.passRate%` | `{passed}/{executed}` | 기존 tcStats |

> Note: dev-spec의 "KPI 4개 = Remaining/Executed/Velocity/PassRate"를 그대로 따름. mockup_3의 "Behind ideal / ETA"는 Intel 카드(ETA vs Target)로 분리.

---

### 4-2. Intel 그리드 (2×N, `.mo-intel-col`)

#### CSS

```css
.mo-overview-row { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr); gap: 14px; margin-bottom: 14px; }
@media (max-width: 1023px) { .mo-overview-row { grid-template-columns: 1fr; } }

.mo-intel-col { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: min-content; gap: 10px; }
.mo-panel { background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; }
.mo-panel.span-2 { grid-column: span 2; }
.mo-panel-head { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
.mo-panel-head .right { margin-left: auto; font-weight: 500; text-transform: none; letter-spacing: 0; font-size: 10.5px; color: var(--text-subtle); }
.mo-panel-head .right.link { color: var(--primary); cursor: pointer; }
.mo-panel-head .right.link:hover { text-decoration: underline; }

@media (max-width: 767px) { .mo-intel-col { grid-template-columns: 1fr; } .mo-panel.span-2 { grid-column: auto; } }
```

#### 6개 카드 스펙

##### (A) `<FailedBlockedCard />` — 상위 4개

```
┌─ .mo-panel ──────────────────────────────────────────────┐
│ ⚠ FAILED & BLOCKED                  View all in Issues → │
│                                                          │
│ [1]  TC-123 · Login w/ invalid pwd         Failed   8    │
│ [2]  TC-456 · DICOM render on iPad         Failed   5    │
│ [3]  TC-789 · Export PDF 2FA               Blocked  3    │
│ [4]  TC-012 · Auth token refresh           Failed   2    │
└──────────────────────────────────────────────────────────┘
```

CSS 추가:
```css
.mo-bl-row { display: grid; grid-template-columns: 18px 1fr auto; gap: 8px; align-items: center; font-size: 11.5px; padding: 4px 0; }
.mo-bl-row .num { background: var(--danger-50); color: var(--danger-600); font-weight: 700; font-size: 10px; width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.mo-bl-row .num.warn { background: var(--warning-50); color: var(--warning); }
.mo-bl-row .lbl { color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-bl-row .pct { font-weight: 600; color: var(--text); font-size: 11px; }
```

- **"View all in Issues →"** 링크 클릭 시 `navigate('?tab=issues', {replace: false})` (같은 페이지 내 탭 전환).
- 데이터: `failedBlockedTcs` 중 `fails_count desc` 정렬 top 4. 5+번째는 숨기고 링크로 유도.
- Empty: 0건이면 카드 전체를 숨기는 대신 `"No failed or blocked TCs 🎉"` 회색 텍스트 (한 줄, `padding: 8px 0; color: var(--text-subtle); font-size: 11.5px; text-align: center`).

##### (B) `<VelocitySparkline />` — 최근 7일

mockup_3의 `.spark` 그대로 재활용. CSS 추가:

```css
.mo-spark { display: flex; align-items: flex-end; gap: 3px; height: 42px; padding-top: 6px; }
.mo-spark .bar { flex: 1; background: var(--primary-100); border-radius: 2px; }
.mo-spark .bar.today { background: var(--primary); }
.mo-spark .bar.low { background: var(--danger-50); } /* < 30% of peak */
.mo-spark-x { display: flex; gap: 3px; margin-top: 4px; font-size: 9px; color: var(--text-subtle); }
.mo-spark-x span { flex: 1; text-align: center; }
```

- 데이터: 최근 7일 (월화수목금토일) executed count 배열.
- 높이: `(day_count / max_count) * 100%` → `height: X%` style 인라인.
- today 막대는 `.today` 클래스로 강조.
- Empty (전 7일 count = 0): 막대 전부 `var(--bg-subtle)` + `.mo-panel-head .right`에 `"no executions"` 표시.

##### (C) `<TopFailTagsCard />` **(신규 — mockup에 없음, §6-2 쿼리 기반)**

디자인:
```
┌─ .mo-panel ──────────────────────────────────────────────┐
│ 🏷 TOP-FAIL TAGS                         of 64 fails     │
│                                                          │
│   #auth        ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░    38%              │
│   #payment     ▓▓▓▓▓▓▓░░░░░░░░░░░░░    24%              │
│   #dicom       ▓▓▓▓▓░░░░░░░░░░░░░░░    18%              │
└──────────────────────────────────────────────────────────┘
```

CSS 추가:
```css
.mo-tag-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 11.5px; }
.mo-tag-row .tname { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; padding: 1px 6px; border-radius: 4px; background: var(--bg-subtle); color: var(--text-muted); flex: none; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-tag-row .mini-bar { flex: 1; height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden; margin: 0 4px; }
.mo-tag-row .mini-bar > span { display: block; height: 100%; background: var(--danger); }
.mo-tag-row .pct { font-weight: 600; color: var(--danger-600); margin-left: auto; font-size: 11px; min-width: 34px; text-align: right; }
```

- 데이터: `__src/pages/milestone-detail/OverviewTab__` 내부에서 dev-spec §6-2 (B) 쿼리 실행.
- Top 3 (4번째부터 숨김).
- Empty: `"No tags on failed TCs"` 회색 텍스트 (단일 줄, `padding: 8px 0; color: var(--text-subtle); text-align: center; font-size: 11.5px`).

##### (D) `<EtaCard />` — ETA vs Target D-day

디자인 (mockup_3 .eta-card 재활용):

```
┌─ .mo-panel ──────────────────────────────────────────────┐
│ ⏱ ETA VS TARGET                                D+5       │
│                                                          │
│  Jun 4   vs  May 30                                      │
│  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░                              │
│         ↑now                  ↑target                    │
│  60% elapsed · 64% done · -4% gap                        │
└──────────────────────────────────────────────────────────┘
```

CSS 추가:
```css
.mo-eta-values { display: flex; align-items: baseline; gap: 4px; margin-top: 2px; }
.mo-eta-values .eta-primary { font-size: 17px; font-weight: 700; color: var(--text); }
.mo-eta-values .vs { font-size: 10.5px; color: var(--text-muted); }
.mo-eta-values .target { font-size: 11.5px; color: var(--text); }
.mo-eta-bar { height: 8px; background: var(--bg-subtle); border-radius: 4px; position: relative; margin: 6px 0 4px; }
.mo-eta-bar .actual { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, var(--success), var(--warning)); border-radius: 4px; }
.mo-eta-bar .now { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--primary); }
.mo-eta-bar .target-tick { position: absolute; top: -4px; bottom: -4px; width: 2px; background: var(--text); }
.mo-eta-bar .now::after { content: "now"; position: absolute; top: -14px; transform: translateX(-50%); font-size: 9.5px; color: var(--primary); white-space: nowrap; }
.mo-eta-bar .target-tick::after { content: "target"; position: absolute; bottom: -16px; transform: translateX(-50%); font-size: 9.5px; color: var(--text-muted); white-space: nowrap; }
.mo-eta-footer { font-size: 10.5px; color: var(--text-muted); margin-top: 10px; }
.mo-eta-footer .gap-neg { color: var(--danger-600); font-weight: 600; }
.mo-eta-footer .gap-pos { color: var(--success-600); font-weight: 600; }
```

- 데이터: 기존 Burndown 탭의 `projDays` 로직 유지 (dev-spec AC-C4).
- 우측 상단 라벨 (D+X / D-X): `on_track` 이면 `color: var(--success-600)`, `behind` 면 `color: var(--danger-600); font-weight: 600`.
- Empty (시작일/종료일 없음): `"Set milestone dates to see ETA"` 회색 텍스트.

##### (E) `<AiRiskInsight />` — AI Risk Insight (span 2)

dev-spec AC-C4: "기존 Status 탭 isCritical/isAtRisk + 기존 Burndown AI Insight 통합 카드".

디자인 (mockup_3 .ai-mini 변형):

```
┌─ .mo-ai-insight (span 2) ────────────────────────────────────────────────┐
│ ✦ AI RISK INSIGHT                                  confidence 82%        │
│ ─────────────────────────────────────────────                             │
│ • Target miss likely (-34 TC behind). Velocity dropped 30% this week...   │
│ • Unblock wins 5 days. Resolving "Test data missing" (6 TCs)...          │
│ • Drop Performance Baseline (86 TCs) to v2.1 scope — infra-blocked...    │
└──────────────────────────────────────────────────────────────────────────┘
```

CSS 추가:
```css
.mo-ai-insight { background: linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%); border: 1px solid #ddd6fe; padding: 10px 12px; border-radius: 10px; grid-column: span 2; }
.mo-ai-insight-head { display: flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--violet); margin-bottom: 8px; }
.mo-ai-insight-head .conf { margin-left: auto; font-size: 9.5px; font-weight: 500; color: var(--violet); background: #fff; border: 1px solid #ddd6fe; padding: 1px 5px; border-radius: 3px; text-transform: none; letter-spacing: 0; }
.mo-ai-bullet { font-size: 11.5px; color: var(--text); line-height: 1.45; padding: 5px 0; border-top: 1px solid #ede9fe; }
.mo-ai-bullet:first-of-type { border-top: 0; }
.mo-ai-bullet b { color: var(--violet); font-weight: 600; }
@media (max-width: 767px) { .mo-ai-insight { grid-column: auto; } }
```

- **Content:**
  - Critical 상태: 빨간 "⚠ Critical" 라벨 1줄 + 2~3개 권장 액션 불릿.
  - At Risk 상태: 보통 "● At Risk" 라벨 + 불릿 3개.
  - On Track 상태: 초록 "✓ On track" 라벨 + 1줄 "Progress on track..." (`milestones.detail.overview.intel.aiOnTrack` i18n).
- **Header icon:** `ri-sparkling-2-line` (violet).
- **confidence 뱃지:** 우측 상단. 데이터 미정 시 숨김.
- Empty / 데이터 부족: 헤더만 표시 + 본문 "Keep running tests to build AI insight." `text-subtle` 11.5px.

##### (F) `<Activity24hFeed />` — Last 24h (span 2)

디자인 (mockup_3 .feed 재활용):

```
┌─ .mo-panel.span-2 ────────────────────────────────────────────────────────┐
│ 🕐 ACTIVITY · LAST 24H                      View full activity →          │
│ ─────────────────────────────────────────────                              │
│ ● @daniel passed 14 TCs in Login Flow Regression              12m ago     │
│ ● @min 3 fails on DICOM Viewer (ENV-PROD)                     1h          │
│ ● AI generated Plan "Perf Smoke" from 24 TCs                  4h          │
│ ● @sohee started ad-hoc Run (8 TCs)                           9h          │
└──────────────────────────────────────────────────────────────────────────┘
```

CSS 추가:
```css
.mo-feed { font-size: 11.5px; }
.mo-feed-row { display: flex; align-items: flex-start; gap: 8px; padding: 5px 0; border-top: 1px solid var(--border); }
.mo-feed-row:first-child { border-top: 0; }
.mo-feed-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex: none; }
.mo-feed-dot.success { background: var(--success); }
.mo-feed-dot.fail { background: var(--danger); }
.mo-feed-dot.info { background: var(--blue); }
.mo-feed-dot.violet { background: var(--violet); }
.mo-feed .what { flex: 1; min-width: 0; line-height: 1.4; color: var(--text); }
.mo-feed .what b { font-weight: 600; color: var(--text); }
.mo-feed .when { color: var(--text-subtle); font-size: 10.5px; margin-left: auto; flex: none; }
```

- **데이터 소스 (BR-10):** 기존 `activityLogs` 중 `timestamp > now() - 24h` 필터 → `slice(0, 4)`.
- **이벤트 타입 → 닷 매핑:**
  - `passed` → `.success`
  - `failed` / `blocked` → `.fail`
  - `note` / `plan_created` / `run_started` → `.info`
  - `ai_generated` → `.violet` (기존 activity에 없으면 일단 info)
- **when 포맷:** `< 1h` → `{N}m ago`, `< 24h` → `{N}h`, else (24h를 넘는 이벤트는 없음) → `{date}`.
- **"View full activity →"** 클릭: `navigate('?tab=activity')`.
- Empty: `"No activity in the last 24 hours"` 회색 텍스트 (`padding: 10px 0; text-align: center; color: var(--text-subtle); font-size: 11.5px;`).

---

## 5. Execution Sections (하단 실행 목록)

### 5-1. Section Head (공통)

```css
.mo-sec-head { display: flex; align-items: center; gap: 8px; padding: 16px 0 10px; font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.mo-sec-head .count { background: var(--bg-subtle); color: var(--text-muted); padding: 1px 7px; border-radius: 10px; font-size: 11px; font-weight: 600; text-transform: none; letter-spacing: 0; }
.mo-sec-head .legend { margin-left: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; font-size: 11px; display: flex; gap: 10px; color: var(--text-muted); }
.mo-sec-head .legend .leg { display: inline-flex; align-items: center; gap: 4px; }
```

### 5-2. Section Card (공통 rows)

```css
.mo-sec-card { background: #fff; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.mo-sec-card .row { display: grid; grid-template-columns: 30px minmax(220px, 1.5fr) minmax(180px, 1.4fr) auto auto auto; gap: 14px; align-items: center; padding: 11px 16px; border-top: 1px solid var(--border); font-size: 13px; text-decoration: none; color: inherit; }
.mo-sec-card .row:first-child { border-top: 0; }
.mo-sec-card .row:hover { background: var(--bg-muted); cursor: pointer; }
.mo-row-icon { width: 26px; height: 26px; border-radius: 6px; background: var(--bg-subtle); color: var(--text-muted); display: flex; align-items: center; justify-content: center; flex: none; }
.mo-row-icon.violet { background: var(--violet-50); color: var(--violet); }
.mo-row-icon.primary { background: var(--primary-50); color: var(--primary); }
.mo-row-icon.blue { background: #f0f9ff; color: #0369a1; }
.mo-row-icon.success { background: var(--success-50); color: var(--success-600); }
.mo-row-icon.warning { background: var(--warning-50); color: var(--warning); }
.mo-row-icon.orange { background: #fff7ed; color: var(--orange); }
.mo-row-name { font-weight: 600; font-size: 13px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-row-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.mo-row-pct { font-size: 13px; font-weight: 600; min-width: 38px; text-align: right; color: var(--text); }
.mo-row-pct.success { color: var(--success-600); }
.mo-row-pct.violet { color: var(--violet); }
.mo-stats-mini { font-size: 11px; color: var(--text-muted); display: flex; gap: 10px; flex-wrap: nowrap; white-space: nowrap; }
.mo-stats-mini b { color: var(--text); font-weight: 600; }
```

### 5-3. Sub Milestones 섹션 (기존 로직 유지, 스타일 신규 적용)

- Icon: `.mo-row-icon.success` (완료) / `.mo-row-icon.warning` (지연) / `.mo-row-icon.primary` (기본).
- Badge: `.badge.badge-success/warning/neutral` 기존.
- Link target: `/projects/:pid/milestones/:subId`.

### 5-4. **Test Plans 섹션 (신규)**

- Icon: `.mo-row-icon.violet`. 아이콘 `ri-folder-chart-line` (또는 기존 plan-card에 쓰던 아이콘 재활용).
- 컬럼 구조:
  ```
  [icon] [name + meta-inherited pill] [owner · count TCs] [progress bar] [badge] [pct] [›]
  ```
- **name 옆 meta-inherited pill:** 부모 마일스톤 이름 (기존 `.meta-inherited` CSS 재활용, index.css:144).
- **owner:** `@daniel` 형태, `var(--text-muted)`.
- **progress bar:** 기존 `.plan-pbar` (width 100, height 6). pass/fail 세그먼트.
- **Badge:** In Progress / Ready / Not started — 기존 `.badge-warning / -success / -neutral`.
- Link target: `/projects/:pid/plans/:planId`.
- Empty: `plans.length === 0` 일 때 카드 전체를 숨기지 말고 다음 empty state 렌더:
  ```
  ┌─ .mo-empty (border, dashed) ───────────────────────────┐
  │   📋 No test plans linked to this milestone            │
  │   [Create Plan] (plan Hobby+만 활성, Free는 disabled +  │
  │   "Upgrade to create plans" 링크)                       │
  └────────────────────────────────────────────────────────┘
  ```
  ```css
  .mo-empty { background: #fff; border: 1px dashed var(--border-strong); border-radius: 10px; padding: 24px 16px; text-align: center; color: var(--text-subtle); font-size: 13px; }
  .mo-empty .mo-empty-icon { width: 32px; height: 32px; margin: 0 auto 8px; color: var(--text-subtle); }
  .mo-empty .mo-empty-cta { margin-top: 10px; }
  ```

### 5-5. Runs 섹션 — **Planned vs Milestone-direct 구분**

- 섹션 헤드에 레전드 추가:
  ```html
  <div class="legend">
    <span class="leg"><span class="run-type-dot planned"></span>Planned</span>
    <span class="leg"><span class="run-type-dot mdirect"></span>Milestone-direct</span>
  </div>
  ```
- **Row name 뒤에 뱃지 (mockup_3 스타일):**
  - `test_plan_id !== null` → `<span class="linkage-badge linkage-planned"><span class="run-type-dot planned"></span>Planned · {plan.name}</span>` (기존 index.css:159)
  - `test_plan_id === null` → `<span class="linkage-badge linkage-mdirect"><span class="run-type-dot mdirect"></span>Milestone-direct</span>` (index.css:160)
  - Orphan (plan id 있으나 plan 레코드 없음) → `Plan: (deleted)` 회색 뱃지 (`.linkage-badge` 기본, content "deleted" gray).
- **Row-icon color:**
  - Planned 런: `.mo-row-icon.primary`
  - Milestone-direct 런: `.mo-row-icon.blue`
- **stats-mini:** `{N} passed · {N} failed · {N} blocked · {N} untested`. 기존 `.mo-stats-mini`.
- **Status badge:** 기존 `getRunStatusStyle` 재활용 (현 milestone-detail/page.tsx).
- Link target: `/projects/:pid/runs/:runId`.
- Empty: `runs.length === 0`이면 빈 텍스트 `"No runs yet"` (기존 디자인 유지).
- **AC-C11:** `runs + subs + plans` 전부 0이면 **실행 목록 섹션 전체를 통합 empty state 하나로** 대체:
  ```
  ┌─ .mo-empty (2배 높이) ───────────────────────────────────┐
  │   📁 No runs or plans yet.                               │
  │   Create a plan to start tracking executions.            │
  │   [+ Create Plan]                                        │
  └──────────────────────────────────────────────────────────┘
  ```

### 5-6. Exploratory 섹션

- Icon: `.mo-row-icon.violet`, 아이콘 `ri-search-2-line`.
- Badge: `.badge-violet / -success` (`In Progress` / `Completed`).
- Link target: `/projects/:pid/discovery-logs/:sessionId`.
- Progress bar: `.plan-pbar` + `progress-purple` fill.

---

## 6. Contributors Top 5 (하단 풀폭 카드)

- Overview 탭 **맨 아래 실행 목록 이후**에 배치. (dev-spec AC-C6: "Overview 탭 우측 또는 하단" — 2-column 레이아웃에서 우측 패널로 넣으면 상단 Intel 영역이 3-column이 되어 과밀, 따라서 **하단 풀폭이 권장**.)
- 기존 Status 탭의 Contributors 카드를 **그대로 이동** (milestone-detail/page.tsx:1114-1149).
- CSS 변경 없음. `background: #fff; border: 1px solid var(--border); border-radius: 10px; padding: 1rem 1.25rem;` 유지.
- Empty (`contributors.length === 0`): 카드 자체를 숨김 (기존 동작과 동일).

---

## 7. Issues 탭 메타데이터 (Option B) — `<IssuesList />` 공통 컴포넌트

### 7-1. Issues List 헤더

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Sources:  [All 12]  [J Jira 8]  [GH GitHub 4]           Issues from...   │
│                                                                          │
│ Last synced 2h ago              [Refresh now]  (권한 ≥ Tester)           │
└─────────────────────────────────────────────────────────────────────────┘
```

- `.int-strip` 재활용 (기존).
- "Last synced" 텍스트:
  ```html
  <span class="mo-last-synced">
    <i class="ri-time-line" />
    Last synced 2h ago
  </span>
  <button class="btn btn-sm mo-refresh-btn">
    <i class="ri-refresh-line" />
    Refresh now
  </button>
  ```
  ```css
  .mo-last-synced { font-size: 11px; color: var(--text-subtle); display: inline-flex; align-items: center; gap: 4px; }
  .mo-refresh-btn { margin-left: 8px; }
  .mo-refresh-btn.loading i { animation: mo-spin 0.8s linear infinite; }
  @keyframes mo-spin { to { transform: rotate(360deg); } }
  ```
- Viewer 권한: Refresh 버튼 **숨김** (`hidden`).
- Debounce: 10초 내 재클릭 시 disabled + 토스트 `"Please wait before refreshing again"`.

### 7-2. Issue Row 구조 (신규 컬럼 추가)

기존 `.iss-row`는 `grid-template-columns: 36px 100px minmax(200px, 2fr) 80px 120px 130px 32px` (7 col: source / id / title+meta / priority / status / assignee-placeholder / action).

**변경:** 6번째 컬럼 `130px`는 이미 assignee 슬롯이므로 avatar + 이름으로 채움 (현재는 미사용).

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [J] PROJ-123  Summary text                      [High]  ● Open   [👤 Kyle]  [↗]│
│      Jira·Bug → TC-045 Run #2 Apr 14                                          │
└────────────────────────────────────────────────────────────────────────────┘
```

| 컬럼 | 폭 | 내용 | CSS |
|------|-----|------|-----|
| 1 | 36px | Source 아이콘 | `.iss-source.jira` / `.iss-source.gh` 재활용 |
| 2 | 100px | Issue ID (PROJ-123 / #45) + "Jira · Bug" / "GitHub" | `.iss-id` + sub |
| 3 | `minmax(200px, 2fr)` | Title (1줄 truncate) + meta | `.iss-title` + `.iss-meta` |
| 4 | 80px | **Priority 뱃지** | `.sev.sev-crit/-major/-medium/-minor` |
| 5 | 120px | **Status (dot + label)** | `.iss-status.open/.prog/.resolved/.closed` |
| 6 | 130px | **Assignee (avatar + 이름)** | `.mo-assignee` (신규, 아래) |
| 7 | 32px | External link 아이콘 | 기존 |

```css
.mo-assignee { display: inline-flex; align-items: center; gap: 6px; min-width: 0; }
.mo-assignee .av { width: 22px; height: 22px; border-radius: 50%; flex: none; }
.mo-assignee .av.initials { background: var(--primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; }
.mo-assignee .name { font-size: 11.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mo-assignee.unassigned .av { background: var(--bg-subtle); color: var(--text-subtle); }
.mo-assignee.unassigned .name { color: var(--text-subtle); font-style: italic; }
```

- **Avatar fallback 우선순위:**
  1. `assignee.avatar_url` 있으면 `<img>` 로드. onError 시 2로 fallback.
  2. `assignee.display_name` 첫 2자 대문자 initials (`getContributorInitials` 재활용, milestone-detail/page.tsx의 `getAuthorColor`로 색상 순환).
  3. 둘 다 없으면 `"Unassigned"` + `.mo-assignee.unassigned` + 인간 실루엣 아이콘 `ri-user-line`.

### 7-3. Metadata Unavailable (에러 case)

- `issue.error === 'not_found'` / `'forbidden'`:
  - Priority 칸: `—` (`.sev` 없이 plain text, `color: var(--text-subtle); font-size: 12px`).
  - Status 칸: `—` 동일.
  - Assignee 칸: `.mo-assignee.unassigned` + 이름 `—`.
  - 행 우측에 회색 `<i class="ri-error-warning-line" title="Metadata unavailable" style="color: var(--text-subtle); font-size: 13px;" />` 아이콘.
  - 호버 시 tooltip: `"Issue metadata unavailable — issue may be deleted or inaccessible"`.

### 7-4. Reactive 메타데이터 업데이트

- Sync 중 (`isSyncing === true`): 행 전체에 `opacity: 0.6` + 상단 헤더에 `"Syncing..."` 텍스트 (`.mo-last-synced`의 텍스트 대체).
- Sync 완료: `Last synced "just now"`로 업데이트 + 토스트 `"Synced 12 issues"` (en) / `"12개 이슈 동기화 완료"` (ko).

---

## 8. Milestone List → Detail Entry (`MilestonePlanList.tsx`)

### 8-1. 버튼 위치

현재 코드 (MilestonePlanList.tsx:192-201):
```tsx
<div className="ms-header-actions">
  <button className="btn btn-sm" onClick={onEdit}>
    <svg>...</svg> Edit
  </button>
</div>
```

**변경 후:**
```tsx
<div className="ms-header-actions">
  <button className="btn btn-sm" onClick={() => navigate(`/projects/${projectId}/milestones/${milestone.id}`)}>
    {t('milestones.openDetailedView')}
    <svg className="icon-sm">...arrow-right...</svg>
  </button>
  <button className="btn btn-sm" onClick={onEdit}>
    <svg>...</svg> Edit
  </button>
</div>
```

### 8-2. 스타일

- **재활용:** 기존 `.btn.btn-sm` 클래스 (index.css:341, 348). 변경 없음.
- **아이콘:** 우측 화살표 (기존 `.plan-card-caret`에서 쓰던 `<svg>` 재활용, chevron-right 대신 **arrow-right** 사용).
  ```tsx
  <svg className="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
  ```
- **Hover:** `.btn:hover` 기존 `background: var(--bg-muted)` 재활용.
- **Disabled 안함** — dev-spec AC-B3: 상태 무관 항상 활성.
- 버튼 순서: **Open detailed view (왼쪽) → Edit (오른쪽)**. AC-B1 명시.

---

## 9. 상태별 UI (Overview 탭 전체)

| 상태 | 렌더링 |
|------|--------|
| **초기 로딩** | 기존 `loadMilestoneDetailData` 로딩 스피너 유지 (milestone-detail/page.tsx의 기존 로딩 상태). |
| **부분 로딩 (Test Plans만)** | Test Plans 섹션 내부에 Skeleton 3행 (높이 48px). CSS `.mo-skeleton-row { height: 48px; background: linear-gradient(90deg, var(--bg-subtle) 0%, #fff 50%, var(--bg-subtle) 100%); background-size: 200% 100%; animation: mo-shimmer 1.5s infinite; border-radius: 8px; margin-bottom: 8px; } @keyframes mo-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }` |
| **Test Plans 로드 실패** | Section 내부에 inline 에러 카드 (bg: `var(--danger-50)`, border: `var(--danger-100)`, padding 12 16, text: `"Failed to load plans. [Retry]"`). Retry 클릭 시 `refetch()`. |
| **밀스톤 자체 없음 (404)** | 기존 에러 페이지 유지. |
| **모든 섹션 빈 상태** | §5-5 통합 empty state. |
| **Burndown 데이터 부족 (runs 0)** | Chart 영역에 중앙 메시지 `"Start running tests to see burndown"` + 아이콘 `ri-bar-chart-line` 32px gray. |
| **Intel 카드 개별 빈 상태** | 각 카드별로 §4-2에 명시 (Top-Fail Tags, Failed&Blocked, Activity 24h, Velocity 7d). |
| **플랜 제한 (Free)** | Test Plans 섹션 empty state 내부에 `[Create Plan]` 버튼 disabled + `"Upgrade to Hobby to create plans"` 링크 (→ `/settings/billing`). |

---

## 10. 인터랙션

### 10-1. 클릭 & 네비게이션

| 트리거 | 동작 |
|--------|------|
| 탭 `Overview` / `Activity` / `Issues` 클릭 | `setSearchParams({ tab })` (replace 없음) |
| 구 URL `?tab=results\|status\|burndown` 진입 | `useEffect`에서 `setSearchParams({ tab: 'overview' }, { replace: true })` — 스크롤 히스토리 보존 |
| Burndown `ReferenceLine` "Today" 호버 | Recharts 기본 Tooltip (날짜 + remaining/ideal/gap) |
| Intel 카드 "View all in Issues →" | `navigate('?tab=issues')` |
| Intel 카드 "View full activity →" | `navigate('?tab=activity')` |
| Row (Sub/Plan/Run/Exploratory) 클릭 | `navigate` to detail |
| Issues 행 외부링크 아이콘 클릭 | `window.open(issue.url, '_blank', 'noopener,noreferrer')` |
| `MilestonePlanList` "Open detailed view →" | `navigate('/projects/:pid/milestones/:mid')` |
| Issues 탭 "Refresh now" | `supabase.functions.invoke('sync-jira-metadata', ...)` + `sync-github-metadata` (Promise.all) |

### 10-2. 호버

| 요소 | 호버 스타일 |
|------|-----------|
| `.mo-sec-card .row` | `background: var(--bg-muted)` |
| `.iss-row` | 기존 `background: var(--bg-muted)` 재활용 |
| `.mo-panel-head .right.link` | `text-decoration: underline` |
| `.btn` | `background: var(--bg-muted)` 기존 |
| `.mo-range-tab`(비활성) | `color: var(--text)` |
| Chart 라인 포인트 | Recharts 기본 (포인트 확대 + tooltip) |

### 10-3. Focus (키보드)

| 요소 | Focus 스타일 |
|------|------------|
| `.btn` | `outline: 2px solid var(--primary); outline-offset: 2px;` |
| `.mo-sec-card .row`이 `<Link>`일 때 | `outline: 2px solid var(--primary); outline-offset: -2px;` (inset) |
| 탭 버튼 | 기존 `.detail-tab` 포커스 시 밑줄 진해짐 (추가 `outline: 1px dashed var(--primary); outline-offset: 4px;`) |
| `.mo-refresh-btn` | 동일 |

### 10-4. 키보드 단축키

- **탭 전환:** `G` → `O` (Overview), `G` → `A` (Activity), `G` → `I` (Issues). G-chord 라우터에 등록.
- **Refresh now:** `R` (Issues 탭 활성일 때만, 권한 ≥ Tester). Debounce 10s.
- **ESC:** 없음 (모달 없음).

### 10-5. 토스트 메시지 (en / ko)

| 이벤트 | EN | KO | type |
|--------|-----|-----|------|
| Refresh 성공 | `Synced {count} issues` | `{count}개 이슈 동기화 완료` | success |
| Refresh 실패 (네트워크) | `Failed to refresh issues. Retry later.` | `이슈 새로고침 실패. 나중에 다시 시도하세요.` | error |
| Refresh 실패 (권한) | `Reconnect Jira / GitHub in Integration settings` | `Integration 설정에서 Jira/GitHub을 다시 연결하세요` | error |
| Refresh rate limit | `Please wait before refreshing again` | `잠시 후 다시 시도해주세요` | warning |
| Sync 중 일부 실패 | `Synced {ok} issues, {fail} failed` | `{ok}개 동기화 · {fail}개 실패` | info |
| Tab redirect (from `?tab=burndown`) | (silent, no toast) | (silent) | — |
| Plan create 시도 (Free) | `Upgrade to Hobby to create test plans` | `테스트 플랜 생성은 Hobby 이상 플랜에서 가능합니다` | info |

---

## 11. 반응형 (Overview 탭 전용)

### 11-1. 브레이크포인트별 변경점

| 브레이크포인트 | Overview Row | Intel Grid | KPI Strip | Execution Row | 특이사항 |
|--------------|--------------|-----------|-----------|--------------|----------|
| ≥ 1280 (xl) | 2col (1.55fr / 1fr) | 2col | 4col | grid 6col | 기본 |
| 1024–1279 (lg) | 2col (1.3fr / 1fr) | 2col | 4col | 동일 | Intel 카드 padding 축소 |
| 768–1023 (md) | 1col stacked | 2col | 2col 2rows (반응형 grid) | 5col (accept overflow-x scroll 금지, meta 줄바꿈) | Chart 위 Intel 아래 |
| < 768 (sm) | 1col | 1col (span-2 풀림) | 2col 2rows | flex-column | 모든 행이 2줄 이상 허용 |

### 11-2. 모바일 (< 768px) Execution Row 세부

```
┌──────────────────────────────────────────┐
│ [🏷] login-regression-r3                  │
│     Planned · Login Flow                  │
│ ────────────────────────────              │
│ 28 passed · 6 failed · 14 untested        │
│ In Progress                      58%  ›   │
└──────────────────────────────────────────┘
```

CSS:
```css
@media (max-width: 767px) {
  .mo-sec-card .row { grid-template-columns: 30px 1fr auto; grid-template-areas: "icon name pct" "icon linkage pct" "icon stats status"; padding: 10px 12px; }
  .mo-sec-card .row > .mo-row-icon { grid-area: icon; }
  .mo-sec-card .row > .mo-row-name { grid-area: name; }
  .mo-sec-card .row > .linkage-badge { grid-area: linkage; justify-self: start; margin-top: 2px; }
  .mo-sec-card .row > .mo-stats-mini { grid-area: stats; font-size: 10.5px; }
  .mo-sec-card .row > .badge { grid-area: status; justify-self: end; }
  .mo-sec-card .row > .mo-row-pct { grid-area: pct; }
}
```

### 11-3. Chart 반응형

- Recharts `ResponsiveContainer` 사용: `<ResponsiveContainer width="100%" height={200}>`.
- `<1024px`: Chart width 전체 폭 사용.
- `<768px`: X축 레이블 개수 축소 (`interval="preserveStartEnd"`).

---

## 12. 다크모드 (해당 없음)

**Testably 앱 내부는 라이트 테마만 지원** (다크모드 없음). `UI_GUIDE.md`의 `bg-slate-900` 토큰은 마케팅 페이지 전용. 본 스펙은 라이트 테마만 디자인.

향후 다크모드 지원 시를 위해 CSS 변수 기반으로 설계되어 있으므로 `:root` 변수만 교체하면 적용 가능하도록 유지. 별도 `dark:` 클래스 지정 없음.

---

## 13. 기존 컴포넌트 재사용 & 신규 생성 목록

### 13-1. 재사용 (수정 없이)

| 컴포넌트 / CSS 클래스 | 위치 | 용도 |
|---------------------|------|------|
| `.btn`, `.btn-sm`, `.btn-primary` | `index.css:341-351` | 모든 버튼 |
| `.badge`, `.badge-success/-danger/-warning/-violet/-neutral` | `index.css:126-133` | 상태 뱃지 |
| `.dot`, `.dot-success/-danger/-warning/-neutral` | `index.css:136-141` | 통계 점 |
| `.detail-head`, `.detail-title`, `.detail-meta` | `index.css:96-101` | 상세 페이지 헤더 (변경 없음) |
| `.detail-progress` + seg-pass/fail | `index.css:104-108` | 헤더의 wide progress bar |
| `.stats-row` | `index.css:110-114` | 상단 통계 |
| `.detail-tabs`, `.detail-tab`, `.detail-tab.active` | `index.css:117-123` | 탭 헤더 (3개로 축소) |
| `.int-strip`, `.int-pill`, `.int-pill.jira/.gh` | `index.css:275-277, 306-310` | Issues 탭 source filter |
| `.iss-kpis`, `.iss-kpi`, `.iss-kpi.open/.prog/.resolved` | `index.css:278-285` | Issues 탭 KPI |
| `.iss-list`, `.iss-row`, `.iss-source`, `.iss-id`, `.iss-title`, `.iss-meta` | `index.css:285-304` | Issues 탭 리스트 |
| `.sev.sev-crit/-major/-minor` | `index.css:293-296` | Priority 뱃지 |
| `.iss-status.open/.prog/.resolved` | `index.css:297-300` | Status 뱃지 |
| `.linkage-badge`, `.linkage-planned/-mdirect/-plan-only/-adhoc` | `index.css:158-167` | Run linkage 뱃지 |
| `.run-type-dot.planned/.mdirect` | `index.css:163-167` | Run type 닷 |
| `.meta-inherited` | `index.css:144` | 부모 마일스톤 힌트 |
| `.plan-pbar`, `.plan-pbar-pass/-fail` | `index.css:439-442` | 플랜 진행바 |
| `AvatarStack` | `src/components/profiles/AvatarStack` (현 코드에서 사용 중) | Runs 섹션 assignees |
| `StatusBadge` | `src/components/...StatusBadge` | Activity 탭 (기존 유지) |
| `getStatusBadgeStyle`, `getRunStatusStyle`, `calculateRunProgress` | milestone-detail/page.tsx 유틸 | Execution rows |

### 13-2. 신규 CSS 클래스 (모두 `.mo-*` prefix로 scope)

추가 파일: `src/index.css` 맨 아래에 새 블록 추가.

```css
/* ─── Milestone Overview Redesign ────────────────────────────────────────── */
/* Chart card */
.mo-chart-card, .mo-chart-head, .mo-chart-title, .mo-chart-body, .mo-legend, .mo-legend .sw, .mo-legend .sw.ideal, .mo-legend .sw.actual, .mo-legend .sw.scope, .mo-legend .sw.projected, .mo-range-tabs, .mo-range-tab, .mo-range-tab.active

/* KPI strip */
.mo-kpi-strip, .mo-kpi, .mo-kpi .l, .mo-kpi .v, .mo-kpi .sub, .mo-kpi .delta, .mo-kpi .delta.up, .mo-kpi .delta.down

/* Overview row + intel column */
.mo-overview-row, .mo-intel-col, .mo-panel, .mo-panel.span-2, .mo-panel-head, .mo-panel-head .right, .mo-panel-head .right.link

/* Failed & Blocked rows */
.mo-bl-row, .mo-bl-row .num, .mo-bl-row .num.warn, .mo-bl-row .lbl, .mo-bl-row .pct

/* Velocity sparkline */
.mo-spark, .mo-spark .bar, .mo-spark .bar.today, .mo-spark .bar.low, .mo-spark-x

/* Top-Fail Tags */
.mo-tag-row, .mo-tag-row .tname, .mo-tag-row .mini-bar, .mo-tag-row .mini-bar > span, .mo-tag-row .pct

/* ETA card */
.mo-eta-values, .mo-eta-values .eta-primary, .mo-eta-values .vs, .mo-eta-values .target, .mo-eta-bar, .mo-eta-bar .actual, .mo-eta-bar .now, .mo-eta-bar .target-tick, .mo-eta-footer, .mo-eta-footer .gap-neg, .mo-eta-footer .gap-pos

/* AI Risk Insight */
.mo-ai-insight, .mo-ai-insight-head, .mo-ai-insight-head .conf, .mo-ai-bullet

/* Activity 24h feed */
.mo-feed, .mo-feed-row, .mo-feed-dot, .mo-feed-dot.success, .mo-feed-dot.fail, .mo-feed-dot.info, .mo-feed-dot.violet, .mo-feed .what, .mo-feed .when

/* Execution sections */
.mo-sec-head, .mo-sec-head .count, .mo-sec-head .legend, .mo-sec-head .legend .leg, .mo-sec-card, .mo-sec-card .row, .mo-row-icon, .mo-row-icon.violet, .mo-row-icon.primary, .mo-row-icon.blue, .mo-row-icon.success, .mo-row-icon.warning, .mo-row-icon.orange, .mo-row-name, .mo-row-sub, .mo-row-pct, .mo-row-pct.success, .mo-row-pct.violet, .mo-stats-mini, .mo-stats-mini b

/* Empty states */
.mo-empty, .mo-empty .mo-empty-icon, .mo-empty .mo-empty-cta

/* Skeleton & refresh button */
.mo-skeleton-row, .mo-last-synced, .mo-refresh-btn, .mo-refresh-btn.loading

/* Assignee display */
.mo-assignee, .mo-assignee .av, .mo-assignee .av.initials, .mo-assignee .name, .mo-assignee.unassigned

/* New priority/status (only missing one) */
.sev.sev-medium
.iss-status.closed
```

### 13-3. 신규 React 컴포넌트

| 파일 | 역할 | Props |
|------|------|-------|
| `src/pages/milestone-detail/OverviewTab.tsx` | Overview 탭 컨테이너 (Intel Row + Execution Sections + Contributors) | `{ milestone, runs, subMilestones, sessions, plans, tcStats, activityLogs, failedBlockedTcs, contributorProfiles, ...data, projectId }` |
| `src/pages/milestone-detail/BurndownChart.tsx` | Recharts LineChart + callout + ReferenceLines | `{ milestone, tcStats, historicalData, range: '7d' \| '30d' \| 'all' }` |
| `src/pages/milestone-detail/IntelGrid.tsx` | 6개 Intel 카드 래퍼 | `{ failedBlockedTcs, velocity7d, topFailTags, etaData, aiInsight, recent24hLogs, projectId, milestoneId }` |
| `src/pages/milestone-detail/FailedBlockedCard.tsx` | Top 4 failed/blocked | `{ tcs, onViewAll }` |
| `src/pages/milestone-detail/VelocitySparkline.tsx` | 7일 sparkline | `{ weekCounts: number[], avgPerDay: number }` |
| `src/pages/milestone-detail/TopFailTagsCard.tsx` | 신규 — 태그별 bar | `{ tags: Array<{ name, count, pct }>, totalFails }` |
| `src/pages/milestone-detail/EtaCard.tsx` | ETA vs Target | `{ projDate, targetDate, elapsedPct, donePct }` |
| `src/pages/milestone-detail/AiRiskInsight.tsx` | AI 인사이트 카드 | `{ riskLevel: 'on_track'\|'at_risk'\|'critical', bullets: string[], confidence?: number }` |
| `src/pages/milestone-detail/Activity24hFeed.tsx` | 24h mini feed | `{ logs: ActivityLog[], onViewAll }` |
| `src/pages/milestone-detail/ExecutionSections.tsx` | Sub/Plans/Runs/Exploratory 컨테이너 | `{ subMilestones, plans, runs, sessions, projectId, plansMap }` |
| `src/pages/milestone-detail/KpiStrip.tsx` | 4 KPI inline | `{ remaining, executed, velocity, passRate }` |
| `src/components/issues/IssuesList.tsx` | **공통** Jira/GitHub 이슈 리스트 | `{ runIds, onCountChange?, allowRefresh }` |
| `src/components/issues/IssuePriorityBadge.tsx` | priority 뱃지 | `{ priority: 'critical' \| 'high' \| 'medium' \| 'low' \| null }` |
| `src/components/issues/IssueStatusBadge.tsx` | status 뱃지 (dot + label) | `{ status: 'open' \| 'in_progress' \| 'resolved' \| 'closed' \| null }` |
| `src/components/issues/IssueAssignee.tsx` | avatar + 이름 | `{ avatarUrl?, displayName?, login? }` |
| `src/components/issues/LastSyncedLabel.tsx` | "Last synced X ago" + Refresh 버튼 | `{ lastSyncedAt: string \| null, onRefresh, canRefresh }` |

### 13-4. 신규 유틸

| 파일 | 내용 |
|------|------|
| `src/lib/issueMetadata.ts` | `mapJiraPriority(jiraPri) → 'critical'\|'high'\|'medium'\|'low'\|null`, `mapJiraStatus(jiraStatus) → 'open'\|'in_progress'\|'resolved'\|'closed'`, `mapGitHubPriority(labels[])`, `mapGitHubState(state)`, `formatRelativeTime(iso) → "2h ago"` |

---

## 14. 아이콘 명세 (Remix Icon)

앱 내부는 Remix Icon 사용 (UI_GUIDE §8). SVG stroke도 허용 (기존 milestone-detail/page.tsx에서 동시 사용).

| 위치 | 아이콘 | 클래스 |
|------|--------|--------|
| Burndown chart title | `ri-line-chart-line` | `text-primary` 12px |
| Failed & Blocked head | `ri-error-warning-line` | `color: var(--danger)` 12px |
| Velocity head | `ri-bar-chart-2-line` | `color: var(--primary)` 12px |
| Top-Fail Tags head | `ri-price-tag-3-line` | `color: var(--danger)` 12px |
| ETA head | `ri-time-line` | `color: var(--warning)` 12px |
| AI Insight head | `ri-sparkling-2-line` | `color: var(--violet)` 12px |
| Activity 24h head | `ri-history-line` | `color: var(--text-muted)` 12px |
| Section head — Sub Milestones | `ri-git-branch-line` | 13px inherit |
| Section head — Test Plans | `ri-folder-chart-line` | `color: var(--violet)` |
| Section head — Runs | `ri-play-circle-line` | `color: var(--blue)` |
| Section head — Exploratory | `ri-search-eye-line` | `color: var(--violet)` |
| Empty state generic | `ri-folder-open-line` | 32px `var(--text-subtle)` |
| Empty — no plans | `ri-folder-chart-line` | 동일 |
| Empty — no activity | `ri-history-line` | 동일 |
| Empty — no tags | `ri-price-tag-3-line` | 동일 |
| Refresh now | `ri-refresh-line` | inherit |
| Last synced | `ri-time-line` | `var(--text-subtle)` |
| Metadata unavailable | `ri-error-warning-line` | `var(--text-subtle)` |
| External link (issue row) | `ri-external-link-line` | `var(--text-subtle)` |
| Unassigned fallback | `ri-user-line` | inherit |
| "Open detailed view →" 화살표 | 기존 svg `arrow-right` (MilestonePlanList에 inline) |

---

## 15. 모션 / 애니메이션

전반적으로 **모션 억제**. 과도한 애니메이션 금지 (Testably 원칙: Distraction-free).

| 요소 | 모션 |
|------|------|
| `.mo-sec-card .row` hover | `transition: background 0.12s ease` |
| `.mo-panel` hover | 없음 |
| `.mo-refresh-btn` 로딩 | `animation: mo-spin 0.8s linear infinite` |
| Skeleton | `animation: mo-shimmer 1.5s infinite linear` |
| 탭 전환 | 없음 (기존과 동일, 즉시 교체) |
| Chart 첫 렌더 | Recharts 기본 애니메이션 (duration 400ms) — 값 업데이트 시는 `isAnimationActive={false}` (성능 이유) |
| Toast | Sonner 기본 fade (150ms) |
| `:focus` outline | 없음 (즉시 표시) |

`prefers-reduced-motion` 지원:
```css
@media (prefers-reduced-motion: reduce) {
  .mo-refresh-btn.loading i { animation: none; }
  .mo-skeleton-row { animation: none; background: var(--bg-subtle); }
}
```

---

## 16. 접근성

### 16-1. ARIA

- Overview 탭 컨테이너: `<section role="tabpanel" aria-labelledby="tab-overview">`.
- Intel 카드 각각: `<article aria-label="{카드 이름}">`.
- Chart: `<div role="img" aria-label="Burndown chart, {remaining} remaining of {total}, {status: on track/behind}">` — 스크린리더용.
- "View all in Issues →" 링크: `<a role="button" aria-label="View all failed and blocked issues in Issues tab">`.
- Refresh 버튼: `<button aria-label="Refresh issue metadata" aria-busy={isSyncing}>`.
- Issue row: `<a aria-label="{source} issue {key}, priority {priority}, status {status}, assignee {assignee}">`.

### 16-2. 키보드 탐색

- 모든 클릭 가능 요소는 Tab으로 도달 가능 (`<Link>` / `<button>` 사용, `div onClick` 금지).
- Section card rows: 각 row가 `<Link>`이므로 기본 포커스 가능.
- Intel card 내부 링크 ("View all…")도 `<button>` 또는 `<Link>`로 구현.
- Skip link: Overview → Activity 섹션으로 바로 이동 (기존 탭 구조상 불필요).

### 16-3. 명암비 (WCAG AA)

- 모든 텍스트 색상이 white bg 대비 4.5:1 이상:
  - `var(--text)` (#111827) on #fff → 16.8:1 ✓
  - `var(--text-muted)` (#6b7280) on #fff → 5.3:1 ✓
  - `var(--text-subtle)` (#9ca3af) on #fff → 3.3:1 ✗ (large text 3:1만 만족) — **11.5px 이하 텍스트는 `var(--text-muted)` 사용**.
  - `var(--primary)` (#6366f1) on #fff → 4.5:1 ✓ (보더라인)
  - `var(--danger-600)` (#dc2626) on #fff → 4.5:1 ✓

- **주의:** `.mo-kpi .sub`, `.mo-panel-head .right` 는 `var(--text-muted)`로 통일 (`var(--text-subtle)` 금지).

### 16-4. 색각이상 대응

- 상태 뱃지는 **색상 + 텍스트 라벨 + 아이콘 점** 3중 전달:
  - Priority: `Critical` / `High` / `Medium` / `Low` 라벨 (색만 의존 X)
  - Status: 라벨 + 닷 조합
  - Run type: "Planned · {plan}" 라벨로 구분, 닷은 보조

---

## 17. i18n 키 매핑

dev-spec §10에 정의된 키를 그대로 사용. 본 스펙에서 **추가 필요 키**:

```ts
// src/i18n/local/en/milestones.ts
'milestones.detail.overview.intel.confidenceLabel': 'confidence {value}%',
'milestones.detail.overview.intel.avgPerDay': '{value} avg',
'milestones.detail.overview.sections.subMilestones': 'Sub Milestones',
'milestones.detail.overview.sections.runs': 'Runs',
'milestones.detail.overview.sections.exploratory': 'Exploratory',
'milestones.detail.overview.sections.emptyAll': 'No runs or plans yet. Create a plan to start tracking executions.',
'milestones.detail.overview.sections.createPlan': '+ Create Plan',
'milestones.detail.overview.sections.upgradeToPlan': 'Upgrade to Hobby to create plans',
'milestones.detail.overview.chart.range.7d': '7d',
'milestones.detail.overview.chart.range.30d': '30d',
'milestones.detail.overview.chart.range.all': 'All',
'milestones.detail.overview.chart.legend.ideal': 'Ideal',
'milestones.detail.overview.chart.legend.actual': 'Actual',
'milestones.detail.overview.chart.legend.projected': 'Projected',
'milestones.detail.overview.chart.today': 'Today',
'milestones.detail.overview.chart.target': 'Target',
'milestones.detail.overview.chart.emptyBurndown': 'Start running tests to see burndown',

// ko
'milestones.detail.overview.intel.confidenceLabel': '신뢰도 {value}%',
'milestones.detail.overview.intel.avgPerDay': '평균 {value}',
'milestones.detail.overview.sections.subMilestones': '하위 마일스톤',
'milestones.detail.overview.sections.runs': '런',
'milestones.detail.overview.sections.exploratory': '탐색',
'milestones.detail.overview.sections.emptyAll': '런이나 플랜이 없습니다. 플랜을 만들어 실행 추적을 시작하세요.',
'milestones.detail.overview.sections.createPlan': '+ 플랜 만들기',
'milestones.detail.overview.sections.upgradeToPlan': '플랜 생성은 Hobby 이상 플랜에서 가능합니다',
'milestones.detail.overview.chart.range.7d': '7일',
'milestones.detail.overview.chart.range.30d': '30일',
'milestones.detail.overview.chart.range.all': '전체',
'milestones.detail.overview.chart.legend.ideal': '이상적',
'milestones.detail.overview.chart.legend.actual': '실제',
'milestones.detail.overview.chart.legend.projected': '예측',
'milestones.detail.overview.chart.today': '오늘',
'milestones.detail.overview.chart.target': '목표',
'milestones.detail.overview.chart.emptyBurndown': '테스트를 실행하면 번다운이 표시됩니다',
```

---

## 18. 체크리스트 (개발 착수 전)

### 디자인 스펙 자체 QA

- [x] 모든 상태 정의 (정상, 부분 로딩, 빈 상태, 에러, 플랜 제한) — §9
- [x] Tailwind 대신 **CSS 변수 기반 클래스** 구체 명시 — §13
- [x] 앱 내부 라이트 테마만 지원 (다크모드 미지원 명시) — §12
- [x] 기존 컴포넌트 재사용 목록 — §13-1
- [x] 신규 컴포넌트 목록 — §13-3
- [x] 인터랙션 (클릭/호버/focus/키보드) — §10
- [x] 반응형 브레이크포인트별 변경점 — §11
- [x] 토스트 메시지 en/ko 모두 — §10-5
- [x] dev-spec 수용 기준(AC-A1 ~ AC-C11)과 일치 확인 — 본문 전체

### 개발자 인수 전 필수 확인

- [ ] `src/index.css`에 §13-2 신규 클래스 블록 추가 (단일 큰 블록, `/* ─── Milestone Overview Redesign ─── */` 주석 포함)
- [ ] Recharts 의존성 존재 확인 (`package.json`에 있어야 함 — 기존 passrate chart에서 사용 중)
- [ ] `<Link>` 컴포넌트 (react-router-dom)로 모든 row 감싸기 (div onClick 금지)
- [ ] `useSearchParams` 훅으로 `?tab=` 리다이렉트 구현 (AC-C2)
- [ ] i18n 키 추가 (§17 + dev-spec §10)
- [ ] `src/components/issues/` 폴더 신규 생성
- [ ] Plan Detail의 IssuesTab을 `<IssuesList />` 호출로 **치환** (중복 로직 제거, dev-spec AC-A8)

---

## 부록 A — mockup_3 vs 최종 디자인 차이점

| 항목 | mockup_3 | 최종 스펙 | 사유 |
|------|----------|----------|------|
| 배경색 | `#f8f9fb` | `var(--bg-muted)` = `#f9fafb` | Testably 토큰 준수 |
| Chart 높이 | ~140px | 200px | 가독성 (텍스트 라벨 겹침 방지) |
| KPI "Behind ideal" | 있음 | **없음 (ETA 카드로 이동)** | dev-spec AC-C3: KPI 4개 = Remaining/Executed/Velocity/PassRate |
| KPI "Executed" | 없음 | **추가** | dev-spec 요구 |
| Top-Fail Tags | 없음 | **신규** | dev-spec AC-C4 |
| AI Insight confidence 뱃지 | 있음 | 유지 (단, 데이터 부족 시 숨김) | 데이터 없으면 UI 혼란 |
| Contributors Top 5 | 없음 | **하단 풀폭 카드로 추가** | dev-spec AC-C6 |
| CSS 변수 | `--primary`, `--danger` 등 (일치) | 동일 | — |
| `.sec-card .row` grid 컬럼 | 동일 | `minmax` 적용으로 반응형 개선 | mobile 대응 |
| Linkage 뱃지 (Planned/Mdirect) | 있음 | 그대로 재활용 (index.css:159-160 기존) | — |

## 부록 B — Plan Detail / Milestone Detail Issues 탭 공유점

| 요소 | Plan Detail | Milestone Detail | 비고 |
|------|-------------|------------------|------|
| 컴포넌트 | `<IssuesList runIds={planRunIds} />` | `<IssuesList runIds={milestoneRunIds} />` | **완전 동일** |
| Source filter (All/Jira/GH) | ✓ | ✓ | 동일 |
| KPI 4개 (Total / Jira / GH / Linked TCs) | ✓ | ✓ | 동일 |
| Issue row 7 컬럼 | ✓ | ✓ | 동일 |
| Last synced / Refresh now | ✓ | ✓ | 동일 |
| Summary 푸터 | ✓ | ✓ | 동일 |
| 라운드 밑 / 다름 | 기존 plan-sidebar 있음 | milestone-sidebar 없음 (풀폭) | 레이아웃만 다름 — `<IssuesList>` 내부는 공통 |

→ Plan Detail Issues 탭의 **Plan Sidebar (PlanSidebar)**는 유지. 그 옆 `<div>` 영역만 `<IssuesList />`로 교체.
→ Milestone Detail Issues 탭은 풀폭 `<IssuesList />` 단독 렌더.
