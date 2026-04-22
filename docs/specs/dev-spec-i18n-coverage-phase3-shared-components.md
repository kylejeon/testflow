# Dev Spec: i18n 커버리지 Phase 3 — 공유 컴포넌트 Epic

> **작성일:** 2026-04-21
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인 명세:** (후속) `docs/specs/design-spec-i18n-coverage-phase3-shared-components.md` — Designer 가 EN/KO 실제 카피 확정
> **선행 스펙:**
> - Phase 1: `docs/specs/dev-spec-i18n-coverage.md` (Merged) — Milestone Overview + Issues + AIRunSummaryPanel
> - Phase 1 디자인: `docs/specs/design-spec-i18n-coverage.md` — §3 용어 / §4 plural / §5 interpolation / §6 AI 비번역 / §15 외부 송출 OOS 원칙 본 스펙도 그대로 상속
> - Phase 2a: `docs/specs/dev-spec-i18n-coverage-phase2-plan-detail.md` (Merged)
> - Phase 2b: `docs/specs/dev-spec-i18n-coverage-phase2-run-detail.md` (Merged)
> - Phase 2 QA: `docs/qa/qa-report-i18n-coverage-phase2.md`
> **feature_list.json:** f010 (P1) — Phase 3
> **영향 범위:** `src/components/{DetailPanel,ExportModal,FocusMode,StatusBadge,Avatar,ProjectHeader}.tsx`, `src/i18n/local/{en,ko}/*.ts`, `.i18nignore`, `scripts/scan-i18n.mjs` (SCOPE_DIRS 확장 검토)

---

## 1. 개요

### 문제
Phase 1~2b 를 통해 Milestone Detail / Issues / Plan Detail / Run Detail 네 개의 도메인 페이지는 i18n 전환을 마쳤다. 그러나 이 페이지들이 공유해서 사용하는 **저수준 공유 컴포넌트 6 종** — `DetailPanel`, `ExportModal`, `FocusMode`, `StatusBadge`, `Avatar`, `ProjectHeader` — 은 여전히 영문 리터럴을 JSX 본문 · `placeholder` · `title` · `alt` · 로컬 toast (`setFocusToast`) 등에 박고 있다. 결과적으로:

- **ProjectHeader** 의 9개 상단 탭 (Dashboard / Test Cases / Steps Library / Runs / Requirements / Traceability / Milestones / Exploratory / Documents) 과 프로필 드롭다운(Switch project / Settings / Log out / No projects found / tier 이름) 이 `ko` 로케일에서 전부 영문으로 노출된다. 이 컴포넌트는 **로그인 후 거의 모든 페이지 최상단** 에 렌더되므로 체감 번역률 하락의 가장 큰 원인이다.
- **DetailPanel** 은 Run 실행 화면·Test Cases 목록·Plan Detail TC 탭 세 곳에서 우측 사이드 패널로 렌더되며, `Priority / Folder / Tags / Assignee / Created / Last Run / Expected Result / No steps defined / No comments yet / No linked issues / Jira integration requires Hobby+ / Link Existing Issue / Enter issue key / Create Jira Issue / No history yet / Add Result / Pass & Next / Post / Edit / Delete / Update / Locked to preserve test results / Loading... / Version history unavailable` 등 **메타라벨 + 탭 헤더 + 4개 탭 본문 + empty state + footer 액션**이 전량 영문.
- **FocusMode** 1,583 줄은 Run 실행의 풀스크린 모드로서 **사이드바(Progress / All / Passed / Failed / Blocked / Retest / Untested / Search TC... / No test cases match / Open sidebar) + 키보드 힌트 쌍 (Comments / History / Note / Sidebar / Search / Exit) + 본문 (Previously {status} / Precondition / Attachments / Test Steps / Comments / Execution History / Loading / No comments yet / No execution history / Pass this step / Fail this step / View changes / Hide changes / Update / Dismiss / Locked to preserve test results / {avg}/n passed) + 노트 영역 (Describe what you observed… / ⌘ + Enter to save with status) + GitHub Issue Quick-Create 모달 (Create GitHub Issue / Title / Will be created in / Cancel / Create Issue / Creating...) + 상태 버튼 (Passed/Failed/Blocked/Retest/Skip) + Previous/Next + Last test — press any status key to complete the run + Lightbox alt="Preview" + 2건의 `setFocusToast('error'|'success', '<영문 메시지>')` + 1건의 `'Failed to save result. Please try again.'` fallback` 이 전부 영문.
- **ExportModal** 은 PDF/CSV/Excel 포맷 선택 · Status Filter · Tag Filter · "Include AI Summary" 옵션 · "of N test cases will be exported" 카피 + `Export / Cancel / Close (aria-label)` 버튼. 단 PDF/CSV/Excel **출력 콘텐츠 자체는 AC-9 외부 송출 원칙으로 영문 고정** — 본 스펙이 다루는 것은 **래퍼 UI 문자열뿐**.
- **StatusBadge** 43 줄은 `STATUS_CONFIG` 상수 안에 `label: 'Passed' | 'Failed' | 'Blocked' | 'Retest' | 'Untested'` 를 하드코딩한다. 이미 Phase 1 에서 `common.passed|failed|blocked|retest|untested` 가 정의되어 있어 **재사용만 하면 된다.**
- **Avatar** 187 줄은 `img alt={name || email || 'Avatar'}` fallback 1 건만 영문. 사용자 실명·이메일 데이터는 번역 대상이 아니다.

### 해결
6 개 공유 컴포넌트를 **기존 네임스페이스(`common` / `projects` / `runs`) 편입** 을 원칙으로 i18n 전환한다. Phase 1~2 에서 이미 정의된 `common.*` / `common.issues.*` / `common.time.*` / `common.toast.*` / `runs.detail.*` 키를 **최우선 재사용** 하여 **신규 키 수를 최소화** 한다 (예상 80~160 leaf). 새 네임스페이스는 필요 시 **`common.detailPanel.*` / `common.exportModal.*` / `common.focusMode.*` 하위 서브트리** 로만 추가하고 독립 네임스페이스 파일은 만들지 않는다 (Phase 1 원칙 §3 그대로). `ProjectHeader` 의 navigation 탭은 **`common.nav.*`** 서브트리 (기존 flat 키와 공존).

외부 송출용 문자열은 본 스펙에서도 **번역 대상이 아니다**: ExportModal 내부의 실제 PDF/CSV/Excel 본문은 이미 Phase 2b 에서 `.i18nignore` 에 규칙이 있음 — 본 스펙 대상 파일은 **UI 래퍼 뿐**이므로 내부 출력 템플릿은 건드리지 않는다. FocusMode 의 키보드 단축키 (`P / F / B / R / S / C / H / N / [ / / / Esc / Cmd+Shift+F`) 는 Phase 2b AC-12 원칙 승계 — **영문 고정**, 설명 문장만 번역.

### 성공 지표
- `ko` 로케일 진입 시 6 개 공유 컴포넌트를 사용하는 모든 페이지 (실질적으로 **로그인 후 전 페이지**) 에서 공유 컴포넌트 범위 내 영문 하드코딩 노출 0 건 (브랜드명 / 단축키 / 사용자 데이터 / PDF export 내부 콘텐츠 제외).
- `npm run scan:i18n:check` → `src/components/{DetailPanel,ExportModal,FocusMode,StatusBadge,Avatar,ProjectHeader}.tsx` 매치 0 건 (SCOPE_DIRS 에 `src/components` 추가 후).
- `npm run scan:i18n:parity` 가 Phase 1 + 2a + 2b + 3 키 전체에 대해 en↔ko diff 0.
- `tsc --noEmit` 0 에러, `npm run build` PASS, `npm run test -- --run` 회귀 0.
- Phase 1/2 가 이미 교체한 파일들 (milestone-detail / issues / plan-detail/page.tsx / run-detail/page.tsx / AIRunSummaryPanel.tsx) 에 **변경 없음**.

---

## 2. 유저 스토리

- **As a 한국어 사용자(로그인 후 어떤 페이지든)**, ProjectHeader 의 9 개 탭 · 프로젝트 전환 드롭다운 · 프로필 메뉴 (Settings / Log out) · tier 이름 뱃지가 한국어로 노출되기를 바란다, so that 서비스 체감 번역률이 50% 미만에서 90%+ 로 회복된다.
- **As a 한국어 Tester**, DetailPanel 을 열었을 때 메타라벨(Priority / Folder / Tags / Assignee / Created / Last Run) · 탭 헤더(Comments / Results / Issues / History) · empty state("No comments yet" / "No linked issues" / "No history yet") · 액션 (Edit / Delete / Post / Add Result / Pass & Next / Link Existing Issue / Create Jira Issue) 가 모두 한국어로 보이기를 바란다, so that Run 실행 중 상태를 정확히 해석하고 실수 없이 기록할 수 있다.
- **As a 한국어 QA 엔지니어 (Focus Mode 사용자)**, 풀스크린 Focus Mode 의 사이드바 필터 · 검색 placeholder · 진행률 헤더 · 키보드 힌트 설명 · 토스트("Failed to save result" 등) · 모달(Create GitHub Issue / Title / Cancel / Create Issue) · 상태 버튼이 한국어로 노출되기를 바라되, 단축키 문자(`P/F/B/R/S/C/H/N/[/]/Esc`)는 영문 그대로 유지되기를 바란다.
- **As a 영어권 Admin**, ko/en 상호 오염 없이 en 로케일에서 공유 컴포넌트 문자열이 전부 영문으로 복귀하기를 바란다 (Phase 2b 에서 새로 도입된 "KO 하드코딩 회귀" 리스크의 공유 컴포넌트 버전).
- **As a 개발자**, `src/components/` 하위 공유 컴포넌트도 `scan:i18n` 게이트 안으로 편입되어 앞으로 새 하드코딩이 CI 에서 즉시 차단되기를 바란다.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1:** 6 개 파일(`src/components/DetailPanel.tsx` / `ExportModal.tsx` / `FocusMode.tsx` / `StatusBadge.tsx` / `Avatar.tsx` / `ProjectHeader.tsx`) 내 **영문 하드코딩 리터럴이 0건**이다 (스캐너 기준). 다음은 제외(`.i18nignore` 기준):
  - 브랜드명 / 고유명사: `Testably` / `Jira` / `GitHub` / `Claude` / `Slack` / `Paddle` / `LemonSqueezy` / `Anthropic` (Phase 1 §15 승계)
  - 키보드 단축키 문자: `P / F / B / R / S / C / H / N / [ / ] / / / Esc / Cmd+Shift+F / ⌘ + Enter` (Phase 2b AC-12 승계)
  - 사용자 입력 데이터: 실명 · 이메일 · 프로젝트명 · TC 제목 · 코멘트 본문 · TC 설명 · precondition · 태그 · 파일명 (예: `<span>{p.name}</span>`, `<img alt={file.name}>`, `{test.customId || 'TC-001'}` 같은 동적 문자열)
  - TIER_INFO 의 Plan 이름 상수: `Free` / `Hobby` / `Starter` / `Professional` / `Enterprise S` / `Enterprise M` / `Enterprise L` (디자인 스펙 §3-1 Plan 이름 고정, 단 Design Spec 에서 재확인)
  - 문자/기호: `—` (em-dash), `+{overflow}`, `#{gi.number}`, `v{version}` 같은 포맷 문자열
- [ ] **AC-2:** 본 스펙 대상 6 개 파일 내 **한국어 하드코딩 리터럴이 0건**이다 (Phase 2b AC-11 원칙 승계, EN 로케일 회귀 방지). 현재 `src/components/FocusMode.tsx` 에 주석 한국어(`// 실패 시 다음 TC로 이동하지 않음`, `// 저장 후 종료 (confirm 대신 자동 저장 + 토스트)`) 만 존재하며, **주석은 번역 대상이 아님** (AC-1 / AC-2 모두 코드 주석 제외).
- [ ] **AC-3:** `npm run scan:i18n:parity` exit 0 (en ↔ ko 키 트리 diff 0).
- [ ] **AC-4:** 전체 품질 게이트 PASS:
  - `npx tsc --noEmit` 에러 0
  - `npm run build` 성공
  - `npm run test -- --run` 기존 테스트 전량 PASS (공유 컴포넌트 관련 RTL 테스트가 없다면 **최소 회귀 없음**)
  - `npm run scan:i18n:check` exit 0 (6 파일 매치 0건)
  - `npm run scan:i18n:parity` exit 0
- [ ] **AC-5:** Phase 1 + Phase 2a + Phase 2b 에서 확정된 번역 키 값 변경 **0건**. `git diff --stat` 상 `src/pages/milestone-detail/` · `src/components/issues/` · `src/pages/run-detail/page.tsx` · `src/pages/plan-detail/page.tsx` · `src/components/AIRunSummaryPanel.tsx` 에 수정 없음. 기존 키 **추가**는 허용(재사용 확대). 기존 키 **삭제 / 리네임 / 값 변경 금지**.
- [ ] **AC-6:** 본 스펙이 추가하는 en 리프 키 수는 **80 ~ 160 개** 범위. 하한 미달(<80): common 재사용이 과하게 많거나 중요 라벨을 놓친 것 — 재검토. 상한 초과(>160): 신규 키가 과도 — Designer 와 중복 키 통폐합 또는 서브 섹션 분리 검토. **Phase 2b QA W-3 교훈 반영: 하한·상한을 좁힘.**
- [ ] **AC-7:** `.i18nignore` 에 **6 개 공유 컴포넌트 파일을 whole-file 등록한 적이 있다면 제거**한다. 현재 .i18nignore 는 파일 단위 ignore 를 사용하지 않음 — 단, **`scripts/scan-i18n.mjs` 의 `SCOPE_DIRS` 배열에 `'src/components'` 을 추가**하거나, 최소 6 개 파일 경로를 `SCOPE_DIRS` 에 등록해야 한다 (현재 SCOPE_DIRS 는 `['src/components/issues', 'src/pages/milestone-detail', 'src/pages/run-detail', 'src/pages/plan-detail']` 이라 본 스펙 대상 파일들이 스캔 밖). **스캐너 확장은 본 스펙 범위**.
- [ ] **AC-8 (StatusBadge 재사용):** `src/components/StatusBadge.tsx` 의 `STATUS_CONFIG.*.label` 은 **`common.passed|failed|blocked|retest|untested` 기존 키를 재사용**한다. 신규 키를 만들지 않는다. 상수를 `useMemo(() => ..., [t])` 패턴으로 컴포넌트 내부로 이동(Phase 2a AC-9 패턴 승계). `badgeCls` / `dot` / `border` / `bg` / `text` 는 그대로 유지.
- [ ] **AC-9 (Avatar 비번역 원칙):** `Avatar.tsx` 의 `img alt={name || email || 'Avatar'}` fallback 의 `'Avatar'` 1 건만 번역 키 (`common.avatar.altFallback`) 로 교체. 사용자 실명·이메일·photoUrl 등 props 로 내려오는 데이터는 **번역 대상 아니다**. `AvatarStack` 의 `+{overflow}` 숫자 표기 및 `title={m.name || m.email}` 도 동적 데이터 — 번역 대상 아니다. 단 Avatar 에 `title` 이 외부에서 명시 전달될 경우(현재 props interface 상 허용) 호출처가 `t(...)` 로 전달하도록 문서화 — 본 스펙 범위 안 바뀜, 문서만 추가.
- [ ] **AC-10 (FocusMode 상수 리팩토링):** `STATUS_BUTTONS` / `FILTER_CHIPS` (component scope 지만 render 함수 내부) / 키보드 힌트 배열 3종 (`[{key:'C',label:'Comments'},{key:'H',label:'History'},{key:'N',label:'Note'}]`, `[{key:'[',label:'Sidebar'},{key:'/',label:'Search'}]`) 을 **`useMemo(() => [...], [t])`** 으로 이동하여 `label` 이 번역 값으로 치환되게 한다. `key` (단축키 문자) 는 영문 고정 유지. `STATUS_ICON` 의 `icon/bg/color` 는 className/색상 값이라 그대로 유지. `PRIORITY_DOT` / `PRIORITY_TEXT_COLOR` 는 값 상수 — 그대로. `STATUS_BUTTONS` 의 Skip 라벨(`'Skip'`, status=`untested`)은 **`common.untested` 와 다른 카피** 이므로 신규 키 `common.focusMode.skip` 또는 `runs.detail.focusMode.skip` 추가(Designer 결정).
- [ ] **AC-11 (ExportModal 외부 송출 보호):** `ExportModal.tsx` 에서 번역 대상은 **UI 래퍼**만이다 — `Export` 헤더 / `runName` 하단 서브타이틀 / `Format` 섹션 라벨 / `Status Filter` / `Tag Filter` / `(empty = all tags)` 보조 카피 / `Include AI Summary` / `Prepends risk level, metrics, failure patterns & recommendations` / count preview (`{displayCount} of {totalCount} test cases will be exported`) / `Cancel` / `Export PDF|CSV|Excel` 버튼 / `Close` aria-label. 내부 `formats[].label = 'PDF' | 'CSV' | 'Excel'` 은 **파일 포맷 약어 → 번역 대상 아님**(Design Spec 에서 최종 확정). CSV 포맷 자체의 헤더 · PDF 내부 셀 라벨은 별도 페이지에서 생성되므로 본 스펙 범위 아님.
- [ ] **AC-12 (ProjectHeader 네비게이션 재사용):** `navItems` 배열의 9 개 라벨은 다음과 같이 **기존 키 재사용 우선**:
  - `Dashboard` → 신규 `common.nav.dashboard`
  - `Test Cases` → 기존 `common.testCases` 재사용
  - `Steps Library` → 신규 `common.nav.stepsLibrary`
  - `Runs` → 기존 `common.runsAndResults` 재사용
  - `Requirements` → 신규 `common.nav.requirements`
  - `Traceability` → 신규 `common.nav.traceability`
  - `Milestones` → 기존 `common.milestones` 재사용
  - `Exploratory` → 기존 `common.sessions` 재사용 (현재 값이 'Exploratory')
  - `Documents` → 신규 `common.nav.documents`
  프로필 드롭다운: `Settings` → 기존 `common.settings` 재사용, `Log out` → 기존 `common.logout` 재사용. 프로젝트 드롭다운 `Switch project` → 신규 `common.nav.switchProject`. `No projects found` → 기존 `projects.noProjects` 재사용. 프로필 툴팁 `Keyboard Shortcuts (?)` → 신규 `common.nav.keyboardShortcutsTooltip` (Design Spec 결정: title 속성 안에 `(?)` 단축키 힌트 포함 여부 Designer가 확정).
- [ ] **AC-13 (TIER_INFO 플랜 이름):** `TIER_INFO.{1..7}.name` 은 마케팅 표기이며 **브랜드-like** 이다. Design Spec §3-1 에 따라 **영문 고정 유지**. 본 스펙은 TIER_INFO 를 건드리지 않는다. 단, 해당 값을 렌더하는 JSX (`<span>{tierInfo.name}</span>`) 주변의 aria-label 이나 동적 설명 문구가 있으면 그 부분만 번역. (Design Spec 에서 Plan 이름 번역 여부 최종 결정 — 만약 번역한다면 본 AC-13 을 follow-up 티켓으로 분리.)
- [ ] **AC-14 (DetailPanel 상수 리팩토링):** `STATUS_COLORS` / `PRIORITY_DOT_COLORS` 는 className/색상 값 상수 — 그대로 유지. 상태 라벨 렌더 (`result.status.charAt(0).toUpperCase() + result.status.slice(1)` 패턴이 line 700, 1111, 1310, 1175-1176, 1212-1213 에 총 5 곳) 를 **`common.passed|failed|blocked|retest|untested` 기존 키 룩업** 으로 교체. 대문자화 로직 제거 가능. `getTimeAgo()` inline 함수 (line 136~147) 는 Phase 1 에서 추가한 `formatRelativeTime(iso, t)` 헬퍼로 **치환**한다 (Phase 2a AC-12 · Phase 2b AC-5 패턴 승계). `formatDate(iso)` (line 132~134) 는 Phase 1 의 `formatShortDate(iso, lang)` 헬퍼로 치환하고 호출부에 `i18n.language` 전달. 시간 포맷 `toLocaleString('en-US', ...)` (line 1015, 1092~1097, 1315~1320) 은 Phase 2b 에서 추가한 `formatShortDateTime(iso, lang)` / `formatShortTime(iso, lang)` / `formatLongDateTime(iso, lang)` 헬퍼 재사용. **신규 date 헬퍼 도입 금지** (AC-5 회귀 방지).
- [ ] **AC-15 (단축키 힌트 분리):** FocusMode 의 `title="Open sidebar ([)"` 같이 단축키 문자가 **문장 안에 파라미터로 삽입**되는 경우, i18next interpolation `'{{shortcut}}'` 을 사용한다. EN: `'Open sidebar ({{shortcut}})'` / KO: `'사이드바 열기 ({{shortcut}})'` — `shortcut` 값은 `'['` 같은 영문 고정 문자. 단축키가 복잡한 경우 (`Cmd+Shift+F`) 도 동일 패턴 — Phase 2b AC-12 선례 따름.
- [ ] **AC-16 (브랜드 단어 유지):** `Jira integration requires Hobby+` (DetailPanel line 1140) 같이 브랜드명 + 플랜 이름이 문장에 섞인 경우, **interpolation 처리**: EN `'{{brand}} integration requires {{plan}}+'`, KO `'{{brand}} 연동에는 {{plan}} 플랜 이상이 필요합니다'` 식. `brand='Jira'`, `plan='Hobby'` 가 파라미터로 주입 — AC-1 브랜드명 제외 원칙 유지. Designer 가 KO 카피 확정.

---

## 4. 기능 상세

### 4-1. 스코프 확정 — 하드코딩 규모 측정 (2026-04-21 HEAD 기준)

**대상 파일 6 개** (자식 서브 컴포넌트 · 보조 컴포넌트 탐색 결과 없음 — 6 개 파일 모두 단일 파일 리팩토링):

| # | 경로 | 라인 수 | i18n 상태 | JSX 영문 hit (scanner 패턴) | `placeholder/aria-label/title/alt` 영문 hit | 로컬 toast / setter | 한국어 하드코딩 | 우선순위 |
|---|------|--------|----------|---------------------------|---------------------------------------|-------------------|---------------|---------|
| 1 | `src/components/DetailPanel.tsx` | 1,370 | 없음 | 15 (scanner) + **대략 30~40건** (단일 단어 버튼/라벨, scanner 규칙 외) | 4 (`title="Previous"` / `title="Next"` / `placeholder="Add a comment..."` / `placeholder="Enter issue key, e.g. PROJ-123"`) | 0 (toast 기능 없음) | 0 | **High** (전 페이지 패널) |
| 2 | `src/components/ExportModal.tsx` | 224 | 없음 | 1 (scanner) + **약 8~10건** (Format/Status Filter/Tag Filter/(empty = all tags)/Include AI Summary/설명/preview/Cancel/Export PDF) | 1 (`aria-label="Close"`) | 0 | 0 | **High** |
| 3 | `src/components/FocusMode.tsx` | 1,583 | 없음 | 7 (scanner) + **약 40~50건** (사이드바 + 본문 + 모달 + footer) | 6 (`placeholder="Search TC..."`, `title="Open sidebar ([)"`, `title="Pass this step"`, `title="Fail this step"`, `placeholder="Describe what you observed..."`, `alt="Preview"`) | 3 (`showFocusToast` 호출 3곳: line 232, 237, 387) | 2 건(주석만 — 제외) | **High** (풀스크린 실행 화면) |
| 4 | `src/components/StatusBadge.tsx` | 43 | 없음 | 0 (scanner) — `STATUS_CONFIG` 상수 내 `label:` 5 건은 JSX 밖이라 regex 미감지 | 0 | 0 | 0 | **High** (전 페이지, 단 재사용 전담) |
| 5 | `src/components/Avatar.tsx` | 187 | 없음 | 0 (scanner) | 0 (`alt={name || email || 'Avatar'}` — `'Avatar'` fallback 영문 하나) | 0 | 0 | **Low** (1 건만 변경) |
| 6 | `src/components/ProjectHeader.tsx` | 433 | 없음 | 3 (scanner: `No projects found`, `Settings`, `Log out`) + **약 12건** (`navItems` 9 개 탭 라벨 + `Switch project` + `User` fallback) | 1 (`title="Keyboard Shortcuts (?)"`) | 0 | 0 | **High** (모든 페이지 최상단) |

**서브 컴포넌트 / 보조 유틸 확인 결과:**
- `DetailPanel.tsx` 는 `StepRow` · `ResultItem` 등 내부 helper 컴포넌트가 동일 파일 안에 inline 정의되어 있음. 별도 파일 아님.
- `FocusMode.tsx` 는 `STATUS_BUTTONS` · `STATUS_ICON` · `PRIORITY_DOT` · `PRIORITY_TEXT_COLOR` 등 모듈 top-level 상수 → AC-10 에 따라 useMemo 리팩토링.
- `ProjectHeader.tsx` 는 `TIER_INFO` top-level 상수 → AC-13 에 따라 그대로(영문 고정).
- `ExportModal.tsx` 는 `ALL_STATUSES` / `STATUS_STYLE` / inline `formats` 배열 — `formats[].label = 'PDF'|'CSV'|'Excel'` 은 포맷 약어(비번역) 유지. Status toggle 의 `s.charAt(0).toUpperCase() + s.slice(1)` 는 status 문자열 값 → AC-14 스타일로 `common.passed|failed|blocked|retest|untested` 룩업 교체.
- `StatusBadge.tsx` 는 상수 1개 + 단순 함수 1개. 사용처 전수 조사: 10+ 곳 (run-detail, plan-detail, session-detail, project-stats, project-runs, project-testcases, DetailPanel 내부 등).
- `Avatar.tsx` 는 `Avatar` + `AvatarStack` 2 exports. `PALETTE` / `SIZE` / `getAvatarColor` / `simpleHash` / `getInitials` 모두 값·함수 → 번역 무관.

**총 JSX 영문 + 속성 hit (scanner 외 포함 수동 집계):**
- DetailPanel ≈ 40건
- ExportModal ≈ 10건
- FocusMode ≈ 50건
- StatusBadge = 5건 (STATUS_CONFIG.label — 기존 키 재사용만 필요)
- Avatar = 1건
- ProjectHeader ≈ 15건
- **합계 ≈ 121 unique label slot** → 신규 키 80~160 AC-6 범위와 일치 (재사용 비율 감안).

**스캐너 커버리지 보강 필요:**
- 현재 `scripts/scan-i18n.mjs` 의 `SCOPE_DIRS` 에 `src/components` 전체 또는 최소 6 개 파일이 포함돼 있지 않음. AC-7 에 따라 **`SCOPE_DIRS` 를 확장**하는 작업이 본 스펙에 포함. 확장 범위는 **6 개 파일만** 선택적으로 등록할지, `src/components` 전체를 등록하고 미번역 파일을 파일 단위 ignore 로 제외할지 Design Spec + 초기 PR 에서 결정. **초기 권장: 6 개 파일만 whitelist** (Phase 4+ 에서 `src/components` 전체로 확장).

### 4-2. 네임스페이스 배치 전략

Phase 1 Design Spec §3-2 "신규 네임스페이스 생성 지양, 기존 편입" 원칙 유지. 본 스펙이 추가하는 모든 키는 기존 `common.*` / `projects.*` / `runs.*` 서브트리에 편입한다.

| 대상 컴포넌트 / UI 영역 | 편입 ns | 서브트리 prefix | 근거 |
|---------------------|---------|---------------|------|
| **DetailPanel** (여러 도메인에서 공유) | `common` | `common.detailPanel.*` | 전역 공유 — Run / TC / Plan 모두 동일 UI. milestones/runs/plans 로 귀속시키기 애매. |
| **DetailPanel 의 상태 라벨 (Passed/Failed/…)** | `common` | 재사용: `common.passed` 등 | 기존 키 재사용만. |
| **DetailPanel 의 relative time 렌더** | `common` | 재사용: `common.time.*` | Phase 1 공용 헬퍼 그대로. |
| **ExportModal** (모든 export 진입점에서 공유) | `common` | `common.exportModal.*` | 전역 공유. |
| **FocusMode** (Run 실행 전용이지만 **독립된 실행 플로우**) | `runs` | `runs.detail.focusMode.*` (`runs.detail.headerActions.focusMode` 과 별개로 sub-트리) | 주 사용처는 run-detail/page.tsx 의 모달 invoker. 기존 `runs.detail.addResult.*` 와 같은 레벨로 내포. **신규 네임스페이스 지양** 원칙 유지. |
| **FocusMode 의 GitHub Issue Quick-Create 모달** | `runs` | `runs.detail.focusMode.githubIssueModal.*` | FocusMode scope 내부 모달 — 기존 `runs.detail.githubIssue.*` 는 **run-detail page 의 모달 전용** 이므로 분리 유지 (카피가 일부 다를 수 있음 — Designer 가 중복 최소화 결정). 중복이 80% 이상이면 Designer 가 공통 키로 승격 제안. |
| **FocusMode 의 상태 버튼 Passed/Failed/Blocked/Retest** | `common` | 재사용: `common.passed` 등 | AC-10 재사용. |
| **FocusMode 의 Skip 버튼 (status=untested 인데 라벨이 'Skip')** | `runs` (또는 `common`) | `runs.detail.focusMode.skip` | `common.untested` 와 카피가 달라 별도 키. Designer 결정. |
| **StatusBadge** | `common` | 재사용: `common.passed` 등 | 신규 키 0건. AC-8. |
| **Avatar** | `common` | `common.avatar.altFallback` | 단 1 건. |
| **ProjectHeader navigation 탭** | `common` | `common.nav.*` (일부 기존 flat 키 재사용) | `common.testCases` / `common.milestones` / `common.runsAndResults` / `common.sessions` 는 이미 기존 flat 키로 존재 — 그대로 재사용. `common.nav.dashboard` / `common.nav.stepsLibrary` / `common.nav.requirements` / `common.nav.traceability` / `common.nav.documents` / `common.nav.switchProject` / `common.nav.keyboardShortcutsTooltip` 은 신규. |
| **ProjectHeader 프로필 드롭다운** | `common` | 재사용: `common.settings` / `common.logout` | 기존 flat 키 그대로. 프로필 상단의 `userProfile?.full_name || userProfile?.email || 'User'` 의 `'User'` fallback → 신규 `common.nav.userFallback` 또는 `common.user` (Designer 결정). |
| **ProjectHeader "No projects found" empty** | `projects` | 재사용: `projects.noProjects` | 이미 존재 (`'No projects found'`). |
| **TIER_INFO Plan 이름** | — | — | AC-13: 영문 고정 유지 (Designer 확정). |

**결정 트리 (네임스페이스 선택 알고리즘):**
1. 해당 문자열이 이미 i18n 번들에 존재하는가? → **재사용** (중복 생성 금지).
2. 해당 컴포넌트가 단일 도메인 전용 (Run 전용 / Milestone 전용 / Plan 전용) 인가? → 도메인 ns 의 `detail.*` 서브트리 편입.
3. 여러 도메인에서 공유되며 일반적 UX 라벨 (Close / Save / Cancel / Loading / Add Result / Previous / Next / Edit / Delete / Post / Link / Dismiss / Exit / Download / Preview 등) 인가? → `common.*` flat 또는 `common.actions.*` 서브트리.
4. 해당 컴포넌트의 고유 라벨이 공통화하기 애매한가? → `common.<componentName>.*` 서브트리 (예: `common.detailPanel.*` / `common.exportModal.*`).

### 4-3. 키 재사용 맵 (중복 생성 금지 목록)

Phase 1 / Phase 2a / Phase 2b 에서 이미 정의된 아래 키를 본 스펙에서는 **그대로 참조**한다. **신규 키 생성 금지.**

| 영문 / 맥락 | 재사용 키 | 비고 |
|-----------|---------|------|
| Cancel / Save / Close / Add / Edit / Delete / Search / Create / Export / Download / Upload / Filter / Logout | `common.cancel` / `common.save` / `common.close` / `common.add` / `common.edit` / `common.delete` / `common.search` / `common.create` / `common.export` / `common.download` / `common.upload` / `common.filter` / `common.logout` | 전역 action 키 |
| Settings | `common.settings` | 프로필 메뉴 |
| Passed / Failed / Blocked / Retest / Untested | `common.passed` / `common.failed` / `common.blocked` / `common.retest` / `common.untested` | Test status (StatusBadge + DetailPanel + FocusMode 공통) |
| Priority / Status / Owner / Name / Description / Assignee | `common.priority` / `common.status` / `common.owner` / `common.name` / `common.description` / `common.assignee` | 공통 라벨 (DetailPanel meta grid) |
| Created at / Updated at / Start date / End date / Due date | `common.createdAt` / `common.updatedAt` / `common.startDate` / `common.endDate` / `common.dueDate` | Date 라벨 (DetailPanel `Created` / `Last Run` 은 `common.createdAt` 과 어휘 다름 — 재사용 불가 가능) |
| Loading... | `common.loading` | DetailPanel · FocusMode 공통 |
| Test Cases / Runs / Milestones / Exploratory / Projects | `common.testCases` / `common.runsAndResults` / `common.milestones` / `common.sessions` / `common.projects` | ProjectHeader nav (AC-12) |
| just now / {{count}}m ago / {{count}}h ago / {{count}}d ago | `common.time.justNow` / `common.time.minutesAgo_*` / `common.time.hoursAgo_*` / `common.time.daysAgo_*` | DetailPanel `getTimeAgo()` 제거 후 `formatRelativeTime(iso, t)` 헬퍼 사용 (AC-14) |
| No projects found | `projects.noProjects` | ProjectHeader (AC-12) |
| Linked Issues / Create Jira Issue / Create GitHub Issue / Jira setup required 등 | `runs.detail.addResult.issues.*` / `runs.detail.jiraIssue.*` / `runs.detail.githubIssue.*` | FocusMode GitHub Issue Quick-Create 모달에서 **카피 동일한 경우** 재사용. 카피가 다르면 `runs.detail.focusMode.githubIssueModal.*` 로 새로. Designer 결정. |
| Version history unavailable / Locked to preserve test results / Loading... (diff) / Current (v{{version}}) / Latest (v{{version}}) | `runs.detail.addResult.steps.diffUnavailable` / `.lockedBanner` / `.diffLoading` / `.diffCurrent` / `.diffLatest` | DetailPanel · FocusMode 의 SS Diff 영역 키. **재사용**. |
| All (filter) | 기존 `common.issues.all` (== 'All') 재사용 가능 여부 Designer 결정 | FocusMode 사이드바 필터 `'All'` + ExportModal Tag Filter 섹션 |

**주의:** `common.nav.*` 하위 신규 키 중 기존 flat 키(`common.testCases` 등)와 같은 영문 값을 갖는 키를 **중복 생성하지 않는다.** `common.nav.testCases` 를 새로 만들면 번역 이중 관리 리스크 — **네비게이션 전용 키는 기존 flat 키 재사용** 이 원칙 (AC-12).

### 4-4. 동작 흐름 (Flow)

**개발자 Happy Path (파일 1 개당):**
1. 파일 상단에 `import { useTranslation } from 'react-i18next'` 추가.
2. 컴포넌트 함수 본문 첫 줄에 `const { t, i18n } = useTranslation();` (또는 `useTranslation('runs')` 등 주 네임스페이스 지정).
3. JSX 내 영문 리터럴을 `{t('common:...')}` / `{t('runs:detail...')}` 로 교체.
4. `placeholder` / `title` / `aria-label` / `alt` 속성을 `t()` 호출로 교체.
5. `setFocusToast({...message: 'Failed to save'})` 같은 로컬 toast 메시지를 `t('runs:detail.focusMode.toast.*')` 로 교체.
6. 상수 블록 (`STATUS_CONFIG` / `STATUS_BUTTONS` / `FILTER_CHIPS` / 키보드 힌트 배열) 이 top-level 이면 `useMemo(() => [...], [t])` 로 컴포넌트 내부 이동.
7. 인라인 `getTimeAgo()` / `formatDate()` 같은 헬퍼 제거 → `formatRelativeTime(iso, t)` / `formatShortDate(iso, i18n.language)` 등 Phase 1/2b 공용 헬퍼 재사용.
8. `src/i18n/local/en/<ns>.ts` 와 `src/i18n/local/ko/<ns>.ts` 에 동일 트리로 키 추가 (Designer 가 카피 확정 후).
9. `npm run scan:i18n:check` 로 매치 0 확인.
10. `npm run scan:i18n:parity` 로 en↔ko parity 0 확인.
11. `npx tsc --noEmit` / `npm run build` / `npm run test -- --run` 통과 확인.

**대안 흐름 (컴포넌트 외부에서 `t` 를 전달해야 하는 경우):**
- 외부에서 이미 `t` 를 가지고 있는 부모가 자식 공유 컴포넌트에 prop 으로 번역된 문자열을 내려줄 수도 있다. 하지만 본 스펙에서는 **각 공유 컴포넌트가 자체적으로 `useTranslation` 호출**하는 것을 원칙으로 한다 (prop drilling 회피). 예외: `Avatar` 의 `title` prop 처럼 **호출처에서 의미 있는 문자열을 조립해야 하는 경우** 만 prop 으로 번역본 전달.

**에러 흐름:**
- 키 누락 → i18next fallbackLng='en' 동작 → 영문 렌더 + dev 콘솔 `missingKey` 경고 → CI `scan:i18n:parity` 가 차단.
- 스캐너가 새 하드코딩을 감지 → CI `scan:i18n:check` exit 1 → 머지 차단.

### 4-5. 특수 문자열 처리 가이드

#### 4-5-1. 상태 라벨 재사용 (Pass/Fail/Blocked/Retest/Untested)

본 스펙 6 개 파일 중 4 개 (`DetailPanel`, `ExportModal`, `FocusMode`, `StatusBadge`) 가 상태 라벨을 렌더한다. **Phase 2b AC-8** 과 동일하게 **모두 `common.passed|failed|blocked|retest|untested` 기존 키를 참조** 해야 한다. 신규 키 생성 금지.

- `StatusBadge.STATUS_CONFIG` → AC-8 에 따라 `useMemo` 내부로 이동 후 `label: t('common:passed')` 등으로 치환.
- `DetailPanel` 의 상태 라벨 렌더 5 곳 (line 700, 1111, 1175~1176, 1212~1213, 1310) — 모두 같은 키 재사용. 대문자화 로직 제거.
- `ExportModal` 의 `s.charAt(0).toUpperCase() + s.slice(1)` (line 129) — `t('common:' + s)` 패턴 또는 Designer 가 맵 함수 제안.
- `FocusMode.STATUS_BUTTONS` 5 개 중 4 개 (`passed/failed/blocked/retest`) 는 재사용. 마지막 `untested` 의 라벨은 `'Skip'` (맥락: Focus Mode footer "skip this test"), **`common.untested`('Untested') 와 다르다** — 신규 키 `runs.detail.focusMode.skip`.
- `FocusMode.FILTER_CHIPS` 6 개 — `All` 은 `common.issues.all` 재사용 가능, 나머지 5 개는 `common.passed|failed|blocked|retest|untested` 재사용.

#### 4-5-2. 상대 시간 / 절대 날짜

**DetailPanel 내부 `getTimeAgo()`** (line 136~147) 는 Phase 1 이 도입한 `formatRelativeTime(iso, t)` 와 **로직이 동일**하다 (just now / m / h / d + 7일 초과 시 절대 날짜 fallback). 단 "1주 초과 시 `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` 로 fallback" 부분이 다르다. 대응:
- 공용 `formatRelativeTime(iso, t)` 헬퍼에 **"≥7 일일 때 절대 날짜로 fallback"** 로직이 있는지 검증. 없으면 이 helper 를 확장할지, DetailPanel 에서만 조합할지 Designer 와 확정. **권장:** helper 를 확장하지 말고, DetailPanel 에서 `diffDays >= 7 ? formatShortDate(iso, lang) : formatRelativeTime(iso, t)` 패턴으로 조합.
- `formatDate()` (line 132~134, `year/month/day` 3 요소) 는 Phase 1 `formatShortDate` 와 포맷이 다르다 (Phase 1 은 month/day 만). 신규 헬퍼 도입 금지 (AC-5) — 대신 `formatLongDateTime(iso, lang)` 의 날짜 부분만 쓰거나, Design Spec 에서 카피 단축 결정.

#### 4-5-3. 키보드 단축키 interpolation (AC-15)

FocusMode 의 `title="Open sidebar ([)"` 같은 힌트는 `{{shortcut}}` interpolation 으로 처리:
```ts
<button title={t('runs:detail.focusMode.openSidebarTooltip', { shortcut: '[' })}>
```
번들:
```ts
// en
'runs.detail.focusMode.openSidebarTooltip': 'Open sidebar ({{shortcut}})',
// ko
'runs.detail.focusMode.openSidebarTooltip': '사이드바 열기 ({{shortcut}})',
```
동일 패턴 적용 대상:
- `title="Pass this step"` / `"Fail this step"` → 단축키 없음. 그냥 문장.
- 키보드 힌트 영역 (line 619~640) 의 `<kbd>{s.key}</kbd><span>{s.label}</span>` 쌍은 이미 key=단축키·label=번역 값 구조 — AC-10 리팩토링으로 자연스럽게 해결.
- Exit 버튼의 `Esc` 라벨은 `<kbd>Esc</kbd>` 로 kbd 태그 내부 → 번역 대상 아님.

#### 4-5-4. 복수형

DetailPanel / FocusMode 에 나타나는 복수형:
- `{steps.length} step{steps.length !== 1 ? 's' : ''}` (DetailPanel line 724) → `common.stepsCount_one|_other` 신규 (기존 재사용 확인 필요).
- `{testCase.attachments.length} attachment{... !== 1 ? 's' : ''}` (DetailPanel line 725, 736, 890) → `common.attachmentsCount_one|_other`.
- `{passedCount}/{steps.length} steps passed` (DetailPanel line 732 inline) → 신규 `common.detailPanel.stepsPassed` (interpolation `{{passed}}/{{total}}`).
- `{selectedIds.size} item{... > 1 ? 's' : ''} selected` 는 Phase 2b 에서 이미 `runs.detail.tcList.bulk.selected_*` 로 있음 — 본 스펙 FocusMode 에는 동일 표현 없음.

**복수형 인라인 조건 제거** 원칙 (Phase 2b §4-4-3 승계).

### 4-6. 권한 (RBAC)

| 역할 | 영향 |
|------|------|
| Owner / Admin / Manager / Tester / Viewer / Guest | 전원 동일 번역 결과. 권한 변경 없음. |

### 4-7. 플랜별 제한

| 플랜 | 제한 | 비고 |
|------|------|------|
| Free / Hobby / Starter / Professional / Enterprise (S/M/L) | 모두 동일 | 번역은 플랜 무관 기본 제공. 단 DetailPanel 의 "Jira integration requires Hobby+" 같은 **upsell 문구는 번역** 하되 플랜 이름 자체는 AC-13 원칙 유지 (브랜드-like 영문). |

---

## 5. 데이터 설계

**변경 없음.** 프론트엔드 리팩토링 전용. DB 스키마 / RLS / API 엔드포인트 모두 무변경.

---

## 6. API 설계

**변경 없음.** 서버가 반환하는 에러 코드 · 메시지 패턴은 Phase 1 / Phase 2b 원칙 그대로 유지 (서버 = 코드만, 클라이언트 = 번역).

`FocusMode` 의 GitHub Issue Quick-Create 모달 내부 `fetch('/api/github/issues', …)` 호출은 **기존 그대로**. 서버 에러 body (`data.error` / `data.message`) 를 `setFocusToast('error', ...)` 로 노출할 때 → `t('runs:detail.focusMode.toast.githubIssueFailed', { reason: err.message })` 패턴. Phase 2b QA W-1 와 동일 리스크 — 서버 응답이 없는 엣지 케이스 fallback 도 i18n 키로 덮는다.

---

## 7. 영향 범위 (변경 파일 목록)

### 수정 파일

| 파일 | 주요 변경 |
|------|---------|
| `src/components/DetailPanel.tsx` | `useTranslation` 도입 / JSX 라벨 40건 교체 / `formatDate` 제거 → `formatShortDate(iso, i18n.language)` 재사용 / `getTimeAgo` 제거 → `formatRelativeTime(iso, t)` 재사용 / 상태 라벨 대문자화 로직 제거 → `common.passed|failed|blocked|retest|untested` 룩업 / placeholder 4건 / title 2건 / 탭 헤더 맵(`labels: Record<string, string>`) 을 `useMemo` 내부로 이동 |
| `src/components/ExportModal.tsx` | `useTranslation` 도입 / JSX 라벨 10건 교체 / `aria-label="Close"` / `formats[].label` 은 영문 유지 (AC-11) / status toggle 대문자화 로직 → `common.*` 룩업 |
| `src/components/FocusMode.tsx` | `useTranslation` 도입 / JSX 라벨 50건 교체 / `STATUS_BUTTONS` · `FILTER_CHIPS` · 키보드 힌트 3개 배열 `useMemo` 이동 / `showFocusToast` 호출 3건 → `t('runs:detail.focusMode.toast.*')` / placeholder 2건 / title 3건 (단축키 interpolation 포함) / alt 1건 / GitHub Issue Quick-Create 모달 8~10건 |
| `src/components/StatusBadge.tsx` | `useTranslation` 도입 / `STATUS_CONFIG` → `useMemo(() => ..., [t])` 컴포넌트 내부 이동 / `label` 5건 → `common.passed|failed|blocked|retest|untested` 재사용 / 신규 키 0 |
| `src/components/Avatar.tsx` | `useTranslation` 도입 / `alt={name || email || t('common:avatar.altFallback')}` 1건 / `AvatarStack.title` prop 은 호출처 책임으로 남김 (prop drilling 최소화) |
| `src/components/ProjectHeader.tsx` | `useTranslation` 도입 / `navItems` 9개 `label` 을 `useMemo` 재계산 (기존 flat 키 재사용 + 신규 `common.nav.*`) / `Switch project` / `No projects found` (재사용) / `Settings` · `Log out` (재사용) / `'User'` fallback / `title="Keyboard Shortcuts (?)"` / `TIER_INFO.name` 영문 유지 (AC-13) |
| `src/i18n/local/en/common.ts` | `common.nav.*` 서브트리 신규 (~7키) / `common.detailPanel.*` 서브트리 신규 (~30~50키) / `common.exportModal.*` 서브트리 신규 (~10키) / `common.avatar.altFallback` / `common.user` 또는 `common.nav.userFallback` 신규 (~2키) |
| `src/i18n/local/ko/common.ts` | 위와 동일 트리, 한국어 카피 (Designer) |
| `src/i18n/local/en/runs.ts` | `runs.detail.focusMode.*` 서브트리 신규 (~40~60키) — 헤더 + 키보드 힌트 + 사이드바 + 진행률 + 필터 + 토스트 + GitHub Issue Quick-Create 모달 |
| `src/i18n/local/ko/runs.ts` | 위와 동일 트리, 한국어 카피 |

### 신규 파일

없음. 본 스펙은 **기존 파일 수정만**으로 완결된다.

### 스캐너 / CI 설정 변경

| 파일 | 변경 |
|------|------|
| `scripts/scan-i18n.mjs` | `SCOPE_DIRS` 배열에 다음 중 하나를 추가 (Designer + CEO 선택):<br>A) 6 개 파일만 whitelist: `'src/components/DetailPanel.tsx'`, `'src/components/ExportModal.tsx'`, `'src/components/FocusMode.tsx'`, `'src/components/StatusBadge.tsx'`, `'src/components/Avatar.tsx'`, `'src/components/ProjectHeader.tsx'` — 단, 현재 스캐너는 디렉터리 기반이라 파일 경로 지원 여부 확인 필요. 필요 시 SCOPE_DIRS 매칭 로직 보강.<br>B) `'src/components'` 전체 등록 + `.i18nignore` 에 **미번역 공유 컴포넌트 파일을 whole-file ignore** 로 추가. Phase 4+ 에서 하나씩 제거.<br>**권장: A안** — 점진적 커버리지 확장이 Phase 1 정책과 일치. |
| `.i18nignore` | `>User<` (fallback 문자열이 번역되지만 확신 필요 시 allowlist), `>PDF<` / `>CSV<` / `>Excel<` (포맷 약어 — Designer 최종 확정 후 추가/생략), 추가 브랜드명 / 단축키 조합 (`>Esc<`) 등. **기존 규칙 보존, 신규 추가만.** |
| `.github/workflows/ci.yml` | 이미 Phase 2b 에서 `scan:i18n:check` + `scan:i18n:parity` 가 차단 활성화됨 — **변경 없음**. 새 파일이 자동으로 gate 안으로 편입된다. |

### 회귀 방어: 금지 수정 파일

다음 파일들은 본 스펙에서 **수정 금지**:
- `src/pages/milestone-detail/**` (Phase 1)
- `src/components/issues/**` (Phase 1)
- `src/pages/run-detail/components/AIRunSummaryPanel.tsx` (Phase 1)
- `src/pages/plan-detail/page.tsx` (Phase 2a)
- `src/pages/run-detail/page.tsx` (Phase 2b)
- `src/lib/dateFormat.ts` / `src/lib/formatRelativeTime.ts` (Phase 1/2 헬퍼 — 재사용만)

예외: 공유 컴포넌트가 `prop` 으로 번역본을 받는 형태로 리팩토링되면 **호출처(위 파일들) 수정이 불가피** 할 수 있다. 본 스펙은 prop drilling 을 회피하고 컴포넌트 내부 `useTranslation` 을 원칙으로 하므로 **호출처 수정 금지** 가 기본이지만, 일부 드문 경우 (Avatar.title) 에서 호출처가 번역된 문자열을 prop 으로 넘기는 패턴이 더 간결하다면 Design Spec 에서 예외 허용.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| DetailPanel 이 `ko` 에서 렌더될 때 `getTimeAgo` 가 제거됐는데 `formatRelativeTime` 의 "7일 초과" fallback 이 없는 경우 | §4-5-2 에 따라 `diffDays >= 7 ? formatShortDate : formatRelativeTime` 조합 로직을 호출부에 두고 헬퍼 미수정 |
| FocusMode 의 `setFocusToast` 가 `showToast` 컴포넌트(global toast) 와 별개 로컬 상태라 `.i18nignore` 의 `showToast('error'` 규칙이 적용 안 되는 경우 | 스캐너 regex 는 `showToast\(\s*['"]` 패턴 — `setFocusToast` 는 다른 이름. **본 스펙은 setFocusToast 내부 영문 문자열을 전부 `t(...)` 로 교체**하므로 스캐너 matching 이 이미 발생하지 않는다. `.i18nignore` 변경 없음. |
| StatusBadge 가 다른 페이지 (Session Detail / Stats 등) 에서 렌더될 때 | `useTranslation` 은 `I18nextProvider` context 내에서만 작동. `App.tsx` 의 provider 를 벗어나면 에러. 현재 모든 사용처는 provider 내부라 안전. 테스트 필요 없음. |
| Avatar 의 `title` prop 이 외부에서 영문으로 전달되는 경우 (DetailPanel line 630 `<Avatar ... title={???}>`) | Avatar 컴포넌트는 prop 을 그대로 표시 → **호출처 책임**. DetailPanel 의 `title` 사용처가 있다면 `t()` 호출 후 prop 전달. 현재 DetailPanel 은 title prop 을 Avatar 에 넘기지 않음 — 문제 없음. AvatarStack 은 `title={m.name || m.email}` 사용자 데이터 — 번역 무관. |
| ProjectHeader 가 로그아웃 후 렌더되어 `userProfile === null` 인 경우 | `tierInfo` 가 undefined 될 가능성 → 기존 코드의 fallback 유지 (`userProfile?.subscription_tier || 1`). 번역 무관. |
| ExportModal 이 PDF 포맷 선택 시 "Include AI Summary" 옵션 라벨이 Designer 카피 변경으로 길어져 UI 깨짐 | Design Spec §4-1 tone/length 가이드 준수 (Phase 1 상속). 실제 카피는 Designer. Dev 는 **1줄 넘어가도 wrap 가능한 컨테이너** 를 이미 보유 (`<div><span>{label}</span><p>{desc}</p></div>`) — 기존 UI 유지. |
| 키 누락: `t('common:nav.dashboard')` 가 ko 에만 빠진 경우 | i18next fallbackLng='en' → 'Dashboard' 렌더. dev 콘솔 `missingKey` 경고. CI `scan:i18n:parity` 가 차단. |
| `common.sessions = 'Exploratory'` 값을 다른 페이지가 "탐색 세션" 맥락으로 사용하는데, ProjectHeader 에서 "탐색" 으로 재사용 가능한가? | 현재 `common.sessions` 는 flat 키이며 기존 사용처 (onboarding, etc.) 가 동일 의미 — 재사용 안전. Designer 가 KO 카피로 `'탐색'` 하나로 통일하면 양쪽 모두 자연스러움. 만약 맥락 차이가 커지면 `common.nav.exploratory` 별도 키 분기 — Designer 판단. |
| 번역 품질: "Open sidebar ([)" 같은 괄호 단축키를 KO 에서 어떻게 표기? | Designer 결정. 권장: `'사이드바 열기 ({{shortcut}})'` — 영문 패턴 그대로. |
| 번역 키 중복 (동일 영문이 다른 키로 2곳 정의) | `scan:i18n:parity` 로는 감지 불가. **Designer 가 재사용 맵 (§4-3) 을 PR 리뷰에서 검증**. |

---

## 9. Out of Scope (이번에 안 하는 것)

> 스코프 크리프 방지

- [ ] `RichTextEditor` / `Toast` 컴포넌트 i18n 전환 — **Phase 1 에서 완료**.
- [ ] `ErrorBoundary` / `ErrorBoundary.test.tsx` — **f024 티켓에서 완료**.
- [ ] `lucide/react` · `remixicon` 아이콘 내부 텍스트 — 외부 라이브러리.
- [ ] 사용자 입력 데이터 (실명 / 이메일 / 프로젝트명 / TC 제목 / 코멘트 본문 / 파일명 / 태그 / precondition) 번역 — 데이터는 번역 대상이 아님.
- [ ] Section-level ErrorBoundary 적용 확대 — 별도 티켓 (progress.txt 후속).
- [ ] ErrorBoundary 다크모드 — 별도 티켓.
- [ ] PDF / CSV / Excel **export 출력 콘텐츠 자체** 번역 — Phase 2b §4-5 + Design Spec §15 외부 송출 OOS 원칙. 본 스펙은 ExportModal UI 래퍼만.
- [ ] FocusMode 의 키보드 단축키 문자 번역 — Phase 2b AC-12 영문 고정 원칙.
- [ ] TIER_INFO Plan 이름 번역 — AC-13. Designer 가 번역 결정 시 별도 티켓.
- [ ] `src/components/` 의 나머지 미번역 파일 (CommandPalette, InlineEdit, KeyboardShortcutsHelp, LanguageSwitcher, EmptyState, ModalShell, StepEditor, SavedViewsDropdown, UpgradeBanner, TagChip, EnvironmentAIInsights, EnvironmentDropdown, EnvironmentFormModal, ProgressBar, SegmentedBar, StatusPill, LifecycleBadge, BulkActionBar, AITriggerButton, NotificationBell, Logo, SaveIndicator, PageLoader, Skeleton, CookieBanner, SEOHead, VirtualList) — **Phase 4** 에서 별도 Dev Spec 분할.
- [ ] 공유 컴포넌트가 사용 중인 아이콘 라이브러리 alt/aria — 이미 번역 대상 아님.
- [ ] 서버 응답 메시지 번역 (Supabase / Edge Function / Auth) — 코드 반환 유지, 클라이언트 번역 패턴 그대로.
- [ ] 기존 flat 키 (`common.started = 'In Progress'` 등) 의 리네임 / 중첩 camelCase 전환 — Phase 2a §4-4 "레거시 보존" 원칙 승계.

---

## 10. i18n 키 구조 (Dev Spec 범위: 구조만, 실제 EN/KO 카피는 Design Spec)

> **금기: 실제 EN/KO 문자열 카피 매핑은 Designer 담당.** 본 스펙은 **키 이름 / 계층 구조 / interpolation 변수명**만 정의한다.

### `common.nav.*` (신규 서브트리) — ProjectHeader

| 키 | Interpolation | 재사용 / 신규 |
|----|---------------|--------------|
| `common.nav.dashboard` | - | 신규 |
| `common.nav.stepsLibrary` | - | 신규 |
| `common.nav.requirements` | - | 신규 |
| `common.nav.traceability` | - | 신규 |
| `common.nav.documents` | - | 신규 |
| `common.nav.switchProject` | - | 신규 |
| `common.nav.keyboardShortcutsTooltip` | - | 신규 (단축키 `?` 포함 여부 Designer) |
| `common.nav.userFallback` | - | 신규 (또는 `common.user`) |
| (재사용) `common.testCases` · `common.runsAndResults` · `common.milestones` · `common.sessions` · `common.settings` · `common.logout` | - | 기존 |
| (재사용) `projects.noProjects` | - | 기존 |

### `common.avatar.*` (신규 서브트리) — Avatar

| 키 | 재사용 / 신규 |
|----|--------------|
| `common.avatar.altFallback` | 신규 |

### `common.detailPanel.*` (신규 서브트리) — DetailPanel

대략 30~50 키. Design Spec 이 최종 확정. 주요 하위 그룹:

| 그룹 | 예상 키 프리픽스 | 예상 키 수 | 비고 |
|------|---------------|-----------|------|
| 메타 그리드 라벨 | `common.detailPanel.meta.*` (예: `meta.created` / `meta.lastRun` / `meta.unassigned`) | ~6 | `common.priority|assignee|description` 등 일부 재사용. `meta.tags` 등은 Designer 결정. `meta.unassigned` 는 기존 `common.issues.assignee.unassigned` 재사용 검토. |
| Quick Actions (Run 모드) | `common.detailPanel.quickActions.*` | ~6 | `addResult` / `passAndNext` / `previous` / `next` / 상태 select option label (`— Untested` 등) |
| Steps 영역 | `common.detailPanel.steps.*` | ~6 | `stepsCount_one|_other` / `attachmentsCount_one|_other` / `stepsPassed` / `precondition` / `expectedResult` / `noStepsDefined` |
| SS Diff (재사용 다수) | `common.detailPanel.ssDiff.*` 또는 재사용 `runs.detail.addResult.steps.*` | ~3 | Designer 가 재사용 여부 결정 |
| Tab 헤더 | `common.detailPanel.tabs.*` | 4 | `comments` / `results` / `issues` / `history` |
| Comments 탭 | `common.detailPanel.comments.*` | ~4 | `empty` / `placeholder` / `post` / `deleteConfirm` |
| Results 탭 | `common.detailPanel.results.*` | ~3 | `empty` / `unknownRun` / `byAuthor` (interpolation `{{author}}`) |
| Issues 탭 | `common.detailPanel.issues.*` | ~8 | `empty` / `linkExisting` / `createJira` / `enterIssueKey` (placeholder) / `link` / `jiraUpgradePromptTitle` (interpolation `{{brand}}, {{plan}}`) / `jiraUpgradePromptBody` |
| History 탭 | `common.detailPanel.history.*` | ~4 | `empty` / `markedAs` (interpolation `{{author}}, {{status}}`) / `inRun` (interpolation `{{runName}}`) / `unknownAuthor` |
| Footer (TC 모드) | `common.detailPanel.footer.*` | 재사용 `common.edit` / `common.delete` | 신규 0 |

### `common.exportModal.*` (신규 서브트리) — ExportModal

| 키 | Interpolation | 비고 |
|----|---------------|------|
| `common.exportModal.title` | - | `'Export'` 헤더 |
| `common.exportModal.format` | - | `'Format'` 섹션 라벨 |
| `common.exportModal.statusFilter` | - | `'Status Filter'` |
| `common.exportModal.tagFilter` | - | `'Tag Filter'` |
| `common.exportModal.tagFilterHint` | - | `'(empty = all tags)'` |
| `common.exportModal.includeAiSummary` | - | |
| `common.exportModal.includeAiSummaryDesc` | - | |
| `common.exportModal.countPreview` | `{{current}}, {{total}}` | `'{{current}} of {{total}} test cases will be exported'` |
| `common.exportModal.exportButton` | `{{format}}` | `'Export {{format}}'` — `{{format}}` 은 `'PDF'|'CSV'|'EXCEL'` 문자열 (영문 포맷 약어, AC-11) |
| (재사용) `common.close` (aria-label) / `common.cancel` | - | 기존 |

### `runs.detail.focusMode.*` (기존 `runs.detail.*` 트리 확장) — FocusMode

대략 40~60 키. Design Spec 최종 확정. 주요 하위 그룹:

| 그룹 | 키 프리픽스 | 예상 키 수 |
|------|-----------|-----------|
| 헤더 | `runs.detail.focusMode.header.*` (예: `counter` interpolation `{{index}}/{{total}}` / `exit`) | ~3 |
| 키보드 힌트 라벨 | `runs.detail.focusMode.kbdHint.*` (예: `comments` / `history` / `note` / `sidebar` / `search`) | ~5 (단축키 문자는 `{{shortcut}}` prop) |
| 사이드바 | `runs.detail.focusMode.sidebar.*` (예: `progress` / `completed` interpolation `{{count}}/{{total}}` / `filter.all` / `filter.passed` … / `searchPlaceholder` / `empty` / `openTooltip`) | ~10 |
| 본문 | `runs.detail.focusMode.body.*` (예: `previously` interpolation `{{status}}` / `precondition` / `attachmentsHeader` interpolation `{{count}}` / `testStepsHeader` / `passedSuffix` interpolation `{{count}}/{{total}}`) | ~8 |
| SS 버전 배너 | `runs.detail.focusMode.ssBanner.*` (예: `newVersionPrefix` interpolation `{{customId}}, {{name}}, {{version}}` / `lockedHint` / `viewChanges` / `hideChanges` / `update` / `dismiss`) | ~6 |
| Comments / History collapsible panel | `runs.detail.focusMode.comments.*` / `.history.*` (empty 문구 / `loading` fallback) | ~4 |
| Note 영역 | `runs.detail.focusMode.note.*` (`placeholder` / `saveHint` interpolation `{{shortcut}}`) | ~2 |
| Linked Issues 섹션 (failed 일 때) | `runs.detail.focusMode.linkedIssues.*` | ~2 (재사용 `runs.detail.addResult.issues.*` 검토) |
| GitHub Issue Quick-Create 모달 | `runs.detail.focusMode.githubIssueModal.*` (재사용 `runs.detail.githubIssue.*` 검토) | ~5 |
| 상태 버튼 (footer) | `runs.detail.focusMode.statusButton.*` (재사용 `common.passed|failed|blocked|retest` + 신규 `skip`) | 1 신규 (skip) |
| Footer 내비 / 완료 안내 | `runs.detail.focusMode.footer.*` (예: `previous` / `next` / `lastTestHint`) | ~3 |
| Toast | `runs.detail.focusMode.toast.*` (예: `githubIssueCreated` interpolation `{{number}}` / `githubIssueFailed` interpolation `{{reason}}` / `saveFailed`) | ~3 |
| Lightbox | `runs.detail.focusMode.lightbox.*` (예: `alt` = 'Preview') | 1 |

### `.i18nignore` 신규 / 확인 규칙 (Design Spec 확정)

| 패턴 | 목적 | 상태 |
|------|------|------|
| `>PDF<` / `>CSV<` / `>Excel<` | ExportModal formats 약어 | 신규 (AC-11) — Designer 가 번역하면 불필요 |
| `>User<` | ProjectHeader `'User'` fallback | (Designer 가 신규 키로 번역) → allowlist 불필요 |
| `src/components/<name>.tsx` whole-file | 공유 컴포넌트 미번역 파일 ignore | AC-7 — 본 스펙에서 6 개 모두 완료하므로 **whole-file ignore 없음** |

---

## 11. 리스크

| 리스크 | 영향 | 완화 |
|-------|------|-----|
| **FocusMode 범위 오인** (Phase 2b run-detail 에서 이미 "focusMode" 키 일부 추가됨) | 미디엄 | 기존 `runs.detail.headerActions.focusMode` / `focusModeTooltip` 는 **run-detail page 의 버튼 라벨**. 본 스펙은 **FocusMode 컴포넌트 내부**. 서브트리가 겹치지 않도록 `runs.detail.focusMode.*` vs `runs.detail.headerActions.focusMode` 로 분리 유지. Designer 가 최종 확인. |
| **공유 컴포넌트의 맥락 차이** (DetailPanel 을 Run 맥락 vs TC 맥락에서 부르는데 라벨이 다른 경우) | 미디엄 | 기본은 `common.detailPanel.*` 단일 키. 맥락 차이가 큰 라벨 (예: "Add Result" 는 Run 모드 전용, TC 모드에서는 나타나지 않음) 은 **조건부 렌더** 로 이미 분리되어 있으므로 키 1개로 충분. 맥락 차이로 카피가 달라지는 케이스가 발생하면 Designer 가 `common.detailPanel.<feature>.<context>.*` 로 분리. |
| **Phase 2b 에서 추가된 common 파일 키와 중복** | 미디엄 | Designer 가 PR 리뷰에서 기존 `common.*` / `runs.detail.*` 를 grep 으로 재확인. 재사용 맵(§4-3) 엄격 준수. |
| **ProjectHeader 가 전 페이지 최상단 렌더 — 로컬 테스트 시 회귀 리스크 높음** | 하이 | PR 병합 전 반드시 **수동 스모크 테스트** — 로그인 → 프로젝트 이동 → 탭 이동 전수 → 프로젝트 전환 드롭다운 → 프로필 드롭다운. EN/KO 양쪽. RTL 은 OOS. |
| **StatusBadge 의 useMemo 리팩토링이 수십 개 호출처에 영향** | 미디엄 | StatusBadge API 시그니처 변경 없음 (props 동일). 내부 리팩토링만 — 호출처 코드 변경 없음. `tsc --noEmit` + `npm run test` 로 감지. |
| **Avatar `title` prop 이 외부에서 영문으로 전달되어 로컬 번역 불가** | 로우 | 본 스펙은 Avatar 내부 `'Avatar'` fallback만 번역. prop 번역은 호출처 책임. 이미 call site 대부분이 Phase 1/2b 에서 번역됨. |
| **빌드 사이즈** | 로우 | ~80~160 key × 2 locale ≈ 10~15 KB gzip. 허용. |
| **번역 품질 (특히 키보드 힌트 interpolation)** | 미디엄 | Designer 확정. Design Spec §3 용어 사전 승계. |
| **스캐너 SCOPE_DIRS 확장 시 false-positive 폭증** | 미디엄 | AC-7 A 안 (6 개 파일만 whitelist) 으로 위험 회피. B 안 (디렉터리 전체) 선택 시 미번역 파일을 `.i18nignore` 에 일괄 등록 → 관리 부담 증가 → A 안 권장. |
| **AC-6 키 수 상한 160 초과** | 미디엄 | Designer 가 재사용 맵(§4-3) 엄격 적용. 초과 시 서브 섹션 (DetailPanel 의 개별 탭) 을 후속 티켓으로 분리. |
| **SS Diff / GitHub Issue Modal 중복 키** (DetailPanel / FocusMode 둘 다 같은 UI 를 재현) | 미디엄 | Designer 가 `runs.detail.addResult.steps.*` 재사용을 검토. 재사용 불가 시 별도 키 신설 (카피 분기 명시). |
| **테스트 coverage 부족** — 6 개 공유 컴포넌트 중 StatusBadge · Avatar · ExportModal 은 RTL 유닛 테스트 0건. DetailPanel / FocusMode / ProjectHeader 도 없음 | 하이 | Phase 3 QA 리포트에서 **수동 regression 체크리스트** 작성 권장. `npm run test -- --run` 은 기존 127 테스트 회귀만 감지 — 본 스펙이 **새 테스트를 추가하지 않음**. 필요 시 follow-up 티켓 `f010-phase3-tests.md`. |

---

## 12. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1~AC-16)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (N/A — 프론트 전용)
- [x] RLS 정책이 정의되었는가 (N/A)
- [x] 플랜별 제한이 명시되었는가 (§4-7)
- [x] RBAC 권한 매트릭스가 있는가 (§4-6)
- [x] 변경 파일 목록이 구체적인가 (§7, 10 개 파일)
- [x] 엣지 케이스가 식별되었는가 (§8, 11건)
- [x] Out of Scope 이 명시되었는가 (§9, 13건)
- [x] i18n 키가 en/ko 둘 다 있는가 (§10 — 키 구조만; 실제 카피는 Design Spec)
- [ ] 관련 디자인 명세가 Approved 상태인가 — **후속 `design-spec-i18n-coverage-phase3-shared-components.md` 에서 확정**

---

## 13. 후속 작업 (이 스펙 머지 후 즉시 생성)

1. **`design-spec-i18n-coverage-phase3-shared-components.md`** — 본 Dev Spec §10 의 키 구조를 기반으로 EN/KO 실제 카피 확정. Phase 1 Design Spec §3~6 원칙 승계.
2. **`dev-spec-i18n-coverage-phase4-remaining-components.md`** — `src/components/` 의 나머지 미번역 파일 (CommandPalette / InlineEdit / KeyboardShortcutsHelp / LanguageSwitcher / EmptyState / ModalShell / StepEditor / SavedViewsDropdown / UpgradeBanner / TagChip / EnvironmentAIInsights / EnvironmentDropdown / EnvironmentFormModal / ProgressBar / SegmentedBar / StatusPill / LifecycleBadge / BulkActionBar / AITriggerButton / NotificationBell / SaveIndicator / PageLoader / Skeleton / CookieBanner / SEOHead / VirtualList) 등 약 25개 파일.
3. **`dev-spec-i18n-coverage-phase5-pages-remaining.md`** — `src/pages/` 중 미번역 페이지 (projects list / settings subpages / testcases list / sessions list / onboarding / admin / blog / pricing / legal 등) 약 150 파일 Epic. 스캐너 전수 리스트 선행.
4. **`f010-phase3-tests.md`** (선택) — 공유 컴포넌트 RTL 유닛 테스트 보강 (EN/KO language switch 런타임 검증).
5. **(선택) `f013-ai-locale-hint.md`** — Claude 프롬프트에 `user_locale` 힌트 주입해 AI 응답 자체를 KO 로 받기 (Phase 1 §13 후보 승계).
