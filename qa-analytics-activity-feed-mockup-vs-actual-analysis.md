# QA: Dashboard Analytics & Activity Feed — 디자인 목업 vs 실제 구현 비교 분석

**분석일:** 2026-04-01
**목업 파일:** `desi/dashboard-analytics-activity-feed-mockup.html` (15 Screens: A-1~A-9, B-1~B-6)
**비교 대상:** `src/pages/project-detail/AnalyticsTab.tsx`, `ActivityFeedTab.tsx`, `widgets/*.tsx`, `hooks/*.ts`
**분석자:** QA

---

## 요약

| 등급 | 건수 | 설명 |
|------|------|------|
| **P0 — 기능 누락/오작동** | 5건 | 구현되지 않은 위젯, 잘못된 Tier 분기, 이중 reverse 버그 |
| **P1 — 목업 대비 기능 차이** | 9건 | 누락된 서브 컴포넌트, 레이아웃 구조 불일치 |
| **P2 — 스타일/UX 차이** | 8건 | 색상, 크기, 텍스트 등 미세 차이 |
| **합계** | **22건** | |

---

## P0 — Critical (기능 누락/오작동)

### P0-01. AI Insights Panel 위젯 미구현

- **목업 (A-9, A-1 Row 5):** Row 5에 Flaky 50% + AI Insights 50% 배치. AI Insights는 Pro+ 게이트 적용, 3개 인사이트 카드 (Daily Summary/violet, Risk Alert/red, Completion Forecast/indigo). 각 카드에 태그, 시간, 본문, 액션 링크.
- **실제:** `AIInsightsPanel.tsx` 파일 자체가 존재하지 않음. `AnalyticsTab.tsx`에도 import/렌더링 없음. Row 5는 FlakyDetector만 full-width로 배치.
- **영향:** Phase 3 위젯 전체 누락. 목업 그리드의 마지막 row 구조가 완전히 다름.
- **수정:**
  1. `src/pages/project-detail/widgets/AIInsightsPanel.tsx` 생성
  2. 3개 카드 타입: `daily_summary` (violet gradient), `risk_alert` (red gradient), `completion_forecast` (indigo gradient)
  3. 각 카드: tag badge + timestamp + body text + action link
  4. TierGate requiredTier={3} 적용
  5. `AnalyticsTab.tsx` Row 5를 `grid-cols-2`로 변경, FlakyDetector + AIInsightsPanel 각 50%

### P0-02. Flaky TC Detector — Tier 분기 불일치

- **목업 (A-6):** 헤더에 `Pro+` 뱃지, 블러 오버레이도 "Professional 플랜" 표시. 즉 **tier >= 3 (Pro+)** 필요.
- **실제:** `AnalyticsTab.tsx` L90: `<TierGate requiredTier={2}>` → **Starter+**로 설정됨. `FlakyDetector.tsx` 헤더에도 `Starter+` 뱃지 표시 (L140).
- **영향:** Free 사용자에게 Flaky 기능이 Starter에서 풀리는데, 디자인 의도는 Pro+ 전용.
- **수정:**
  1. `AnalyticsTab.tsx` L90: `requiredTier={2}` → `requiredTier={3}`
  2. `FlakyDetector.tsx` L140: `Starter+` → `Pro+`, badge 색상을 violet으로 변경 (현재 indigo)

### P0-03. Activity Feed — AI Daily Summary 카드 미구현

- **목업 (B-4):** Activity Feed 상단에 AI Daily Summary 카드 표시. violet→indigo gradient 배경, AI 아이콘, 요약 텍스트 + 핵심 포인트 리스트, 펼침/접힘 토글. Pro+ 게이트.
- **실제:** `ActivityFeedTab.tsx`에 AI Summary 관련 코드 없음. Live indicator → New event banner → Filter bar → Feed 순서만 존재.
- **영향:** 디자인의 핵심 차별화 요소인 AI 요약 기능 전체 누락.
- **수정:**
  1. AI Summary 컴포넌트 추가 (Filter bar 위, New event banner 아래)
  2. gradient: `linear-gradient(135deg, var(--violet-bg), var(--primary-bg))`, border: `var(--violet-border)`
  3. 펼침/접힘 상태 관리 (`useState`)
  4. Pro+ 게이트: `subscriptionTier >= 3`일 때만 렌더링

### P0-04. FlakyDetector — `statuses.reverse()` 이중 호출 버그

- **목업 (A-6):** 시퀀스 도트가 oldest→newest 순서로 표시.
- **실제:** `FlakyDetector.tsx` L90-92:
  ```typescript
  statuses: statuses.reverse(),          // 1차 reverse (mutates in-place)
  score: calculateFlakyScore(statuses.reverse()),  // 2차 reverse (원래대로 복원)
  ```
  `.reverse()`는 배열을 in-place로 변경하므로, 두 번째 호출 시 원래 순서(newest→oldest)로 복원됨. **score 계산에 잘못된 순서가 전달**되고, statuses도 원래 순서 그대로.
- **영향:** Flaky Score 값이 정확한 것처럼 보이지만, 시퀀스 도트 표시 순서가 newest→oldest로 뒤집혀 있음.
- **수정:**
  ```typescript
  const reversed = [...statuses].reverse(); // oldest → newest
  return {
    statuses: reversed,
    score: calculateFlakyScore(reversed),
  };
  ```

### P0-05. Activity Feed — Filter Chips 미구현

- **목업 (B-3):** 필터 적용 시 필터 바 아래에 chip 표시 (indigo bg, × 닫기 버튼). "초기화" 링크.
- **실제:** `ActivityFeedTab.tsx`의 FilterBar에서 필터 선택 UI만 있고, 선택된 필터를 chip으로 보여주는 영역 없음.
- **영향:** 사용자가 어떤 필터가 활성화되어 있는지 한눈에 파악 불가.
- **수정:**
  1. FilterBar 아래에 `<FilterChips>` 컴포넌트 추가
  2. 활성 필터가 있을 때만 렌더링
  3. 각 chip: `bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs`, × 아이콘 클릭 시 해당 필터 제거
  4. "초기화" 버튼: 모든 필터 리셋

---

## P1 — Major (목업 대비 기능 차이)

### P1-01. Analytics Tab — Row 5 레이아웃 구조 불일치

- **목업 (A-1):** Row 5 = `grid-template-columns: 1fr 1fr` → Flaky (50%) + AI Insights (50%).
- **실제:** Row 5 = FlakyDetector full-width만 존재 (AI Insights 없으므로).
- **수정:** P0-01 해결 후 자동 해결. `AnalyticsTab.tsx`에서:
  ```tsx
  <div className="grid grid-cols-2 gap-5">
    <TierGate requiredTier={3} ...>
      <FlakyDetector ... />
    </TierGate>
    <TierGate requiredTier={3} ...>
      <AIInsightsPanel ... />
    </TierGate>
  </div>
  ```

### P1-02. Execution Summary — Mini Donut 차트 미구현

- **목업 (A-4):** 각 Run 카드에 28×28 mini donut 차트 (`conic-gradient(pass%, fail%, untested%)`). 흰색 inner circle.
- **실제:** `ExecutionSummary.tsx` L53-66: `MiniProgressBar` 컴포넌트 → 단순 1.5px 높이 progress bar.
- **수정:**
  1. `MiniDonut` 컴포넌트 생성: `w-7 h-7 rounded-full` + `conic-gradient` 계산
  2. Inner circle: `w-[18px] h-[18px] bg-white rounded-full`
  3. `MiniProgressBar` → `MiniDonut`로 교체

### P1-03. Team Performance — 리더보드 테이블 구조 불일치

- **목업 (A-5):** `<table>` 형식의 리더보드. 컬럼: #, Member (avatar initials + 이름), Executed, Found Failures, Avg Response, 7-Day Activity (sparkline). avatar에 색상별 원형 배경.
- **실제:** `TeamPerformance.tsx` → Recharts `<BarChart layout="vertical">` + 하단 Top 5 텍스트 리스트. avatar 없음, sparkline 없음, Avg Response 없음.
- **수정:**
  1. Recharts BarChart 유지하되, 상단에 리더보드 `<table>` 추가
  2. 테이블 컬럼: `#`, `Member` (avatar initials 원형), `Executed`, `Found Failures`, `Avg Response`, `7-Day Activity` (sparkline)
  3. Avatar initials: 이름 첫 글자 조합, 색상은 인덱스 기반 회전
  4. Sparkline: 최근 7일 activity count를 5px 너비 바 차트로
  5. `Avg Response` 컬럼: 테스트 결과 간 평균 시간 간격 계산

### P1-04. TC Quality Analysis — 자동화 게이지 차트 미구현

- **목업 (A-8):** 반원형(semi-circular) 게이지: `width:100px, height:54px`, arc border 10px, violet fill, 중앙에 % 수치.
- **실제:** `TCQualityAnalysis.tsx` L227-234: 단순 텍스트(`3xl bold`) + 수평 progress bar.
- **수정:**
  1. `AutomationGauge` 컴포넌트 생성
  2. SVG 반원 arc 구현: 180도 arc, stroke-width 10
  3. Track: `#E2E8F0`, Fill: `#8B5CF6` (violet)
  4. 중앙 값: `18px bold`
  5. 하단 레이블: `10px gray-500`

### P1-05. Activity Feed — Highlight 타입 미구현

- **목업 (B-5):** 5가지 하이라이트 스타일:
  1. Normal (기본)
  2. Critical Failure: red border-left + red bg + `CRITICAL` 뱃지
  3. Low Pass Rate: amber border-left + amber bg
  4. Milestone Deadline: amber border-left + amber bg
  5. Consecutive Failures: red bg + group collapse bar
- **실제:** `ActivityFeedTab.tsx` L87-91: 2가지만 구현:
  - `failed` 이벤트 → red border-left
  - 그 외 highlighted → amber border-left
  - `CRITICAL` 뱃지 없음, consecutive failures 그룹화 없음, milestone deadline 하이라이트 없음
- **수정:**
  1. `is_highlighted` 판단 로직을 세분화: critical failure (`priority === 'critical' && status === 'failed'`), low pass rate, milestone deadline
  2. Critical: `border-l-red-500 bg-red-50` + `<span class="text-[10px] font-bold text-white bg-red-600 px-1.5 rounded-full">CRITICAL</span>` 뱃지
  3. Consecutive failures: 동일 TC의 연속 실패를 그룹으로 묶고 collapse bar 추가
  4. Milestone deadline: `border-l-amber-500 bg-amber-50`

### P1-06. Activity Feed — Realtime 상태 표시 미구현

- **목업 (B-6):** 3가지 realtime 상태:
  1. Connected: green pulse (2s interval)
  2. New events: indigo banner
  3. Disconnected: red pulse (0.8s interval) + "재연결 중..." 텍스트
- **실제:** `ActivityFeedTab.tsx` L242-249: Connected 상태만 구현 (green pulse). Disconnected/reconnecting 상태 UI 없음.
- **수정:**
  1. `useActivityFeed` hook에서 `connectionStatus: 'connected' | 'disconnected' | 'reconnecting'` 상태 반환
  2. Connected: 현재대로 `bg-emerald-500 animate-pulse` (2s)
  3. Disconnected: `bg-red-500 animate-pulse` (0.8s = `animation: pulse 0.8s infinite`), text: "연결 끊김 — 재연결 중..."
  4. Banner는 이미 구현됨 (L252-261)

### P1-07. Row 2 열 비율 불일치

- **목업 (A-1):** Row 2 = `55fr / 45fr` (55% / 45%)
- **실제:** `AnalyticsTab.tsx` L69-76: `col-span-7 / col-span-5` = 58.3% / 41.7%
- **영향:** 3.3%p 차이. 시각적으로 미세하지만 디자인 스펙과 불일치.
- **수정:** grid-cols-12 대신 grid-cols-20 사용하여 `col-span-11 / col-span-9` (55/45), 또는 CSS grid `grid-template-columns: 55fr 45fr` 직접 사용:
  ```tsx
  <div className="grid gap-5" style={{ gridTemplateColumns: '55fr 45fr' }}>
  ```

### P1-08. CoverageHeatmap — 색상 스펙트럼 범위 차이

- **목업 (A-7):** 6-color legend: `0-20%` (Red) / `20-40%` / `40-60%` / `60-80%` / `80-100%` / No Data
- **실제:** `CoverageHeatmap.tsx` L14-21: 5단계 + 미실행: `0-30%` / `30-50%` / `50-70%` / `70-90%` / `90-100%` / 미실행
- **영향:** 구간 분할 기준이 다름 (20% 간격 vs 불균등 간격).
- **수정:** 목업 기준으로 구간 조정:
  ```typescript
  if (passRate >= 80) return '#16A34A';
  if (passRate >= 60) return '#65A30D';
  if (passRate >= 40) return '#F59E0B';
  if (passRate >= 20) return '#F97316';
  return '#DC2626';
  ```
  Legend도 동일하게 업데이트.

### P1-09. Flaky TC Detection — "3 Flaky" 뱃지 카운트 미구현

- **목업 (A-6):** 헤더 우측에 `<span class="... danger">3 Flaky</span>` 빨간 뱃지로 Flaky TC 수 표시.
- **실제:** `FlakyDetector.tsx` 헤더에 `Starter+` 뱃지와 "상위 N개" 텍스트만 있고, Flaky 건수 뱃지 없음.
- **수정:**
  ```tsx
  {flaky.length > 0 && (
    <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      {flaky.length} Flaky
    </span>
  )}
  ```

---

## P2 — Minor (스타일/UX 차이)

### P2-01. Flaky TC — 테이블 헤더 컬럼 차이

- **목업 (A-6):** 테이블 컬럼: `Test Case | Sequence (last 10) | Score | Last Run`. 왼쪽 빨간 border 하이라이트.
- **실제:** 커스텀 카드 레이아웃 (테이블 아님). `Test Case | 최근 실행 | 불안정도`. `Last Run` 컬럼 없음. 빨간 left border 없음 (hover border-amber만 있음).
- **수정:**
  1. 높은 score (≥80) 아이템에 `border-l-2 border-red-500` 추가
  2. `Last Run` 정보: 마지막 결과의 created_at 날짜 표시

### P2-02. Execution Summary — 헤더 "Run Status" vs "Execution Summary"

- **목업 (A-4):** 위젯 제목 = "Run Status", 아이콘 color = `var(--success)` (#10B981)
- **실제:** 위젯 제목 = "Execution Summary", 아이콘 color = `text-indigo-500` (#6366F1)
- **수정:** 타이틀을 "Run Status"로 변경, 아이콘 색상을 `text-emerald-500`으로 변경

### P2-03. Pass Rate Trend — 바 차트 색상 차이

- **목업 (A-2):** 바 색상 `#E2E8F0` opacity 0.5 (annotation에 명시)
- **실제:** `PassRateTrend.tsx` 바 fill = `#E2E8F0` (정확), 하지만 opacity 속성 미적용
- **수정:** `<Bar fill="#E2E8F0" fillOpacity={0.5}>`

### P2-04. Activity Feed — Search input 너비

- **목업 (B-3):** 기본 `width:180px`, 포커스 시 `width:280px` (transition).
- **실제:** `ActivityFeedTab.tsx` L206: `w-[160px]` 고정. 포커스 확장 없음.
- **수정:** `w-[180px] focus-within:w-[280px] transition-all duration-200`

### P2-05. TierGate — blur 강도 차이

- **목업:** `filter: blur(5px)`, `opacity: .6`
- **실제:** `TierGate.tsx` L19: `filter blur-[4px]`, `opacity-50`
- **수정:** `blur-[5px] opacity-60`

### P2-06. Widget 카드 — border-radius 불일치

- **목업 (A-1 annotation):** 위젯 카드: `rounded-xl (12px)`, no shadow. 헤더 하단 border `#F1F5F9`.
- **실제:** 대부분의 위젯이 `rounded-xl` 사용 (일치). 단, 헤더 border가 `border-gray-100` (#F5F5F5) → 목업의 `#F1F5F9` (gray-100 = `#F5F5F5`, 목업은 `#F1F5F9`)
- **영향:** 미세한 색상 차이 (거의 무시 가능하나 디자인 토큰 일관성 위해).
- **수정:** 필요 시 `border-b border-[#F1F5F9]`로 통일

### P2-07. Activity Feed — Date divider 스타일 차이

- **목업 (B-1):** date divider: `padding: 10px 20px`, 텍스트 `12px semibold`, 우측에 건수 없음.
- **실제:** `ActivityFeedTab.tsx` L304-308: `px-5 py-2.5 bg-gray-50/80`, 텍스트 `11px semibold`, 우측에 `{items.length}건` 표시.
- **영향:** 건수 표시는 실제 UX 개선이므로 유지 권장. 패딩/폰트 미세 차이만 조정.
- **수정:** `py-2.5` → `py-[10px]`, `text-[11px]` → `text-[12px]`

### P2-08. Period Filter 라벨 불일치

- **목업 (A-1):** `7일 | 14일 | 30일 | 전체`
- **실제:** `AnalyticsTab.tsx` L19-21: `7d | 14d | 30d | 전체` — 처음 3개가 영문 약어.
- **수정:** `PERIOD_LABELS`를 `{ '7d': '7일', '14d': '14일', '30d': '30일', 'all': '전체' }`로 변경

---

## 전체 수정 우선순위 가이드

### Sprint 1 (즉시)
1. **P0-04** FlakyDetector reverse 버그 — 5분 수정
2. **P0-02** Flaky Tier 분기 수정 — 5분 수정
3. **P0-05** Filter Chips 구현 — 30분
4. **P1-07** Row 2 열 비율 — 5분 수정

### Sprint 2 (이번 주)
5. **P0-01** AIInsightsPanel 위젯 신규 개발 — 2~3시간
6. **P0-03** AI Daily Summary 카드 — 1~2시간
7. **P1-01** Row 5 레이아웃 변경 (P0-01 완료 후) — 10분
8. **P1-02** Mini Donut 차트 — 30분
9. **P1-09** Flaky 카운트 뱃지 — 10분
10. **P1-08** Coverage 색상 구간 조정 — 10분

### Sprint 3 (다음 주)
11. **P1-03** Team Performance 리더보드 테이블 — 2~3시간
12. **P1-04** 자동화 게이지 차트 — 1시간
13. **P1-05** Activity Feed Highlight 타입 확장 — 1~2시간
14. **P1-06** Realtime 상태 표시 — 30분
15. **P2-**** 모든 P2 이슈 일괄 처리 — 1시간

---

## 참조 파일 목록

| 파일 | 역할 |
|------|------|
| `desi/dashboard-analytics-activity-feed-mockup.html` | 디자인 목업 (15 screens) |
| `src/pages/project-detail/AnalyticsTab.tsx` | Analytics 탭 레이아웃 |
| `src/pages/project-detail/ActivityFeedTab.tsx` | Activity Feed 탭 |
| `src/pages/project-detail/widgets/PassRateTrend.tsx` | Pass Rate 위젯 |
| `src/pages/project-detail/widgets/MilestoneTracker.tsx` | Milestone 위젯 |
| `src/pages/project-detail/widgets/ExecutionSummary.tsx` | Run Status 위젯 |
| `src/pages/project-detail/widgets/TeamPerformance.tsx` | Team 위젯 (Pro+) |
| `src/pages/project-detail/widgets/FlakyDetector.tsx` | Flaky TC 위젯 |
| `src/pages/project-detail/widgets/CoverageHeatmap.tsx` | Coverage 위젯 |
| `src/pages/project-detail/widgets/TCQualityAnalysis.tsx` | TC Quality 위젯 |
| `src/pages/project-detail/widgets/TierGate.tsx` | 구독 게이트 오버레이 |
| `hooks/useActivityFeed.ts` | Activity Feed 데이터/realtime |
