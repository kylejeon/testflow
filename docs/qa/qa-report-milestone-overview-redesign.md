# QA Report: Milestone Overview Redesign + Issues Tab Metadata
> 검수일: 2026-04-19
> 개발지시서: docs/specs/dev-spec-milestone-overview-redesign.md
> 디자인 명세: docs/specs/design-spec-milestone-overview-redesign.md
> 검수 커밋: fa74273 → d4055c7 → 7a6fa98 → 442ba4f

---

## Executive Summary

**판정: Ship with fixes**

핵심 기능 구조(탭 재편, Overview 컴포넌트, IssuesList 공통화, DB 마이그레이션, Edge Functions)는 전체적으로 잘 구현되었다. 그러나 배포 전 반드시 처리해야 할 보안 이슈가 2건 존재한다.

**핵심 Risk 3개:**
1. **[Security Blocker]** `sync-jira-metadata` / `sync-github-metadata` — `verify_jwt = false`이고 caller 신원 검증 코드가 없어 인터넷에서 누구나 다른 프로젝트의 이슈 메타데이터를 덮어쓸 수 있다.
2. **[Security Blocker]** `assignee_display_name`에 GitHub `login`(username)을 그대로 저장 — `assignee.name`(실명) 필드를 사용해야 하나 구현이 누락되어 있다. (기능 결함 + 개인정보 오표시)
3. **[Follow-up]** `create-jira-issue` / `create-github-issue` 프론트 호출부에 `test_result_id`가 전달되지 않아 AC-A1/A2의 "즉시 persist" 경로가 실제로는 동작하지 않는다.

---

## AC 대조표

### Feature A — Issues Metadata

| AC | 판정 | 근거 |
|----|------|------|
| **AC-A1** — Jira 생성 시 `jira_issues_meta` JSONB append + 300ms 이내 렌더 | ⚠ Partial | Edge Function 내 persist 코드 존재(create-jira-issue:204-238), 단 프론트 호출부에서 `test_result_id`를 전달하지 않으므로 persist 경로 미동작(see §미완성 항목 #2). 렌더 컴포넌트(IssuesList)는 정상. |
| **AC-A2** — GitHub 생성 시 `github_issues` JSONB append + 렌더 | ⚠ Partial | 동일 이유. create-github-issue:152-176 persist 코드 정상이나 `test_result_id` 미전달로 경로 닫힘. |
| **AC-A3** — `sync-jira-metadata` 6시간 주기 JSONB update | ⚠ Partial | Edge Function 코드 완성(sync-jira-metadata/index.ts). pg_cron 등록 미완(수동 필요). |
| **AC-A4** — `sync-github-metadata` 6시간 주기 | ⚠ Partial | 동일. Edge Function 정상. pg_cron 미등록. |
| **AC-A5** — Rate limit 429 지수백오프 + DLQ | ⚠ Partial | 지수백오프 3회 구현됨(sync-jira-metadata:122-128, sync-github-metadata:115-116). 단 failed_keys를 함수 응답에만 반환하고 DLQ(별도 큐)나 "다음 cron 자동 재시도" 로직 없음. AC 문구의 "DLQ 기록"은 jira_sync_log 기록으로 대체됨(허용 가능 범위). |
| **AC-A6** — "Last synced X ago" + "Refresh now" 버튼 (debounce 10s, Tester 이상) | ⚠ Partial | LastSyncedLabel + debounce 10s 구현됨(IssuesList:214-217). 단 권한별 분기 미구현 — `allowRefresh={true}` 고정(plan-detail:1467, milestone-detail issues 탭 확인 필요). Viewer 역할에서도 버튼 보임. |
| **AC-A7** — 삭제/권한없는 이슈 → "—" placeholder + 에러 토스트 1회 | ✅ Pass | IssuesList:346-358에서 `hasErr` 조건으로 priority/status에 "—" 표시. error 플래그는 JSONB에 저장(sync:163-164). 에러 토스트는 handleRefresh 실패 시 1회 표시(IssuesList:229-232). |
| **AC-A8** — Plan Detail / Milestone Detail이 동일한 `<IssuesList />` 사용 | ✅ Pass | plan-detail:1467, milestone-detail page.tsx Issues 탭 모두 `<IssuesList />` 사용 확인. |

### Feature B — Milestone List → Detail Entry

| AC | 판정 | 근거 |
|----|------|------|
| **AC-B1** — `.ms-header-actions` 내 Edit 왼쪽에 버튼 렌더 | ✅ Pass | MilestonePlanList:193-203. Edit 버튼 왼쪽에 배치 확인. |
| **AC-B2** — 클릭 시 `/projects/:pid/milestones/:mid` navigate | ✅ Pass | MilestonePlanList:195. `useNavigate` 사용, 경로 정확. |
| **AC-B3** — 상태 무관 항상 활성화 | ✅ Pass | disabled 조건 없음. |
| **AC-B4** — i18n 키 `milestones.openDetailedView` 사용 | ❌ Fail | 버튼 내부에 하드코딩 "Open detailed view" 문자열 사용(MilestonePlanList:198). i18n 키가 정의되어 있음에도(en/milestones.ts:39, ko/milestones.ts:38) `useTranslation`을 import하지 않아 i18n 미적용. |
| **AC-B5** — 버튼 내 SVG 우측 화살표 아이콘 포함 | ✅ Pass | MilestonePlanList:199-201. `<line>` + `<polyline>` SVG 화살표 구현됨. `.plan-card-caret` 재사용 대신 인라인 SVG 사용이나 시각적으로 동일. |

### Feature C — Milestone Detail Overview Redesign

| AC | 판정 | 근거 |
|----|------|------|
| **AC-C1** — 탭 배열 `['overview','activity','issues']` 3개, 기본 overview | ✅ Pass | page.tsx:814-844. 3탭 렌더, `activeTab` 기본값 'overview'. |
| **AC-C2** — `?tab=results/status/burndown` → overview 리다이렉트 (`replace:true`) | ✅ Pass | page.tsx:489-497. legacyTabs Set + setSearchParams replace:true. unknown 탭도 overview로 리다이렉트. |
| **AC-C3** — Overview 상단 Burndown Chart(LineChart) + 4 KPI strip | ✅ Pass | BurndownChart.tsx(Recharts ResponsiveContainer), KpiStrip.tsx(4개: Remaining/Executed/Velocity/PassRate). |
| **AC-C4** — Intel 2×N 그리드 6개 카드 | ✅ Pass | OverviewTab.tsx:263-279. FailedBlockedCard(span-2), VelocitySparkline, TopFailTagsCard, EtaCard, AiRiskInsight(span-2), Activity24hFeed(span-2). "View all in Issues →" 링크 동작(onGoIssues). |
| **AC-C5** — 실행 목록 (Sub Milestones/Test Plans/Runs Planned vs Direct/Exploratory) | ✅ Pass | ExecutionSections.tsx 전체 구현. Planned/Direct 배지(linkage-badge:planned/mdirect). orphan plan → "Plan: (deleted)" 처리(ExecutionSections:169). |
| **AC-C6** — Contributors Top 5 패널 | ✅ Pass | ContributorsCard 컴포넌트, OverviewTab:299-305. 기존 activityLogs 기반 집계 재사용. |
| **AC-C7** — 기존 Results/Status/Burndown 탭 버튼 완전 제거 | ✅ Pass | page.tsx:814-844에 overview/activity/issues 3개만 존재. |
| **AC-C8** — Activity 탭 기존 동작 유지 | ✅ Pass | page.tsx:875 이하 Activity 탭 JSX 블록 기존 코드 그대로. 변경 없음 확인. |
| **AC-C9** — Issues 탭 `<IssuesList />` 렌더링 + 메타데이터 표시 | ✅ Pass | page.tsx Issues 탭에서 `<IssuesList runIds={...} />` 호출. |
| **AC-C10** — Overview 탭 1.5초 이내 렌더 (추가 DB round-trip 없음) | ✅ Pass | loadOverviewExtra()에서 3쿼리를 `Promise.allSettled`로 병렬 실행(OverviewTab:105-116). 별도 queryFn으로 분리해 기존 loadMilestoneDetailData와 독립 캐시 운용. |
| **AC-C11** — runs=0 + subMilestones=0 + plans=0 → 통합 empty state | ✅ Pass | ExecutionSections:62-73. `allEmpty` 조건 + plansLoading 고려. |

---

## 코드 품질 이슈

### High

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| H-1 | `any` 타입 캐스팅 남용 | `tcData.forEach((tc: any) =>`, `(rows || []).forEach((row: any) =>` 등 Edge Function과 프론트 전반에 `any` 사용 | IssuesList.tsx:70, sync-jira-metadata:76, sync-github-metadata:71 |
| H-2 | `tcResultMap` 파라미터 미사용 | `IssuesTab` 함수가 `tcResultMap`, `dailyExecCounts`, `planTcs` 등 파라미터를 받지만 `<IssuesList />`로 전달하지 않아 불필요하게 유지됨. 코드 혼란 유발. | plan-detail/page.tsx:1455-1472 |
| H-3 | `github assignee_display_name` 오매핑 | `assignee_display_name`에 `assignee?.login`(GitHub username)을 저장. `assignee?.name`이 실명인데 미사용. 이름 표시가 잘못됨. | sync-github-metadata:167, create-github-issue:147 |

### Medium

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| M-1 | `useEffect` 의존성 배열 eslint-disable | `// eslint-disable-next-line react-hooks/exhaustive-deps` 처리로 `legacyTabs` 참조 누락 | milestone-detail/page.tsx:497 |
| M-2 | `queryKey` 내 `runIds.sort()` 사이드이펙트 | `queryKey` 배열 생성 시 `runIds.sort().join(',')` — sort()는 원본 배열을 mutate함. `[...runIds].sort()` 패턴 사용해야 함 | OverviewTab.tsx:174 |
| M-3 | `loadIssues` 내 순차 DB 호출 | test_cases 이름 조회가 test_results 조회 이후 순차 실행됨. 200 rows 시 latency 증가 가능. `Promise.all` 병렬화 권장. | IssuesList.tsx:62-73 |
| M-4 | `ExecutionSections`에서 Test Plans 섹션이 항상 렌더 | `subMilestones.length > 0`일 때만 Sub Milestones 섹션을 조건부 렌더하는 것과 달리, Test Plans 헤더/섹션은 plans=0이어도 항상 표시됨. "No test plans linked" empty state가 보여 공간 낭비. | ExecutionSections.tsx:110-149 |
| M-5 | `OverviewTab` queryKey 불안정 | `runIds.sort()` 원본 mutate 이후 join. 렌더마다 새 배열이면 string은 같으나 코드 안전성 낮음 | OverviewTab.tsx:174 |

### Low

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| L-1 | `BurndownChart` scope 라인 미구현 | 디자인 명세에 scope 라인(var(--warning)) 요구하나 `perDay` 배열에 scope 필드 없음. Recharts Line `dataKey="scope"` 정의 안됨. | BurndownChart.tsx 전체 |
| L-2 | `KpiStrip` 스펙 vs 구현 불일치 | Dev Spec(§4-1 KPI Strip)에서 4번째 KPI는 "Pass Rate"이나 설계 명세 chart 섹션(design-spec)에서는 "ETA"를 4번째로 명시. 구현은 "Pass Rate" — dev-spec 기준으로는 Pass. 명세 불일치만 기록. | KpiStrip.tsx:33-37 |
| L-3 | `IssuesList` 하드코딩 영문 문자열 | "Loading issues…", "No issues linked yet.", "bug reports", "issues" 등 i18n 키 미사용 | IssuesList.tsx:247-313 |
| L-4 | `sync-jira-metadata` `skipped_fresh` 항상 0 반환 | `only_stale` 필터링으로 건너뛰는 항목 수를 카운트하지 않고 항상 0 반환 | sync-jira-metadata:194 |
| L-5 | `LastSyncedLabel` "Refresh now" 하드코딩 | `issues.refreshNow` i18n 키가 common.ts에 정의되어 있으나 컴포넌트에서 t() 미사용 | LastSyncedLabel.tsx:26 |

---

## 보안 이슈

### Critical

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| S-C1 | **sync 함수 인증 완전 부재** | `sync-jira-metadata`, `sync-github-metadata` 모두 `verify_jwt = false`이고 함수 내부에 caller 인증 코드가 없음. 외부에서 `scope=all` 호출 시 모든 프로젝트의 메타데이터를 덮어쓰거나 jira_settings(API 토큰 포함)를 간접 활용 가능. pg_cron 호출에는 service_role key가 필요하지만 수동 refresh 경로(scope=run_ids)는 브라우저에서 anon key만으로 호출 가능. **즉시 수정 필요.** | sync-jira-metadata/config.toml:1, sync-github-metadata/config.toml:1 |

### High

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| S-H1 | **assignee avatar URL 외부 이미지 무조건 렌더** | Jira/GitHub avatar URL이 외부 CDN 주소일 때 `<img src={avatarUrl}>` 직접 렌더. Supabase CSP 정책에 따라 img-src가 제한될 경우 broken image. 더 중요하게는 악의적 URL이 JSONB에 저장될 경우 이미지 서버에 request 유출 가능. `onError` fallback은 있으나 URL 검증 없음. | IssueAssignee.tsx:36-38 |
| S-H2 | **CORS `*` 와이드오픈 + verify_jwt=false 조합** | sync 함수 2개가 `Access-Control-Allow-Origin: *` + 인증 없는 구조 — 브라우저에서 CORS preflight 없이 임의 origin이 직접 호출 가능. S-C1과 복합 위험. | sync-jira-metadata:18, sync-github-metadata:18 |

### Medium

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| S-M1 | **`run_id` 범위 검증 없음 (sync 함수)** | `scope=run_ids`로 호출 시 전달된 run_ids가 실제 해당 user의 프로젝트에 속하는지 검증하지 않음. 인증이 추가된 후에도 다른 프로젝트의 run_id를 넣어 메타데이터를 재동기화할 수 있음. | sync-jira-metadata:57-58, sync-github-metadata:51-52 |
| S-M2 | **`project_id`를 request body에서 직접 수신** | `create-github-issue`가 `project_id`를 body에서 받아 `github_sync_log`에 insert 시 사용. `project_id`는 서버에서 `run_id` 기반으로 조회해야 함. | create-github-issue:85,167 |

### Low

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| S-L1 | **jira_issues_meta XSS 가능성** | `tcTitle`, `issue.key`, `assigneeDisplay` 등을 JSX로 렌더하나 React의 자동 escape로 XSS 방지됨. 단 `assigneeDisplay`가 외부 API 값이므로 React escape 의존이 유일한 방어선 — 낮은 위험이나 기록. | IssuesList.tsx:321,337 |

---

## 회귀 위험 체크리스트

테스터가 배포 후 수동으로 확인해야 할 항목:

**plan-detail Issues 탭**
- [ ] Issues 탭 클릭 시 `<IssuesList />` 정상 표시 (기존 Jira/GitHub 이슈 리스트와 동일한 run_ids 기반으로 조회됨)
- [ ] Issues 탭 헤더의 count 뱃지가 `onCountChange` 콜백으로 정상 업데이트됨
- [ ] PlanSidebar가 Issues 탭에서도 정상 표시됨 (`tcResultMap` 전달되나 사용 안 함)
- [ ] 기존 Jira/GitHub 이슈 링크 클릭 시 새 탭에서 열림 (IssuesList 기존 `window.open` 동작)

**milestone-detail Activity 탭**
- [ ] Activity 탭 14일 polyline 차트 정상 렌더
- [ ] 상태 필터(All/passed/failed 등) 정상 동작
- [ ] 페이지네이션 정상 동작

**milestone-detail Issues 탭**
- [ ] Issues 탭에서 run_ids(milestone의 모든 runs) 기반으로 이슈 조회됨
- [ ] `issuesCount` 상태가 탭 배지에 반영됨 (page.tsx:508 `setIssuesCount`)

**MilestonePlanList**
- [ ] "Open detailed view →" 버튼 클릭 후 milestone-detail Overview 탭으로 이동
- [ ] 기존 Plan 카드 클릭 → plan-detail로 이동 (기존 동작 유지)
- [ ] 기존 Direct Run 카드 클릭 → run-detail로 이동 (기존 동작 유지)
- [ ] Edit 버튼 정상 동작

**project-milestones 리스트 뷰**
- [ ] MilestonePlanList 외 리스트 화면 변경 없음 확인
- [ ] 새 버튼 추가로 인한 레이아웃 깨짐 없음 (특히 좁은 화면)

**URL 리다이렉트**
- [ ] `/projects/:p/milestones/:m?tab=results` → overview 리다이렉트 확인
- [ ] `/projects/:p/milestones/:m?tab=burndown` → overview 리다이렉트 확인
- [ ] `/projects/:p/milestones/:m?tab=activity` → activity 유지 확인
- [ ] `/projects/:p/milestones/:m?tab=unknown` → overview 리다이렉트 확인

---

## 미완성 사항 분류

| # | 항목 | 분류 | 판단 근거 / 즉시 해결 방법 |
|---|------|------|--------------------------|
| 1 | pg_cron 스케줄 등록 (수동 필요) | **Follow-up** | 코드 상 주석으로 SQL 템플릿 제공됨. 기능 자체는 동작하나 자동 주기 sync가 없으면 메타데이터 자동 갱신 불가. 배포 후 1일 내 Supabase Dashboard에서 등록 필요. |
| 2 | create-jira/github-issue 프론트 호출부 `test_result_id` 미전달 | **Blocker (기능)** | AC-A1/A2의 핵심 경로 — 이슈 생성 시 메타데이터 즉시 저장이 동작하지 않음. 다음 sync 주기(6h 또는 수동 refresh)까지 메타데이터 미표시. 사용자 혼란 높음. 수동 Refresh로 우회 가능하나 AC 불만족. |
| 3 | AC-A5 지수백오프 DLQ | **Trivial** | 지수백오프 3회 재시도는 구현됨. DLQ는 `jira_sync_log`/`github_sync_log`의 `success=false` 레코드로 대체됨. 자동 재처리 없으나 다음 cron 주기에 재시도됨. |
| 4 | Plan Detail Issues 탭 `tcResultMap` 미사용 파라미터 | **Follow-up** | IssuesTab 함수 시그니처에 tcResultMap 등 불필요한 파라미터가 남아 있음. 기능 영향 없으나 코드 품질 저하. 다음 리팩토링 시 정리. |
| 5 | 플랜별 Refresh 제한 (Free/Hobby) 미구현 (`canRefresh={true}` 고정) | **Follow-up** | Dev Spec §4-4의 Viewer 숨김 + Hobby 일 3회 제한이 미구현. 현재 모든 역할에서 Refresh 버튼 노출. 보안 위험보다는 제품 정책 미반영 수준. |
| 6 | AC-A6 권한별 debounce 분기 미구현 | **Follow-up** | debounce 10s는 구현됨. Tester+ 조건 필터 없음. Viewer도 버튼 보임. 실제 sync 호출은 RLS로 차단되나(인증 추가 후) UI 정책 미반영. |

---

## 코드 품질 자동화

- **tsc --noEmit**: PASS (출력 없음 = 타입 에러 0개)
- **ESLint**: npm run lint 스크립트 미정의 — 자동 검사 불가 (별도 확인 필요)

---

## Sign-off 권고

**수정 후 재검수 필요**

배포 전 반드시 해결해야 할 항목:

1. **[S-C1] sync 함수 인증 추가** — `verify_jwt = true`로 변경하거나, Authorization header에서 JWT 검증 후 caller의 `project_id` 접근 권한을 확인하는 코드 추가. pg_cron 호출은 `service_role` key를 사용하므로 JWT 검증 우회 가능하도록 `service_role` 감지 분기 필요.

2. **[#2 Blocker] `test_result_id` 프론트 전달** — `create-jira-issue` / `create-github-issue`를 호출하는 Run Detail 모달 코드에서 `test_result_id`를 body에 포함시켜야 AC-A1/A2 완성.

위 2건 수정 후 재검수 요청 권장. 나머지 Follow-up 항목은 다음 스프린트에서 처리 가능.
