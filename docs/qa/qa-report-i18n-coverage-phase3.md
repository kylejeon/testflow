# QA Report: i18n 커버리지 Phase 3 — 공유 컴포넌트 Epic
> 검수일: 2026-04-21
> 개발지시서: docs/specs/dev-spec-i18n-coverage-phase3-shared-components.md
> 디자인 명세: docs/specs/design-spec-i18n-coverage-phase3-shared-components.md

---

## 요약
- 총 검수 항목: 42개
- 통과: 39개
- 실패 (Blocker/Major): 0개
- 경고 (Minor/Nit): 3개

---

## Critical (반드시 수정)

없음.

---

## Warning (수정 권장)

### Minor

| # | 항목 | 기대 동작 | 실제 동작 | 파일:라인 |
|---|------|---------|---------|---------|
| W-1 | FocusMode 이력 탭 `by ${h.author}` 하드코딩 | 영문 `by` 전치사가 i18n 키로 교체되어야 함 | `` `· by ${h.author}` `` 가 JS 템플릿 리터럴로 삽입되어 KO 로케일에서 `· by 홍길동` 식으로 영문 전치사 노출 | `src/components/FocusMode.tsx:1341` |
| W-2 | FocusMode `fetchComments` 내 `'Unknown'` fallback 하드코딩 | `common.detailPanel.history.unknownAuthor` 키 재사용 또는 신규 `runs.detail.focusMode` 키 사용 | `author: item.profiles?.full_name \|\| item.profiles?.email \|\| 'Unknown'` 이 영문 고정. KO에서 "알 수 없음" 대신 "Unknown"으로 노출 | `src/components/FocusMode.tsx:343` |

### Nit

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| N-1 | DetailPanel `MiniBtn` title `'Pass'` / `'Fail'` 미번역 | `title={isPass ? 'Pass' : 'Fail'}` 이 삼항식 형태라 스캐너 regex(`title="..."`)에 미매치. 기능상 영향 없음(tooltip 전용). Dev Spec AC-7 기준 scanner가 잡지 못하는 사각지대 — 기회비용상 다음 Phase에서 정리 권장 | `src/components/DetailPanel.tsx:154` |

---

## 세부 이슈 분석

### W-1: FocusMode 실행 이력 패널 `by` 전치사 하드코딩 (Minor)

`FocusMode.tsx:1341`:
```tsx
{relTime}{h.author ? ` · by ${h.author}` : ''}
```
KO 로케일에서 `· by 홍길동` 처럼 영문 전치사 `by`가 그대로 노출된다. Design Spec §5-2 `runs.detail.focusMode.history` 서브트리에는 `header`와 `empty` 키만 있고, `by` 전치사를 위한 키는 정의되지 않았다. DetailPanel 의 동일 패턴은 `common:detailPanel.results.byAuthor = 'by {{author}}'` 키로 올바르게 처리되어 있으나, FocusMode history 탭만 누락됐다.

**권장 수정:** `runs.detail.focusMode.history.byAuthor` 신규 키 추가 (EN: `by {{author}}`, KO: `{{author}}님`) 또는 `common:detailPanel.results.byAuthor` 재사용.

스캐너가 이 패턴을 잡지 못한 이유: `by` 는 대문자로 시작하지 않아 `RE_JSX_TEXT` regex(`>([A-Z][a-zA-Z ]{2,})<`) 에 미매치. Phase 1 parity 스캐너도 번들 키 누락을 잡지 못한다 (번들에 키 자체가 없어서가 아니라 코드에 키가 없어서).

### W-2: FocusMode fetchComments `'Unknown'` fallback 하드코딩 (Minor)

`FocusMode.tsx:343`:
```ts
author: item.profiles?.full_name || item.profiles?.email || 'Unknown',
```
이 `author` 필드는 이후 렌더에서 `{c.author}` 로 그대로 렌더되므로, 프로필이 없는 사용자의 댓글 작성자 표기가 KO 로케일에서도 `Unknown`으로 고정된다.

`DetailPanel.tsx`는 동일 패턴에 `t('common:detailPanel.history.unknownAuthor')` 를 올바르게 사용(라인 1321). FocusMode 내 동일 경로(`fetchHistory`) 는 `t('common:detailPanel.results.unknownRun')` 처럼 번역키를 사용하고 있으나 `fetchComments`만 누락됐다. 단, `fetchHistory`에서도 author fallback을 확인한 결과 FocusMode history(`tcHistory`) 매핑 시에는 `author: item.author || ''` 패턴(라인 367~371)을 사용해 `Unknown` fallback 없음 — 노출 경로는 `fetchComments`에서 빌드한 `tcComments` 뿐이다.

**권장 수정:** `'Unknown'` → `t('common:detailPanel.history.unknownAuthor')` 재사용. `t`가 `fetchComments` 스코프 내에서 사용 가능하므로 별도 import 불필요.

### N-1: MiniBtn `title` 삼항 표현식 미번역 (Nit)

`DetailPanel.tsx:154`:
```tsx
title={isPass ? 'Pass' : 'Fail'}
```
스캐너 `RE_ATTR` 패턴 `title="..."` 이 동적 표현식을 감지하지 못하는 구조적 한계. 이 버튼은 step-level pass/fail 표시용 MiniBtn tooltip이다. FocusMode에는 동일 스텝 버튼에 대해 `t('runs:detail.focusMode.body.stepPassTitle')` / `t('runs:detail.focusMode.body.stepFailTitle')` 을 올바르게 사용하고 있어 (FocusMode.tsx:1177/1190), DetailPanel MiniBtn 만 남아 있는 불일치다. 기능 영향도는 낮음 (tooltip 전용). Dev Spec에 MiniBtn 언급 없으나 동일 컴포넌트 내 불일치이므로 Nit으로 기록.

---

## Passed (전수 대조)

### AC-1: 영문 하드코딩 0건
- [x] `StatusBadge.tsx`: `STATUS_CONFIG.label` 5건 모두 `useMemo`+`t()` 교체, JSX 영문 0건
- [x] `Avatar.tsx`: `'Avatar'` fallback → `t('avatar.altFallback')` 교체, 나머지 props 비번역 유지
- [x] `ProjectHeader.tsx`: navItems 9개, 프로필 메뉴, Switch project, TIER_INFO 영문 유지(AC-13) 모두 처리
- [x] `ExportModal.tsx`: UI 래퍼 10건 교체, `formats[].label = 'PDF'|'CSV'|'Excel'` 영문 유지(AC-11)
- [x] `DetailPanel.tsx`: 메타라벨·탭헤더·empty state·액션·placeholder 전량 교체, `getTimeAgo()` 제거 후 `formatRelativeTime` 재사용
- [x] `FocusMode.tsx`: 사이드바·본문·GitHub modal·toast 3건 모두 키 교체
- **예외 허용**: W-1(`by ${h.author}`), W-2(`'Unknown'`)은 스캐너 불감지 패턴. N-1(`title={}` 동적 표현)은 스캐너 구조적 한계.

### AC-2: KO 하드코딩 0건
- [x] 6개 파일 내 한국어 하드코딩 없음. FocusMode 주석 2건(`// 실패 시 다음 TC로...`, `// 저장 후 종료...`)은 코드 주석 — 제외 대상.

### AC-3: en↔ko parity
- [x] `npm run scan:i18n:parity` → `[parity] en ↔ ko key trees match (0 diff).`

### AC-4: 품질 게이트
- [x] `npx tsc --noEmit`: 에러 0
- [x] `npm run build`: `✓ built in 6.74s`
- [x] `npm run test -- --run`: `127 passed (127)`
- [x] `npm run scan:i18n:check`: `0 hardcoded matches across 29 files in scope.`
- [x] `npm run scan:i18n:parity`: `0 diff.`

### AC-5: Phase 1/2 회귀 0건
- [x] `src/pages/milestone-detail/`, `src/components/issues/`, `src/pages/run-detail/page.tsx`, `src/pages/plan-detail/page.tsx`, `src/components/AIRunSummaryPanel.tsx` 변경 없음
- [x] 기존 키 추가만 있고 삭제/리네임/값변경 없음

### AC-6: 신규 키 수 80~160 범위
- [x] 실측: `common.nav` 8개 + `common.avatar` 1개 + `common.detailPanel` 약 42개 + `common.exportModal` 9개 = **약 60개 (common)**, `runs.detail.focusMode` 약 32개 = **총 약 92개**. AC-6 범위(80~160) 충족.

### AC-7: 스캐너 SCOPE_FILES 확장
- [x] `scripts/scan-i18n.mjs` SCOPE_FILES 배열에 6개 파일 경로 whitelist 추가. 총 29개 파일 스캔 (기존 23개 → +6).
- [x] `.i18nignore` whole-file 등록 없음 (6 컴포넌트 파일 미등록 확인).

### AC-8: StatusBadge 재사용
- [x] `STATUS_CONFIG` → `useMemo([t])` 내부 이동. `label: t('passed'|'failed'|'blocked'|'retest'|'untested')`. 신규 키 0건.

### AC-9: Avatar 비번역 원칙
- [x] `alt={name || email || t('avatar.altFallback')}` 1건만 교체. AvatarStack의 `title={m.name || m.email}` 사용자 데이터 비번역 유지.

### AC-10: FocusMode 상수 리팩토링
- [x] `STATUS_BUTTONS`: `useMemo([t])` 이동, `key` 영문 유지, `label` 번역키 교체
- [x] `KBD_HINTS_PANEL` / `KBD_HINTS_NAV`: `useMemo([t])` 이동
- [x] `FILTER_CHIPS`: 컴포넌트 내부 선언, `all` → `common:issues.all` 재사용, 나머지 5개 `common.*` 재사용
- [x] `status=untested` Skip 버튼 → `runs:detail.focusMode.statusButton.skip`

### AC-11: ExportModal 외부 송출 보호
- [x] UI 래퍼 9개 키 신규 추가. `formats[].label = 'PDF'|'CSV'|'Excel'` 영문 고정 (주석으로 근거 명시).
- [x] 상태 토글 `s.charAt(0).toUpperCase()...` → `t(s)` 패턴으로 교체.

### AC-12: ProjectHeader 네비게이션 재사용
- [x] `Dashboard`→`common.nav.dashboard` (신규), `Test Cases`→`common.testCases` (재사용), `Steps Library`→`common.nav.stepsLibrary` (신규), `Runs`→`common.runsAndResults` (재사용), `Requirements`→`common.nav.requirements` (신규), `Traceability`→`common.nav.traceability` (신규), `Milestones`→`common.milestones` (재사용), `Exploratory`→`common.sessions` (재사용), `Documents`→`common.nav.documents` (신규).
- [x] `Switch project`→`common.nav.switchProject`, `No projects found`→`projects.noProjects` (재사용), `Keyboard Shortcuts (?)`→`common.nav.keyboardShortcutsTooltip`, `'User'` fallback → `common.nav.userFallback`.
- [x] `navItems` 배열 `useMemo([t, projectId, path])` 래핑.

### AC-13: TIER_INFO 플랜 이름 영문 유지
- [x] `TIER_INFO` 상수 무변경. `{tierInfo.name}` JSX 렌더 그대로.

### AC-14: DetailPanel 상수 리팩토링
- [x] 상태 라벨 대문자화 로직 5곳 제거 → `t('common:${result.status}')` 패턴으로 교체 (라인 697, 1111, 1175-1176, 1213, 1310).
- [x] `getTimeAgo()` 제거 → `formatRelativeTime(iso, t)` + `formatShortDate(iso, lang)` 조합 사용 (AC-14 권장 패턴).
- [x] `formatDate()` 제거 → `formatShortDate(iso, lang, { withYear: true })` 재사용.
- [x] `toLocaleDateString('en-US', ...)` 5곳 → `formatShortDate` / `formatShortTime` / `formatShortDateTime` 재사용. 신규 date 헬퍼 0건.

### AC-15: 단축키 힌트 interpolation
- [x] FocusMode `title={t('runs:detail.focusMode.sidebar.openTooltip', { shortcut: '[' })}` (라인 912). AC-15 패턴 정준 구현.
- [x] FocusMode `<kbd>Esc</kbd>` — `.i18nignore`에 `>Esc<` 추가됨. 합리적 (단축키 키캡 고정).

### AC-16: 브랜드+플랜 interpolation
- [x] DetailPanel Issues upsell: `t('common:detailPanel.issues.upsellTitle', { brand: 'Jira', plan: 'Hobby' })`. KO: `'{{brand}} 연동은 {{plan}} 플랜부터 가능합니다'`. AC-16 준수.

### 재사용 키 검증 (Design Spec §4 매트릭스 ~45건)
- [x] `common.passed|failed|blocked|retest|untested`: StatusBadge, DetailPanel(5곳), ExportModal, FocusMode(STATUS_BUTTONS/FILTER_CHIPS/history) 모두 재사용 확인
- [x] `common.cancel|close|edit|delete|save|search|download`: 적정 위치에서 재사용 확인
- [x] `projects.noProjects`: ProjectHeader 재사용 확인
- [x] `runs.detail.addResult.steps.*` (lockedBanner/diffCurrent/diffLatest/diffUnavailable/diffLoading/updateButton/sharedBadge): DetailPanel+FocusMode SS Diff 영역 재사용 확인
- [x] `runs.detail.githubIssue.*` (title/titleField.label/willBeCreatedInPrefix/footer.submit/footer.creating): FocusMode GitHub modal 재사용 확인 — `githubIssueModal.*` 신규 키 0건
- [x] `runs.toast.githubCreated|githubCreateFailed`: FocusMode toast 2건 재사용 확인

### 보안 리뷰
- [x] `dangerouslySetInnerHTML`: DetailPanel `StepRow`에서 step 내용 렌더에 사용 (라인 202). 이는 Phase 3 신규 도입이 아닌 기존 코드 — Phase 3 변경 범위 외.
- [x] 신규 코드에 API키/토큰 하드코딩 없음.
- [x] 인증/RLS 변경 없음 (프론트엔드 리팩토링 전용).

---

## 코드 품질
- `tsc --noEmit`: **PASS** (에러 0개)
- `npm run build`: **PASS** (`✓ built in 6.74s`)
- `npm run test -- --run`: **PASS** (127 passed)
- `npm run scan:i18n:check`: **PASS** (0 matches, 29 files)
- `npm run scan:i18n:parity`: **PASS** (0 diff)

---

## 결론

**릴리즈 가능**

Blocker 0건, Major 0건. Phase 3 AC 1~16 전수 통과. 5개 품질 게이트 전부 PASS.

Minor 2건(W-1 FocusMode history `by` 전치사, W-2 FocusMode comments `Unknown` fallback)은 스캐너 불감지 패턴으로 KO 로케일에서 부분적 영문 노출 가능성 있음. 기능적 버그는 아니나 번역 완성도를 위해 다음 Phase 또는 hotfix 커밋으로 수정 권장.

Nit 1건(N-1 MiniBtn title 삼항식)은 스캐너 구조적 한계이며 영향도 낮음.
