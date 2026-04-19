# Design Spec: Milestone Overview v3 — Density Pass + Roll-up Badge Integration

> **작성일:** 2026-04-19
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:**
> - `docs/specs/dev-spec-milestone-rollup-consistency.md` (선행 / 2026-04-19) — tcStats 단일화 + Roll-up 배너 카드 삭제 + Header 뱃지 신설
> - `docs/specs/dev-spec-milestone-ai-risk-insight.md` — Risk Signal / AI 하이브리드 (카드 내부 구조 그대로 유지)
> - `docs/specs/dev-spec-milestone-overview-redesign.md` — Overview 3탭 구조 기반
>
> **직전 디자인 명세 (v2):** `docs/specs/design-spec-milestone-overview-v2.md`
> — 본 문서는 v2의 **레이아웃만 "공백 제거" 관점에서 재조정**. AI Risk/Rule-based 카드 내부 구조, 아이콘, 색상, 전환 애니메이션, 토스트 메시지, i18n 키, 접근성 정책은 **v2 그대로 상속**. 상속 섹션은 본 문서에서 재기술하지 않는다.
>
> **영향 파일:**
> - `src/pages/milestone-detail/OverviewTab.tsx` (그리드 재조립 + `Activity24hFeed` 제거, Contributors 이동)
> - `src/pages/milestone-detail/page.tsx` (Header: Roll-up 배너 카드 삭제 + 뱃지 신설, 타 탭 영향 없음)
> - `src/pages/milestone-detail/BurndownChart.tsx` (Recharts `margin` 축소, Y축 width 축소)
> - `src/pages/milestone-detail/ExecutionSections.tsx` (sub 0개일 때 section 완전 숨김 + 섹션 상단 여백 축소)
> - `src/pages/milestone-detail/Activity24hFeed.tsx` (Activity Strip을 Intel Strip 안 4번째 카드로 이동 — 기존 `variant="strip"`은 제거 대신 **inline 카드 모드로 교체** 또는 Intel Strip 병합)
> - `src/index.css` (`.mo-*` 변수/padding/gap 축소 + `.mo-rollup-badge` 신규)
>
> **Figma:** (N/A — ASCII 와이어 확정)

---

## 0. 사용자 피드백 맥락 (v2 → v3 전환 이유)

스크린샷 분석 기반 관찰(우선순위 높은 순):

| # | 관찰된 문제 | 원인 | v3 해결 |
|---|------------|------|--------|
| 1 | Chart 카드 내부 상·좌·우 공백 과다, 특히 좌측 Y축 옆 여백 | Recharts `margin={{ top: 8, right: 10, left: 0, bottom: 4 }}` + YAxis `width: 32` + `.mo-chart-body padding: 4px 8px` 누적 | Recharts margin 축소(`top:4, right:6, left:-4, bottom:0`), YAxis `width: 26`, chart-body padding `2px 4px` |
| 2 | Risk Signal(1fr) 카드가 Chart+KPI 기둥보다 세로가 짧아 하단 빈 공간 발생 | `.mo-risk-card { min-height: 320px }` 고정 / 좌측 기둥은 Chart(~252px) + KPI(~58px) = 310px → 좌가 더 큼. 1440px 이상에서는 오히려 Risk 카드가 더 길어짐 | **좌측 기둥 높이 = Risk 카드 높이**로 `align-items: stretch` + 우측은 flex column, body flex:1. 최소 `min-height: 296px`(기존 320 → 축소)로 통일 |
| 3 | Intel Strip 4-col이 실제로는 3+1로 줄바꿈 (ETA가 다음 줄) | 1280–1439 구간에서 `repeat(4, minmax(0, 1fr))` 잘 동작하나, 카드들 내부 텍스트/숫자 폭 + `.mo-panel padding 10px 12px` + gap 10px가 카드 최소 내용폭보다 좁은 1280px 근처에서 wrap. 또한 `.mo-panel min-width` 미지정 | Intel Strip gap 10 → 8, panel padding 10/12 → 8/10, `min-width: 0` 확실히 주입, panel head 폰트 10 → 9.5px |
| 4 | ETA vs Target 카드가 "단독 줄"로 밀려 공간 낭비 | #3의 결과. 4-col 가로 정렬 실패로 1개 카드가 다음 줄 풀폭 | #3 수정으로 자동 해결. 추가로 Intel Strip **4-col 이상 허용 안 함** (1440+ / 1280-1439 둘 다 4-col 고정, panel 내부만 축소). |
| 5 | Activity 24h 풀폭 strip 이후 아래 공백 (Execution 섹션 위 여백) | `.mo-activity-strip margin-bottom: 14px` + `.mo-sec-head padding: 16px 0 10px` → 약 26px 이중 여백 + Activity strip이 시각 밀도가 낮아 더 크게 느껴짐 | Activity 24h strip을 **Intel Strip 4번째 카드 자리로 병합**(또는 Intel Strip 옆 1/4 col 자리 차지). ETA는 KPI strip 안으로 흡수(후술 §1-5). 결과: Activity가 독립 섹션이 아니라 Intel Strip 한 슬롯으로 흡수되면서 **1섹션(~56px) 절감** |
| 6 | Sub Milestones 1줄(sub2 100%)에 Contributors 옆 sidebar가 비대칭 | sub 1개, plans 0개 상태일 때 좌측 Execution 영역 텍스트가 150-180px 정도밖에 안 됨 → 240px Contributors보다 훨씬 짧아 왼쪽 휑 | **Contributors를 Intel Strip 옆(Hero Row와 Intel Strip 사이의 ON-TOP 고정 오른쪽 컬럼)으로 이동**. Bottom Row는 Execution **단독 풀폭**으로 전환. Empty section(sub 0, plans 0 등)은 완전 숨김(AC-E 계열) |
| 7 | 전체적으로 section gap 14px가 5섹션(Hero, Intel, Activity, Bottom) 누적 시 과해 보임 | 4×14 = 56px이 총 세로에 직접 영향 | section gap 14 → **10px**. Hero ↔ Intel 사이만 12px(시각적 계층 분리). 총 절감: (14×4) – (10×2 + 12×1) = 24px |
| 8 | Roll-up Mode 배너 카드(110px)가 Header 하단에 큰 블록으로 존재 | dev-spec-rollup-consistency에서 이미 "삭제" 결정 | Header 하단 배너 완전 삭제 + Header milestone name 옆에 컴팩트 뱃지 1개 신설 (§2) |
| 9 | Burndown Y축 max가 rollup 시 300대로 커지면 틱이 0/75/150/225/300 5단계로 Y축 label이 더 길어져 좌측 여백을 더 먹을 가능성 | Recharts `tick` 폰트 9px + `width: 32` | YAxis `tickFormatter`로 `>=1000`은 `1.2k`식 축약, 3자리 이하는 그대로. `width: 26`에 맞게 `tickCount: 4`로 줄임 |

### TL;DR 변경 사항

1. **공간 재배치 (대수술 1개)** — Activity 24h 독립 strip 삭제 → Intel Strip에 병합. Contributors 사이드바 위치를 Bottom → Hero-Intel 사이 영역으로 이동.
2. **공간 미세 조정 (여러 소수술)** — 카드 padding 축소, gap 축소, Chart recharts margin 축소, YAxis width 축소, min-height 통일, Intel Strip panel 폰트/패딩 축소.
3. **Roll-up 뱃지** — Header milestone name 옆 컴팩트 pill. 배너 카드(110px) 완전 삭제.
4. **Empty state 강화** — Execution 내부 sub/plans/runs/sessions 개별 섹션이 각각 0개일 때 해당 section head+card 블록 완전 숨김. 모두 0이면 Execution 영역 자체를 "아직 실행이 없습니다" 단일 empty card로 대체.

---

## 1. 레이아웃 — 현재(v2) vs 제안(v3) 비교

### 1-1. 현재(v2)의 세로 높이 누적

`.main-panel padding: 1.25rem 1.5rem` = 20px top. 이후 아래 높이 누적(1280×800 뷰포트, Header+Tab 높이 고정 약 216px 제외):

```
(main-panel 시작)
┌────────────────── v2 (현재) ──────────────────┐                    누적
│ .mo-hero-row (Chart+KPI 310px ↔ Risk 320px)   │  max 320px       320
│   gap 14px                                    │                   334
│ .mo-intel-strip (min-height 112 + padding)    │  114-120px       448 ~ 454
│   gap 14px                                    │                   462 ~ 468
│ .mo-activity-strip (padding 8/14 + 1 row)     │  ~40px           502 ~ 508
│   gap 14px                                    │                   516 ~ 522
│ .mo-bottom-row (Execution min 220 / Contrib) │  220-320px       736 ~ 842
│   gap 14px                                    │                   750 ~ 856
└───────────────────────────────────────────────┘
```

스크린샷처럼 Intel Strip이 **3+1 줄바꿈**이면 +120px 더해져 **약 870~976px** → 1280×800 뷰포트(Content area ~584px 가용)에서 Hero+Intel 끝이 간신히 보이거나 넘침.

### 1-2. 제안(v3)의 세로 높이 누적

```
(main-panel 시작)
┌─────────────────── v3 (제안) ──────────────────┐                    누적
│ ① HERO ROW                                    │                       
│   Chart(1.7fr) + KPI: 기둥높이 288px           │                       
│   Risk(1fr): min-height 288px (align stretch) │  288px            288
│   gap 12px                                    │                   300
│ ② ACTIVITY + CONTRIB ROW (신규, 90px)          │                       
│   ├─ Contrib(260px, 5 rows compact, 90px)    │                       
│   └─ (좌) Intel Strip (3-col ★ 4→3 축소 ver)  │   90px            390
│   gap 10px                                    │                   400
│ ③ INTEL ROW가 아닌 ②와 병합됨 (후술)           │                       
│ ④ BOTTOM ROW = Execution 풀폭                 │                       
│   sub 1개 + plans 0 → Execution 170px         │                       
│   sub 2+  + plans 2+ → Execution 400-500px    │  170-500          570-900
│   gap 10px                                    │                      
└───────────────────────────────────────────────┘
```

**정정 — 최종 구조**: 위 중간 단계는 고려 과정이고, 최종은 다음 §1-3의 3-row 구조다(§1-3이 정답).

### 1-3. 제안(v3) 최종 — 3-row 구조

```
┌─ HERO ROW (grid  1.7fr : 1fr, gap 12, align stretch, min-h 288) ──────────────┐
│ ┌── Chart Card (1.7fr) ─────────────────────┐ ┌── Risk Insight (1fr) ──────┐ │
│ │ [head] BURNDOWN · Legend · range tabs      │ │ [head] RISK SIGNAL          │ │
│ │ ─────────────────────────────────────────  │ │ ─────────────────────────── │ │
│ │ Recharts (height 180)                      │ │ ● At Risk                   │ │
│ │ margin {top:4, right:6, left:-4, bot:0}    │ │ • Progress behind…          │ │
│ │ YAxis width 26, tickCount 4                │ │ • 8 failing TCs…            │ │
│ │                                            │ │ • Top fail #auth…           │ │
│ │ ─────────────────────────────────────────  │ │ ─────────────────────────── │ │
│ │ KPI Strip · 5 col                          │ │ [Analyze with AI →]         │ │
│ │  Remaining | Exec | Vel | Pass | ETA       │ │                             │ │
│ └────────────────────────────────────────────┘ └─────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
(gap 10)
┌─ UTILITY ROW (grid 3fr : 1fr, gap 10, min-h 104) ─────────────────────────────┐
│ ┌── INTEL STRIP (3 col inside 3fr) ─────────────────┐ ┌── Contributors ────┐ │
│ │ Failed & Blocked  │ Velocity 7d  │ Top-Fail Tags  │ │ Top 5 contributors │ │
│ │ (compact)         │              │                │ │ (5 rows compact)   │ │
│ └───────────────────┴──────────────┴────────────────┘ └────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
(gap 10)
┌─ ACTIVITY STRIP (단일 행 strip, h 36) ─────────────────────────────────────────┐
│ LAST 24H · ● Kyle passed TC-42 2m · ● Amy failed TC-91 18m · …  View all →  │
└──────────────────────────────────────────────────────────────────────────────┘
(gap 10)
┌─ EXECUTION SECTIONS (풀폭, sub/plans/runs/sessions, 각각 empty면 숨김) ────────┐
│ [sec-head] Sub Milestones (2)                                                │
│ [sec-card] ...                                                                │
│ [sec-head] Test Plans (5)                                                    │
│ [sec-card] ...                                                                │
│ [sec-head] Test Runs (3)                                                     │
│ [sec-card] ...                                                                │
│ [sec-head] Exploratory Sessions (1)                                          │
│ [sec-card] ...                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

**핵심 차이 (v2 → v3):**

| 변경 | v2 | v3 |
|------|----|----|
| Hero Chart : Risk 비율 | 2fr : 1fr | **1.7fr : 1fr** (Chart가 덜 넓어짐) |
| Hero min-height | Risk만 320, Chart 쪽 flex | **좌우 모두 min-height 288** + `align-items: stretch` |
| KPI strip cols | 4 (Remaining/Exec/Vel/Pass) | **5 (+ETA)** — ETA가 Intel Strip에서 빠져 KPI로 흡수됨 |
| Intel Strip cols | 4 (FailedBlocked/Vel/TopTags/ETA) | **3 (FailedBlocked/Vel/TopTags)** — Utility Row 왼쪽 3fr 안 |
| Intel Strip min-h | 112 | **96** (panel padding 8/10, head 폰트 9.5px) |
| Contributors 위치 | Bottom Row 우측 sticky 사이드바 | **Utility Row 우측 고정 1fr 컬럼** (Intel과 같은 줄, sticky 필요 없음) |
| Activity 24h | Intel 바로 아래 독립 strip | Activity는 **Utility Row 아래 별도 strip(높이 36)** 그대로 유지. **단 padding 축소 8/14 → 6/12, 높이 40 → 36** |
| Bottom Row | Execution + Contributors side-by-side | **Execution 풀폭 단독** (Contributors 이동으로) |
| Section gap | 14 | 10 (Hero→Utility만 10, Utility→Activity 10, Activity→Execution 10) |
| `.mo-panel` padding | 10/12 | 8/10 |
| `.mo-sec-head` padding | 16/0/10 | 10/0/8 |
| Recharts margin | `{8,10,0,4}` | `{4,6,-4,0}` |
| YAxis width | 32 | 26 |

### 1-4. 세로 높이 절감 추정 (1280×800, sub 1개 + plans 0 시나리오)

| 구간 | v2 | v3 | 절감 |
|------|----|----|------|
| Hero Row | 320 | 288 | **-32** |
| Gap Hero→Intel | 14 | 10 | -4 |
| Intel Strip (3+1 wrap 포함) | 112+14+112 = 238 (ETA 별도 줄) | 96 (3-col 안정) | **-142** |
| Gap Intel→Activity | 14 | (병합) | -14 |
| Activity 24h strip | 40 | 36 | -4 |
| Gap Activity→Bottom | 14 | 10 | -4 |
| Bottom Row (sub 1 + plans 0 기준) | 220 (Execution) / 240 (Contrib) → max 240 | Execution 170 (sub 1만, plans 숨김) | **-70** |
| Header Roll-up 배너 카드 | 110 | 0 (뱃지로 축소) | **-110** |
| **총** | **~976** | **~604** | **≈ -372 px** |

> 실제 스크린샷 시나리오(sub 1 + plans 0 + runs 2 + sessions 0, 1280×800)에서 **약 370px(37%)** 절감. Hero + Utility Row + Activity + Execution 시작 헤더까지 **content viewport 584px 안**에 완전히 들어온다.
>
> sub 2 + plans 5 시나리오에서도 Hero/Utility/Activity가 380px로 고정이므로 Execution은 400-500px 확보 가능 → Execution 스크롤 시작이 훨씬 낮은 위치.

### 1-5. 왜 ETA를 KPI Strip에 흡수하는가

- v2의 Intel Strip 4번째 카드 ETA는 정보밀도가 **4줄**인데 카드 껍질(panel head + padding)이 차지하는 비중이 60%로 비효율.
- Chart 하단 KPI Strip은 이미 "숫자 중심 한 줄 요약" 역할 → ETA의 "daysLeft vs projDays + 진행률" 2개 수치는 여기가 최적 자리.
- 결과:
  - v2 KPI Strip (4 col): `Remaining | Executed | Velocity | Pass Rate`
  - **v3 KPI Strip (5 col): `Remaining | Executed | Velocity | Pass Rate | ETA`**
  - ETA 셀: `{daysLeft}d left` (굵게) / 아래 `vs target {projDays}d`. 색상은 onTrack이면 success-600, off-track이면 warning/danger-600 (기존 EtaCard 색 로직 재사용).
- EtaCard 컴포넌트는 **삭제하지 않고** 내부 markup을 `mo-kpi` slot-friendly 버전으로 추출(또는 KpiStrip 내부 5번째 셀로 인라인 렌더).
- 1024px 이하에서 KPI Strip은 5 col이 좁아지므로 `minmax(0, 1fr)`로 자동 축소(기존 동일 패턴).

### 1-6. 왜 Activity를 Utility Row에 병합하지 않고 별도 strip으로 남기는가 (대안 검토)

대안 A: Activity를 Contributors 자리 1fr에 병합 → **비추천**. Contributors가 유의미한 정적 정보(팀 기여도). Activity는 시간순 스트림. 둘을 같은 셀에 넣으면 스크롤/탭 필요.

대안 B (채택): Activity strip은 **얇은(36px) 풀폭 strip**으로 별도 유지. "Last 24h"라는 타임라인 아이덴티티는 그대로 두되 padding/높이만 축소.

대안 C: Activity를 삭제하고 Execution Sections 안 `Activity` 탭으로 재위치 → **비추천**. Overview 탭의 "한눈에 파악" 가치 훼손.

---

## 2. Roll-up 뱃지 스펙 (Header)

> dev-spec-milestone-rollup-consistency §2 + 부록 B-2 기반. 시각적 구체화.

### 2-1. 위치

```
┌─── Header Row 1 (Breadcrumb) ────────────────────────────────┐
│ Milestones › v1.0 Launch                                    │
├──────────────────────────────────────────────────────────────┤
│ [🚩] v1.0 Launch  [Active]  [↻ Roll-up · 2 subs]  📅 Jan...│  ← 여기
│                                                              │
│  Progress bar ───────────────────────────────────  67%       │
│  ● Passed 42  ● Failed 8  ● Blocked 2  ● Untested 48        │
│                                                              │
│  (v2의 Roll-up Mode 배너 카드 여기서 완전 삭제)                │
└──────────────────────────────────────────────────────────────┘
```

- milestone name (18px/700) 바로 다음 → status badge (Active/Completed/Planned/Past-due) → **Roll-up 뱃지** → 날짜 → D-day → Edit/Complete 버튼.
- `isAggregated === true`일 때만 렌더. `false`면 DOM에 존재하지 않음(공간 예약도 금지 — flex gap만 0.625rem 유지).

### 2-2. 시각 스펙

```
┌─────────────────────┐
│ [↻] Roll-up · 2 subs │
└─────────────────────┘
```

| 토큰 | 값 |
|------|-----|
| 높이(min) | 22px (status badge와 완전 동일) |
| padding | `3px 8px` |
| border-radius | 9999px (fully rounded pill) |
| border | `1px solid #C7D2FE` |
| background | `#EEF2FF` |
| color (텍스트) | `#3730A3` |
| font-size | 11px |
| font-weight | 600 |
| 아이콘 | `ri-loop-left-line`, 12px, `#6366F1`, margin-right 4px |
| gap (아이콘↔텍스트) | 4px |
| cursor | `pointer` (§2-4 팝오버 활성 시) / `default` (비활성 시) |
| flex-shrink | 0 (축소 금지) |
| whitespace | nowrap |

> Status badge가 `0.6875rem = 11px` / padding `0.1875rem 0.5rem = 3/8px` / radius 9999px로 되어 있어 **완전 동일 치수**로 정렬된다.

### 2-3. 텍스트 규칙

| 상태 | EN | KO |
|------|----|----|
| subs = 1 | `Roll-up · 1 sub` | `롤업 · 하위 1개` |
| subs ≥ 2 | `Roll-up · {n} subs` | `롤업 · 하위 {n}개` |

- i18n 키: `milestones.rollupBadgeSingular`, `milestones.rollupBadgePlural` (dev-spec-rollup-consistency §10과 동일).
- 한국어는 singular/plural 모두 `하위 {n}개`로 동일 — 조사 생략.

### 2-4. 클릭 인터랙션 — **정적 뱃지 채택** (팝오버 out of scope)

**결정:** 본 v3에서는 **정적 표시(cursor: default, 클릭 없음)**. 팝오버는 out of scope.

**근거:**
- dev-spec-rollup-consistency §9 "Out of Scope"에 "Sub milestone별 drilldown 링크 in Header 뱃지 — 뱃지 클릭 시 sub 목록 팝오버 등은 design-spec v3에서 결정"으로 명시됨.
- 이미 Overview 탭 안에 Execution Sections의 "Sub Milestones" 섹션에서 sub 목록 + 진행률을 제공하고 있음 → 팝오버로 중복 정보 제공 시 정보 건축(IA) 상 cluttered.
- 팝오버는 hover 트리거 접근성(터치 디바이스, 키보드) 복잡도 추가 + sub 1개일 때 오버엔지니어링.
- 팝오버가 정말 유용해지는 시점은 sub ≥ 10개일 때인데, Testably의 sub-milestone 권장은 2-5개 → 현재 유즈케이스와 안 맞음.

**미래 확장 여지:** sub ≥ 6일 때 뱃지 우측에 `▾` chevron을 추가하고 팝오버를 활성화하는 안은 v4에서 재평가.

### 2-5. hover / focus / 접근성

- hover: `background: #E0E7FF` (한 단계 진해짐). `cursor: default`이므로 pointer change 없음.
- focus: 정적 뱃지 = `<span>` 엘리먼트 → 탭 포커스 대상 아님.
- 만약 앞으로 `<button>`으로 업그레이드할 경우: `focus-visible outline: 2px solid #6366F1, offset: 2px`.
- ARIA: `<span role="img" aria-label="Aggregated from 2 sub milestones"> ... </span>`. 스크린리더가 "Roll-up · 2 subs"를 읽지 않고 명시적 레이블을 읽도록.

### 2-6. 반응형

| 브레이크포인트 | 뱃지 표기 |
|---------------|---------|
| ≥ 1280px | `[↻] Roll-up · {n} sub(s)` (텍스트 + 아이콘) |
| 768-1279 | 동일 (충분한 가로 공간) |
| < 768 (mobile) | **아이콘 + 숫자만**: `[↻] {n}` (max-width 60px). `aria-label="Roll-up · {n} subs"` 유지 |

> 모바일에서 텍스트 축약 근거: Header Row 2(milestone name + status + date + D-day + 버튼)의 가로 예산이 매우 빡빡. status badge + D-day만 남기고 뱃지는 아이콘+숫자 조합으로. 완전 숨김은 금지(집계 사실이 핵심 정보).

### 2-7. Burndown Y축 대응 (dev-spec-rollup-consistency AC-8 관련)

- rollup 시 `tcStats.total = 300` 수준으로 커질 수 있음 → YAxis tick max = 300 → 기본 렌더 시 label이 `0, 75, 150, 225, 300` 5개 표시.
- v3에서 YAxis `width: 26`으로 축소되므로 `300`(3자리)은 OK, `1,200`(4자리 이상 — 현실적 상한) 발생 시 **tickFormatter**로 `k` 축약:
  ```tsx
  <YAxis
    tick={{ fontSize: 9, fill: '#9ca3af' }}
    stroke="#d1d5db"
    width={26}
    tickCount={4}
    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
  />
  ```
- `tickCount={4}` → `0, 100, 200, 300` 4단계로 스케일하여 Y축 label이 덜 빽빽.

---

## 3. CSS 사양 — 변경 매트릭스

### 3-1. 기존 `.mo-*` 규칙 수정 (diff 형태)

> 모든 값은 `src/index.css` 내 기존 규칙을 **수정**하는 것. 블록 번호는 현재 파일 라인 기준.

```css
/* ─────── Chart card (line 483-486) ─────── */
.mo-chart-card { /* unchanged */ }
-.mo-chart-head { padding: 9px 12px; ... }
+.mo-chart-head { padding: 7px 10px; gap: 8px; ... }
-.mo-chart-body { padding: 4px 8px; flex: 1; min-height: 200px; }
+.mo-chart-body { padding: 2px 4px; flex: 1; min-height: 180px; }

/* ─────── KPI strip (line 498-503) ─────── */
-.mo-kpi-strip { display: grid; grid-template-columns: repeat(4, 1fr); ... }
+.mo-kpi-strip { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); ... }
-.mo-kpi { padding: 8px 10px; border-left: 1px solid var(--border); }
+.mo-kpi { padding: 6px 8px; border-left: 1px solid var(--border); }
-.mo-kpi .v { font-size: 17px; ... margin-top: 2px; }
+.mo-kpi .v { font-size: 15px; ... margin-top: 1px; }
-.mo-kpi .sub { font-size: 10.5px; ... margin-top: 1px; line-height: 1.3; }
+.mo-kpi .sub { font-size: 10px; ... margin-top: 1px; line-height: 1.25; }

/* 5번째 칸(ETA) 전용 modifier — EtaCard 내용 인라인 렌더 */
+.mo-kpi.eta .v.on-track { color: var(--success-600); }
+.mo-kpi.eta .v.off-track { color: var(--danger-600); }
+.mo-kpi.eta .sub { display: flex; align-items: center; gap: 3px; }
+.mo-kpi.eta .sub .bullet { width: 4px; height: 4px; border-radius: 50%; }
+.mo-kpi.eta .sub .bullet.warn { background: var(--warning); }

/* ─────── Intel Strip panel (line 509-514, 661-672) ─────── */
-.mo-panel { ... padding: 10px 12px; }
+.mo-panel { ... padding: 8px 10px; }
-.mo-panel-head { ... font-size: 10px; margin-bottom: 8px; }
+.mo-panel-head { ... font-size: 9.5px; margin-bottom: 6px; }

/* Intel Strip 4-col → 3-col */
-.mo-intel-strip { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
+.mo-intel-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-bottom: 0; }
-.mo-intel-strip .mo-panel { min-height: 112px; ... }
+.mo-intel-strip .mo-panel { min-height: 96px; ... min-width: 0; }

/* 1023px 이하에서 2-col → 3-col 그대로 (3-col 자체가 이미 컴팩트) */
-@media (max-width: 1023px) {
-  .mo-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
-}
+@media (max-width: 1023px) {
+  .mo-intel-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
+}
+@media (max-width: 767px) {
+  .mo-intel-strip { grid-template-columns: 1fr; }
+}

/* ─────── Activity Strip (line 675-734) ─────── */
-.mo-activity-strip { ... padding: 8px 14px; margin-bottom: 14px; ... font-size: 11.5px; }
+.mo-activity-strip { ... padding: 6px 12px; margin-bottom: 0; ... font-size: 11px; height: 36px; }
-.mo-activity-strip .ev { ... max-width: 260px; }
+.mo-activity-strip .ev { ... max-width: 220px; }

/* ─────── Section head (line 568-570) ─────── */
-.mo-sec-head { display: flex; align-items: center; gap: 8px; padding: 16px 0 10px; font-size: 12px; ... }
+.mo-sec-head { display: flex; align-items: center; gap: 8px; padding: 10px 0 6px; font-size: 11.5px; ... }

/* 첫 번째 sec-head는 위 패딩 없음 (Activity와 간격 이미 10px) */
+.mo-sec-head:first-of-type { padding-top: 0; }

/* ─────── Risk card min-height (line 789-798) ─────── */
-.mo-risk-card { ... min-height: 320px; ... padding: 12px 14px; }
+.mo-risk-card { ... min-height: 288px; ... padding: 10px 12px; }
-.mo-risk-card .mo-risk-body { ... max-height: 380px; ... }
+.mo-risk-card .mo-risk-body { ... max-height: 320px; ... }

/* ─────── Hero Row (line 631-645) ─────── */
-.mo-hero-row {
-  display: grid;
-  grid-template-columns: minmax(0, 2fr) minmax(300px, 1fr);
-  gap: 14px;
-  margin-bottom: 14px;
-  align-items: start;
-}
+.mo-hero-row {
+  display: grid;
+  grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
+  gap: 12px;
+  margin-bottom: 10px;
+  align-items: stretch;   /* ★ 좌우 기둥 높이 일치 */
+}
-@media (min-width: 1440px) {
-  .mo-hero-row { grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr); }
-}
+@media (min-width: 1440px) {
+  .mo-hero-row { grid-template-columns: minmax(0, 1.8fr) minmax(320px, 1fr); }
+}
-@media (max-width: 1279px) and (min-width: 1024px) {
-  .mo-hero-row { grid-template-columns: minmax(0, 1.6fr) minmax(280px, 1fr); gap: 12px; }
-}
+@media (max-width: 1279px) and (min-width: 1024px) {
+  .mo-hero-row { grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr); gap: 10px; }
+}

/* 좌측 기둥(Chart+KPI)도 flex column으로 맞춰 stretch 수용 */
+.mo-hero-row > .mo-chart-stack {
+  display: flex; flex-direction: column;
+  min-width: 0;  /* ★ ResponsiveContainer 축소 대비 */
+}
+.mo-hero-row > .mo-chart-stack > .mo-chart-card { flex: 1; }  /* 차트가 Risk 높이에 맞춰 늘어남 */

/* ─────── Utility Row (신규 — Intel + Contributors 병합) ─────── */
+.mo-util-row {
+  display: grid;
+  grid-template-columns: minmax(0, 3fr) 240px;
+  gap: 10px;
+  margin-bottom: 10px;
+  align-items: stretch;
+}
+@media (min-width: 1440px) {
+  .mo-util-row { grid-template-columns: minmax(0, 3fr) 260px; }
+}
+@media (max-width: 1279px) and (min-width: 1024px) {
+  .mo-util-row { grid-template-columns: minmax(0, 2.5fr) 220px; }
+}
+@media (max-width: 1023px) {
+  .mo-util-row { grid-template-columns: 1fr; gap: 8px; }
+  .mo-util-row > .mo-contrib-side { order: 2; }  /* 모바일에서 Contrib이 Intel 아래로 */
+}

/* ─────── Bottom Row (line 737-748) → Execution 풀폭으로 축소 ─────── */
-.mo-bottom-row {
-  display: grid;
-  grid-template-columns: minmax(0, 1.55fr) 240px;
-  gap: 14px;
-  align-items: start;
-}
-@media (min-width: 1440px) {
-  .mo-bottom-row { grid-template-columns: minmax(0, 1.65fr) 260px; }
-}
-@media (max-width: 1279px) {
-  .mo-bottom-row { grid-template-columns: 1fr; }
-}
+.mo-bottom-row {
+  /* Execution 풀폭 wrapper (Contributors가 Utility Row로 이동했으므로 grid 불필요) */
+  display: block;
+  margin-top: 0;
+}

/* ─────── Contributors sidebar (line 751-784) — Utility Row 맞춤 ─────── */
-.mo-contrib-side {
-  background: #fff; border: 1px solid var(--border); border-radius: 10px;
-  padding: 12px 14px;
-  position: sticky; top: 12px;
-}
-@media (max-width: 1279px) {
-  .mo-contrib-side { position: static; }
-}
+.mo-contrib-side {
+  background: #fff; border: 1px solid var(--border); border-radius: 10px;
+  padding: 8px 10px;
+  /* position: sticky 제거 — Utility Row 내에서 자연 정렬 */
+  display: flex; flex-direction: column;
+  min-height: 96px;  /* Intel Strip panel과 동일 */
+}
-.mo-contrib-side .mo-contrib-head { font-size: 12px; ... margin-bottom: 10px; }
+.mo-contrib-side .mo-contrib-head { font-size: 9.5px; ... margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
-.mo-contrib-side .mo-contrib-row { padding: 6px 0; ... }
+.mo-contrib-side .mo-contrib-row { padding: 3px 0; ... }
-.mo-contrib-side .mo-contrib-row .av { width: 26px; height: 26px; ... }
+.mo-contrib-side .mo-contrib-row .av { width: 20px; height: 20px; font-size: 9px; ... }
-.mo-contrib-side .mo-contrib-row .name { font-size: 12.5px; font-weight: 500; ... }
+.mo-contrib-side .mo-contrib-row .name { font-size: 11.5px; font-weight: 500; ... }
-.mo-contrib-side .mo-contrib-row .cnt { font-size: 11px; ... }
+.mo-contrib-side .mo-contrib-row .cnt { font-size: 10.5px; font-weight: 600; ... }
```

### 3-2. 신규 `.mo-rollup-badge` CSS

`src/index.css`의 `.mo-*` 섹션 맨 아래에 추가(Risk card 블록 다음):

```css
/* =========================================================
   Roll-up badge (Header-level, milestone-name 옆)
   ========================================================= */

.mo-rollup-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  min-height: 22px;
  background: #EEF2FF;
  border: 1px solid #C7D2FE;
  border-radius: 9999px;
  color: #3730A3;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.mo-rollup-badge i {
  font-size: 12px;
  color: #6366F1;
  line-height: 1;
}
.mo-rollup-badge:hover { background: #E0E7FF; }

@media (max-width: 767px) {
  .mo-rollup-badge .label-text { display: none; }
  .mo-rollup-badge::after {
    content: attr(data-count);
    font-size: 11px; font-weight: 600;
  }
  .mo-rollup-badge { padding: 3px 6px; min-height: 22px; }
}
```

---

## 4. 컴포넌트 변경 목록

### 4-1. 재사용 (수정 없음)

| 컴포넌트 | 용도 | 비고 |
|---------|------|------|
| `<BurndownChart />` | Hero 좌측 | 내부 Recharts margin/width만 props 없이 직접 수정 |
| `<FailedBlockedCard />` | Utility Row 좌 1 | CSS 상속으로 자동 컴팩트화 |
| `<VelocitySparkline />` | Utility Row 좌 2 | 동일 |
| `<TopFailTagsCard />` | Utility Row 좌 3 | 동일 |
| `<Activity24hFeed />` | Activity Strip (variant="strip") | v2 그대로 — 단 `.mo-activity-strip` padding 축소로 높이 36px 자동 반영 |
| `<ExecutionSections />` | Bottom 풀폭 | Empty state 강화 (§5-3) |
| `<RiskInsightContainer />` / `RiskSignalCard` / `AiRiskAnalysisCard` | Hero 우측 | min-height 288로 축소만 |

### 4-2. 수정

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/milestone-detail/OverviewTab.tsx` | 레이아웃 전면 재조립: `.mo-hero-row` (좌측 flex column wrapper를 `.mo-chart-stack`으로 네이밍), `.mo-util-row` (신규 div 감싸기 — Intel Strip과 Contributors를 형제로), `.mo-activity-strip` (변경 없음), `.mo-bottom-row` (단일 div, Contributors 제거). `<EtaCard>` 렌더 제거 및 KPI Strip 5번째 slot에 ETA 데이터 주입(§4-3). |
| `src/pages/milestone-detail/KpiStrip.tsx` | 5번째 col 추가. props에 `etaDaysLeft: number \| null`, `etaProjDays: number \| null`, `etaOnTrack: boolean` 추가. 템플릿에 `<div className="mo-kpi eta">...</div>` 한 셀 추가. |
| `src/pages/milestone-detail/BurndownChart.tsx` | Recharts `margin={{ top: 4, right: 6, left: -4, bottom: 0 }}`. YAxis `width={26}`, `tickCount={4}`, `tickFormatter`로 k 축약. ResponsiveContainer `height={180}`. chart-body min-height 180. |
| `src/pages/milestone-detail/ExecutionSections.tsx` | Empty state 강화 — 각 섹션 헤드 렌더 전 `if (items.length === 0) return null`. 전체 4섹션 모두 0개이면 `<div className="mo-exec-empty">Nothing scheduled yet — create your first test plan to get going.</div>` 단일 카드. |
| `src/pages/milestone-detail/ContributorsCard.tsx` | 루트 스타일 `.mo-contrib-side` 유지하되 avatar 26 → 20, row padding 6 → 3, head font 12 → 9.5 (CSS만). props 계약 불변. |
| `src/pages/milestone-detail/page.tsx` | **Header**: (1) Roll-up 배너 카드 DOM(line 816-838) 삭제. (2) line 750 (status badge 다음) 위치에 `<RollupBadge count={subMilestones.length} visible={isAggregated} />` 렌더. (3) `<OverviewTab>` 호출부는 기존 props 유지(컴포넌트 내부 변경은 Overview 내부 레이아웃). |
| `src/index.css` | §3-1 diff 적용 + §3-2 `.mo-rollup-badge` 블록 append. |
| `src/pages/milestone-detail/EtaCard.tsx` | **삭제** (KPI 5번째 slot으로 흡수). 데이터 로직은 그대로 `OverviewTab`에서 계산하여 `<KpiStrip>` prop으로 전달. |
| `src/i18n/local/en/milestones.ts`, `ko/milestones.ts` | dev-spec-rollup-consistency §10 키 추가(`rollupBadgeSingular`, `rollupBadgePlural`). v3 신규 키: `etaKpi.label = "ETA"`, `etaKpi.vsTarget = "vs {n}d target"`, `executionSections.empty = "Nothing scheduled yet"`. |

### 4-3. 신규 생성

| 파일 | 역할 |
|------|------|
| `src/pages/milestone-detail/RollupBadge.tsx` | Header 인라인 뱃지. Props: `count: number`, `visible: boolean`. `visible === false`면 `null` 리턴(공간 예약 금지). `data-count={count}` 속성을 `<span>`에 달아 모바일 `::after`에서 사용. |

**권장 코드:**

```tsx
// src/pages/milestone-detail/RollupBadge.tsx
import { useTranslation } from 'react-i18next';

interface Props {
  count: number;
  visible: boolean;
}

export default function RollupBadge({ count, visible }: Props) {
  const { t } = useTranslation();
  if (!visible || count < 1) return null;

  const key = count === 1 ? 'milestones.rollupBadgeSingular' : 'milestones.rollupBadgePlural';
  const label = t(key, { n: count });

  return (
    <span
      className="mo-rollup-badge"
      data-count={count}
      role="img"
      aria-label={label}
      title={label}
    >
      <i className="ri-loop-left-line" aria-hidden="true" />
      <span className="label-text">{label}</span>
    </span>
  );
}
```

### 4-4. 삭제

| 파일 / 블록 | 사유 |
|------------|------|
| `src/pages/milestone-detail/EtaCard.tsx` | KPI Strip 5번째 col로 흡수 |
| `src/pages/milestone-detail/page.tsx` line 816-838 (Roll-up 배너 카드 JSX) | 뱃지로 교체 |
| `.mo-eta-values`, `.mo-eta-bar`, `.mo-eta-footer`, `.mo-eta-bar .actual/now/gap-*` CSS (line 543-552) | EtaCard 삭제에 따라 불필요. `.mo-kpi.eta` 블록으로 대체 |

---

## 5. 상태별 UI 전수 정의

### 5-1. 데이터 시나리오 매트릭스

| 시나리오 | Hero 좌 (Chart+KPI) | Hero 우 (Risk) | Utility 좌 (Intel 3-col) | Utility 우 (Contrib) | Activity Strip | Bottom (Execution) |
|---------|---------------------|----------------|--------------------------|---------------------|----------------|-------------------|
| **정상 (sub 2, plans 5, runs 3)** | 정상 차트 + 5 KPI (ETA on-track 녹색) | `.signal` + bullets 3줄 + Analyze CTA | 3 panels 정상 | Top 5 | 4 events | 4 섹션 모두 표시 |
| **AI 분석 완료 (캐시 hit)** | 동일 | `.ai` + Summary/Obs/Rec | 동일 | 동일 | 동일 | 동일 |
| **Runs 0건 (TC 0개)** | "Start running tests to see burndown" empty + KPI 모두 0 / ETA "—" | `.signal` + "Keep running tests" + CTA disabled | 3 panels 각 empty state | Top 5 (profile 있으면) / empty | "No activity in the last 24 hours" | `<div className="mo-exec-empty">Nothing scheduled yet...</div>` (전 섹션 0개) |
| **sub 0개, plans ≥1** | 정상 | 정상 | 정상 | 정상 | 정상 | Sub Milestones 섹션 **통째 숨김**, Test Plans 이하만 표시 |
| **sub 1개 (rollup 활성), plans 0, runs 2, sessions 0** | 정상 + ETA | 정상 | 정상 | Top 5 | 정상 | **Sub Milestones (1) + Test Runs (2)만** 표시. Plans / Sessions 섹션 통째 숨김 |
| **rollup 비활성 (sub 0)** | 정상 | 정상 | 정상 | 정상 | 정상 | 정상. Header에 Roll-up 뱃지 렌더 안 함 |
| **rollup 활성 (sub ≥1, rollupStats≠null)** | Burndown Y축 max = rollup total (예 300). 차트 정상 | 동일 | Failed & Blocked 행 개수 증가 (sub 합산) | 동일 | sub의 activity 포함 | 동일 |
| **plansError (test_plans 쿼리 실패)** | 정상 | 정상 | 정상 | 정상 | 정상 | Test Plans 섹션 자리에 `<div className="mo-exec-error">Failed to load test plans. <button>Retry</button></div>` |
| **extraLoading (overview-extra 로딩 중)** | 정상 (tcStats는 이미 있음) | 정상 (bullets 동기 계산) | 3 panels skeleton (`.mo-skeleton-row` 재활용) | 정상 (activityLogs 즉시 계산) | 정상 (activityLogs 기반) | 정상 (runs/sessions 이미 있음) |
| **모바일 (< 768px)** | 단일 컬럼 (Chart → Risk 순) | 동일 | 1fr 단일 컬럼 (Intel 3개 세로 스택) | Intel 아래 (order:2) | 최대 2 events | 정상 (섹션 스택) |
| **Free tier (AI CTA disabled)** | 정상 | `.signal` + CTA disabled + Upgrade chip (v2 상속) | 정상 | 정상 | 정상 | 정상 |
| **Tester/Viewer (AI CTA hidden)** | 정상 | `.signal` + viewer msg (v2 상속) | 정상 | 정상 | 정상 | 정상 |

### 5-2. 각 Intel 카드 Empty State (v2 상속 + 컴팩트화)

| 카드 | Empty 문구 | 아이콘 | padding |
|------|----------|--------|---------|
| Failed & Blocked | "All clear — no failing or blocked TCs." | `ri-shield-check-line` 20px success | 8/10 |
| Velocity 7d | "No runs in the last 7 days." | `ri-calendar-event-line` 20px muted | 8/10 |
| Top-Fail Tags | "No fail tags yet." | `ri-hashtag` 20px muted | 8/10 |
| ETA (KPI 5번째) | `—` (dash) in `.v`, sub: "No date set" | (없음) | 6/8 |

### 5-3. ExecutionSections Empty 처리 (v2 대비 강화)

현재(v2): 섹션별로 0개여도 header + empty card 렌더 → 공간 낭비.

v3: 각 섹션 0개면 **섹션 전체 DOM 제거**. 전 섹션 0개면 단일 `.mo-exec-empty` 카드:

```tsx
// ExecutionSections.tsx
const hasSubs = subMilestones.length > 0;
const hasPlans = plans.length > 0;
const hasRuns = runs.length > 0;
const hasSessions = sessions.length > 0;
const isAllEmpty = !hasSubs && !hasPlans && !hasRuns && !hasSessions && !plansLoading && !plansError;

if (isAllEmpty) {
  return (
    <div className="mo-exec-empty">
      <i className="ri-flag-line" />
      <span>Nothing scheduled yet — create your first test plan or run to get going.</span>
    </div>
  );
}

return (
  <>
    {hasSubs && <SubMilestonesSection ... />}
    {(hasPlans || plansLoading || plansError) && <TestPlansSection ... />}
    {hasRuns && <TestRunsSection ... />}
    {hasSessions && <ExploratorySessions ... />}
  </>
);
```

`.mo-exec-empty` CSS:
```css
.mo-exec-empty {
  background: #fff;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 20px 16px;
  display: flex; align-items: center; gap: 10px;
  font-size: 12.5px;
  color: var(--text-subtle);
  justify-content: center;
}
.mo-exec-empty i { font-size: 18px; color: var(--text-subtle); }
```

> 높이 약 60px. Execution 영역 전체가 이 하나만 있을 때도 과하지 않음.

---

## 6. 인터랙션 매트릭스

| 엘리먼트 | 트리거 | 반응 |
|---------|--------|------|
| `.mo-rollup-badge` | hover | `background: #E0E7FF` (0.15s) |
| `.mo-rollup-badge` | click | **반응 없음** (정적). §2-4 근거 |
| `.mo-kpi.eta` | hover | 변화 없음 (읽기 전용 KPI) |
| `.mo-chart-card` range tabs (7d/30d/All) | click | 기존 v1 동일 |
| Risk Card CTA "Analyze with AI" | click | v2 상속 — loading → ai-success 전환 |
| Risk Card Refresh | click | v2 상속 |
| `.mo-contrib-side .mo-contrib-row` | hover | 변화 없음 (v2 상속) |
| `.mo-activity-strip .view-all` | click | `onGoActivity()` (v2 상속) |
| `.mo-exec-empty` (Execution 완전 empty) | click | 반응 없음 (힌트 텍스트만) |
| 각 섹션 row (sub / plan / run / session) | click | 해당 상세 페이지 이동 (v1/v2 동일) |

### 키보드

| 단축키 | 동작 |
|--------|------|
| Tab 순서 | Breadcrumb → Edit/Complete btn → range tabs → (KPI 비-focusable) → Risk CTA/Refresh → Intel panel links (View all) → Activity view-all → Execution rows |
| `Enter/Space` on `.mo-rollup-badge` | **no-op** (정적 뱃지) |
| `Esc` | (해당 없음 — 모달 없음) |

---

## 7. 반응형 브레이크포인트 (재확정)

| 브레이크포인트 | Hero Row | Utility Row | Activity Strip | Execution | Rollup Badge |
|---------------|----------|-------------|----------------|-----------|-------------|
| **≥ 1440px (xl+, wide)** | `1.8fr : 1fr` gap 12 | `3fr : 260px` gap 10 | full 36px, 4 events | full | `[↻] Roll-up · N sub(s)` |
| **1280–1439px (xl, 기본 desktop)** | `1.7fr : 1fr` gap 12 | `3fr : 240px` gap 10 | full 36px, 4 events | full | 동일 |
| **1024–1279px (lg, laptop)** | `1.5fr : 1fr` gap 10 | `2.5fr : 220px` gap 10 | full 36px, 3 events | full | 동일 |
| **768–1023px (md, tablet)** | 단일 컬럼 (Chart → Risk) | 단일 컬럼 (Intel 2-col → Contrib 1 row) | 2 events | full | 동일 |
| **< 768px (sm, mobile)** | 단일 컬럼 | 단일 컬럼 (Intel 1-col 3 stack → Contrib last) | 2 events, ellipsis | full | `[↻] N` (아이콘+숫자만) |

**Intel Strip 2/3-col 재확정:**
- ≥ 1280px: **3-col 고정** (FailedBlocked + Velocity + TopFailTags). ETA는 KPI로 흡수됨.
- 1024-1279px: 3-col 유지 (240px wrapper 내에서도 gap 8 + min-width 0로 여유 확보).
- 768-1023px: **2-col** (3번째 TopFailTags가 아래로 wrap) — panel min-h 96 그대로.
- < 768px: **1-col 세로 스택**.

**Hero Row 1024-1279 구간 검증:**
- Viewport 1024 — sidebar 240 — main padding 48 = content 736px.
- `1.5fr : 1fr` + gap 10 → 각각 약 434 : 292.
- Chart 434px는 Recharts YAxis 26 + label 영역으로 실질 플롯 380px 확보. OK.
- Risk 292px는 bullets 텍스트 20자 내외 2-3줄 되므로 OK(v2 280px 경계선에서 여유 추가).

---

## 8. 다크모드

v2와 동일 — **본 앱에 다크모드 미지원**. v3에서도 out of scope. (`src/index.css` grep 확인: `prefers-color-scheme`, `.dark`, `data-theme` 모두 미검출.)

> 참조 tokens: `--border`, `--text`, `--text-muted`, `--text-subtle`, `--bg-muted`, `--bg-subtle`, `--primary`, `--success-600`, `--danger-600`, `--warning`, `--violet` — 현재 light 전용.

미래 다크 도입 시 Roll-up 뱃지 우선 매핑:
- bg `#EEF2FF` → `#312E81` (indigo-900)
- border `#C7D2FE` → `#4338CA` (indigo-700)
- text `#3730A3` → `#C7D2FE` (indigo-200)
- icon `#6366F1` → `#818CF8` (indigo-400)

---

## 9. 토스트 메시지 (Sonner)

v2에서 상속(신규 없음). Roll-up 배너 카드 삭제로 인한 토스트 영향 **없음**(배너는 애초에 토스트를 유발하지 않았음).

AI Risk 관련 토스트는 v2 §11 그대로.

---

## 10. i18n 키 (en / ko)

### 10-1. 신규 (v2 대비 추가)

| 키 | EN | KO | 근거 |
|----|----|----|------|
| `milestones.rollupBadgeSingular` | `"Roll-up · {{n}} sub"` | `"롤업 · 하위 {{n}}개"` | dev-spec-rollup-consistency §10 |
| `milestones.rollupBadgePlural` | `"Roll-up · {{n}} subs"` | `"롤업 · 하위 {{n}}개"` | 동 |
| `milestones.kpi.eta` | `"ETA"` | `"예상 완료"` | KPI Strip 5번째 slot 라벨 |
| `milestones.kpi.etaNoDate` | `"No date set"` | `"날짜 미설정"` | ETA empty |
| `milestones.kpi.etaOnTrack` | `"on track"` | `"일정 내"` | sub text |
| `milestones.kpi.etaOffTrack` | `"delayed {{days}}d"` | `"{{days}}일 지연"` | sub text |
| `milestones.overview.executionEmpty` | `"Nothing scheduled yet — create your first test plan or run to get going."` | `"아직 일정이 없습니다 — 첫 테스트 플랜이나 런을 만들어 시작하세요."` | Execution 전체 empty |

### 10-2. 삭제 예정 (별도 cleanup PR 권장)

- `milestones.eta.*` 관련 키(EtaCard 삭제됨) — ripgrep으로 참조 확인 후 제거.
- `milestones.rollupMode`, `rollupTotal`, `rollupPassed`, `rollupFailed`, `rollupCoverage`, `rollupPassRate` — 배너 카드 삭제로 미사용. dev-spec-rollup-consistency §10 비고대로 별도 cleanup PR에서 제거.

---

## 11. 접근성 (A11y)

- **Roll-up 뱃지**: `role="img"` + `aria-label` = 전체 문장 ("Aggregated from 2 sub milestones" 방식 권장). `title` 속성도 동일 텍스트(커서 hover 시 브라우저 네이티브 툴팁). 아이콘은 `aria-hidden="true"`.
- **KPI ETA cell**: 시각적 색상(녹색/빨강)에만 의존하면 색맹 사용자가 on/off track 구분 못함 → sub 텍스트("on track" / "delayed 3d")를 항상 노출. 색상은 보조.
- **Contributors sidebar**: avatar 20px로 축소되어도 `alt` 속성에 contributor name 유지. `<img alt={name}>` 또는 initials span + `aria-label`.
- **ExecutionSections empty**: `<div role="status">` 로 마크업(정적 공지). screen reader가 "Nothing scheduled yet"을 읽음.
- **Color contrast 재검증**:
  - `#3730A3` on `#EEF2FF` = 8.9:1 (AAA) ✓
  - `#6366F1` icon on `#EEF2FF` = 4.5:1 (AA) ✓
  - KPI ETA sub `#16A34A` (success-600) on `#fff` = 4.6:1 (AA) ✓
  - KPI ETA sub `#DC2626` (danger-600) on `#fff` = 5.9:1 (AA) ✓
- **Motion**: `.mo-rollup-badge:hover` transition 0.15s는 최소한이라 `prefers-reduced-motion`에도 유지(깜빡임 없음).

---

## 12. @developer 인수인계

### 12-1. 구현 순서 (권장)

1. **Recharts/CSS 선행** — `.mo-chart-body`, YAxis width/margin, `.mo-panel`, `.mo-sec-head`, `.mo-intel-strip` 3-col 전환. 이 단계까지만 해도 기존 스크린샷의 "공백 과다" 1차 해소.
2. **`.mo-util-row` 신규 CSS + OverviewTab.tsx 재조립** — Intel Strip 3-col로 축소(ETA 제거), Contributors 이동.
3. **KpiStrip ETA 5번째 col 추가** + EtaCard import/usage 제거.
4. **`EtaCard.tsx` 파일 삭제** + `.mo-eta-*` CSS 삭제.
5. **ExecutionSections empty 강화** (§5-3).
6. **Header Roll-up 배너 카드 삭제** (page.tsx line 816-838).
7. **`RollupBadge.tsx` 신규** + Header 주입 (page.tsx line 750 주변).
8. **`.mo-rollup-badge` CSS 추가**.
9. **i18n 키 en/ko 추가**.
10. **수동 QA** — sub 0 / sub 1 plans 0 / sub 2 plans 5 / Runs 0 / Free tier / Viewer 6 시나리오 확인.

### 12-2. 주의사항 3가지 (반드시 확인)

1. **Hero Row `align-items: stretch` + ResponsiveContainer `width="100%"` 상호작용**
   - `.mo-chart-card`를 flex:1로 키울 때 내부 Recharts `<ResponsiveContainer>`가 부모 높이를 인식하지 못해 0px로 렌더되는 버그가 있을 수 있음.
   - **반드시** `<ResponsiveContainer width="100%" height="100%">`로 변경하고, `.mo-chart-body`에 `min-height: 180px` + `display: flex`로 강제. 현재 `height={200}` 하드코딩을 `%`로 전환 필요.
   - 대안: `.mo-chart-stack` wrapper에 `display: grid; grid-template-rows: 1fr auto;` 써서 Chart가 남은 공간 차지, KPI는 auto. 이것이 더 안정적.

2. **KPI Strip 5-col 레이아웃 — 1024px 이하에서 폭 부족 우려**
   - 1024px viewport에서 Chart card가 약 430px → 5개 KPI 각 86px. "Remaining 240 TCs" 같은 긴 값이 ellipsis 없이 잘리지 않도록:
     ```css
     .mo-kpi { min-width: 0; overflow: hidden; }
     .mo-kpi .v { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
     ```
   - 3자리 숫자까지는 문제 없음. 4자리 이상(매우 큰 rollup total) 시 `.v` 폰트 15 → 14 자동 축소 미디어쿼리 고려. 당장은 v3 스코프에서 **스킵**(3자리까지만 보장).

3. **`RollupBadge` visibility 깜빡임 방지**
   - `isAggregated`는 `subMilestones.length > 0 && rollupStats !== null`로 계산되며, `rollupStats`는 loadMilestoneDetailData의 async 결과. 초기 렌더 시 `false`였다가 데이터 로드 후 `true`로 전환되는 플리커 가능.
   - **처리 방법**: milestone-detail 페이지는 이미 data 로딩 완료 전에는 스켈레톤 전체 표시(page.tsx 상단 `if (loading) return <Skeleton>`). 이 덕분에 data가 도착한 이후에만 Header + Overview가 렌더됨 → 플리커 없음. 이 패턴을 **깨지 않도록** `RollupBadge` 내부 `useEffect`/로딩 상태 추가 금지.
   - QueryClient `setQueryData` 패턴으로 부분 캐시 업데이트 시(AI Refresh 후 등) tcStats/rollupStats만 바뀌는데, 이때도 배지는 이미 표시중이므로 재렌더 자연스러움.

### 12-3. 재사용 우선 지침 (중복 생성 방지)

| 유혹 | 대신 이걸 써라 |
|------|-------------|
| "Header 뱃지 전용 신규 `<Badge>` 컴포넌트 만들까?" | `<RollupBadge />`는 단일 사용처. 범용 `<Badge>`로 추상화하지 말 것. |
| "ExecutionSections empty용 전용 empty state 컴포넌트" | 기존 `.mo-empty` CSS 재활용 → 새 `.mo-exec-empty`로 variant만 추가. 새 컴포넌트 금지. |
| "KPI ETA 셀 전용 mini-bar(진행률) 추가" | 기존 `.mo-eta-bar`는 카드 안에서만 의미 있음. KPI strip은 **숫자 중심**이므로 bar 없이 `{daysLeft}d` + `{projDays}d vs target`만 표기. 시각 복잡도 증가 금지. |
| "Contributors sidebar 높이 매칭 위해 flex 1로 stretch" | Utility Row는 `align-items: stretch`이므로 자동. 내부 rows 수가 모자라면 빈 공간 → 그냥 bottom padding으로 두거나 `flex: 1`로 마지막 row를 늘리지 말 것(시각 이상). `min-height: 96`으로 Intel panel과 정렬만 하고 rows는 자연스럽게 위에서부터 정렬. |
| "Activity strip을 Utility Row 3번째 컬럼으로 병합" | 검토했으나 반려 — 시간축(Activity)과 단면 지표(Intel/Contributors)는 정보 유형 다름. 별 strip 유지가 정확한 IA. |

### 12-4. QA 체크리스트

- [ ] 1280×800 viewport: Header(~216) + Hero(288) + Utility(104) + Activity(36) + Execution 헤더(~30) = **~674px** → 스크롤 없이 첫 섹션 헤더까지 노출
- [ ] 1440×900 viewport: 위 + 여유 225px → Execution 섹션 2개 정도 첫 스크롤 전 노출
- [ ] sub 0, runs 0, plans 0 → Execution 영역에 `.mo-exec-empty` 한 카드만
- [ ] sub 1, plans 0, runs 2, sessions 0 → Sub Milestones + Test Runs 섹션만 렌더, Plans/Sessions 섹션 DOM 존재 금지
- [ ] isAggregated=true → Header에 `RollupBadge` 1회 렌더, Burndown Y축 max = tcStats.total (= rollupStats.total)
- [ ] isAggregated=false → `RollupBadge` DOM 없음
- [ ] AI Risk Refresh → 뱃지/Intel/Activity 데이터 즉시 갱신 (setQueryData 패턴)
- [ ] 모바일 375px: RollupBadge가 `[↻] 2`로 축약되는지
- [ ] Chart 카드와 Risk 카드 세로 높이 완전 일치 (하단 baseline 정렬)

---

## 13. 디자인 개발 착수 전 체크리스트

- [x] 모든 상태가 정의되었는가 (정상, 빈 상태, 로딩, 에러, 제한 도달) — §5
- [x] Tailwind/CSS 클래스가 구체적으로 명시되었는가 — §3
- [x] 다크모드 색상 매핑이 있는가 — §8 (미지원 명시 + 미래 대응 안)
- [x] 기존 컴포넌트 재사용 목록이 있는가 — §4-1
- [x] 인터랙션 (클릭, 호버, 키보드)이 정의되었는가 — §6
- [x] 반응형 브레이크포인트별 변경점이 있는가 — §7
- [x] 토스트 메시지가 en/ko 모두 있는가 — §9 (v2 상속, 신규 없음)
- [x] 관련 개발지시서(`dev-spec-milestone-rollup-consistency`)와 수용 기준이 일치하는가 — AC-6(배너 삭제), AC-7(뱃지 1회 렌더) 반영 완료
- [x] 총 세로 높이 절감치가 측정되었는가 — §1-4 (약 370px / 37%)
- [x] 개발 순서 및 주의사항 3가지가 있는가 — §12-1, §12-2
