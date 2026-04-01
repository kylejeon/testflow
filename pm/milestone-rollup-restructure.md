# Milestone Roll-up 구조 변경 기획서

> **문서 버전:** 1.0
> **작성일:** 2026-04-01
> **승인:** CEO 승인 완료
> **대상:** Dev1, Dev2
> **우선순위:** High

---

## 1. 개요

### 1.1 배경

현재 Testably에서 parent milestone 아래 sub milestone을 생성할 수 있으나, 두 레벨이 **완전히 독립적으로** 동작한다. Parent milestone은 자체 runs에 연결된 TC만으로 진행률을 계산하며, sub milestone의 데이터는 parent에 반영되지 않는다.

CEO의 의도는 parent milestone(예: `1.0.0`)을 **릴리스 단위**, sub milestone을 **Sprint** 또는 **1차/2차/3차 테스트 라운드** 단위로 구성하고, parent가 sub들의 데이터를 **자동 집계(Roll-up)** 하는 것이다.

### 1.2 현재 상태 (AS-IS)

```
milestones 테이블 (현재)
├── id: UUID (PK)
├── project_id: UUID (FK → projects)
├── name: TEXT
├── status: 'upcoming' | 'started' | 'past_due' | 'completed'
├── start_date: TIMESTAMPTZ (nullable)
├── end_date: TIMESTAMPTZ (nullable)
├── progress: NUMERIC (0-100)
├── parent_milestone_id: UUID (FK → milestones, nullable, ON DELETE CASCADE)
├── assigned_to: UUID (nullable)
├── created_at: TIMESTAMPTZ
└── updated_at: TIMESTAMPTZ
```

**현재 동작:**
- `parent_milestone_id`가 존재하지만 **UI 계층 표시 용도**로만 사용
- Parent 진행률 = parent 자체 runs의 TC 실행률만 계산 (`queryFns.ts` 70-113줄)
- Parent 상태 = 수동 설정 또는 날짜 기반 자동 전환 (upcoming → started → past_due)
- Parent 기간 = 수동 입력 (sub 기간과 무관)
- MilestoneTracker 위젯: parent/sub 구분 없이 flat 목록으로 처리
- PDF Export P5: `milestonesWithProgress`를 flatten하여 첫 4개만 카드로 표시

### 1.3 목표 상태 (TO-BE)

Parent milestone이 **하위 sub milestone + 직속 TC의 데이터를 자동 집계**한다.

```
Parent: 1.0.0 Release
├── 직속 TC: Regression Suite (parent에 직접 연결된 runs)
├── Sub: Sprint 1 (runs → TCs)
├── Sub: Sprint 2 (runs → TCs)
└── Sub: Sprint 3 (runs → TCs)

Parent 진행률 = (Sprint1 TC + Sprint2 TC + Sprint3 TC + 직속 TC) 전체 합산
Parent 상태 = Sub들의 상태에 따라 자동 결정
Parent 기간 = Sub들의 min(start_date) ~ max(end_date)
```

---

## 2. 핵심 변경 사항 상세

### 2.1 진행률 자동 집계

#### 집계 공식

```
Parent Progress = (allCompletedTCs / allTotalTCs) × 100

여기서:
  allTotalTCs = Σ(각 sub의 totalTCs) + parent 직속 runs의 totalTCs
  allCompletedTCs = Σ(각 sub의 completedTCs) + parent 직속 runs의 completedTCs
  completedTC = status가 passed | failed | blocked | retest 중 하나인 TC
```

#### 예시

| 소스 | Total TCs | Completed | Passed |
|------|-----------|-----------|--------|
| Sub: Sprint 1 | 30 | 28 | 20 |
| Sub: Sprint 2 | 20 | 15 | 12 |
| Sub: Sprint 3 | 25 | 0 | 0 |
| Parent 직속 (Regression) | 10 | 8 | 7 |
| **Parent 합계** | **85** | **51** | **39** |

- Parent 진행률 = 51 / 85 = **60%**
- Parent Pass Rate = 39 / 51 = **76.5%**

#### 현재 코드 변경 지점

**파일:** `src/pages/project-detail/queryFns.ts` (70-113줄)

현재 코드는 milestone별로 독립적으로 진행률을 계산한 뒤, 115-120줄에서 parent/sub를 조직한다. 이 순서를 유지하되, parent milestone의 progress를 sub들의 합산으로 **덮어쓰기**한다.

```typescript
// === 변경 전 (AS-IS) ===
// 115-120줄: 단순 계층 조직만 수행
const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
const organizedMilestones = parentMilestones.map(parent => ({
  ...parent,
  subMilestones: milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id),
}));

// === 변경 후 (TO-BE) ===
const parentMilestones = milestonesWithProgress.filter(m => !m.parent_milestone_id);
const organizedMilestones = parentMilestones.map(parent => {
  const subs = milestonesWithProgress.filter(m => m.parent_milestone_id === parent.id);

  if (subs.length === 0) {
    // sub가 없으면 기존 로직 유지 (단독 milestone)
    return { ...parent, subMilestones: [] };
  }

  // Roll-up: sub + parent 직속 runs 합산
  const allSources = [parent, ...subs];
  let rollupTotal = 0;
  let rollupCompleted = 0;
  let rollupPassed = 0;
  let rollupFailed = 0;

  allSources.forEach(source => {
    const sourceRuns = allRunsData?.filter(r => r.milestone_id === source.id) || [];
    sourceRuns.forEach(run => {
      const runResults = allResultsByRun.get(run.id) || [];
      const statusMap = new Map<string, string>();
      runResults.forEach(r => {
        if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
      });
      const tcIds = run.test_case_ids || [];
      rollupTotal += tcIds.length;
      tcIds.forEach(tcId => {
        const s = statusMap.get(tcId);
        if (s === 'passed') { rollupCompleted++; rollupPassed++; }
        else if (s === 'failed') { rollupCompleted++; rollupFailed++; }
        else if (s === 'blocked' || s === 'retest') { rollupCompleted++; }
      });
    });
  });

  const rollupProgress = rollupTotal > 0
    ? Math.round((rollupCompleted / rollupTotal) * 100)
    : 0;

  // Parent에 집계 결과 적용
  return {
    ...parent,
    progress: rollupProgress,
    totalTests: rollupTotal,
    completedTests: rollupCompleted,
    passedTests: rollupPassed,
    failedTests: rollupFailed,
    isAggregated: true,     // 집계 모드 플래그
    subMilestones: subs,
  };
});
```

### 2.2 상태(Status) 자동 결정

Sub milestone이 있는 parent의 상태는 **sub들의 상태 조합**으로 자동 결정된다.

#### 상태 결정 로직

```
규칙 (우선순위 순):
1. 모든 sub가 completed → Parent = completed
2. 하나라도 past_due → Parent = past_due
3. 하나라도 started → Parent = started
4. 모두 upcoming → Parent = upcoming
```

#### 코드

```typescript
function deriveParentStatus(subs: Milestone[]): Milestone['status'] {
  if (subs.length === 0) return 'upcoming';

  const statuses = subs.map(s => s.status);

  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s === 'past_due'))   return 'past_due';
  if (statuses.some(s => s === 'started'))    return 'started';
  return 'upcoming';
}
```

#### Parent 상태 수동 변경 차단

Sub가 있는 parent의 상태는 **읽기 전용**이다. UI에서 상태 변경 드롭다운을 비활성화하고, API에서도 reject한다.

```typescript
// project-milestones/page.tsx — updateMilestone 함수 내
if (milestone.parent_milestone_id === null && hasSubMilestones(milestone.id)) {
  // sub가 있는 parent는 status, progress 수동 변경 불가
  if ('status' in data || 'progress' in data) {
    toast.error('Sub milestone이 있는 parent의 상태/진행률은 자동 집계됩니다.');
    return;
  }
}
```

### 2.3 기간(Date Range) 자동 계산

#### 규칙

```
Parent start_date = min(sub.start_date) 중 null이 아닌 가장 빠른 날짜
Parent end_date   = max(sub.end_date)   중 null이 아닌 가장 늦은 날짜
```

수동으로 parent 기간을 설정할 수 있지만, sub 기간이 parent 범위를 벗어나면 **경고 배지** 표시.

#### 코드

```typescript
function deriveParentDates(subs: Milestone[]): { start_date: string | null; end_date: string | null } {
  const starts = subs
    .map(s => s.start_date)
    .filter(Boolean)
    .map(d => new Date(d!).getTime());
  const ends = subs
    .map(s => s.end_date)
    .filter(Boolean)
    .map(d => new Date(d!).getTime());

  return {
    start_date: starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null,
    end_date: ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : null,
  };
}
```

#### 기간 벗어남 경고

```typescript
function checkDateOverflow(parent: Milestone, subs: Milestone[]): string[] {
  const warnings: string[] = [];
  if (!parent.start_date || !parent.end_date) return warnings;

  const pStart = new Date(parent.start_date).getTime();
  const pEnd = new Date(parent.end_date).getTime();

  subs.forEach(sub => {
    if (sub.start_date && new Date(sub.start_date).getTime() < pStart) {
      warnings.push(`"${sub.name}" 시작일이 parent 범위 이전입니다.`);
    }
    if (sub.end_date && new Date(sub.end_date).getTime() > pEnd) {
      warnings.push(`"${sub.name}" 종료일이 parent 범위 이후입니다.`);
    }
  });

  return warnings;
}
```

### 2.4 Quality Gate / 릴리스 판단

Parent 레벨에서 Quality Gate 기준을 설정하고, **모든 sub + 직속 TC의 종합 결과**를 기준으로 Pass/Fail을 판단한다.

#### Quality Gate 기준 (기존 동일)

| Gate | Threshold | 판단 기준 |
|------|-----------|----------|
| Pass Rate ≥ 90% | 90 | rollupPassed / rollupCompleted × 100 |
| No Critical Failures | 0 | priority='critical'인 failed TC 수 = 0 |
| Coverage ≥ 80% | 80 | rollupCompleted / rollupTotal × 100 |
| Blocked ≤ 5% | 5 | blockedTCs / rollupTotal × 100 |

#### Release Readiness Score

```
Score = (passRate × 0.40) + (critBugResolution × 0.25) + (coverage × 0.20) + (milestoneProgress × 0.15)

여기서 모든 값은 parent의 roll-up 집계 기준
```

### 2.5 Parent에 직접 TC 연결 허용

Regression test 등 특정 Sprint에 속하지 않는 TC를 parent에 직접 연결 가능하다. 이는 현재 동작과 동일하다 (test_runs.milestone_id = parent.id).

집계 시 **sub TC + parent 직속 TC**를 합산한다.

```
Parent: 1.0.0 Release
├── [직속] Run: "Regression Suite v1" (milestone_id = parent.id)
│   └── TC 10개
├── Sub: Sprint 1
│   ├── Run: "Sprint 1 - Cycle 1" (milestone_id = sub1.id)
│   └── TC 30개
└── Sub: Sprint 2
    ├── Run: "Sprint 2 - Cycle 1" (milestone_id = sub2.id)
    └── TC 20개

→ Parent 집계 대상: 10 + 30 + 20 = 60 TCs
```

---

## 3. DB 변경

### 3.1 Migration SQL

```sql
-- Migration: milestone_rollup_support
-- 설명: Parent milestone의 roll-up 집계 지원을 위한 스키마 변경

-- 1. milestones 테이블에 집계 모드 관련 컬럼 추가
ALTER TABLE milestones
  ADD COLUMN IF NOT EXISTS date_mode TEXT NOT NULL DEFAULT 'auto'
    CHECK (date_mode IN ('auto', 'manual'));
-- date_mode: 'auto' = sub 기간에서 자동 계산, 'manual' = 수동 입력 유지

-- 2. 인덱스 추가 (parent → sub 조회 최적화)
CREATE INDEX IF NOT EXISTS idx_milestones_parent_id
  ON milestones (parent_milestone_id)
  WHERE parent_milestone_id IS NOT NULL;

-- 3. parent의 집계 통계를 위한 DB Function (선택적)
CREATE OR REPLACE FUNCTION fn_milestone_rollup_stats(p_milestone_id UUID)
RETURNS TABLE (
  total_tcs BIGINT,
  completed_tcs BIGINT,
  passed_tcs BIGINT,
  failed_tcs BIGINT,
  blocked_tcs BIGINT,
  retest_tcs BIGINT,
  pass_rate NUMERIC,
  coverage_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH target_milestones AS (
    -- parent 자신 + 모든 sub milestones
    SELECT id FROM milestones WHERE id = p_milestone_id
    UNION ALL
    SELECT id FROM milestones WHERE parent_milestone_id = p_milestone_id
  ),
  target_runs AS (
    SELECT tr.id AS run_id, tr.test_case_ids
    FROM test_runs tr
    JOIN target_milestones tm ON tr.milestone_id = tm.id
  ),
  -- 각 run의 TC별 최신 결과
  latest_results AS (
    SELECT DISTINCT ON (tres.test_case_id, tres.run_id)
      tres.run_id,
      tres.test_case_id,
      tres.status
    FROM test_results tres
    JOIN target_runs trun ON tres.run_id = trun.run_id
    ORDER BY tres.test_case_id, tres.run_id, tres.created_at DESC
  ),
  -- TC별 집계
  tc_stats AS (
    SELECT
      unnest(tr.test_case_ids) AS tc_id,
      tr.run_id
    FROM target_runs tr
  ),
  final_stats AS (
    SELECT
      ts.tc_id,
      ts.run_id,
      COALESCE(lr.status, 'untested') AS status
    FROM tc_stats ts
    LEFT JOIN latest_results lr ON lr.test_case_id = ts.tc_id AND lr.run_id = ts.run_id
  )
  SELECT
    COUNT(*)::BIGINT AS total_tcs,
    COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest'))::BIGINT AS completed_tcs,
    COUNT(*) FILTER (WHERE status = 'passed')::BIGINT AS passed_tcs,
    COUNT(*) FILTER (WHERE status = 'failed')::BIGINT AS failed_tcs,
    COUNT(*) FILTER (WHERE status = 'blocked')::BIGINT AS blocked_tcs,
    COUNT(*) FILTER (WHERE status = 'retest')::BIGINT AS retest_tcs,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status = 'passed')::NUMERIC /
        COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest')) * 100, 1
      )
      ELSE 0
    END AS pass_rate,
    CASE
      WHEN COUNT(*) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE status IN ('passed','failed','blocked','retest'))::NUMERIC /
        COUNT(*) * 100, 1
      )
      ELSE 0
    END AS coverage_rate
  FROM final_stats;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4. Activity log 트리거에 roll-up 이벤트 추가
-- (기존 fn_log_milestone_change 수정 또는 별도 트리거)
-- Sub milestone 변경 시 parent도 activity_logs에 기록
CREATE OR REPLACE FUNCTION fn_log_parent_milestone_rollup()
RETURNS TRIGGER AS $$
DECLARE
  v_parent_id UUID;
BEGIN
  -- sub milestone 변경 시 parent에 대한 로그 생성
  IF NEW.parent_milestone_id IS NOT NULL THEN
    v_parent_id := NEW.parent_milestone_id;
    INSERT INTO activity_logs (
      project_id, actor_id, action, target_type, target_id,
      metadata, created_at
    ) VALUES (
      NEW.project_id,
      auth.uid(),
      'milestone_rollup_updated',
      'milestone',
      v_parent_id,
      jsonb_build_object(
        'sub_milestone_id', NEW.id,
        'sub_milestone_name', NEW.name,
        'change_type', TG_OP
      ),
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_parent_rollup
  AFTER INSERT OR UPDATE ON milestones
  FOR EACH ROW
  WHEN (NEW.parent_milestone_id IS NOT NULL)
  EXECUTE FUNCTION fn_log_parent_milestone_rollup();
```

### 3.2 TypeScript 타입 변경

**파일:** `src/lib/supabase.ts`

```typescript
// === 변경 전 ===
export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
}

// === 변경 후 ===
export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  status: 'upcoming' | 'started' | 'past_due' | 'completed';
  start_date: string | null;
  end_date: string | null;
  progress: number;
  parent_milestone_id: string | null;    // 추가
  date_mode: 'auto' | 'manual';          // 추가
  assigned_to: string | null;            // 추가
  created_at: string;
  updated_at: string;
}

export interface MilestoneWithRollup extends Milestone {
  // 집계 관련 필드
  isAggregated: boolean;               // sub가 1개 이상이면 true
  rollupTotal: number;                  // 전체 TC 수 (sub + 직속)
  rollupCompleted: number;              // 완료 TC 수
  rollupPassed: number;
  rollupFailed: number;
  rollupBlocked: number;
  rollupPassRate: number;               // passed / completed × 100
  rollupCoverage: number;               // completed / total × 100
  derivedStatus: Milestone['status'];   // sub 기반 자동 상태
  derivedStartDate: string | null;      // sub 기반 자동 시작일
  derivedEndDate: string | null;        // sub 기반 자동 종료일
  dateWarnings: string[];               // 기간 벗어남 경고 목록
  subMilestones: MilestoneWithRollup[];
}
```

### 3.3 관계 다이어그램

```
milestones
  ├── id (PK)
  ├── parent_milestone_id (FK → milestones.id, ON DELETE CASCADE)
  ├── date_mode ('auto' | 'manual')
  └── ... 기존 필드

test_runs
  ├── milestone_id (FK → milestones.id, ON DELETE SET NULL)
  └── test_case_ids (UUID[])  ← 이 배열의 TC들이 milestone에 속한 TC

test_results
  ├── run_id (FK → test_runs.id)
  ├── test_case_id (FK → test_cases.id)
  └── status ('passed' | 'failed' | 'blocked' | 'retest' | 'untested')

집계 흐름:
  Parent milestone
    ├── 직속 runs (test_runs.milestone_id = parent.id)
    │   └── test_results
    ├── Sub1 → Sub1의 runs → test_results
    ├── Sub2 → Sub2의 runs → test_results
    └── Sub3 → Sub3의 runs → test_results
```

---

## 4. UI 변경

### 4.1 Milestone 목록 페이지 (`project-milestones/page.tsx`)

#### 변경 내역

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| Parent 진행률 | 자체 runs만 | Roll-up 집계 (sub + 직속) |
| Parent 상태 | 수동 변경 가능 | Sub 기반 자동 (읽기 전용) |
| Parent 기간 | 수동 입력 | Auto: sub 기반 / Manual: 수동 + 경고 |
| 집계 표시 | 없음 | 🔄 아이콘 + "Roll-up" 툴팁 |
| Sub breakdown | 없음 | 확장 시 sub별 진행률 표시 |

#### UI 모크업 (텍스트)

```
┌─────────────────────────────────────────────────────┐
│ 🔄 1.0.0 Release               [STARTED] [past_due]│
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 60% (51/85 TCs)         │
│ 📅 Mar 1 – Apr 15 (auto)                           │
│                                                     │
│  ├── Sprint 1    ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░ 93% (28/30)│
│  ├── Sprint 2    ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░ 75% (15/20)│
│  ├── Sprint 3    ░░░░░░░░░░░░░░░░░░░░░ 0%  (0/25) │
│  └── Regression  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░ 80% (8/10) │
│       (parent 직속)                                 │
└─────────────────────────────────────────────────────┘
```

#### 주요 코드 변경

```typescript
// 1. Parent milestone 카드에 집계 배지 추가
{milestone.isAggregated && (
  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-50
                    px-2 py-0.5 rounded-full" title="Sub milestone 데이터 자동 집계">
    <i className="ri-loop-left-line text-xs" />
    Roll-up
  </span>
)}

// 2. Status 드롭다운 비활성화
<select
  value={milestone.status}
  disabled={milestone.isAggregated}
  className={milestone.isAggregated ? 'opacity-50 cursor-not-allowed' : ''}
>
  ...
</select>
{milestone.isAggregated && (
  <p className="text-xs text-slate-400 mt-1">
    상태는 sub milestone에 의해 자동 결정됩니다.
  </p>
)}

// 3. Sub breakdown 표시 (확장 영역)
{expanded && milestone.subMilestones?.map(sub => (
  <div key={sub.id} className="ml-8 flex items-center gap-3 py-2 border-l-2 border-indigo-200 pl-4">
    <span className="text-sm font-medium">{sub.name}</span>
    <div className="flex-1 h-2 bg-gray-200 rounded-full">
      <div className="h-full bg-indigo-500 rounded-full"
           style={{ width: `${sub.progress}%` }} />
    </div>
    <span className="text-xs text-slate-500">{sub.progress}%</span>
  </div>
))}
```

### 4.2 Milestone 상세 페이지 (`milestone-detail/page.tsx`)

#### Parent 상세 보기 추가 사항

1. **Roll-up 요약 카드** — 페이지 상단에 집계 현황 카드 배치
2. **Sub Milestone Breakdown 테이블** — 각 sub의 진행률, TC 수, pass rate 표시
3. **통합 Burndown Chart** — 모든 sub + 직속 TC의 번다운
4. **Quality Gates** — 전체 집계 기준 Pass/Fail 표시

```typescript
// milestone-detail/page.tsx 상단에 Roll-up 배너 추가
{milestone.isAggregated && (
  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6">
    <div className="flex items-center gap-2 mb-2">
      <i className="ri-loop-left-line text-indigo-600" />
      <span className="font-semibold text-indigo-900">Roll-up 집계 모드</span>
    </div>
    <div className="grid grid-cols-4 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold text-slate-900">{rollup.total}</div>
        <div className="text-xs text-slate-500">Total TCs</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-green-600">{rollup.passed}</div>
        <div className="text-xs text-slate-500">Passed</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-red-600">{rollup.failed}</div>
        <div className="text-xs text-slate-500">Failed</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-indigo-600">{rollup.coverage}%</div>
        <div className="text-xs text-slate-500">Coverage</div>
      </div>
    </div>
  </div>
)}
```

### 4.3 Milestone 편집 모달

Sub가 있는 parent milestone 편집 시:

| 필드 | 동작 |
|------|------|
| Name | 편집 가능 |
| Status | 🔒 읽기 전용 (자동 결정) |
| Progress | 🔒 읽기 전용 (자동 집계) |
| Start Date | date_mode='auto'이면 읽기 전용 + "수동 전환" 버튼 |
| End Date | date_mode='auto'이면 읽기 전용 + "수동 전환" 버튼 |
| Assigned To | 편집 가능 |

```typescript
// Date mode 토글 UI
<div className="flex items-center gap-2">
  <label className="text-sm font-medium">기간 모드:</label>
  <button
    onClick={() => updateDateMode(milestone.id, milestone.date_mode === 'auto' ? 'manual' : 'auto')}
    className={`px-3 py-1 rounded-full text-xs font-semibold ${
      milestone.date_mode === 'auto'
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-700'
    }`}
  >
    {milestone.date_mode === 'auto' ? '🔄 Auto' : '✏️ Manual'}
  </button>
</div>
```

---

## 5. Dashboard / Analytics 영향 범위

### 5.1 MilestoneTracker 위젯

**파일:** `src/pages/project-detail/widgets/MilestoneTracker.tsx`

#### 변경 내역

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| Milestone 목록 | Flat list (parent + sub 혼합) | Parent만 표시, 클릭 시 sub 드릴다운 |
| Burndown | 단일 milestone 기준 | Parent 선택 시 전체 sub 합산 번다운 |
| Risk 계산 | 개별 milestone만 | Parent = 집계 기준 risk |

#### 코드 변경

```typescript
// MilestoneTracker.tsx — parent만 표시하도록 필터
const displayMilestones = milestones
  .filter(m => !m.parent_milestone_id)  // parent만
  .map(computeRisk);

// Burndown 데이터 로드 시 sub runs도 포함
useEffect(() => {
  if (!primary) return;

  const loadBurndown = async () => {
    // parent + sub milestone IDs 수집
    const milestoneIds = [primary.id];
    const subs = milestones.filter(m => m.parent_milestone_id === primary.id);
    subs.forEach(s => milestoneIds.push(s.id));

    // 모든 관련 runs 조회
    const { data: runs } = await supabase
      .from('test_runs')
      .select('id, test_case_ids, milestone_id')
      .in('milestone_id', milestoneIds);

    // ... 기존 burndown 로직에 전체 runs 적용
  };

  loadBurndown();
}, [primary]);
```

### 5.2 Export PDF — Page 5 (Milestone & Release Readiness)

**파일:** `src/pages/project-detail/pdf/` 관련 파일

#### 변경 내역

| 항목 | AS-IS | TO-BE |
|------|-------|-------|
| Milestone 카드 | flatten 후 첫 4개 | Parent milestone만 표시 (최대 4개) |
| 각 카드 데이터 | 개별 milestone 기준 | Roll-up 집계 기준 |
| Burndown | 개별 milestone | Parent 선택 시 전체 합산 |
| Quality Gates | 개별 데이터 | Parent roll-up 기준 |

```typescript
// PDF data prep — parent milestone 집계
const pdfMilestones = organizedMilestones
  .filter(m => !m.parent_milestone_id)
  .slice(0, 4)
  .map(parent => ({
    id: parent.id,
    name: parent.name,
    status: parent.derivedStatus || parent.status,
    progress: parent.isAggregated ? parent.rollupProgress : parent.progress,
    dueDate: parent.derivedEndDate || parent.end_date,
    daysRemaining: /* 계산 */,
    remainingTCs: parent.rollupTotal - parent.rollupCompleted,
    velocity: /* 계산 */,
    estCompletion: /* 계산 */,
    // Sub breakdown (PDF에서 카드 아래 미니 테이블)
    subBreakdown: parent.subMilestones?.map(sub => ({
      name: sub.name,
      progress: sub.progress,
      total: sub.totalTests,
      completed: sub.completedTests,
    })),
  }));
```

### 5.3 기타 영향 범위

| 위치 | 파일 | 변경 내용 |
|------|------|----------|
| Run 생성 시 Milestone 선택 | `ContinueRunPanel.tsx` | Parent와 sub 모두 선택 가능 (구분 표시) |
| Runs 목록 필터 | `project-runs/page.tsx` | Parent 선택 시 sub runs도 포함 필터 |
| Sessions 목록 | `project-sessions/page.tsx` | Milestone 필터에 parent 선택 시 sub 포함 |
| AI Insights | `AIInsightsPanel.tsx` | 집계 데이터 기반 인사이트 |
| Webhooks | `useWebhooks.ts` | `milestone_rollup_updated` 이벤트 추가 |
| i18n | `milestones.ts` (en/ko) | Roll-up 관련 번역 키 추가 |
| API Docs | `docs/api/milestones/page.tsx` | 집계 API 문서 업데이트 |
| User Guide | `docs/milestones.tsx` | Roll-up 설명 추가 |

---

## 6. 집계 로직 유틸리티 (`src/lib/milestoneRollup.ts`)

별도 유틸리티 파일로 roll-up 로직을 분리하여 **queryFns, MilestoneTracker, PDF export, milestone-detail** 등에서 재사용한다.

```typescript
// src/lib/milestoneRollup.ts

import type { Milestone } from './supabase';

export interface RollupResult {
  totalTCs: number;
  completedTCs: number;
  passedTCs: number;
  failedTCs: number;
  blockedTCs: number;
  retestTCs: number;
  passRate: number;
  coverageRate: number;
  derivedStatus: Milestone['status'];
  derivedStartDate: string | null;
  derivedEndDate: string | null;
  dateWarnings: string[];
}

/**
 * Parent milestone의 roll-up 통계를 계산한다.
 *
 * @param parent - Parent milestone
 * @param subs - Sub milestones 배열
 * @param allRuns - 프로젝트의 모든 runs
 * @param resultsByRun - run_id → test_results[] 맵
 */
export function computeRollup(
  parent: Milestone,
  subs: Milestone[],
  allRuns: any[],
  resultsByRun: Map<string, any[]>
): RollupResult {
  // 1. 대상 milestone IDs (parent 직속 + 모든 sub)
  const targetIds = new Set([parent.id, ...subs.map(s => s.id)]);

  // 2. 대상 runs
  const targetRuns = allRuns.filter(r => targetIds.has(r.milestone_id));

  // 3. TC별 최신 상태 집계
  let total = 0, completed = 0, passed = 0, failed = 0, blocked = 0, retest = 0;

  targetRuns.forEach(run => {
    const results = resultsByRun.get(run.id) || [];
    const statusMap = new Map<string, string>();
    results.forEach(r => {
      if (!statusMap.has(r.test_case_id)) statusMap.set(r.test_case_id, r.status);
    });

    const tcIds: string[] = run.test_case_ids || [];
    total += tcIds.length;

    tcIds.forEach(tcId => {
      const s = statusMap.get(tcId);
      if (s === 'passed')  { completed++; passed++; }
      else if (s === 'failed')  { completed++; failed++; }
      else if (s === 'blocked') { completed++; blocked++; }
      else if (s === 'retest')  { completed++; retest++; }
    });
  });

  // 4. 비율 계산
  const passRate = completed > 0 ? Math.round((passed / completed) * 1000) / 10 : 0;
  const coverageRate = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;

  // 5. 상태 자동 결정
  const derivedStatus = deriveStatus(subs);

  // 6. 기간 자동 계산
  const { start_date, end_date } = deriveDates(subs);

  // 7. 기간 경고
  const dateWarnings = checkDateOverflow(parent, subs);

  return {
    totalTCs: total,
    completedTCs: completed,
    passedTCs: passed,
    failedTCs: failed,
    blockedTCs: blocked,
    retestTCs: retest,
    passRate,
    coverageRate,
    derivedStatus,
    derivedStartDate: start_date,
    derivedEndDate: end_date,
    dateWarnings,
  };
}

function deriveStatus(subs: Milestone[]): Milestone['status'] {
  if (subs.length === 0) return 'upcoming';
  const statuses = subs.map(s => s.status);
  if (statuses.every(s => s === 'completed')) return 'completed';
  if (statuses.some(s => s === 'past_due'))   return 'past_due';
  if (statuses.some(s => s === 'started'))    return 'started';
  return 'upcoming';
}

function deriveDates(subs: Milestone[]) {
  const starts = subs.map(s => s.start_date).filter(Boolean).map(d => new Date(d!).getTime());
  const ends = subs.map(s => s.end_date).filter(Boolean).map(d => new Date(d!).getTime());
  return {
    start_date: starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : null,
    end_date: ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : null,
  };
}

function checkDateOverflow(parent: Milestone, subs: Milestone[]): string[] {
  const warnings: string[] = [];
  if (!parent.start_date || !parent.end_date) return warnings;
  const pStart = new Date(parent.start_date).getTime();
  const pEnd = new Date(parent.end_date).getTime();
  subs.forEach(sub => {
    if (sub.start_date && new Date(sub.start_date).getTime() < pStart)
      warnings.push(`"${sub.name}" 시작일이 parent 범위 이전`);
    if (sub.end_date && new Date(sub.end_date).getTime() > pEnd)
      warnings.push(`"${sub.name}" 종료일이 parent 범위 이후`);
  });
  return warnings;
}
```

---

## 7. 엣지 케이스 및 규칙

### 7.1 Sub가 없는 Parent

Sub가 0개인 milestone은 **기존 동작 그대로** 유지한다. `isAggregated = false`, 수동 상태 변경 가능, 자체 runs만으로 진행률 계산.

### 7.2 Sub에 Sub (3레벨 이상)

**지원하지 않는다.** 현재 DB는 1레벨 중첩만 허용하며, sub의 `parent_milestone_id`가 이미 설정된 milestone은 다른 milestone의 parent가 될 수 없다.

```typescript
// Sub milestone 생성 시 검증
if (selectedParent && selectedParent.parent_milestone_id !== null) {
  toast.error('Sub milestone 아래에는 추가 하위 milestone을 생성할 수 없습니다.');
  return;
}
```

### 7.3 Sub 삭제 시

Sub milestone 삭제 시 parent의 집계가 자동으로 재계산된다 (해당 sub의 TC가 제외됨). 마지막 sub가 삭제되면 parent는 `isAggregated = false`로 전환.

### 7.4 Run의 Milestone 변경

Run의 milestone_id가 변경되면 (이전 milestone, 새 milestone 양쪽의) 집계가 재계산된다.

### 7.5 TC가 중복 집계되는 경우

동일한 TC가 Sub1과 Sub2의 run에 모두 포함된 경우, **각 run 단위로 독립 집계**한다. 이는 현재 동작과 동일하며, "Sprint 1에서 실행 + Sprint 2에서 재실행"이라는 실제 사용 패턴을 반영한다.

### 7.6 Empty Sub (Run 없음)

Run이 0개인 sub milestone은 집계에 영향을 주지 않는다 (total=0, completed=0). 단, 상태 결정에는 포함된다.

---

## 8. 구현 계획

### Phase 1: Core Roll-up (3일)

| 순서 | 작업 | 파일 | 담당 |
|------|------|------|------|
| 1-1 | DB Migration 실행 | `supabase/migrations/` | Dev |
| 1-2 | TypeScript 타입 업데이트 | `src/lib/supabase.ts` | Dev |
| 1-3 | `milestoneRollup.ts` 유틸리티 생성 | `src/lib/milestoneRollup.ts` | Dev |
| 1-4 | `queryFns.ts` 집계 로직 적용 | `src/pages/project-detail/queryFns.ts` | Dev |
| 1-5 | `project-milestones/page.tsx` UI 반영 | (Status 읽기전용, Roll-up 배지, Sub breakdown) | Dev |
| 1-6 | `milestone-detail/page.tsx` Roll-up 배너 | (집계 요약 카드, 통합 Burndown) | Dev |

### Phase 2: Dashboard & Widgets (2일)

| 순서 | 작업 | 파일 | 담당 |
|------|------|------|------|
| 2-1 | MilestoneTracker 위젯 수정 | `widgets/MilestoneTracker.tsx` | Dev |
| 2-2 | Parent 선택 시 sub runs 포함 필터 | `project-runs/page.tsx` | Dev |
| 2-3 | Sessions 목록 milestone 필터 | `project-sessions/page.tsx` | Dev |
| 2-4 | AI Insights 집계 데이터 반영 | `widgets/AIInsightsPanel.tsx` | Dev |

### Phase 3: PDF Export & 기타 (2일)

| 순서 | 작업 | 파일 | 담당 |
|------|------|------|------|
| 3-1 | PDF P5 Milestone 페이지 수정 | `pdf/drawPage5.ts` (또는 해당 파일) | Dev |
| 3-2 | Webhook 이벤트 추가 | `useWebhooks.ts` | Dev |
| 3-3 | i18n 번역 키 추가 | `i18n/local/en,ko/milestones.ts` | Dev |
| 3-4 | API Docs 업데이트 | `docs/api/milestones/page.tsx` | Dev |
| 3-5 | User Guide 업데이트 | `docs/milestones.tsx` | Dev |

### Phase 4: 검증 (1일)

| 순서 | 작업 |
|------|------|
| 4-1 | Sub 없는 parent: 기존 동작 유지 확인 |
| 4-2 | Sub 2개 parent: 진행률 합산 정확성 확인 |
| 4-3 | Parent 직속 TC + sub TC 혼합 집계 확인 |
| 4-4 | Status 자동 결정 (all completed, mixed, all upcoming) |
| 4-5 | Date 자동 계산 + 경고 표시 |
| 4-6 | PDF Export 집계 데이터 반영 확인 |
| 4-7 | Sub 삭제 시 재계산 확인 |
| 4-8 | Run의 milestone 변경 시 재계산 확인 |

**총 예상 기간: 8일** (1명 기준)

---

## 9. 체크리스트

- [ ] DB Migration 작성 및 적용 (`date_mode` 컬럼, 인덱스, DB Function)
- [ ] `Milestone` TypeScript 인터페이스에 `parent_milestone_id`, `date_mode` 추가
- [ ] `MilestoneWithRollup` 인터페이스 신규 생성
- [ ] `milestoneRollup.ts` 유틸리티 파일 생성
- [ ] `queryFns.ts` — parent milestone roll-up 집계 로직 적용
- [ ] `project-milestones/page.tsx` — Roll-up 배지, Status 읽기 전용, Sub breakdown
- [ ] `project-milestones/page.tsx` — 편집 모달에서 Status/Progress 필드 비활성화
- [ ] `project-milestones/page.tsx` — Date mode 토글 (auto/manual)
- [ ] `milestone-detail/page.tsx` — Roll-up 요약 카드
- [ ] `milestone-detail/page.tsx` — 통합 Burndown (sub runs 포함)
- [ ] `MilestoneTracker.tsx` — Parent만 표시, 집계 기준 burndown
- [ ] `project-runs/page.tsx` — Parent 선택 시 sub runs 포함 필터
- [ ] PDF Export P5 — Parent roll-up 데이터 반영
- [ ] 엣지 케이스: Sub 없는 parent, Sub 삭제, Run milestone 변경
- [ ] 3레벨 중첩 방지 검증
- [ ] i18n 번역 키 추가 (en, ko)
- [ ] Webhook `milestone_rollup_updated` 이벤트
- [ ] API Docs, User Guide 업데이트

---

## 10. 참고: 현재 코드 위치 요약

| 용도 | 파일 경로 |
|------|----------|
| Milestone 타입 정의 | `src/lib/supabase.ts:87-97` |
| Milestone 목록 페이지 | `src/pages/project-milestones/page.tsx` |
| Milestone 상세 페이지 | `src/pages/milestone-detail/page.tsx` |
| Dashboard 데이터 로드 | `src/pages/project-detail/queryFns.ts:70-120` |
| MilestoneTracker 위젯 | `src/pages/project-detail/widgets/MilestoneTracker.tsx` |
| PDF Export 타입 | `src/pages/project-detail/pdf/pdfTypes.ts:124-136` |
| Run 생성 (Milestone 선택) | `src/pages/project-detail/components/ContinueRunPanel.tsx` |
| Runs 목록 (Milestone 필터) | `src/pages/project-runs/page.tsx` |
| Sessions 목록 | `src/pages/project-sessions/page.tsx` |
| Webhooks | `src/hooks/useWebhooks.ts` |
| Activity Log 트리거 | `supabase/migrations/20260401_activity_logs.sql` |
| i18n (en) | `src/i18n/local/en/milestones.ts` |
| i18n (ko) | `src/i18n/local/ko/milestones.ts` |
| User Guide | `src/pages/docs/milestones.tsx` |
| API Docs | `src/pages/docs/api/milestones/page.tsx` |
