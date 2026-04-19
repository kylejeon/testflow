# Dev Spec: Milestone Overview Redesign + Issues Tab Metadata

> **작성일:** 2026-04-19
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-milestone-overview-redesign.md` (작성 예정, mockup 참고: `desi/mockup_3_milestone_burndown.html`)
> **영향 범위:** `src/pages/milestone-detail/`, `src/pages/plan-detail/`, `src/pages/project-milestones/`, `supabase/functions/create-jira-issue/`, `supabase/functions/create-github-issue/`, `supabase/functions/sync-jira-status/` (→ `sync-jira-metadata`로 개명), `supabase/functions/fetch-github-issues/` (확장) + 신규 `sync-github-metadata`

---

## 1. 개요

### 문제 (세 가지)
1. **Issues 탭의 정보 부족** — Plan Detail / Milestone Detail의 Issues 탭이 Jira key 또는 GitHub 번호만 보여주고, priority/status/assignee 같은 트리아지 정보가 없어 QA Lead가 외부로 이동해야만 긴급성·담당자를 파악할 수 있다.
2. **Milestone Detail 진입 경로 부재** — `/projects/:projectId/milestones/:milestoneId` 라우트는 존재하지만, Milestone 리스트(`MilestonePlanList`)에서 해당 상세 뷰로 이동하는 UI 버튼이 없다. 현재 Milestone Detail은 router 코드 외에 접근 수단이 모호하다.
3. **Milestone Detail 탭 과잉 분할** — Results / Status / Burndown / Activity / Issues 5개 탭에 "어디에 무엇이 있는지" 분산되어 있어, PM·QA Lead가 한 화면에서 건강도를 빠르게 파악할 수 없다.

### 해결
1. **Issues 메타데이터 Option B (DB 저장 + sync)** — issue 생성 시 priority/status/assignee를 DB에 저장하고, 주기적으로 외부와 sync해 Issues 탭에서 뱃지·avatar로 바로 표시한다.
2. **`MilestonePlanList` 헤더에 "Open detailed view →" 버튼 추가** — 리스트 뷰를 유지한 채 상세로 이동하는 단일 버튼으로 해결.
3. **Milestone Detail 3탭 재편** — **Overview / Activity / Issues** 3탭으로 축소. Overview에 Burndown·Status·Results를 통합하고, Intel 그리드(mockup_3 기반)로 건강도를 한눈에 본다.

### 성공 지표
- Issues 탭에서 "외부 링크 클릭 → 메타데이터 확인" 트립 감소 (목표: -70%)
- Milestone Detail 방문 수 ≥ Milestone 리스트 대비 주당 20% 이상 (진입 경로 생긴 효과)
- Overview 탭 하나에서 KPI/Risk/AI Insight 확인 완료 시간 < 10초 (현 3개 탭 왕복 시 30초+)
- `?tab=burndown` 등 구 URL의 404·잘못된 탭 진입 0건 (리다이렉트 규칙으로 처리)

---

## 2. 유저 스토리

### Feature A — Issues 탭 메타데이터
- As a **QA Lead**, I want to see **priority / status / assignee** on each Jira and GitHub issue in the Issues tab, so that I can triage without clicking away to Jira/GitHub.
- As a **Manager**, I want issue metadata to auto-refresh periodically, so that the tab reflects the current external state without manual work.
- As a **Tester** who just filed a bug, I want the priority/status/assignee I set at creation time to immediately appear in Testably, so that I do not need to wait for a sync cycle.

### Feature B — Milestone List → Detail Entry
- As a **PM on the Milestones list**, I want an **"Open detailed view →"** button on each milestone header, so that I can drill into Burndown/Intel/Activity/Issues without memorising the URL.
- As a **new user**, I want a clear visual affordance (button with arrow icon), so that I do not need to discover the feature through random clicks.

### Feature C — Milestone Detail Overview Redesign
- As a **PM**, I want Burndown chart, KPIs (Remaining/Executed/Velocity/PassRate), Failed & Blocked top 4, Top-Fail Tags, ETA, and AI Insight all on a single Overview tab, so that I can asses project health in one glance.
- As a **QA Engineer**, I want the Runs section to clearly distinguish **Planned Runs** (with a plan_id) from **Milestone-direct Runs** (no plan), so that I understand which executions are governed by a formal test plan.
- As a **Team Lead**, I want a **Last 24h activity mini feed** (4 events) with a "View all activity" link, so that I can quickly see momentum without switching tabs.
- As a **bookmark user** with `?tab=burndown` saved, I want to land on Overview (since Burndown was merged), so that my saved link still works.

---

## 3. 수용 기준 (Acceptance Criteria)

### Feature A — Issues Metadata

- [ ] **AC-A1:** Jira 이슈 생성 API 호출 성공 시, `test_results.jira_issues_meta` (JSONB, 아래 §5 참조)에 `{key, url, priority, status, assignee_account_id, assignee_display_name, assignee_avatar_url, last_synced_at}` 객체가 append되고, 프론트 `IssuesTab`이 이 JSONB를 읽어 priority 뱃지(예: "High"), status 뱃지(예: "In Progress"), assignee avatar를 300ms 이내 렌더링한다.
- [ ] **AC-A2:** GitHub 이슈 생성 API 호출 성공 시, 기존 `test_results.github_issues` JSONB에 `priority(label 기반), state, assignee_login, assignee_avatar_url, last_synced_at` 필드가 append되고, IssuesTab이 동일하게 렌더링한다. (스키마: §5-2)
- [ ] **AC-A3:** `sync-jira-metadata` Edge Function이 pg_cron으로 **6시간마다** 실행되어, 최근 30일 이내 `test_results` 중 `jira_issues_meta`에 key가 있는 레코드를 대상으로 Jira REST API v3 `/rest/api/3/issue/{key}?fields=priority,status,assignee`로 재조회해 JSONB를 update하고, 각 issue의 `last_synced_at`을 갱신한다.
- [ ] **AC-A4:** `sync-github-metadata` Edge Function이 동일하게 6시간 주기로 실행되어, `github_issues`에 저장된 `{number, repo}` 조합으로 GitHub API `/repos/{owner}/{repo}/issues/{number}`를 호출하고, `state / assignees[0]` 정보를 JSONB에 merge한다.
- [ ] **AC-A5:** Rate limit 초과 (Jira 50 req/sec, GitHub 5000 req/hr) 시 함수가 429를 받으면 즉시 종료하지 않고, 지수백오프(1s, 2s, 4s, 최대 3회) 후 재시도하며 실패한 key 리스트를 `jira_sync_log` / `github_sync_log`에 기록한다.
- [ ] **AC-A6:** IssuesTab 상단에 "Last synced X ago" 텍스트와 "Refresh now" 버튼이 표시되고, 버튼 클릭 시 해당 `run_id` 범위에 대해서만 sync를 즉시 실행한다 (debounce 10초, 권한: Tester 이상).
- [ ] **AC-A7:** 메타데이터 조회에 실패한 이슈(예: Jira에서 삭제됨, 권한 없음)는 기존 `key`만 표시되고, priority/status/assignee 자리에 "—" placeholder가 들어간다. 에러 토스트는 최대 1회만 표시된다.
- [ ] **AC-A8:** Plan Detail Issues 탭과 Milestone Detail Issues 탭이 **동일한 렌더 컴포넌트(`<IssuesList />`)**를 사용해 UI 일관성을 보장한다.

### Feature B — Milestone List → Detail Entry

- [ ] **AC-B1:** `MilestonePlanList.tsx`의 `.ms-header-actions` div 내부, 기존 "Edit" 버튼 **왼쪽**에 `<button class="btn btn-sm">`으로 **"Open detailed view →"** 버튼이 렌더링된다.
- [ ] **AC-B2:** 버튼 클릭 시 `navigate('/projects/' + projectId + '/milestones/' + milestone.id)`로 이동한다 (react-router-dom 7.x `useNavigate`).
- [ ] **AC-B3:** 버튼은 milestone 상태(`upcoming`/`started`/`past_due`/`completed`)와 무관하게 항상 활성화된다.
- [ ] **AC-B4:** i18n 키 `milestones.openDetailedView` 사용 (EN: "Open detailed view →", KO: "상세 보기 열기 →").
- [ ] **AC-B5:** 버튼 내부에 `<svg>` 우측 화살표 아이콘 포함 (기존 `.plan-card-caret` 아이콘 재사용).

### Feature C — Milestone Detail Overview Redesign

- [ ] **AC-C1:** Milestone Detail의 탭 배열이 `['overview', 'activity', 'issues']` 3개로 축소되고, 기본 선택 탭은 `overview`.
- [ ] **AC-C2:** `?tab=results`, `?tab=status`, `?tab=burndown` URL로 진입 시 자동으로 `overview` 탭으로 리다이렉트되고, `?tab=activity` / `?tab=issues`는 유지된다. (URL 변경은 `navigate(..., { replace: true })`로 스크롤 히스토리 보존)
- [ ] **AC-C3:** Overview 탭 최상단에 **Burndown Chart** (높이 160px, Recharts `LineChart`)와 **4 KPI strip** (Remaining / Executed / Velocity / Pass Rate)이 렌더링된다.
- [ ] **AC-C4:** Burndown 아래 **Intel 2×N 그리드** (desktop 2-column, mobile 1-column):
  - Failed & Blocked (최대 4개, 초과 시 "View all in Issues →" 링크가 Issues 탭으로 이동)
  - Velocity 7일 sparkline (최근 7일 executed count)
  - **Top-Fail Tags** (test_cases.tags 쉼표분리 문자열 기반, 해당 마일스톤 내 fail 비율 Top 3 — §6-2 쿼리 참조)
  - ETA vs Target D-day (기존 Burndown 탭의 projDays 로직 유지)
  - AI Risk Insight (기존 Status 탭 isCritical/isAtRisk + 기존 Burndown AI Insight 통합 카드)
  - Activity Last 24h mini feed (4개, 초과 시 "View full activity →" 링크가 Activity 탭으로 이동)
- [ ] **AC-C5:** Intel 그리드 아래 **실행 목록** 섹션:
  - Sub Milestones (subMilestones.length > 0일 때만 렌더)
  - **Test Plans** (신규 — milestone_id 일치하는 test_plans, 카드형. plans.length === 0이면 "No plans linked to this milestone" empty state)
  - Runs — **Planned vs Milestone-direct** 배지로 구분 (`test_plan_id IS NULL` → "Direct" 뱃지, 아니면 "Plan: {plan.name}" 뱃지)
  - Exploratory 세션 (기존 유지)
- [ ] **AC-C6:** Overview 탭 우측 또는 하단에 **Contributors Top 5** 패널 (기존 Status 탭에서 이동, 기존 `contributorProfiles` 데이터 재사용).
- [ ] **AC-C7:** 기존 Results / Status / Burndown 탭 버튼은 UI에서 완전히 제거된다. 탭 버튼 코드(`page.tsx:822-855`) 수정.
- [ ] **AC-C8:** Activity 탭은 기존 동작 유지 (14일 polyline + 로그 리스트 + 상태 필터 + 페이지네이션). 코드 변경 없음.
- [ ] **AC-C9:** Issues 탭은 기존 failed/blocked TC 리스트를 유지하면서, Feature A의 priority/status/assignee 메타데이터를 `<IssuesList />` 공통 컴포넌트로 렌더링한다.
- [ ] **AC-C10:** Overview 탭 렌더링은 초기 진입 후 1.5초 이내 완료 (현 `loadMilestoneDetailData` queryFn 재사용, 추가 DB round-trip 없음).
- [ ] **AC-C11:** `runs.length === 0` + `subMilestones.length === 0` + `plans.length === 0`일 때, 실행 목록 섹션은 "No runs or plans yet. Create a plan to start tracking executions." empty state 하나만 표시.

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

#### 4-1-A. Feature A — Issues 탭 메타데이터

**Happy Path (생성 시):**
1. Tester가 Run Detail에서 실패한 TC를 선택 → "Create Jira Issue" 모달 오픈
2. 모달에서 priority="High", assignee="user@example.com" 입력 후 제출
3. 프론트가 `supabase.functions.invoke('create-jira-issue', {body: {...}})` 호출
4. Edge Function이 Jira API로 이슈 생성 성공 → Jira가 `{key: "PROJ-123", id, self}` 반환
5. Edge Function이 **추가로** Jira GET `/rest/api/3/issue/PROJ-123?fields=priority,status,assignee` 호출해 메타데이터 획득
6. Edge Function이 `adminClient.from('test_results').update(...)`로 `jira_issues_meta` JSONB 배열에 다음 객체 append:
   ```json
   {
     "key": "PROJ-123",
     "url": "https://...atlassian.net/browse/PROJ-123",
     "priority": "High",
     "status": "To Do",
     "assignee_account_id": "abc123",
     "assignee_display_name": "John Doe",
     "assignee_avatar_url": "https://...",
     "last_synced_at": "2026-04-19T12:00:00Z"
   }
   ```
7. 프론트는 invoke 응답 받은 뒤 `queryClient.invalidateQueries(['milestone-detail', ...])` 또는 `['plan-detail', ...])` 호출
8. IssuesTab이 refetch → priority 뱃지(High=주황), status 뱃지(To Do=회색), assignee avatar 렌더링

**Happy Path (주기 sync):**
1. pg_cron이 6시간마다 `sync-jira-metadata` Edge Function 호출
2. 함수가 `test_results` 중 `updated_at > now() - interval '30 days'` AND `jsonb_array_length(jira_issues_meta) > 0` 조건으로 조회
3. 모든 unique Jira key 추출 → organization의 jira_settings 기준으로 그룹핑
4. 각 org에 대해 Jira API `JQL: key in (KEY-1, KEY-2, ...)` bulk 조회 (최대 50개씩 배치)
5. 응답을 순회하며 매칭되는 `test_results`의 JSONB 원소를 업데이트 (priority/status/assignee + last_synced_at)
6. `jira_sync_log`에 direction='inbound' 행 insert
7. GitHub은 bulk 조회 API가 없으므로 issue별 개별 호출 (rate limit 고려 100ms 간격)

**Alternative — Manual Refresh:**
1. 유저가 Issues 탭 "Refresh now" 버튼 클릭
2. 프론트가 `supabase.functions.invoke('sync-jira-metadata', {body: {scope: 'run_ids', run_ids: [...]}})` 호출 (해당 탭에 표시된 run_id만)
3. 성공 시 "Synced X issues" 토스트 표시 후 queryClient invalidate
4. 실패 시 에러 토스트 + 기존 데이터 유지

**Error Flow:**
1. Jira API가 404 (이슈 삭제됨) → JSONB 원소에 `"error": "not_found"` 플래그 추가, 기존 메타데이터는 그대로 유지 (stale)
2. Jira API가 403 (권한 상실) → `jira_sync_log`에 error 기록, 사용자에게 Integration 설정 재확인 안내 토스트
3. Rate limit 429 → 지수백오프 3회 → 여전히 429이면 해당 배치 skip 후 다음 cron 주기에 재시도

#### 4-1-B. Feature B — Milestone List → Detail Entry

**Happy Path:**
1. 유저가 `/projects/:id/milestones` 방문
2. `MilestonePlanList` 헤더에 "Open detailed view →" 버튼 표시
3. 클릭 → `navigate('/projects/' + projectId + '/milestones/' + milestone.id)`
4. Milestone Detail Overview 탭이 기본으로 표시됨

**Error Flow:**
1. milestone.id가 undefined (이론상 불가) → 버튼 disabled, 클릭 시 아무 동작 없음

#### 4-1-C. Feature C — Milestone Detail Overview

**Happy Path:**
1. 유저가 Milestone Detail 진입 → 기본 탭 `overview`
2. `loadMilestoneDetailData()` 훅이 1회 호출되어 runs/subMilestones/sessions/activityLogs/failedBlockedTcs/tcStats/contributorProfiles 반환
3. 추가로 신규 `loadPlansAndDirectRuns()` 훅이 `test_plans` (milestone_id 일치) + `test_runs` (milestone_id 일치, `test_plan_id` 플래그 포함) 로드
4. Overview 탭 렌더:
   - 상단: Burndown Chart + KPI 4개
   - Intel 그리드: 6개 카드 (2×3)
   - 실행 목록: Sub Milestones / Test Plans / Runs (Planned/Direct 구분) / Exploratory
   - Contributors Top 5
5. 유저가 탭 전환 → Activity 또는 Issues로 이동 (기존 로직 유지)

**Alternative — `?tab=burndown` 구 URL 진입:**
1. URL search param에 `tab=results|status|burndown` 감지
2. `useEffect`에서 `navigate('?tab=overview', { replace: true })` 호출
3. Overview 탭 렌더

**Error Flow:**
1. `milestone` 로드 실패 → 기존 에러 화면 ("마일스톤을 찾을 수 없습니다") 유지
2. `test_plans` 로드 실패 → Overview의 Test Plans 섹션만 "Failed to load plans" inline 에러로 표시, 나머지 섹션은 정상 렌더

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | Issue 메타데이터의 priority 매핑: Jira "Highest"/"High" → UI "Critical"/"High" 뱃지, "Medium" → "Medium", "Low"/"Lowest" → "Low" | `src/lib/issueMetadata.ts` 유틸 신규 |
| BR-2 | GitHub은 기본 priority 개념이 없으므로 label 중 `priority/*` prefix를 가진 label을 priority로 해석 (예: `priority/high` → High). 없으면 "—" | 동일 유틸 |
| BR-3 | Jira status 매핑: "Done" / "Closed" / "Resolved" → green 뱃지, "In Progress" → blue, "To Do" → gray, 그 외 → 원문 그대로 | |
| BR-4 | GitHub state: "open" → blue "Open", "closed" → green "Closed" | |
| BR-5 | Assignee avatar는 Jira `avatar_url` 또는 GitHub `avatar_url` 직접 사용. 없으면 initials fallback (`<Avatar>` 컴포넌트) | |
| BR-6 | sync 주기: 6시간 (cron expression: `0 */6 * * *`). 수동 refresh는 run_ids 스코프 한정, 전체 재동기화는 불가 | rate limit 보호 |
| BR-7 | 메타데이터 fetch 실패는 이슈 자체를 숨기지 않음 (key는 항상 표시) | graceful degradation |
| BR-8 | Top-Fail Tags는 **마일스톤에 속한 runs**의 `test_results` 중 status='failed'인 TC의 `tags` 컬럼(쉼표 분리)을 파싱해 태그별 횟수 집계. Top 3를 추출 | §6-2 쿼리 참조 |
| BR-9 | Planned vs Direct 구분: `test_runs.test_plan_id IS NOT NULL` → "Plan: {plan.name}" 파란 뱃지, `IS NULL` → "Direct" 회색 뱃지 | migration 20260416_test_plans.sql에 이미 컬럼 존재 |
| BR-10 | 24h activity feed: `activityLogs` 중 `timestamp > now() - 24h` 필터 후 timestamp desc 정렬, 최대 4개 | 기존 ActivityLog 타입 재사용 |
| BR-11 | 구 URL `?tab=results|status|burndown` 리다이렉트는 항상 `replace: true`로 스크롤 히스토리 보존 | |

### 4-3. 권한 (RBAC)

모든 기능은 기존 프로젝트 멤버십 기반 권한을 따른다.

| 역할 | Overview 조회 | Issues 조회 | Issue 메타데이터 refresh | Milestone Detail 진입 |
|------|-------------|------------|---------------------|-------------------|
| Owner | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ | ✓ |
| Tester | ✓ | ✓ | ✓ | ✓ |
| Viewer | ✓ | ✓ | ✗ (refresh 버튼 hidden) | ✓ |
| Guest | ✗ | ✗ | ✗ | ✗ |

### 4-4. 플랜별 제한

| 플랜 | 제한 | 초과 시 동작 |
|------|------|-------------|
| Free (1) | Issues 메타데이터 sync 주기 12시간 (일반보다 느림), Jira/GitHub 연동 자체 불가 | 연동 시도 시 Hobby 업그레이드 유도 배너 |
| Hobby (2) | 표준 6시간 sync 주기. 수동 refresh 일 3회 | 3회 초과 시 "Upgrade for unlimited refreshes" 토스트 |
| Starter (3) | 6시간 sync + 무제한 수동 refresh | - |
| Professional (4) | 모든 기능 + Top-Fail Tags AI 분석 포함 | - |
| Enterprise S·M·L (5-7) | Professional 동일 + priority sync 주기 조정 가능 (1/3/6/12h) | - |

> **주의:** Overview 탭 재편 자체는 플랜 무관 (UI 변경이므로 모든 플랜에 적용). Test Plans 섹션은 플랜(Hobby+)에서만 실제 데이터가 있으므로, Free에서는 빈 상태로 렌더되며 "Upgrade to create plans" 링크 표시.

---

## 5. 데이터 설계

### 5-1. 신규/수정 컬럼

**테이블명: `test_results`** (기존 테이블)

| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `issues` (기존) | text[] | ✗ | `'{}'` | Jira key 배열 — **deprecate 예정**. 마이그레이션에서 `jira_issues_meta`로 복사 후 유지 (읽기 호환). |
| `jira_issues_meta` (신규) | jsonb | ✗ | `'[]'` | Jira 이슈 메타데이터 배열. 형식: `[{key, url, priority, status, assignee_account_id, assignee_display_name, assignee_avatar_url, last_synced_at, error?}]` |
| `github_issues` (기존) | jsonb | ✗ | `'[]'` | GitHub 이슈 메타데이터 배열. **필드 확장**: 기존 `{number, url, repo}` + 신규 `priority, state, assignee_login, assignee_display_name, assignee_avatar_url, last_synced_at, error?` |

### 5-2. Migration SQL

**파일명:** `supabase/migrations/20260419_issue_metadata.sql`

```sql
-- ============================================================
-- Issue Metadata 확장 (Option B)
-- test_results에 Jira/GitHub 이슈 메타데이터 저장
-- ============================================================

-- 1. jira_issues_meta JSONB 컬럼 추가
ALTER TABLE test_results
  ADD COLUMN IF NOT EXISTS jira_issues_meta JSONB NOT NULL DEFAULT '[]';

COMMENT ON COLUMN test_results.jira_issues_meta IS
  'Array of Jira issue metadata. Shape: [{key, url, priority, status, assignee_account_id, assignee_display_name, assignee_avatar_url, last_synced_at, error?}]. Synced every 6h via sync-jira-metadata cron.';

-- 2. 기존 issues text[] → jira_issues_meta로 1회성 백필 (key만 존재, 메타데이터는 다음 sync 주기에 채워짐)
UPDATE test_results
SET jira_issues_meta = (
  SELECT jsonb_agg(jsonb_build_object(
    'key', key_val,
    'url', NULL,
    'priority', NULL,
    'status', NULL,
    'assignee_account_id', NULL,
    'assignee_display_name', NULL,
    'assignee_avatar_url', NULL,
    'last_synced_at', NULL
  ))
  FROM unnest(issues) AS key_val
)
WHERE issues IS NOT NULL
  AND array_length(issues, 1) > 0
  AND (jira_issues_meta IS NULL OR jsonb_array_length(jira_issues_meta) = 0);

-- 3. github_issues JSONB 확장은 별도 ALTER 불필요 (JSONB라서 필드 append만 하면 됨)
--    스키마 문서화용 COMMENT 업데이트:
COMMENT ON COLUMN test_results.github_issues IS
  'Array of GitHub issue metadata. Shape: [{number, url, repo, priority?, state?, assignee_login?, assignee_display_name?, assignee_avatar_url?, last_synced_at?, error?}]. Synced every 6h via sync-github-metadata cron.';

-- 4. 인덱스: jira_issues_meta 내부 key 검색용 GIN
CREATE INDEX IF NOT EXISTS idx_test_results_jira_meta_gin
  ON test_results USING gin (jira_issues_meta);

-- 5. 인덱스: github_issues 내부 number 검색용 GIN (이미 없으면)
CREATE INDEX IF NOT EXISTS idx_test_results_github_issues_gin
  ON test_results USING gin (github_issues);

-- ============================================================
-- github_sync_log 테이블 신규 생성 (sync-github-metadata용)
-- ============================================================
CREATE TABLE IF NOT EXISTS github_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  github_issue_number TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  synced_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  testably_run_id UUID,
  testably_tc_id UUID
);

CREATE INDEX IF NOT EXISTS idx_github_sync_log_project
  ON github_sync_log(project_id, synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_issue
  ON github_sync_log(github_repo, github_issue_number);

-- RLS
ALTER TABLE github_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project members can read github_sync_log"
  ON github_sync_log FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- INSERT는 service_role only (Edge Function에서만)
-- 명시적 INSERT 정책 없음 → service_role 우회로 처리

-- ============================================================
-- pg_cron: sync-jira-metadata + sync-github-metadata (6시간마다)
-- ============================================================
-- (실제 cron 설정은 trial_cron_jobs.sql 패턴 참조, Supabase Dashboard에서 별도 등록)
-- SELECT cron.schedule(
--   'sync-jira-metadata-6h',
--   '0 */6 * * *',
--   $$SELECT net.http_post(
--     url := 'https://{project}.supabase.co/functions/v1/sync-jira-metadata',
--     headers := jsonb_build_object('Authorization', 'Bearer ' || '{service_role_key}')
--   )$$
-- );
-- SELECT cron.schedule(
--   'sync-github-metadata-6h',
--   '5 */6 * * *',   -- Jira 5분 뒤 시작 (동시 부하 회피)
--   ...
-- );
```

### 5-3. RLS 정책

- `test_results` RLS는 **기존 정책 유지** (project_members 기반). 컬럼 추가는 RLS 영향 없음.
- `jira_sync_log`는 이미 기존 마이그레이션(`20260331_jira_sync_schema.sql`)에 RLS 존재.
- `github_sync_log`는 위 migration에 RLS 신규 추가.

```sql
-- 기존 test_results RLS 예시 (확인용, 변경 없음)
-- SELECT: project_id → runs → results 경유로 프로젝트 멤버만 조회 가능
-- UPDATE: Edge Function(service_role)에서만 jira_issues_meta/github_issues 갱신
```

---

## 6. API 설계

### 6-1. Edge Function 변경 사항

#### (A) `create-jira-issue` 확장

**변경 내용:**
1. 이슈 생성 성공 후, **즉시 fetch**로 priority/status/assignee 메타데이터 획득
2. Request body에 `test_result_id` (uuid) 필드 추가 — 어느 test_result에 저장할지 지정
3. 함수 내부에서 `adminClient.from('test_results').update(...)`로 `jira_issues_meta` JSONB에 append
4. 기존 `issues` text[] 컬럼에도 key를 append (호환성 유지)

**Request (확장):**
```typescript
{
  // 기존 필드
  domain, email, apiToken, projectKey, summary, description,
  issueType, priority, labels, assignee, components, fieldMappings, fieldContext,
  // 신규 필드
  test_result_id: string,  // UUID, 메타데이터를 저장할 test_result
  run_id: string,           // UUID, sync 권한 검증용
}
```

**Response (확장):**
```json
{
  "success": true,
  "issue": {
    "key": "PROJ-123",
    "id": "10001",
    "self": "...",
    "metadata": {
      "priority": "High",
      "status": "To Do",
      "assignee_account_id": "abc",
      "assignee_display_name": "John",
      "assignee_avatar_url": "https://..."
    }
  }
}
```

#### (B) `create-github-issue` 확장

**변경 내용:** 동일 패턴. GitHub API 응답 자체에 `assignees`, `labels`, `state`가 포함되므로 추가 fetch 불필요.

**Request (확장):**
```typescript
{
  // 기존 필드
  token, owner, repo, title, body, labels, assignee,
  // 신규 필드
  test_result_id: string,
  run_id: string,
  project_id: string,
}
```

#### (C) `sync-jira-status` → **`sync-jira-metadata`로 개명 및 확장**

**파일 이동:**
- `supabase/functions/sync-jira-status/` → `supabase/functions/sync-jira-metadata/`
- `config.toml` 유지 (verify_jwt = false)
- `supabase/functions/sync-jira-status/` 디렉토리 삭제 (기존 코드는 스텁이었음)

**엔드포인트:** `POST /functions/v1/sync-jira-metadata`

**Request:**
```json
{
  "scope": "all" | "run_ids" | "project_id",
  "run_ids": ["uuid", ...],      // scope="run_ids"일 때
  "project_id": "uuid",          // scope="project_id"일 때
  "only_stale": true              // last_synced_at < now() - 6h인 것만
}
```

**Response:**
```json
{
  "success": true,
  "synced_count": 42,
  "failed_keys": ["PROJ-999"],
  "skipped_fresh": 10
}
```

**로직:**
1. JWT 검증 (manual mode — 기존 create-jira-issue 패턴 동일)
2. `scope`에 따라 `test_results` 조회 (jira_issues_meta의 key 추출)
3. 프로젝트별 `jira_settings` 기준으로 그룹핑 (domain, email, apiToken)
4. Jira JQL bulk 조회: `key in ("PROJ-1","PROJ-2",...)` 50개씩 배치
5. 응답의 `priority.name`, `status.name`, `assignee.accountId/displayName/avatarUrls.48x48` 추출
6. 각 `test_result` JSONB 원소 업데이트 (`jsonb_set`으로 개별 업데이트)
7. `jira_sync_log`에 direction='inbound' 기록
8. Rate limit 429 → 지수백오프 (1s, 2s, 4s)

#### (D) `sync-github-metadata` 신규 생성

**파일:** `supabase/functions/sync-github-metadata/index.ts` (+ `config.toml`)

**엔드포인트:** `POST /functions/v1/sync-github-metadata`

**Request:** `sync-jira-metadata`와 동일한 shape

**로직:**
1. `test_results` 조회 → github_issues 배열의 `{number, repo}` 추출
2. 프로젝트별 `github_settings` (token, owner) 조회
3. 각 issue에 대해 `GET /repos/{owner}/{repo}/issues/{number}` 호출 (bulk API 없음)
4. Rate limit 보호: issue별 100ms delay
5. 응답의 `state`, `labels`, `assignees[0]`, `assignees[0].avatar_url` 추출
6. Labels 중 `priority/*` prefix 매칭 → priority 값 유추 (BR-2)
7. JSONB 업데이트 + `github_sync_log` 기록

### 6-2. Supabase Client 쿼리 (프론트)

#### (A) IssuesTab — 메타데이터 포함 조회
```typescript
// 기존 쿼리에 jira_issues_meta 컬럼 추가
const { data: resultsData } = await supabase
  .from('test_results')
  .select('id, run_id, test_case_id, status, created_at, issues, jira_issues_meta, github_issues')
  .in('run_id', runIds)
  .limit(200);

// 파싱 로직
for (const r of resultsData || []) {
  const jiraMeta = Array.isArray(r.jira_issues_meta) ? r.jira_issues_meta : [];
  for (const meta of jiraMeta) {
    allIssues.push({
      source: 'jira',
      key: meta.key,
      url: meta.url,
      priority: meta.priority,
      status: meta.status,
      assignee: {
        name: meta.assignee_display_name,
        avatar: meta.assignee_avatar_url,
      },
      last_synced_at: meta.last_synced_at,
      // ... 기존 필드
    });
  }
  // github_issues도 동일 패턴
}
```

#### (B) Top-Fail Tags 집계 쿼리
```typescript
// Milestone의 runs 내 failed results + tc tags 조회
const { data: failedResults } = await supabase
  .from('test_results')
  .select('test_case_id')
  .in('run_id', runIds)
  .eq('status', 'failed');

const failedTcIds = [...new Set(failedResults.map(r => r.test_case_id))];

const { data: tcs } = await supabase
  .from('test_cases')
  .select('id, tags')
  .in('id', failedTcIds);

// 집계: tags 컬럼은 쉼표분리 string
const tagCount: Record<string, number> = {};
tcs.forEach(tc => {
  const tags = (tc.tags || '').split(',').map(t => t.trim()).filter(Boolean);
  tags.forEach(tag => {
    tagCount[tag] = (tagCount[tag] || 0) + 1;
  });
});

const topTags = Object.entries(tagCount)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 3);
```

#### (C) Planned vs Direct Runs 구분
```typescript
const { data: runsData } = await supabase
  .from('test_runs')
  .select('id, name, status, test_case_ids, test_plan_id, milestone_id, created_at')
  .eq('milestone_id', milestoneId);

// test_plan_id가 null이면 "Direct", 아니면 planId로 test_plans 조회해 name 획득
const planIds = runsData.map(r => r.test_plan_id).filter(Boolean);
const { data: plansData } = await supabase
  .from('test_plans')
  .select('id, name')
  .in('id', planIds);

const planMap = new Map(plansData.map(p => [p.id, p.name]));
// render: run.test_plan_id ? `Plan: ${planMap.get(run.test_plan_id)}` : 'Direct'
```

#### (D) Test Plans (Overview 섹션)
```typescript
const { data: plansData } = await supabase
  .from('test_plans')
  .select('id, name, status, priority, target_date, owner_id')
  .eq('milestone_id', milestoneId)
  .order('created_at', { ascending: false });
```

#### (E) Manual Refresh 호출
```typescript
await supabase.functions.invoke('sync-jira-metadata', {
  body: { scope: 'run_ids', run_ids: runIds, only_stale: false }
});
await supabase.functions.invoke('sync-github-metadata', {
  body: { scope: 'run_ids', run_ids: runIds, only_stale: false }
});
```

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/issues/IssuesList.tsx` | Jira/GitHub 공통 이슈 리스트 컴포넌트 (priority/status/assignee 뱃지 포함). Plan Detail + Milestone Detail에서 공통 사용 |
| `src/components/issues/IssuePriorityBadge.tsx` | priority 뱃지 (Critical/High/Medium/Low) |
| `src/components/issues/IssueStatusBadge.tsx` | status 뱃지 (Jira + GitHub 공통) |
| `src/components/issues/IssueAssignee.tsx` | Assignee avatar + 이름 (기존 `<Avatar>` 재사용) |
| `src/lib/issueMetadata.ts` | priority/status 매핑 유틸 (BR-1~BR-4) |
| `src/pages/milestone-detail/OverviewTab.tsx` | 새 Overview 탭 컴포넌트 (Burndown + Intel 그리드 + 실행 목록) |
| `src/pages/milestone-detail/BurndownChart.tsx` | Burndown LineChart (Recharts) |
| `src/pages/milestone-detail/IntelGrid.tsx` | Intel 2×N 그리드 (6개 카드) |
| `src/pages/milestone-detail/TopFailTagsCard.tsx` | Top-Fail Tags 카드 |
| `src/pages/milestone-detail/Activity24hFeed.tsx` | Last 24h activity mini feed |
| `src/pages/milestone-detail/ExecutionSections.tsx` | Sub Milestones + Test Plans + Runs(Planned/Direct) + Exploratory 렌더링 |
| `src/hooks/useMilestonePlans.ts` | TanStack Query: milestone의 test_plans 로드 |
| `supabase/migrations/20260419_issue_metadata.sql` | JSONB 컬럼 추가 + github_sync_log + 인덱스 |
| `supabase/functions/sync-jira-metadata/index.ts` | (rename from sync-jira-status + 전면 재구현) |
| `supabase/functions/sync-jira-metadata/config.toml` | verify_jwt = false |
| `supabase/functions/sync-github-metadata/index.ts` | 신규 |
| `supabase/functions/sync-github-metadata/config.toml` | verify_jwt = false |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/pages/milestone-detail/page.tsx` | 탭 배열 3개로 축소 (overview/activity/issues), Overview 탭 렌더링을 새 컴포넌트 위임, `?tab=results\|status\|burndown` 리다이렉트 useEffect 추가, Issues 탭에 `<IssuesList />` 적용 |
| `src/pages/plan-detail/page.tsx` | Issues 탭 `IssuesTab` 함수 내부를 `<IssuesList />` 컴포넌트 호출로 교체 (로컬 로직 간소화) |
| `src/pages/project-milestones/MilestonePlanList.tsx` | `.ms-header-actions` 내에 "Open detailed view →" 버튼 추가 (Edit 왼쪽) |
| `supabase/functions/create-jira-issue/index.ts` | 이슈 생성 후 메타데이터 fetch + `test_results.jira_issues_meta` update 추가 |
| `supabase/functions/create-github-issue/index.ts` | 응답으로부터 메타데이터 추출 + `test_results.github_issues` update 추가 |
| `src/i18n/local/en/milestones.ts` | §10의 EN 키 추가 |
| `src/i18n/local/ko/milestones.ts` | §10의 KO 키 추가 |
| `src/i18n/local/en/common.ts` | Issues 공통 키 (priority/status 레이블) |
| `src/i18n/local/ko/common.ts` | 동일 |

### 삭제 파일

| 파일 | 사유 |
|------|------|
| `supabase/functions/sync-jira-status/index.ts` | `sync-jira-metadata`로 개명 (배포 후 구 함수 제거) |
| (Milestone Detail 내부의 inline Results/Status/Burndown JSX 블록) | `page.tsx:860-1508` 해당 영역 제거 — 파일 자체는 유지 |

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| Jira 이슈가 이후 삭제됨 (404) | 메타데이터 `error: "not_found"` 플래그. UI에서 priority/status에 "—" 표시. Key는 그대로 보여주되 링크 클릭 시 브라우저에서 404 |
| GitHub 저장소가 private → public 전환 후 token 권한 부족 (403) | `error: "forbidden"`. UI에서 "Re-connect GitHub" 안내 링크 |
| Jira Rate limit 초과 (429) | 지수백오프 3회. 실패한 key는 `jira_sync_log`에 기록, 다음 cron 주기(6h 뒤)에 자동 재시도 |
| 네트워크 끊김 (프론트 refresh 버튼) | Toast 에러 "Failed to refresh. Retry later." 기존 캐시된 메타데이터 유지 |
| 동시에 두 유저가 create-jira-issue 호출 | JSONB `jsonb_insert` 또는 `||` 연산자로 append — race condition 가능. **해결**: `SELECT ... FOR UPDATE` 후 재읽기 + concat + update (Edge Function 내부에서 트랜잭션) |
| test_results 한 행에 100개 이상 이슈 연결 | 이론상 허용되나 UI에서 최대 20개까지만 표시 + "Show all →" 버튼 |
| Sub milestone이 없는 parent | Execution Sections의 "Sub Milestones" 섹션 자체를 숨김 (기존 동작과 동일) |
| Test Plans가 0개 | "No plans linked" empty state + "Create Plan" CTA (Hobby+만 활성화, Free는 업그레이드 배너) |
| test_plan_id는 있지만 test_plans 행이 삭제됨 (orphan) | `planMap.get(planId) === undefined` → "Plan: (deleted)" 회색 뱃지 |
| `?tab=xxx` unknown 탭 값 | Overview로 리다이렉트 (`replace: true`) |
| 24h activity feed에 아무 이벤트도 없음 | "No activity in the last 24 hours" 회색 placeholder 카드 |
| Burndown 데이터가 0일 (runs 없음) | Chart 영역에 "Start running tests to see burndown" empty state |
| Top-Fail Tags: 태그가 전혀 없음 | 카드 자체를 회색 "No tags on failed TCs" 메시지로 대체 |
| Priority sync 중 Jira가 `priority: null` 반환 (일부 프로젝트는 priority 필드 비활성화) | UI에서 "—" 표시 |
| Sync 실행 중 함수 타임아웃 (60s 초과) | 처리된 것까지만 저장. 미처리 key는 다음 주기 또는 수동 refresh로 처리 |
| 같은 이슈가 여러 test_results에 연결됨 | 각 test_result의 jira_issues_meta를 개별 update (성능 이슈 시 배치 쿼리로 최적화) |
| 구 URL `?tab=burndown`에 스크롤 앵커 링크까지 있음 (예: `?tab=burndown#risk-card`) | Overview로 리다이렉트 시 해시 보존 시도하되, 존재하지 않으면 top으로 스크롤 |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **Milestone 리스트 뷰(`/projects/:id/milestones`) 자체 재디자인** — 이번엔 `MilestonePlanList` 헤더에 "Open detailed view" 버튼 하나만 추가. MilestoneCard 등의 전체 레이아웃은 기존 유지.
- [ ] **Exploratory 탭의 세부 UX 변경** — 기존 session 리스트 그대로 Overview의 Execution Sections에 포함. 세션 카드 내용/동작 변경 없음.
- [ ] **Real-time 메타데이터 sync** — 웹훅 기반 즉시 반영(Jira webhook, GitHub webhook)은 제외. 6h polling만 구현.
- [ ] **이슈 메타데이터 양방향 편집** — Testably UI에서 priority/status/assignee를 변경해 Jira/GitHub로 push하는 기능은 제외. 이번엔 **read-only mirror**만.
- [ ] **Top-Fail Tags AI 분석** — 태그별 실패 원인 AI 설명은 제외. 단순 횟수 집계까지만.
- [ ] **Burndown Chart 인터랙티브 기능** — hover tooltip의 상세 이벤트 목록 표시는 제외. 기본 Recharts tooltip만.
- [ ] **Milestone Detail의 Edit/Complete 버튼 재디자인** — 기존 유지.
- [ ] **jira_issues_meta 컬럼의 ADF/description/comment 저장** — priority/status/assignee만 저장. description·comment은 저장하지 않음 (용량 이슈).
- [ ] **GitHub Pull Request 메타데이터** — GitHub API는 PR도 issues로 취급하나, 이번엔 issue만 처리. PR은 `pull_request` 필드로 제외.
- [ ] **Free/Hobby 플랜에서 custom sync 주기 설정** — Enterprise만 주기 조정 가능하도록 명시했으나 UI는 이번 미포함 (백엔드만 준비).
- [ ] **기존 `issues` text[] 컬럼 완전 제거** — 호환성을 위해 유지. Deprecate는 다음 스프린트.
- [ ] **Activity 탭의 기능 변경** — Activity 탭은 그대로 유지. `Activity24hFeed` 컴포넌트는 Overview 전용.

---

## 10. i18n 키

### `src/i18n/local/en/milestones.ts` & `ko/milestones.ts` 추가

| 키 | EN | KO |
|----|----|----|
| `milestones.openDetailedView` | "Open detailed view →" | "상세 보기 열기 →" |
| `milestones.detail.tabs.overview` | "Overview" | "개요" |
| `milestones.detail.tabs.activity` | "Activity" | "활동" |
| `milestones.detail.tabs.issues` | "Issues" | "이슈" |
| `milestones.detail.overview.burndown` | "Burndown" | "번다운" |
| `milestones.detail.overview.kpi.remaining` | "Remaining" | "남은 TCs" |
| `milestones.detail.overview.kpi.executed` | "Executed" | "실행됨" |
| `milestones.detail.overview.kpi.velocity` | "Velocity" | "속도" |
| `milestones.detail.overview.kpi.passRate` | "Pass Rate" | "통과율" |
| `milestones.detail.overview.intel.failedBlocked` | "Failed & Blocked" | "실패 & 차단" |
| `milestones.detail.overview.intel.viewAllInIssues` | "View all in Issues →" | "Issues 탭에서 전체 보기 →" |
| `milestones.detail.overview.intel.velocity7d` | "Velocity (last 7 days)" | "속도 (최근 7일)" |
| `milestones.detail.overview.intel.topFailTags` | "Top-Fail Tags" | "실패 상위 태그" |
| `milestones.detail.overview.intel.noFailedTags` | "No tags on failed test cases" | "실패한 테스트 케이스에 태그 없음" |
| `milestones.detail.overview.intel.eta` | "ETA" | "예상 완료" |
| `milestones.detail.overview.intel.etaOnTrack` | "On track" | "정상 진행" |
| `milestones.detail.overview.intel.etaBehind` | "Behind" | "지연" |
| `milestones.detail.overview.intel.aiInsight` | "AI Risk Insight" | "AI 리스크 인사이트" |
| `milestones.detail.overview.intel.aiOnTrack` | "Progress is on track. Current velocity suggests completion before the deadline." | "진행이 정상 궤도입니다. 현재 속도로는 마감 전 완료가 예상됩니다." |
| `milestones.detail.overview.intel.aiBehind` | "You're behind the ideal burndown. Consider increasing run frequency or reducing scope." | "이상적인 번다운보다 지연되고 있습니다. 실행 빈도를 늘리거나 범위를 줄이는 것을 고려하세요." |
| `milestones.detail.overview.intel.last24h` | "Activity — Last 24h" | "활동 — 최근 24시간" |
| `milestones.detail.overview.intel.viewFullActivity` | "View full activity →" | "전체 활동 보기 →" |
| `milestones.detail.overview.intel.noRecentActivity` | "No activity in the last 24 hours" | "최근 24시간 활동 없음" |
| `milestones.detail.overview.sections.testPlans` | "Test Plans" | "테스트 플랜" |
| `milestones.detail.overview.sections.noPlans` | "No test plans linked to this milestone" | "이 마일스톤에 연결된 테스트 플랜 없음" |
| `milestones.detail.overview.runBadge.direct` | "Direct" | "직접 실행" |
| `milestones.detail.overview.runBadge.plan` | "Plan" | "플랜" |
| `milestones.detail.overview.contributors` | "Contributors — Top 5" | "기여자 — Top 5" |

### `src/i18n/local/en/common.ts` & `ko/common.ts` 추가

| 키 | EN | KO |
|----|----|----|
| `issues.priority.critical` | "Critical" | "심각" |
| `issues.priority.high` | "High" | "높음" |
| `issues.priority.medium` | "Medium" | "보통" |
| `issues.priority.low` | "Low" | "낮음" |
| `issues.priority.none` | "—" | "—" |
| `issues.status.open` | "Open" | "오픈" |
| `issues.status.inProgress` | "In Progress" | "진행 중" |
| `issues.status.done` | "Done" | "완료" |
| `issues.status.closed` | "Closed" | "닫힘" |
| `issues.assignee.unassigned` | "Unassigned" | "미지정" |
| `issues.lastSynced` | "Last synced {time} ago" | "{time} 전 동기화됨" |
| `issues.refreshNow` | "Refresh now" | "지금 새로고침" |
| `issues.refreshSuccess` | "Synced {count} issues" | "{count}개 이슈 동기화 완료" |
| `issues.refreshError` | "Failed to refresh issues" | "이슈 새로고침 실패" |
| `issues.metaUnavailable` | "Metadata unavailable" | "메타데이터 없음" |

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가
- [x] RLS 정책이 정의되었는가 (기존 test_results 유지 + github_sync_log 신규)
- [x] 플랜별 제한이 명시되었는가 (§4-4)
- [x] RBAC 권한 매트릭스가 있는가 (§4-3)
- [x] 변경 파일 목록이 구체적인가 (실제 경로 확인됨)
- [x] 엣지 케이스가 식별되었는가 (§8)
- [x] Out of Scope이 명시되었는가 (§9)
- [x] i18n 키가 en/ko 둘 다 있는가 (§10)
- [ ] 관련 디자인 명세가 Approved 상태인가 — **@designer에게 design-spec 작성 요청 필요** (`desi/mockup_3_milestone_burndown.html` 참조)

---

## 부록 A — Migration Strategy (구 URL 호환)

| 구 URL | 신 URL | 동작 |
|-------|-------|------|
| `/projects/:p/milestones/:m?tab=results` | `/projects/:p/milestones/:m?tab=overview` | 자동 리다이렉트 (`replace: true`) |
| `/projects/:p/milestones/:m?tab=status` | `/projects/:p/milestones/:m?tab=overview` | 동일 |
| `/projects/:p/milestones/:m?tab=burndown` | `/projects/:p/milestones/:m?tab=overview` | 동일 |
| `/projects/:p/milestones/:m?tab=activity` | (그대로) | 변경 없음 |
| `/projects/:p/milestones/:m?tab=issues` | (그대로) | 변경 없음 |
| `/projects/:p/milestones/:m` (no query) | `/projects/:p/milestones/:m?tab=overview` | 기본값 설정 |

구현 위치: `src/pages/milestone-detail/page.tsx`의 `useEffect`에서 `useSearchParams`로 체크 + `setSearchParams({ tab: 'overview' }, { replace: true })`.

---

## 부록 B — mockup_3 참조 안내 (Designer용)

Overview 탭 상단 Intel 영역은 `desi/mockup_3_milestone_burndown.html` (812 lines)의 디자인을 참조한다.

- **Burndown Chart + KPI Strip**: mockup_3의 상단 영역 그대로
- **Intel 그리드 6개 카드**:
  1. Failed & Blocked (mockup의 Failed Top 4 카드)
  2. Velocity sparkline (mockup의 Velocity 막대 차트)
  3. **Top-Fail Tags (신규 — mockup에 없음)** — Designer는 "태그별 세로 막대 + 실패 %" 레이아웃 제안
  4. ETA vs Target D-day (mockup의 ETA progress bar)
  5. AI Risk Insight (mockup의 AI Insight 카드 — 기존 Status 탭 risk banner 로직 통합)
  6. Activity Last 24h (mockup에 없음, 기존 Activity 탭의 압축 버전)

Design Spec 작성 시 반드시 언급할 사항:
- Top-Fail Tags와 24h Activity는 mockup에 **없음** — 디자이너가 신규 제안
- Contributors Top 5는 Intel 그리드 하단 또는 우측 사이드패널에 배치 (mockup은 사이드패널 구조)
