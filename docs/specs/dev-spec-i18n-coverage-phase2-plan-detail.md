# Dev Spec: i18n 커버리지 Phase 2a — plan-detail/page.tsx 전량 i18n 전환

> **작성일:** 2026-04-21
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 Phase 1:** `docs/specs/dev-spec-i18n-coverage.md` (Milestone Overview + Issues + AIRunSummaryPanel 레이블)
> **관련 Phase 1 디자인:** `docs/specs/design-spec-i18n-coverage.md` (톤앤매너·용어 사전, 본 Dev Spec도 동일 원칙 준수)
> **Phase 2b(분리):** `dev-spec-i18n-coverage-phase2-run-detail.md` (run-detail/page.tsx — 본 스펙 범위 밖)
> **feature_list.json:** f010 Phase 2a (P1)
> **영향 범위:** `src/pages/plan-detail/page.tsx`, `src/i18n/local/{en,ko}/*.ts`, `.i18nignore`

---

## 1. 개요

### 문제
Phase 1에서 Milestone Detail Overview/Issues 클러스터 20개 파일은 i18n 전환을 마쳤지만, **plan-detail/page.tsx 단일 파일 3,415줄은 범위 초과로 `.i18nignore`에 등재된 상태**로 남아 있다. 현재 한국어 로케일로 Plan Detail을 열면 다음이 영문 그대로 노출된다:

- 상단 헤더 탭 (Test Cases / Runs / Activity / Issues / Environments / Settings) 및 상태·우선순위 뱃지
- 사이드바 3종 카드 (**AI Risk Predictor** / **Snapshot** / **Execution Pace**)
- Entry / Exit Criteria 블록 + 프리셋 드롭다운 + Auto 뱃지 + 안내 tooltip
- TC Picker 모달 (Search / Include Draft / Cancel / Add N TCs)
- Runs 탭 strip (Total Runs / Best Pass Rate / Latest / Envs Covered / New Run)
- Activity 탭 필터 pill + export + 이벤트 desc 18종 (recorded / added test cases / locked the snapshot …)
- **Settings 탭 전체** (Basic Information / Owner / Priority P1~P3 / Dates / Linked Milestone / Status select / Criteria preset 드롭다운 / Save bar / **Danger Zone** (Archive/Unarchive/Duplicate/Delete))
- 4종 확인 모달 (Delete / Archive / Unarchive / Duplicate) 및 Unlock 모달 — interpolation 포함 ("Create a copy of **\"{plan.name}\"**? …")
- 37건의 `showToast(...)` 메시지 — 성공·실패·warning·info 전량 영문
- "Scanned Apr 21 · 14:30" 같은 `toLocaleDateString('en-US', …)` 하드코딩 6곳

Environments 탭(`EnvironmentsTab` 함수 본체)만 `useTranslation('environments')` 적용 완료 — **상단 컨테이너·탭 바·사이드바·기타 5개 탭은 여전히 하드코딩 영문**.

### 해결
plan-detail/page.tsx 단일 파일을 **탭·사이드바·모달 단위로 분할**해 i18n 전환한다. 번역 키는 Phase 1에서 확립한 네임스페이스 전략(Design Spec §3)을 따르되, plan-detail 고유 섹션은 **기존 `milestones.detail.overview.sections.*` 과 분리된 신규 서브트리 `milestones.planDetail.*` 로 격리**한다 (Milestone 네임스페이스 편입 — 새 네임스페이스 신설 금지). 재사용 가능한 레이블은 `common.*`, `runs.*`, `milestones.*` 기존 키를 최우선 참조한다.

동시에 `.i18nignore`에서 `src/pages/plan-detail/page.tsx` 제거 → 스캐너가 이 파일을 완전 감시하도록 gate 복구.

### 성공 지표
- `ko` 로케일로 Plan Detail 진입 시 (6개 탭 전체) 지정 예외(`.i18nignore` 브랜드명/단위)를 제외한 **영문 하드코딩 텍스트 0건** (스캐너 + 수동 순회 기준).
- `npm run scan:i18n` 실행 시 `src/pages/plan-detail/page.tsx` 에 대한 매치 0건 (현재 파일 단위 ignore 제거 이후).
- `npm run scan:i18n:parity` en ↔ ko 키 트리 diff 0건.
- `npx tsc --noEmit` 0 에러, `npm run build` PASS, `npm run test -- --run` 기존 테스트 regression 0건.
- Phase 1 에서 이미 번역된 20개 파일에 **회귀 없음** (번들 키 trimming / 시그니처 변경 금지).

---

## 2. 유저 스토리

- As a **한국어 사용자 (QA 엔지니어)**, I want Plan Detail 모든 탭의 레이블·버튼·토스트·Danger Zone 확인 모달이 한국어로 노출되기를 바란다, so that "Delete permanently" 같은 파괴적 액션을 오해 없이 이해하고 "Lock Snapshot" / "Rebase" 같은 도메인 용어를 서비스 전반과 일관되게 인식할 수 있다.
- As a **Plan Owner (Manager/Admin)**, I want Archive / Unarchive / Duplicate / Delete 확인 모달의 plan 이름 interpolation (`"{plan.name}"`) 이 한국어 문장 안에 자연스럽게 박히기를 바란다, so that 실수로 다른 plan을 지우는 사고를 방지할 수 있다.
- As a **개발자**, I want `.i18nignore` 에서 plan-detail 파일 단위 예외가 제거되어 CI가 regression을 즉시 잡기를 바란다, so that Phase 2 이후 새로 추가되는 하드코딩이 merge 전 차단된다.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1:** `src/pages/plan-detail/page.tsx` 안에서 **JSX 텍스트 하드코딩 영문** (regex `>[A-Z][a-zA-Z ]{2,}<`) 매치 **0건**. 브랜드명("Testably", "Jira", "GitHub") / 플랜명 / 단위("TCs") / 상수 라벨(className용 `pri-badge pri-p1` 등)은 `.i18nignore` 기준 허용. (참고: 현재 75건 → 0건)
- [ ] **AC-2:** `showToast('…', …)` 로 감싼 **하드코딩 영문 토스트 37건 전량** i18n 키로 교체. 각 토스트는 `t('common:toast.*')` / `t('milestones:planDetail.toast.*')` / `t('runs:aiSummary.toast.*')` 중 **문맥에 맞는 네임스페이스**로 이관.
- [ ] **AC-3:** `placeholder=` / `aria-label=` / `title=` 속성 내 **영문 값 16건** (Search in plan…, Start date, End date, e.g. All critical TCs passed, e.g. Pass rate ≥ 95%, Save as preset, Auto-evaluated, Click to toggle, TCs modified after snapshot was locked …) 전량 i18n 키로 교체.
- [ ] **AC-4:** `.i18nignore` 에서 `src/pages/plan-detail/page.tsx` **라인 제거**. 그 후 `npm run scan:i18n` 실행 → 해당 파일 매치 0건.
- [ ] **AC-5:** `npm run scan:i18n:parity` exit code 0 (en ↔ ko 키 트리 동일).
- [ ] **AC-6:** `npx tsc --noEmit` 0 에러. `npm run build` PASS. `npm run test -- --run` 기존 테스트 전량 PASS (plan-detail 관련 unit/RTL 테스트가 없다면 최소 회귀 없음 확인).
- [ ] **AC-7:** **Danger Zone 확인 모달 4종** (Delete / Archive / Unarchive / Duplicate) + Unlock 모달의 **interpolation 변수** (`{{planName}}`, `{{count}}`) 가 en/ko 양쪽에서 정상 치환됨. 구체적으로, 한국어 문장 안에 `"{{planName}}"` 큰따옴표 처리가 자연스러워야 하며, 런타임에 `{{planName}}` 원문 문자열이 DOM에 노출되지 않아야 한다 (Playwright 스냅샷 또는 수동 테스트).
- [ ] **AC-8:** **Archive/Unarchive 플로우**의 조건부 텍스트 (`plan.status === 'archived' ? 'Unarchive plan' : 'Archive plan'`, `'Restore the plan to Planning status so it can be edited again.' / 'Plan becomes read-only. Existing run data is preserved.'`) 가 2상태 모두 번역되어 렌더된다.
- [ ] **AC-9:** **STATUS_CONFIG** (planning/active/completed/cancelled) 및 **PRIORITY_CONFIG** (critical/high/medium/low) 상수의 `label` 필드 — 컴포넌트 함수 밖 top-level 상수이므로 **`t()` 직접 호출 불가** — 를 `useMemo` 또는 훅 내부 `buildStatusConfig(t)` 로 리팩토링하여 `t()` 가 동작하도록 한다. 기존 `badgeCls` / `priCls` 는 그대로 유지.
- [ ] **AC-10:** **TABS 상수** (Test Cases/Runs/Activity/Issues/Environments/Settings) — 동일 리팩토링 패턴으로 `useMemo(() => [...], [t])` 로 변환하여 `tab.label` 이 번역 값으로 치환된다. `iconEl`(JSX) 은 상수 유지 가능.
- [ ] **AC-11:** **`toLocaleDateString('en-US', …)` 호출 6곳** (Plan Sidebar sparkline, SnapshotRow "Locked at", RunCard dateStr/timeStr, best-run label, ActivityTab export fmtDate, breadcrumb detail-head range) 를 `src/lib/dateFormat.ts` 의 `formatShortDate(iso, i18n.language)` / 신규 `formatShortDateTime(iso, i18n.language)` 헬퍼로 통합. `ko` 로케일에서 `ko-KR` format 으로 렌더된다. `useTranslation()` 으로부터 `i18n.language` 를 받아 헬퍼에 전달.
- [ ] **AC-12:** **Plan Sidebar 의 `relativeTime()` 인라인 함수 2곳** (`RunsTab latest`, `RunsTab run-card ago`) 를 Phase 1에서 추가한 공통 헬퍼 `src/lib/formatRelativeTime.ts`의 `formatRelativeTime(iso, t)` 로 교체. 인라인 중복 제거.
- [ ] **AC-13:** 신규 번역 키 총합 (en + ko 합산) **≤ 500 라인** (Phase 1 AC-10 원칙과 동일한 soft cap). 초과 시 sub-section 분리 검토. **예상치: ~180~260 키 × 2 locale ≈ 360~520 라인.**
- [ ] **AC-14:** Phase 1 에서 교체한 20개 파일 (milestone-detail/, issues/, AIRunSummaryPanel) 의 **번역 호출처 / 키 / 값 변화 0건** (회귀 금지). `git diff --stat` 상 Phase 1 경로에 수정 없음.
- [ ] **AC-15:** RBAC / 플랜 관계 없이 모든 역할·모든 플랜에서 동일하게 번역됨 (텍스트 교체 성격 상 권한·플랜별 분기 불필요). 기존 "Starter plan required for AI Risk Predictor" / "Monthly AI credit limit reached" 메시지는 **서버에서 영문으로 오는 error body** 를 fallback으로 사용 — 클라이언트 측 i18n 키 `milestones.planDetail.aiRiskPredictor.error.*` 와 함께 이중 처리하여, 서버 문자열이 있으면 그걸, 없으면 번역본을 표시 (Phase 1 RiskInsightContainer 와 동일 패턴).

---

## 4. 기능 상세

### 4-1. 스코프 확정 — 하드코딩 규모 측정

**대상 파일 1개:** `src/pages/plan-detail/page.tsx` (3,415줄)
**자식 컴포넌트:** 없음 — `ls src/pages/plan-detail/` 결과 `page.tsx` 단일 파일. 모든 탭·사이드바·모달이 inline 정의. 따라서 이번 Dev Spec 은 **단일 파일 리팩토링**이다.

**하드코딩 스캔 결과 (2026-04-21, grep 기준):**

| 패턴 | 개수 | 대표 예시 |
|------|------|----------|
| `>[A-Z][a-zA-Z ]{2,}<` (JSX 텍스트) | 75 | `>AI Risk Predictor<`, `>Top Risk Signals<`, `>Recommendation<`, `>Snapshot<`, `>Execution Pace<`, `>Danger Zone<`, `>Duplicate plan<`, `>Delete permanently<`, `>Unsaved changes<`, `>Basic Information<`, `>Entry Criteria<`, `>Exit Criteria<`, `>Total Runs<`, `>Best Pass Rate<`, `>Envs Covered<`, `>New Run<`, `>Previous<`, `>Next<`, `>Draft<`, `>Active<`, `>All Folders<`, `>All Priority<`, `>Add TCs<`, `>Lock Snapshot<`, `>Unlock<`, `>Rebase<`, `>Export<`, `>Cancel<`, `>Save Changes<`, `>Saving…<`, `>Discard<`, `>Presets<`, `>No presets saved yet<`, `>All presets already added<`, `>Locked at<`, `>Locked by<`, `>TC revision<`, `>Drift from live<`, `>Up to date<`, `>Forecast Completion<`, `>Confidence<`, `>Run Risk Scan<`, `>Scanning…<`, `>Re-scan<`, `>Avg TC/day<`, `>Remaining<`, `>Add criterion<`, `>Auto<`, `>Run #…`, `>pass · …<`, `>Continue: …<`, `>Start New Run<`, `>Archive Plan<`, `>Delete Test Plan<`, `>Duplicate Plan<`, `>Unarchive Plan<`, `>Unlock Snapshot<` 등 |
| `showToast('…', …)` | 37 | `'Add test cases to this plan first'`, `'Risk scan complete (… credit used)'`, `'Risk scan failed: …'`, `'Settings saved'`, `'Failed to save criteria state'`, `'Preset already exists'`, `'Failed to save preset'`, `'Saved as preset'`, `'Failed to add test case'`, `'Test case added'`, `'Failed to add test cases: …'`, `'Added … test cases'`, `'Failed to remove test case'`, `'Test case removed'`, `'Failed to lock snapshot'`, `'Snapshot locked'`, `'Failed to unlock snapshot'`, `'Snapshot unlocked'`, `'Failed to rebase snapshot'`, `'Snapshot rebased to latest'`, `'Failed to update plan'`, `'Failed to delete plan'`, `'Plan deleted'`, `'Failed to archive plan: …'`, `'Plan archived'`, `'Failed to unarchive plan: …'`, `'Plan restored to Planning'`, `'Failed to duplicate plan: …'`, `'Plan created but TCs not copied: …'`, `'Plan duplicated'`, `'Add at least one test case before starting a run.'`, `'All recommended TCs are already in this plan'`, `'Failed to add TCs: …'`, `'Added … AI-recommended TCs to plan'`, `'Starter plan required for AI Risk Predictor'` (서버 에러 fallback), `'Monthly AI credit limit reached'`, `'Risk scan failed'` |
| `placeholder=` / `aria-label=` / `title=` / `alt=` | 16 | `placeholder="Search in plan…"`, `placeholder="Start date"`, `placeholder="End date"`, `placeholder="Search test cases..."`, `placeholder="e.g. All critical TCs passed"`, `placeholder="e.g. Pass rate ≥ 95%"`, `title="Save as preset"`, `title="Auto-evaluated"`, `title="TCs modified after snapshot was locked"`, `title="Click to toggle"`, `title="Auto-evaluated based on test results"`, `title="No drift detected"`, `title="Update baseline to latest TC revisions"` |
| `toLocaleDateString('en-US', …)` | 6 | sparkline day labels / snapshot locked_at / AI scanned_at / run card dateStr+timeStr / best-run label / breadcrumb detail-head range / target_date / duplicate confirm |
| 상수 내 라벨 (STATUS_CONFIG / PRIORITY_CONFIG / TABS / TC_PRI) | 4 블록 | `STATUS_CONFIG.planning.label = 'Planning'`, `PRIORITY_CONFIG.critical.label = 'P1 Critical'`, `TABS[0].label = 'Test Cases'`, `TC_PRI.critical.label = 'Critical'` — 각 4~6 항목 |
| 인라인 `relativeTime` / `latestAgo` | 3 | `RunsTab:1024-1032` + `RunsTab:1107-1114` + (sparkline 내부 헬퍼는 날짜 포맷만 사용) |

**총 예상 신규 키 수:** 약 **180~240 개** (en), 동일 수량 ko. 합산 **360~480 라인**. AC-13 soft cap (500) 내.

### 4-2. 섹션별 분할 & 우선순위

plan-detail은 **탭 + 공유 사이드바 + 공통 페이지 shell + 상수 + 모달 5종**으로 구성된다. 섹션별 키 그룹·대략 개수·우선순위:

| 섹션 | 서브트리 | 대략 키 수 | 우선순위 |
|------|---------|----------|---------|
| **페이지 Shell** (breadcrumb / detail-head title + flag + badges / progress stats / tab nav / error state "Plan not found" / Retry / Back to Milestones) | `milestones.planDetail.shell.*` + 기존 `common.*` / `milestones.detail.tabs.*` 재사용 | 약 25 | **High** |
| **STATUS_CONFIG 라벨** (planning/active/completed/cancelled) | 기존 `milestones.planStatus.*` 재사용 가능 (3-3 확인 필요) — 없으면 `common.status.planning/inProgress/completed/cancelled` (기존 `common.started` = 'In Progress' 재사용) | 4 | **High** (공통 뱃지) |
| **PRIORITY_CONFIG 라벨** (P1 Critical/P2 High/P3 Medium/P3 Low) | `milestones.planDetail.priorityLabel.{critical,high,medium,low}` | 4 | **High** |
| **TABS 라벨** (Test Cases/Runs/Activity/Issues/Environments/Settings) | 기존 `common.*` (testCases, runsAndResults…) + 신규 `milestones.planDetail.tab.activity/issues/environments` | 6 | **High** |
| **Test Cases 탭** (lock strip, Entry/Exit Criteria blocks, Auto badge, filter bar, TC table headers, pagination, empty states, Add TCs button) | `milestones.planDetail.testCasesTab.*` | 약 30 | **High** |
| **TC Picker 모달** (header, filter bar search/folder select/Include Draft toggle/draftCount hidden, table columns, empty states, footer selected count + Cancel/Add N TCs) | `milestones.planDetail.tcPicker.*` | 약 25 | **Med** |
| **Runs 탭** (strip 4 stats + New Run, run-card meta, assignees +N more, Unassigned, View button, run CTA card, empty "No runs linked yet.") | `milestones.planDetail.runsTab.*` | 약 25 | **High** |
| **Activity 탭** (filter pills + date menu + Export + day headers "Today · …"/"Yesterday · …" + event descriptions 18종 + `{actorName} recorded/locked/etc.` + status pill + CSV header 4종) | `milestones.planDetail.activityTab.*` + 기존 `milestones.detail.overview.activity.*` 재사용 | 약 40 | **High** |
| **Issues 탭** (`IssuesList` 을 렌더만 — 이미 Phase 1 번역 완료. 사이드바 + empty states 만) | 기존 `common.issues.*` 재사용 (추가 키 거의 없음) | 0~3 | **Low** (Phase 1 커버리지 활용) |
| **Environments 탭** (이미 `useTranslation('environments')` 적용) | 기존 `environments.*` | 0~5 | **Low** (추가 없음) |
| **Settings 탭 — Basic Information** (section title, form labels: Plan Name *, Description, Owner, Priority, Dates, Linked Milestone, Status, "— Unassigned —", "— Ad-hoc (no milestone) —", "↳ {name} (sub-milestone)", Status options planning/In Progress/Completed/Cancelled) | `milestones.planDetail.settings.basicInfo.*` | 약 25 | **High** |
| **Settings 탭 — Entry/Exit Criteria editor** (section titles, items suffix, Add criterion drop, Presets dropdown, preset empty states, placeholder examples) | `milestones.planDetail.settings.criteria.*` | 약 12 | **High** |
| **Settings 탭 — Save bar** ("Unsaved changes" / "Discard" / "Save Changes" / "Saving…") | `milestones.planDetail.settings.saveBar.*` | 4 | **High** |
| **Settings 탭 — Danger Zone** (section title, "Archive plan" / "Unarchive plan" 2상태 + 설명 + CTA, "Duplicate plan" + 설명 + CTA, "Delete plan" + 설명 + "Delete permanently" CTA) | `milestones.planDetail.settings.dangerZone.*` | 약 12 | **High** (파괴적 액션 — 오역 리스크 큼) |
| **AI Risk Predictor 카드** (sidebar, Phase 1 AIRiskAnalysisCard와 별개 — Plan 전용 엔드포인트) — header "AI Risk Predictor" + "Failure risk diagnostic" / "Scanned {date} · {time}" / "Forecast Completion" / "Confidence" / "Top Risk Signals" / "Recommendation" / "Re-scan" / "Run Risk Scan" / empty state + "Costs 1 AI credit · Requires Starter plan" + Scanning… + error messages) | `milestones.planDetail.aiRiskPredictor.*` | 약 20 | **High** |
| **Snapshot 카드** (header + LOCKED/Unlocked badge + "Locked at" / "Locked by" / "TC revision" / "Drift from live" + N TC edited (plural) / Up to date + Rebase tooltip / Unlock + empty state "Lock the TC scope to prevent drift. Required before starting a tracked run." / "Lock Snapshot" / "Add TCs to enable locking.") | `milestones.planDetail.snapshot.*` | 약 18 | **High** |
| **Execution Pace 카드** (header + sparkline day labels via `formatShortDate` + "Avg TC/day" + "Remaining" + "{n} TC ~{days}d") | `milestones.planDetail.executionPace.*` | 약 8 | **Med** |
| **Unlock Confirm 모달** (title "Unlock Snapshot" + 2 paragraph 설명 + Cancel/Unlock CTA) | `milestones.planDetail.modal.unlock.*` | 약 5 | **High** |
| **Delete Confirm 모달** (title "Delete Test Plan" + `Are you sure you want to delete "{{planName}}"? This action cannot be undone.` + Cancel/Delete Plan CTA) | `milestones.planDetail.modal.delete.*` | 4 | **High** |
| **Archive Confirm 모달** (title "Archive Plan" + `Archive "{{planName}}"? …` + Cancel/Archive CTA) | `milestones.planDetail.modal.archive.*` | 4 | **High** |
| **Unarchive Confirm 모달** (title "Unarchive Plan" + `Restore "{{planName}}" to Planning status? …` + Cancel/Unarchive CTA) | `milestones.planDetail.modal.unarchive.*` | 4 | **High** |
| **Duplicate Confirm 모달** (title "Duplicate Plan" + `Create a copy of "{{planName}}" with the same TC snapshot ({{count}} test case[s])? …` + plural + Cancel/Duplicate CTA) | `milestones.planDetail.modal.duplicate.*` | 5 | **High** |
| **SplitButton** (`Start Run` / `Continue Run` / `{n} Runs In Progress` / `Continue: {name}` / `{executed}/{total} executed` / `＋ Start New Run`) | `milestones.planDetail.runButton.*` | 7 | **High** |
| **Toasts 공통 성공·실패 메시지 37건** | `milestones.planDetail.toast.*` + 기존 `common.toast.*` 재사용 | 약 30 | **High** |
| **에러 상태** ("Plan not found" / "Failed to load plan" / "The plan may have been deleted or you may not have access." / "This plan does not exist or has been deleted." / Retry / ← Back to Milestones) | `milestones.planDetail.errorState.*` | 6 | **High** |

**총 고유 신규 키 수 추정 (Phase 1 재사용 분 차감 후):** 약 **180~220 키**. 중복·재사용·aggregate 감안 시 최종 **PR에서 200 내외** 수렴 목표.

### 4-3. 네임스페이스 결정

**결정:** **기존 `milestones` 네임스페이스에 `planDetail.*` 서브트리를 신규 추가**한다.

**근거:**
- Phase 1 Design Spec §3-2 "네임스페이스 추가 없이 기존에 편입" 원칙 유지.
- Plan은 도메인 상 **Milestone 의 자식 엔티티** (`test_plans.milestone_id → milestones.id`). Milestone Detail 이 `milestones.detail.*` 에 있으니 Plan Detail 도 `milestones.planDetail.*` 로 배치하는 것이 트리 구조 상 자연스럽다.
- 대안 1: `projects.planDetail.*` → Plan은 프로젝트 scoped 이지만 UI 진입 경로가 Milestone → Plan이므로 부정합.
- 대안 2: 신규 `plans.ts` 네임스페이스 파일 신설 → Phase 1 원칙 위배 + 런타임 번들 분리 이득 미미.
- 대안 3: `common.planDetail.*` → common 비대화, Phase 1 Design Spec §4-6 경고 반영.
- **공유 키** (priority, status, runsAndResults tab label, pass/fail/blocked/untested stat, testCases tab label, "Lock Snapshot" if Milestone Detail 도 같은 용어 사용, toast common 류) 는 기존 `common.*` / `milestones.*` 재사용.

**변수 Interpolation 변수명 규약:**
- Plan 이름: `{{planName}}` (기존 Phase 1 `{{runName}}` 과 동일 스타일)
- TC 개수: `{{count}}` (i18next plural 표준)
- 날짜 포맷: `{{date}}` / `{{time}}`
- 크레딧 수: `{{used}}` / `{{remaining}}`
- TC id / run name: `{{tcId}}` / `{{runName}}`
- Status transition: `{{from}}` / `{{to}}` (Activity 탭 Status changed: X → Y)

### 4-4. 키 재사용 맵 (기존 번들에 이미 존재 → 중복 생성 금지)

아래 키는 Phase 1 이전 또는 Phase 1 에서 정의 완료된 것이므로 **plan-detail/page.tsx 교체 시 신규 키 생성 금지, 그대로 참조**한다.

| 영문 문자열 | 재사용 키 | 비고 |
|-----------|---------|-----|
| Cancel / Save / Delete / Edit / Close / Add / Remove / Search / Export | `common.cancel` / `common.save` / `common.delete` / `common.edit` / `common.close` / `common.add` / `common.remove` / `common.search` / `common.export` | 전역 action 키 |
| Passed / Failed / Blocked / Retest / Untested | `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | Test status |
| Priority / Status / Owner / Name / Description / Assignee | `common.priority` / `common.status` / `common.owner` / `common.name` / `common.description` / `common.assignee` | 공통 라벨 |
| Loading... / No data available / An error occurred | `common.loading` / `common.noData` / `common.error` | 기본 UX |
| Start date / End date / Due date / Created at / Updated at | `common.startDate` / `common.endDate` / `common.dueDate` / `common.createdAt` / `common.updatedAt` | Date 필드 |
| Today / Yesterday | `common.today` / `common.yesterday` | Relative |
| "just now" / "{{count}}m ago" / "{{count}}h ago" / "{{count}}d ago" | `common.time.justNow` / `common.time.minutesAgo_*` / `common.time.hoursAgo_*` / `common.time.daysAgo_*` | Phase 1 신규 — `formatRelativeTime(iso, t)` 헬퍼 호출로 이관 |
| Settings / Runs / Test Cases / Milestones | `common.settings` / `common.runsAndResults` / `common.testCases` / `common.milestones` | Navigation 라벨 |
| Test Plans / Runs / Exploratory (Execution sections) | `milestones.detail.overview.sections.testPlans` / `.runs` / `.exploratory` | Phase 1 완료 |
| Plan: {{name}} / Plan: (deleted) / Planned / Milestone-direct | `milestones.detail.overview.sections.runBadge.*` | Phase 1 완료 |
| passed / failed / blocked / untested (활동 동사형 & stat 라벨) | `milestones.detail.overview.sections.stat.*` + `.activity.action.*` | Phase 1 완료 |
| Issues / IssuesList 전체 (Total Issues / Linked TCs / bug reports / Loading issues… / Last synced / Refresh now / Metadata unavailable / 모든 sync 토스트) | `common.issues.*` | Phase 1 완료 — Plan Issues 탭에서 그대로 재사용 |
| Settings saved / Failed to save / Network error | `common.toast.saved` / `common.toast.saveFailed` / `common.toast.networkError` | Phase 1 신규 |
| Save Changes / Discard (save bar) | `common.save` + `milestones.planDetail.settings.saveBar.discard` (새) | 기존 공통 + 한 개 신규 |

**주의:** 기존 `common.started = 'In Progress'` 값이 Status dropdown `In Progress` option 과 **미묘하게 대소문자 mismatch** — `In Progress` 렌더 결과 동일하지만 i18n 키명 상 `common.started` 는 "started"라는 의미 모호. Phase 2a 는 이를 **건드리지 않고** 새 키 `milestones.planDetail.settings.basicInfo.status.active` 를 추가하여 사용한다 (Phase 1 Design Spec §3-3 "런" 레거시 보존 원칙 따름).

### 4-5. 상수 블록 리팩토링 패턴 (AC-9, AC-10)

top-level 상수에서 `t()` 를 호출할 수 없으므로 다음 패턴으로 리팩토링:

```tsx
// Before (top-level, 모듈 로드 시 1회)
const STATUS_CONFIG = {
  planning:  { label: 'Planning',     badgeCls: 'badge badge-neutral' },
  active:    { label: 'In Progress',  badgeCls: 'badge badge-warning' },
  completed: { label: 'Completed',    badgeCls: 'badge badge-success' },
  cancelled: { label: 'Cancelled',    badgeCls: 'badge badge-danger'  },
};

// After (컴포넌트 내부, useMemo로 t 의존)
const STATUS_CONFIG = useMemo(() => ({
  planning:  { label: t('planDetail.statusConfig.planning'),  badgeCls: 'badge badge-neutral' },
  active:    { label: t('planDetail.statusConfig.active'),    badgeCls: 'badge badge-warning' },
  completed: { label: t('planDetail.statusConfig.completed'), badgeCls: 'badge badge-success' },
  cancelled: { label: t('planDetail.statusConfig.cancelled'), badgeCls: 'badge badge-danger'  },
  archived:  { label: t('planDetail.statusConfig.archived'),  badgeCls: 'badge badge-neutral' },  // ← NEW: Danger Zone Unarchive 대비
}), [t]);
```

**동일 패턴 적용 대상:**
- `STATUS_CONFIG` — `PlanDetailPage` 컴포넌트 내부로 이동 (4 + archived=5개 라벨)
- `PRIORITY_CONFIG` — `PlanDetailPage` 내부 (4 라벨). `priCls` 는 그대로 유지.
- `TABS` — `PlanDetailPage` 내부 `useMemo` (6 라벨, `iconEl` JSX 은 고정 가능)
- `TC_PRI` — `TestCasesTab` 내부 (이미 컴포넌트 내부이므로 단순 `{ label: t(...), cls: '...' }` 변환)
- `RESULT_CLS` — 값이 className 만 있으므로 **그대로 유지**, 단 렌더할 `resultLabel` 은 `t('common:passed')` 등 기존 키 호출로 분리 (현재 코드의 `result.charAt(0).toUpperCase() + result.slice(1)` 로직 제거 — result value 가 키 룩업으로 변환됨)

### 4-6. 날짜·시간 포맷 헬퍼 확장 (AC-11)

Phase 1 에서 이미 `src/lib/dateFormat.ts` 에 `formatShortDate(iso, lang?)` 를 추가했다. Phase 2a 는 **시간 포함 포맷 `formatShortDateTime`** 을 추가로 export 한다.

```ts
// src/lib/dateFormat.ts — 확장
import i18n from '@/i18n';

export function formatShortDate(iso: string, lang?: string): string { /* 기존 */ }

export function formatShortDateTime(iso: string, lang?: string): string {
  const locale = (lang ?? i18n.language) === 'ko' ? 'ko-KR' : 'en-US';
  const d = new Date(iso);
  // Matches: "Apr 21, 14:30" (en) / "4월 21일 14:30" (ko)
  const datePart = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(d);
  const timePart = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${datePart} · ${timePart}`;
}

export function formatShortTime(iso: string, lang?: string): string {
  const locale = (lang ?? i18n.language) === 'ko' ? 'ko-KR' : 'en-US';
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
}
```

**호출처 교체 (6곳):**
1. `PlanSidebar` sparkline days (lines 167-171) — `formatShortDate`
2. `PlanSidebar` snapshot "Locked at" (line 382) — `formatShortDateTime`
3. `PlanSidebar` AI Risk "Scanned …" (line 293) — `formatShortDateTime`
4. `RunsTab` run-card dateStr + timeStr (line 1105-1106) — `formatShortDateTime` (하나로 통합)
5. `RunsTab` bestRunLabel (line 1019) — `formatShortDate`
6. `ActivityTab` getDayLabel (line 1352-1353) — `formatShortDate`
7. `ActivityTab` formatTime (line 1337) — `formatShortTime`
8. detail-head range display (line 3134-3136, 3142) — `formatShortDate`
9. Settings / Duplicate modal's related text (해당 없음 — 상대시간 없음)

**원칙:** 각 호출 site 는 `const { t, i18n } = useTranslation(...)` 로 `i18n.language` 를 받아 헬퍼에 전달. (헬퍼 내부가 i18n 싱글톤 import 해도 되지만 React 18 strict-mode 하에서 re-render 일관성 위해 param 전달 권장.)

### 4-7. 동작 흐름 (Flow)

**정상 흐름 (개발자 관점, 파일 단위 워크):**
1. 개발자가 `src/pages/plan-detail/page.tsx` 상단에 이미 존재하는 `useTranslation()` 호출을 확인 (`EnvironmentsTab` 에서만 사용 중) → **`PlanDetailPage` 메인 + 모든 자식 함수 컴포넌트에 `useTranslation('milestones')` 훅을 추가**. 일부는 `useTranslation('common')` 또는 멀티 네임스페이스 로드 필요 (`useTranslation(['milestones', 'common', 'runs'])`).
2. 상수 리팩토링 (§4-5) 먼저 수행 — `useMemo`로 변환.
3. 탭 단위로 섹션별 치환: Test Cases → TC Picker → Runs → Activity → Settings → Sidebar → Modals → Toasts.
4. 각 섹션별 `src/i18n/local/en/milestones.ts` 의 `planDetail.*` 서브트리 확장 후 ko 동시 추가.
5. `npm run scan:i18n:parity` 로 키 누락 확인, `npm run scan:i18n` 으로 하드코딩 매치 감소 확인.
6. `.i18nignore` 에서 `src/pages/plan-detail/page.tsx` 라인 제거 후 최종 `scan:i18n` 실행 — 매치 0 건 확인.
7. `npx tsc --noEmit` + `npm run build` + `npm run test -- --run` PASS 확인.

**대안 흐름:**
- AC-13 soft cap 500 라인 초과 시: Settings 탭만 별도 "Phase 2a-split" Dev Spec 으로 분리 (현재는 하나로 진행, 초과 임박 시 Designer 와 재조율).
- Environments 탭 i18n이 Phase 2a 범위 내 추가 필요 항목 발견 시 (예: 상단 legend 레이블 누락): 기존 `environments.heatmap.*` 서브트리에 추가 — **신규 키는 milestones 네임스페이스 금지** (Design Spec §3-2 원칙).

**에러 흐름:**
- 번역 키 누락 시 i18next `fallbackLng='en'` 동작으로 영문 렌더 + 콘솔 `missingKey` 경고. CI 의 `scan:i18n:parity` 가 머지 전 차단.
- interpolation 변수 미전달 (`t('modal.delete.body', {})` 누락) 시 `{{planName}}` 문자열 DOM 노출 → 수동 테스트로 감지. **Playwright 스펙 1건 추가 권장** (Out-of-scope 가능성 §9 참조).

### 4-8. 권한 (RBAC)

| 역할 | 영향 |
|------|------|
| Owner / Admin / Manager / Tester / Viewer / Guest | 모두 동일하게 번역 결과를 받는다. **RBAC 변경 없음.** 기존 "AI Risk Predictor Starter plan required" 같은 tier 가드는 서버 `403` 응답을 그대로 표시하므로 클라이언트 i18n 과 직교. |

### 4-9. 플랜별 제한

| 플랜 | 제한 | 비고 |
|------|------|------|
| Free / Hobby / Starter / Pro / Enterprise | 모두 동일 | 번역은 플랜 관계없이 제공. AI Risk Predictor 는 Starter+ 제한이 이미 서버에 존재 — i18n 과 무관. |

---

## 5. 데이터 설계

**변경 없음.** 순수 프론트엔드 리팩토링. DB 스키마 / RLS / Edge Function 엔드포인트 전부 무변경.

---

## 6. API 설계

**변경 없음.**

`risk-predictor` Edge Function 이 반환하는 에러 본문 (`data.error`) 은 현재 영문 고정 문자열이다 (`'Starter plan required for AI Risk Predictor'`, `'Monthly AI credit limit reached'`). Phase 2a 는 서버 응답을 건드리지 않고, **클라이언트가 서버 응답을 그대로 보여주는 fallback** + **없을 때 i18n 키로 대체** 하는 Phase 1 `RiskInsightContainer.tsx` 패턴을 재사용:

```tsx
// 현재
showToast(data.error || 'Starter plan required for AI Risk Predictor', 'warning');
// After
showToast(data.error || t('milestones:planDetail.aiRiskPredictor.error.tierTooLow'), 'warning');
```

추후 서버가 error **code** (예: `'tier_too_low'`)만 반환하도록 리팩토링되면, 클라이언트가 코드→키 매핑으로 완전 번역 가능. 해당 서버 리팩토링은 **Out of Scope** (§9).

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일
없음. (Phase 1에서 `scripts/scan-i18n.mjs`, `src/lib/formatRelativeTime.ts`, `src/lib/dateFormat.ts`, `.i18nignore` 이미 생성됨.)

### 수정 파일

| 파일 | 주요 변경 | 예상 라인 변동 |
|------|---------|-------------|
| `src/pages/plan-detail/page.tsx` | `useTranslation(['milestones','common','runs'])` 훅 추가, 상수 4블록 (STATUS_CONFIG / PRIORITY_CONFIG / TABS / TC_PRI) 컴포넌트 내부 이동 + `useMemo`, 인라인 `relativeTime` 제거 → `formatRelativeTime(iso, t)` 호출, `toLocaleDateString('en-US', …)` 6곳 → `formatShortDate` / `formatShortDateTime` 교체, JSX 텍스트 75곳 + `showToast` 37건 + attribute 16건 i18n 키로 교체 | +300 ~ +500 / -100 (본문 증가 없음 — 문자열 치환 위주) |
| `src/i18n/local/en/milestones.ts` | `planDetail.*` 서브트리 신규 추가 (shell / statusConfig / priorityLabel / testCasesTab / tcPicker / runsTab / activityTab / settings.{basicInfo,criteria,saveBar,dangerZone} / aiRiskPredictor / snapshot / executionPace / runButton / modal.{unlock,delete,archive,unarchive,duplicate} / toast / errorState) | +180 ~ +240 |
| `src/i18n/local/ko/milestones.ts` | en 트리와 동일 키 ko 번역 | +180 ~ +240 |
| `src/i18n/local/en/common.ts` | 필요시 누락 공통 키 보충 (`common.toast.deleteFailed`, `common.toast.updateFailed`, `common.unassigned` — `—/` dash placeholder) | +3 ~ +8 |
| `src/i18n/local/ko/common.ts` | 위와 동일 | +3 ~ +8 |
| `src/i18n/local/en/runs.ts` | 필요시 plan-detail Runs 탭에서 공유 가능한 키 (예: `runs.totalRuns`, `runs.bestPassRate`, `runs.envsCovered`, `runs.latest`, `runs.newRun`) 를 상위로 승격하여 Run List 와 공유 고려. **단 3회 미만 재사용 시 `milestones.planDetail.runsTab.*` 로 유지** (Phase 1 §4-6 원칙) | 0 ~ +10 |
| `src/i18n/local/ko/runs.ts` | 위와 동일 | 0 ~ +10 |
| `src/lib/dateFormat.ts` | `formatShortDateTime(iso, lang?)` + `formatShortTime(iso, lang?)` export 추가 | +15 |
| `.i18nignore` | `src/pages/plan-detail/page.tsx` 파일 단위 예외 **라인 제거**. 최하단 `# ── Out of scope (dev-spec §9 — phase 2 files)` 주석도 run-detail 관련으로 축소 | -2 |

**총 파일 수:** 8~9개. 신규 0, 수정 8~9.

**신규 번역 키 수 (en + ko 합산):** 약 360~520 라인 (AC-13 한도 500 이내).

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 한국어에서 interpolation 변수가 문장 어순과 맞지 않음 (예: `"Are you sure you want to delete \"{{planName}}\"?"` → 한국어로 `"\"{{planName}}\" 플랜을 삭제하시겠습니까?"`) | 변수 위치를 자유롭게 옮겨 **자연스러운 한국어 어순** 으로 번역 (i18next interpolation은 위치 무관). Designer 단계에서 확정. |
| `{{planName}}` 안에 한국어 plan 이름이 들어오는 경우 (예: "스프린트 7") | 문자열 치환이므로 문제 없음. |
| Status dropdown 값 `"In Progress"` 과 Phase 1 `common.started = 'In Progress'` 키 중복 | **기존 `common.started` 건드리지 않음.** 신규 `planDetail.statusConfig.active` 추가. 렌더 값은 동일하므로 기능 회귀 없음. |
| `STATUS_CONFIG[plan.status]` 에 **`archived`** status 가 없어 fallback → 기본 `planning` 사용 (현재 코드 line 3073) | 이번 기회에 `archived` 라벨 추가 (`milestones.planDetail.statusConfig.archived = '보관됨'` / `'Archived'` — 기존 `common.archived` 재사용 검토) . 기존 `STATUS_CONFIG.planning` fallback 유지해도 되지만 렌더 오표시 버그 수정 효과 겸함. |
| `t()` 호출 시 parent 네임스페이스 miss (예: `useTranslation('milestones')` 후 `t('common:cancel')`) | i18next 기본 설정으로 `:` 사용한 cross-namespace lookup 동작. 기존 Phase 1 패턴 (예: `AiRiskAnalysisCard.tsx`) 과 동일. |
| `useTranslation(['milestones','common','runs'])` 다중 네임스페이스 호출 — 번들 사이즈 영향 | 정적 번들이라 영향 없음 (모두 이미 import됨). React re-render 비용만 무시 가능. |
| Delete Confirm 모달에서 `plan.name` 이 매우 길 때 (100자) | 현재 CSS `<strong>` 에 max-width 없음. 한국어는 더 짧아지므로 **모바일 뷰포트 overflow 없음**. |
| 네트워크 끊김 상태로 AI Risk Predictor 호출 | 기존 `try/catch` fallback → `'Risk scan failed: ${err.message}'` → 번역 키 `aiRiskPredictor.toast.scanFailed` + `{{message}}` interpolation. err.message 는 서버 응답 본문 → 현재처럼 fallback 으로 pass-through. |
| TC Picker 에서 Include Draft toggle 상태 문자열 ("Include Draft TCs") + draft count hidden ("{{count}} hidden") | 한국어 어순 자연스러움: "초안 TC 포함" / "{{count}}건 숨겨짐". |
| Activity 탭 export CSV 헤더 (`'Date,Event,Actor,Details'`) | **번역 대상 아님** (export 내부 데이터). 파일명도 `activity_{planName}_{dateRange}.csv` 유지 — 외부 시스템 포워드 형식. `.i18nignore` 자동 통과 (regex 밖). |
| Activity 탭 이벤트 desc (`'recorded'`, `'added test cases to the plan'`, `'locked the snapshot'` 등 18종) | 각각 `milestones.planDetail.activityTab.desc.*` 로 키 매핑. 이벤트 타입별 if/else 체인 유지하고 `desc = 'recorded'` → `desc = t('desc.recorded')` 로 교체. |
| 동시에 다른 개발자가 Phase 2b (run-detail) 작업 → 같은 `milestones.ts` / `common.ts` / `runs.ts` 파일 수정 | **Phase 2a 와 Phase 2b 는 병렬 진행 불가** (같은 i18n 파일 충돌). Phase 2a 머지 후 Phase 2b 착수 권고. CLAUDE.md "병렬 불가" 조합과 동일. |
| AC-7 interpolation 누락 regression 방지 | Playwright 스펙 `e2e/i18n-plan-detail.spec.ts` 신규 — **Out of scope** 로 분리 (§9) 하거나 Dev Spec 내에 선택적 AC로 포함. |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **`src/pages/run-detail/page.tsx`** (5,245줄) — **Phase 2b** 로 분리. `dev-spec-i18n-coverage-phase2-run-detail.md` 신규 작성 예정.
- [ ] **`src/pages/plan-detail/page.tsx` 를 탭별 파일로 물리 분할** (PlanSidebar.tsx / TestCasesTab.tsx / RunsTab.tsx / ActivityTab.tsx / SettingsTab.tsx / EnvironmentsTab.tsx / PlanDetailModals.tsx) — 구조 리팩토링 이득은 있지만 i18n 작업과 **동시에 하면 회귀 리스크 급증**. 별도 `dev-spec-plan-detail-decomposition.md` (f030 계열) 이슈로 분리.
- [ ] **`AIPlanAssistantModal`** (`src/pages/project-plans/AIPlanAssistantModal.tsx`) 내부 — `PlanDetailPage` 에서 import 하지만 파일 경로가 다름. 해당 모달 내부 하드코딩은 **Phase 3 (전체 리스트 기반)** 범위.
- [ ] **`src/components/EnvironmentAIInsights.tsx`** — plan-detail/page.tsx 에서 import 하지만 별도 파일. 해당 파일 내부 하드코딩은 **Phase 3** 범위.
- [ ] **`ProjectHeader`, `PageLoader`, `Avatar`, `IssuesList`, `useToast`** — 이미 Phase 1 에서 처리됐거나 공유 컴포넌트. 변경 없음.
- [ ] **Edge Function `risk-predictor` 의 에러 메시지 서버-사이드 i18n** — 서버가 영문 문자열을 반환하는 현재 구조 유지. 별도 티켓 (f013 "AI locale prompt" 근접).
- [ ] **CSV Export 파일명 / 헤더 / 날짜 포맷 내부 로케일 변경** (Activity 탭 export `activity_{planName}_{dateRange}.csv`) — 외부 시스템 포워드 형식 유지. Phase 1 Excel/PDF export 와 동일 정책.
- [ ] **기존 `common.runsAndResults = 'Runs'` (네비게이션) 키와 `milestones.detail.overview.sections.runs = '런'` (섹션 헤더, KO) 간의 레거시 불일치 통일** — Phase 1 Design Spec §3-3 "3차 정리 대상" 으로 이미 명시. Phase 2a 신규 키는 "실행" 으로 통일.
- [ ] **RTL 언어 지원 / 천단위 숫자 구분자 / 시간대 변환** — Phase 1 §9 와 동일.
- [ ] **Playwright E2E 스펙** (plan-detail 전체 탭 진입 + `missingKey` 경고 0건 + 하드코딩 영문 0건) — 별도 `e2e/i18n-plan-detail.spec.ts` 티켓 권장. 현 Dev Spec은 수동 QA + `scan:i18n` CI 에 의존.
- [ ] **`sections.runs = '런'` (기존) 를 "실행" 으로 리네임** — 리그레션 리스크. Phase 1 §9 와 동일 방침 유지.

---

## 10. i18n 키 (샘플만 — 전체 매핑 표는 Designer 가 `design-spec-i18n-coverage-phase2-plan-detail.md` 에 작성)

> 본 Dev Spec 은 **키 구조만** 정의. 실제 EN/KO 문자열은 Design Spec 에서 확정.

### 10-1. 네임스페이스 구조 개요

```
milestones.planDetail.*
├─ shell
│   ├─ breadcrumb.{milestones, plans}
│   ├─ detailHead.{inheritedFrom, dueSuffix, dateRangeSep}
│   ├─ stats.{executed, passRate, executedOfTotal}
│   └─ a11y.tabBar
├─ statusConfig.{planning, active, completed, cancelled, archived}
├─ priorityLabel.{critical, high, medium, low}
├─ tab.{testCases, runs, activity, issues, environments, settings}
├─ testCasesTab
│   ├─ lockStrip.{title, description, rebase, unlock}
│   ├─ criteria
│   │   ├─ entry.title
│   │   ├─ exit.title
│   │   ├─ metSuffix ("{{met}} / {{total}} met")
│   │   ├─ emptyEntry
│   │   ├─ emptyExit
│   │   ├─ auto.badge
│   │   ├─ auto.tooltip
│   │   └─ toggleTooltip
│   ├─ filter.{searchPlaceholder, allPriority, addTcs, lockSnapshot}
│   ├─ table.{id, title, folder, priority, status, assignee, emptySearch, emptyInitial}
│   └─ pagination.{showing, previous, next}
├─ tcPicker
│   ├─ title
│   ├─ filter.{searchPlaceholder, allFolders, noFolder, includeDraft, draftHidden}
│   ├─ table.{id, title, status, priority, statusDraft, statusActive, emptySearch, emptyAll}
│   ├─ summary ("{{count}} test cases available" plural)
│   ├─ footer.{selected, cancel, addTcs_one, addTcs_other, addTcsZero}
│   └─ a11y.toggleIncludeDraft
├─ runsTab
│   ├─ strip.{totalRuns, bestPassRate, latest, envsCovered, newRun}
│   ├─ strip.sub.{planLinked, noRuns, noData, noEnvData}
│   ├─ runCard.{runNumber, executedOfTotal, untestedSuffix, passSuffix, failSuffix, blockSuffix, view, unassigned, moreSuffix}
│   ├─ newRunCta ("Start a new Run with these {{count}} TCs")
│   ├─ newRunCtaHint
│   └─ empty
├─ activityTab
│   ├─ filter.{all, results, runs, tc, ai, status}
│   ├─ dateRange.{last7d, last14d, last30d, allTime}
│   ├─ export
│   ├─ empty
│   ├─ dayHeader.{today, yesterday, events}
│   ├─ system   ("System" actor fallback)
│   └─ desc.{recorded, runStatusChanged, tcAdded, tcRemoved, snapshotLocked, snapshotUnlocked, snapshotRebased, statusChanged, criteriaUpdated, planUpdated, planDeleted, planCreated, planArchived, planUnarchived, planDuplicated, milestoneLinked, defaultFallback}
├─ settings
│   ├─ basicInfo
│   │   ├─ sectionTitle
│   │   ├─ label.{planName, description, owner, priority, dates, linkedMilestone, status}
│   │   ├─ ownerUnassigned ("— Unassigned —")
│   │   ├─ milestoneAdhoc ("— Ad-hoc (no milestone) —")
│   │   ├─ subMilestoneSuffix ("↳ {{name}} (sub-milestone)")
│   │   ├─ startPlaceholder
│   │   └─ endPlaceholder
│   ├─ criteria
│   │   ├─ entryTitle
│   │   ├─ exitTitle
│   │   ├─ itemsBadge ("{{count}} items")
│   │   ├─ entryPlaceholder
│   │   ├─ exitPlaceholder
│   │   ├─ addCriterion
│   │   ├─ savePresetTooltip
│   │   ├─ presetsButton
│   │   ├─ emptyPresets
│   │   └─ allPresetsAdded
│   ├─ saveBar.{unsaved, discard, save, saving}
│   └─ dangerZone
│       ├─ sectionTitle
│       ├─ archive.{titleArchived, titleUnarchived, descArchived, descActive, ctaArchive, ctaUnarchive}
│       ├─ duplicate.{title, description, cta}
│       └─ delete.{title, description, cta}  ("Delete permanently")
├─ aiRiskPredictor
│   ├─ title
│   ├─ subtitle ("Failure risk diagnostic")
│   ├─ scannedAt ("Scanned {{time}}")
│   ├─ forecastCompletion
│   ├─ confidence
│   ├─ topRiskSignals
│   ├─ recommendation
│   ├─ rescan
│   ├─ scanning
│   ├─ runScan
│   ├─ empty.description
│   ├─ empty.cost ("Costs 1 AI credit · Requires Starter plan")
│   ├─ toast.{needTcs, complete, failed}
│   └─ error.{tierTooLow, monthlyLimit, default}
├─ snapshot
│   ├─ title
│   ├─ badge.{locked, unlocked}
│   ├─ lockedAt, lockedBy, tcRevision, driftFromLive
│   ├─ tcEdited ("{{count}} TC edited" plural)
│   ├─ upToDate
│   ├─ rebaseTooltip.{noDrift, updateBaseline}
│   ├─ driftTooltip
│   ├─ rebase, unlock
│   ├─ emptyDescription ("Lock the TC scope to prevent drift. Required before starting a tracked run.")
│   ├─ lockCta
│   └─ emptyAddTcs
├─ executionPace
│   ├─ title
│   ├─ avgTcPerDay
│   ├─ remaining
│   ├─ tcWithDaysEst ("{{untested}} TC ~{{days}}d")
│   └─ tcZero
├─ runButton.{startRun, continueRun, multipleInProgress, continueSuffix, executedOfTotal, startNewRun}
├─ modal
│   ├─ unlock.{title, body1, body2, cta}
│   ├─ delete.{title, body, cta}  ("Are you sure you want to delete \"{{planName}}\"? This action cannot be undone." / "Delete Plan")
│   ├─ archive.{title, body, cta}
│   ├─ unarchive.{title, body, cta}
│   └─ duplicate.{title, body_one, body_other, cta}  (plural on TC count)
├─ toast
│   ├─ settingsSaved
│   ├─ criteriaSaveFailed
│   ├─ presetExists
│   ├─ presetSaveFailed
│   ├─ presetSaved
│   ├─ tcAddFailed
│   ├─ tcAdded
│   ├─ tcsAddFailed ("Failed to add test cases: {{message}}")
│   ├─ tcsAdded_one / tcsAdded_other  ("Added {{count}} test case(s)")
│   ├─ tcRemoveFailed
│   ├─ tcRemoved
│   ├─ snapshotLockFailed
│   ├─ snapshotLocked
│   ├─ snapshotUnlockFailed
│   ├─ snapshotUnlocked
│   ├─ snapshotRebaseFailed
│   ├─ snapshotRebased
│   ├─ planUpdateFailed
│   ├─ planDeleteFailed
│   ├─ planDeleted
│   ├─ planArchiveFailed ("Failed to archive plan: {{message}}")
│   ├─ planArchived
│   ├─ planUnarchiveFailed
│   ├─ planUnarchived  ("Plan restored to Planning")
│   ├─ planDuplicateFailed
│   ├─ planTcsNotCopied
│   ├─ planDuplicated
│   ├─ startRunNeedsTcs
│   ├─ aiTcsAlreadyIn
│   ├─ aiTcsAddFailed
│   └─ aiTcsAdded ("Added {{count}} AI-recommended TCs to plan")
└─ errorState
    ├─ notFoundTitle
    ├─ loadFailedTitle
    ├─ notFoundBody
    ├─ loadFailedBody
    ├─ backToMilestones
    └─ retry
```

### 10-2. 공통 키 재사용 (신규 생성 금지)

| 영문 | 재사용 키 |
|------|---------|
| Cancel / Save / Delete / Edit / Close / Add / Remove / Search / Export | `common.*` |
| Passed / Failed / Blocked / Retest / Untested | `common.*` |
| Priority / Status / Owner / Name / Description / Assignee / Start date / End date | `common.*` |
| Loading... / No data available | `common.loading` / `common.noData` |
| Total Issues / Linked TCs / bug reports / Last synced / Refresh now … | `common.issues.*` |
| just now / Nm ago / Nh ago / Nd ago | `common.time.*` (via `formatRelativeTime(iso, t)`) |
| Test Plans / Runs / Exploratory (section headers) | `milestones.detail.overview.sections.*` |
| Plan: {name} / Planned / Milestone-direct | `milestones.detail.overview.sections.runBadge.*` |
| passed / failed / blocked / untested (stat 라벨) | `milestones.detail.overview.sections.stat.*` |

**AC 기준으로 Designer 가 §10-1 의 각 leaf 키에 대해 `design-spec-i18n-coverage-phase2-plan-detail.md §7 치팅시트` 를 작성한다. Dev Spec 은 여기서 문자열 매핑을 생성하지 않는다.**

---

## 11. 리스크

| 리스크 | 영향 | 완화 |
|-------|------|-----|
| **interpolation 변수 누락** (예: `t('modal.delete.body')` 호출 시 `{ planName }` 미전달) → DOM 에 `{{planName}}` 원문 노출 | 미디엄 | 코드 리뷰 시 모든 `t(...)` 호출에 2nd arg 검증. Playwright 스펙 선택적 추가 (§9 OOS). TypeScript 는 i18next 2nd arg 를 강제하지 않으므로 수동 검증 필수. |
| **상수 리팩토링으로 인한 render 비용 증가** (`STATUS_CONFIG` 가 top-level → useMemo 로 이동) | 로우 | `useMemo([t])` 는 언어 변경 시에만 재생성. 현 프로파일링 상 plan-detail 의 주 병목은 TC 필터링·렌더이므로 무시 가능. |
| **`STATUS_CONFIG[plan.status]` 에 `archived` 누락** (현 코드 버그, fallback 으로 planning 표시) | 미디엄 | Phase 2a 작업 중 `archived` 추가 → 부수적 버그 수정. Archive 모달에서 상태 배지가 올바르게 표시됨. |
| **Danger Zone 확인 모달 한국어 번역 톤 약화** (예: "Delete permanently" → "영구 삭제" vs "영구적으로 삭제하기" 톤) | 미디엄 | Design Spec §2 "EN imperative / KO 존댓말 + 강조" 원칙 엄수. Designer 가 한국어 원어민 리뷰 1회 (@marketer or CEO). |
| **Phase 1 regression** (milestones.ts / common.ts / runs.ts 파일 수정 중 기존 키 값 실수로 덮어씀) | 하이 | `git diff src/i18n/local/en/milestones.ts` 확인 — 기존 `detail.*` 하위 키는 건드리지 않고 `planDetail.*` 서브트리만 추가. Test regression 은 `npm run test -- --run` + `npm run scan:i18n:parity` 이중 체크. Phase 1 E2E 스펙 (`e2e/i18n-coverage.spec.ts`) 있다면 그것도 PASS. |
| **`useTranslation(['milestones','common','runs'])` 멀티 네임스페이스 전달 시 기존 `useTranslation('environments')` 호출부 충돌** | 로우 | `EnvironmentsTab` 은 자식 컴포넌트 → 독립 `useTranslation('environments')` 유지. 메인 `PlanDetailPage` 는 `useTranslation(['milestones','common','runs'])`. React hook scope 가 분리되어 안전. |
| **`.i18nignore` 제거 타이밍** — 파일 단위 ignore 를 너무 일찍 제거하면 작업 중 `scan:i18n` 이 계속 실패 | 로우 | 작업 순서: ① 키 추가 + 코드 교체 → ② 스캐너 수동 실행 (ignore 유지 상태로 warning-only) → ③ 모든 교체 확인 후 최종 ignore 제거 → ④ 스캐너 재확인 → ⑤ 커밋. |
| **`formatShortDateTime` 헬퍼 추가 — Phase 1 dateFormat.ts 와의 일관성** | 로우 | Phase 1 이 이미 `formatShortDate` 를 정의 — 동일 파일에 sibling export 추가. 시그니처 `(iso, lang?)` 동일 패턴 유지. |
| **AC-13 키 수 soft cap (500 라인) 초과** | 미디엄 | 선제적으로 Settings 탭 분리 가능. 초과가 확실하면 Designer 가 Design Spec 작성 단계에서 판단 → Dev 에게 split 지시. |
| **Run-detail (Phase 2b) 병행 작업으로 i18n 파일 충돌** | 하이 | **Phase 2a 머지 후 Phase 2b 착수**. Agent Routing 병렬 조합 표에 추가 (`@developer` + `@developer` 는 plan-detail ↔ run-detail 동시 작업 금지). |
| **Tab constant 내 `iconEl` (JSX)** — `useMemo` 로 이동 시 매 render 마다 새 JSX 객체 생성 → memo 의존성 비교 비용 | 로우 | `useMemo` 의 deps = `[t]` 만 두면 언어 변경 시에만 재생성. `iconEl` 자체는 상수 캡처 가능. |
| **한국어 번역 문화 차이** — "Re-scan" / "Rebase" 같은 Git 용어 | 로우 | Design Spec §3 "Rebase" → `리베이스` (음역), "Re-scan" → `다시 스캔` 결정. |

---

## 12. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1 ~ AC-15)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (N/A — 프론트 전용)
- [x] RLS 정책이 정의되었는가 (N/A)
- [x] 플랜별 제한이 명시되었는가 (§4-9: 모든 플랜 동일)
- [x] RBAC 권한 매트릭스가 있는가 (§4-8: 영향 없음)
- [x] 변경 파일 목록이 구체적인가 (§7, 8~9개 파일 실제 경로)
- [x] 엣지 케이스가 식별되었는가 (§8, 13건)
- [x] Out of Scope이 명시되었는가 (§9, 11건)
- [x] i18n 키 구조가 en/ko 양쪽에 정의되는가 (§10 구조 — 문자열 매핑은 Designer)
- [ ] **관련 디자인 명세가 Approved 상태인가** → **다음 단계: `design-spec-i18n-coverage-phase2-plan-detail.md`** 에서 §7 치팅시트 + §3 고유명사 확장 (Plan 전용: "Snapshot", "Drift", "Rebase", "TC revision", "Execution Pace", "Forecast Completion") 을 작성해야 구현 착수 가능.

---

## 13. 후속 작업 (이 스펙 머지 후 생성할 티켓)

1. **`design-spec-i18n-coverage-phase2-plan-detail.md`** — Designer 가 §10-1 키 구조에 EN/KO 실제 문자열 매핑 + Plan 도메인 용어 사전 확장.
2. **`dev-spec-i18n-coverage-phase2-run-detail.md`** — `src/pages/run-detail/page.tsx` (5,245줄) 동일 접근. Phase 2a 머지 후 착수.
3. **`dev-spec-i18n-coverage-phase3-remaining.md`** — 스캐너 전수 리스트 기반 분할 Epic (projects / settings / testcases / sessions / onboarding / admin / blog / pricing / legal 등 ~240여 파일).
4. **`dev-spec-plan-detail-decomposition.md`** — plan-detail/page.tsx 를 탭별 파일로 물리 분할 (i18n 작업 완료 후 구조 리팩토링).
5. **(선택) `e2e/i18n-plan-detail.spec.ts`** — Playwright 로 6개 탭 + 5개 모달 진입 + `missingKey` 경고 0건 검증.
6. **CI gate 강화** — `npm run scan:i18n:check` / `:parity` 를 GitHub Actions 필수 단계로 추가 (Phase 1 왔던 warning-only 모드 → blocking 전환).
