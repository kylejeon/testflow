# Dev1 개발 지시서: Dashboard Analytics & Activity Feed

## 개요

"Coming Soon" 플레이스홀더인 Analytics 탭과 Activity Feed 탭을 실제 기능으로 구현합니다.
기획안 `pm/pm-plan-dashboard-analytics-activity-feed.html`과 Desi 목업 `desi/dashboard-analytics-activity-feed-mockup.html`을 참고합니다.

**세션 ID:** `local_6725ced1-4655-4425-bdc3-09ae211bbf35`
**대상 파일:** `src/pages/project-detail/page.tsx` (현재 1600+ 줄)
**차트 라이브러리:** Recharts 3.2.0 (이미 `package.json`에 설치됨)
**Phase 구현 순서:** Phase 1 (핵심 차트 + 기본 피드) → Phase 2 (심층 분석 + 실시간) → Phase 3 (AI)

---

## 파일 구조 (신규 생성 파일)

```
src/
├── pages/project-detail/
│   ├── page.tsx                    ← 수정: 탭 컨텐츠 분리
│   ├── AnalyticsTab.tsx            ← NEW: Analytics 탭 메인 컨테이너
│   ├── ActivityFeedTab.tsx         ← NEW: Activity Feed 탭 메인 컨테이너
│   └── widgets/
│       ├── PassRateTrend.tsx       ← Widget A (Phase 1)
│       ├── MilestoneTracker.tsx    ← Widget E (Phase 1)
│       ├── ExecutionSummary.tsx    ← Widget H (Phase 1)
│       ├── TeamPerformance.tsx     ← Widget B (Phase 2, Pro+)
│       ├── FlakyDetector.tsx       ← Widget C (Phase 2, Pro+)
│       ├── CoverageHeatmap.tsx     ← Widget D (Phase 2)
│       ├── TCQualityAnalysis.tsx   ← Widget F (Phase 2)
│       ├── AIInsightsPanel.tsx     ← Widget G (Phase 3, Pro+)
│       └── TierGate.tsx            ← NEW: 티어 게이팅 블러 래퍼 (Phase 3)
├── hooks/
│   ├── usePassRateReport.ts        ← 기존 재사용
│   ├── useTeamActivity.ts          ← 기존 확장
│   ├── useActiveRuns.ts            ← 기존 재사용
│   ├── useTestCasesOverview.ts     ← 기존 재사용
│   ├── useFlakyDetection.ts        ← NEW (Phase 2)
│   ├── useCoverageHeatmap.ts       ← NEW (Phase 2)
│   ├── useMilestoneTracker.ts      ← NEW (Phase 1)
│   └── useActivityFeed.ts          ← NEW (Phase 1, Realtime Phase 2)
supabase/
├── migrations/
│   └── 20260401_activity_logs.sql  ← NEW: 테이블 + 트리거 + RLS
└── functions/
    └── generate-ai-insights/       ← NEW (Phase 3)
        └── index.ts
```

---

## ══════════════════════════════════════════════
## PART 1: DB 스키마 변경 (Phase 1 선행 작업)
## ══════════════════════════════════════════════

CEO 결정: **옵션 A — 전용 `activity_logs` 테이블** 사용.

### 1.1 activity_logs 테이블 생성

파일: `supabase/migrations/20260401_activity_logs.sql`

```sql
-- ============================================
-- activity_logs 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB DEFAULT '{}',
  is_highlighted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_activity_logs_project_created
  ON activity_logs(project_id, created_at DESC);
CREATE INDEX idx_activity_logs_actor
  ON activity_logs(actor_id, created_at DESC);
CREATE INDEX idx_activity_logs_category
  ON activity_logs(event_category, created_at DESC);
CREATE INDEX idx_activity_logs_type
  ON activity_logs(event_type);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their projects"
  ON activity_logs FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs FOR INSERT
  WITH CHECK (true);
```

### 1.2 event_type 정의 (14종)

| event_type | event_category | target_type | Phase |
|---|---|---|---|
| `test_result_passed` | `test_execution` | `test_result` | P0 |
| `test_result_failed` | `test_execution` | `test_result` | P0 |
| `test_result_blocked` | `test_execution` | `test_result` | P0 |
| `test_result_retest` | `test_execution` | `test_result` | P0 |
| `run_started` | `test_execution` | `test_run` | P0 |
| `run_completed` | `test_execution` | `test_run` | P0 |
| `run_progress_milestone` | `test_execution` | `test_run` | P1 |
| `tc_created` | `tc_management` | `test_case` | P0 |
| `tc_updated` | `tc_management` | `test_case` | P1 |
| `tc_comment_added` | `tc_management` | `test_case` | P0 |
| `milestone_created` | `milestone` | `milestone` | P0 |
| `milestone_status_changed` | `milestone` | `milestone` | P0 |
| `member_joined` | `team` | `project_member` | P1 |
| `member_role_changed` | `team` | `project_member` | P1 |

### 1.3 DB 트리거 (Phase 1: 핵심 4개)

```sql
-- ============================================
-- TRIGGER 1: test_results INSERT → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_test_result()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_tc_title TEXT;
  v_tc_priority TEXT;
  v_tc_custom_id TEXT;
  v_run_name TEXT;
  v_author_user_id UUID;
  v_is_highlighted BOOLEAN := false;
BEGIN
  -- test_case 정보 조회
  SELECT tc.title, tc.priority, tc.custom_id, tc.project_id
  INTO v_tc_title, v_tc_priority, v_tc_custom_id, v_project_id
  FROM test_cases tc
  WHERE tc.id = NEW.test_case_id;

  -- run 이름 조회
  SELECT name INTO v_run_name
  FROM test_runs WHERE id = NEW.run_id;

  -- author를 user_id로 매핑 (profiles.full_name = test_results.author)
  SELECT p.id INTO v_author_user_id
  FROM profiles p
  WHERE p.full_name = NEW.author
  LIMIT 1;

  -- Critical TC 실패 시 하이라이트
  IF v_tc_priority = 'critical' AND NEW.status = 'failed' THEN
    v_is_highlighted := true;
  END IF;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata, is_highlighted
  ) VALUES (
    v_project_id,
    v_author_user_id,
    'test_result_' || NEW.status,
    'test_execution',
    'test_result',
    NEW.id,
    jsonb_build_object(
      'tc_title', v_tc_title,
      'tc_custom_id', COALESCE(v_tc_custom_id, ''),
      'status', NEW.status,
      'run_name', v_run_name,
      'run_id', NEW.run_id,
      'test_case_id', NEW.test_case_id,
      'priority', v_tc_priority
    ),
    v_is_highlighted
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_test_result
  AFTER INSERT ON test_results
  FOR EACH ROW EXECUTE FUNCTION fn_log_test_result();

-- ============================================
-- TRIGGER 2: test_cases INSERT → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_test_case_created()
RETURNS TRIGGER AS $$
DECLARE
  v_actor_id UUID;
BEGIN
  SELECT p.id INTO v_actor_id
  FROM profiles p WHERE p.full_name = NEW.created_by LIMIT 1;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata
  ) VALUES (
    NEW.project_id,
    v_actor_id,
    'tc_created',
    'tc_management',
    'test_case',
    NEW.id,
    jsonb_build_object(
      'tc_title', NEW.title,
      'priority', NEW.priority,
      'folder', COALESCE(NEW.folder, ''),
      'lifecycle_status', NEW.lifecycle_status
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_test_case_created
  AFTER INSERT ON test_cases
  FOR EACH ROW EXECUTE FUNCTION fn_log_test_case_created();

-- ============================================
-- TRIGGER 3: test_runs status 변경 → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_run_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
  v_is_highlighted BOOLEAN := false;
BEGIN
  -- status 변경 시에만 기록
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'in_progress' AND (OLD.status = 'new' OR OLD.status = 'pending') THEN
      v_event_type := 'run_started';
    ELSIF NEW.status = 'completed' THEN
      v_event_type := 'run_completed';
    ELSE
      RETURN NEW; -- 기타 상태 변경은 무시
    END IF;

    INSERT INTO activity_logs (
      project_id, actor_id, event_type, event_category,
      target_type, target_id, metadata, is_highlighted
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      v_event_type,
      'test_execution',
      'test_run',
      NEW.id,
      jsonb_build_object(
        'run_name', NEW.name,
        'status', NEW.status,
        'old_status', OLD.status,
        'milestone_id', NEW.milestone_id
      ),
      v_is_highlighted
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_run_status
  AFTER UPDATE ON test_runs
  FOR EACH ROW EXECUTE FUNCTION fn_log_run_status_change();

-- ============================================
-- TRIGGER 4: milestones INSERT/UPDATE → activity_logs
-- ============================================
CREATE OR REPLACE FUNCTION fn_log_milestone_change()
RETURNS TRIGGER AS $$
DECLARE
  v_event_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event_type := 'milestone_created';
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_event_type := 'milestone_status_changed';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO activity_logs (
    project_id, actor_id, event_type, event_category,
    target_type, target_id, metadata
  ) VALUES (
    NEW.project_id,
    auth.uid(),
    v_event_type,
    'milestone',
    'milestone',
    NEW.id,
    jsonb_build_object(
      'milestone_name', NEW.name,
      'status', NEW.status,
      'old_status', CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      'end_date', NEW.end_date,
      'progress', NEW.progress
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_milestone_insert
  AFTER INSERT ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_log_milestone_change();

CREATE TRIGGER trg_log_milestone_update
  AFTER UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION fn_log_milestone_change();
```

### 1.4 Supabase Realtime 활성화

```sql
-- activity_logs 테이블에 Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
```

**주의:** Supabase Dashboard → Database → Replication 에서도 `activity_logs` 테이블의 Realtime을 활성화해야 합니다.

---

## ══════════════════════════════════════════════
## PART 2: page.tsx 수정 (탭 분리)
## ══════════════════════════════════════════════

### 2.1 현재 "Coming Soon" 플레이스홀더 교체

현재 위치: `src/pages/project-detail/page.tsx` 약 1585~1590줄

**현재 코드 (제거 대상):**
```tsx
{/* Coming Soon placeholder for analytics and activity tabs */}
```

**교체 코드:**
```tsx
import AnalyticsTab from './AnalyticsTab';
import ActivityFeedTab from './ActivityFeedTab';

// ... 탭 컨텐츠 렌더링 부분에서:
{dashboardTab === 'analytics' && (
  <AnalyticsTab
    projectId={project.id}
    milestones={milestones}
    subscriptionTier={userProfile?.subscription_tier ?? 1}
  />
)}

{dashboardTab === 'activity' && (
  <ActivityFeedTab
    projectId={project.id}
    subscriptionTier={userProfile?.subscription_tier ?? 1}
  />
)}
```

### 2.2 AnalyticsTab Props 인터페이스

```tsx
// src/pages/project-detail/AnalyticsTab.tsx

interface AnalyticsTabProps {
  projectId: string;
  milestones: Milestone[];
  subscriptionTier: number;  // 1=Free, 2=Starter, 3=Pro, 4-6=Ent
}
```

---

## ══════════════════════════════════════════════
## PART 3: Analytics 탭 구현
## ══════════════════════════════════════════════

### 3.0 AnalyticsTab.tsx — 메인 컨테이너

**레이아웃 (목업 A-1 참조):**
- 상단: 기간 필터 + 마일스톤 필터
- 그리드: 2열 기반, gap-5 (20px)

```tsx
// src/pages/project-detail/AnalyticsTab.tsx

import { useState } from 'react';
import PassRateTrend from './widgets/PassRateTrend';
import MilestoneTracker from './widgets/MilestoneTracker';
import ExecutionSummary from './widgets/ExecutionSummary';
// Phase 2:
// import TeamPerformance from './widgets/TeamPerformance';
// import FlakyDetector from './widgets/FlakyDetector';
// import CoverageHeatmap from './widgets/CoverageHeatmap';
// import TCQualityAnalysis from './widgets/TCQualityAnalysis';
// Phase 3:
// import AIInsightsPanel from './widgets/AIInsightsPanel';

type PeriodFilter = '7d' | '14d' | '30d' | 'all';

export default function AnalyticsTab({ projectId, milestones, subscriptionTier }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      {/* 필터 바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {(['7d', '14d', '30d', 'all'] as PeriodFilter[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                period === p
                  ? 'bg-indigo-500 text-white border-indigo-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {p === 'all' ? '전체' : p}
            </button>
          ))}
        </div>
        <select
          value={selectedMilestoneId ?? ''}
          onChange={e => setSelectedMilestoneId(e.target.value || null)}
          className="px-3 py-1.5 text-[0.8125rem] text-gray-700 bg-white border border-gray-200 rounded-lg"
        >
          <option value="">All Milestones</option>
          {milestones.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Row 1: Pass Rate Trend (full width) */}
      <PassRateTrend projectId={projectId} period={period} />

      {/* Row 2: Milestone (55%) + Run Status (45%) */}
      <div className="grid grid-cols-12 gap-5">
        <div className="col-span-7">
          <MilestoneTracker projectId={projectId} milestones={milestones} />
        </div>
        <div className="col-span-5">
          <ExecutionSummary projectId={projectId} />
        </div>
      </div>

      {/* Phase 2 위젯들 — 구현 시 주석 해제 */}
      {/* Row 3: Team Performance (full width, Pro+) */}
      {/* Row 4: Coverage Heatmap (50%) + TC Quality (50%) */}
      {/* Row 5: Flaky TC (50%, Pro+) + AI Insights (50%, Pro+) */}
    </div>
  );
}
```

### 3.1 Widget A: Pass Rate Trend (Phase 1)

파일: `src/pages/project-detail/widgets/PassRateTrend.tsx`
재사용 훅: `usePassRateReport` (src/hooks/usePassRateReport.ts)

**목업 참조:** Screen A-2

**컴포넌트 구조:**
```tsx
interface PassRateTrendProps {
  projectId: string;
  period: PeriodFilter;
}

export default function PassRateTrend({ projectId, period }: PassRateTrendProps) {
  // usePassRateReport 훅 호출
  // period 변환: '7d' → '7d', '14d' → 신규, '30d' → '30d', 'all' → 'all'
  const { data, isLoading } = usePassRateReport(projectId, mapPeriod(period));

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-gray-900">
          <i className="ri-line-chart-line text-indigo-500" />
          Pass Rate Trend
        </div>
        <span className="text-[11px] text-gray-400">Last {period}</span>
      </div>

      <div className="p-5">
        {/* KPI 카드 4개 (1행) */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <KPICard label="Overall Pass Rate" value={`${data.passRate}%`}
            delta={data.passRateDelta} deltaPositive={data.passRateDelta >= 0} />
          <KPICard label="Total Executed" value={data.totalExecuted.toLocaleString()}
            delta={data.executedDelta} deltaPositive={data.executedDelta >= 0} />
          <KPICard label="Failed" value={data.failed.toString()}
            delta={data.failedDelta} deltaPositive={data.failedDelta <= 0} />
          <KPICard label="Blocked" value={data.blocked.toString()}
            delta={data.blockedDelta} deltaPositive={data.blockedDelta <= 0} />
        </div>

        {/* Recharts 혼합 차트: Line (Pass Rate) + Bar (Execution Count) */}
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data.dailyPoints}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickFormatter={formatShortDate} />
            <YAxis yAxisId="left" domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#94A3B8' }}
              tickFormatter={v => `${v}%`} />
            <YAxis yAxisId="right" orientation="right"
              tick={{ fontSize: 11, fill: '#94A3B8' }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar yAxisId="right" dataKey="executionCount" fill="#E2E8F0"
              opacity={0.5} radius={[2, 2, 0, 0]} />
            <Line yAxisId="left" dataKey="passRate" stroke="#6366F1"
              strokeWidth={2} dot={{ r: 3, fill: '#6366F1' }}
              activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

**KPICard 공통 컴포넌트:**
```tsx
function KPICard({ label, value, delta, deltaPositive }: {
  label: string; value: string; delta: number; deltaPositive: boolean;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3.5">
      <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">
        {label}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
        deltaPositive
          ? 'text-emerald-600 bg-emerald-50'
          : 'text-red-600 bg-red-50'
      }`}>
        {deltaPositive ? '▲' : '▼'} {Math.abs(delta)}
        {typeof delta === 'number' && label.includes('Rate') ? '%' : ''}
      </span>
    </div>
  );
}
```

**데이터 쿼리 (usePassRateReport 훅 내부 — 기존):**
```sql
-- 이미 구현됨: test_results WHERE project_id = ? AND created_at >= ?
-- GROUP BY DATE(created_at)
-- 델타 계산: 현재 기간 vs 이전 동일 기간
```

### 3.2 Widget E: Milestone Tracker (Phase 1)

파일: `src/pages/project-detail/widgets/MilestoneTracker.tsx`
신규 훅: `src/hooks/useMilestoneTracker.ts`

**목업 참조:** Screen A-3

```tsx
interface MilestoneTrackerProps {
  projectId: string;
  milestones: Milestone[];
}
```

**useMilestoneTracker 훅 — 신규 작성:**
```tsx
// src/hooks/useMilestoneTracker.ts

interface MilestoneTrackerData {
  milestones: MilestoneWithStatus[];
  burndownData: BurndownPoint[];  // 가장 큰 활성 마일스톤의 번다운
}

interface MilestoneWithStatus {
  id: string;
  name: string;
  progress: number;
  status: 'on_track' | 'at_risk' | 'overdue';
  daysRemaining: number;
  remainingTCs: number;
  dailyVelocity: number;
  estimatedCompletion: Date;
  endDate: Date;
}

interface BurndownPoint {
  date: string;
  ideal: number;   // 이상적 잔여 TC
  actual: number;   // 실제 잔여 TC
}
```

**위험 판정 로직:**
```typescript
function calculateMilestoneStatus(milestone, executedResults): MilestoneStatus {
  const daysRemaining = differenceInDays(milestone.end_date, new Date());
  const remainingTCs = totalTCs - executedTCs;
  const elapsedDays = differenceInDays(new Date(), milestone.start_date);
  const dailyVelocity = executedTCs / Math.max(elapsedDays, 1);
  const estimatedDaysToComplete = remainingTCs / Math.max(dailyVelocity, 0.1);

  if (daysRemaining < 0 && milestone.progress < 100) return 'overdue';
  if (estimatedDaysToComplete > daysRemaining) return 'at_risk';
  return 'on_track';
}
```

**Recharts 번다운 차트:**
```tsx
<ResponsiveContainer width="100%" height={180}>
  <AreaChart data={burndownData}>
    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} />
    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
    <Tooltip />
    <Area dataKey="ideal" stroke="#CBD5E1" strokeDasharray="6 3"
      fill="none" strokeWidth={1.5} />
    <Area dataKey="actual" stroke="#6366F1" fill="#EEF2FF"
      fillOpacity={0.4} strokeWidth={2.5}
      dot={{ r: 3, fill: '#6366F1' }} />
  </AreaChart>
</ResponsiveContainer>
```

**마일스톤 카드 (가로 스크롤):**
```tsx
<div className="flex gap-3 overflow-x-auto pb-1">
  {milestones.map(ms => (
    <div key={ms.id} className="min-w-[200px] border border-gray-200 rounded-lg p-3.5 flex-shrink-0">
      {/* 상태 뱃지 */}
      <div className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full mb-2 ${
        ms.status === 'on_track' ? 'bg-emerald-50 text-emerald-600' :
        ms.status === 'at_risk' ? 'bg-amber-50 text-amber-600' :
        'bg-red-50 text-red-600'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full ${
          ms.status === 'on_track' ? 'bg-emerald-500' :
          ms.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'
        }`} />
        {ms.status === 'on_track' ? 'On Track' : ms.status === 'at_risk' ? 'At Risk' : 'Overdue'}
      </div>
      {/* 이름 */}
      <div className="text-sm font-semibold text-gray-900 mb-2.5">{ms.name}</div>
      {/* 진행률 바 */}
      <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-2">
        <div className={`h-full rounded-full ${statusColor(ms.status)}`}
          style={{ width: `${ms.progress}%` }} />
      </div>
      {/* 메타 */}
      <div className={`text-xs font-medium ${
        ms.status === 'overdue' ? 'text-red-500' : 'text-gray-500'
      }`}>
        {ms.progress}% · D{ms.daysRemaining >= 0 ? `-${ms.daysRemaining}` : `+${Math.abs(ms.daysRemaining)}`}
        {ms.endDate && ` (${format(ms.endDate, 'MMM d')})`} · {ms.remainingTCs} remaining
      </div>
    </div>
  ))}
</div>
```

### 3.3 Widget H: Execution Summary (Phase 1)

파일: `src/pages/project-detail/widgets/ExecutionSummary.tsx`
재사용 훅: `useActiveRuns`

**목업 참조:** Screen A-4

```tsx
interface ExecutionSummaryProps {
  projectId: string;
}
```

**구현 포인트:**
1. **요약 그리드 (3열):** Active / Completed / Paused+Review 카운트
2. **스택 진행률 바:** Passed(#16A34A) / Failed(#DC2626) / Blocked(#D97706) / Untested(#E2E8F0)
3. **Run 카드 리스트:** 미니 도넛 + Run 이름 + TC 진행률
4. "View all runs →" 링크 → Runs 탭 이동

**스택 바 컴포넌트:**
```tsx
function StackedProgressBar({ passed, failed, blocked, untested }: StatusCounts) {
  const total = passed + failed + blocked + untested;
  if (total === 0) return null;

  return (
    <>
      <div className="h-2 rounded-full flex overflow-hidden">
        <div style={{ width: `${(passed/total)*100}%` }} className="bg-green-600" />
        <div style={{ width: `${(failed/total)*100}%` }} className="bg-red-600" />
        <div style={{ width: `${(blocked/total)*100}%` }} className="bg-amber-600" />
        <div style={{ width: `${(untested/total)*100}%` }} className="bg-gray-200" />
      </div>
      <div className="flex gap-3 mt-2 flex-wrap">
        <LegendItem color="bg-green-600" label={`Passed ${passed}`} />
        <LegendItem color="bg-red-600" label={`Failed ${failed}`} />
        <LegendItem color="bg-amber-600" label={`Blocked ${blocked}`} />
        <LegendItem color="bg-gray-300" label={`Untested ${untested}`} />
      </div>
    </>
  );
}
```

### 3.4 Widget B: Team Performance (Phase 2, Pro+)

파일: `src/pages/project-detail/widgets/TeamPerformance.tsx`
확장 훅: `useTeamActivity` (기존 확장)

**목업 참조:** Screen A-5

**데이터 쿼리:**
```sql
-- test_results에서 author별 집계
SELECT
  author,
  COUNT(*) as total_executed,
  COUNT(*) FILTER (WHERE status = 'passed') as passed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked
FROM test_results
WHERE project_id = ? AND created_at >= ?
GROUP BY author
ORDER BY total_executed DESC;
```

**메트릭 정의:**
| 메트릭 | 계산 |
|--------|------|
| 실행 건수 | `COUNT(test_results) WHERE author = member` |
| 버그 발견율 | `COUNT(failed) / COUNT(executed) × 100` |
| Pass Rate | `COUNT(passed) / COUNT(executed) × 100` |
| 7일 스파크라인 | 일별 `COUNT(test_results)` — 최근 7일 |

**Recharts 스택 바 차트:**
```tsx
<ResponsiveContainer width="100%" height={200}>
  <BarChart data={teamData} layout="vertical">
    <XAxis type="number" tick={{ fontSize: 11 }} />
    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
    <Tooltip />
    <Bar dataKey="passed" stackId="a" fill="#16A34A" radius={[0, 0, 0, 0]} />
    <Bar dataKey="failed" stackId="a" fill="#DC2626" />
    <Bar dataKey="blocked" stackId="a" fill="#D97706" radius={[0, 4, 4, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### 3.5 Widget C: Flaky TC Detector (Phase 2, Pro+)

파일: `src/pages/project-detail/widgets/FlakyDetector.tsx`
신규 훅: `src/hooks/useFlakyDetection.ts`

**목업 참조:** Screen A-6

**Flaky Score 계산:**
```typescript
// 최근 10회 실행 결과에서 상태 전환 횟수
function calculateFlakyScore(results: string[]): number {
  if (results.length < 2) return 0;
  let transitions = 0;
  for (let i = 1; i < results.length; i++) {
    if (results[i] !== results[i - 1]) transitions++;
  }
  return Math.round((transitions / (results.length - 1)) * 100);
}
// Score ≥ 50% → Flaky로 분류
```

**데이터 쿼리 (RPC 함수 권장):**
```sql
-- Supabase RPC: get_flaky_test_cases
-- 각 TC의 최근 10건 결과를 가져와 Flaky Score 계산
WITH ranked_results AS (
  SELECT
    test_case_id,
    status,
    ROW_NUMBER() OVER (PARTITION BY test_case_id ORDER BY created_at DESC) as rn
  FROM test_results
  WHERE run_id IN (SELECT id FROM test_runs WHERE project_id = $1)
)
SELECT
  test_case_id,
  ARRAY_AGG(status ORDER BY rn) as recent_statusesFROM ranked_results
WHERE rn <= 10
GROUP BY test_case_id
HAVING COUNT(*) >= 3;  -- 최소 3회 실행된 TC만
```

**시퀀스 도트 시각화 (목업 A-6):**
```tsx
function SequenceDots({ statuses }: { statuses: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {statuses.map((s, i) => (
        <span key={i} className={`w-2 h-2 rounded-full ${
          s === 'passed' ? 'bg-green-600' :
          s === 'failed' ? 'border-[1.5px] border-red-600 bg-transparent' :
          'bg-gray-300'
        }`} />
      ))}
    </div>
  );
}
```

### 3.6 Widget D: Coverage Heatmap (Phase 2)

파일: `src/pages/project-detail/widgets/CoverageHeatmap.tsx`
신규 훅: `src/hooks/useCoverageHeatmap.ts`

**목업 참조:** Screen A-7

**Recharts Treemap 사용:**
```tsx
import { Treemap, ResponsiveContainer } from 'recharts';

// 폴더별 데이터: { name, size(=TC수), passRate }
// 색상: passRate 기반 — 녹색(100%) ~ 빨강(0%)

function getHeatmapColor(passRate: number): string {
  if (passRate >= 90) return '#16A34A'; // green
  if (passRate >= 70) return '#F59E0B'; // amber
  if (passRate >= 50) return '#F97316'; // orange
  return '#DC2626'; // red
}

<ResponsiveContainer width="100%" height={210}>
  <Treemap
    data={folderData}
    dataKey="size"
    stroke="#fff"
    content={<CustomTreemapCell />}
  />
</ResponsiveContainer>
```

**데이터 쿼리:**
```sql
-- 폴더별 TC 수 + 최신 결과 상태 집계
SELECT
  tc.folder,
  COUNT(tc.id) as total_tcs,
  COUNT(tr.id) FILTER (WHERE tr.status = 'passed') as passed,
  COUNT(tr.id) FILTER (WHERE tr.status = 'failed') as failed,
  COUNT(tc.id) - COUNT(tr.id) as untested
FROM test_cases tc
LEFT JOIN LATERAL (
  SELECT status, id FROM test_results
  WHERE test_case_id = tc.id
  ORDER BY created_at DESC LIMIT 1
) tr ON true
WHERE tc.project_id = ?
GROUP BY tc.folder;
```

### 3.7 Widget F: TC Quality Analysis (Phase 2)

파일: `src/pages/project-detail/widgets/TCQualityAnalysis.tsx`
재사용 훅: `useTestCasesOverview`

**목업 참조:** Screen A-8

**구현 요소:**
1. **TC 성장 에어리어 차트** — Recharts AreaChart, 주별 누적 TC 수
2. **Priority 도넛** — Recharts PieChart (Critical/High/Medium/Low)
3. **Lifecycle 바** — 스택 바 (Active/Draft/Deprecated)
4. **자동화율 게이지** — 반원 게이지 (is_automated=true 비율)
5. **Top 10 실패 TC 테이블** — 실패 횟수 순 정렬

**Priority 도넛 색상:**
```typescript
const PRIORITY_COLORS = {
  critical: '#EF4444',  // red
  high: '#F59E0B',      // amber
  medium: '#6366F1',    // indigo
  low: '#94A3B8',       // gray
};
```

### 3.8 Widget G: AI Insights Panel (Phase 3, Pro+)

파일: `src/pages/project-detail/widgets/AIInsightsPanel.tsx`

**목업 참조:** Screen A-9

구현 방식:
1. **Phase 3a — 규칙 기반:** 프론트엔드에서 임계값 기반 인사이트 생성
2. **Phase 3b — LLM 기반:** Edge Function 호출하여 자연어 요약

**규칙 기반 인사이트 엔진:**
```typescript
interface InsightItem {
  type: 'daily_summary' | 'completion_forecast' | 'risk_warning' | 'team_balance' | 'quality_trend';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  actionUrl?: string;
}

function generateRuleBasedInsights(data: AnalyticsData): InsightItem[] {
  const insights: InsightItem[] = [];

  // Pass Rate 급변 감지
  if (Math.abs(data.passRateDelta) > 10) {
    insights.push({
      type: 'risk_warning',
      severity: data.passRateDelta < -10 ? 'critical' : 'warning',
      message: `Pass Rate가 이전 기간 대비 ${data.passRateDelta > 0 ? '+' : ''}${data.passRateDelta}% 변동했습니다.`,
      timestamp: new Date(),
    });
  }

  // Flaky TC 존재 경고
  if (data.flakyCount > 0) {
    insights.push({
      type: 'quality_trend',
      severity: 'warning',
      message: `${data.flakyCount}개의 Flaky TC가 감지되었습니다. 테스트 신뢰도 개선이 필요합니다.`,
      timestamp: new Date(),
    });
  }

  // 마일스톤 기한 위험
  data.milestones.filter(m => m.status === 'at_risk').forEach(m => {
    insights.push({
      type: 'completion_forecast',
      severity: 'warning',
      message: `'${m.name}' 마일스톤이 현재 속도로는 기한 내 완료가 어려울 수 있습니다.`,
      timestamp: new Date(),
    });
  });

  return insights;
}
```

**인사이트 카드 UI:**
```tsx
function InsightCard({ insight }: { insight: InsightItem }) {
  const bgColor = {
    info: 'bg-indigo-50 border-indigo-200',
    warning: 'bg-amber-50 border-amber-200',
    critical: 'bg-red-50 border-red-200',
  }[insight.severity];

  return (
    <div className={`rounded-lg p-3.5 border ${bgColor} mb-2.5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full ...">
          {insightTypeLabel(insight.type)}
        </span>
        <span className="text-[11px] text-gray-400">{formatRelativeTime(insight.timestamp)}</span>
      </div>
      <p className="text-[13px] text-gray-700 leading-relaxed">{insight.message}</p>
    </div>
  );
}
```

---

## ══════════════════════════════════════════════
## PART 4: Activity Feed 탭 구현
## ══════════════════════════════════════════════

### 4.0 ActivityFeedTab.tsx — 메인 컨테이너

파일: `src/pages/project-detail/ActivityFeedTab.tsx`
신규 훅: `src/hooks/useActivityFeed.ts`

**목업 참조:** Screen B-1 ~ B-6

```tsx
interface ActivityFeedTabProps {
  projectId: string;
  subscriptionTier: number;
}

export default function ActivityFeedTab({ projectId, subscriptionTier }: ActivityFeedTabProps) {
  const [filters, setFilters] = useState<FeedFilters>({
    category: null,       // null = 전체
    actorId: null,        // null = 전체 팀원
    dateRange: '7d',      // '1d' | '7d' | '30d' | 'custom'
    searchQuery: '',
  });

  const { feedItems, isLoading, loadMore, hasMore, newEventCount } =
    useActivityFeed(projectId, filters, subscriptionTier);

  return (
    <div>
      {/* 실시간 인디케이터 (Starter+) */}
      {subscriptionTier >= 2 && (
        <div className="flex items-center gap-2 px-5 py-2 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-emerald-600">Live</span>
          <span className="text-gray-300">|</span>
          <span>실시간 업데이트 활성</span>
        </div>
      )}

      {/* 새 이벤트 배너 */}
      {newEventCount > 0 && (
        <div className="mx-5 mb-2 text-center py-2 bg-indigo-500 text-white text-[13px]
          font-medium rounded-lg cursor-pointer shadow-lg shadow-indigo-500/30"
          onClick={() => scrollToTop()}>
          {newEventCount}개의 새 활동이 있습니다
        </div>
      )}

      {/* 필터 바 */}
      <FilterBar filters={filters} onChange={setFilters} projectId={projectId} />

      {/* AI 일일 요약 (Pro+ 전용) */}
      {subscriptionTier >= 3 && <AIDailySummary projectId={projectId} />}

      {/* 피드 아이템 리스트 */}
      <div>
        {groupByDate(feedItems).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            {/* 날짜 구분선 */}
            <div className="flex items-center gap-3 px-5 py-2.5">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{dateLabel}</span>
              <div className="flex-1 border-t border-gray-200" />
            </div>
            {/* 피드 아이템들 */}
            {items.map(item => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        ))}
      </div>

      {/* 더 보기 */}
      {hasMore && (
        <button onClick={loadMore} className="w-full py-3 text-sm text-indigo-500 font-semibold">
          더 보기 ▼
        </button>
      )}
    </div>
  );
}
```

### 4.1 useActivityFeed 훅

파일: `src/hooks/useActivityFeed.ts`

```typescript
interface FeedFilters {
  category: string | null;     // 'test_execution' | 'tc_management' | 'milestone' | 'team' | null
  actorId: string | null;
  dateRange: '1d' | '7d' | '30d' | 'custom';
  searchQuery: string;
}

interface ActivityFeedItem {
  id: string;
  event_type: string;
  event_category: string;
  actor_id: string;
  actor_name: string;         // JOIN profiles
  actor_avatar_emoji: string; // JOIN profiles
  target_type: string;
  target_id: string;
  metadata: Record<string, any>;
  is_highlighted: boolean;
  created_at: string;
}

export function useActivityFeed(
  projectId: string,
  filters: FeedFilters,
  subscriptionTier: number
) {
  const [feedItems, setFeedItems] = useState<ActivityFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [newEventCount, setNewEventCount] = useState(0);

  // 초기 로드 + 필터 변경 시 리로드
  useEffect(() => {
    loadFeed();
  }, [projectId, filters]);

  async function loadFeed() {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        actor:profiles!actor_id(full_name, avatar_emoji)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters.category) {
      query = query.eq('event_category', filters.category);
    }
    if (filters.actorId) {
      query = query.eq('actor_id', filters.actorId);
    }

    // 날짜 범위
    const dateFrom = getDateFrom(filters.dateRange);
    query = query.gte('created_at', dateFrom.toISOString());

    // 티어별 제한
    const limit = subscriptionTier >= 3 ? 100 :
                  subscriptionTier >= 2 ? 100 : 20;
    query = query.limit(limit);

    const { data, error } = await query;
    if (data) setFeedItems(data);
  }

  // 커서 기반 페이지네이션
  async function loadMore() {
    if (!cursor) return;
    const { data } = await supabase
      .from('activity_logs')
      .select('*, actor:profiles!actor_id(full_name, avatar_emoji)')
      .eq('project_id', projectId)
      .lt('created_at', cursor)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      setFeedItems(prev => [...prev, ...data]);
      setCursor(data[data.length - 1].created_at);
    }
  }

  // Supabase Realtime 구독 (Phase 2, Starter+)
  useEffect(() => {
    if (subscriptionTier < 2) return;

    const channel = supabase
      .channel(`activity-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_logs',
        filter: `project_id=eq.${projectId}`,
      }, (payload) => {
        setNewEventCount(prev => prev + 1);
        // 새 이벤트를 피드 상단에 추가 (사용자가 배너 클릭 시)
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [projectId, subscriptionTier]);

  return { feedItems, isLoading, loadMore, hasMore: !!cursor, newEventCount };
}
```

### 4.2 FeedItem 컴포넌트

**목업 참조:** Screen B-2 (이벤트 아이콘), B-4 (하이라이트), B-5 (실시간)

```tsx
// 이벤트 아이콘 + 색상 매핑
const EVENT_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  test_result_passed:  { icon: 'ri-checkbox-circle-fill', color: '#16A34A', bgColor: '#ECFDF5' },
  test_result_failed:  { icon: 'ri-close-circle-fill',    color: '#DC2626', bgColor: '#FEF2F2' },
  test_result_blocked: { icon: 'ri-forbid-fill',          color: '#D97706', bgColor: '#FFFBEB' },
  test_result_retest:  { icon: 'ri-refresh-line',         color: '#7C3AED', bgColor: '#F5F3FF' },
  run_started:         { icon: 'ri-play-circle-fill',     color: '#6366F1', bgColor: '#EEF2FF' },
  run_completed:       { icon: 'ri-flag-fill',            color: '#10B981', bgColor: '#ECFDF5' },
  tc_created:          { icon: 'ri-file-add-line',        color: '#6366F1', bgColor: '#EEF2FF' },
  tc_updated:          { icon: 'ri-edit-2-line',          color: '#F59E0B', bgColor: '#FFFBEB' },
  tc_comment_added:    { icon: 'ri-chat-1-line',          color: '#64748B', bgColor: '#F8FAFC' },
  milestone_created:   { icon: 'ri-flag-2-fill',          color: '#F59E0B', bgColor: '#FFFBEB' },
  milestone_status_changed: { icon: 'ri-checkbox-circle-fill', color: '#10B981', bgColor: '#ECFDF5' },
  member_joined:       { icon: 'ri-user-add-line',        color: '#6366F1', bgColor: '#EEF2FF' },
  member_role_changed: { icon: 'ri-shield-user-line',     color: '#F59E0B', bgColor: '#FFFBEB' },
};

function FeedItem({ item }: { item: ActivityFeedItem }) {
  const config = EVENT_CONFIG[item.event_type] ?? { icon: 'ri-information-line', color: '#64748B', bgColor: '#F8FAFC' };

  // 하이라이트 스타일 (Critical 실패, 낮은 Pass Rate 등)
  const highlightClass = item.is_highlighted
    ? item.event_type.includes('failed')
      ? 'border-l-[3px] border-l-red-500 bg-red-50/50 pl-[13px]'
      : 'border-l-[3px] border-l-amber-500 bg-amber-50/50 pl-[13px]'
    : '';

  return (
    <div className={`flex gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${highlightClass}`}>
      {/* 아이콘 */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: config.bgColor }}>
        <i className={`${config.icon} text-base`} style={{ color: config.color }} />
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-gray-700 leading-relaxed">
          <strong className="text-gray-900">{item.actor_name || '시스템'}</strong>
          {' '}{formatEventMessage(item)}
        </p>
        {/* 댓글 내용이 있으면 노트 표시 */}
        {item.metadata.comment && (
          <div className="mt-1 text-xs text-gray-600 p-1.5 bg-gray-50 rounded border-l-2 border-gray-300">
            💬 "{item.metadata.comment}"
          </div>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {item.metadata.run_name && `Run: ${item.metadata.run_name} · `}
          {formatRelativeTime(item.created_at)}
        </p>
      </div>

      {/* 시간 */}
      <span className="text-[11px] text-gray-400 flex-shrink-0 whitespace-nowrap">
        {formatRelativeTime(item.created_at)}
      </span>
    </div>
  );
}
```

### 4.3 이벤트 메시지 포맷터

```typescript
function formatEventMessage(item: ActivityFeedItem): string {
  const m = item.metadata;
  switch (item.event_type) {
    case 'test_result_passed':
      return `${m.tc_custom_id ? m.tc_custom_id + ' ' : ''}"${m.tc_title}"를 Passed로 변경`;
    case 'test_result_failed':
      return `${m.tc_custom_id ? m.tc_custom_id + ' ' : ''}"${m.tc_title}"가 Failed`;
    case 'test_result_blocked':
      return `${m.tc_custom_id ? m.tc_custom_id + ' ' : ''}"${m.tc_title}"를 Blocked으로 변경`;
    case 'test_result_retest':
      return `${m.tc_custom_id ? m.tc_custom_id + ' ' : ''}"${m.tc_title}"를 Retest로 변경`;
    case 'run_started':
      return `Run "${m.run_name}"을 시작함`;
    case 'run_completed':
      return `Run "${m.run_name}"이 완료됨`;
    case 'tc_created':
      return `TC "${m.tc_title}" 생성 (${m.priority}, ${m.folder || 'root'})`;
    case 'tc_updated':
      return `TC "${m.tc_title}" 수정됨`;
    case 'tc_comment_added':
      return `TC "${m.tc_title}"에 댓글 추가`;
    case 'milestone_created':
      return `마일스톤 "${m.milestone_name}" 생성 (기한: ${m.end_date ? format(new Date(m.end_date), 'M/d') : '미정'})`;
    case 'milestone_status_changed':
      return `마일스톤 "${m.milestone_name}" 상태: ${m.old_status} → ${m.status}`;
    case 'member_joined':
      return `프로젝트에 참여함`;
    case 'member_role_changed':
      return `역할이 변경됨`;
    default:
      return `${item.event_type}`;
  }
}
```

### 4.4 필터 바 컴포넌트

**목업 참조:** Screen B-3

```tsx
function FilterBar({ filters, onChange, projectId }: FilterBarProps) {
  // project_members 에서 팀원 목록 조회
  const { data: members } = useQuery(['members', projectId], ...);

  return (
    <div className="flex items-center justify-between px-5 py-3 flex-wrap gap-2">
      {/* 카테고리 필터 */}
      <div className="flex items-center gap-1">
        {[
          { value: null, label: '전체' },
          { value: 'test_execution', label: '테스트 실행' },
          { value: 'tc_management', label: 'TC 관리' },
          { value: 'milestone', label: '마일스톤' },
          { value: 'team', label: '팀' },
        ].map(opt => (
          <button key={opt.label}
            onClick={() => onChange({ ...filters, category: opt.value })}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
              filters.category === opt.value
                ? 'bg-indigo-500 text-white border-indigo-500'
                : 'bg-white text-gray-500 border-gray-200'
            }`}>
            {opt.label}
          </button>
        ))}
      </div>

      {/* 팀원 + 날짜 + 검색 */}
      <div className="flex items-center gap-2">
        <select value={filters.actorId ?? ''}
          onChange={e => onChange({ ...filters, actorId: e.target.value || null })}
          className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="">팀원: 전체</option>
          {members?.map(m => <option key={m.id} value={m.user_id}>{m.full_name}</option>)}
        </select>

        <select value={filters.dateRange}
          onChange={e => onChange({ ...filters, dateRange: e.target.value as any })}
          className="text-[13px] border border-gray-200 rounded-lg px-3 py-1.5">
          <option value="1d">오늘</option>
          <option value="7d">최근 7일</option>
          <option value="30d">최근 30일</option>
        </select>

        {/* 검색 (Starter+) */}
        <div className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-1.5 w-[180px]">
          <i className="ri-search-line text-sm text-gray-400" />
          <input type="text" placeholder="검색..."
            value={filters.searchQuery}
            onChange={e => onChange({ ...filters, searchQuery: e.target.value })}
            className="text-[13px] text-gray-700 bg-transparent outline-none flex-1" />
        </div>
      </div>
    </div>
  );
}
```

### 4.5 AI 일일 요약 (Phase 3, Pro+)

**목업 참조:** Screen B-4

```tsx
function AIDailySummary({ projectId }: { projectId: string }) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetchAISummary(projectId).then(setSummary);
  }, [projectId]);

  if (!summary) return null;

  return (
    <div className="mx-5 mb-3 rounded-xl p-4 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
      <div className="flex items-center gap-2.5 mb-3 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <span className="text-xl">🤖</span>
        <span className="text-[15px] font-semibold text-gray-900 flex-1">AI Daily Summary</span>
        <span className="pro-badge">Pro+</span>
        <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-gray-400`} />
      </div>
      {isOpen && (
        <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
      )}
    </div>
  );
}
```

### 4.6 중요 이벤트 하이라이트 규칙

| 이벤트 | 조건 | 표시 |
|--------|------|------|
| Critical TC 실패 | `priority = 'critical' AND status = 'failed'` | 🔴 빨간 좌측 보더 + `is_highlighted = true` |
| Run 완료 (저 Pass Rate) | Run 완료 시 Pass Rate < 70% | 🟠 주황 보더 |
| 마일스톤 기한 임박 | `progress < 80% AND daysRemaining < 3` | ⏰ 긴급 뱃지 |
| 대량 실패 연속 | 같은 Run에서 5분 내 3건+ 실패 | 그룹 카드 강조 |

하이라이트 판단은 DB 트리거 (`is_highlighted` 컬럼)에서 Critical TC 실패는 자동 설정. 나머지는 클라이언트에서 추가 판단.

---

## ══════════════════════════════════════════════
## PART 5: AI Edge Function (Phase 3)
## ══════════════════════════════════════════════

파일: `supabase/functions/generate-ai-insights/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const { projectId, type } = await req.json();
  // type: 'daily_summary' | 'insights' | 'activity_summary'

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // 1. 프로젝트 데이터 집계
  const analyticsData = await gatherAnalyticsData(supabase, projectId);

  // 2. LLM 프롬프트 구성
  const prompt = buildPrompt(type, analyticsData);

  // 3. LLM 호출 (OpenAI 또는 Anthropic)
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const result = await response.json();
  const insightText = result.content[0].text;

  return new Response(JSON.stringify({ insight: insightText }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

function buildPrompt(type: string, data: any): string {
  if (type === 'daily_summary') {
    return `다음은 QA 프로젝트의 오늘 활동 데이터입니다. 3~5줄로 한국어 요약해주세요.
오늘 실행: ${data.todayExecuted}건, Pass Rate: ${data.todayPassRate}%
가장 활발한 팀원: ${data.topMember} (${data.topMemberCount}건)
새 실패: ${data.newFailures}건 (주요 폴더: ${data.topFailFolder})
마일스톤: ${data.activeMilestones}개 활성 (위험: ${data.atRiskCount}개)
요약은 팀 리더가 빠르게 읽을 수 있도록 핵심만 전달해주세요.`;
  }
  // ... 다른 type별 프롬프트
}
```

---

## ══════════════════════════════════════════════
## PART 6: 티어 게이팅
## ══════════════════════════════════════════════

### 6.1 TierGate 래퍼 컴포넌트

```tsx
// src/pages/project-detail/widgets/TierGate.tsx

interface TierGateProps {
  requiredTier: number;     // 2=Starter, 3=Pro
  currentTier: number;
  featureName: string;
  children: React.ReactNode;
}

export function TierGate({ requiredTier, currentTier, featureName, children }: TierGateProps) {
  if (currentTier >= requiredTier) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="filter blur-[5px] pointer-events-none opacity-60">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2">
        <i className="ri-lock-line text-3xl text-violet-500" />
        <p className="text-sm font-medium text-gray-700 text-center">
          {featureName}은 {requiredTier >= 3 ? 'Professional' : 'Starter'} 이상에서 사용 가능합니다
        </p>
        <a href="/pricing" className="text-[13px] font-semibold text-indigo-500 hover:underline">
          업그레이드 →
        </a>
      </div>
    </div>
  );
}
```

### 6.2 티어 매핑 테이블

| 기능 | Free (1) | Starter (2) | Professional+ (3+) |
|------|----------|-------------|---------------------|
| A. Pass Rate 트렌드 | ✅ 7일 | ✅ 30일 | ✅ 전체 |
| E. 마일스톤 트래커 | ✅ 1개 | ✅ 5개 | ✅ 무제한 |
| H. 실행 현황 | ✅ | ✅ | ✅ |
| B. 팀 성과 | 🔒 | 🔒 | ✅ |
| C. Flaky TC | 🔒 | ✅ 상위 5 | ✅ 전체 |
| D. 커버리지 히트맵 | ✅ 기본 | ✅ | ✅ + 드릴다운 |
| F. TC 품질 | ✅ 기본 | ✅ | ✅ |
| G. AI 인사이트 | 🔒 | 🔒 | ✅ |
| Feed (기본) | 최근 20건 | 최근 100건 | 무제한 |
| Feed (실시간) | 🔒 | ✅ | ✅ |
| Feed (AI 요약) | 🔒 | 🔒 | ✅ |
| Feed (검색) | 🔒 | ✅ | ✅ |

### 6.3 사용 예시

```tsx
// AnalyticsTab.tsx 내에서
<TierGate requiredTier={3} currentTier={subscriptionTier} featureName="팀원별 성과 분석">
  <TeamPerformance projectId={projectId} period={period} />
</TierGate>

<TierGate requiredTier={3} currentTier={subscriptionTier} featureName="AI 인사이트">
  <AIInsightsPanel projectId={projectId} />
</TierGate>
```

---

## ══════════════════════════════════════════════
## PART 7: Phase별 구현 순서
## ══════════════════════════════════════════════

### Phase 1: 핵심 Analytics + 기본 Feed (2~3주)

| # | 작업 | 예상 공수 |
|---|------|----------|
| 1-1 | `activity_logs` 테이블 생성 + DB 트리거 4개 + RLS + Realtime 활성화 | 3일 |
| 1-2 | `page.tsx` 수정: Coming Soon → AnalyticsTab/ActivityFeedTab 컴포넌트 연결 | 0.5일 |
| 1-3 | `AnalyticsTab.tsx` 레이아웃 + 기간/마일스톤 필터 | 1일 |
| 1-4 | `PassRateTrend.tsx` — usePassRateReport 재사용, Recharts ComposedChart | 2일 |
| 1-5 | `MilestoneTracker.tsx` — useMilestoneTracker 신규, 번다운 AreaChart + 카드 | 3일 |
| 1-6 | `ExecutionSummary.tsx` — useActiveRuns 재사용, 스택바 + Run 카드 | 1일 |
| 1-7 | `useActivityFeed.ts` + `ActivityFeedTab.tsx` — 기본 필터 + 날짜 그룹핑 + 페이지네이션 | 3일 |
| 1-8 | `FeedItem.tsx` — 14종 이벤트 아이콘/메시지/하이라이트 | 1.5일 |

### Phase 2: 심층 분석 + 실시간 (2~3주)

| # | 작업 | 예상 공수 |
|---|------|----------|
| 2-1 | `TeamPerformance.tsx` — useTeamActivity 확장, Recharts 스택 BarChart | 3일 |
| 2-2 | `FlakyDetector.tsx` — useFlakyDetection 신규, RPC 함수, 시퀀스 도트 | 2일 |
| 2-3 | `CoverageHeatmap.tsx` — useCoverageHeatmap 신규, Recharts Treemap | 3일 |
| 2-4 | `TCQualityAnalysis.tsx` — useTestCasesOverview 재사용, PieChart + AreaChart | 2일 |
| 2-5 | Supabase Realtime 구독 → Activity Feed 실시간 업데이트 | 2일 |
| 2-6 | 중요 이벤트 하이라이트 (Critical 실패, 대량 실패, 기한 임박) | 2일 |
| 2-7 | Feed 검색 + 팀원 멀티셀렉트 필터 | 1일 |

### Phase 3: AI 인사이트 (2주)

| # | 작업 | 예상 공수 |
|---|------|----------|
| 3-1 | 규칙 기반 인사이트 엔진 (임계값 경고/패턴 탐지) | 3일 |
| 3-2 | `generate-ai-insights` Edge Function (LLM 호출) | 3일 |
| 3-3 | AI 일일 Activity 요약 (Feed 상단 카드) | 2일 |
| 3-4 | `TierGate.tsx` — 블러 미리보기 + 업그레이드 CTA | 2일 |
| 3-5 | 번다운 AI 완료 예측선 추가 | 1일|
| 3-6 | Flaky TC AI 원인 분석 코멘트 | 2일 |

---

## 성능 고려사항

| 우려 | 대응 |
|------|------|
| 대량 test_results 조회 (수천 건) | 날짜 범위 인덱스 + Supabase RPC 서버사이드 집계 |
| Flaky Score 계산 (전체 TC × 최근 10건) | RPC 함수로 DB에서 직접 계산, React Query 캐싱 (5분 staleTime) |
| Activity Feed 무한 스크롤 | 커서 기반 페이지네이션 (`created_at < cursor`) |
| Realtime 구독 과다 | `activity_logs` 단일 테이블만 구독 (옵션 A 선택의 이점) |
| AI 인사이트 생성 비용 | 하루 1회 배치 생성 + 캐싱, 온디맨드는 Professional+ 전용 |

---

## 디자인 참고

**Desi 목업 파일:** `desi/dashboard-analytics-activity-feed-mockup.html`
- 15 스크린 HTML 목업 (Analytics 9 + Activity Feed 6)
- 브라우저에서 열어 상단 네비게이터로 각 화면 확인 가능
- 각 화면 하단에 `ann` 어노테이션으로 개발 참고 사항 포함

**핵심 디자인 토큰:**
- 위젯 카드: `rounded-xl (12px)`, `border 1px #E2E8F0`, flat (no shadow)
- 위젯 헤더: 아이콘 16px + 제목 15px semibold, 하단 `border #F1F5F9`
- KPI 카드: bg `#F8FAFC`, `rounded-lg (8px)`, 값 24px 700
- 차트 라인: `#6366F1` 2px + 도트 4px
- 차트 바: `#E2E8F0` opacity 0.5
- 호버 툴팁: dark `#1E293B`

**Status 색상 (기존 앱과 동일):**
```
passed: #16A34A    failed: #DC2626    blocked: #D97706
retest: #7C3AED    untested: #64748B
```