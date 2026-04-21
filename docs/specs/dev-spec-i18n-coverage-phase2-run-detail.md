# Dev Spec: i18n 커버리지 Phase 2b — run-detail/page.tsx 전역 번역

> **작성일:** 2026-04-21
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인 명세:** (후속) `docs/specs/design-spec-i18n-coverage-phase2-run-detail.md` — Designer가 EN/KO 실제 카피를 작성
> **feature_list.json:** f010 (P1) — Phase 2b
> **선행 스펙:**
> - `docs/specs/dev-spec-i18n-coverage.md` (Phase 1, Merged)
> - `docs/specs/design-spec-i18n-coverage.md` (Phase 1, §3 용어 컨벤션 / §4 plural / §5 interpolation 규칙이 본 스펙에도 그대로 적용됨)
> **병행 스펙:** `dev-spec-i18n-coverage-phase2-plan-detail.md` (Phase 2a) — 본 스펙과 파일 중복 없음

---

## 1. 개요

### 문제
Phase 1에서 Milestone Overview / Issues / AIRunSummaryPanel 20개 파일의 하드코딩 영문을 제거했지만, `src/pages/run-detail/page.tsx` (5,245줄) 는 단일 파일이 1차 스펙 용량을 초과한다는 이유로 **`.i18nignore` 에 등재된 상태**이다. 실제로 QA 엔지니어 / Tester가 가장 많이 머무르는 "Run 실행 화면" — TC 목록 필터 · Add Result 모달 · Jira/GitHub Issue 생성 모달 · TC Version Diff · Execution Progress 카드 · Shared Step 업데이트 배너 · Result Detail 모달 — 이 모두 영문 상태라 KO 사용자 체감 번역률을 크게 떨어뜨린다. 또한 같은 파일 안에서 과거에 부분적으로 박아둔 **한국어 리터럴**(예: `'테스트 케이스가 없습니다'`, `'Starter 플랜 이상 필요'`)과 영문이 혼재되어 있어 EN 로케일에서는 역으로 한국어가 그대로 노출된다.

### 해결
`src/pages/run-detail/page.tsx` 본체 + 같은 디렉터리의 자식 컴포넌트(단, **Phase 1에서 이미 처리된 `AIRunSummaryPanel.tsx`는 제외**)를 Phase 1과 동일한 규칙(design-spec §3 용어 / §4 단위·시간 / §5 plural·interpolation / AC-9 AI 본문 pass-through)에 따라 i18next 네임스페이스 키로 교체한다. 신규 키는 기존 `runs` 네임스페이스를 `runs.detail.*` 서브트리로 확장해 편입하고, **공용 모달 레이블**(Cancel / Save / Close / Create Issue 등)은 `common.*` 재사용을 우선한다. 스캐너 `.i18nignore` 에서 `src/pages/run-detail/page.tsx` 항목을 제거해 CI 회귀 방어망을 복원한다.

### 성공 지표
- `ko` 로 Run Detail 진입 → TC 목록 필터·KPI 카드·진행률 바·Add Result 모달·TC Version Diff·Jira Issue 모달·GitHub Issue 모달·Result Detail 모달 모두 한국어 노출 (하드코딩 영문 0건).
- `npm run scan:i18n` 이 `src/pages/run-detail/page.tsx` 포함 상태에서 **매치 0건**.
- `npm run scan:i18n:parity` 가 Phase 1 + Phase 2a + 본 스펙 키를 포함해 **en↔ko diff 0건**.
- 기존 Phase 1 / Phase 2a 번역 회귀 없음 (유닛 테스트 + 스냅샷 테스트 PASS).

---

## 2. 유저 스토리

- **As a 한국어 QA 엔지니어(Tester)**, Run Detail 페이지에서 `Add Result` 모달의 "Status / Note / Steps / Assign to / Linked Issues / Attachments" 라벨이 모두 한국어로 표시되기를 바란다, so that 영문 라벨 해독에 머뭇거리지 않고 결과를 빠르게 기록할 수 있다.
- **As a 한국어 Manager**, "Execution Progress" 카드와 KPI 5종(Total Tests / Passed / Failed / Blocked / Untested)이 한국어로 보이기를 바란다, so that 대시보드 캡처를 한국어 보고서에 그대로 붙여넣을 수 있다.
- **As a 영어권 Admin**, 과거 한국어로 박힌 toast·모달(`Starter 플랜 이상 필요`, `Jira 연동이 필요합니다`, `테스트 케이스가 없습니다`)가 EN 로케일에서 영문으로 돌아오기를 바란다, so that 영문 UI 일관성이 회복된다.
- **As a 개발자**, 스캐너 `.i18nignore` 에서 `run-detail/page.tsx` 가 빠지고 이후 PR의 새 하드코딩이 자동 차단되기를 바란다, so that 이 파일이 다시 i18n 블랙홀이 되지 않는다.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1:** `src/pages/run-detail/page.tsx` 및 그 자식 컴포넌트(§4-1 표에 명시, `AIRunSummaryPanel.tsx` 제외) 안에서 다음 패턴의 **영문·한국어 하드코딩 리터럴이 0건**이다 (디자인 명세 §3-1 브랜드명·§3-1 단위 표기·HTML payload·Claude pass-through 본문 제외).
  - JSX 텍스트 노드 (대문자로 시작하는 2단어 이상 영문, 혹은 한글 음절이 1자 이상 포함된 리터럴)
  - `placeholder=` / `aria-label=` / `title=` / `alt=`
  - `showToast('error'|'success', '<문자열>')` / `alert(...)` / `confirm(...)` 의 영문·한국어 상수
  - `throw new Error('<유저 가시 문자열>')`
- [ ] **AC-2:** `.i18nignore` 의 `src/pages/run-detail/page.tsx` 라인을 제거한 상태에서 `npm run scan:i18n` → exit 0, 매치 0건.
- [ ] **AC-3:** `npm run scan:i18n:parity` 가 Phase 1 + Phase 2a + 본 스펙 신규 키 전체에 대해 exit 0 (en↔ko 키 트리 diff 0).
- [ ] **AC-4:** `tsc --noEmit` 에러 0건, `npm run build` 성공, `npm run test -- --run` 전부 PASS.
- [ ] **AC-5:** 기존 `formatRelativeTime(iso, t)` · `formatShortDate(iso)` 헬퍼를 재사용하고, run-detail 내부에서 **인라인 날짜·상대시간 조합 문자열을 직접 만들지 않는다** (예: `new Date(...).toLocaleDateString('en-US', ...)` 직접 호출 0건 — 이미 Phase 1에서 헬퍼가 제공됨).
- [ ] **AC-6:** Phase 1 주요 키(`runs.aiSummary.*`, `common.issues.*`, `common.time.*`, `common.toast.*`) 를 삭제·리네임하지 않는다. 본 스펙은 **신규 `runs.detail.*` 트리 + `runs.toast.*` 트리 확장만** 허용.
- [ ] **AC-7:** 상태 뱃지 Pass/Fail/Blocked/Retest/Untested 라벨은 **기존 `common.passed|failed|blocked|retest|untested` 재사용**. 신규 키 추가 금지(재사용 실패 시 상세 이유를 PR 설명란에 명시).
- [ ] **AC-8:** Pass/Fail/Blocked/Retest/Untested 의 `<option value="…">` 라벨과 동일한 뜻을 가지는 **KPI 카드 label·Progress legend label·Add Result status button label**은 모두 같은 키(공통 상태 번역)를 참조한다. 세 위치의 번역이 엇갈리면 AC-8 실패.
- [ ] **AC-9 (AC-9 재확인):** AI 요약 본문 pass-through 정책(Phase 1 AC-9)은 본 파일에서도 그대로 적용된다. `handleSummaryInjectIntoJira()`, `buildPdfHtmlForAi()`, `buildGithubIssueBody()` 등 **외부 시스템(Jira payload / PDF export HTML / GitHub body)으로 전송되는 영문 템플릿 문자열은 번역 대상 아니다** — `.i18nignore` 에 이미 등록된 규칙(`/\[AI Summary\]/` 등)을 유지하고, 본 파일에서도 동일 규칙이 적용되도록 `.i18nignore` 를 조정한다 (§4-5 참고).
- [ ] **AC-10:** 본 스펙이 추가하는 en 리프 키 수는 **대략 300 ± 50 개** 범위로 유지한다 (§5 참고). 범위를 크게 벗어나면 섹션을 분리하거나 `common.*` 재사용을 재검토한다.
- [ ] **AC-11 (신규):** 이 파일에 섞여있던 한국어 리터럴(예: `'테스트 케이스가 없습니다'`, `'이 Run에 테스트 케이스가 포함되어 있지 않습니다.'`, `'Starter 플랜 이상 필요'`, `'Jira 연동이 필요합니다'`, `'닫기'`, `'플랜 업그레이드'`, `'이 브라우저는 스크린샷 기능을 지원하지 않습니다.'`, `'Summary는 필수 항목입니다.'`, `'쉼표로 구분하여 여러 라벨을 입력하세요'`, `'비워두면 자동 할당됩니다'`, `'접기'` / `'펼치기'`, `'폴더 없음'` 등) 은 **전부 번역 키로 이관**되어 EN 로케일에서 영문으로, KO 로케일에서 한국어로 노출된다.
- [ ] **AC-12 (신규):** 키보드 단축키 힌트 (`title="Cmd+Shift+F"`, Focus Mode 내부 힌트)에서 **단축키 자체는 영문 / 키명을 그대로 유지**하고, 설명 문장만 번역한다. 예: EN `"Focus Mode (Cmd+Shift+F)"`, KO `"Focus Mode (Cmd+Shift+F)"` — 단축키 조합은 번역 대상이 아님. (실제 문구는 Designer가 확정)

---

## 4. 기능 상세

### 4-1. 스코프 (대상 파일 목록)

**포함:**

| 경로 | 라인 수 | 역할 | 우선순위 |
|------|---------|------|---------|
| `src/pages/run-detail/page.tsx` | 5,245 | 메인 페이지 + 6개 모달 + 우측 DetailPanel 래퍼 + ResultDetailModal 서브 컴포넌트(동일 파일 내) | **high** |

**제외 (사유 명시):**

| 경로 | 사유 |
|------|------|
| `src/pages/run-detail/components/AIRunSummaryPanel.tsx` | **Phase 1에서 이미 처리됨** (`runs.aiSummary.*` 트리). 본 스펙에서 재수정 금지. |
| `src/pages/plan-detail/page.tsx` | **Phase 2a** 플래너가 병행 처리 중. 공유 파일(`src/i18n/local/{en,ko}/common.ts`, `runs.ts`) 에 키를 추가할 때만 머지 충돌 가능성 주의 (§7 참조). |
| `src/components/DetailPanel.tsx` / `FocusMode.tsx` / `StatusBadge.tsx` / `Avatar.tsx` / `ExportModal.tsx` / `ProjectHeader.tsx` | run-detail 외에도 여러 페이지에서 재사용되는 공유 컴포넌트. 본 스펙에서 **건드리지 않음**. 이 컴포넌트들의 i18n 상태는 각각의 자체 스펙(Phase 3 — 공유 컴포넌트 Epic)에서 다룬다. 단, run-detail 에서 이들로 **prop 으로 넘기는 문자열**(예: `runName={run?.name || 'Test Run'}` 의 fallback `'Test Run'`)은 본 스펙에서 `t()` 로 교체. |

**하드코딩 규모 측정 (grep `>[A-Z][a-zA-Z ]{2,}<` / `>\s*[A-Z][a-zA-Z]+\s*<` / `placeholder=|aria-label=|title=` / `showToast\(`, 2026-04-21 HEAD 기준):**

| 카테고리 | 대략 건수 | 비고 |
|---------|----------|------|
| JSX 텍스트 (영문 `Capitalized word` 2단어) | ~98 | 주로 모달 라벨·섹션 헤더 |
| JSX 텍스트 (영문 한 단어 `>Word<`) | ~69 | 상태 옵션 / 뱃지 / 짧은 라벨 |
| `placeholder=` / `aria-label=` / `title=` / `alt=` | ~30 | 검색창·input·버튼 툴팁 |
| `title={...}` 템플릿 (예: `` `Passed: ${n}` ``) | ~5 | 진행률 바 hover 툴팁 |
| `showToast('type', '<문자열>')` | ~29 | 에러·성공 토스트 |
| `throw new Error('<유저 가시>')` | 2 | 런타임 가드 |
| `confirm('…')` / `alert('…')` | 1 | Jira setup redirect confirm |
| **한국어 하드코딩** (EN 로케일에서 회귀 대상) | ~22 | `'Starter 플랜…'`, `'접기'`, `'폴더 없음'`, `'닫기'`, `'플랜 업그레이드'`, `'테스트 케이스가 없습니다'`, error toast 2건 등 |
| **기존 i18n 적용 ( `t(...)` 호출)** | 88 | 대부분 외곽 레이아웃 / 네비게이션 — 건드리지 않음 |

> **총 신규 교체 예상 키**: **250~320 leaf 키** (en + ko 합산 500~640 라인). AC-10 의 300±50 범위와 일치.

### 4-2. 실행 흐름별 UI 영역 분할 (섹션 맵)

run-detail/page.tsx가 긴 이유는 "Plan view / Execute / Annotate / Bug report / History / Environments / Evidence" 여러 단계가 한 페이지에 공존하기 때문이다. 다음 표로 섹션을 쪼개 각 섹션마다 대략의 키 수 / 우선순위를 측정한다. **PR 분할 기준은 아래 high-우선 영역 → medium → low 순으로 3~4개 PR로 나누는 것을 권장** (리스크 §8-1 참조).

| # | 실행 흐름 / UI 영역 | 대표 라인 | 대략 키 수 | 우선순위 (high/med/low) |
|---|-------------------|---------|-----------|-----------------------|
| 1 | **Page header** (Back link, Run 이름, 상태 뱃지 5종, Automated 뱃지, `Started {date} · N% completed · N test cases`) | 2921~2957 | ~15 | high |
| 2 | **Header action buttons** (Export / AI Summary NEW·HOBBY·stale / Focus Mode) | 2960~3016 | ~10 | high |
| 3 | **KPI 카드 5종** (Total Tests / Passed / Failed / Blocked / Untested) | 3020~3038 | 0 (기존 `common.*` + `runs.detail.kpi.*` 재사용) | high |
| 4 | **Execution Progress 카드** (진행률 바 · `Passed: N` title 툴팁 · legend 5종) | 3041~3116 | ~12 | high |
| 5 | **AI Run Summary Panel wrapper** (Phase 1 완료) + **Upgrade Nudge 카드** (Free tier 유도) | 3118~3209 | ~10 (Nudge만) | medium |
| 6 | **TC 목록 검색/필터 바** (Search placeholder, Status select 6 options, Priority select 5 options) | 3211~3246 | ~15 | high |
| 7 | **Bulk Action Toolbar** (선택 카운트 · Assign to select · Apply / Clear selection) | 3249~3285 | ~8 | medium |
| 8 | **SS Version Update Banner** (`New version available for N Shared Steps`, TC affected 카운트, Update all / Dismiss) | 3287~3316 | ~10 | medium |
| 9 | **Deprecated TC Info Banner** (`Some TCs in this run have been deprecated.`) | 3318~3328 | ~3 | low |
| 10 | **TC 목록 테이블 헤더 6종** (Checkbox / ID-Ver / Test Case / Priority / Folder / Assignee / Status) | 3340~3356 | ~7 | high |
| 11 | **TC 목록 row — 버전 뱃지 + 툴팁** (`TC v{M}.{m}`, `SS v{N}`, `New version: vN` title, `Locked: test result recorded`) | 3400~3449 | ~8 | medium |
| 12 | **TC 목록 empty state** (`테스트 케이스가 없습니다` + 설명) | 3364~3366 | ~2 | high |
| 13 | **Assignee 드롭다운** (`— Unassigned —`, 멤버 리스트) | 3507~3520 | ~2 | medium |
| 14 | **Folder 사이드바** (`Folders` 헤더 / `All Cases` / `접기`·`펼치기` title / `폴더 없음` empty) | 2834~2914 | ~6 | high |
| 15 | **우측 DetailPanel** (신규 키 없음 — prop fallback `'Test Run'` 만 교체) | 3541~3597 | ~1 | high |
| 16 | **Export Modal invocation** (신규 키 없음 — prop fallback `'Run'` 만 교체) | 3600~3621 | ~1 | medium |
| 17 | **Upgrade Modal** (Starter 플랜 유도 — 현재 **한국어 하드코딩**) | 3624~3667 | ~10 | high |
| 18 | **Jira Setup Modal** (현재 **한국어 하드코딩**) | 3669~3701 | ~5 | high |
| 19 | **Add Result Modal** — 헤더 / Status 5 버튼 / Note 에디터 툴바 / Steps 섹션 (Untested/Passed/Failed/Blocked select) / Shared step header badges (`Shared`, `New version: vN`, `Locked to preserve test results`, `Current (vN)`, `Latest (vN)`, `Version history unavailable`, `Loading...`) / Assign to / Linked Issues 섹션 (Create Jira/GitHub 버튼, placeholder, hint) / Attachments (Choose files, screenshot, drag/paste here, Uploading...) / Footer (Cancel / Add result) | 3703~4266 | **~80** | **high (최우선)** |
| 20 | **Add Issue (Jira) Modal** — 제목 / Summary·Description·Issue Type·Priority·Labels·Assignee·Components 필드 + placeholder + hint / Related Test Case / footer (Cancel / Create Issue / Creating...) | 4268~4424 | ~25 | high |
| 21 | **GitHub Issue Modal** — 제목 / Title·Description·Labels(chip)·Assignee(autocomplete) / `Will be created in {owner}/{repo}` / Related Test Case / footer | 4426~4585 | ~20 | high |
| 22 | **TC Version Diff Modal** — 헤더 (`Comparing v{a}.{b} → v{c}.{d}`) / 컬럼 헤더 (`v{} (current in run)` / `v{} (updated)`) / metadata 4종 (Title/Tags/Precondition/Description) / Steps 비교 / Expected Result 비교 / footer (Cancel / Update to v{}) | 4598~4754 | ~15 | medium |
| 23 | **Image Preview Modal** (파일명 캡션만) | 4756~4778 | ~1 | low |
| 24 | **ResultDetailModal (서브 컴포넌트, same file)** — 헤더 (`Test Result Details`) / CI/CD 뱃지 / Status / Elapsed Time / Note / Step Results / Attachments / Linked Issues / GitHub Issues / Close / `Unknown` fallback | 4796~5206 | ~15 | medium |
| 25 | **Toast 컨테이너 본체** (접근성 text만 있음 — neutral, 0 키) | 2810~2826 | 0 | — |
| 26 | **showToast 메시지 29건** (useEffect / handlers 전역에 흩어져 있음) — `runs.toast.*` 트리로 모음 | 전역 | ~30 | high |
| 27 | **throw new Error 2건** (`사용자 정보를 불러올 수 없습니다…`, `Run ID가 없습니다…`) | 1389, 1392 | ~2 | medium |
| 28 | **confirm() 1건** (`Jira 설정이 필요합니다. Settings 페이지로 이동하시겠습니까?`) | 4069 | ~1 | medium |
| 29 | **runName fallback & export header** (`'Test Run'`, `'Run'`, `Testably — Run Report`) — export PDF 내부 HTML 문자열 대부분은 `.i18nignore` 대상이지만 UI 노출용 fallback만 교체 | 2800, 3601, 624 | ~2 | medium |
| 30 | **AI/Status label 보조 라벨** (Header: `Completed / In Progress / Under Review / Paused / New`) | 2933~2945 | ~5 | high |

**합계 ≈ 280 leaf 키** (중복·재사용 제외 후) — §5-1 참조.

### 4-3. 네임스페이스 배치 전략

Phase 1 네임스페이스 규칙(design-spec §3·§4)을 그대로 계승한다:

| 대상 | 네임스페이스 | 키 prefix | 근거 |
|------|-------------|-----------|------|
| Page header / KPIs / Progress / SS banner / TC list header·row / Folder sidebar / Header action buttons | `runs` (기존 확장) | `runs.detail.page.*`, `runs.detail.kpi.*`, `runs.detail.progress.*`, `runs.detail.ssBanner.*`, `runs.detail.tcList.*`, `runs.detail.folderSidebar.*`, `runs.detail.headerActions.*` | 이미 `runs.aiSummary.*` 가 같은 페이지 서브 컴포넌트에 있으므로 일관성 유지. Phase 1의 `runs.ts` 구조와 동일 레벨. |
| Add Result Modal | `runs` | `runs.detail.addResult.*` (하위: `status.*`, `note.*`, `steps.*`, `assignee.*`, `issues.*`, `attachments.*`, `footer.*`) | 독립된 실행 흐름(execute + annotate + evidence + bug link) 이지만 결국 "Result 추가" 한 트랜잭션이므로 단일 서브트리로 묶음. |
| Create Jira Issue Modal | `runs` | `runs.detail.jiraIssue.*` | design-spec §3-1 `Jira` 는 브랜드명 유지. |
| Create GitHub Issue Modal | `runs` | `runs.detail.githubIssue.*` | 동일. |
| TC Version Diff Modal | `runs` | `runs.detail.tcDiff.*` | Shared Step Diff는 별도 `runs.detail.tcDiff.steps.*` / `runs.detail.tcDiff.expectedResult.*` / `runs.detail.tcDiff.metadata.*`. |
| Upgrade Modal (Starter 유도) | `runs` (플랜 안내이지만 **run 맥락 전용** — 다른 페이지의 Upgrade 모달과 DOM·copy 다름) | `runs.detail.upgradeModal.*` | 범용 `common.upgrade.*` 을 만들지 않는 이유: Phase 1 원칙(§4-6 "동일 문자열이라도 문맥이 다르면 별도 키")에 따라. |
| Jira Setup Modal | `runs` | `runs.detail.jiraSetup.*` | 동일. |
| Upgrade Nudge 카드 (Free tier inline) | `runs` | `runs.detail.upgradeNudge.*` | 모달과 별개 카드. |
| ResultDetailModal | `runs` | `runs.detail.resultDetail.*` | 서브 컴포넌트지만 같은 파일이므로 동일 ns. |
| Image Preview Modal | `runs` | `runs.detail.imagePreview.*` | 1~2 키뿐이지만 위치상 run-detail. |
| showToast 메시지 전역 | `runs` | `runs.toast.*` (Phase 1에는 `runs.aiSummary.toast.*` 만 있었음) | Phase 1의 `common.toast.*` 과는 별개. **Run 맥락 특화 toast** (result 저장 실패 · 스크린샷 미지원 등) 는 `runs.toast.*`. 일부 네트워크 범용 toast ("Failed to save") 는 `common.toast.*` 재사용. |
| throw new Error (유저 가시) 2건 | `runs` | `runs.detail.fatalError.userMissing`, `runs.detail.fatalError.runIdMissing` | Error message 도 i18n. `showToast` 로 표면화되므로 `runs.toast.*` 와 겹치지 않게 `fatalError.*`. |
| Header status 5 pills (Completed/In Progress/Under Review/Paused/New) | `runs` | `runs.detail.runStatus.completed|inProgress|underReview|paused|draft` | `common.*` 에는 존재하지 않음. Run entity status 는 run 네임스페이스. |
| 공통 상태 라벨 Pass/Fail/Blocked/Retest/Untested | **재사용** `common.*` (passed/failed/blocked/retest/untested) | 기존 Phase 0부터 정의되어 있으면 그대로. 없으면 Phase 2b 에서 `common.status.*` 보강. | 스캐너 clean 유지를 위해 Phase 1 `common` 파일을 먼저 확인(작업 전 grep). |
| Cancel / Save / Close / Back / Create / Update 등 범용 버튼 | **재사용** `common.*` (`common.cancel`, `common.close`, `common.back`, `common.save`, `common.create` 등) | 없으면 Phase 2b 에서 추가. |

> **신규 네임스페이스 생성 금지** — Phase 1 원칙 그대로. 전부 `runs` 또는 `common` 확장.

### 4-4. 특수 문자열 처리 가이드

#### 4-4-1. 상태 라벨 (Pass/Fail/Blocked/Retest/Untested)

이 파일 안에서 상태 라벨이 **최소 5군데**에 반복된다:

1. KPI 카드 label (line 3023~3026)
2. Progress legend label (line 3102~3106)
3. Progress bar title 툴팁 `` `Passed: ${n}` `` 등 (line 3068~3096)
4. Status filter select `<option>` (line 3229~3233)
5. Add Result modal status 버튼 (line 3726~3730)
6. Add Result / Edit 섹션 step select `<option>` (line 3852~3856, 3941~3944, 3998~4001)
7. ResultDetailModal `Step Results` status badge — `StatusBadge` 컴포넌트에 위임되지만, **Step Results select option** 은 이 파일 내부 하드코딩 가능.

**규칙:**
- 모든 5~6군데가 **동일 키**를 참조해야 한다 (AC-8). 권장: `common.status.passed|failed|blocked|retest|untested` (존재 확인 후 없으면 Phase 2b 에서 추가).
- "Status filter 전체" 의 `<option value="all">All Status</option>` 는 `runs.detail.tcList.filter.allStatus` 신규. 동일 패턴: `common.all` 재사용 가능하면 그쪽 우선.
- Progress bar 의 **title 템플릿** (`Passed: {{count}}` 등) 은 interpolation `{{count}}` 사용 → `runs.detail.progress.tooltipCount` + 상태별 prefix 를 `common.status.*` 재사용하여 조립:
  ```ts
  title={`${t('common:status.passed')}: ${passed}`}
  ```
  이 패턴은 design-spec §5-2 "관사/조사 주입은 i18next 가 처리 못 함" 원칙 아래 허용 (EN 은 콜론·공백이 고정, KO 도 `통과: 5` 형태로 자연스러움).

#### 4-4-2. 상대시간 / 절대날짜

- **Header 의 `Started ${new Date(run.created_at).toLocaleDateString('en-US', {month:'short', day:'numeric'})}`** (line 2954) 은 Phase 1에서 추가한 `src/lib/dateFormat.ts` 의 `formatShortDate(iso)` 로 교체. 노출 문자열은 `runs.detail.page.startedPrefix` + `{{date}}` interpolation.
  - EN: `Started {{date}}` / KO: `시작 {{date}}` (실제 카피는 Designer)
- **ResultDetailModal 의 `result.timestamp.toLocaleString('en-US', {...})`** (line 4846~4852) — 현재 `year: 'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit'` 로커 고정. 신규 헬퍼 `formatLongDateTime(iso, i18nLang)` 을 `src/lib/dateFormat.ts` 에 **추가**해 `i18n.language === 'ko' ? 'ko-KR' : 'en-US'` 로 로케일 동적 전환.
- **상대시간 (`relativeTime(iso)`)** 호출은 run-detail/page.tsx 에는 현재 **없음** (Activity feed 는 milestone-detail 담당). 신규 도입 불필요 — 헬퍼 재사용만 확인하고 인라인 조합 금지.

#### 4-4-3. 숫자 / 단위 / 퍼센트

- 진행률 % 표시 (`{Math.round(...)}%`): 언어 무관 동일. 번역 불필요.
- `{testCases.length} test cases` (line 2956) → plural 분리: `runs.detail.page.testCasesCount_one` / `_other`. EN `1 test case` / `{{count}} test cases`, KO `테스트 케이스 {{count}}건`.
- `{selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} selected` (line 3255~3256) → plural: `runs.detail.tcList.bulk.selected_one|_other`. **`selectedIds.size > 1 ? 's' : ''` 인라인 조건 제거** (i18next count 위임).
- `New version available for {n} Shared Step{n !== 1 ? 's' : ''}` (line 3297) → plural.
- `(N TC affected, N untested can be updated)` (line 3298) → 두 개의 plural + interpolation 조합.

#### 4-4-4. 키보드 단축키 힌트

- `title="Cmd+Shift+F"` (line 3010) — AC-12 에 따라 **단축키 자체는 영문 유지**. 다만 힌트가 존재할 경우 (예: Focus Mode 내부 UI — 본 스펙 외) 래핑 문장만 번역.
- Add Result 모달 내 Enter 키 힌트 `Jira 이슈 키를 입력하고 Enter를 누르세요 (예: PROJ-123)` (line 4113) → EN `Enter issue key and press Enter (e.g., PROJ-123)`, KO 그대로 유지. **`Enter` · `PROJ-123` 은 번역 대상이 아닌 고정 문자열** — 키 전체를 interpolation으로 빼지 말고 문장에 포함.

#### 4-4-5. Evidence / 첨부 제한 메시지

현재 이 파일은 **명시적 파일 크기·확장자 제한 안내 문구가 없음** (업로드 실패 시 `showToast('error', ...)` 에서 `error.message` 만 보여줌). 즉 "Max 10MB" / "PNG/JPG only" 문구는 **이번 스코프에 존재하지 않음** — Designer가 신규 제한 메시지를 추가하려는 경우 별도 디자인 스펙에서 요청.

단, 업로드 실패 toast 자체 (`` `Failed to upload file: ${error.message || 'Unknown error'}` ``, line 2294 / 2390) 는 interpolation:
- 키: `runs.toast.uploadFailed` = `Failed to upload file: {{reason}}` / `파일 업로드 실패: {{reason}}`
- `{{reason}}` = `error.message ?? t('common:unknownError')`

#### 4-4-6. Bug report 템플릿 플레이스홀더

Add Issue 모달의 `placeholder="Brief description of the issue"`, `placeholder="Detailed description of the issue"`, `placeholder="Enter labels separated by commas (e.g., bug, ui, critical)"` 등은 placeholder 키로 직접 번역. **실제 Jira/GitHub payload body** (line 2511~ / 2604~ / buildJiraDescription, buildGithubBody 영역)는 AC-9 pass-through — `.i18nignore` 의 기존 규칙(`/Root cause:/`, `/Detected by Testably/`, `/Generated by Testably/`, `/\[Bug\] /`) 으로 이미 보호됨. 본 스펙은 그 규칙을 유지·확장한다 (§4-5 참고).

#### 4-4-7. AI 생성 초안 본문

이 파일 안에서 AI 가 생성하는 버그 리포트 초안은 **없음** (AIRunSummaryPanel 내부로 이관됨). 따라서 본 스펙에서 추가로 고려할 AI 본문은 없다. AC-9 정책은 AIRunSummaryPanel 에서 이미 적용되어 있고, 본 파일에서 `onSummaryReady(s => setAiSummaryData(s))` 로 받아서 PDF HTML(`buildPdfHtmlForAi`) 에 끼워넣는 부분은 `.i18nignore` 의 `/## AI Run Summary/` 등 규칙으로 이미 제외 상태 — 유지.

#### 4-4-8. 실시간 동기 영역 (타이머 / 진행률)

- `elapsedSeconds` 기반 타이머 — MM:SS 포맷(`formatTimer(seconds)` 헬퍼가 있다면 재사용). 숫자 포맷만 사용하므로 **번역 불필요**. 라벨 "Elapsed Time" 만 번역.
- `placeholder="00:00"` (line 4042) — 숫자 포맷이라 번역 대상이 아니지만, **스캐너 false-positive** 가능. `.i18nignore` 에 `>00:00</` 또는 `placeholder="00:00"` 예외 추가.

### 4-5. `.i18nignore` 변경

**제거 (Phase 2b):**
```
src/pages/run-detail/page.tsx
```

**유지 (Phase 1에서 추가된 AC-9 보호 규칙):**
- `/\[AI Summary\]/`
- `/\[Bug\] /`
- `/\[Re-run\]/`
- `/Root cause:/`
- `/AI-detected failure cluster/`
- `/Detected by Testably/`
- `/## AI Run Summary/`, `/### Executive Summary/`, `/### Failure Patterns/`, `/### Recommendations/`, `/### Key Metrics/`, `/### Go\/No-Go/`
- `/Generated by Testably/`
- `>HIGH RISK<`, `>MEDIUM RISK<`, `>LOW RISK<`, `>GO<`, `>NO-GO<`

**추가 (본 스펙):**
- `/Total<|>Passed<|>Failed<|>Blocked<|>Retest<|>Untested</` 가 **PDF export HTML 문자열** (line 593~598) 에 있음 — 이 부분은 외부 송출용 고정 영문이라 AC-9 원칙에 따라 무시. `.i18nignore` 에 아래 규칙 추가:
  ```
  # run-detail PDF export HTML cells (external output, locked EN)
  /"stat-label">Total</
  /"stat-label">Passed</
  /"stat-label">Failed</
  /"stat-label">Blocked</
  /"stat-label">Retest</
  /"stat-label">Untested</
  /<span>Testably — Run Report<\/span>/
  /<th>Test Case<\/th>/
  /<th style="width:.*?">Priority<\/th>/
  /<th style="width:.*?">Folder<\/th>/
  /<th style="width:.*?">Assignee<\/th>/
  /<th style="width:.*?">Status<\/th>/
  /Exported \$\{/
  /Started \$\{/
  /Metric<\/th>/
  /Value<\/th>/
  ```
- **타이머 placeholder:**
  ```
  placeholder="00:00"
  ```
- **영문 `Enter issue key (e.g., PROJ-123)` placeholder 는 i18n 처리** (§4-4-4) — ignore 하지 않음. 다만 내부 키 `PROJ-123` 은 예시 코드라 번역문 안에 그대로 노출.

### 4-6. 동작 흐름 (Flow)

**정상 흐름 (개발자 관점):**
1. 개발자가 `src/pages/run-detail/page.tsx` 의 §4-2 표 섹션 1(Page header)부터 순차 작업.
2. 각 하드코딩 문자열 → `t('runs:detail.page.xxx')` 로 교체 (이미 `const { t } = useTranslation(['common'])` 가 있으므로 `useTranslation(['common', 'runs'])` 로 확장).
3. `src/i18n/local/en/runs.ts` 의 `runs.detail.*` 서브트리에 키 추가, `src/i18n/local/ko/runs.ts` 에 동일 구조로 한국어 추가.
4. `npm run scan:i18n -- src/pages/run-detail/page.tsx` 로 **해당 파일만 매치** 확인 (Phase 2b 임시 패치 지원 위해 필요시 스캐너에 단일 파일 옵션 활용).
5. 섹션 1 통과 → 섹션 2 → … → 섹션 30 (§4-2 표 순서).
6. 모든 섹션 끝난 후 `.i18nignore` 에서 `src/pages/run-detail/page.tsx` 제거 → 전역 `npm run scan:i18n` 이 0건.
7. `npm run scan:i18n:parity` 통과 확인.
8. `npm run test -- --run` / `npm run build` 전체 PASS.

**대안 흐름:**
- PR 분할 권장 (§8-1): `PR-A` = 섹션 1~15 (주 레이아웃 + TC 목록) / `PR-B` = 섹션 16~22 (모달 집합) / `PR-C` = 섹션 23~30 (toast · fatal error · edge). 각 PR 머지 후에도 `.i18nignore` 의 해당 파일 제외선은 **PR-C 머지 시점에 제거** — 그 전까지 부분 커밋 상태에서 스캐너가 오탐하지 않도록 유지.

**에러 흐름:**
- 키 이름 충돌: `runs.detail.addResult.status.passed` 와 `common.status.passed` 가 모두 존재 가능. 본 파일에서는 **`common.status.passed` 재사용** (AC-7·8). 실수로 `runs.detail.*` 하위에 중복 키를 만들면 `scan:i18n:parity` 는 통과하지만 DRY 원칙 위반 → 코드 리뷰로 차단.
- ResultDetailModal 은 동일 파일 내 서브 컴포넌트이지만 별도 함수. `useTranslation` 을 그 안에서도 따로 호출(이미 Phase 1 패턴 확립 — 예: `AIRunSummaryPanel.tsx` 내부 `const { t } = useTranslation(['runs','common'])`).

### 4-7. 권한 (RBAC)

| 역할 | 영향 |
|------|------|
| Owner / Admin / Manager / Tester / Viewer / Guest | 모두 동일하게 번역 결과만 받는다. **RBAC 변경 없음.** Phase 1과 동일. |

### 4-8. 플랜별 제한

| 플랜 | 제한 | 비고 |
|------|------|------|
| Free / Hobby / Starter / Pro / Enterprise | 번역 기능은 동일 | 단 Upgrade Modal / Upgrade Nudge 안의 플랜 이름(`Starter`, `Hobby`, `Professional`) 은 **고유명사로 번역하지 않고 그대로 노출** (Phase 1 design-spec §3-1 재확인). 가격 표기(`$19/mo`) 는 이번 스펙에서 **번역 대상 제외** — 기존대로 영문 `$` prefix 유지. (통화 현지화는 별도 티켓 f014 후보.) |

---

## 5. 데이터 설계

**변경 없음.** 순수 프론트엔드 텍스트 리팩토링.

### 신규 키 볼륨 추정

| 서브트리 | 대략 키 수 (leaf) |
|---------|-----------------|
| `runs.detail.page.*` | ~15 |
| `runs.detail.headerActions.*` | ~10 |
| `runs.detail.runStatus.*` | ~5 |
| `runs.detail.kpi.*` (대부분 기존 `common.*` 재사용, 보강만) | ~2 |
| `runs.detail.progress.*` | ~8 |
| `runs.detail.folderSidebar.*` | ~6 |
| `runs.detail.tcList.*` (filter + header + row + empty + bulk) | ~25 |
| `runs.detail.ssBanner.*` | ~10 |
| `runs.detail.deprecatedBanner.*` | ~3 |
| `runs.detail.addResult.*` (status / note / steps / assignee / issues / attachments / footer) | **~80** |
| `runs.detail.jiraIssue.*` | ~25 |
| `runs.detail.githubIssue.*` | ~20 |
| `runs.detail.tcDiff.*` | ~15 |
| `runs.detail.upgradeModal.*` | ~10 |
| `runs.detail.upgradeNudge.*` | ~5 |
| `runs.detail.jiraSetup.*` | ~5 |
| `runs.detail.resultDetail.*` | ~15 |
| `runs.detail.imagePreview.*` | ~1 |
| `runs.detail.fatalError.*` | ~2 |
| `runs.toast.*` (신규 서브트리) | ~30 |
| `common.*` 보강 (status.retest 등 누락 발견 시) | ~5 |
| **합계** | **~292 leaf** (en + ko 합산 ≈ 584 라인) |

AC-10 범위 (300 ± 50) 내에 들어옴.

---

## 6. API 설계

**변경 없음.** Supabase Edge Function / REST 호출은 현상 유지.

단, `showToast('error', error?.message || ...)` 패턴 — **서버가 내려주는 `error.message` 가 영문 고정**인 경우 현재처럼 그대로 노출한다. (Phase 1 §6 정책 계승: 백엔드는 에러 코드를 반환하고 프론트가 번역하는 것이 이상적이나, 이번 스펙은 **서버 응답 텍스트 번역은 범위 외** — §9 Out of Scope.)

fallback 처리:
```ts
showToast('error', error?.message || t('runs:toast.resultSaveFailed'));
```
→ 서버 응답이 있으면 그것을(영문이라도), 없으면 번역 키.

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일
없음. (Phase 1에서 만든 `scripts/scan-i18n.mjs`, `src/lib/dateFormat.ts`, `src/lib/formatRelativeTime.ts` 를 그대로 재사용)

### 수정 파일

| 파일 | 주요 변경 |
|------|---------|
| `src/pages/run-detail/page.tsx` | §4-2 전 30개 섹션 하드코딩 교체. `useTranslation(['common'])` → `useTranslation(['common', 'runs'])`. ResultDetailModal 함수 내부에도 `useTranslation(['common','runs'])` 추가. |
| `src/i18n/local/en/runs.ts` | `runs.detail.*` 서브트리 신규 (~260 키) + `runs.toast.*` 서브트리 신규 (~30 키). |
| `src/i18n/local/ko/runs.ts` | 위와 동일 구조 한국어 번역. |
| `src/i18n/local/en/common.ts` | 누락된 상태 라벨 (passed/failed/blocked/retest/untested) · 버튼 라벨 (cancel/close/save/back/apply/create/update/clear/loading) 보강 (~5 키). 작업 전 grep으로 기존 키 존재 여부 확인 후 중복 금지. |
| `src/i18n/local/ko/common.ts` | 위와 동일. |
| `src/lib/dateFormat.ts` | `formatLongDateTime(iso: string, language: string): string` 신규 추가 (ResultDetailModal line 4846~4852 용). 기존 `formatShortDate(iso)` 와 동일 패턴. |
| `.i18nignore` | `src/pages/run-detail/page.tsx` 제거 + §4-5 의 PDF export HTML / 타이머 placeholder 예외 규칙 추가. |

### 영향 받지만 **수정 금지** 파일

| 파일 | 사유 |
|------|------|
| `src/pages/run-detail/components/AIRunSummaryPanel.tsx` | Phase 1 완료 |
| `src/pages/plan-detail/page.tsx` | Phase 2a 병행 — 본 스펙에서 건드리지 않음 |
| `src/components/DetailPanel.tsx` | 공유 컴포넌트 — Phase 3 공유 Epic |
| `src/components/FocusMode.tsx` | 공유 |
| `src/components/ExportModal.tsx` | 공유 |
| `src/components/StatusBadge.tsx` | 공유 |
| `src/components/Avatar.tsx` | 공유 |
| `src/components/ProjectHeader.tsx` | 공유 |
| `src/lib/expandSharedSteps.ts`, `src/types/shared-steps.ts` | 텍스트 없음 |
| `scripts/scan-i18n.mjs` | Phase 1 구현 유지 |

### 공유 파일 충돌 주의 (Phase 2a 와 병행 작업 시)

| 파일 | 위험 | 대응 |
|------|------|------|
| `src/i18n/local/{en,ko}/runs.ts` | Phase 2a(plan-detail)가 `runs.detail.*` 에 키를 추가할 가능성 ↓ (plan-detail은 `plans` 또는 별개 네임스페이스 쓸 가능성이 높음). 그래도 공통 파일 머지 충돌 가능. | Phase 2a 플래너가 쓰는 네임스페이스 먼저 확인. 본 스펙은 `runs.detail.*` / `runs.toast.*` 만 확장. |
| `src/i18n/local/{en,ko}/common.ts` | 양 스펙 모두 `common.status.*` / `common.*` 버튼 라벨 보강 가능. | **선 머지된 PR 기준으로 후속 PR이 rebase** — 보강 시 기존 키가 있으면 재사용, 없을 때만 추가. |
| `.i18nignore` | 양쪽이 모두 해당 파일을 제거 대상으로 삼음. | 충돌 없음 (서로 다른 라인). |

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| `ko` 로 Add Result 열고, 네트워크 끊김 | `showToast('error', t('runs:toast.resultSaveFailed'))` 로 한국어 노출. 모달은 열린 상태 유지 (현재 동작 그대로). |
| 같은 TC에 대해 2명이 동시 Add Result | 서버에서 충돌 처리 (현재 last-write-wins). UI 메시지만 번역. |
| TC 목록 empty 상태 (Run에 TC 0개) | `runs.detail.tcList.empty.title` + `.hint` 로 교체. 현재 한국어 하드코딩 → EN 로케일에서 영어로 복구 (AC-11). |
| Folder 사이드바에 폴더 0개 | `runs.detail.folderSidebar.empty` = `폴더 없음` / `No folders`. 현재 한국어 하드코딩 → 복구. |
| KO 사용자가 Jira 설정 없이 Create Jira 클릭 | `runs.detail.jiraSetup.*` 모달 한국어 노출. 기존 하드코딩 한국어와 결과 동일하나 EN 로케일에서도 동작. |
| Upgrade Modal 열림 (Free 사용자가 Create Jira 클릭) | `runs.detail.upgradeModal.*` 로 노출. 기존 한국어 하드코딩 → EN 로케일 회귀 복구. |
| 스크린샷 API 미지원 브라우저 | `showToast('error', t('runs:toast.screenshotUnsupported'))`. 현재 한국어 하드코딩 → 복구. |
| 한국어에서 문자열 길이 1.5배 증가하는 case | design-spec §1-1 checkpoint 표에 따라 대부분 단축됨. 예외: "Summary는 필수 항목입니다." → "Summary is required." — 한국어가 약간 짧음. 모달 푸터 폭 영향 없음. |
| `count = 0` 인 plural (예: `0 items selected`) | i18next `_other` 해석. EN `0 items selected` / KO `0개 선택됨` — 자연스러움. |
| i18next missingKey 경고 | Phase 1 AC-5 fallback 동작 그대로. `npm run test` / e2e 에서 console.warn 수집하여 CI 차단. |
| 긴 Run 이름 (100자 이상) | interpolation `{{runName}}` 가 받는 값이므로 번역 자체는 무관. 기존 CSS `truncate` 유지. |
| Add Result 에서 Cmd+Enter 제출 단축키 | 기능 변경 없음. 툴팁 텍스트가 있다면 AC-12 에 따라 단축키 영문 유지 + 설명만 번역. |
| 타이머 `00:00` placeholder | `.i18nignore` 예외 등록되므로 스캐너 통과. 런타임 번역 불필요. |
| Jira `PROJ-123` 예시 placeholder | 번역문 안에 `PROJ-123` 그대로 포함 (번역 대상 아님). |
| 한국어 조사 문제 (`{n} 실행` vs `{n}개 실행`) | design-spec §5-2 원칙 — 조사 생략 또는 단위 뒤로 빼기. Designer 가 §5 카피 표에서 확정. |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **`src/pages/plan-detail/page.tsx`** — Phase 2a 스펙.
- [ ] **공유 컴포넌트** (`DetailPanel` / `FocusMode` / `ExportModal` / `StatusBadge` / `Avatar` / `ProjectHeader` / `LogoMark` / `ErrorBoundary`) — Phase 3 공유 컴포넌트 Epic.
- [ ] **Edge Function 에러 메시지 번역** — 서버가 영문 고정. 프론트가 `error.message` 가 있으면 그대로, 없으면 번역 키 사용(§6).
- [ ] **Jira / GitHub payload 본문 번역** — AC-9 정책. `.i18nignore` 기존 규칙 유지.
- [ ] **PDF Export HTML 내부 라벨** (buildPdfHtml …) — 외부 송출용 고정 영문. `.i18nignore` 확장 (§4-5).
- [ ] **AI 생성 요약 본문 (`aiSummaryData.summary.narrative` 등)** — AC-9 pass-through.
- [ ] **Claude 프롬프트 locale 힌트 주입** — 별도 티켓 f013.
- [ ] **통화 현지화 (`$19/mo` → `₩25,000/월`)** — 별도 티켓 f014 후보. 플랜 이름은 고유명사 유지.
- [ ] **Run 이름 / TC 제목 / 유저 이름 / 폴더 이름** 등 **유저 입력 데이터** — 번역 대상 아님.
- [ ] **Export 버튼으로 생성되는 CSV/Excel 헤더 라벨** — 외부 파일 포맷 표준화 별도 티켓.
- [ ] **Slack / Email 전송 본문 템플릿** — 외부 송출 고정 영문.
- [ ] **E2E 테스트 추가** — Phase 1 M-2 (f010-followup-2) 티켓에서 다룸. 본 스펙은 유닛 테스트 `npm run test` 통과와 스캐너 통과만 요구.
- [ ] **기존 Phase 1 키 리네임 / 정리** (`common.ts` 중복 키 cleanup 등) — Phase 1 QA N-2, Phase 1 followup에서 처리.

---

## 10. i18n 키 (구조 샘플 — 실제 EN/KO 카피는 Design Spec에서)

> 본 스펙은 **키 구조만** 정의한다. 실제 EN/KO 문자열은 `docs/specs/design-spec-i18n-coverage-phase2-run-detail.md` (Designer 작성)에서 Phase 1 디자인 명세와 동일한 표 포맷으로 제공된다.

### `runs.detail.page.*` (Page header)
```
runs.detail.page.backToRuns
runs.detail.page.startedPrefix           // "Started {{date}}"
runs.detail.page.percentCompletedSuffix  // "{{percent}}% completed"
runs.detail.page.testCasesCount_one      // plural
runs.detail.page.testCasesCount_other
runs.detail.page.automatedBadge
runs.detail.page.runNameFallback         // "Test Run" (focus mode fallback)
```

### `runs.detail.runStatus.*`
```
runs.detail.runStatus.completed
runs.detail.runStatus.inProgress
runs.detail.runStatus.underReview
runs.detail.runStatus.paused
runs.detail.runStatus.draft              // "New"
```

### `runs.detail.headerActions.*`
```
runs.detail.headerActions.export
runs.detail.headerActions.exportTooltip
runs.detail.headerActions.aiSummary
runs.detail.headerActions.aiSummaryLockedBadge    // "HOBBY"
runs.detail.headerActions.aiSummaryNewBadge       // "NEW"
runs.detail.headerActions.focusMode
runs.detail.headerActions.focusModeTooltip        // "Cmd+Shift+F" (단축키 영문 고정 + 라벨만 번역)
```

### `runs.detail.kpi.*` (대부분 재사용, 소수 신규)
```
runs.detail.kpi.totalTests
// Passed/Failed/Blocked/Untested/Retest → common.status.* 재사용
```

### `runs.detail.progress.*`
```
runs.detail.progress.title                 // "Execution Progress"
runs.detail.progress.tooltipPassed         // "Passed: {{count}}" (common.status.passed 재사용 + ": {n}")
runs.detail.progress.tooltipFailed
runs.detail.progress.tooltipBlocked
runs.detail.progress.tooltipRetest
runs.detail.progress.tooltipUntested
```

### `runs.detail.folderSidebar.*`
```
runs.detail.folderSidebar.title
runs.detail.folderSidebar.allCases
runs.detail.folderSidebar.collapseTooltip  // "접기" / "Collapse"
runs.detail.folderSidebar.expandTooltip    // "펼치기" / "Expand"
runs.detail.folderSidebar.empty            // "폴더 없음" / "No folders"
```

### `runs.detail.tcList.*`
```
runs.detail.tcList.searchPlaceholder
runs.detail.tcList.filter.allStatus
runs.detail.tcList.filter.allPriority
runs.detail.tcList.header.id
runs.detail.tcList.header.testCase
runs.detail.tcList.header.priority
runs.detail.tcList.header.folder
runs.detail.tcList.header.assignee
runs.detail.tcList.header.status
runs.detail.tcList.empty.title
runs.detail.tcList.empty.hint
runs.detail.tcList.assigneeDropdown.unassigned    // "— Unassigned —"
runs.detail.tcList.bulk.selected_one              // "{{count}} item selected"
runs.detail.tcList.bulk.selected_other
runs.detail.tcList.bulk.assignToLabel
runs.detail.tcList.bulk.unassigned                // "Unassigned" option
runs.detail.tcList.bulk.applyButton
runs.detail.tcList.bulk.clearButton
runs.detail.tcList.versionBadge.tcUpdated         // "TC updated to v{{major}}.{{minor}} — click to review changes"
runs.detail.tcList.versionBadge.locked            // "Locked: test result recorded"
runs.detail.tcList.versionBadge.ssUpdateAvailable // "Shared step update available (v{{version}})"
runs.detail.tcList.priority.critical
runs.detail.tcList.priority.high
runs.detail.tcList.priority.medium
runs.detail.tcList.priority.low
// priority 는 common 에 있으면 재사용
```

### `runs.detail.ssBanner.*`
```
runs.detail.ssBanner.headline_one                 // "New version available for 1 Shared Step"
runs.detail.ssBanner.headline_other
runs.detail.ssBanner.tcAffected_one               // "({{count}} TC affected"
runs.detail.ssBanner.tcAffected_other
runs.detail.ssBanner.untestedUpdatable_one        // ", {{count}} untested can be updated"
runs.detail.ssBanner.untestedUpdatable_other
runs.detail.ssBanner.updateAll
runs.detail.ssBanner.dismiss
```

### `runs.detail.deprecatedBanner.*`
```
runs.detail.deprecatedBanner.title
runs.detail.deprecatedBanner.body
```

### `runs.detail.addResult.*` (가장 큰 서브트리 — ~80 키)
```
runs.detail.addResult.title                    // "Add result"
runs.detail.addResult.status.label
runs.detail.addResult.status.required
// status.passed/failed/blocked/retest/untested → common.status.* 재사용
runs.detail.addResult.note.label
runs.detail.addResult.note.toolbar.*           // bold/italic/underline 등 aria-label (리본 아이콘)
runs.detail.addResult.steps.label
runs.detail.addResult.steps.sharedBadge        // "Shared"
runs.detail.addResult.steps.sharedUpdateBadge  // "New version: v{{version}}"
runs.detail.addResult.steps.sharedLockedBadge  // "Locked: test result recorded"
runs.detail.addResult.steps.lockedBanner       // "Locked to preserve test results"
runs.detail.addResult.steps.updateButton       // "Update"
runs.detail.addResult.steps.diffCurrent        // "Current (v{{version}})"
runs.detail.addResult.steps.diffLatest         // "Latest (v{{version}})"
runs.detail.addResult.steps.diffUnavailable    // "Version history unavailable"
runs.detail.addResult.steps.diffLoading        // "Loading..."
runs.detail.addResult.steps.expectedResultHint
runs.detail.addResult.elapsed.label            // "Elapsed time"
runs.detail.addResult.elapsed.placeholder      // "00:00" (ignore 처리)
runs.detail.addResult.assignee.label           // "Assign to"
runs.detail.addResult.assignee.placeholder     // "Select assignee"
runs.detail.addResult.assignee.hint            // "Leave empty to keep current assignment."
runs.detail.addResult.issues.label             // "Linked Issues"
runs.detail.addResult.issues.createJira
runs.detail.addResult.issues.createGithub
runs.detail.addResult.issues.placeholder       // "Enter issue key (e.g., PROJ-123)"
runs.detail.addResult.issues.hint              // "Enter a Jira issue key and press Enter (e.g., PROJ-123)"
runs.detail.addResult.issues.confirmJiraSetup  // "Jira settings required. Go to Settings?"
runs.detail.addResult.attachments.label
runs.detail.addResult.attachments.chooseFiles
runs.detail.addResult.attachments.or
runs.detail.addResult.attachments.screenshot
runs.detail.addResult.attachments.dropzoneHint // "or drag/paste here"
runs.detail.addResult.attachments.uploading
runs.detail.addResult.footer.cancel            // common.cancel 재사용 검토
runs.detail.addResult.footer.submit            // "Add result"
```

### `runs.detail.jiraIssue.*` (Create Jira modal)
```
runs.detail.jiraIssue.title                    // "Create Jira Issue"
runs.detail.jiraIssue.summary.label
runs.detail.jiraIssue.summary.placeholder
runs.detail.jiraIssue.summary.required
runs.detail.jiraIssue.description.label
runs.detail.jiraIssue.description.placeholder
runs.detail.jiraIssue.issueType.label
runs.detail.jiraIssue.issueType.option.bug
runs.detail.jiraIssue.issueType.option.task
runs.detail.jiraIssue.issueType.option.story
runs.detail.jiraIssue.issueType.option.epic
runs.detail.jiraIssue.priority.label
runs.detail.jiraIssue.priority.option.highest
runs.detail.jiraIssue.priority.option.high
runs.detail.jiraIssue.priority.option.medium
runs.detail.jiraIssue.priority.option.low
runs.detail.jiraIssue.priority.option.lowest
runs.detail.jiraIssue.labels.label
runs.detail.jiraIssue.labels.placeholder
runs.detail.jiraIssue.labels.hint
runs.detail.jiraIssue.assignee.label
runs.detail.jiraIssue.assignee.placeholder
runs.detail.jiraIssue.assignee.hint
runs.detail.jiraIssue.components.label
runs.detail.jiraIssue.components.placeholder
runs.detail.jiraIssue.components.hint
runs.detail.jiraIssue.relatedTc                // "Related Test Case"
runs.detail.jiraIssue.footer.cancel
runs.detail.jiraIssue.footer.submit            // "Create Issue"
runs.detail.jiraIssue.footer.creating          // "Creating..."
```

### `runs.detail.githubIssue.*` (Create GitHub modal)
```
runs.detail.githubIssue.title
runs.detail.githubIssue.title.label
runs.detail.githubIssue.title.placeholder
runs.detail.githubIssue.body.label
runs.detail.githubIssue.body.placeholder
runs.detail.githubIssue.labels.label
runs.detail.githubIssue.labels.placeholder
runs.detail.githubIssue.assignee.label
runs.detail.githubIssue.assignee.placeholder
runs.detail.githubIssue.willBeCreatedIn        // "Will be created in {{repo}}"
runs.detail.githubIssue.relatedTc
runs.detail.githubIssue.footer.cancel
runs.detail.githubIssue.footer.submit
runs.detail.githubIssue.footer.creating
```

### `runs.detail.tcDiff.*`
```
runs.detail.tcDiff.subtitleCompare             // "Comparing v{{from}} → v{{to}}"
runs.detail.tcDiff.columnHeader.current        // "v{{version}} (current in run)"
runs.detail.tcDiff.columnHeader.updated        // "v{{version}} (updated)"
runs.detail.tcDiff.metadata.title
runs.detail.tcDiff.metadata.tags
runs.detail.tcDiff.metadata.precondition
runs.detail.tcDiff.metadata.description
runs.detail.tcDiff.steps.sectionTitle
runs.detail.tcDiff.expectedResult.sectionTitle
runs.detail.tcDiff.loading                     // "Loading…"
runs.detail.tcDiff.footer.cancel
runs.detail.tcDiff.footer.update               // "Update to v{{version}}"
```

### `runs.detail.upgradeModal.*`
```
runs.detail.upgradeModal.title                 // "Starter plan required"
runs.detail.upgradeModal.body                  // interpolation
runs.detail.upgradeModal.benefitsTitle         // "Starter benefits"
runs.detail.upgradeModal.benefit.projects
runs.detail.upgradeModal.benefit.members
runs.detail.upgradeModal.benefit.jira
runs.detail.upgradeModal.benefit.reporting
runs.detail.upgradeModal.benefit.exportImport
runs.detail.upgradeModal.footer.close          // "Close"
runs.detail.upgradeModal.footer.upgrade        // "Upgrade plan"
```

### `runs.detail.upgradeNudge.*`
```
runs.detail.upgradeNudge.title                 // "AI Run Summary"
runs.detail.upgradeNudge.body
runs.detail.upgradeNudge.cta                   // "Upgrade to Hobby — $19/mo" (Hobby/$19 변수로 분리)
runs.detail.upgradeNudge.subtitle              // "15 AI credits/month · AI Run Summary included"
```

### `runs.detail.jiraSetup.*`
```
runs.detail.jiraSetup.title                    // "Jira integration required"
runs.detail.jiraSetup.body
runs.detail.jiraSetup.footer.close
runs.detail.jiraSetup.footer.connect           // "Connect Jira"
```

### `runs.detail.resultDetail.*`
```
runs.detail.resultDetail.title                 // "Test Result Details"
runs.detail.resultDetail.unknownAuthor
runs.detail.resultDetail.cicdBadge             // "CI/CD"
runs.detail.resultDetail.status.label
runs.detail.resultDetail.elapsed.label
runs.detail.resultDetail.note.label
runs.detail.resultDetail.stepResults.label
runs.detail.resultDetail.stepResults.stepFallback  // "Step {{index}}"
runs.detail.resultDetail.attachments.label     // "Attachments ({{count}})"
runs.detail.resultDetail.linkedIssues          // "Linked Issues"
runs.detail.resultDetail.githubIssues          // "GitHub Issues"
runs.detail.resultDetail.close                 // common.close 재사용
```

### `runs.detail.imagePreview.*`
```
runs.detail.imagePreview.closeA11y             // aria-label
```

### `runs.detail.fatalError.*`
```
runs.detail.fatalError.userMissing             // "Failed to load user. Please refresh."
runs.detail.fatalError.runIdMissing            // "Run ID not found. Please check the URL."
```

### `runs.toast.*` (신규 서브트리)
```
runs.toast.commentSaveFailed
runs.toast.commentDeleteFailed
runs.toast.jiraAutoCreated            // "Jira issue {{key}} created automatically"
runs.toast.jiraAutoCreateFailed
runs.toast.githubAutoCreated          // "GitHub issue #{{number}} created automatically"
runs.toast.githubAutoCreateFailed
runs.toast.statusUpdateFailed
runs.toast.addResultFirstThenLink
runs.toast.runIdNotFound
runs.toast.resultSaveFailed
runs.toast.ssVersionUpdated           // "Shared Step '{{name}}' updated to v{{version}}"
runs.toast.ssVersionUpdateFailed
runs.toast.tcVersionUpdated           // "TC updated to v{{major}}.{{minor}}"
runs.toast.tcVersionUpdateFailed
runs.toast.uploadFailed               // "Failed to upload file: {{reason}}"
runs.toast.screenshotUnsupported
runs.toast.screenshotUploadFailed
runs.toast.screenshotCaptureFailed
runs.toast.summaryRequired
runs.toast.jiraCreated                // "Jira issue {{key}} created"
runs.toast.jiraCreatedAddResult       // "Jira issue {{key}} created. Log a result via Add Result to link automatically."
runs.toast.jiraCreateFailed           // "Failed to create Jira issue: {{reason}}"
runs.toast.githubCreated              // "GitHub issue #{{number}} created"
runs.toast.githubCreateFailed
```

### `common.*` 보강 (기존 존재 확인 후 없는 것만)
```
common.status.passed
common.status.failed
common.status.blocked
common.status.retest
common.status.untested
common.cancel
common.close
common.save
common.back
common.apply
common.create
common.update
common.loading
common.unknownError
```

> **Actual EN/KO strings → Designer.** 본 스펙은 구조만 확정.

---

## 11. 리스크

| 리스크 | 영향 | 완화 |
|-------|------|-----|
| **5,245줄 단일 파일의 diff 리뷰 난이도** | 큼 | **PR을 3개로 분할 권장** (§4-6 대안 흐름): PR-A = 섹션 1~15, PR-B = 16~22, PR-C = 23~30. 각 PR은 `.i18nignore` 에 그 파일 등재를 유지한 채 키 추가 + 교체를 부분 반영하고, 마지막 PR-C 가 `.i18nignore` 에서 라인 제거. CI 는 PR-C 에서 처음으로 스캐너가 해당 파일을 보게 됨. |
| **키 네임 충돌 / 중복** (`common.status.passed` vs `runs.detail.addResult.status.passed`) | 미디엄 | AC-7·8로 **재사용 우선 원칙** 명문화. PR 리뷰 체크리스트 포함. |
| **한국어 리터럴 → EN 로케일 회귀** | 미디엄 (AC-11) | 작업 전 `grep -P '[가-힣]' src/pages/run-detail/page.tsx` 로 전체 목록화 → §4-2 표의 "한국어 하드코딩 ~22" 항목 전수 교체. |
| **외부 송출 문자열 오번역** (PDF HTML / Jira payload / GitHub body) | 미디엄 | `.i18nignore` 확장 (§4-5) + AC-9 재확인. 리뷰 시 `buildPdfHtml*` / `buildJira*` / `buildGithub*` 함수는 **번역 키 진입 금지** 주석 남기기. |
| **단축키 힌트 번역으로 UX 훼손** | 로우 | AC-12 명시: `Cmd+Shift+F`, `Enter`, `PROJ-123` 등 기호는 번역 대상 아님. 래핑 문장만 번역. |
| **타이머 `00:00` placeholder가 스캐너 false-positive** | 로우 | `.i18nignore` 예외 추가 (§4-5). |
| **ResultDetailModal 내부에 `useTranslation` 추가 시 re-render 폭증** | 로우 | i18next는 resource 가 정적이라 re-render 영향 미미. Phase 1 AIRunSummaryPanel 에서 검증됨. |
| **Phase 2a(plan-detail)와 `common.ts` 머지 충돌** | 미디엄 | 병행 작업 룰 (§7 공유 파일 충돌 주의): 선 머지된 PR 기준으로 rebase, 기존 키 재사용. |
| **기존 일부 `t(...)` 호출이 `useTranslation(['common'])` 만 쓰고 있어 `runs:` prefix 미적용** | 로우 | `useTranslation(['common', 'runs'])` 로 확장. Phase 1 `AIRunSummaryPanel` 도 `['runs','common']` 쓰므로 동일 패턴. |
| **번역 품질 (QA 엔지니어 대상 전문용어)** | 미디엄 | design-spec §3-2 고정 번역 표 그대로 계승. Designer 단계에서 한국어 원어민 리뷰 1회. "Shared step" → "공유 스텝" / "공유 단계" 중 기존 번들 따르기. |
| **키 수 초과 (AC-10 범위)** | 로우 | §5 추정이 292로 범위 내. 초과 시 `runs.detail.addResult.note.toolbar.*` 같은 aria-label 을 축약 서브트리로 통합. |
| **기존 `common.close`/`common.cancel` 등 누락 시 부수 PR 필요** | 로우 | 작업 전 grep 으로 확인. 누락이면 `common.ts` 에 먼저 추가. 이 부분은 Phase 1 QA N-2 와 겹칠 수 있으니 일괄 정리 PR 가능. |

---

## 12. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1~AC-12)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (N/A — 프론트 전용)
- [x] RLS 정책이 정의되었는가 (N/A)
- [x] 플랜별 제한이 명시되었는가 (§4-8: 모든 플랜 동일, 플랜 이름은 고유명사)
- [x] RBAC 권한 매트릭스가 있는가 (§4-7: 영향 없음)
- [x] 변경 파일 목록이 구체적인가 (§7, 실제 경로)
- [x] 엣지 케이스가 식별되었는가 (§8, 13건)
- [x] Out of Scope이 명시되었는가 (§9, 12건)
- [x] i18n 키 구조가 en/ko 양쪽에 추가될 예정인가 (§10, 20개 서브트리)
- [ ] **관련 디자인 명세(Design Spec Phase 2b)가 Approved 상태인가 — 본 스펙 머지 후 Designer 단계에서 작성 예정. 개발 착수 전 반드시 Approved 필요.**

---

## 13. 후속 작업

1. **`design-spec-i18n-coverage-phase2-run-detail.md`** (Designer) — 본 스펙 §10의 20개 서브트리에 대해 EN/KO 실제 카피 표 작성. Phase 1 design-spec §3 고유명사·§4 단위·§5 plural 규칙 그대로 계승.
2. **`dev-spec-i18n-coverage-phase3-shared-components.md`** — `DetailPanel` / `FocusMode` / `ExportModal` / `StatusBadge` / `Avatar` / `ProjectHeader` / `LogoMark` / `ErrorBoundary` 공유 컴포넌트 Epic. run-detail + plan-detail 양쪽이 다 끝난 후 착수.
3. **`dev-spec-i18n-coverage-phase3-remaining.md`** — 스캐너 전수 리스트 기반 디렉터리별 분할 (settings / projects / testcases / sessions / onboarding / admin / marketing).
4. **(Phase 1 followup — f010-followup-3 개선)** — `src/lib/formatRelativeTime.test.ts` / `src/lib/dateFormat.test.ts` 유닛 테스트에서 **본 스펙 추가분 (`formatLongDateTime`)** 도 커버.
