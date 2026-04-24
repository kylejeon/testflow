# Design Spec: Home Hero Product Screenshot

> **작성일:** 2026-04-24
> **작성자:** Designer
> **상태:** Draft → Review → Approved
> **유형:** 이미지 에셋 명세 (Tailwind 구현 명세 아님)
> **대상 파일:** `public/hero-screenshot.png` (기존 에셋 교체), `public/hero-screenshot@2x.png`, `public/og-image.png`
> **렌더링 위치:** `src/pages/home/page.tsx` — 라인 1196–1241 (lg:col-span-6 영역, 기존 `<img src="/hero-screenshot.png" />`)
> **참조 UI 가이드:** `docs/UI_GUIDE.md`

---

## 1. 선택한 화면 + 선택 근거

### 선택: **Plan Detail → Environments 탭** (Coverage Matrix + AI Environment Insights)

프레임 내에 배치되는 요소 (하나의 합성 이미지):

| 레이어 | 화면 / 컴포넌트 | 코드 위치 |
|---|---|---|
| 배경 레이어 (메인) | Plan Detail의 Environments 탭 — Coverage Matrix 히트맵 + EnvironmentAIInsights 카드 | `src/pages/plan-detail/page.tsx` L1948–2208, `src/components/EnvironmentAIInsights.tsx` |
| 상단 앱 크롬 | ProjectHeader + Plan 탭바 (TestCases / Runs / Activity / Issues / **Environments** / Settings) | `src/components/ProjectHeader.tsx`, plan-detail L3564–3578 |
| 플로팅 오버레이 (우하단, 35% 크기) | AI Run Summary 패널 헤더 + Risk 배지 + Key Metrics 3×2 그리드 (상단 절반만) | `src/pages/run-detail/components/AIRunSummaryPanel.tsx` L611–739 |

### 왜 이 조합인가 (대안 비교)

| 후보 | 히어로로서의 강점 | 약점 | 판정 |
|---|---|---|---|
| **Plan Detail / Environments 탭** | OS×Browser 컬러 그리드는 경쟁사(TestRail / Zephyr / Qase / Xray)에 없는 Testably만의 시그니처 시각 요소. 썸네일에서도 "색깔 격자 + AI 카드" 패턴이 즉시 구분됨 | 테이블 기반이라 정적 이미지에선 여백 많아 보일 수 있음 | **선택** |
| Run Detail + AI Run Summary | AI 패널 자체는 가장 세련됨(인디고 그라디언트, Risk 배지, 실패 패턴 막대). 하지만 나머지 80%는 평범한 테스트케이스 리스트 | 경쟁사와 유사해 보임 — AI 패널만 주목받고 나머지는 "또 하나의 테스트 리스트"로 보임 | **보조 오버레이로 사용** (플로팅 카드) |
| Milestone Detail + Risk Predictor | AI Risk Predictor 보라 그라디언트 카드가 근사 | 카드가 사이드바에 있어 히어로 크기로는 작고, 주변이 텍스트 블록 위주라 정보 밀도 낮음 | 탈락 |
| Workspace/Project Dashboard | 전체 현황 요약에 좋음 | `src/pages/dashboard/page.tsx` 존재 안 함(실구현은 project-detail). Overview는 숫자 위주라 "제품의 모양"이 잘 안 드러남 | 탈락 |
| Test Cases 페이지 | 핵심 사용 화면 | TestRail/Qase와 시각적으로 구분 안 됨. AI 요소 없음 | 탈락 |

### 핵심 메시지
- **한눈에 보이는 차별점:** "테스트 관리 + AI + 환경 커버리지"를 **한 프레임에서** 보여준다.
- **시선 경로(F-pattern):** ① 상단 프로젝트 경로 → ② 좌측 히트맵 색깔 격자 → ③ 우측 AI Insights 카드 → ④ 우하단 플로팅 AI Run Summary.
- **AI 강조:** EnvironmentAIInsights의 `✦ AI-generated` 배지 + 우하단 AIRunSummaryPanel의 인디고 그라디언트 헤더.

---

## 2. 데모 데이터 표 (촬영/합성 시 반드시 이 값 사용)

### 2-1. 프로젝트 및 컨텍스트 (상단 크롬)

| 항목 | 값 |
|---|---|
| 워크스페이스 / 프로젝트명 | **Acme Checkout v2** |
| 프로젝트 이니셜 색상 | `bg-indigo-500` (#6366F1) |
| Breadcrumb | Projects › Acme Checkout v2 › Milestones › **Q2 Release** › Plans › **Sprint 42 Regression** |
| Plan 이름 (H1) | **Sprint 42 Regression** |
| Plan 상태 배지 | `Active` (badge badge-warning — 앰버 톤) |
| Plan 우선순위 | High (P1) |
| Owner 아바타 | 이니셜 **KM** (violet-500) |
| Plan stats row | Passed **142** · Failed **8** · Blocked **3** · Untested **9** · **153/162 executed (94%)** · Pass rate **88%** |

### 2-2. 탭바 (활성 탭 = Environments)

| 탭 | 카운트 | 상태 |
|---|---|---|
| Test Cases | 162 | inactive |
| Runs | 6 | inactive |
| Activity | 47 | inactive |
| Issues | 4 | inactive |
| **Environments** | — | **active** (인디고 하단 밑줄) |
| Settings | — | inactive |

### 2-3. Coverage Matrix (메인 좌측 영역, 실제 값)

그룹(OS) 헤더 3개 — **macOS / Windows / iOS** — 아래 6개 환경 컬럼:

| OS | 브라우저/디바이스 레이블 |
|---|---|
| macOS | Chrome 124 · Safari 17 |
| Windows | Chrome 124 · Edge 124 · Firefox 125 |
| iOS | Safari (iPhone 15) |

행(Test Case) 8개 표시 (나머지는 스크롤 암시하여 잘림):

| custom_id | 타이틀 | priority |
|---|---|---|
| CHK-001 | Guest checkout — credit card | P0 |
| CHK-002 | Registered user — one-click buy | P0 |
| CHK-003 | Apply promo code at checkout | P1 |
| CHK-004 | Address validation — international | P1 |
| CHK-005 | Apple Pay express checkout | P1 |
| CHK-006 | Abandoned cart recovery email | P2 |
| CHK-007 | Tax calculation — EU VAT | P1 |
| CHK-008 | Order confirmation — receipt PDF | P2 |

**히트맵 셀 분포 요구사항** (색깔 다양성 확보를 위해 의도적으로 설정):

| 상태 (코드의 HEATMAP_COLORS 키) | 개수 | Tailwind/Hex |
|---|---|---|
| `perfect` (95–100% 초록 짙음) | 22 셀 | bg `#047857` fg white |
| `pass` (75–95% 초록) | 14 셀 | bg `#10B981` fg white |
| `mixed` (60–75% 앰버) | 5 셀 | bg `#F59E0B` fg white |
| `warn` (40–60% 오렌지) | 2 셀 | bg `#EA580C` fg white |
| `fail` (20–40% 레드) | 1 셀 | bg `#DC2626` fg white |
| `critical` (0–20% 짙은 레드) | **1 셀 — CHK-005 × iOS Safari** | bg `#7F1D1D` fg white — 시선 포인트 |
| `untested` | 3 셀 | bg `#F9FAFB` dashed border `#9CA3AF` fg `#9CA3AF` |
| `na` | 0 셀 | — |

셀 내부 텍스트 형식: `{passed}/{executed}` 또는 백분율. 예:
- Perfect 셀 → "6/6"
- Critical CHK-005 iOS Safari → "0/4"
- Untested → "—"

**Summary row (최하단 고정행, F9FAFB 배경):** 환경별 합산 셀 색상 — macOS Chrome `perfect`, Safari `pass`, Windows Chrome `perfect`, Edge `pass`, Firefox `mixed`, iOS Safari `warn`.

**헤더 메타 (우측 끝):** `Sprint 42 Regression · 162 TCs × 6 envs`

### 2-4. AI Environment Insights 카드 (메인 우측 사이드 280px)

타이틀 (purple → indigo 그라디언트 헤더):
- 배지: `✦ AI-generated` (violet-500/10, violet-400)
- 신뢰도: `Confidence: 92%`
- 타임스탬프: `Updated 4m ago`
- Credit 사용: `1 credit used · 29 left · Starter`

3개의 AI Insight 카드 (위에서 아래):

**1. Critical Coverage Gap (빨간 배지)**
```
┌──────────────────────────────────────────┐
│ ⚠ CRITICAL        1 credit               │
│                                          │
│ Apple Pay broken on iOS Safari           │
│ CHK-005 failed 4/4 runs on iPhone 15.    │
│ No passes recorded in last 2 sprints.    │
│                                          │
│ [ Highlight env ]  [ Create issue ]      │
└──────────────────────────────────────────┘
```

**2. Coverage Gap (앰버 배지)**
```
┌──────────────────────────────────────────┐
│ ⚠ GAP                                    │
│                                          │
│ Firefox 125 under-tested vs baseline     │
│ 47% coverage on Windows Firefox —        │
│ 41% below macOS Chrome baseline.         │
│                                          │
│ [ Assign run ]  [ Highlight env ]        │
└──────────────────────────────────────────┘
```

**3. Baseline Reached (초록 배지)**
```
┌──────────────────────────────────────────┐
│ ✓ BASELINE                               │
│                                          │
│ macOS Chrome 124 is production-ready     │
│ 6/6 critical TCs at 100% pass rate.      │
└──────────────────────────────────────────┘
```

### 2-5. 플로팅 AI Run Summary 카드 (우하단 오버레이, 전체 화면의 ~30% 크기)

AIRunSummaryPanel 상단 절반만 노출. 나머지는 이미지 프레임 밖으로 살짝 잘리게(Peek).

| 요소 | 값 |
|---|---|
| 헤더 배경 | `linear-gradient(135deg, #312E81, #1E1B4B)` |
| 헤더 아이콘 | `ri-sparkling-2-fill` violet-500 (#8B5CF6) |
| 헤더 타이틀 | **AI Run Summary** (color #C7D2FE, 13px bold) |
| Run 이름 (body 상단) | `Sprint 42 — Nightly #128` |
| Risk 배지 | **LOW RISK** (bg #14532D, border #166534, fg #86EFAC) + `ri-error-warning-fill` |
| Credit 주석 | `1 credit used` (color #475569) |
| Key Metrics 3×2 그리드 | Total **162** · Passed **142** (#4ADE80) · Failed **8** (#F87171) · Blocked **3** (#FBBF24) · Pass Rate **88%** (#FCD34D) · Skipped **9** (#94A3B8) |
| Executive Summary (한 줄만 peek) | *"Run is healthy overall — 88% pass rate with failures isolated to Apple Pay on iOS Safari (CHK-005). Safe to ship pending iOS hotfix."* — 두 번째 줄부터 프레임 밖으로 잘림 |

> **중요:** 플로팅 카드는 Executive Summary 중반에서 세로로 잘린다 (프레임 밖으로 fade 또는 그냥 크롭). "이 위에 더 있다"는 암시 — 깊이감 연출.

---

## 3. ASCII 프레이밍 와이어프레임

전체 이미지 최종 프레임 (2880 × 1800, 2x):

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║  ┌───────────────────────────────────────────────────────────────────────────────┐   ║
║  │ [T] Testably   │ Acme Checkout v2 ▾ │         [ ⌘K Search ]   [🔔]   [KM]   │   ║   ← ProjectHeader (h-14, bg-slate-900, border-b white/5)
║  ├───────────────────────────────────────────────────────────────────────────────┤   ║
║  │ Projects › Acme Checkout v2 › Milestones › Q2 Release › Plans                 │   ║   ← Breadcrumb
║  │                                                                               │   ║
║  │   Sprint 42 Regression            [Active] [P1]     Owner: ●KM                │   ║   ← Plan header (H1 16px bold)
║  │   ● Passed 142  ● Failed 8  ● Blocked 3  ● Untested 9  │  153/162 (94%)  │   │   ║   ← Stats row
║  │   Pass rate 88%                                                               │   ║
║  │                                                                               │   ║
║  │   [ TCs 162 ] [ Runs 6 ] [ Activity 47 ] [ Issues 4 ] ▼ENVIRONMENTS [ ⚙ ]   │   ║   ← Tabs — Environments active
║  ├─────────────────────────────────────────────────────┬─────────────────────────┤   ║
║  │                                                     │                         │   ║
║  │  ▦ COVERAGE MATRIX      Sprint 42 · 162 TCs × 6 env │  ✦ AI-GENERATED   92%   │   ║   ← AI panel header
║  │  ┌────────────┬────macOS────┬──────Windows──────┬─iOS─┐ │  Updated 4m ago        │   ║
║  │  │            │ Chr │ Saf   │ Chr │ Edg │ Firf │ Saf │ │  1 credit used · 29    │   ║
║  │  │            │ 124 │ 17    │ 124 │ 124 │ 125  │ iPh │ │  left · Starter        │   ║
║  │  ├────────────┼─────┼───────┼─────┼─────┼──────┼─────┤ │                         │   ║
║  │  │CHK-001 …P0 │ 6/6 │ 6/6   │ 6/6 │ 5/6 │ 4/6  │ 5/6 │ │ ┌─────────────────────┐ │   ║
║  │  │CHK-002 …P0 │ 6/6 │ 6/6   │ 6/6 │ 6/6 │ 3/6  │ 5/6 │ │ │ ⚠ CRITICAL  1 cred  │ │   ║
║  │  │CHK-003 …P1 │ 5/6 │ 4/6   │ 5/6 │ 4/6 │ 2/6  │ 3/6 │ │ │ Apple Pay broken    │ │   ║   ← AI card #1 (red)
║  │  │CHK-004 …P1 │ 6/6 │ 6/6   │ 6/6 │ 5/6 │ 3/6  │ 4/6 │ │ │ on iOS Safari       │ │   ║
║  │  │CHK-005 …P1 │ 4/6 │ 3/6   │ 4/6 │ 3/6 │ 1/6  │ 0/4 │ │ │ CHK-005 failed 4/4… │ │   ║
║  │  │CHK-006 …P2 │ 6/6 │ 6/6   │ 5/6 │  —  │ 3/6  │  —  │ │ │ [Highlight][Issue]  │ │   ║
║  │  │CHK-007 …P1 │ 6/6 │ 5/6   │ 6/6 │ 4/6 │ 3/6  │ 4/6 │ │ └─────────────────────┘ │   ║
║  │  │CHK-008 …P2 │ 6/6 │ 6/6   │ 5/6 │  —  │ 2/6  │ 4/6 │ │ ┌─────────────────────┐ │   ║
║  │  ├────────────┼─────┼───────┼─────┼─────┼──────┼─────┤ │ │ ⚠ GAP               │ │   ║
║  │  │ Σ env sum  │ 98% │ 92%   │ 94% │ 81% │ 47%  │ 63% │ │ │ Firefox 125 under-  │ │   ║   ← AI card #2 (amber)
║  │  └────────────┴─────┴───────┴─────┴─────┴──────┴─────┘ │ │ tested vs baseline  │ │   ║
║  │   Legend: 95–100 · 75–95 · 60–75 · 40–60 · 20–40 · 0–20│ │ [Assign][Highlight] │ │   ║
║  │                                                     │ └─────────────────────┘ │   ║
║  │                                                     │ ┌─────────────────────┐ │   ║
║  │                                                     │ │ ✓ BASELINE          │ │   ║   ← AI card #3 (green)
║  │                                                     │ │ macOS Chrome 124 is │ │   ║
║  │                                                     │ │ production-ready    │ │   ║
║  │                                                     │ └─────────────────────┘ │   ║
║  └─────────────────────────────────────────────────────┴─────────────────────────┘   ║
║                                                                                      ║
║                                           ┌──────────────────────────────────────┐   ║  ← Floating overlay
║                                           │ ✦  AI Run Summary                  × │   ║     (우하단, scale 0.72,
║                                           ├──────────────────────────────────────┤   ║      6° tilt, drop shadow,
║                                           │  Sprint 42 — Nightly #128            │   ║      indigo glow)
║                                           │  ▌ LOW RISK          1 credit used   │   ║
║                                           │  ┌──────┬──────┬──────┐              │   ║
║                                           │  │ 162  │ 142  │  8   │              │   ║
║                                           │  │TOTAL │PASSED│FAILED│              │   ║
║                                           │  ├──────┼──────┼──────┤              │   ║
║                                           │  │  3   │ 88%  │  9   │              │   ║
║                                           │  │BLOCK.│ RATE │ SKIP │              │   ║
║                                           │  └──────┴──────┴──────┘              │   ║
║                                           │  Run is healthy overall — 88% pass   │   ║
║                                           │  rate with failures isolated to…   ┄┄│   ║  ← 여기서 fade/crop
║                                           └──────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
                                          ↑
                      주변 ambient indigo glow (home 페이지가 기존에 렌더하는 `-inset-8 bg-indigo-500/10 blur-3xl`
                      뒷면을 활용하므로 이미지 자체에는 포함하지 않는다)
```

### 영역별 픽셀 분배 (2880 × 1800 기준)

| 영역 | 위치 | 크기 | 비고 |
|---|---|---|---|
| ProjectHeader + Breadcrumb + Plan 헤더 + 탭 | 상단 | 2880 × 320 | App 크롬 (Browser chrome은 포함 X — home 페이지의 double-bezel이 이미 제공) |
| Coverage Matrix 테이블 | 좌측 메인 | 1880 × 1160 | 매트릭스 본체 |
| EnvironmentAIInsights 사이드 | 우측 메인 | 820 × 1160 | 280px 스케일업 |
| 여백 (상/하/좌/우) | 전체 | 40px 내부 패딩 | bg-slate-900 |
| 플로팅 AI Run Summary | 우하단 | 1080 × 680 (scale 0.72) | 프레임 오른쪽 하단을 200px 침범, 6도 기울기 |

---

## 4. 라이트/다크 각 버전 색상 매핑

> **중요:** Testably는 `docs/UI_GUIDE.md §10`에 따라 **다크 온리** 제품이다. 히어로 이미지도 **다크 단일 버전**만 출력한다. 단, og:image(SNS 미리보기)는 라이트 배경에서도 뜰 수 있으니 대비를 체크한다.

### 4-1. 히어로 메인 이미지 (Dark — 유일 버전)

| 요소 | 토큰 | Hex |
|---|---|---|
| 이미지 전체 배경 (앱 캔버스) | `bg-slate-900` | `#0F172A` |
| ProjectHeader 배경 | `bg-slate-900` | `#0F172A` |
| Breadcrumb text | `text-white/55` | rgba(255,255,255,0.55) |
| Plan H1 | `text-white` | `#FFFFFF` |
| Active 배지 (Active plan) | `bg-amber-500/15 text-amber-300 border-amber-500/25` | fg `#FCD34D` |
| 탭 inactive | `text-white/55` | — |
| 탭 active (Environments) | `text-white` + `border-b-2 border-indigo-500` | fg `#FFFFFF`, border `#6366F1` |
| Coverage Matrix 카드 컨테이너 | `bg-white/[0.03] border border-white/[0.06]` | — |
| Matrix 헤더 셀 배경 | `bg-slate-800/60` | `#1E293B` α 0.6 |
| 히트맵 셀 `perfect` | bg `#047857` fg `#FFFFFF` | (emerald-700) |
| 히트맵 셀 `pass` | bg `#10B981` fg `#FFFFFF` | (emerald-500) |
| 히트맵 셀 `mixed` | bg `#F59E0B` fg `#0F172A` | (amber-500, dark text) |
| 히트맵 셀 `warn` | bg `#EA580C` fg `#FFFFFF` | (orange-600) |
| 히트맵 셀 `fail` | bg `#DC2626` fg `#FFFFFF` | (red-600) |
| 히트맵 셀 `critical` | bg `#7F1D1D` fg `#FCA5A5` | (red-900 + red-300 text) |
| 히트맵 셀 `untested` | bg `transparent` dashed border `#475569` fg `#64748B` | — |
| AI Insights 카드 컨테이너 | `bg-violet-500/5 border border-violet-500/15` | — |
| AI 배지 Critical | `bg-red-500/15 text-red-300 border-red-500/25` | — |
| AI 배지 Gap | `bg-amber-500/15 text-amber-300 border-amber-500/25` | — |
| AI 배지 Baseline | `bg-emerald-500/15 text-emerald-300 border-emerald-500/25` | — |
| AI Insights 본문 | `text-slate-300` | `#CBD5E1` |
| AI 액션 chip | `bg-violet-500/10 border-violet-500/25 text-violet-300` | — |
| 플로팅 Run Summary 헤더 | `linear-gradient(135deg,#312E81,#1E1B4B)` | — |
| 플로팅 Run Summary 바디 | `bg-slate-900` | `#0F172A` |
| 플로팅 Metric 카드 | `bg-slate-800` | `#1E293B` |
| 플로팅 테두리 | `border border-indigo-700` with `shadow-[0_0_40px_rgba(99,102,241,0.35)]` | — |

### 4-2. og:image (1200 × 630)

og:image는 Slack / Twitter / LinkedIn 같은 라이트 테마 UI에서 썸네일로 뜬다. 원본 다크 이미지 그대로 사용하되 **인디고 글로우를 더 강화**해서 라이트 배경에서 식별 가능하게 한다.

| 요소 | 조정 |
|---|---|
| 외곽 여백 | slate-900 40px 패딩 유지 |
| 이미지 외곽 | `ring-2 ring-indigo-500/40` 추가 (SNS 라이트 배경에서 외곽선 보장) |
| 좌측 30% 오버레이 영역 | 다크 그라디언트 `linear-gradient(90deg, rgba(15,23,42,0.92), rgba(15,23,42,0))` 위에 문구 배치 |
| 문구 (좌측 상단) | 로고 (Pacifico 48px #FFFFFF) + "Testably" |
| 문구 (좌측 하단) | H1 `text-[44px] font-black tracking-[-0.02em]` "Ship with **AI-verified** coverage." — "AI-verified"는 `text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500` |
| 문구 서브 | `text-[16px] text-slate-400` "Coverage matrix · AI insights · Smart run summaries" |
| 스크린샷 영역 (우측 70%) | 히트맵 + AI Insights + 플로팅 Run Summary 축소 합성 |

---

## 5. 출력 파일 사양

### 5-1. 최종 파일 목록

| 파일명 | 해상도 | 용도 | 포맷 |
|---|---|---|---|
| `public/hero-screenshot.png` | **1440 × 900** (1x, 디스플레이) | home 히어로 `<img>` src | PNG (투명 배경 X, 캔버스 포함) |
| `public/hero-screenshot@2x.png` | **2880 × 1800** (2x, 레티나) | `srcSet` 추가 — 코드에 `srcSet` 속성 신규 추가 필요 | PNG |
| `public/hero-screenshot.webp` | **1440 × 900** | `<picture>` 대체 포맷 — 선택적 구현 | WebP (q=82) |
| `public/hero-screenshot@2x.webp` | **2880 × 1800** | 레티나 WebP | WebP (q=82) |
| `public/og-image.png` | **1200 × 630** | SEO `<meta property="og:image">`, Twitter Card | PNG |
| `public/hero-mobile.png` | **828 × 1080** (세로 트림) | md 이하 브레이크포인트에서 대체 (선택) | PNG |

### 5-2. 렌더링 마크업 업데이트 (개발자용)

현재 코드 (home/page.tsx L1217–1222):
```tsx
<img
  src="/hero-screenshot.png"
  alt="Testably project dashboard showing test cases, runs, and milestones"
  className="w-full h-auto"
  loading="eager"
/>
```

**변경 제안:**
```tsx
<picture>
  <source
    type="image/webp"
    srcSet="/hero-screenshot.webp 1x, /hero-screenshot@2x.webp 2x"
  />
  <img
    src="/hero-screenshot.png"
    srcSet="/hero-screenshot.png 1x, /hero-screenshot@2x.png 2x"
    alt="Testably — Coverage Matrix with AI insights, showing OS × browser test coverage and AI-detected gaps for a checkout release plan"
    width="1440"
    height="900"
    className="w-full h-auto"
    loading="eager"
    fetchpriority="high"
  />
</picture>
```

> alt 텍스트는 현재 "project dashboard" → 새 이미지 내용과 일치하도록 위와 같이 업데이트.

### 5-3. 파일 용량 상한

| 파일 | 최대 크기 | 압축 전략 |
|---|---|---|
| `hero-screenshot.png` | ≤ 280 KB | PNG 팔레트 축소 + pngquant --quality=80-90 |
| `hero-screenshot@2x.png` | ≤ 520 KB | 위와 동일, 2x 해상도 |
| `hero-screenshot.webp` | ≤ 180 KB | cwebp -q 82 |
| `hero-screenshot@2x.webp` | ≤ 340 KB | cwebp -q 82 |
| `og-image.png` | ≤ 320 KB | 트위터 권장 ≤ 5MB, 실무 ≤ 1MB |

> 참고: 기존 `public/hero-screenshot.png`는 현재 **244 KB** (249,635 bytes, 4월 4일 생성). 교체 후에도 같은 용량 범위 유지.

---

## 6. 촬영 체크리스트 (앱에서 이 이미지를 재현하는 단계별 절차)

> 합성이 아닌 **실제 프로덕트 캡처**를 원칙으로 한다. UI 가이드의 DON'T("사실과 다른 UI를 상상해서 그리지 말 것")를 지키기 위함.

### 6-1. 사전 셋업

- [ ] **1단계. 로컬 환경** — `npm run dev`로 로컬 서버 구동. 브라우저: Chrome(최신), 해상도 **1440×900** 또는 **2880×1800(레티나)**.
- [ ] **2단계. 테스트 계정** — "designer@testably.app" 같은 가상 계정으로 Starter 플랜 상태 (AI 크레딧 남아있음) 확보.
- [ ] **3단계. 시드 데이터 생성 — Acme Checkout v2 프로젝트**
  - [ ] 프로젝트 생성 → name: `Acme Checkout v2` (이니셜 색상 자동 indigo-500 할당 — 아바타 색상 확인)
  - [ ] 마일스톤 생성: `Q2 Release` (start 2026-04-01, end 2026-06-30)
  - [ ] 플랜 생성: `Sprint 42 Regression` (milestone: Q2 Release, status: active, priority: high)
  - [ ] Owner 할당 — 가상 멤버 **KM** (이메일 km@acme.test, Avatar 이니셜 "KM", 색상은 코드상 자동 violet-500)
- [ ] **4단계. 테스트케이스 162개 생성** — 위 2-3 표의 8개(CHK-001~CHK-008)는 그대로 기재, 나머지 154개는 기존 "E-commerce checkout" 시드 템플릿 혹은 수동으로 생성. Plan에 전체 162개 다 포함.
- [ ] **5단계. 환경 6개 등록** (Project Settings → Environments)
  - [ ] macOS 14 / Chrome 124
  - [ ] macOS 14 / Safari 17
  - [ ] Windows 11 / Chrome 124
  - [ ] Windows 11 / Edge 124
  - [ ] Windows 11 / Firefox 125
  - [ ] iOS 17 / Safari (iPhone 15)
- [ ] **6단계. 6개 Run 생성 및 결과 기록** — 각 런은 환경 하나에 매핑. 2-3의 히트맵 분포에 맞게 결과 입력. CHK-005 × iOS Safari는 4회 실행 0회 passed(critical 색상 강제).
  - `passed` 비율 조정을 위해 각 TC × env 조합의 passed/executed 숫자를 표에 맞춰 입력.
  - 특히 주목 셀(Critical CHK-005 iOS Safari): 4회 실행 전부 failed.
- [ ] **7단계. AI 크레딧 사전 실행**
  - [ ] Plan Detail → Environments 탭 진입
  - [ ] "AI Insights" 생성 버튼 클릭 — Claude가 실제 결과를 생성할 때까지 대기 (약 5~10초)
  - [ ] 생성된 결과가 2-4와 비슷한 내용인지 확인. 내용이 부적절하면 다시 실행. (AC-9: AI 생성 텍스트는 그대로 렌더)
- [ ] **8단계. AI Run Summary 생성**
  - [ ] 6개 Run 중 가장 최근의 야간 런("Sprint 42 — Nightly #128"이라고 수동으로 이름 지정) 선택
  - [ ] Run Detail → "Generate AI Summary" 클릭
  - [ ] Risk Level이 LOW로 나올 때까지 결과 검증. 내용이 2-5와 매칭되도록 수동으로 프롬프트를 조정하거나, AI 생성 후 DB에서 직접 `ai_summary` JSON을 덮어쓰기(디자인 전용 캡처에 한정, 프로덕션 반영 X).

### 6-2. 캡처 절차

- [ ] **9단계. 메인 히어로 캡처 (Plan Detail / Environments 탭)**
  - [ ] URL: `http://localhost:5173/projects/{ACME_ID}/plans/{SPRINT42_ID}?tab=environments`
  - [ ] 브라우저 DevTools로 창 크기 **1440 × 900**으로 고정 (Device Mode → Responsive → 1440×900, DPR 2x)
  - [ ] 스크롤 위치: 플랜 헤더가 프레임 최상단에 오도록 Top으로 스크롤
  - [ ] 확장프로그램/데브툴 모두 닫기
  - [ ] macOS: `Cmd+Shift+4` + Space → 윈도우 캡처. 또는 Chrome DevTools → Command Menu → "Capture full size screenshot"
  - [ ] 파일명: `hero-main-2x.png` (2880×1800)
- [ ] **10단계. AI Run Summary 패널 캡처 (별도)**
  - [ ] URL: `http://localhost:5173/projects/{ACME_ID}/runs/{NIGHTLY128_ID}`
  - [ ] AI Run Summary 패널이 열려 있고 내용이 완전히 보이는 상태로 창 조정
  - [ ] 패널만 Element 단위로 캡처 — DevTools → Elements → 해당 `<div style="border:1px solid #4338CA; ...">` 우클릭 → "Capture node screenshot"
  - [ ] 파일명: `hero-overlay-run-summary.png`
- [ ] **11단계. Figma 합성 (둘을 하나로)**
  - [ ] Figma 새 프레임 2880×1800, 배경 `#0F172A`
  - [ ] `hero-main-2x.png`를 100% 크기로 붙이기 — 상단 정렬
  - [ ] `hero-overlay-run-summary.png`를 72% 크기로 축소, 우하단 배치 — 프레임 오른쪽에서 -120px, 하단에서 -80px만큼 바깥쪽으로 offset (일부 잘림)
  - [ ] 6° 회전 (rotate 6deg clockwise)
  - [ ] 드롭섀도: X=0, Y=30, Blur=60, Color=rgba(0,0,0,0.45) + 인디고 글로우: X=0, Y=0, Blur=60, Color=rgba(99,102,241,0.35)
  - [ ] 외곽 둥근 모서리: radius=20, clip
- [ ] **12단계. 익스포트**
  - [ ] PNG 2x: `hero-screenshot@2x.png` (2880×1800)
  - [ ] PNG 1x: `hero-screenshot.png` (1440×900) — Figma에서 0.5x 익스포트
  - [ ] WebP: 각 해상도별 WebP export (q=82)
  - [ ] 파일 크기 상한 통과 확인 (§5-3 표)

### 6-3. 검증 체크리스트 (합성 후)

- [ ] 히트맵에 **6가지 색깔이 모두 보이는가** (perfect/pass/mixed/warn/fail/critical + untested dashed)
- [ ] `critical` 짙은 레드 셀(CHK-005 × iOS Safari)이 **시선 경로에 들어오는 위치**에 있는가 (가운데 아래쪽)
- [ ] AI Insights 카드 3개가 **빨강 → 앰버 → 초록** 순으로 정렬되어 있는가 (긴장 → 안정 서사)
- [ ] 플로팅 Run Summary의 **LOW RISK 초록 배지**가 히트맵의 critical 빨강과 시각적 보색 대비를 이루는가
- [ ] 플로팅 카드의 하단이 프레임 밖으로 크롭되어 **"더 있다"는 암시**가 되는가
- [ ] 상단 탭바에서 **Environments**가 명확히 active 상태(인디고 하단 밑줄)인가
- [ ] 모든 수치가 **실제로 계산이 맞는가**: 142+8+3+9=162, 142/(142+8+3)=94% round, pass rate 88% ≈ 142/162
- [ ] **개인정보 0건**: 가상 계정("KM"), 가상 프로젝트("Acme Checkout v2")만 사용

---

## 7. og:image 1200 × 630 변형 명세

### 7-1. 레이아웃

```
┌───────────────────────────────────────────────────────────────────┐
│ [T] Testably                                                      │  ← 로고 + wordmark (top-left, 40px from edge)
│                                                                   │
│ Ship with                                                         │  ← H1 (text-[44px] font-black)
│ AI-verified coverage.                                             │
│                         ┌─────────────────────────────────┐       │
│                         │  (히어로 스크린샷 축소 합성)     │       │  ← 우측 70%
│ Coverage matrix ·       │   - Coverage Matrix             │       │
│ AI insights ·           │   - AI Insights                 │       │
│ Smart run summaries     │   - AI Run Summary overlay      │       │
│                         │                                 │       │
│                                                                   │
│ testably.app                                                      │  ← URL (bottom-left, text-slate-500)
└───────────────────────────────────────────────────────────────────┘
```

### 7-2. 자르기 규칙

- **소스:** 2880×1800 마스터 파일
- **크롭 범위:** 히트맵 + AI Insights + 플로팅 Run Summary 전부 포함되는 **중앙 우측 2:1 영역**을 추출 (1680×840 즈음)
- **배치:** 1200×630 캔버스의 오른쪽 720px × 630px 영역에 위 크롭을 `object-fit: cover` 방식으로 피팅
- **왼쪽 480px:** 다크 그라디언트 오버레이 `linear-gradient(90deg, #0F172A 0%, #0F172A 60%, rgba(15,23,42,0.0) 100%)` 위에 문구 배치

### 7-3. 문구 스타일

| 요소 | 값 |
|---|---|
| 로고 T 마크 | `w-10 h-10 rounded-lg bg-indigo-500` + white "T" (font-bold 18px) |
| "Testably" wordmark | Pacifico 28px text-white |
| H1 | `text-[44px] font-black tracking-[-0.02em] leading-[1.1] text-white` |
| H1 강조 | "AI-verified" → gradient `from-indigo-300 to-indigo-500` |
| 서브텍스트 | `text-[16px] text-slate-400` |
| URL | `text-[14px] text-slate-500 font-medium` |

### 7-4. 검증

- [ ] Twitter Card Validator / LinkedIn Post Inspector에서 preview 확인
- [ ] Slack DM 미리보기에서 텍스트 가독성 확인 (라이트/다크 모드 모두)
- [ ] 1200×630 정확히 준수 (Facebook/Twitter/LinkedIn 모두 이 비율 요구)

---

## 8. 인터랙션 / 상태별 화면 — **해당 없음** (정적 이미지 에셋이므로)

> 이 명세는 이미지 에셋이므로 호버/클릭/로딩/에러 상태가 없다. 단, 이미지가 표시되는 `home/page.tsx` 컨테이너에는 이미 애니메이션이 정의되어 있다(L1201 `animation: 'hf 6s ease-in-out infinite'`) — 이미지 자체는 정적이고 컨테이너가 느리게 떠오른다. 이미지 내부에 미세한 모션을 담고 싶다면 향후 Lottie/APNG 고려 대상(본 명세 범위 외).

---

## 9. 반응형

| 브레이크포인트 | 이미지 처리 |
|---|---|
| ≥ 1024px (lg) | `hero-screenshot@2x.png` 풀 사이즈. 기존 `lg:col-span-6` 영역에 렌더. 높이 자동. |
| 768–1023px (md) | 같은 이미지, `w-full h-auto`. 이미지 width ≤ 720px로 다운스케일됨. 가독성 검증 필요. |
| 640–767px (sm) | `hero-mobile.png` (828×1080) 사용 권장 — 옵션: `<picture>`에 `<source media="(max-width: 767px)" srcSet="/hero-mobile.png">` 추가. **모바일 크롭 영역:** 매트릭스 좌상단 4×4 영역 + AI 카드 1장(Critical)만. 플로팅 Run Summary는 제거. |
| < 640px (xs) | 모바일 이미지 계속 사용. home 페이지 자체가 이 영역에서 screenshot을 숨기는지 확인 — 현재 코드(L1226/1234: `hidden sm:flex`)는 플로팅 chips를 sm 이하에서 숨김. 이미지 본체는 계속 렌더. |

### 모바일 이미지 셋업 (선택적, 따로 촬영)

- [ ] 동일 Acme Checkout 데이터에서 모바일 뷰 캡처 (393×852 iPhone 15 Pro 기준)
- [ ] Plan Detail은 모바일에서 1열 레이아웃이 되므로 매트릭스가 가로 스크롤됨 — Overview 뷰 + AI Insights 카드 스택을 대신 사용 권장
- [ ] 산출물: `public/hero-mobile.png` (828×1080 세로 2x 해상도)
- [ ] **Phase 2로 분리 권장**: 1차 런칭은 데스크톱 이미지만으로 충분. 모바일 최적화 이미지는 후속.

---

## 10. 접근성 / 세부사항

### 10-1. 텍스트 가독성 (히어로 카피와의 충돌 회피)

- 히어로 카피(H1 + CTA)는 `lg:col-span-6` 좌측에 있고, 이미지는 우측에 있으므로 **겹치지 않음**.
- 이미지 내 텍스트는 최소 **12px** 이상. 매트릭스 셀의 "6/6" 같은 숫자는 합성 후 2x 기준 26px 상당이므로 썸네일에서도 식별 가능.
- AI 카드 헤드라인("Apple Pay broken on iOS Safari")은 이미지 전체에서 가장 큰 본문 요소 — **우측 상단 AI 섹션의 인포메이션 앵커** 역할.

### 10-2. AI 요소 강조 기법 (의도적 집중 유도)

| 기법 | 위치 | 스타일 |
|---|---|---|
| Violet 스파클 아이콘 | AI Insights 헤더, 플로팅 Run Summary 헤더 | `ri-sparkling-2-fill` color `#8B5CF6` |
| "✦ AI-generated" 배지 | AI Insights 상단 | `bg-violet-500/10 text-violet-300 border-violet-500/25` + 12px font-bold uppercase tracking-widest |
| 인디고 그라디언트 헤더 (Run Summary) | 플로팅 카드 | `linear-gradient(135deg,#312E81,#1E1B4B)` |
| 외부 드롭섀도 글로우 | 플로팅 카드 | `box-shadow: 0 0 60px rgba(99,102,241,0.35)` |
| Critical 셀에 대한 대비 | 히트맵 CHK-005 iOS Safari | 주변 셀은 초록/앰버인데 이 셀만 `#7F1D1D` — **자연 시선 유도** |

### 10-3. 시선 경로 (F-pattern 검증)

1. **첫 고정점:** 상단 "Sprint 42 Regression · [Active] · Pass rate 88%" → 제품 컨텍스트 획득 (0.3초)
2. **두 번째 고정점:** 좌측 히트맵 색깔 그리드 → 제품의 시각적 고유성 각인 (0.5초)
3. **세 번째 고정점:** 우측 상단 **"✦ AI-generated"** + "CRITICAL Apple Pay broken on iOS Safari" → AI 스토리 인식 (1.0초)
4. **네 번째 고정점:** 우하단 플로팅 **LOW RISK** 초록 배지 → 안전하게 ship할 수 있다는 결론 (1.3초)

### 10-4. alt 텍스트 (접근성 + SEO)

```
Testably — Coverage Matrix with AI insights, showing OS × browser test coverage and AI-detected gaps for a checkout release plan. AI Run Summary overlay shows LOW RISK verdict with 88% pass rate.
```

한국어 번역 (i18n 필요 시 `home.hero.imageAlt`):
```
Testably — 체크아웃 릴리스 플랜의 OS × 브라우저 테스트 커버리지와 AI 탐지 갭을 보여주는 커버리지 매트릭스와 AI 인사이트. 우하단 AI Run Summary는 88% 패스율, LOW RISK 판정을 표시.
```

---

## 11. 기존 컴포넌트 / UI 요소 재사용 목록

> **이 이미지는 모두 실제 구현된 UI를 캡처/합성한 결과물이어야 한다** (CEO 제약: "존재하지 않는 UI 그리지 말 것"). 아래는 각 요소가 실제 렌더링되는 코드 위치 — 재현 시 이 컴포넌트들을 반드시 거쳐야 한다.

### 실존 확인된 컴포넌트 (캡처 대상)

| 화면 요소 | 실제 컴포넌트 파일 | 확인 |
|---|---|---|
| ProjectHeader (상단 바) | `src/components/ProjectHeader.tsx` | ✅ |
| Plan 헤더 + 탭 네비게이션 | `src/pages/plan-detail/page.tsx` L3540–3578 | ✅ |
| Coverage Matrix (OS × Browser 히트맵) | `src/pages/plan-detail/page.tsx` L1948–2183, 컬러 맵 `src/lib/environments.ts` (HEATMAP_COLORS) | ✅ |
| EnvironmentAIInsights 카드 | `src/components/EnvironmentAIInsights.tsx` | ✅ (f001/f002로 2026-04 릴리스 완료) |
| AI Run Summary 패널 (플로팅 오버레이 소스) | `src/pages/run-detail/components/AIRunSummaryPanel.tsx` L611–802 | ✅ |
| Avatar (Owner KM 이니셜) | `src/components/Avatar.tsx` | ✅ |
| 배지 (Active, P1, CRITICAL 등) | 전역 CSS `badge`, `pri-badge` 클래스 | ✅ |

### 존재하지 않으므로 **그리지 말 것**

- ❌ Workspace-level Dashboard 페이지 (`src/pages/dashboard/page.tsx` **없음** — 사용자 질문에 언급됐으나 실제로는 project-detail의 Overview 탭). 이 명세는 그 대신 Plan Detail을 선택했으므로 해당 없음.
- ❌ "AI Coverage Insights" 라는 별개 컴포넌트는 없음 — 실제 이름은 **Environment AI Insights**. 명세/alt/marketing copy에서 "AI coverage insights"로 지칭해도 되지만 **UI 내부 레이블은 "AI-generated"** 로만 표기.
- ❌ AI가 히트맵 셀 위에 직접 주석을 그리는 기능은 없음 — AI 카드만 옆에 나열. 주변 장식 꾸밀 때 **AI→셀 연결 화살표 그리지 말 것**.

---

## 12. 토스트 메시지 — **해당 없음** (정적 이미지 에셋)

> 사용자 상호작용이 없는 이미지 에셋이므로 토스트 없음. 단, 촬영 중 AI 생성이 실패할 경우 나오는 실존 토스트는 §6-1의 7/8단계에서 재시도로 처리.

---

## 13. 디자인 착수 전 체크리스트

> 아래 항목을 모두 통과해야 제작(캡처/합성) 진행

- [ ] 선택한 화면(Environments 탭)이 실제 코드에 존재하는가 — ✅ `src/pages/plan-detail/page.tsx` L3616–3636
- [ ] 데모 데이터 숫자가 모두 계산이 맞는가 (142+8+3+9=162, pass rate 88% ≈ 142/162)
- [ ] 히트맵 색상 8종이 모두 `src/lib/environments.ts`의 HEATMAP_COLORS와 일치하는가
- [ ] AI Insights 카드 3종이 실제 f001/f002 구현에서 렌더 가능한 형태인가 (Critical / Gap / Baseline 타입)
- [ ] AI Run Summary 패널 헤더 그라디언트가 실제 코드 L615 (`linear-gradient(135deg, #312E81, #1E1B4B)`)와 일치하는가 — ✅
- [ ] 해상도가 1x/2x 모두 정의되었는가 — ✅ (1440×900 + 2880×1800)
- [ ] og:image 1200×630 변형이 정의되었는가 — ✅ §7
- [ ] 모바일 대응 방안이 정의되었는가 — ✅ §9
- [ ] 파일 용량 상한이 정의되었는가 — ✅ §5-3
- [ ] alt 텍스트 EN/KO 모두 있는가 — ✅ §10-4
- [ ] 개인정보/실제 계정 없음 (모두 가상 데이터) — ✅ "Acme Checkout v2", "KM", "Sprint 42 Regression"
- [ ] 존재하지 않는 UI를 상상해서 그리지 않았는가 — ✅ §11 실존 확인 완료
