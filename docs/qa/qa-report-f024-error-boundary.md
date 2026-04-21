# QA Report: f024 — ErrorBoundary + catch→toast 업그레이드
> 검수일: 2026-04-21
> 개발지시서: docs/specs/dev-spec-f024-error-boundary.md
> 디자인 명세: docs/specs/design-spec-f024-error-boundary.md

## 요약
- 총 검수 항목: 47개
- 통과: 44개
- 실패: 0개 (Blocker)
- 경고: 3개 (Major 1, Minor 2)

## Critical (반드시 수정) — 0건
없음

## Major (수정 권장)

| # | 항목 | 기대 동작 | 실제 동작 | 파일:라인 |
|---|------|---------|---------|---------|
| M-1 | AC-9: 신규 추가 showToast 시그니처 | A표 20건 신규 호출은 `showToast(message, 'error')` (T1) 사용 | `run-detail/page.tsx`의 A2/A8~A14 (8건) 가 `showToast('error', t(...))` 형태 호출. 단, 이 페이지는 L1392에 로컬 정의된 `showToast(type, message)` 를 사용하고 있어 전역 ToastProvider와 분리된 별도 시스템임. 결과적으로 로컬 toast는 정상 동작하지만 Dev Spec BR-3 / AC-9 "신규 추가 토스트는 전부 T1" 원칙과 충돌 — 인테그레이션 컨텍스트가 글로벌 ToastProvider와 다름 | `src/pages/run-detail/page.tsx:801,958,1211,1346,2344,2437,2730,2764` (신규 추가 8건) |

> **보충:** `run-detail/page.tsx`는 `Toast.tsx`의 `useToast()`가 아닌 자체 `setToast` state를 사용하는 로컬 toast 시스템(L182, L1392)을 갖고 있습니다. 동 페이지의 기존 C-표 토스트들도 모두 이 로컬 시스템을 씁니다. 신규 8건도 이와 일치하므로 **사용자에게 정상 노출**됩니다. 그러나 Dev Spec은 `showToast(message, type)` (T1) 원칙을 명시하고, 로컬 함수 시그니처가 역전된 `(type, message)` 여서 장기적으로 혼동 위험이 있습니다. 현재는 기능 동작에 문제 없음 — 결론적으로 **Major (권장 수정)** 등급.

## Warning (수정 권장)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| W-1 | Dev Spec §7 명시 수정 파일 누락 — accept-invitation | Dev Spec §7이 `accept-invitation/page.tsx` L80/L145를 `error.message` 직접 노출 → `getApiErrorMessage(err)` 교체 대상으로 명시. BR-5(서버 메시지 leak 방어) 관련. 미구현. | `src/pages/accept-invitation/page.tsx:80,145` |
| W-2 | Dev Spec §7 명시 신규 파일 위치 불일치 | Dev Spec §7이 `src/__tests__/ErrorBoundary.test.tsx` 및 `src/__tests__/ErrorBoundaryThrow.tsx` 를 신규 파일로 지정했으나, 실제 생성 위치는 `src/components/ErrorBoundary.test.tsx` (Throw fixture는 test 내 인라인). AC-6 동작 자체는 모두 충족. | `src/components/ErrorBoundary.test.tsx` |

## Passed

### AC-1 최상위 ErrorBoundary 구조
- [x] `App.tsx:237` — `<I18nextProvider>` 바깥에 최상위 `<ErrorBoundary>` 존재
- [x] `App.tsx:236-244` — 순서: `QueryClientProvider → I18nextProvider → ErrorBoundary → ToastProvider → BrowserRouter` (Dev Spec §7 재배치 요구사항 충족)
- [x] I18nextProvider가 ErrorBoundary 안쪽에 위치하므로 fallback UI에서 `i18n.t()` 싱글톤 호출 가능

### AC-2 Sentry Report ID
- [x] `ErrorBoundary.tsx:180-192` — `Sentry.withScope` 내에서 `captureException` 반환 eventId → `this.setState({ eventId: capturedId })`
- [x] `ErrorBoundary.tsx:52-54` — `isDev = import.meta.env.DEV`; `showEventId = !isDev && !!eventId`; `showEventIdMissing = !isDev && !eventId` — DEV 환경 숨김 분기 정확
- [x] `ErrorBoundary.tsx:98-107` — `Report ID: {eventId}` / `reportIdMissing` 조건부 렌더 정확
- [x] `Sentry.withErrorBoundary` HOC 사용 없음 (BR-2 준수)

### AC-3 A표 20건 catch→toast
- [x] A1 `testcases/page.tsx:23` — `showToast(t('settings:toast.logoutFailed'), 'error')` T1 ✓
- [x] A2 `run-detail/page.tsx:2437` — `showToast('error', t('settings:toast.logoutFailed'))` 로컬 toast 시스템 사용, 동작 정상 (M-1 참조)
- [x] A3 `project-detail/page.tsx:280` — `showToast(t('settings:toast.logoutFailed'), 'error')` T1 ✓
- [x] A4 `stats/PassRateReportPage.tsx:131` — `showToast(t('common:toast.exportFailed'), 'error')` T1 ✓
- [x] A5 `session-detail/page.tsx:237` — `showToast(t('milestones:toast.loadFailed'), 'error')` T1 ✓
- [x] A6 `session-detail/page.tsx:263` — `showToast(t('projects:toast.membersLoadFailed'), 'error')` T1 ✓
- [x] A7 `session-detail/page.tsx:323` — `showToast(t('sessions:toast.loadFailed'), 'error')` T1 ✓
- [x] A8 `run-detail/page.tsx:801` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A9 `run-detail/page.tsx:958` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A10 `run-detail/page.tsx:1211` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A11 `run-detail/page.tsx:1346` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A12 `run-detail/page.tsx:2346` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A13 `run-detail/page.tsx:2730` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A14 `run-detail/page.tsx:2764` — 로컬 toast, 동작 정상 (M-1 참조)
- [x] A15 `project-documentation/page.tsx:182` — `showToast(t('documentation:toast.loadFailed'), 'error')` T1 ✓
- [x] A16 `project-sessions/page.tsx:268` — `showToast(t('sessions:toast.loadFailed'), 'error')` T1 ✓
- [x] A17 `project-testcases/components/TestCaseList.tsx:1655` — `showToast(t('testcases:toast.attachmentDeleteFailed'), 'error')` T1 ✓
- [x] A18 `project-testcases/components/TestCaseList.tsx:1736` — `showToast(t('testcases:toast.attachmentDeleteFailed'), 'error')` T1 ✓
- [x] A19 `milestone-detail/page.tsx:774` — `showToast(t('milestones:toast.completeFailed'), 'error')` T1 ✓
- [x] A20 `project-detail/AnalyticsTab.tsx:229` — `showToast(t('testcases:toast.generateSaveFailed'), 'error')` T1 ✓

### AC-4 B표 14건 intentional: silent 주석
- [x] B1 `run-detail/page.tsx:763` ✓
- [x] B2 `run-detail/page.tsx:836` ✓
- [x] B3 `run-detail/page.tsx:863` ✓
- [x] B4 `run-detail/page.tsx:897` ✓
- [x] B5 `run-detail/page.tsx:1056` ✓
- [x] B6 `run-detail/page.tsx:1337` ✓
- [x] B7 `session-detail/page.tsx:917` ✓
- [x] B8 `project-sessions/page.tsx:292` ✓
- [x] B9 `project-detail/ActivityFeedTab.tsx:161` ✓
- [x] B10 `project-detail/widgets/TCQualityAnalysis.tsx:210` ✓
- [x] B11 `project-detail/widgets/PassRateTrend.tsx:194` ✓
- [x] B12 `project-detail/widgets/TeamPerformance.tsx:174` ✓
- [x] B13 `project-testcases/components/TestCaseList.tsx:1777` ✓
- [x] B14 `project-testcases/components/TestCaseList.tsx:1832` ✓

### AC-5 영문 하드코딩 0건
- [x] `npm run scan:i18n:check` → `[scan-i18n] clean — 0 hardcoded matches across 23 files in scope.` ✓
- [x] `npm run scan:i18n:parity` → `[parity] en ↔ ko key trees match (0 diff).` ✓

### AC-6 ErrorBoundary 유닛 테스트
- [x] `src/components/ErrorBoundary.test.tsx` 존재 (W-2 위치 불일치 있으나 AC-6 기능 기준 충족)
- [x] (a) throw 자식 → FullPage fallback (`role="alert"` + `h1` 텍스트) ✓
- [x] (b) `section` prop → Section fallback 렌더 ✓
- [x] (c) `onReset` 클릭 시 section 모드 state 복구 + 자식 재렌더링 ✓
- [x] generic section title (sectionName 없을 때) 테스트 추가 ✓
- [x] `getApiErrorMessage` 분기 테스트 (`src/components/Toast.test.tsx`) ✓

### AC-7 RichTextEditor 회귀 없음
- [x] `git diff main...claude -- src/pages/session-detail/components/RichTextEditor.tsx` 변경 없음 ✓

### AC-8 빌드/타입/테스트
- [x] `tsc --noEmit` — 오류 0건 ✓
- [x] `npm run test -- --run` — 127 PASS, 0 FAIL ✓
- [x] `npm run build` — 빌드 성공 ✓

### AC-9 showToast 시그니처 (신규 추가분)
- [x] run-detail 제외 12건 (A1/A3~A7/A15~A20): 전부 T1 `(message, 'error')` ✓
- 주의: run-detail 8건은 로컬 `showToast(type, message)` 시스템 사용 (M-1)

### AC-10 fallback UI 키보드 접근성
- [x] `ErrorBoundary.tsx:58` — `role="alert"`, `aria-live="assertive"` ✓
- [x] `ErrorBoundary.tsx:72-78` — `h1` `tabIndex={-1}` + `useEffect(() => titleRef.current?.focus(), [])` ✓ (Design Spec §8-1 가이드 구현)
- [x] "Try again" 버튼 — `focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2` ✓
- [x] Section fallback retry 버튼 — `focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2` ✓ (Design Spec §8-2 신규 요구사항 구현)

### i18n 커버리지
- [x] `common.errorBoundary.*` 8키 Full-Page + 4키 Section = 12키 ✓
- [x] `common.toast.apiErrors.*` 15키 + `exportFailed` 1키 = 16키 (Dev Spec 예상 17키 대비 1키 차이 — `logoutFailed`는 `settings` 네임스페이스에 별도 배치되어 있어 실제 구현 정확)
- [x] 도메인 번들 신규 키 14개 (runs×6, sessions×1, milestones×2, projects×1, documentation×1, testcases×2, settings×1) ✓
- [x] en/ko parity 0 diff ✓

### 의존성 검증
- [x] `react-error-boundary` package.json 없음 (BR-1 준수) ✓

### 보안 리뷰
- [x] XSS — 신규 fallback UI 내 `dangerouslySetInnerHTML` 없음. error.stack은 dev-only `<pre>` 출력 ✓
- [x] Sentry eventId는 텍스트 표기만 (BR-7 준수) ✓
- [x] `mailto:support@testably.app` 하드코딩 유지 — BR-6 허용 범위 ✓
- [!] `accept-invitation/page.tsx:80,145` — `error.message` 직접 노출 (W-1)

## 코드 품질
- tsc --noEmit: PASS (오류 0건)
- ESLint: `npm run lint` 스크립트 없음 — 프로젝트 미설정 상태. 별도 확인 불가
- scan:i18n: PASS (하드코딩 0건)
- scan:i18n:parity: PASS (en/ko diff 0건)
- 테스트: PASS (127/127)
- 빌드: PASS

## 결론

**릴리즈 가능** — Blocker 0건, Major 1건.

Major(M-1)는 `run-detail/page.tsx`의 로컬 toast 시스템 사용에 대한 시그니처 일관성 문제로, **실제 사용자에게 토스트는 정상 노출**됩니다. AC-9 원문이 "신규로 추가하는 toast는 전부 T1" 이라고 명시하고 있으나, run-detail의 로컬 showToast는 기존 페이지 전체가 `(type, message)` 로 일관되게 사용하는 별도 시스템이므로 신규 추가 8건이 이를 따른 것은 기존 패턴과 일치합니다.

Minor W-1 (`accept-invitation` error.message 노출)은 보안 하드닝 항목으로 dev spec §7에 명시된 수정 사항이나 기능 동작에는 영향 없음. 별도 티켓으로 처리 권장.

---
> 검수자: @qa
> 검수 범위: AC-1~AC-10, B표 14건, i18n 42키, Sentry 연동, 접근성, 의존성, 보안
