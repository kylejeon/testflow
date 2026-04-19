# Dev Spec: Milestone Detail — Roll-up Consistency & Burndown Aggregation

> **작성일:** 2026-04-19
> **작성자:** PM (@planner)
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-milestone-overview-v3.md` (후속 작업 — @designer가 이 스펙 Approved 후 작성)
> **선행 스프린트:**
> - `docs/specs/dev-spec-milestone-overview-redesign.md` (3탭 구조)
> - `docs/specs/dev-spec-milestone-ai-risk-insight.md` (AI Risk)

---

## 1. 개요

- **문제:** Sub milestone을 가진 parent milestone의 상세 화면에서 "parent 직속 stats"(Header Progress bar + TC Summary)와 "parent + subs 집계 stats"(Roll-up Mode 배너 카드)가 한 화면에 동시에 표시되어 사용자가 어느 값이 진짜인지 혼동한다. 또한 Burndown Chart와 KPI/Intel 카드들은 여전히 parent 직속 데이터만 사용하므로, "300 TCs" 집계와 Y축 최대값 "24"가 충돌한다.
- **해결:** Parent가 sub milestone을 1개 이상 가질 때(isAggregated = true), 모든 Overview 지표(`tcStats`, Burndown Y축, KPI, Top-Fail Tags, Failed & Blocked, Activity 24h, Velocity)를 **rollup 값(parent + subs 합산)** 으로 **단일화**한다. 별도 "Roll-up Mode 배너 카드"는 삭제하고, 그 자리에는 "이 숫자는 집계된 값"임을 알려주는 **컴팩트한 Roll-up 뱃지**만 Header에 남긴다.
- **성공 지표:**
  - Roll-up parent 방문 시 "어느 숫자가 진짜냐"는 지원 티켓 0건
  - Burndown Y축 최대값 === Header Total TCs === KPI Strip Total (3곳 수치 일치율 100%)
  - Roll-up Mode 배너 카드 DOM 제거(해당 블록 렌더 0회)

---

## 2. 유저 스토리

- **As an Owner/Admin**, 나는 Sub milestone을 가진 parent milestone 상세에 진입하면 한 화면에서 전체(parent + subs) 상태를 단일 숫자 세트로 보고 싶다. 그래야 어느 숫자가 "진짜"인지 고민하지 않고 바로 판단할 수 있다.
- **As a Manager**, 나는 Burndown Chart에서 전체 집계된 Total TC 기준의 ideal line과 actual line을 보고 싶다. 그래야 subs를 포함한 전체 milestone의 번다운이 실제로 on-track인지 판단할 수 있다.
- **As a Tester/Viewer**, 나는 Header에서 "이 milestone의 숫자는 sub 2개를 합산한 값"이라는 사실을 작은 뱃지 하나로 즉시 인지하고 싶다. 그래야 부모 전용 수치를 기대하다가 오해하지 않는다.

---

## 3. 수용 기준 (Acceptance Criteria)

### 데이터 단일화
- [ ] **AC-1:** Parent milestone이 sub milestone을 1개 이상 가지고(`subMilestones.length >= 1`) sub rollup 계산이 성공하면(`rollupStats !== null`), `tcStats`의 모든 필드(`passed`, `failed`, `blocked`, `retest`, `untested`, `total`, `passRate`)는 rollup 값(parent 직속 + subs 합산)을 가진다.
- [ ] **AC-2:** `isAggregated === true`일 때 `tcStats.total === rollupStats.total` (수치 일치).
- [ ] **AC-3:** `isAggregated === false`일 때(sub 없음) `tcStats`는 기존과 동일하게 parent 직속 runs만으로 계산된다.

### UI 일관성
- [ ] **AC-4:** `isAggregated === true`일 때 Header의 Progress bar 퍼센트는 `rollupStats.coverage`와 일치한다.
- [ ] **AC-5:** `isAggregated === true`일 때 Header의 "Passed N · Failed M · Blocked K · Untested U · Pass Rate P% · Total TCs T" 6개 값은 rollup 값이다.
- [ ] **AC-6:** 기존 Roll-up Mode 배너 카드(page.tsx 816-838 라인 블록)는 **DOM에서 제거**된다 (렌더 0회).
- [ ] **AC-7:** `isAggregated === true`일 때 Header의 milestone 이름 옆(Status 뱃지 근처)에 `ri-loop-left-line` 아이콘 + "Roll-up · N sub" 텍스트로 구성된 컴팩트 뱃지가 **정확히 1개** 표시된다. `isAggregated === false`일 때는 해당 뱃지가 렌더되지 않는다.

### Burndown & Intel 반영
- [ ] **AC-8:** `BurndownChart`의 `totalTCs` prop은 `tcStats.total`을 그대로 전달한다(AC-1, AC-2에 의해 rollup 시 자동으로 집계값이 된다). Y축 최대값 ≥ `tcStats.total`.
- [ ] **AC-9:** `isAggregated === true`일 때 Burndown의 `executedPerDay` Map은 parent 직속 runs + subs 직속 runs의 test_results를 **합산**한 일별 실행 카운트를 가진다.
- [ ] **AC-10:** `isAggregated === true`일 때 `KpiStrip`의 `remaining`, `executed`, `total`은 rollup 값이다(`executed + remaining === rollupStats.total`).
- [ ] **AC-11:** `isAggregated === true`일 때 `VelocitySparkline`의 7일 카운트는 parent + subs 합산값이다.
- [ ] **AC-12:** `isAggregated === true`일 때 `TopFailTagsCard`는 parent + subs의 failed test_results 기반으로 계산된다(단, Out of Scope 예외: 별도 플래그 제공 없이 동일 쿼리 범위 확장만 반영).
- [ ] **AC-13:** `isAggregated === true`일 때 `FailedBlockedCard`의 `tcs` 리스트와 `totalCount`는 parent + subs의 latest-status 기준 failed/blocked TC 전체를 포함한다.
- [ ] **AC-14:** `isAggregated === true`일 때 `Activity24hFeed`의 logs는 parent + subs의 최근 24h 내 activity를 포함한다.

### 엣지 & 중복 제거
- [ ] **AC-15:** 같은 test_case가 parent run과 sub run 양쪽에 포함될 때, `rollupStats.total` 및 `tcStats.total`은 **run × tcId 쌍 기준**(현재 `loadMilestoneDetailData`의 집계 방식과 동일)으로 카운트한다. Test case 레벨 중복 제거는 이번 범위가 아니며 비고로 명시한다 (BR-2).
- [ ] **AC-16:** `rollupStats === null`(sub 0개 또는 sub runs 0개)일 때 `isAggregated === false`이며 모든 기존 parent-only 동작이 유지된다(회귀 없음).
- [ ] **AC-17:** 2-level nested milestone(sub의 sub)은 정책상 금지되어 있으므로(milestones.ts의 `preventThreeLevelNesting`) 이번 범위에서 재귀 집계는 하지 않는다.

### 성능
- [ ] **AC-18:** `loadOverviewExtra`의 쿼리 수 증가는 최대 **+1쿼리**를 넘지 않는다(subRunIds 조회 1회 추가 후 `in('run_id', [...parent, ...sub])`로 통합). 초기 로딩 시간 p95 증분은 +500ms 이내.

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**시나리오 A — Parent without subs (기존 동작 유지):**
1. 유저가 `/projects/:pid/milestones/:mid`로 진입
2. `loadMilestoneDetailData` 실행
3. `subMilestonesData.length === 0` → `rollupStats = null`, `isAggregated = false`
4. `tcStats`는 parent 직속 runs 기준으로 계산
5. Roll-up 뱃지/카드 모두 렌더되지 않음
6. Burndown, KPI, Intel, Failed&Blocked, Activity 24h 전부 parent 직속 데이터

**시나리오 B — Parent with 1 sub + direct runs:**
1. 진입 → `subMilestonesData.length === 1`
2. sub의 runs가 존재하면 rollup 계산 수행 → `rollupStats !== null`
3. **신규 동작:** `tcStats`에 rollup 값을 주입(parent 직속 값 덮어씀)
4. Header: Progress bar = `rollupStats.coverage`, TC Summary = rollup 수치, 이름 옆에 "Roll-up · 1 sub" 뱃지
5. **Roll-up Mode 배너 카드는 렌더되지 않음** (삭제됨)
6. Overview: Burndown Y축 = rollup total, executedPerDay = parent + sub 합산, KPI/Velocity/TopFailTags/FailedBlocked/Activity24h 전부 합산 반영

**시나리오 C — Parent with 2 subs + direct runs:**
- Scenario B와 동일하되 뱃지 텍스트가 "Roll-up · 2 subs" (복수형 처리)
- rollup 합산 범위가 2개 subs + parent 직속으로 확장

**시나리오 D — Parent with subs but subs have 0 runs:**
1. `subMilestonesData.length >= 1` 이지만 `subRunsData.length === 0` → `rollupStats = null`
2. `isAggregated = false` → 시나리오 A와 동일하게 parent-only 동작
3. Roll-up 뱃지/카드 렌더되지 않음 (AC-16 회귀 금지)

**시나리오 E — Parent with no direct runs, subs have runs:**
1. parent runs = 0, sub runs > 0 → rollup 계산 수행
2. `parentTotal = 0, parentTested = 0`, `subTotal > 0`
3. `tcStats`가 rollup 값으로 세팅됨 → Header/Burndown에 sub 데이터만 집계된 숫자 표시
4. Burndown `executedPerDay`는 sub test_results 기준

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | `isAggregated = (subMilestones.length >= 1) && (rollupStats !== null)`. 이 조건이 true일 때에만 Roll-up 뱃지 + 집계 데이터 주입이 적용된다. | 기존 로직 유지 |
| BR-2 | Rollup TC 카운트는 run × tcId 조합 기준으로 계산한다. 같은 test_case가 parent run과 sub run 양쪽에서 중복되어도 각각 1씩 카운트된다. | 현재 로직 유지, 추후 별도 스펙에서 dedup 논의 |
| BR-3 | `executedPerDay` 합산 시 parent 직속 runIds와 subs 직속 runIds를 합쳐 단일 `in('run_id', [...])` 쿼리로 조회한다. | 쿼리 수 최소화(AC-18) |
| BR-4 | 2-level nested milestone은 정책상 생성 불가(`preventThreeLevelNesting`). 따라서 sub의 sub까지 재귀 집계하지 않는다. | 기존 정책 준수 |
| BR-5 | Roll-up 뱃지는 i18n 키 `milestones.rollup` + subs 개수 조합으로 렌더(`{rollup} · {n} sub` / `{rollup} · {n} subs`). | 기존 `milestones.rollup` 키 재사용 |

### 4-3. 권한 (RBAC)

| 역할 | Roll-up 뱃지 조회 | 집계 데이터 조회 |
|------|-------------------|-----------------|
| Owner | O | O |
| Admin | O | O |
| Manager | O | O |
| Tester | O | O |
| Viewer | O | O |
| Guest | X (로그인 필요) | X |

> 본 기능은 순수 프론트 렌더 + 기존 RLS 범위 내 쿼리 확장이다. 쓰기 동작(INSERT/UPDATE/DELETE) 없음. Sub milestones 접근 권한은 기존 `milestones` 테이블 RLS 정책을 그대로 따른다.

### 4-4. 플랜별 제한

| 플랜 | 제한 | 초과 시 동작 |
|------|------|-------------|
| Free | 해당 없음 | — |
| Hobby | 해당 없음 | — |
| Starter | 해당 없음 | — |
| Professional | 해당 없음 | — |
| Enterprise | 해당 없음 | — |

> Sub milestone 생성 자체의 플랜별 제한은 별도 기능(`milestones` 생성 정책)이 관리한다. 이 스펙은 렌더 로직만 다루므로 플랜 게이트가 없다.

---

## 5. 데이터 설계

### 신규 테이블
**없음.**

### 기존 테이블 변경
**없음.** 마이그레이션 불필요.

### RLS 정책
**변경 없음.** 기존 `milestones`, `test_runs`, `test_results`, `test_cases` 테이블의 RLS 정책이 그대로 적용된다. Sub milestone의 runs/results 조회는 project_members 기반 기존 SELECT 정책으로 허용된다.

---

## 6. API 설계

### 6-1. `loadMilestoneDetailData` — tcStats에 rollup 주입

**현재 (page.tsx 483-500):**
```typescript
return {
  // ...
  tcStats: { passed: aggPassed, failed: aggFailed, blocked: aggBlocked, retest: aggRetest, untested: Math.max(0, aggUntested), total: aggTotal, passRate: aggPassRate },
  // ...
  rollupStats,
};
```

**변경 후:**
```typescript
// isAggregated 조건을 데이터 함수 내에서도 선언적으로 정의
const isAggregated = (subMilestonesData || []).length > 0 && rollupStats !== null;

// tcStats를 isAggregated일 때 rollup 값으로 덮어씀
const finalTcStats: TcStats = isAggregated && rollupStats
  ? {
      passed: rollupStats.passed,
      failed: rollupStats.failed,
      blocked: rollupStats.blocked,
      retest: Math.max(0, rollupStats.completed - rollupStats.passed - rollupStats.failed - rollupStats.blocked),
      untested: Math.max(0, rollupStats.total - rollupStats.completed),
      total: rollupStats.total,
      passRate: rollupStats.passRate,
    }
  : { passed: aggPassed, failed: aggFailed, blocked: aggBlocked, retest: aggRetest, untested: Math.max(0, aggUntested), total: aggTotal, passRate: aggPassRate };

return {
  // ...
  tcStats: finalTcStats,
  rollupStats,  // 그대로 유지 (디버깅 및 뱃지 텍스트용 subMilestones.length 계산에는 불필요하지만 타입 유지)
};
```

**근거:** 옵션 **가 (단일화)** 채택. `rollupStats`는 타입과 하위 호환을 위해 필드는 유지하지만, UI는 `tcStats`만 참조하게 된다. 덕분에 BurndownChart, KpiStrip, FailedBlockedCard 등 기존 컴포넌트는 변경 없이 자동으로 rollup 값을 사용한다. (옵션 나는 모든 컴포넌트에 `isAggregated + rollupStats` 분기 추가 필요 → 복잡도 증가. 옵션 가가 파일 수/변경 라인 수 모두 최소.)

### 6-2. `loadMilestoneDetailData` — failedBlockedTcs 집계 범위 확장

**현재 (page.tsx 392-407):**
```typescript
const failedBlockedTcList: FailedBlockedTcItem[] = [];
globalTcStatusMap.forEach((status, tcId) => {
  if (status === 'failed' || status === 'blocked') {
    // ...parent 직속 allRawResults만 기반
  }
});
```

**변경 후:** `isAggregated`일 때 sub runs의 latest status도 포함한다.

```typescript
// subRunsData를 이미 가지고 있으므로(rollup 계산 블록 내부), 해당 블록 안에서
// allRawResults에 sub의 결과도 추가하도록 확장한다.
// sub의 test_results 쿼리 시 issues/note/author도 함께 select하여
// allRawResults에 push 한다. 이후 기존 latest-status 로직은 그대로 동작.
```

**쿼리 변경 구체안:** page.tsx 283-285의
```typescript
const { data: subResultsData } = await supabase
  .from('test_results').select('run_id, test_case_id, status, created_at').in('run_id', subRunIds).order('created_at', { ascending: false });
```
를 아래로 교체:
```typescript
const { data: subResultsData } = await supabase
  .from('test_results')
  .select('run_id, test_case_id, status, created_at, note, author')
  .in('run_id', subRunIds)
  .order('created_at', { ascending: false });
```
그리고 subResultsData를 순회할 때 `allRawResults`와 `globalTcStatusMap`에 함께 push/set한다(run_id → run_name 매핑을 위해 subRunsData에서 `name`도 select 추가 필요: `.from('test_runs').select('id, milestone_id, test_case_ids, name')`).

### 6-3. `loadOverviewExtra` — runIds 범위 확장 (OverviewTab.tsx)

**현재 (OverviewTab.tsx 106-118):**
```typescript
async function loadOverviewExtra(milestoneId: string, runIds: string[]): Promise<OverviewExtra> {
  // runIds = parent runs only
  // failedResultsRes, execResultsRes 둘 다 parent runs 기반
}
```

**변경 후:** 시그니처에 `aggregatedRunIds?: string[]` 추가. 있으면 그 값을 사용, 없으면 현재 `runIds` 사용.

```typescript
async function loadOverviewExtra(
  milestoneId: string,
  runIds: string[],
  aggregatedRunIds?: string[],
): Promise<OverviewExtra> {
  const queryRunIds = aggregatedRunIds && aggregatedRunIds.length > 0 ? aggregatedRunIds : runIds;
  // failedResultsRes, execResultsRes 둘 다 queryRunIds 기반으로 변경
  // plans 쿼리는 milestoneId 그대로 (sub plans는 범위 밖)
}
```

**호출부 (OverviewTab.tsx 176-180):**
```typescript
const { data: extra, isLoading: extraLoading } = useQuery({
  queryKey: ['milestone-overview-extra', milestoneId, [...runIds].sort().join(','), [...aggregatedRunIds].sort().join(',')],
  queryFn: () => loadOverviewExtra(milestoneId, runIds, aggregatedRunIds),
  staleTime: 60_000,
});
```

**aggregatedRunIds prop 공급:** `MilestoneDetailData`에 `aggregatedRunIds: string[]` 필드 추가. `loadMilestoneDetailData`에서 `[...parent runIds, ...subRunsData.map(r => r.id)]`로 채운다. 단, `isAggregated === false`면 parent runIds만(실질적으로 `runIds`와 동일) — 이 경우 `aggregatedRunIds === undefined`로 전달하여 기존 경로 유지.

### 6-4. Edge Function
**신규 없음.** 전부 Supabase Client 쿼리 확장.

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일
**없음.**

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/milestone-detail/page.tsx` | (1) `loadMilestoneDetailData`에서 `isAggregated` 계산 후 `tcStats`에 rollup 값 주입 (line 263-273, 495 부근). (2) sub `test_results` select에 `note, author` 추가 및 `allRawResults`/`globalTcStatusMap`에 sub 결과 머지(line 283-314). (3) `subRunsData` select에 `name` 추가(line 279). (4) `MilestoneDetailData` 타입에 `aggregatedRunIds: string[]` 필드 추가(line 113-130). (5) 반환 객체에 `aggregatedRunIds` 추가(line 483-500). (6) **Roll-up Mode 배너 카드 블록 삭제**(line 816-838 전체). (7) Header 이름 영역에 Roll-up 뱃지 추가(line 746 근처, 기존 Status 뱃지 다음 위치). (8) `<OverviewTab>`에 `aggregatedRunIds` prop 전달(line 881-902). |
| `src/pages/milestone-detail/OverviewTab.tsx` | (1) `OverviewTabProps`에 `aggregatedRunIds?: string[]` 추가(line 71-92). (2) `loadOverviewExtra` 시그니처에 `aggregatedRunIds?` 추가 및 `queryRunIds`로 쿼리 분기(line 106-163). (3) `useQuery` queryKey에 `aggregatedRunIds` 해시 포함, queryFn 호출에도 전달(line 176-180). |
| `src/pages/milestone-detail/BurndownChart.tsx` | **변경 없음.** `totalTCs` prop과 `executedPerDay` prop이 OverviewTab에서 이미 rollup 값으로 자동 교체된다. |
| `src/pages/milestone-detail/KpiStrip.tsx` | **변경 없음.** `remaining`, `executed`, `total` 값이 tcStats를 거쳐 자동으로 rollup 값이 된다. |
| `src/pages/milestone-detail/FailedBlockedCard.tsx` | **변경 없음.** `tcs` prop과 `totalCount` prop이 `failedBlockedTcs`에서 이미 확장된다(AC-13). |
| `src/pages/milestone-detail/TopFailTagsCard.tsx` | **변경 없음.** `loadOverviewExtra` 쿼리 범위 확장으로 자동 반영. |
| `src/pages/milestone-detail/VelocitySparkline.tsx` | **변경 없음.** `weekCounts`가 확장된 executedPerDay에서 자동 계산됨. |
| `src/pages/milestone-detail/Activity24hFeed.tsx` | **변경 없음.** `activityLogs`는 page.tsx의 `allActivityLogs`에서 이미 확장됨(6-2에서 sub 결과를 `allActivityLogs`에 push). |
| `src/pages/milestone-detail/EtaCard.tsx` | **변경 없음.** `daysLeft` 등 date 기반 — rollup과 무관. |
| `src/i18n/local/en/milestones.ts` | `rollupBadgeSingular: 'Roll-up · {n} sub'`, `rollupBadgePlural: 'Roll-up · {n} subs'` 두 키 추가(복수형 처리). |
| `src/i18n/local/ko/milestones.ts` | 동일 키 한국어 번역 추가. |

### 삭제 예정 UI 블록
- **page.tsx 816-838** (23줄) — Roll-up Mode 배너 카드 전체. Header 내부 info 섹션에서 제거하고, 대신 line 746 근처(milestone name + status badge 영역)에 컴팩트 Roll-up 뱃지를 추가한다.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| Parent에 sub 0개 | `isAggregated = false`, 모든 기존 동작 유지 (AC-3, AC-16) |
| Sub이 1개 있지만 sub의 runs가 0개 | `rollupStats = null` → `isAggregated = false` → 기존 동작 유지. Roll-up 뱃지/집계 모두 비활성 |
| Parent 직속 runs 0개 + subs의 runs 존재 | rollup 계산됨. `parentTotal=0`이어도 `subTotal>0`이면 `rollupStats.total > 0` → `isAggregated = true`. tcStats/Burndown/Intel 모두 sub 데이터로 채워짐 |
| 같은 test_case가 parent run과 sub run 양쪽 포함 | run×tcId 쌍 기준 각각 카운트 (BR-2). Top-Fail Tags에서도 중복 카운트됨 — 비고에 명시 |
| Sub milestone이 삭제된 직후 캐시 잔존 | React Query invalidation이 `['milestone-detail', milestoneId]` 키로 전파되면 즉시 갱신. 삭제 시점의 invalidation은 sub milestone 삭제 mutation 측 책임(본 스펙 범위 외) |
| 2-level nested (sub의 sub) | 정책상 생성 불가(`preventThreeLevelNesting`). 재귀 집계 없음(BR-4, AC-17) |
| 네트워크 에러로 sub runs 쿼리 실패 | `subRunsData === null` → 기존 코드 패턴대로 `if (subRunsData && subRunsData.length > 0)` 가드로 rollup 계산 skip → `isAggregated = false` |
| 300 TC 이상 매우 큰 rollup | Burndown Y축 자동 스케일(Recharts 기본). 기존 동작 유지. 성능은 쿼리 수 최소화(AC-18)로 커버 |
| 뱃지 텍스트 국제화: subs가 0개인 경우 | `isAggregated === false`이므로 뱃지 렌더되지 않음 (0 예외 없음) |
| rollup 계산이 NaN/Infinity 생성 | `rollupCompleted === 0`일 때 `rollupPassRate = 0` (기존 guard 유지). `Math.max(0, ...)` guard로 음수 방지 |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **Overview 레이아웃/공백 재설계** — Roll-up 배너 카드 제거로 생기는 빈 공간 활용, Overview 섹션 재배치 등은 **@designer가 작성할 `design-spec-milestone-overview-v3`에서 다룸**. 본 스펙은 데이터/로직 단일화만 책임진다.
- [ ] **Activity 탭의 rollup 반영** — page.tsx line 906-1070의 Activity 탭은 `activityLogs` prop 기반이므로 자동으로 쿼리 확장의 영향을 받지만, Activity 탭 자체의 UX 변경(예: sub milestone 필터, "all levels" 토글)은 이번 범위가 아니다.
- [ ] **Issues 탭의 rollup 반영** — `IssuesList`는 `runIds={runs.map(r => r.id)}` (parent runs only)로 동작한다. Sub runs의 issues 합산은 별도 스펙에서 다룸.
- [ ] **AI Risk Insight에 rollup context 전달** — 현재 `RiskInsightContainer`는 `tcStats`를 받지 않고 자체 계산하지 않는다(AI는 별도 edge function). tcStats가 rollup 값으로 주입된 뒤 riskBullets/riskLevel 계산이 rollup 기반이 되는 부수 효과는 수용(추가 설계 없음).
- [ ] **Test case 레벨 중복 제거** — 같은 tcId가 parent와 sub 양쪽 runs에 존재할 때 dedup 로직. 별도 스펙에서 논의.
- [ ] **Rollup 값 실시간 갱신 배지** — "Updated just now" 같은 live 표시는 별도.
- [ ] **Sub milestone별 drilldown 링크 in Header 뱃지** — 뱃지 클릭 시 sub 목록 팝오버 등은 design-spec v3에서 결정.
- [ ] **Roll-up 토글 옵션 (사용자가 parent-only 보기 전환)** — 현 정책은 "rollup이 기본이며 유일". 토글 UX는 별도 스펙에서 필요성 평가.

---

## 10. i18n 키

| 키 | EN | KO |
|----|----|----|
| `milestones.rollupBadgeSingular` | `"Roll-up · {{n}} sub"` | `"롤업 · 하위 {{n}}개"` |
| `milestones.rollupBadgePlural` | `"Roll-up · {{n}} subs"` | `"롤업 · 하위 {{n}}개"` |

> 기존 키(`milestones.rollup`, `milestones.rollupMode`, `milestones.rollupDescription`, `milestones.rollupTotal`, `milestones.rollupPassed`, `milestones.rollupFailed`, `milestones.rollupCoverage`, `milestones.rollupPassRate`)는 Roll-up 배너 카드 삭제로 **사용처가 없어짐**. 안전한 제거를 위해 본 스펙에서는 키를 **보존**하되(다른 곳에서 참조될 수 있음), QA 단계에서 ripgrep으로 참조 0건 확인 후 별도 cleanup PR에서 삭제 권장.
>
> 한국어: "Sub"의 자연스러운 복수형 구분이 모호하므로 singular/plural을 동일 번역으로 둔다.

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1 ~ AC-18, 모두 관측/측정 가능)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (DB 변경 없음 — 명시)
- [x] RLS 정책이 정의되었는가 (변경 없음 — 명시)
- [x] 플랜별 제한이 명시되었는가 (해당 없음 — 명시)
- [x] RBAC 권한 매트릭스가 있는가 (읽기 전용 기능이므로 단순 표 제공)
- [x] 변경 파일 목록이 구체적인가 (실제 경로 + 수정 라인 번호 명시)
- [x] 엣지 케이스가 식별되었는가 (10개 케이스)
- [x] Out of Scope이 명시되었는가 (8개 항목)
- [x] i18n 키가 en/ko 둘 다 있는가 (2개 신규, 기존 보존 정책 명시)
- [ ] 관련 디자인 명세가 Approved 상태인가 (후속 작업 — `design-spec-milestone-overview-v3` 필요)

---

## 부록 A — 데이터 구조 선택 근거 (옵션 가 vs 나)

| 비교축 | 옵션 가 (tcStats에 rollup 주입) | 옵션 나 (tcStats / rollupStats 둘 다 유지, UI에서 분기) |
|--------|-------------------------------|---------------------------------------------------|
| 컴포넌트 변경 파일 수 | **2개** (page, OverviewTab) | 7개+ (모든 Intel/KPI/Burndown에 분기) |
| 분기 로직 분산 | 없음 (단일 진실) | 각 컴포넌트마다 `isAggregated ? rollup : tc` 반복 |
| 회귀 위험 | 낮음 (prop 값만 바뀜) | 높음 (분기 누락 시 수치 불일치 재발) |
| parent-only 뷰 요구 생길 시 | `rollupStats` 필드로 parent-only 파생 가능(원본 유지) | 이미 분리되어 있어 쉬움 |
| 코드 라인 수 증감 | 삭제 > 추가 (Roll-up 카드 23줄 삭제) | 추가 > 삭제 (분기 코드 추가) |

**결론:** 옵션 **가** 채택. Single Source of Truth 원칙, 변경 파일 최소, 회귀 위험 최소.

---

## 부록 B — 핸드오프 메모 (→ @designer, → @developer)

### @designer에게 인수인계 (design-spec-milestone-overview-v3 작성 시 고려)
1. **삭제되는 공간:** page.tsx 816-838 (Roll-up Mode 배너 카드, 높이 약 110px). 이 공간이 Header 아래 비게 된다.
2. **신규 공간:** Header milestone name 옆에 컴팩트 뱃지 1개(폭 약 100-120px, 높이 status badge와 동일). 디자인 토큰 제안: 배경 `#EEF2FF`, 테두리 `#C7D2FE`, 텍스트 `#3730A3`, 아이콘 `ri-loop-left-line` `#6366F1`. (기존 Roll-up 카드와 동일 팔레트)
3. **결정 필요:** 뱃지 클릭 시 sub 목록 팝오버 제공 여부 — 본 스펙은 정적 뱃지만 요구. 팝오버는 v3에서 결정.
4. **영향 받는 Overview 레이아웃:** Burndown Y축 스케일이 커짐(rollup 시). `mo-chart-body` 높이 200px는 유지하지만 Y축 틱 개수 체감 변화 있을 수 있음 — Recharts 자동 스케일.
5. **공백 활용 제안(선택):** Hero row 위로 Header 끝나는 경계선이 약간 올라올 수 있음. 추가 KPI(예: "Subs Completion 60%")를 뱃지 근처에 넣는 안은 design-spec v3에서 판단.

### @developer에게 인수인계
- 구현 시작 전 **@designer의 `design-spec-milestone-overview-v3`** 가 Approved 되어 뱃지 시각 스펙이 확정되었는지 확인하라.
- 순서: (1) `loadMilestoneDetailData`의 sub select 확장 → (2) `tcStats` 주입 로직 → (3) `aggregatedRunIds` 반환/전달 → (4) `loadOverviewExtra` 시그니처 확장 → (5) Roll-up 배너 카드 삭제 → (6) Header 뱃지 추가 → (7) i18n 키 추가. 이 순서로 하면 각 단계마다 수동 확인이 가능하다.
- 회귀 테스트 필수: sub 0개 milestone 방문 시 모든 수치가 기존과 완전히 동일해야 함(AC-3, AC-16).
- React Query cache key 변경 주의: `aggregatedRunIds`를 key에 포함하므로 기존 캐시는 자동 무효화된다.
