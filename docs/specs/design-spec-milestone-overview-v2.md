# Design Spec: Milestone Overview v2 — Layout Rebalance + AI Risk Hybrid UX

> **작성일:** 2026-04-19
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:**
> - `docs/specs/dev-spec-milestone-ai-risk-insight.md` (신규 — AI Risk 하이브리드)
> - `docs/specs/dev-spec-milestone-overview-redesign.md` (선행 — Overview 3탭 구조)
> **기존 디자인 명세 (v1):** `docs/specs/design-spec-milestone-overview-redesign.md` (이 문서는 v1의 **레이아웃만** 교체, 나머지 원칙은 상속)
> **영향 파일:**
> - `src/pages/milestone-detail/OverviewTab.tsx` (레이아웃 재배치)
> - `src/pages/milestone-detail/AiRiskInsight.tsx` (**삭제**)
> - 신규: `RiskInsightContainer.tsx`, `RiskSignalCard.tsx`, `AiRiskAnalysisCard.tsx`, `useMilestoneAiRisk.ts`
> - `src/index.css` (기존 `.mo-*` 블록 부분 수정 + 신규 `.mo-risk-*` 블록 추가)

---

## 0. v1 대비 무엇이 바뀌나 (TL;DR)

| 축 | v1 (현재) | v2 (이 스펙) |
|----|-----------|-------------|
| 전체 배치 | Left chart(1.55fr) + Right intel 1 col (6개 세로 스택) → **왼쪽 하단 공백 큼, 오른쪽 스크롤 과다** | **Top Hero Row** (Chart 2fr + RiskInsight 1fr) + **Intel Strip** 4 col (Failed / Velocity / TopFailTags / ETA) + **Execution Sections**. 왼쪽 하단 공백 제거. |
| AI Risk 위치 | Intel 그리드 내 span-2 카드 (하단) | **Hero Row 우측 고정 카드** (차트와 같은 높이, 시선 집중) |
| AI Risk 브랜딩 | 항상 "AI Risk Insight" (실제 AI 호출은 0건) | 기본 **"Risk Signal"** (rule-based, 아이콘 `ri-pulse-line`) → 버튼 클릭 시 **"AI Risk Analysis"** (아이콘 `ri-sparkling-2-line`) 로 전환 |
| Top-Fail Tags | Intel 그리드 안에서 반쪽 카드로 작게 | Intel Strip에서 4-col 중 1칸. 가로형 bar 그대로 유지하되 여백 확대 |
| 24h Activity | Intel span-2 카드 | Execution Sections 바로 위 **thin strip** (한 줄 높이) 로 이동 |
| Contributors Top 5 | 풀폭 하단 | Execution Sections 옆 **우측 사이드 카드** (desktop only) |
| Sub Milestones / Plans / Runs / Exploratory | Intel 아래 |  그대로 Execution Sections에 유지 — 단 **Hero+Strip 합산 높이 약 420px**이라 한 화면 첫 스크롤 안에 카드 헤더가 보임 |

---

## 1. 레이아웃

### 1-1. 현재(v1) 문제 — ASCII로 다시 정리

```
┌─ Hero Row (grid 1.55 : 1) ─────────────────────────────────────┐
│  Chart + KPI (높이 ≈ 340px)    Intel col 1fr                    │
│                                 Failed & Blocked                │
│                                 Velocity                        │
│                                 Top-Fail Tags  ← 너무 작음       │
│                                 ETA                             │
│                                 AI Risk (span-2)                │
│                                 24h Activity (span-2)           │
│                                 ↓ 카드 6개 세로 스택 → 스크롤    │
└────────────────────────────────────────────────────────────────┘
   ↑ 왼쪽은 340px에서 끝, 오른쪽은 700px+ 까지 내려감
   ↑ 왼쪽 하단 360px 공백  +  오른쪽 스크롤 과다  +  비대칭
┌─ Execution Sections (스크롤 한 번 해야 보임) ─────────────────┐
│  Sub Milestones / Test Plans / Runs / Exploratory             │
└───────────────────────────────────────────────────────────────┘
┌─ Contributors Top 5 (풀폭) ──────────────────────────────────┐
└──────────────────────────────────────────────────────────────┘
```

### 1-2. 제안(v2) — Hero Row + Intel Strip + 2 column bottom

```
┌─ HERO ROW (grid 2 : 1, gap 14, 높이 ≈ 320px) ───────────────────────────────┐
│ ┌── Chart Card (2fr) ─────────────────────────┐ ┌── Risk Insight (1fr) ──┐ │
│ │ Burndown Head · Legend · range tabs         │ │ [head]  Risk Signal    │ │
│ │ ─────────────────────────────────────────    │ │ ─────────────────────  │ │
│ │ Recharts (height 210)                        │ │ ● At Risk              │ │
│ │                                              │ │ • Progress behind…     │ │
│ │                                              │ │ • 8 failing TCs…       │ │
│ │                                              │ │ • Top fail #auth…      │ │
│ │ ─────────────────────────────────────────    │ │ ─────────────────────  │ │
│ │ KPI Strip · 4 col (Remaining/Exec/Vel/Pass)  │ │ [Analyze with AI →]    │ │
│ └──────────────────────────────────────────────┘ └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
┌─ INTEL STRIP (grid 4 col, gap 10, 높이 ≈ 112px) ─────────────────────────────┐
│ ┌─Failed&Blocked─┐ ┌─Velocity 7d─┐ ┌─Top-Fail Tags─┐ ┌─ETA vs Target──────┐  │
│ │ 4 rows compact │ │ 7 bars + x  │ │ 3 tag bars    │ │ bar + gap footer    │  │
│ └────────────────┘ └─────────────┘ └───────────────┘ └─────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ 24h ACTIVITY (단일 행 strip, 높이 ≈ 40px) ─────────────────────────────────┐
│ ● Kyle passed TC-42  2m  · ● Amy failed TC-91  18m  · …      View all →    │
└──────────────────────────────────────────────────────────────────────────────┘
┌─ BOTTOM ROW (grid 1.65 : 1, gap 14) ────────────────────────────────────────┐
│ ┌── Execution Sections (Sub / Plans / Runs / Exploratory) ─┐ ┌─ Contributors ─┐│
│ │  [sec-head] Sub Milestones  <count>                       │ │ 👤 Kyle    42   ││
│ │  [sec-card rows…]                                         │ │ 👤 Amy     31   ││
│ │  [sec-head] Test Plans                                    │ │ 👤 Jay     18   ││
│ │  ...                                                      │ │ 👤 Mo      12   ││
│ │                                                           │ │ 👤 Sara    8    ││
│ └───────────────────────────────────────────────────────────┘ └────────────────┘│
└──────────────────────────────────────────────────────────────────────────────┘
```

**결과:**
- 왼쪽 하단 공백 제거 (Intel 카드들이 수평 strip으로 채움).
- AI Risk 카드가 Hero Row의 우측 기둥 — 한 눈에 건강도/AI CTA 포착.
- Contributors Top 5를 Execution 섹션 옆(1fr)으로 옮겨 풀폭 하단 여백 제거.
- Hero + Intel Strip 합산 높이 ≈ 432px → **1280×800 해상도에서 첫 스크롤 안에 Execution 섹션 헤더까지 노출**.

### 1-3. 기존 유지 영역

`.breadcrumb`, `.detail-head`, `.detail-progress`, `.stats-row`, `.detail-tabs`(3탭 축소는 v1 그대로) — **변경 없음**.

---

## 2. Breakpoint별 그리드 정의

스크롤 컨테이너는 `.main-panel` (padding `20px 24px` 유지).

| 브레이크포인트 | Hero Row | Intel Strip | 24h Activity | Bottom Row |
|---------------|----------|-------------|--------------|------------|
| **≥ 1440px (xl 이상, desktop)** | `grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr)` · gap 14px | `repeat(4, minmax(0, 1fr))` · gap 10px | 단일 행, 횡 스크롤 없음 (최대 4 events 표시) | `grid-template-columns: minmax(0, 1.65fr) 260px` · gap 14px |
| **1280–1439px (xl, 기본 desktop)** | `minmax(0, 2fr) minmax(300px, 1fr)` · gap 14px | 4 col 유지 | 단일 행 4 events | `minmax(0, 1.55fr) 240px` · gap 14px |
| **1024–1279px (lg, laptop)** | `minmax(0, 1.6fr) minmax(280px, 1fr)` · gap 12px | 4 col 유지, 카드 padding `10px` | 단일 행 3 events + "View all →" | Contributors는 **Execution 위로** 올라감. Bottom Row = 단일 컬럼. Contributors는 2 col grid ( `repeat(auto-fit, minmax(200px, 1fr))` ) 로 한 줄에 5명 노출 |
| **768–1023px (md, tablet)** | **단일 컬럼** (Chart → Risk Insight 순서) | **`repeat(2, minmax(0, 1fr))`** (2×2) | 단일 행 2 events + "View all →" | 단일 컬럼, Contributors는 Execution 아래 풀폭 |
| **< 768px (sm, mobile)** | 단일 컬럼 | **단일 컬럼 (스택)** | 최대 2 events, 단일 행 (overflow hidden + ellipsis) | 단일 컬럼 |

> **근거:** 1280px 이상에서만 Hero의 2:1 분할이 의미를 가진다. 1024px 이하에서 1fr 컬럼이 320px 밑으로 떨어지면 AI Risk 카드의 bullets가 가독성을 잃으므로 단일 컬럼으로 전환 (Risk Insight를 Chart 아래로).

---

## 3. CSS 마이그레이션 — 기존 `.mo-*` 규칙 변경 매트릭스

### 3-1. 기존 규칙 처리

| 기존 클래스 | 처리 | 사유 |
|------------|------|------|
| `.mo-overview-row` | **전면 교체** — grid 비율 `2fr 1fr`로 변경, 브레이크포인트 분기 재정의 | Hero Row로 역할 재정의 |
| `.mo-intel-col` | **삭제** (v1은 세로 6개 스택용) | 역할 소멸 |
| `.mo-panel`, `.mo-panel-head`, `.mo-panel-head .right` | **유지** (Risk/AI 카드 내부에서도 재사용) | 범용 Intel 카드 스타일로 계속 쓰임 |
| `.mo-panel.span-2` | **유지하되 사용 중단** (코드에서 호출 안 함) | 24h Activity / AI가 더 이상 span-2 불필요 |
| `.mo-chart-card`, `.mo-chart-head`, `.mo-chart-body`, `.mo-legend`, `.mo-range-tabs`, `.mo-kpi-strip`, `.mo-kpi*` | **유지** (100% 재사용) | 차트 카드 자체는 변경 없음 |
| `.mo-bl-row*` (Failed) | **유지 + 컴팩트 모드 추가** (`.mo-intel-strip .mo-bl-row`에서 폰트 11px) | strip 안에 들어가면 여유 부족 |
| `.mo-spark*` (Velocity) | **유지** (그대로 사용) | 동일 |
| `.mo-tag-row*` (TopFailTags) | **유지 + tname 최대폭 축소** (120px → 90px) | 4 col 스트립에서 컬럼 폭 ≈ 200px |
| `.mo-eta-*` (ETA) | **유지** | 동일 |
| `.mo-ai-insight*` (기존 violet 그라데이션 span-2 카드) | **전면 교체** → 신규 `.mo-risk-*` / `.mo-ai-*` 블록 사용 | 하이브리드 구조로 재설계 |
| `.mo-feed*` (24h activity) | **유지 + 가로형 variant 추가** (`.mo-feed.inline`) | strip 모드에 필요 |
| `.mo-sec-*` (Execution sections) | **유지** | 동일 |
| `.mo-empty`, `.mo-skeleton-row`, `.mo-last-synced`, `.mo-refresh-btn`, `.mo-assignee` | **유지** | 동일 |

### 3-2. 신규 `.mo-*` 규칙

아래 블록을 `src/index.css`의 기존 `.mo-*` 섹션 하단에 **append**.

```css
/* =========================================================
   Milestone Overview v2 — Hero Row + Intel Strip + Bottom Row
   ========================================================= */

/* Hero Row: Chart (2fr) + Risk Insight (1fr) */
.mo-hero-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}
@media (max-width: 1023px) {
  .mo-hero-row { grid-template-columns: 1fr; }
}

/* Intel Strip: 4 columns fixed ratio */
.mo-intel-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}
@media (max-width: 1023px) {
  .mo-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .mo-intel-strip { grid-template-columns: 1fr; }
}
/* strip 안의 mo-panel은 고정 높이로 정렬 */
.mo-intel-strip .mo-panel {
  min-height: 112px;
  display: flex;
  flex-direction: column;
}
/* strip 내부에서 Failed&Blocked는 최대 4 row compact */
.mo-intel-strip .mo-bl-row { font-size: 11px; padding: 3px 0; }

/* 24h Activity inline strip */
.mo-activity-strip {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 14px;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  overflow: hidden;
  font-size: 11.5px;
}
.mo-activity-strip .label {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.mo-activity-strip .events {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 16px;
  overflow: hidden;
}
.mo-activity-strip .ev {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 260px;
}
.mo-activity-strip .ev .dot {
  width: 6px; height: 6px; border-radius: 50%; flex: none;
}
.mo-activity-strip .ev .dot.success { background: var(--success); }
.mo-activity-strip .ev .dot.fail    { background: var(--danger);  }
.mo-activity-strip .ev .dot.info    { background: var(--blue);    }
.mo-activity-strip .ev .when { color: var(--text-subtle); font-size: 10.5px; margin-left: 4px; }
.mo-activity-strip .empty { color: var(--text-subtle); font-style: italic; }
.mo-activity-strip .view-all {
  flex: none; margin-left: auto; font-size: 11px; color: var(--primary);
  cursor: pointer; border: 0; background: transparent; font-family: inherit;
}
.mo-activity-strip .view-all:hover { text-decoration: underline; }

/* Bottom Row: Execution + Contributors side-by-side on desktop */
.mo-bottom-row {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) 240px;
  gap: 14px;
  align-items: start;
}
@media (min-width: 1440px) {
  .mo-bottom-row { grid-template-columns: minmax(0, 1.65fr) 260px; }
}
@media (max-width: 1279px) {
  .mo-bottom-row { grid-template-columns: 1fr; }
}

/* Contributors sidebar variant (narrow) */
.mo-contrib-side {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  position: sticky;
  top: 12px;
}
.mo-contrib-side .mo-contrib-head {
  font-size: 12px; font-weight: 700; color: var(--text);
  display: flex; align-items: center; gap: 6px; margin-bottom: 10px;
}
.mo-contrib-side .mo-contrib-row {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 0; border-top: 1px solid var(--border);
}
.mo-contrib-side .mo-contrib-row:first-of-type { border-top: 0; }
.mo-contrib-side .mo-contrib-row .av { width: 26px; height: 26px; border-radius: 50%; flex: none; }
.mo-contrib-side .mo-contrib-row .name {
  flex: 1; min-width: 0;
  font-size: 12.5px; font-weight: 500; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mo-contrib-side .mo-contrib-row .cnt {
  font-size: 11px; color: var(--text-muted); flex: none;
}
```

---

## 4. AI Risk Insight — 하이브리드 3상태 컴포넌트 스펙

> dev-spec `milestone-ai-risk-insight.md` §6 기준 상태를 **시각/상호작용 레벨**에서 확정.

### 4-1. 컨테이너 구조 (공통)

```
┌─ .mo-risk-card (background + border는 상태에 따라 전환) ──────────┐
│ [head]  [icon] Title         [meta: last analyzed · Refresh]      │
│ ────────────────────────────────────────────────────────          │
│ [body]  상태별 콘텐츠                                                │
│                                                                   │
│ [footer]  CTA or error banner                                     │
└───────────────────────────────────────────────────────────────────┘
```

컨테이너 클래스: `.mo-risk-card` (Hero Row 1fr 기둥). 3상태는 modifier 클래스로 구분:

| 상태 | modifier | 배경 | 보더 | 아이콘 |
|-----|----------|------|------|--------|
| rule-based (기본) | `.mo-risk-card.signal` | `#fff` | `1px solid var(--border)` | `ri-pulse-line` (color inherits risk level) |
| loading | `.mo-risk-card.loading` | `#fff` | `1px solid var(--border)` | spinner (`ri-loader-4-line`, rotating) |
| ai-success | `.mo-risk-card.ai` | `linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%)` | `1px solid #ddd6fe` | `ri-sparkling-2-line` (violet) |
| ai-error (fallback) | `.mo-risk-card.signal` + `<div class="mo-ai-error-banner">` | 기본 + 하단 경고 | | |

CSS:
```css
.mo-risk-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  min-height: 320px;           /* Hero chart 카드와 높이 매칭 */
  transition: background 0.25s ease, border-color 0.25s ease;
}
.mo-risk-card.ai {
  background: linear-gradient(180deg, #f5f3ff 0%, #eef2ff 100%);
  border-color: #ddd6fe;
}
.mo-risk-card .mo-risk-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--text-muted);
  margin-bottom: 6px;
}
.mo-risk-card.ai .mo-risk-head { color: var(--violet); }
.mo-risk-card .mo-risk-head i { font-size: 13px; }
.mo-risk-card .mo-risk-meta {
  margin-left: auto; font-weight: 500; text-transform: none;
  letter-spacing: 0; font-size: 10.5px; color: var(--text-subtle);
  display: inline-flex; align-items: center; gap: 8px;
}
.mo-risk-card .mo-risk-meta .refresh {
  color: var(--primary); cursor: pointer; border: 0; background: transparent;
  font-family: inherit; font-size: 10.5px; display: inline-flex;
  align-items: center; gap: 3px;
}
.mo-risk-card .mo-risk-meta .refresh:hover { text-decoration: underline; }
.mo-risk-card .mo-risk-meta .refresh.loading i { animation: mo-spin 0.8s linear infinite; }
.mo-risk-card .mo-risk-body {
  flex: 1; min-height: 0; overflow: auto;
  display: flex; flex-direction: column; gap: 6px;
  padding-top: 6px; border-top: 1px solid var(--border);
}
.mo-risk-card.ai .mo-risk-body { border-top-color: #ede9fe; }
.mo-risk-card .mo-risk-footer {
  padding-top: 10px;
  display: flex; align-items: center; gap: 8px;
}
```

### 4-2. 상태 A — **Risk Signal (rule-based, 기본)**

```
┌─ .mo-risk-card.signal ──────────────────────────────────────┐
│ [ri-pulse-line] RISK SIGNAL                                 │
│ ──────────────────────────────────────────────────          │
│ ● At Risk                                                   │
│ • You're behind the ideal burndown. Consider increasing…    │
│ • 8 failing TCs are slowing the burn. Prioritise…           │
│ • Top fail tag: #auth (5 fails). Investigate this area.    │
│                                                             │
│ ──────────────────────────────────────────────────          │
│ [✦ Analyze with AI →]   (button — primary variant)          │
└─────────────────────────────────────────────────────────────┘
```

**Risk Level pill** (body 첫 줄):

| riskLevel | 라벨 | CSS |
|-----------|------|-----|
| `critical` | "⚠ Critical" | `color: var(--danger-600); font-weight: 600;` (아이콘 `ri-error-warning-fill`) |
| `at_risk`  | "● At Risk" | `color: var(--warning); font-weight: 600;` (아이콘 dot span) |
| `on_track` | "✓ On track" | `color: var(--success-600); font-weight: 600;` (아이콘 `ri-check-line`) |

**Bullets**: 각 줄 `.mo-risk-bullet` — `font-size: 12px; line-height: 1.5; color: var(--text); padding: 3px 0;`. 최대 3-4줄.

**CTA 버튼** (`.mo-risk-ai-cta`):
```css
.mo-risk-ai-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px; border-radius: 8px;
  background: linear-gradient(135deg, var(--violet) 0%, var(--primary) 100%);
  color: #fff; font-size: 12px; font-weight: 600;
  border: 0; cursor: pointer; width: 100%;
  box-shadow: 0 1px 2px rgba(124, 58, 237, 0.15);
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.mo-risk-ai-cta:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25);
}
.mo-risk-ai-cta:active:not(:disabled) { transform: translateY(0); }
.mo-risk-ai-cta:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
.mo-risk-ai-cta:disabled {
  background: var(--bg-subtle); color: var(--text-subtle); cursor: not-allowed;
  box-shadow: none;
}
.mo-risk-ai-cta i { font-size: 14px; }
```

- **이유**: Violet→Indigo 그라데이션 + 약한 glow로 "AI action"임을 미학적으로 강조. Testably의 기존 primary/violet 토큰만 사용.
- 아이콘: `ri-sparkling-2-line` (14px) + 레이블 "Analyze with AI" + 우측 `→` (→는 유니코드 HTML, 아이콘 별도 없음).

### 4-3. 상태 B — **Loading**

```
┌─ .mo-risk-card.loading ─────────────────────────────────────┐
│ [spinner] RISK SIGNAL                                       │
│ ──────────────────────────────────────────────────          │
│ ● At Risk              ← rule-based bullets DIM 처리          │
│ • …                    ← opacity: 0.5                       │
│ • …                                                         │
│                                                             │
│ ──────────────────────────────────────────────────          │
│ [spinner] Analyzing with Claude…                            │
│  (minimum 500ms — Dev Spec AC-3)                            │
└─────────────────────────────────────────────────────────────┘
```

- **body는 rule-based 그대로 유지하되 `opacity: 0.5`로 dim** (완전 스켈레톤 대신 — rule-based 가치 유지 & 플리커 감소).
- footer의 CTA 버튼은 spinner + "Analyzing with Claude…" 레이블로 교체. `disabled` 상태.
- body 영역 좌측 상단에 **violet tint border glow** (카드 전체가 "곧 AI 상태로 전환됨"을 예고):
  ```css
  .mo-risk-card.loading {
    border-color: #c7d2fe;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08);
  }
  .mo-risk-card.loading .mo-risk-bullet { opacity: 0.5; }
  ```
- 스피너 CSS (기존 `@keyframes mo-spin` 재활용):
  ```css
  .mo-risk-ai-cta.loading {
    background: var(--bg-subtle); color: var(--text-muted); cursor: wait;
    box-shadow: none;
  }
  .mo-risk-ai-cta.loading i { animation: mo-spin 0.8s linear infinite; }
  ```

### 4-4. 상태 C — **AI Risk Analysis (success)**

```
┌─ .mo-risk-card.ai ──────────────────────────────────────────┐
│ [✦] AI RISK ANALYSIS     Last analyzed 2h ago · [⟳ Refresh] │
│ ───────────────────────────────────────────────             │
│ ● At Risk       [conf 72%]    [Low confidence] ← if <40     │
│                                                             │
│ SUMMARY                                                     │
│ Milestone is at risk due to 8 failing TCs concentrated in   │
│ the login flow tag.                                         │
│                                                             │
│ OBSERVATIONS                                                │
│ • Pass rate dropped from 82% to 67% over 7 days.           │
│ • Top fail tag #auth has 5 unresolved failures.            │
│ • Velocity avg 4.2 TCs/day — needs 6.8/day.                │
│ • 2 sub-milestones flagged past_due (M-12, M-17).          │
│                                                             │
│ RECOMMENDATIONS                                             │
│ ① Prioritise fixing 3 critical auth TCs: TC-105, …         │
│ ② Consider extending target date by 3 days…                │
│ ③ Assign a second tester to the auth flow…                 │
└─────────────────────────────────────────────────────────────┘
```

**Header right slot (`.mo-risk-meta`):**
- `Last analyzed Xm ago` 텍스트
- 우측 `⟳ Refresh` 버튼 (Owner/Admin/Manager만 렌더)
- Tester/Viewer: Refresh 버튼 `display: none`, `Last analyzed Xm ago`만 표시

**Risk Level + Confidence row** (body 최상단):
```html
<div class="mo-risk-level-row">
  <span class="risk-pill at_risk">● At Risk</span>
  <span class="conf-chip">72%</span>
  <span class="conf-low-warn" title="Refresh after more runs">Low confidence</span>
</div>
```
CSS:
```css
.mo-risk-level-row {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  padding: 6px 0;
}
.mo-risk-level-row .risk-pill { font-size: 12px; font-weight: 600; }
.mo-risk-level-row .risk-pill.on_track { color: var(--success-600); }
.mo-risk-level-row .risk-pill.at_risk  { color: var(--warning); }
.mo-risk-level-row .risk-pill.critical { color: var(--danger-600); }
.mo-risk-level-row .conf-chip {
  font-size: 10.5px; font-weight: 600; color: var(--violet);
  background: #fff; border: 1px solid #ddd6fe;
  padding: 2px 7px; border-radius: 10px;
}
.mo-risk-level-row .conf-low-warn {
  font-size: 10px; font-weight: 600; color: var(--warning);
  background: var(--warning-50); border: 1px solid var(--warning-100);
  padding: 1px 6px; border-radius: 4px; cursor: help;
}
```

**Section headers** (`SUMMARY`, `OBSERVATIONS`, `RECOMMENDATIONS`):
```css
.mo-risk-section-head {
  font-size: 9.5px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.06em; color: var(--violet);
  margin: 10px 0 4px;
}
.mo-risk-summary { font-size: 12px; line-height: 1.55; color: var(--text); }
.mo-risk-observation { font-size: 12px; line-height: 1.5; color: var(--text); padding: 2px 0; }
.mo-risk-observation::before { content: "• "; color: var(--violet); font-weight: 700; }
.mo-risk-recommendation {
  font-size: 12px; line-height: 1.5; color: var(--text); padding: 4px 0;
  border-top: 1px solid #ede9fe; display: grid; grid-template-columns: 20px 1fr; gap: 6px;
}
.mo-risk-recommendation:first-of-type { border-top: 0; }
.mo-risk-recommendation .num {
  font-size: 11px; font-weight: 700; color: var(--violet);
  background: #fff; border: 1px solid #ddd6fe; border-radius: 4px;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;
}
```

**내용 overflow**: body는 `overflow: auto; max-height: 380px` — bullets/recommendations 많을 때 내부 스크롤. 카드 자체 높이는 고정 (320–420px Hero와 정렬).

**"AI 생성" 마이크로 인터랙션 (과하지 않게):**
- 헤더의 sparkle 아이콘(`ri-sparkling-2-line`)에 **2초마다 한 번 0.6초 opacity 펄스** (0.6 → 1.0):
  ```css
  @keyframes mo-ai-sparkle {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.55; }
  }
  .mo-risk-card.ai .mo-risk-head i {
    animation: mo-ai-sparkle 2.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    .mo-risk-card.ai .mo-risk-head i { animation: none; }
  }
  ```
- 카드 전환 시 한 번만 한 **violet glow 펄스** (아래 §4-6 전환 애니메이션 참조).

### 4-5. 상태 D — **에러 fallback**

rule-based body 유지 + `.mo-ai-error-banner`를 footer 위에 삽입:

```
┌─ .mo-risk-card.signal ──────────────────────────────────────┐
│ [ri-pulse-line] RISK SIGNAL                                 │
│ ────────────────────────────────────────                    │
│ ● At Risk                                                   │
│ • …                                                         │
│ • …                                                         │
│                                                             │
│ ┌─ .mo-ai-error-banner ──────────────────────────────────┐ │
│ │ ⚠ AI analysis timed out.  [Retry →]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [✦ Analyze with AI →]   (enabled, retry)                    │
└─────────────────────────────────────────────────────────────┘
```

CSS:
```css
.mo-ai-error-banner {
  background: var(--danger-50);
  border: 1px solid var(--danger-100);
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 11.5px;
  color: var(--danger-600);
  display: flex; align-items: center; gap: 6px;
  margin: 8px 0 0;
}
.mo-ai-error-banner i { font-size: 13px; }
.mo-ai-error-banner .retry-link {
  margin-left: auto; color: var(--danger-600); font-weight: 600;
  cursor: pointer; border: 0; background: transparent; font-family: inherit;
  font-size: 11.5px;
}
.mo-ai-error-banner .retry-link:hover { text-decoration: underline; }
```

### 4-6. 전환 애니메이션 결정

| 전환 | 방식 | 지속 | 근거 |
|------|------|------|------|
| signal → loading | **instant** (CSS transition만 — border-color 0.25s) | 0ms 블록 상태, CSS만 | 버튼 클릭 반응성 최우선 |
| loading → ai-success | **Crossfade + violet glow pulse** — body는 `opacity: 0 → 1` 200ms, 카드 전체에 `box-shadow 0 0 0 6px rgba(124,58,237,0.15) → 0`의 1회 펄스 (600ms) | 600ms | "뭔가 바뀌었다"는 시각 피드백, 단 한 번만 |
| loading → error fallback | **instant** (body는 rule-based로 복귀, error banner는 `opacity 0 → 1` 200ms) | 200ms | 에러는 즉시 인지 우선 |
| ai-success → loading (Refresh) | body `opacity: 1 → 0.5` 150ms dim, header meta `⟳` 회전 시작 | 150ms | 기존 콘텐츠가 보존되는 느낌 |

CSS:
```css
.mo-risk-card .mo-risk-body { transition: opacity 0.2s ease; }
.mo-risk-card.just-became-ai {
  animation: mo-ai-glow-once 0.6s ease-out 1;
}
@keyframes mo-ai-glow-once {
  0%   { box-shadow: 0 0 0 6px rgba(124, 58, 237, 0.18); }
  100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); }
}
@media (prefers-reduced-motion: reduce) {
  .mo-risk-card.just-became-ai { animation: none; }
  .mo-risk-card .mo-risk-body { transition: none; }
}
```

> `just-became-ai`는 loading → ai-success 전환 직후 600ms만 붙였다가 JS에서 setTimeout으로 제거. 재방문 캐시 hit 시(버튼 클릭 없음)에는 **부착하지 않음**.

---

## 5. 권한별 & 플랜별 CTA 상태 매트릭스

dev-spec §4-3/§4-4 대응. AI CTA 버튼 렌더 로직을 **디자인 측면**에서 고정.

| 역할 | 플랜 | TC 0개 | 월 크레딧 남음 | 렌더 상태 | 인터랙션 |
|------|------|--------|---------------|---------|---------|
| Owner / Admin / Manager | Free (tier 1) | — | — | 버튼 **disabled** + 우측에 `[ Upgrade chip ]` | 버튼 hover 시 tooltip "Upgrade to Hobby to unlock AI analysis". Upgrade chip 클릭 시 `/settings/billing` |
| Owner / Admin / Manager | Hobby+ (tier ≥ 2) | TC 0개 | — | 버튼 **disabled** | hover tooltip "Add test cases first to enable AI analysis." |
| Owner / Admin / Manager | Hobby+ | TC 있음 | 한도 남음 | 버튼 **enabled** (그라데이션) | 클릭 → Loading → AI 성공 |
| Owner / Admin / Manager | Hobby+ | TC 있음 | **0 남음** | 버튼 자리에 **배너** (`.mo-ai-quota-banner`) | 클릭 없음 |
| Tester / Viewer | any | any | any | 버튼 **hidden**. 대신 빈 영역에 회색 텍스트 `Ask your admin to run AI analysis.` (AI 캐시 없을 때) | 없음 |

**Upgrade chip CSS:**
```css
.mo-risk-ai-cta-wrap { display: flex; align-items: center; gap: 8px; width: 100%; }
.mo-risk-upgrade-chip {
  padding: 4px 8px; border-radius: 4px;
  background: var(--warning-50); color: var(--warning);
  font-size: 10.5px; font-weight: 600; border: 1px solid var(--warning-100);
  cursor: pointer; text-decoration: none; flex: none;
}
.mo-risk-upgrade-chip:hover { background: var(--warning-100); }
```

**Quota exhausted 배너:**
```css
.mo-ai-quota-banner {
  background: linear-gradient(135deg, var(--warning-50) 0%, #fff7ed 100%);
  border: 1px solid var(--warning-100);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 11.5px;
  color: var(--text);
  display: flex; align-items: center; gap: 8px; width: 100%;
}
.mo-ai-quota-banner i { color: var(--warning); font-size: 14px; }
.mo-ai-quota-banner .upgrade-cta {
  margin-left: auto; color: var(--primary); font-weight: 600;
  cursor: pointer; text-decoration: none; font-size: 11.5px;
}
.mo-ai-quota-banner .upgrade-cta:hover { text-decoration: underline; }
```

**Viewer/Tester message** (AI 캐시 없을 때):
```css
.mo-risk-viewer-msg {
  padding: 10px 0 0; font-size: 11.5px; color: var(--text-subtle);
  font-style: italic; display: flex; align-items: center; gap: 6px;
}
.mo-risk-viewer-msg i { color: var(--text-subtle); }
```

---

## 6. 인터랙션 (호버 / 클릭 / 포커스 / 키보드)

| 엘리먼트 | 트리거 | 반응 |
|---------|--------|------|
| `.mo-risk-ai-cta` (Analyze with AI) | hover | translateY(-1px), violet glow shadow. Free tier는 cursor: not-allowed. |
| `.mo-risk-ai-cta` | click | 즉시 Loading 상태로 전환. Sonner 토스트 없음(카드 내부에서 피드백 완결). |
| `.mo-risk-ai-cta:focus-visible` | Tab 포커스 | 2px indigo outline, offset 2px |
| `.mo-risk-meta .refresh` | click | Refresh 호출. 회전 아이콘. 성공 시 Sonner toast "Analysis refreshed" (success, 2s). 실패 시 error toast + error banner 인라인. |
| `.mo-risk-meta .refresh` | hover | underline |
| 카드 전체 | hover | 변화 없음 (rule-based / AI 카드는 읽기 대상, 클릭 타겟 아님) |
| `.mo-ai-error-banner .retry-link` | click | 동일하게 mutate 재호출 + error banner 제거 |
| `.mo-risk-upgrade-chip` | click | `navigate('/settings/billing')` |
| `.mo-activity-strip .view-all` | click | `onGoActivity()` (Activity 탭 전환) |
| `.mo-activity-strip .ev` | hover | background: `var(--bg-muted)` (옵션 — 클릭 대상 아님, 단순 친절) |
| Intel Strip cards (FailedBlocked etc.) | hover | 변화 없음 (기존 v1 동작 유지) |
| Intel Strip "View all in Issues →" | click | Issues 탭으로 이동 (v1 동일) |

**키보드:**
- Tab 순서: Chart range tabs → KPI strip(non-focusable) → AI CTA / Refresh → Intel Strip 링크들 → Activity view-all → Execution rows.
- `Enter`/`Space` on `.mo-risk-ai-cta` → 클릭과 동일.
- `Esc`는 모달 없음 → no-op.
- `Cmd+K` 명령 팔레트에 `Analyze milestone with AI` 항목 추가(선택) — Out of Scope로 남기고 현 스펙엔 미포함.

**Sonner 토스트 중복 억제 (dev-spec AC-6):** 최근 10초 내 동일 `error.code` 토스트 1회만. `toast.error(msg, { id: \`ai-risk-\${code}\` })`로 id dedupe.

---

## 7. 접근성 (A11y)

| 항목 | 처리 |
|------|------|
| 카드 전체 | `<article role="region" aria-label="Milestone risk analysis">` |
| 상태 변경 | body 영역에 `aria-live="polite"` — rule-based→AI 전환 시 스크린리더 읽어줌 |
| CTA 버튼 | `<button aria-label="Analyze milestone risk with AI">` + disabled 시 `aria-disabled="true"` |
| CTA 버튼 disabled 사유 | `aria-describedby="ai-cta-disabled-reason"` + hidden `<span id="ai-cta-disabled-reason">Upgrade to Hobby to unlock AI analysis</span>` |
| Refresh 버튼 | `<button aria-label="Refresh AI analysis">` |
| Loading 상태 | Sparkle icon에 `aria-hidden="true"`. body에 `aria-busy="true"` |
| Confidence chip | `<span role="status" aria-label="Analysis confidence 72%">72%</span>` |
| Low confidence warn | `<span role="note">Low confidence — consider refreshing after more runs.</span>` |
| 에러 banner | `<div role="alert">` (강제 announce) |
| Color contrast | violet(`#7c3aed`) on `#f5f3ff` = 5.8:1 (AA pass), violet on `#fff` = 8.5:1. danger(`#dc2626`) on `#fef2f2` = 6.1:1. 모든 라벨은 4.5:1 이상 |
| 아이콘-only 버튼 금지 | CTA / Refresh 모두 텍스트 레이블 동반 |
| Focus visible | 모든 interactive에 `:focus-visible` 2px outline |
| Motion | `prefers-reduced-motion` → sparkle pulse & glow 비활성 (§4-4, 4-6) |

---

## 8. 다크모드

> **앱 내부(`src/index.css`)는 다크모드를 지원하지 않음** (Grep으로 `prefers-color-scheme` / `.dark` / `data-theme` 전부 미검출 확인).
>
> 따라서 **이번 스펙에서도 다크모드는 out of scope**. UI_GUIDE.md의 slate-900 palette는 마케팅/랜딩 전용 — 본 앱 스코프에 적용하지 않음.
>
> 추후 앱 전역 다크모드가 도입되면 별도 리디자인 티켓으로 진행 (`.mo-risk-card.ai`의 violet 그라데이션, `.mo-activity-strip`의 화이트 카드 배경이 우선 대상).

---

## 9. 재사용 vs 신규 컴포넌트

### 9-1. 100% 재사용 (수정 없음)

| 컴포넌트 / CSS | 위치 | 용도 |
|---------------|------|------|
| `<BurndownChart />` | `src/pages/milestone-detail/BurndownChart.tsx` | Hero Row 좌측 |
| `<KpiStrip />` | `src/pages/milestone-detail/KpiStrip.tsx` | 차트 하단 KPI |
| `<FailedBlockedCard />` | 동 | Intel Strip col 1 |
| `<VelocitySparkline />` | 동 | Intel Strip col 2 |
| `<TopFailTagsCard />` | 동 | Intel Strip col 3 (tname max-width만 CSS로 축소) |
| `<EtaCard />` | 동 | Intel Strip col 4 |
| `<ExecutionSections />` | 동 | Bottom Row 좌측 |
| `.mo-chart-*`, `.mo-kpi*`, `.mo-bl-row*`, `.mo-spark*`, `.mo-tag-row*`, `.mo-eta-*`, `.mo-sec-*`, `.mo-empty`, `.mo-skeleton-row`, `.mo-feed*` | `src/index.css` | 전부 그대로 |
| `@keyframes mo-spin`, `@keyframes mo-shimmer` | `src/index.css` | Spinner / skeleton |

### 9-2. 수정

| 파일 | 변경 |
|------|------|
| `src/pages/milestone-detail/OverviewTab.tsx` | 루트 레이아웃을 `.mo-overview-row`(구) → `.mo-hero-row` + `.mo-intel-strip` + `<Activity24hFeedStrip />` + `.mo-bottom-row`로 재조립. `<AiRiskInsight />` import를 `<RiskInsightContainer />`로 교체. `<ContributorsCard />`를 Bottom Row 우측 슬롯(또는 1024px 이하 아래)으로 이동. |
| `src/pages/milestone-detail/Activity24hFeed.tsx` | **새 variant 추가** — 기존 `.mo-panel span-2` 카드 모드는 유지하되, `variant="strip"` prop이 있으면 `.mo-activity-strip` 가로형 단일 행으로 렌더. (Execution 위 strip 전용) |
| `src/pages/milestone-detail/ContributorsCard.tsx` | 루트 스타일을 `.mo-contrib-side`로 전환 (기존 inline style → className). desktop sidebar 형태로 축소 (avatar 26px, 컴팩트 row). 기존 계약 유지. |
| `src/index.css` | §3-1 표 대로 기존 `.mo-overview-row` 재정의, `.mo-intel-col` 삭제, `.mo-ai-insight*` 삭제. §3-2 신규 블록 append. §4 `.mo-risk-*` 블록 신규 추가. |

### 9-3. 신규 생성

| 파일 | 역할 |
|------|------|
| `src/pages/milestone-detail/RiskInsightContainer.tsx` | 3상태(state machine) 관리. props: milestone, tcStats, failedBlockedTcs, topFailTags, riskLevel(rule), role, tier, aiCache(from milestone.ai_risk_cache), canAnalyze, onQueryInvalidate. 내부에서 `useMilestoneAiRisk` 훅 호출. |
| `src/pages/milestone-detail/RiskSignalCard.tsx` | rule-based 카드 (v1 `AiRiskInsight.tsx`의 bullets 로직 이관). children으로 CTA 슬롯. |
| `src/pages/milestone-detail/AiRiskAnalysisCard.tsx` | AI 성공 카드. props: `aiData`, `generatedAt`, `canRefresh`, `onRefresh`, `isRefreshing`. |
| `src/pages/milestone-detail/useMilestoneAiRisk.ts` | TanStack `useMutation` + 현재 상태 파생(`'signal' | 'loading' | 'ai' | 'error'`). dev-spec §6 호출 스펙 준수. |
| (CSS 블록 — 별도 파일 아님) `.mo-risk-card*`, `.mo-activity-strip`, `.mo-hero-row`, `.mo-intel-strip`, `.mo-bottom-row`, `.mo-contrib-side`, `.mo-ai-error-banner`, `.mo-ai-quota-banner` | `src/index.css` |

### 9-4. 삭제

| 파일 | 사유 |
|------|------|
| `src/pages/milestone-detail/AiRiskInsight.tsx` | dev-spec §7 "삭제". 기능은 `RiskSignalCard` + `AiRiskAnalysisCard`로 분리됨 |
| `.mo-ai-insight*` CSS (index.css 558–564 근처) | 위와 동일 사유. 교체될 `.mo-risk-card*`가 대체 |
| `.mo-intel-col` CSS | 레이아웃 전환으로 불필요 |

---

## 10. 상태별 UI 전수 정의

| 시나리오 | Hero 좌측 (Chart) | Hero 우측 (Risk Insight) | Intel Strip | Activity Strip | Bottom |
|---------|-------------------|-------------------------|-------------|----------------|--------|
| **정상 + AI 캐시 있음 (재방문, 24h 내)** | Chart 정상 | `.ai` state, Last analyzed Xm ago + Refresh (권한시) | 4 cards normal | 4 events | Execution + Contributors |
| **정상 + AI 캐시 없음 (최초 진입)** | Chart 정상 | `.signal` state, Analyze with AI 버튼 | 4 cards normal | 4 events | 동일 |
| **Runs 없음 (TC 0개 or 실행 0건)** | Empty: "Start running tests to see burndown" | `.signal` state bullets = "Keep running tests to build risk signal.", CTA disabled + "Add test cases first" | 모든 카드 empty state (각 카드의 기존 empty 문구 사용) | "No activity in the last 24 hours" | Execution empty state (v1 AC-C11 준수) |
| **Free tier** | Chart 정상 | `.signal` state, CTA disabled + Upgrade chip | 정상 | 정상 | 정상 |
| **월 크레딧 소진 (Hobby+)** | Chart 정상 | `.signal` state, CTA 자리에 `.mo-ai-quota-banner` | 정상 | 정상 | 정상 |
| **Tester/Viewer** | Chart 정상 | `.signal` state (캐시 없으면) / `.ai` state (캐시 있으면). Refresh 버튼 hidden. CTA hidden + viewer-msg | 정상 | 정상 | 정상 |
| **Loading (Analyze click 후)** | Chart 정상 | `.loading` state, body dim, "Analyzing with Claude…" + spinner (≥500ms) | 정상 | 정상 | 정상 |
| **Error — timeout** | Chart 정상 | `.signal` state + `.mo-ai-error-banner` "AI analysis timed out. Retry →" | 정상 | 정상 | 정상 |
| **Error — rate limit 429** | 정상 | `.signal` + banner "Claude is rate-limited. Try again in 60 seconds." (retry 버튼 60초간 disabled) | 정상 | 정상 | 정상 |
| **Error — parse failed 422** | 정상 | `.signal` + banner "AI returned unexpected format. Try again." | 정상 | 정상 | 정상 |
| **Error — network** | 정상 | `.signal` + banner "Network error. Retry →" | 정상 | 정상 | 정상 |
| **Low confidence (<40%)** | 정상 | `.ai` state, conf-chip 옆에 "Low confidence" 경고 chip | 정상 | 정상 | 정상 |
| **Overview extra loading (TanStack 첫 페치)** | Chart 렌더 (tcStats는 이미 있음) | `.signal` state (권한/plan 체크는 동기) | 4 cards Skeleton (`.mo-skeleton-row` 재활용) | 로딩 중에는 strip empty state로 | Execution은 기존 loading 처리 |

---

## 11. 토스트 메시지 (Sonner)

| 이벤트 | EN | KO | Type | id (dedup) |
|--------|----|----|------|-----------|
| AI analysis 성공 (최초 + Refresh) | "AI analysis ready" | "AI 분석 완료" | success | `ai-risk-success` |
| Refresh 성공 | "Analysis refreshed" | "분석이 새로고침되었습니다" | success | `ai-risk-refreshed` |
| Error — timeout | "AI analysis timed out." | "AI 분석 시간이 초과되었습니다." | error | `ai-risk-timeout` |
| Error — rate limit | "Claude is rate-limited. Try again in {sec}s." | "Claude 속도 제한. {sec}초 뒤 다시 시도하세요." | error | `ai-risk-rate` |
| Error — monthly quota | "Monthly AI credits exhausted." | "월 AI 크레딧이 소진되었습니다." | error | `ai-risk-quota` |
| Error — parse | "AI returned unexpected format." | "AI 응답 형식 오류입니다." | error | `ai-risk-parse` |
| Error — network | "Network error while analyzing." | "네트워크 오류가 발생했습니다." | error | `ai-risk-network` |
| Free tier 클릭 (disabled 우회 시) | "Upgrade to Hobby to unlock AI analysis." | "AI 분석은 Hobby 이상에서 이용 가능합니다." | info | `ai-risk-upgrade` |
| TC 0 state 클릭 | "Add test cases first to enable AI analysis." | "AI 분석을 사용하려면 먼저 테스트 케이스를 추가하세요." | info | `ai-risk-no-tcs` |

> 카드 내부 error banner가 1차 피드백 → 토스트는 보조. 동일 `id` 중복 억제로 플리커 방지.

---

## 12. i18n 키 (en / ko)

`src/i18n/local/en/milestones.ts` / `ko/milestones.ts` 에 추가 (dev-spec §10 키를 기본 상속하되, 이 스펙에서 **추가 확정**한 것만 열거):

| 키 | EN | KO |
|----|----|----|
| `milestones.overview.activityStrip.label` | "Last 24h" | "최근 24시간" |
| `milestones.overview.activityStrip.empty` | "No activity in the last 24 hours" | "최근 24시간 활동 없음" |
| `milestones.overview.activityStrip.viewAll` | "View all →" | "전체 보기 →" |
| `milestones.overview.contributorsSide.title` | "Contributors — Top 5" | "기여자 — Top 5" |
| `milestones.overview.contributorsSide.empty` | "No contributors yet" | "기여자 없음" |
| `milestones.aiRisk.sectionSummary` | "Summary" | "요약" |
| `milestones.aiRisk.sectionObservations` | "Observations" | "관찰" |
| `milestones.aiRisk.sectionRecommendations` | "Recommendations" | "권장 조치" |
| `milestones.aiRisk.ctaAnalyzeDisabledTcZero` | "Add test cases first to enable AI analysis" | "AI 분석을 사용하려면 먼저 테스트 케이스를 추가하세요" |
| `milestones.aiRisk.ctaAnalyzeDisabledFree` | "Upgrade to Hobby to unlock AI analysis" | "AI 분석을 사용하려면 Hobby 플랜으로 업그레이드하세요" |
| `milestones.aiRisk.upgradeChip` | "Upgrade" | "업그레이드" |
| `milestones.aiRisk.quotaBanner` | "Monthly AI credits exhausted ({used}/{limit})." | "월 AI 크레딧 소진 ({used}/{limit})" |
| `milestones.aiRisk.quotaBannerCta` | "Upgrade →" | "업그레이드 →" |
| `milestones.aiRisk.viewerMessage` | "Ask your admin to run AI analysis" | "관리자에게 AI 분석 실행을 요청하세요" |

> 나머지 AI Risk 관련 키(analyzeCta, analyzing, refreshCta, lastAnalyzed, confidence, lowConfidence, error.*, etc.)는 **dev-spec §10을 그대로 사용**.

---

## 13. 접근성 + 타이포 요약 (빠른 참조)

| 요소 | 크기 | weight | color | 비고 |
|------|------|--------|-------|------|
| `.mo-risk-head` | 10px | 600 | muted / violet (ai) | uppercase, 0.05em |
| `.mo-risk-meta` 텍스트 | 10.5px | 500 | text-subtle | |
| `.mo-risk-meta .refresh` | 10.5px | 500 | primary | |
| `.risk-pill` | 12px | 600 | level color | |
| `.conf-chip` | 10.5px | 600 | violet | pill |
| `.conf-low-warn` | 10px | 600 | warning | pill |
| `.mo-risk-section-head` | 9.5px | 700 | violet | uppercase, 0.06em |
| `.mo-risk-summary` | 12px | 400 | text | line-height 1.55 |
| `.mo-risk-observation`, `.mo-risk-recommendation` | 12px | 400 | text | line-height 1.5 |
| `.mo-risk-ai-cta` | 12px | 600 | #fff on gradient | |
| `.mo-activity-strip .ev` | 11.5px | 400 | text | 1 line, truncate |
| `.mo-activity-strip .ev .when` | 10.5px | 400 | subtle | |
| `.mo-contrib-side .mo-contrib-head` | 12px | 700 | text | |
| `.mo-contrib-side .mo-contrib-row .name` | 12.5px | 500 | text | truncate |

---

## 14. @developer 인수인계

### 14-1. 이 스펙에 없는 것 (dev-spec 우선)

- Edge Function 로직, 캐시 TTL, 프롬프트, RLS, credit 차감 등 **백엔드는 전부 dev-spec 참조**. 이 문서는 오직 **레이아웃 + 카드 UX**.

### 14-2. 재활용 우선 지침 (중복 생성 방지)

| 유혹 | 대신 이걸 써라 |
|------|-------------|
| "AI 카드 전용 스피너를 새로 만들까?" | `@keyframes mo-spin` + 기존 `ri-loader-4-line`을 그대로 회전. 새 키프레임 추가 금지. |
| "Violet glow 만들려고 shadow 토큰 추가해야겠다" | `rgba(124, 58, 237, 0.*)` 인라인 rgba만 사용 — 새 `--shadow-ai` 토큰 만들지 말 것 |
| "Loading bullets skeleton 그려야지" | **그리지 말 것.** rule-based bullets에 `opacity: 0.5`만 적용 (§4-3). 플리커 + 인지 부하 줄임. |
| "Contributors 사이드바 전용 Avatar 컴포넌트 필요" | 기존 `<ContributorsCard>` 내부 avatar 로직(`profile.url` 분기 + initials fallback)을 그대로 활용. className만 `.mo-contrib-side` 로 감쌀 것. |
| "24h activity strip용 Feed 컴포넌트 새로 제작" | `<Activity24hFeed variant="strip" />` 로 기존 컴포넌트 확장 (§9-2). 새 파일 금지. |
| "`AiRiskInsight.tsx` 그대로 남겨두고 신규 파일만 추가" | **NO** — dev-spec §7에서 명시 삭제. 충돌/혼란 방지 위해 삭제 후 `RiskSignalCard` / `AiRiskAnalysisCard` 2개로 분리. |

### 14-3. 주의할 함정 (반드시 확인)

1. **TanStack Query 캐시 키 — milestone-detail invalidation 범위**
   - `useMilestoneAiRisk`의 onSuccess에서 `queryClient.invalidateQueries({ queryKey: ['milestone-detail', milestoneId] })` 호출 시 **milestone 전체 refetch가 트리거됨** (runs, sessions, activity 등 재로드). 이게 의도대로지만, 렌더 과정에서 Overview가 한 번 flicker할 수 있음.
   - **대안**: `setQueryData(['milestone-detail', milestoneId], (old) => ({ ...old, milestone: { ...old.milestone, ai_risk_cache: newData } }))` 로 **부분 업데이트**만 하면 flicker 제거. 권장.
   - 동시에 `milestone-overview-extra` 쿼리는 건드리지 말 것 (runs/plans와 무관).

2. **권한 분기 — `can('trigger_ai_analysis')` 신규 추가**
   - dev-spec §4-3에서 `PERMISSION_LEVEL.trigger_ai_analysis = 4` (manager+) 추가 예정. 반드시 기존 `PERMISSION_LEVEL` 객체(`src/hooks/usePermission.ts:6-20`)에 추가.
   - Tester(level 3)는 rule-based + AI 캐시 **조회**만 가능 — 버튼 hidden 처리 시 단순 `v-if`가 아니라 `role !== null && can('trigger_ai_analysis')` 체크 후 렌더. role 로딩 중(`loading === true`)에는 **버튼 자리에 skeleton 또는 공간만 예약** (갑자기 나타났다 사라지는 플리커 방지).

3. **플랜 제한 UI — 서버 응답 우선**
   - Free tier 분기는 프론트에서 `useAiFeature('milestone_risk').isLocked`로 먼저 걸러도, **진짜 quota 체크는 Edge Function이 함**. 프론트가 `canAnalyze=true`로 판단해 클릭 → 서버가 429 `monthly_limit_reached` 반환 가능. 이 경우 loading → error banner → rule-based 복귀 흐름을 **반드시 탈 것** (아예 버튼을 loading 중에 숨기지 말 것, 에러 후 retry 경로 확보).

4. **캐시 TTL 24h — stale 판정**
   - `milestone.ai_risk_cache.generated_at`을 new Date로 파싱 후 `Date.now() - parsed > 24*3600*1000` → stale. stale이어도 **UI는 AI 카드 그대로 보여주되** `Last analyzed: 26h ago (stale)` 표기. Refresh 유도만 하고 자동 재호출 금지 (dev-spec BR-2 존중).

5. **Intel Strip Failed&Blocked의 "View all →" 링크**
   - Intel Strip이 좁아져서 헤더의 우측 링크가 카드 밖으로 잘릴 수 있음. `min-width: 0` + `.mo-panel-head .right { white-space: nowrap }` 확인. 1024px 이하에서는 2×2 그리드라 여유 있음.

6. **Bottom Row Contributors 반응형 전환**
   - 1279px 이하에서 Bottom Row가 단일 컬럼으로 바뀌므로 Contributors 카드가 Execution 아래로 내려감. 이때 `.mo-contrib-side`의 `position: sticky`는 **단일 컬럼에서는 제거** (media query로 reset):
     ```css
     @media (max-width: 1279px) { .mo-contrib-side { position: static; } }
     ```

7. **`just-became-ai` 글로우 — 이벤트 구분**
   - 최초 Analyze 클릭 성공시에만 붙이고, 페이지 재방문(캐시 hit)에는 붙이지 말 것. `useMutation.onSuccess`에서 className 추가 + setTimeout(600ms)로 제거. 캐시 hit은 `useQuery`로 들어오므로 onSuccess 경로가 다름 → 자연스럽게 구분됨.

8. **Activity Strip — event 수**
   - 1440px에서 4, 1280–1439에서 4, 1024–1279에서 3, 768–1023에서 2, <768에서 2. 결정 로직:
     ```ts
     const maxEvents = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : 2;
     ```
     또는 CSS `display: none` + `nth-child`로 처리 (viewport listener 없이). CSS 방식 권장.

9. **AI 결과 텍스트가 예상보다 길 때 — 카드 높이**
   - `.mo-risk-card`의 `min-height: 320px`와 body `max-height: 380px` + `overflow: auto`로 Hero Row 높이 고정. 차트 카드가 자연히 더 길어져도 flex-align start 적용해 상단 정렬 유지. 별도 패널 접힘 UI는 **이번 스코프 외**.

10. **TopFailTagsCard tname 축소 — 신규 variant 인가 부분 수정인가**
    - `.mo-tag-row .tname { max-width: 90px }`는 **Intel Strip 안에서만** 적용되어야 함. 단순 override 위해 `.mo-intel-strip .mo-tag-row .tname { max-width: 90px }`로 셀렉터 특이도 확보 (v1 규칙을 건드리지 말 것).

### 14-4. CSS 마이그레이션 전략 (기존 `.mo-*`와 공존)

1. **1단계 — additive**: §3-2의 신규 블록을 `src/index.css` 끝에 append (깨짐 없음).
2. **2단계 — OverviewTab.tsx 리팩토링**: 기존 JSX(`.mo-overview-row`, `.mo-intel-col`)를 새 구조로 교체. 이 시점까지는 구 CSS도 살아 있음.
3. **3단계 — cleanup**: `.mo-overview-row`를 새 Hero Row 정의로 **덮어쓰기** (기존 위치 유지, 값만 교체). `.mo-intel-col`, `.mo-ai-insight*` 전체 삭제. `AiRiskInsight.tsx` 삭제.
4. **검증**: 다른 페이지에서 이 클래스를 쓰는지 ripgrep (`rg '\.mo-overview-row\|\.mo-intel-col\|\.mo-ai-insight' src/`). Milestone Overview 외에서 쓰이는 곳 없음 확인 후 삭제.

### 14-5. Test manifest (Dev가 확인해야 할 수동 시나리오)

1. Fresh milestone, Manager 권한, Hobby plan → Hero Row 우측에 `Risk Signal` 카드 + Analyze CTA → 클릭 → 500ms 이상 loading → AI card 전환 (glow 1회) → Refresh 가능 확인.
2. 같은 milestone 2번째 방문 (24h 내) → 버튼 없이 AI card 바로 렌더, "Last analyzed Xh ago" 표시, glow 애니메이션 없음.
3. Free tier → CTA disabled + tooltip + upgrade chip 노출 → chip 클릭 시 `/settings/billing` 이동.
4. Tester 권한 + AI 캐시 있음 → AI card 렌더, Refresh 버튼 없음.
5. Tester 권한 + AI 캐시 없음 → Risk Signal 카드 + CTA 자리에 viewer message.
6. 월 quota 소진 (Hobby 7/7) → CTA 자리에 `.mo-ai-quota-banner`.
7. Edge Function timeout 시뮬 → error banner "AI analysis timed out" + Retry.
8. 클릭 후 재클릭 (같은 error 코드 10초 내) → Sonner toast 1회만 표시.
9. 1280px / 1024px / 768px / 375px 리사이즈 → §2 표대로 레이아웃 전환 확인.
10. `prefers-reduced-motion: reduce` OS 설정 → sparkle pulse / glow 비활성.
11. Keyboard-only 탐색 → Tab 순서 차트 → CTA → Refresh → Intel → Activity → Execution.
12. AI 결과 observations 7개 + recommendations 5개 (edge 케이스) → body 내부 스크롤 생기고 카드 외형 그대로 (Hero Row 높이 유지).

---

## 15. 디자인 개발 착수 전 체크리스트

- [x] 모든 상태 정의됨 — §10 (12 시나리오)
- [x] CSS 클래스 구체 명시됨 — §3, §4 (토큰 & 신규 블록)
- [x] 다크모드 — **out of scope** 명시 (§8) + 근거
- [x] 기존 컴포넌트 재사용 목록 — §9 (9-1, 9-2, 9-3, 9-4 구분)
- [x] 인터랙션 정의됨 — §6 (hover/click/focus/keyboard)
- [x] 반응형 브레이크포인트 — §2 (4 티어)
- [x] 토스트 메시지 en/ko — §11
- [x] i18n 키 en/ko — §12 (+ dev-spec §10 상속)
- [x] 개발지시서 수용 기준 일치
  - dev-spec-milestone-ai-risk-insight: AC-1 (리네임), AC-2 (CTA), AC-3 (loading 500ms), AC-4 (AI card), AC-5 (Last analyzed + Refresh), AC-6 (error fallback + retry), AC-8 (캐시 hit 자동 렌더), AC-10/11/12 (플랜 제한 UI), AC-13/14 (RBAC) 전부 UI 매핑 완료
  - dev-spec-milestone-overview-redesign: Intel 6카드 구조는 유지하되 배치만 변경 (AC-C4 실질 충족). AC-C6 Contributors는 사이드바로 이동.
- [x] 접근성 — §7 (ARIA + 대비 + focus + motion)
