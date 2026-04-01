# Dev1 수정 지시서: CEO 보고 Dashboard Analytics 버그 4건

**작성일:** 2026-04-01
**작성자:** QA
**대상:** Dev1 (Analytics & Dashboard 위젯)
**참조:** `qa-ceo-dashboard-bugs-analysis.md`
**우선순위:** CEO 직접 보고 → 긴급 처리

---

## 수정 순서 (권장)

1. Bug 2 — ExecutionSummary → Run Status (10분)
2. Bug 3 — CoverageHeatmap 색상/라벨 (20분)
3. Bug 1 — MilestoneTracker active 필터 + burndown (20분)
4. Bug 4 — TCQualityAnalysis 전면 리팩터 (2.5시간)

**총 예상:** ~3.5시간

---

## Bug 1. MilestoneTracker — Active 필터 및 Burndown 개선

**파일:** `src/pages/project-detail/widgets/MilestoneTracker.tsx`

### 1-A. Active Milestone 필터 수정 (L87-91)

현재 필터가 DB의 실제 status 값과 안 맞을 수 있음. `active` 값도 포함해야 함.

```typescript
// L87-91 수정:
const activeMilestones = milestones.filter(m =>
  ['started', 'in_progress', 'upcoming', 'active', 'open'].includes(m.status)
);
```

### 1-B. 헤더 텍스트 수정 (L169 부근)

```tsx
// 현재: {milestoneList.length} milestone(s)
// 수정:
{activeMilestones.length} active milestone{activeMilestones.length !== 1 ? 's' : ''}
```

### 1-C. Burndown 날짜 Fallback 추가 (L98-100 부근)

`start_date`/`end_date`가 null인 경우 첫 번째 Run 생성일 ~ 마지막 Run 기한으로 대체:

```typescript
// start_date/end_date fallback
const startDate = milestone.start_date
  ? new Date(milestone.start_date)
  : runs.length > 0
    ? new Date(Math.min(...runs.map(r => new Date(r.created_at).getTime())))
    : null;

const endDate = milestone.end_date
  ? new Date(milestone.end_date)
  : milestone.due_date
    ? new Date(milestone.due_date)
    : null;

if (!startDate || !endDate) {
  setBurndown(null);
  return;
}
```

### 1-D. Burndown Legend 추가

Recharts `<Legend>` 컴포넌트를 Burndown AreaChart에 추가:

```tsx
import { Legend } from 'recharts';

// AreaChart 내부에 추가:
<Legend
  verticalAlign="top"
  align="right"
  iconType="line"
  wrapperStyle={{ fontSize: '11px', color: '#6B7280' }}
/>
// Line name 속성 추가:
<Line dataKey="ideal" name="Ideal" stroke="#94A3B8" strokeDasharray="6 3" dot={false} />
<Area dataKey="actual" name="Remaining TCs" stroke="#6366F1" fill="#EEF2FF" fillOpacity={0.4} />
```

---

## Bug 2. ExecutionSummary → Run Status 리네이밍 및 디자인 수정

**파일:** `src/pages/project-detail/widgets/ExecutionSummary.tsx`

### 2-A. 위젯 이름 + 아이콘 색상 변경 (L174 부근)

```tsx
// 현재: <i className="ri-play-circle-line text-indigo-500" /> Execution Summary
// 수정:
<i className="ri-play-circle-line text-emerald-500" /> Run Status
```

### 2-B. 헤더 우측에 Run 총 수 추가

```tsx
// 헤더 우측 영역에:
<span className="text-[11px] text-gray-400">{runs.length} runs</span>
```

### 2-C. 3-col Summary 색상 수정

```typescript
// Active: indigo → emerald
// 현재: 'text-indigo-600' / 'bg-indigo-50'
// 수정:
{ label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50' }

// Paused: gray → amber
// 현재: 'text-gray-600' / 'bg-gray-50'
// 수정:
{ label: 'Paused', color: 'text-amber-500', bg: 'bg-amber-50' }
```

### 2-D. MiniProgressBar → MiniDonut 교체

기존 `MiniProgressBar` 컴포넌트를 삭제하고 새 `MiniDonut` 추가:

```tsx
function MiniDonut({ passed, failed, blocked, untested }: {
  passed: number; failed: number; blocked: number; untested: number;
}) {
  const total = passed + failed + blocked + untested;
  if (total === 0) return <div className="w-7 h-7 rounded-full bg-gray-100" />;
  const pPct = (passed / total) * 100;
  const fPct = (failed / total) * 100;
  const bPct = (blocked / total) * 100;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{
        background: `conic-gradient(
          #16A34A 0% ${pPct}%,
          #DC2626 ${pPct}% ${pPct + fPct}%,
          #D97706 ${pPct + fPct}% ${pPct + fPct + bPct}%,
          #E2E8F0 ${pPct + fPct + bPct}% 100%
        )`,
      }}
    >
      <div className="w-[18px] h-[18px] rounded-full bg-white" />
    </div>
  );
}
```

### 2-E. Run Card 레이아웃 변경

각 Run card에서 MiniProgressBar → MiniDonut, 그리고 TC 카운트 추가:

```tsx
{/* Run card 내부 */}
<div className="flex items-center gap-2.5">
  <MiniDonut
    passed={run.passed}
    failed={run.failed}
    blocked={run.blocked}
    untested={run.total - run.passed - run.failed - run.blocked}
  />
  <div className="flex-1 min-w-0">
    <div className="text-[12px] font-medium text-gray-800 truncate">{run.name}</div>
    <div className="text-[11px] text-gray-400">{run.statusLabel}</div>
  </div>
  <span className="text-[11px] text-gray-500 flex-shrink-0">
    {run.passed + run.failed + run.blocked}/{run.total} TC
  </span>
</div>
```

---

## Bug 3. CoverageHeatmap — 색상 구간 및 라벨 수정

**파일:** `src/pages/project-detail/widgets/CoverageHeatmap.tsx`

### 3-A. 색상 구간을 목업에 맞게 수정 (L14-21)

```typescript
// 현재:                    // 수정 (목업 기준):
// >= 90 → #16A34A          // >= 90 → #16A34A (dark green) ✅ 유지
// >= 70 → #65A30D          // >= 80 → #4ADE80 (light green) ← 구간 변경
// >= 50 → #F59E0B          // >= 60 → #FCD34D (yellow) ← 구간 변경
// >= 30 → #F97316          // >= 40 → #FB923C (orange) ← 구간 변경
// else  → #DC2626          // else  → #EF4444 (red)

function getHeatColor(passRate: number): string {
  if (passRate >= 90) return '#16A34A';
  if (passRate >= 80) return '#4ADE80';
  if (passRate >= 60) return '#FCD34D';
  if (passRate >= 40) return '#FB923C';
  return '#EF4444';
}
```

### 3-B. "(root)" → "General"로 변경 (L67-78 부근)

```typescript
// folder 값 정리:
const displayName = (folder: string | null) => {
  if (!folder || folder === '(root)') return 'General';
  const parts = folder.split('/').filter(Boolean);
  return parts[parts.length - 1] || folder;
};

// 사용처:
const name = displayName(tc.folder);
```

### 3-C. 셀에 TC 수 추가 표시 (CustomContent 내부)

현재 `{passRate}%`만 표시 → 목업처럼 `{total} TC · {passRate}%` 형식:

```tsx
// Treemap CustomContent 내부 text 렌더링:
// 현재:
<text ...>{passRate}%</text>

// 수정 (셀 크기가 충분할 때):
{width > 60 ? (
  <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize={10} fill="#fff">
    {entry.total} TC · {entry.passRate}%
  </text>
) : (
  <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fontSize={9} fill="#fff">
    {entry.passRate}%
  </text>
)}
```

---

## Bug 4. TCQualityAnalysis → TC Quality & Growth 전면 리팩터

**파일:** `src/pages/project-detail/widgets/TCQualityAnalysis.tsx`

### 4-A. 위젯 이름 + 아이콘 + 헤더 배지 변경

```tsx
// 아이콘 + 이름:
<i className="ri-test-tube-line text-emerald-500" />
TC Quality & Growth

// 헤더 우측 — gray text → green badge:
<span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
  {data.totalTCs} Total
</span>
```

### 4-B. Area Chart 색상: Indigo → Green

```tsx
// 현재: stroke="#6366F1" fill="#EEF2FF"
// 수정:
<Area
  dataKey="total"
  stroke="#10B981"
  fill="#ECFDF5"
  fillOpacity={0.5}
  strokeWidth={2}
  name="누적 TC"
/>
```

### 4-C. 레이아웃: 2-col → 3-col Grid

Priority/Lifecycle 토글을 제거하고 3개 컬럼으로 분리:

```tsx
// 현재: <div className="grid grid-cols-2 gap-3">
// 수정:
<div className="grid grid-cols-3 gap-3">
  {/* Col 1: Priority Donut (기존 PieChart 그대로 유지) */}
  <div>
    <div className="text-[11px] font-semibold text-gray-500 mb-2 text-center">PRIORITY</div>
    {/* 기존 PieChart 코드 */}
  </div>

  {/* Col 2: Lifecycle Bars (새로 구현) */}
  <div>
    <div className="text-[11px] font-semibold text-gray-500 mb-2 text-center">LIFECYCLE</div>
    <LifecycleBars data={data.lifecycleCounts} total={data.totalTCs} />
  </div>

  {/* Col 3: Automation Gauge (새로 구현) */}
  <AutomationGauge
    rate={data.automationRate}
    automated={data.automatedCount}
    total={data.totalTCs}
  />
</div>
```

### 4-D. Lifecycle Bars 컴포넌트 (새로 추가)

기존 Priority/Lifecycle 토글 제거. Lifecycle은 별도 수평 바 차트:

```tsx
function LifecycleBars({ data, total }: {
  data: Array<{ name: string; value: number; color: string }>;
  total: number;
}) {
  // 목업 기준 색상: Active=green, Draft=amber, Deprecated=gray
  const colorMap: Record<string, string> = {
    active: '#16A34A',
    draft: '#F59E0B',
    deprecated: '#9CA3AF',
  };

  return (
    <div className="space-y-2.5">
      {data.map(lc => (
        <div key={lc.name}>
          <div className="flex justify-between text-[11px] text-gray-600 mb-1">
            <span className="capitalize">{lc.name}</span>
            <span className="font-semibold">{lc.value}</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((lc.value / total) * 100, 2)}%`,
                backgroundColor: colorMap[lc.name.toLowerCase()] || lc.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4-E. Automation 반원형 SVG 게이지 (새로 추가)

기존 텍스트 + progress bar 제거. 반원형 게이지로 교체:

```tsx
function AutomationGauge({ rate, automated, total }: {
  rate: number; automated: number; total: number;
}) {
  const clampedRate = Math.min(Math.max(rate, 0), 100);
  // 반원 arc 길이 계산: 반지름 40, 반원 둘레 = π * 40 ≈ 125.7
  const arcLength = 125.7;
  const filledLength = (clampedRate / 100) * arcLength;

  return (
    <div className="text-center">
      <div className="text-[11px] font-semibold text-gray-500 mb-2">AUTOMATED</div>
      <div className="relative w-[100px] h-[54px] mx-auto overflow-hidden">
        <svg viewBox="0 0 100 54" className="w-full h-full">
          {/* Background arc (gray track) */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#E2E8F0"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Filled arc (violet) */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#8B5CF6"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filledLength} ${arcLength}`}
          />
        </svg>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900">
          {clampedRate.toFixed(0)}%
        </div>
      </div>
      <div className="text-[10px] text-gray-500 mt-1">
        {automated} / {total} TCs
      </div>
    </div>
  );
}
```

### 4-F. "Top 실패 TC" 섹션 유지

목업에 없지만 CEO가 유용하다고 판단할 수 있으므로 유지. 단, 3-col grid **아래**에 배치:

```tsx
{/* 3-col grid 아래에 */}
{failedTCs.length > 0 && (
  <div className="mt-4 pt-3 border-t border-gray-100">
    <div className="text-[11px] font-semibold text-gray-500 mb-2">Top 실패 TC (최근 90일)</div>
    {/* 기존 코드 유지 */}
  </div>
)}
```

---

## 체크리스트

- [ ] Bug 2: `ExecutionSummary.tsx` — 이름/아이콘/색상/MiniDonut/TC카운트
- [ ] Bug 3: `CoverageHeatmap.tsx` — 색상 구간/라벨/(root)→General/TC수 표시
- [ ] Bug 1: `MilestoneTracker.tsx` — active 필터 확장/헤더 텍스트/burndown fallback+legend
- [ ] Bug 4: `TCQualityAnalysis.tsx` — 이름/아이콘/색상/3-col/LifecycleBars/AutomationGauge
- [ ] 전체 빌드 확인: `npm run build` 에러 없음
- [ ] 브라우저에서 각 위젯 렌더링 확인

---

**참고:** 분석 상세 내용은 `qa-ceo-dashboard-bugs-analysis.md` 참조.
**완료 후 QA에게 확인 요청 부탁드립니다.**
