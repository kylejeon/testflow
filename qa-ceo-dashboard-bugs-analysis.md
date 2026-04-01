# QA: CEO 보고 Dashboard Analytics 버그 4건 분석

**분석일:** 2026-04-01
**보고자:** CEO
**분석자:** QA
**대상:** Dashboard Analytics Tab 위젯 4개

---

## Bug 1. Milestone Tracker — Active Milestone 표시 및 Burndown Actual 라인 검증

### 1-A. Active Milestone 표시 방식

**목업 (A-3):**
- 헤더: "2 active milestones" (active 개수 표시)
- 마일스톤 카드: 가로 스크롤, 각 카드에 Status badge (On Track / At Risk / Overdue), progress bar, `82% · D-5 (Apr 6) · 18 remaining`

**현재 코드 (`MilestoneTracker.tsx`):**
- **L87-91:** Active milestone 필터링:
  ```typescript
  const activeMilestones = milestones.filter(m =>
    ['started', 'in_progress', 'upcoming'].includes(m.status)
  );
  const milestoneList = (activeMilestones.length > 0 ? activeMilestones : milestones).map(computeRisk);
  ```
- **문제:** `milestone.status` 값이 DB에서 `started`, `in_progress`, `upcoming` 중 하나여야 active로 판정되는데, **실제 DB의 status 값이 다를 수 있음** (예: `active`, `open`, `pending` 등). 이 경우 `activeMilestones`가 빈 배열이 되어 **모든 마일스톤이 표시됨** (completed 포함).
- **L169:** 헤더에 `{milestoneList.length} milestone(s)` 표시 — 목업의 "active milestones"가 아닌 전체 개수.

**수정:**
1. DB의 실제 milestone status 값을 확인: `SELECT DISTINCT status FROM milestones;`
2. 필터 조건을 DB 값에 맞게 수정 (예: `active`도 포함)
3. 헤더 텍스트를 `{activeMilestones.length} active milestones`로 변경

### 1-B. Burndown "Actual" 라인 — 무엇을 표시하는가

**목업 (A-3):**
- Y축: 남은 TC 수 (100 → 0 방향)
- Ideal line: 선형 감소 (dashed gray)
- Actual line: 실제 남은 TC 수 (solid indigo + fill)
- 의미: **"아직 실행되지 않은 TC 수"의 일별 추이**

**현재 코드 분석:**

`buildBurndown()` 함수 (L63-80):
```typescript
function buildBurndown(totalTCs, startDate, endDate, dailyExecuted) {
  let remaining = totalTCs;
  for (let d = 0; d <= Math.min(totalDays, elapsedDays); d++) {
    const ideal = Math.round(totalTCs * (1 - d / totalDays));
    remaining -= (dailyExecuted[dayKey] ?? 0);
    points.push({ date: dayStr, ideal, actual: Math.max(0, remaining) });
  }
}
```

`loadBurndown()` 함수 (L106-143):
```typescript
// L119: totalTCs = 마일스톤의 모든 Run에 할당된 고유 TC 수
const totalTCs = [...new Set(runs.flatMap(r => r.test_case_ids ?? []))].length;

// L121-127: 해당 마일스톤 Run들의 test_results에서 untested 아닌 결과만 가져옴
const { data: results } = await supabase
  .from('test_results')
  .select('test_case_id, created_at')
  .in('run_id', runIds)
  .gte('created_at', startDate.toISOString())
  .neq('status', 'untested')
  .order('created_at', { ascending: true });

// L130-137: 각 TC의 최초 실행일만 카운트 (중복 제거)
const seenTC = new Set<string>();
const dailyExecuted: Record<string, number> = {};
(results ?? []).forEach(r => {
  if (!r.test_case_id || seenTC.has(r.test_case_id)) return;
  seenTC.add(r.test_case_id);
  const day = r.created_at.slice(0, 10);
  dailyExecuted[day] = (dailyExecuted[day] ?? 0) + 1;
});
```

**Actual 라인의 의미:** "마일스톤에 할당된 총 TC 중 아직 한 번도 실행되지 않은 TC 수"의 일별 추이. **이것은 목업의 의도(남은 TC)와 정확히 일치함.**

**잠재적 문제점:**
1. **마일스톤에 Run이 연결되지 않은 경우:** `milestone_id` 필드가 null이면 `runs`가 빈 배열 → burndown 데이터 없음 → "Not enough data" 메시지 표시
2. **`start_date`/`end_date`가 미설정:** L98-100에서 null 체크로 burndown이 skip됨
3. **Actual 라인이 비정상적으로 보이는 경우:** 대부분의 TC가 특정 날짜에 한꺼번에 실행되면 갑자기 뚝 떨어지는 패턴 발생 (정상 동작이지만 CEO가 의아하게 볼 수 있음)

**수정 권장:**
1. 마일스톤에 `start_date`/`end_date`가 없으면 첫 번째 Run 생성일 ~ 마지막 Run 기한으로 fallback
2. Burndown 차트에 **legend** 추가: "Ideal" (dashed), "Actual (Remaining TCs)" — 현재 Recharts Tooltip만 있음
3. Actual 값이 0에 도달하면 "✅ Complete" 표시

---

## Bug 2. Run Status vs Execution Summary — 이름 및 디자인 불일치

### 목업 (A-4 — "Run Status")

| 요소 | 목업 사양 |
|------|-----------|
| **위젯 이름** | "Run Status" |
| **헤더 아이콘 색상** | green (`var(--success)` = #10B981) |
| **헤더 우측** | "12 runs total" |
| **3-col summary** | Active (green), Completed (indigo), Paused/Review (amber) |
| **Stacked bar** | 8px 높이, 4색 (Passed/Failed/Blocked/Untested) + legend |
| **Run cards** | **Mini donut 차트** (28×28, conic-gradient) + Run name + subtitle + "23/40 TC" |
| **Footer** | "View all runs →" |

### 현재 구현 (`ExecutionSummary.tsx` — "Execution Summary")

| 요소 | 현재 구현 | 차이 |
|------|-----------|------|
| **위젯 이름** | "Execution Summary" | ❌ 이름 다름 |
| **헤더 아이콘 색상** | indigo (`text-indigo-500`) | ❌ 색상 다름 |
| **헤더 우측** | 없음 | ❌ 총 Run 수 미표시 |
| **3-col summary** | Active (indigo), Completed (emerald), Paused (gray) | ⚠️ Active 색상 다름 (indigo vs green), Paused 색상 다름 |
| **Stacked bar** | ✅ 2px 높이 (목업은 8px), 4색 + legend | ⚠️ 높이 다름 |
| **Run cards** | **MiniProgressBar** (1.5px 높이 linear bar) | ❌ Mini donut 아님 |
| **Run subtitle** | Status text ("In Progress" 등) | ⚠️ 목업은 "v2.4.0" 같은 버전/마일스톤 |
| **Run count** | 없음 (progressPct % 표시) | ❌ "23/40 TC" 형식 아님 |
| **Footer** | "View all runs →" | ✅ 일치 |

### 구체적 수정 사항

**파일:** `ExecutionSummary.tsx`

1. **L174:** 위젯 이름 변경
   ```typescript
   // 현재: <i className="ri-play-circle-line text-indigo-500" /> Execution Summary
   // 수정:
   <i className="ri-play-circle-line text-emerald-500" /> Run Status
   ```

2. **헤더 우측에 Run 총 수 추가:**
   ```tsx
   <span className="text-[11px] text-gray-400">{data.runs.length} runs</span>
   ```

3. **3-col summary 색상 수정:**
   ```typescript
   { label: 'Active', value: data.active, color: 'text-emerald-600' },  // indigo → emerald
   { label: 'Completed', value: data.completed, color: 'text-indigo-600' },  // ✅ 이미 맞음... 목업은 indigo
   { label: 'Paused', value: data.paused, color: 'text-amber-500' },  // gray → amber
   ```

4. **Stacked bar 높이:** `h-2` (8px) → ✅ 이미 2임 (실제 8px). 확인 필요.

5. **MiniProgressBar → MiniDonut 교체:** (기존 P1-02와 동일)
   ```tsx
   function MiniDonut({ passed, failed, blocked, untested }: { ... }) {
     const total = passed + failed + blocked + untested;
     if (total === 0) return <div className="w-7 h-7 rounded-full bg-gray-100" />;
     const passPct = (passed / total) * 100;
     const failPct = (failed / total) * 100;
     const blockPct = (blocked / total) * 100;
     return (
       <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
         style={{ background: `conic-gradient(#16A34A 0% ${passPct}%, #DC2626 ${passPct}% ${passPct + failPct}%, #D97706 ${passPct + failPct}% ${passPct + failPct + blockPct}%, #E2E8F0 ${passPct + failPct + blockPct}% 100%)` }}>
         <div className="w-[18px] h-[18px] rounded-full bg-white" />
       </div>
     );
   }
   ```

6. **Run card 레이아웃 변경:**
   ```tsx
   // 현재: name + status + progressBar
   // 수정: MiniDonut + name (+ subtitle) + "23/40 TC" count
   <div className="flex items-center gap-2.5">
     <MiniDonut passed={run.passed} failed={run.failed} blocked={run.blocked - run.passed - run.failed} untested={run.untested} />
     <div className="flex-1 min-w-0">
       <div className="text-[12px] font-medium text-gray-800 truncate">{run.name}</div>
       <div className="text-[11px] text-gray-400">{STATUS_LABEL[run.status]}</div>
     </div>
     <span className="text-[11px] text-gray-500 flex-shrink-0">{run.passed + run.failed + run.blocked}/{run.total} TC</span>
   </div>
   ```

---

## Bug 3. Coverage Heatmap — 표시 라벨 및 데이터 소스 분석

### 목업 (A-7)

- **셀 라벨:** "Auth Module", "Payment", "Cart", "Profile", "Search", "Settings", "Upload" — **모듈/기능 이름**
- **셀 값:** "24 TC · 92%" — TC 수 + Pass Rate
- **크기:** TC 수에 비례
- **색상:** Pass Rate 기준 6단계 (90-100% dark green, 80-89% light green, 60-79% yellow, 40-59% orange, 0-39% red, Untested gray)

### 현재 구현 (`CoverageHeatmap.tsx`)

- **데이터 소스 (L67-78):**
  ```typescript
  const { data: tcs } = await supabase
    .from('test_cases')
    .select('id, folder')
    .eq('project_id', projectId);
  ```
  → `test_cases.folder` 필드 사용. 이것은 **테스트 케이스의 폴더 경로**.

- **셀 라벨 (L108):**
  ```typescript
  name: name.length > 20 ? name.slice(name.lastIndexOf('/') + 1) || name : name
  ```
  → 폴더 경로가 길면 마지막 세그먼트만 표시.

- **셀 크기:** `size: s.total` — 해당 폴더의 총 TC 수 (✅ 목업과 일치)
- **셀 색상 (L14-21):**
  ```typescript
  if (passRate >= 90) return '#16A34A';  // 목업: 90-100%
  if (passRate >= 70) return '#65A30D';  // 목업: 80-89% → 불일치
  if (passRate >= 50) return '#F59E0B';  // 목업: 60-79%
  if (passRate >= 30) return '#F97316';  // 목업: 40-59%
  return '#DC2626';                       // 목업: 0-39%
  ```

### 분석 결과

**라벨이 표시하는 것:** `test_cases.folder` 값 = **TC 폴더 이름**. 목업의 "Auth Module", "Payment" 등은 실제로 사용자가 TC를 분류한 폴더명에 해당.

**문제점:**
1. **폴더명이 경로 형식인 경우:** `/auth/login`, `/payment/checkout` 등으로 저장되어 있으면 트리맵에 경로가 그대로 표시됨. 목업은 "Auth Module" 같은 짧은 이름을 기대.
2. **폴더가 미설정된 TC:** `folder || '(root)'`로 fallback — "(root)" 셀이 크게 표시될 수 있음.
3. **색상 구간이 목업과 다름:** 이전 분석(P1-08)에서 지적, **아직 수정 안됨**.

**수정:**
1. **폴더명 정리:** 마지막 세그먼트 추출 + "(root)" → "Uncategorized" 또는 "General"로 변경:
   ```typescript
   const displayName = (folder: string) => {
     if (!folder || folder === '(root)') return 'General';
     const parts = folder.split('/').filter(Boolean);
     return parts[parts.length - 1] || folder;
   };
   ```
2. **색상 구간을 목업에 맞게 수정:**
   ```typescript
   if (passRate >= 90) return '#16A34A';  // 90-100%
   if (passRate >= 80) return '#4ADE80';  // 80-89% (목업의 light green)
   if (passRate >= 60) return '#FCD34D';  // 60-79% (목업의 yellow)
   if (passRate >= 40) return '#FB923C';  // 40-59% (목업의 orange)
   return '#EF4444';                       // 0-39%  (목업의 red)
   ```
3. **셀 값 표시 개선:** 현재 `{passRate}%`만 표시 → 목업처럼 `{total} TC · {passRate}%` 형식:
   ```typescript
   // CustomContent 내부
   <text ...>{size} TC · {passRate}%</text>
   ```

---

## Bug 4. TC Quality & Growth — 목업 vs 실제 구현 상세 비교

### 목업 (A-8 — "TC Quality & Growth")

| 요소 | 목업 사양 |
|------|-----------|
| **위젯 이름** | "TC Quality & Growth" |
| **헤더 아이콘** | `ri-test-tube-fill` (green) |
| **헤더 우측** | Green badge "248 Total" |
| **Area chart** | Growth (cumulative TC, green fill) — X축: W1~W10 주간 |
| **3-col grid** | Priority donut + Lifecycle bars + Automation gauge |
| **Priority donut** | conic-gradient, center "248", 4색 legend (Critical/High/Medium/Low) |
| **Lifecycle bars** | 3행: Active 180 (green bar), Draft 48 (amber bar), Deprecated 20 (gray bar) |
| **Automation gauge** | **반원형 SVG 게이지** 62%, "154 / 248 TCs" |

### 현재 구현 (`TCQualityAnalysis.tsx` — "TC Quality Analysis")

| 요소 | 현재 구현 | 차이 |
|------|-----------|------|
| **위젯 이름** | "TC Quality Analysis" | ⚠️ "Analysis" vs "& Growth" |
| **헤더 아이콘** | `ri-file-chart-line` (indigo) | ❌ 아이콘/색상 다름 |
| **헤더 우측** | Gray "{totalTCs} TCs" | ❌ Green badge 아님 |
| **Area chart** | ✅ Recharts AreaChart (12주 성장 추이), indigo 색상 | ⚠️ 목업은 green (#10B981) |
| **Layout** | **2-col grid** (Priority/Lifecycle 토글 + 자동화율) | ❌ 목업은 3-col grid |
| **Priority donut** | ✅ Recharts PieChart (inner/outer radius) | ✅ 기능 일치 |
| **Lifecycle** | Priority/Lifecycle **토글 전환** (같은 도넛 차트) | ❌ 목업은 별도 바 차트 |
| **Automation** | 텍스트 `3xl bold` + 수평 progress bar | ❌ 목업은 반원형 게이지 |
| **추가 기능** | "Top 실패 TC (최근 90일)" 섹션 | ✅ 목업에 없지만 유용한 추가 |

### 구체적 수정 사항

**파일:** `TCQualityAnalysis.tsx`

1. **위젯 이름/아이콘 변경:**
   ```tsx
   <i className="ri-test-tube-line text-emerald-500" />
   TC Quality & Growth
   // 헤더 우측:
   <span className="text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
     {data.totalTCs} Total
   </span>
   ```

2. **Area chart 색상:** indigo → green
   ```tsx
   <Area dataKey="total" stroke="#10B981" fill="#ECFDF5" fillOpacity={0.5} strokeWidth={2} name="누적 TC" />
   ```

3. **3-col 레이아웃으로 변경:**
   ```tsx
   <div className="grid grid-cols-3 gap-3">
     {/* Col 1: Priority donut (기존 PieChart 유지) */}
     {/* Col 2: Lifecycle bars (새로 구현) */}
     {/* Col 3: Automation gauge (새로 구현) */}
   </div>
   ```

4. **Lifecycle 바 차트 (Priority/Lifecycle 토글 제거, 별도 컴포넌트로):**
   ```tsx
   <div>
     <div className="text-[11px] font-semibold text-gray-500 mb-2 text-center">LIFECYCLE</div>
     <div className="space-y-2.5">
       {data.lifecycleCounts.map(lc => (
         <div key={lc.name}>
           <div className="flex justify-between text-[11px] text-gray-600 mb-1">
             <span>{lc.name}</span>
             <span className="font-semibold">{lc.value}</span>
           </div>
           <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
             <div className="h-full rounded-full" style={{
               width: `${(lc.value / data.totalTCs) * 100}%`,
               backgroundColor: lc.color,
             }} />
           </div>
         </div>
       ))}
     </div>
   </div>
   ```

5. **Automation 반원형 게이지:**
   ```tsx
   function AutomationGauge({ rate, automated, total }: { rate: number; automated: number; total: number }) {
     const angle = (rate / 100) * 180;
     return (
       <div className="text-center">
         <div className="text-[11px] font-semibold text-gray-500 mb-2">AUTOMATED</div>
         <div className="relative w-[100px] h-[54px] mx-auto overflow-hidden">
           <svg viewBox="0 0 100 54" className="w-full h-full">
             {/* Track arc */}
             <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round" />
             {/* Fill arc */}
             <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#8B5CF6" strokeWidth="10" strokeLinecap="round"
               strokeDasharray={`${(angle / 180) * 125.7} 125.7`} />
           </svg>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-lg font-bold text-gray-900">
             {rate}%
           </div>
         </div>
         <div className="text-[10px] text-gray-500 mt-1">{automated} / {total} TCs</div>
       </div>
     );
   }
   ```

---

## 수정 우선순위

| # | 버그 | 난이도 | 예상 시간 |
|---|------|--------|-----------|
| 1 | Bug 2: ExecutionSummary → Run Status (이름+아이콘+색상) | 쉬움 | 10분 |
| 2 | Bug 3: CoverageHeatmap 색상 구간 + 라벨 개선 | 쉬움 | 20분 |
| 3 | Bug 4: TC Quality 위젯 이름/아이콘/Area 색상/3-col 변경 | 중간 | 1.5시간 |
| 4 | Bug 1: Milestone active 필터 + burndown legend | 쉬움 | 20분 |
| 5 | Bug 2: Mini Donut 교체 | 중간 | 40분 |
| 6 | Bug 4: Automation 게이지 | 중간 | 40분 |
| 7 | Bug 4: Lifecycle 바 분리 | 중간 | 30분 |
