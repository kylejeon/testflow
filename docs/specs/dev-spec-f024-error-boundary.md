# Dev Spec: f024 — 전역 ErrorBoundary + catch→toast 일괄 업그레이드

> **작성일:** 2026-04-21
> **작성자:** PM (@planner)
> **상태:** Draft → Review → Approved
> **관련 디자인:** `docs/specs/design-spec-f024-error-boundary.md` (Designer 개입 필요 — 본 문서 §12 참고)
> **소스 티켓:** `feature_list.json` f024 (Polish_Audit Quick Wins 1순위, P1 / impact: high, effort: medium)

---

## 1. 개요

- **문제:** 현재 앱이 예기치 못한 오류를 만나면 두 가지 방식으로 **무음(silent)** 상태가 된다.
  1. **렌더링 중 throw**: RichTextEditor 내부에만 ErrorBoundary가 있다고 티켓 설명에 기술됐으나, 실제로는 `src/App.tsx`에도 최상위 `ErrorBoundary`가 이미 wrap되어 있다(App.tsx:232, 190). 다만 **fallback UI가 영문 하드코딩**이고 Sentry event ID 노출도 없어 "무음 제품 인상"을 여전히 준다.
  2. **이벤트 핸들러 catch**: `src/pages/**`에서 **44개 파일, 185개 `console.error`** — 그중 사용자에게 토스트를 안 띄우는 진짜 "사일런트 catch"가 다수. 동작은 실패했는데 유저는 뭐가 잘못됐는지 모른다.
- **해결:**
  1. **최상위 ErrorBoundary 유지 + i18n화 + Sentry event ID 노출**로 렌더링 에러 피드백 품질 상향.
  2. **`catch { console.error }` 일괄 교체 규칙**을 세워 사용자 액션성 실패는 전부 `showToast(message, 'error')`로 통일. 배경 동기화류는 **의도적 사일런트 주석**으로 구분.
- **성공 지표:**
  - `grep -rn "console.error" src/pages`에서 "사용자 액션 실패인데 토스트 없음" 지점 = 0 (QA 체크리스트로 검증).
  - Sentry `Unhandled Render Error` 이벤트에 `release` + `componentStack` + `error_boundary` 태그가 항상 붙음.
  - fallback UI + 신규 토스트 메시지 모두 `scan:i18n:check` 통과 (영문 하드코딩 0).

---

## 2. 유저 스토리

- As a **테스터(Tester 역할)**, I want to see a toast whenever an action fails, so that I know my click actually did something and can retry intentionally instead of wondering if the app is frozen.
- As a **오너/관리자(Owner/Admin)**, I want the full-page crash screen to show a report ID, so that when I email support I can give them a concrete reference they can look up in Sentry.
- As a **한국어 사용자(KO locale)**, I want the crash screen and every error toast in Korean, so that the product doesn't feel half-localized.
- As a **개발자**, I want `console.error` to stay in place alongside toasts, so that DevTools-level diagnosis is unchanged while UX becomes noisy-in-a-good-way.

---

## 3. 수용 기준 (Acceptance Criteria)

> 모두 테스트 가능한 문장으로만 기입.

- [ ] **AC-1 (최상위 Boundary 존재 확인):** `src/App.tsx` 최상위 `<ErrorBoundary>` wrap 유지 + 의도적 `throw` 컴포넌트(예: `__tests__/ErrorBoundaryThrow.tsx`)를 렌더했을 때 전체 화면 fallback이 3초 내에 노출된다.
- [ ] **AC-2 (Sentry 리포트 ID 노출):** 전역 ErrorBoundary가 `Sentry.captureException` 호출 시 반환되는 `eventId`를 state에 보관하고, fallback UI에 `Report ID: {eventId}` 라인으로 표시한다. Sentry DSN이 비어있을 때(dev 환경)는 이 라인이 **렌더되지 않는다**(빈 문자열 처리).
- [ ] **AC-3 (catch→toast 일괄 교체):** `src/pages/**/*.tsx`의 `catch (...) { console.error(...) }` 패턴 중 **사용자 액션 실패 지점 최소 15건**이 `showToast(t('common:toast.somethingWentWrong' 또는 도메인 키), 'error')` 호출을 포함한다. 대상 파일 15건은 본 문서 §6-3의 **A(행동 필요)** 표와 1:1 대응한다.
- [ ] **AC-4 (의도적 사일런트 주석):** 사용자 inaction catch(배경 사전 프리페치, 재시도 루프 내부 등)는 토스트를 추가하지 않고 `// intentional: silent — <이유>` 주석이 반드시 위에 붙는다. §6-3의 **B(사일런트 허용)** 표와 1:1 대응.
- [ ] **AC-5 (영문 하드코딩 0):** `npm run scan:i18n:check` 통과. 신규 fallback UI·toast 메시지에서 `t(...)` 없이 영문 리터럴 0건(단 `.i18nignore`에 기록된 PDF 템플릿 등 기존 예외는 유지).
- [ ] **AC-6 (ErrorBoundary 유닛 테스트):** `src/__tests__/ErrorBoundary.test.tsx` 추가 — (a) throw하는 자식 → FullPage fallback 렌더, (b) `section` prop true일 때 Section fallback, (c) `onReset` 클릭 시 section 모드에서 state가 복구되고 자식이 재렌더링됨. vitest `npm run test -- --run`에서 전부 PASS.
- [ ] **AC-7 (기존 RichTextEditor 회귀 없음):** `src/pages/session-detail/components/RichTextEditor.tsx`(및 내부 `QuillEditor`)의 **기존 에디터 로컬 에러 처리 경로가 변경되지 않는다** — 본 티켓은 이 컴포넌트 내부 ErrorBoundary wrap 존재 여부만 유지/확인하고 코드 수정 금지(§9 Out of Scope).
- [ ] **AC-8 (빌드/타입/테스트):** `npm run build`, `tsc --noEmit`, `npm run test -- --run` 모두 PASS.
- [ ] **AC-9 (showToast 시그니처 정합):** 신규 추가·수정되는 모든 `showToast` 호출은 `(message: string, type?: ToastType)` 시그니처(§6-2)를 따른다. 버그 시그니처 `showToast('error', message)` 신규 도입 금지. 기존 버그 시그니처 수정은 §9 Out of Scope로 분리.
- [ ] **AC-10 (fallback UI 키보드 접근):** FullPage fallback에 `role="alert"`, `aria-live="assertive"` 유지 + "Reload page" 버튼이 `focus-visible` 상태를 유지하며 Enter·Space로 작동한다.

---

## 4. 기능 상세

### 4-1. 동작 흐름 (Flow)

**렌더링 에러 (Happy→Crash Path):**
1. 유저가 아무 페이지에서 렌더링 중 예외(`throw`, undefined 참조 등)를 유발하는 동작을 한다.
2. React가 Error를 throw → 가장 가까운 `<ErrorBoundary>`가 `getDerivedStateFromError`로 `hasError: true`로 전환.
3. `componentDidCatch`가 실행:
   - Chunk-load error면 `sessionStorage` 기반 1회 자동 reload (기존 로직 유지).
   - 그 외에는 `Sentry.withScope` 안에서 `captureException(error)` → 반환된 `eventId`를 `this.state.eventId`에 저장.
4. fallback UI 렌더:
   - **Full-page 모드 (`section` prop 없음)**: 로고 + i18n 제목 + i18n 설명 + "Reload page" / "Go to Dashboard" 버튼 + Sentry eventId가 있으면 "Report ID: XXX" 하단 표기.
   - **Section 모드 (`section` prop true)**: 카드형 작은 fallback + "Retry" 버튼(기존 동작 유지, 텍스트만 i18n화).
5. 유저가 "Reload page" 클릭 → `window.location.reload()`. "Retry" 클릭 → state 초기화 후 재렌더.

**이벤트 핸들러 에러 (Toast Path):**
1. 유저가 버튼 클릭 등으로 async 작업 트리거(예: "Save Session").
2. async 작업 실패 → `catch (error)` 진입.
3. (a) `console.error('<작업명> failed:', error)` — DevTools용, 유지.
4. (b) `showToast(t('<도메인>:toast.<액션>Failed', { reason: errorOrFallback }), 'error')` — 신규.
5. 토스트가 6초간 노출 → 자동 dismiss, 유저는 "아 실패했구나" 인지.

**대안 흐름:**
- 네트워크 끊김 + 재시도: 별도 retry-with-backoff 티켓(§9). 본 티켓은 "1회 실패 → 토스트" 레벨만 처리.
- Session expired (401): `getApiErrorMessage`가 이미 "Session expired. Please log in again." 반환 — 본 티켓은 이 헬퍼 재사용 권장(§6-4).

**에러 흐름 (메타):**
- ErrorBoundary 자체가 throw하면 React는 상위 boundary로 위임 → 본 앱은 App.tsx가 최상위라 Unhandled → 브라우저 콘솔. 실질 영향 거의 0. 신규 fallback 컴포넌트는 **state 없이 pure**하게 유지(이미 그러함).

### 4-2. 비즈니스 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | ErrorBoundary는 **class component** 유지 (React 19에서도 공식). `react-error-boundary` 의존성 추가 금지. | 번들 사이즈 + 의존성 최소. 리스크 §11 참조. |
| BR-2 | `Sentry.withErrorBoundary` HOC와 custom `ErrorBoundary`를 **중복 레이어링 금지**. custom이 내부에서 `Sentry.captureException` 호출하는 현 방식만 사용. | 이벤트 중복 방지. |
| BR-3 | 사용자 직접 액션 catch는 반드시 토스트 — 예외 없이. | AC-3 기준. |
| BR-4 | 배경 동기화·사전 프리페치·실패해도 기능 유지 가능한 catch는 **사일런트 허용 + 주석 필수**. | AC-4 기준. |
| BR-5 | `error.message`를 토스트에 직접 노출할 때는 도메인 키의 `{{reason}}` 슬롯으로만 전달(`t('runs:toast.jiraCreateFailed', { reason: error.message })` 패턴). 일반 fallback은 `t('common:unknownError')`. | 서버 내부 노출 방지 + i18n 유지. |
| BR-6 | fallback UI는 **이메일 주소·내부 경로 하드코딩 금지** — `support@testably.app` mailto는 허용(이미 공용 정보). | 기존 구현 유지. |
| BR-7 | Sentry eventId는 **클립보드 복사 버튼 없이 텍스트로만** 표시(본 티켓 범위). 복사 버튼은 별도 티켓. | 범위 고정. |

### 4-3. 권한 (RBAC)

ErrorBoundary·토스트 자체는 **전 역할 공통 UX 인프라**. 별도 권한 차등 없음.

| 역할 | 조회 | 생성 | 수정 | 삭제 |
|------|------|------|------|------|
| Owner | ✓ | - | - | - |
| Admin | ✓ | - | - | - |
| Manager | ✓ | - | - | - |
| Tester | ✓ | - | - | - |
| Viewer | ✓ | - | - | - |
| Guest | ✓ | - | - | - |

> Guest(비로그인)도 랜딩·가격·문서 페이지에서 크래시가 날 수 있으므로 fallback UI를 보게 된다. Sentry 리포트에는 `user: null`로 기록됨(기존 `setSentryUser` 로직 유지).

### 4-4. 플랜별 제한

본 티켓은 **UX 인프라** — 플랜 차등 없음.

| 플랜 | 제한 | 초과 시 동작 |
|------|------|-------------|
| Free | 없음 | - |
| Hobby | 없음 | - |
| Starter | 없음 | - |
| Professional | 없음 | - |
| Enterprise S/M/L | 없음 | - |

---

## 5. 데이터 설계

**DB 변경 없음.** 이 기능은 순수 프론트엔드 UX 업그레이드.

- 신규 테이블: 없음
- 기존 테이블 변경: 없음
- RLS 정책: 변경 없음
- Supabase Edge Function: 변경 없음

(Sentry는 외부 SaaS로 이벤트 수집 — Supabase와 무관)

---

## 6. API 설계 / 프론트엔드 계약

본 티켓은 API 변경이 없고, **프론트엔드 컴포넌트 계약 + 교체 규칙**이 핵심. 아래 4개 섹션으로 구성.

### 6-1. ErrorBoundary 컴포넌트 계약

**파일**: `src/components/ErrorBoundary.tsx` (기존 파일 수정)

**기존 Props 유지 + 신규 state 필드:**
```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;          // 기존 유지
  section?: boolean;              // 기존 유지
  sectionName?: string;           // 기존 유지
}

interface State {
  hasError: boolean;
  error: Error | null;
  eventId: string | null;         // 신규: Sentry captureException 반환값
}
```

**`componentDidCatch` 변경 diff (의사코드):**
```typescript
componentDidCatch(error: Error, info: React.ErrorInfo) {
  console.error('[ErrorBoundary]', error, info);
  if (isChunkLoadError(error) && !this.props.section) { /* 기존 reload 로직 유지 */ }

  // 기존: Sentry.captureException(error) — 반환값 무시
  // 신규: eventId를 state에 저장
  let capturedId: string | null = null;
  Sentry.withScope((scope) => {
    if (this.props.sectionName) scope.setTag('error_boundary', this.props.sectionName);
    scope.setExtra('componentStack', info.componentStack);
    scope.setExtra('isChunkLoadError', isChunkLoadError(error));
    capturedId = Sentry.captureException(error);
  });
  this.setState({ eventId: capturedId });
}
```

**Fallback UI 변경점:**
- `FullPageFallback({ error, eventId, onReset, t })` — `t` 주입(함수 컴포넌트이므로 상위에서 `useTranslation()` → prop으로 전달, 또는 내부에서 `useTranslation()` 직접 호출).
- 하드코딩 영문 → `t('common:errorBoundary.title')`, `t('common:errorBoundary.description')`, `t('common:errorBoundary.reload')`, `t('common:errorBoundary.goHome')`, `t('common:errorBoundary.sendReport')` 등.
- `eventId && <p className="...">Report ID: {eventId}</p>` 추가. 라벨 자체는 `t('common:errorBoundary.reportId', { id: eventId })`.
- `SectionFallback` 내부 문구도 `t('common:errorBoundary.section.*')`로 키화.

> **주의:** class component의 `render()`에서 `useTranslation()` 직접 호출 불가. → fallback 부분만 함수 컴포넌트로 분리(이미 분리됨)하여 그 내부에서 `useTranslation()` 호출하면 OK. **단, 최상위 ErrorBoundary가 I18nextProvider보다 바깥에 위치**하면(App.tsx:232) fallback에서 `t()` 호출 시 i18n context가 없어서 fallbackLng 리터럴이 나온다. → **해결책:** 최상위 ErrorBoundary만 `i18n` 싱글톤을 직접 import해서 `i18n.t(...)` 호출(hook 대신). 또는 App.tsx 구조를 `<I18nextProvider><ErrorBoundary>...</ErrorBoundary></I18nextProvider>`로 재배치. 본 스펙은 **후자 권장** (한 줄 스왑). 단, QueryClientProvider는 바깥에 두어도 무방. 디자이너/개발자 리뷰 요망.

### 6-2. Toast 호출 컨벤션 (정답 = T1)

**올바른 시그니처 (Toast.tsx L121):**
```typescript
showToast(message: string, type?: ToastType = 'error')
// 예시
showToast(t('runs:toast.commentSaveFailed'), 'error');
showToast(t('common:toast.somethingWentWrong'), 'error');
```

**버그 시그니처 (✗ 금지):**
```typescript
showToast('error', error?.message || t('runs:toast.commentSaveFailed'));
// ↑ 'error' 문자열이 message가 되고 번역된 실패 메시지가 type 위치로 가서 type cast 실패 → 기본 error variant로 fallback.
// 실제 유저에겐 항상 빨간 토스트에 "error" 텍스트만 보임.
```

**f024 범위 규칙:** 신규로 추가하는 toast는 전부 T1. 기존 T2 버그 수정은 §9 Out of Scope — 별도 티켓.

### 6-3. `catch → toast` 교체 대상 목록

grep 결과 기반 실제 지점들. **A = 사용자 액션 실패 → 토스트 추가 (AC-3 대상)**, **B = 배경·사전 프리페치 → `// intentional: silent` 주석 추가 (AC-4 대상)**, **C = 이미 토스트 있음 → 변경 없음**.

#### A. Toast 추가 필요 (사용자 액션 실패)

| # | 파일 | 라인 | 현재 catch 내용 | 조치 (토스트 키) | 비고 |
|---|------|------|----------------|------------------|------|
| A1 | `src/pages/testcases/page.tsx` | 17-19 | `Logout failed` | `t('settings:toast.logoutFailed')` (신규 키) | Logout은 UX 중요 |
| A2 | `src/pages/run-detail/page.tsx` | 2424-2426 | `Logout failed` | 동일 키 재사용 | 같은 Logout |
| A3 | `src/pages/project-detail/page.tsx` | 274-276 | `Logout failed` | 동일 키 재사용 | 같은 Logout |
| A4 | `src/pages/stats/PassRateReportPage.tsx` | 125-127 | Export PDF error | `t('common:toast.exportFailed')` (신규) | Report export |
| A5 | `src/pages/session-detail/page.tsx` | 233-235 | Fetch milestones | `t('milestones:toast.loadFailed')` (기존 재사용/신규) | 데이터 로딩 실패 사용자 인지 필요 |
| A6 | `src/pages/session-detail/page.tsx` | 258-260 | Fetch project members | `t('projects:toast.membersLoadFailed')` (신규) | |
| A7 | `src/pages/session-detail/page.tsx` | 317-319 | Fetch session data | `t('sessions:toast.loadFailed')` (신규) | |
| A8 | `src/pages/run-detail/page.tsx` | 798-800 | 코멘트 로딩 | `t('runs:toast.commentsLoadFailed')` (신규) | |
| A9 | `src/pages/run-detail/page.tsx` | 951-953 | 결과 로딩 | `t('runs:toast.resultsLoadFailed')` (신규) | |
| A10 | `src/pages/run-detail/page.tsx` | 1202-1204 | 데이터 로딩 | `t('runs:toast.loadFailed')` (신규) | fetchData — 핵심 |
| A11 | `src/pages/run-detail/page.tsx` | 1335-1337 | Run status 업데이트 실패 | `t('runs:toast.statusUpdateFailed')` (기존) | |
| A12 | `src/pages/run-detail/page.tsx` | 2334-2336 | 첨부파일 삭제 | `t('runs:toast.attachmentDeleteFailed')` (신규) | |
| A13 | `src/pages/run-detail/page.tsx` | 2716-2718 | Assignee 업데이트 | `t('runs:toast.assigneeUpdateFailed')` (신규) | |
| A14 | `src/pages/run-detail/page.tsx` | 2749-2751 | Bulk assignee 업데이트 | `t('runs:toast.assigneeBulkUpdateFailed')` (신규) | |
| A15 | `src/pages/project-documentation/page.tsx` | 178-180 | 데이터 로딩 | `t('documentation:toast.loadFailed')` (신규) | |
| A16 | `src/pages/project-sessions/page.tsx` | 264-266 | 데이터 로딩 | `t('sessions:toast.loadFailed')` (A7와 재사용) | |
| A17 | `src/pages/project-testcases/components/TestCaseList.tsx` | 1651-1653 | 첨부파일 삭제 | `t('testcases:toast.attachmentDeleteFailed')` (신규) | |
| A18 | `src/pages/project-testcases/components/TestCaseList.tsx` | 1731-1733 | File delete error | 동일 키 재사용 | |
| A19 | `src/pages/milestone-detail/page.tsx` | 772-774 | complete error | `t('milestones:toast.completeFailed')` (신규) | |
| A20 | `src/pages/project-detail/AnalyticsTab.tsx` | 223-225 | save generated TCs | `t('testcases:toast.generateSaveFailed')` (신규) | |

→ **20건** (목표 15건 이상 달성).

#### B. 사일런트 허용 + 주석 추가 (배경/프리페치/미표시 실패)

| # | 파일 | 라인 | 현재 | 조치 | 사일런트 사유 |
|---|------|------|------|------|--------------|
| B1 | `src/pages/run-detail/page.tsx` | 762-764 | 현재 사용자 로딩 | `// intentional: silent — user info prefetch; UI falls back gracefully` | 다른 경로로 재시도 |
| B2 | `src/pages/run-detail/page.tsx` | 833-835 | Jira 설정 로딩 | `// intentional: silent — integration config prefetch; UI hides Jira CTA if absent` | |
| B3 | `src/pages/run-detail/page.tsx` | 859-861 | GitHub 설정 로딩 | 동일 패턴 | |
| B4 | `src/pages/run-detail/page.tsx` | 892-894 | 프로젝트 멤버 로딩 | `// intentional: silent — members prefetch for autocomplete` | |
| B5 | `src/pages/run-detail/page.tsx` | 1049-1051 | auto-link | `// intentional: silent — background auto-link, retried on next run` | |
| B6 | `src/pages/run-detail/page.tsx` | 1328-1330 | plan-status update | `// intentional: silent — secondary rollup; next poll retries` | |
| B7 | `src/pages/session-detail/page.tsx` | 911-913 | Jira 설정 로딩 | B2와 동일 사유 | |
| B8 | `src/pages/project-sessions/page.tsx` | 288-290 | 프로필 로딩 | `// intentional: silent — profile prefetch; defaults applied` | |
| B9 | `src/pages/project-detail/ActivityFeedTab.tsx` | 160-162 | AIDailySummary | `// intentional: silent — AI summary optional; panel hides on error` | |
| B10 | `src/pages/project-detail/widgets/TCQualityAnalysis.tsx` | 209-211 | widget 실패 | `// intentional: silent — analytics widget; ErrorBoundary(section) handles render errors` | |
| B11 | `src/pages/project-detail/widgets/PassRateTrend.tsx` | 193-195 | widget 실패 | 동일 패턴 | |
| B12 | `src/pages/project-detail/widgets/TeamPerformance.tsx` | 173-175 | widget 실패 | 동일 패턴 | |
| B13 | `src/pages/project-testcases/components/TestCaseList.tsx` | 1772-1775 | 멤버 조회 | `// intentional: silent — members autocomplete prefetch` | |
| B14 | `src/pages/project-testcases/components/TestCaseList.tsx` | 1826-1828 | 코멘트 로드 | `// intentional: silent — comments hydration; empty state safe` | |

→ **14건**.

#### C. 이미 토스트 있음 (변경 없음)

`grep "showToast" + console.error` 같이 쓰는 지점들 — `src/pages/run-detail/page.tsx` L1246/L1262/L1526/L1614/L1986/L2299/L2395/L2402/L2573/L2628 등. **단, AC-9 관점에서 `showToast('error', ...)` 버그 시그니처가 다수 존재 → 수정은 별도 티켓으로 분리.** 본 티켓에서는 **새로 추가하는 toast만 T1 시그니처 준수**.

#### D. Auth 페이지 (특수 케이스)

| 파일 | 라인 | 조치 |
|------|------|------|
| `src/pages/auth/page.tsx` | 246-249 / 273-275 / 308-310 / 496-498 | 이미 `throw err`로 상위로 전파하거나 로그인 플로우 내 별도 UI 처리 — **변경 없음**. 변경하면 auth UX 회귀 리스크. |
| `src/pages/accept-invitation/page.tsx` | 77-81 / 142-146 | 이미 `setStatus('error')`로 inline 안내 표기 — 토스트 추가 대신 기존 inline UX 유지. **단, `error.message` 직접 노출 부분은 `getApiErrorMessage(err)` 사용 권장**(§6-4). |

### 6-4. 공통 헬퍼 활용

- `getApiErrorMessage(error)` (`src/components/Toast.tsx` L148-190)가 이미 Supabase/HTTP/네트워크 에러를 사람이 읽을 수 있는 문구로 매핑한다 → 도메인 키가 마땅치 않은 fallback toast는 `showToast(getApiErrorMessage(err), 'error')` 또는 `t('common:toast.somethingWentWrong')`.
- **주의:** `getApiErrorMessage` 자체는 **영문 리터럴 반환** — 본 티켓 범위로 i18n화 필수. §7 수정 파일 목록에 포함.

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/__tests__/ErrorBoundary.test.tsx` | AC-6 유닛 테스트 (throw 자식 → fallback, section 모드, onReset 복구) |
| `src/__tests__/ErrorBoundaryThrow.tsx` | 테스트 전용 throw fixture 컴포넌트 |

### 수정 파일

| 파일 | 변경 내용 |
|------|---------|
| `src/components/ErrorBoundary.tsx` | (1) `State`에 `eventId` 추가, (2) `componentDidCatch`에서 captureException 반환값 저장, (3) `FullPageFallback`/`SectionFallback` 문구 `i18n.t(...)` 치환, (4) Report ID 라인 추가 |
| `src/App.tsx` | `<I18nextProvider>`를 `<ErrorBoundary>` 바깥으로 스왑 (또는 fallback에서 `i18n` 싱글톤 import 방식 선택 — §6-1 주의 참고). 현재 구조: `ErrorBoundary → QueryClientProvider → I18nextProvider → ToastProvider → BrowserRouter` 를 `QueryClientProvider → I18nextProvider → ErrorBoundary → ToastProvider → BrowserRouter` 로 재배치 |
| `src/components/Toast.tsx` | `getApiErrorMessage`의 영문 리터럴을 `i18n.t('common:toast.apiErrors.*')` 키로 치환. 단 `getApiErrorMessage`는 hook 불가 문맥에서 호출될 수 있어 `i18n.t` 싱글톤 사용 |
| `src/i18n/local/en/common.ts` | `errorBoundary.*` + `toast.apiErrors.*` + `toast.exportFailed` + `toast.logoutFailed`(alias) + `toast.somethingWentWrong`(기존) 키 추가 |
| `src/i18n/local/ko/common.ts` | 위와 1:1 대응 한국어 |
| `src/i18n/local/en/runs.ts` / `ko/runs.ts` | `toast.commentsLoadFailed`, `toast.resultsLoadFailed`, `toast.loadFailed`, `toast.attachmentDeleteFailed`, `toast.assigneeUpdateFailed`, `toast.assigneeBulkUpdateFailed` 신규 키 |
| `src/i18n/local/en/sessions.ts` / `ko/sessions.ts` | `toast.loadFailed` 신규 |
| `src/i18n/local/en/milestones.ts` / `ko/milestones.ts` | `toast.loadFailed`, `toast.completeFailed` 신규 |
| `src/i18n/local/en/projects.ts` / `ko/projects.ts` | `toast.membersLoadFailed` 신규 |
| `src/i18n/local/en/documentation.ts` / `ko/documentation.ts` | `toast.loadFailed` 신규 |
| `src/i18n/local/en/testcases.ts` / `ko/testcases.ts` | `toast.attachmentDeleteFailed`, `toast.generateSaveFailed` 신규 |
| `src/i18n/local/en/settings.ts` / `ko/settings.ts` | `toast.logoutFailed` 신규 |
| §6-3 **A 표**에 열거된 **페이지 파일 20건** | 각 catch 블록에 `showToast(t('<키>'), 'error')` 추가. console.error는 유지. |
| §6-3 **B 표**에 열거된 **페이지 파일 14건** | 각 catch 블록 **위 줄**에 `// intentional: silent — <사유>` 주석 추가 |
| `src/pages/accept-invitation/page.tsx` | L80/L145 — `error.message` 직접 노출 대신 `getApiErrorMessage(err)` 사용으로 변경(서버 메시지 leak 방어) |

> **주의:** 실제 수정 전 `git diff --stat` 기준으로 **±200줄 이내** 목표. §6-3 기반이면 페이지 파일당 평균 1~3줄 추가 + 주석 2~3줄 + locale 키 +10줄/언어 수준.

### 영향 없는 파일 (명시적 유지)

- `src/pages/session-detail/components/RichTextEditor.tsx` — 기존 내부 ErrorBoundary 사용. **변경 금지** (AC-7).
- `src/pages/session-detail/components/QuillEditor.tsx` — 기존 토스트 이미 있음, T1 시그니처. 변경 금지.
- `src/router/config.tsx` — 라우트 레벨 개별 ErrorBoundary 투입은 §9 Out of Scope.

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| Sentry DSN 미설정(dev/local) | `captureException` 호출은 no-op, `eventId`가 `undefined`/`null` → fallback UI의 Report ID 라인은 렌더 안 함(AC-2 조건부). |
| Chunk load error | 기존 `isChunkLoadError` 로직 유지 — sessionStorage 1회 reload. 루프 방지. |
| ErrorBoundary 안에서 또 throw | state 업데이트 실패 시 React가 상위 boundary로 위임. 최상위이면 브라우저 기본 에러. fallback 컴포넌트는 pure render만 하도록 유지. |
| I18n 아직 init 전에 fallback 렌더 | App.tsx 재배치 + `fallbackLng: 'en'` 설정으로 최소 영문 fallback 보장. |
| 로그아웃 중 Supabase 에러 | §6-3 A1/A2/A3 — 토스트 추가 후 `navigate('/auth')`는 그대로 시도(이미 그러함). |
| 매우 긴 Sentry eventId(비정상) | 고정 포맷(32-char hex) 가정. 표기 시 `font-mono text-xs`로 줄바꿈 허용. |
| ToastProvider가 없는 경로에서 showToast 호출 | `useToast` hook이 throw → ErrorBoundary가 잡음(의도된 방어). 단 신규 추가 지점은 모두 ToastProvider 내부이므로 발생하지 않음. |
| Sentry `beforeSend`가 event 드롭(dev) | `captureException` 은 이벤트 ID를 그래도 반환할 수 있음 — dev에서는 UI상 "Report ID: xxx" 뜨지만 실제 Sentry에 전송 안 됨. **dev에서는 Report ID 숨김 처리** 권장(`import.meta.env.DEV` 가드). |
| 한국어 브라우저에서 chunk reload | reload는 URL 보존 → 언어 유지. |
| 같은 에러가 연속 5회 발생하는 retry 루프 | 각 회차마다 Sentry event 생성되어 overhead. 기존 ignoreErrors 리스트로 상당수 차단됨. 추가 debounce는 §9. |
| showToast 연속 호출로 스택 | `ToastProvider`가 이미 최대 3개까지만 유지(Toast.tsx L124). OK. |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **라우트 레벨 ErrorBoundary 세분화** — 페이지마다 별도 boundary 투입. 이번엔 최상위만.
- [ ] **섹션 레벨 ErrorBoundary를 위젯들에 일괄 wrap** — 위젯 개별로 대응은 별도 티켓.
- [ ] **Retry with exponential backoff** — 네트워크 실패 시 자동 재시도 로직.
- [ ] **"문제 신고" 버튼이 백엔드로 리포트 POST** — 지금은 mailto + Sentry만.
- [ ] **Sentry eventId 클립보드 복사 버튼** — 표기만.
- [ ] **`showToast('error', ...)` 버그 시그니처 일괄 수정** (§6-3 C / AC-9 참고) — 별도 티켓으로 분리.
- [ ] **`console.error` 메시지 자체의 i18n화** — DevTools용이므로 원문 유지.
- [ ] **`src/pages/session-detail/components/RichTextEditor.tsx` / `QuillEditor.tsx`** 구조 개편.
- [ ] **auth/page.tsx, accept-invitation/page.tsx 전체 흐름 개편** (부분 개선만 — `getApiErrorMessage` 사용).
- [ ] **`react-error-boundary` 라이브러리 도입.**
- [ ] **PDF export 영문 템플릿 i18n화** — `.i18nignore`에 기록된 대로 유지.

---

## 10. i18n 키

### 신규 키 (en/ko)

| 키 | EN | KO |
|----|----|----|
| `common:errorBoundary.title` | "Something went wrong" | "문제가 발생했어요" (Designer 최종 확정) |
| `common:errorBoundary.description` | "We hit an unexpected error and couldn't finish loading this page. Try reloading — if it keeps happening, head back to your dashboard." | (Designer 확정) |
| `common:errorBoundary.reload` | "Reload page" | (Designer 확정) |
| `common:errorBoundary.goHome` | "Go to Dashboard" | (Designer 확정) |
| `common:errorBoundary.sendReport` | "Send an error report" | (Designer 확정) |
| `common:errorBoundary.reportId` | "Report ID: {{id}}" | "리포트 ID: {{id}}" (Designer 확정) |
| `common:errorBoundary.section.title` | "\"{{sectionName}}\" failed to load." | (Designer 확정) |
| `common:errorBoundary.section.titleGeneric` | "This section failed to load." | (Designer 확정) |
| `common:errorBoundary.section.hint` | "Please refresh or contact support if the problem persists." | (Designer 확정) |
| `common:errorBoundary.section.retry` | "Retry" | "다시 시도" (Designer 확정) |
| `common:toast.somethingWentWrong` | (기존 유지) "Something went wrong." | (기존) "문제가 발생했습니다." |
| `common:toast.exportFailed` | "Failed to export." | "내보내기에 실패했어요." (Designer 확정) |
| `common:toast.apiErrors.recordNotFound` | "Record not found." | (Designer) |
| `common:toast.apiErrors.permissionDenied` | "You don't have permission to perform this action." | (Designer) |
| `common:toast.apiErrors.recordExists` | "This record already exists." | (Designer) |
| `common:toast.apiErrors.relatedMissing` | "Cannot complete: related record is missing." | (Designer) |
| `common:toast.apiErrors.sessionExpired` | "Session expired. Please log in again." | (Designer) |
| `common:toast.apiErrors.notFound` | "The requested resource was not found." | (Designer) |
| `common:toast.apiErrors.conflict` | "A conflict occurred — the record may already exist." | (Designer) |
| `common:toast.apiErrors.rateLimited` | "Too many requests. Please wait a moment and try again." | (Designer) |
| `common:toast.apiErrors.serverError` | "Server error. Please try again shortly." | (Designer) |
| `common:toast.apiErrors.networkError` | "Network error. Check your connection and try again." | (Designer) |
| `common:toast.apiErrors.timeout` | "Request timed out. Please try again." | (Designer) |
| `common:toast.apiErrors.cancelled` | "Request was cancelled." | (Designer) |
| `common:toast.apiErrors.generic` | "Something went wrong. Please try again." | (Designer) |
| `settings:toast.logoutFailed` | (Designer) | (Designer) |
| `runs:toast.commentsLoadFailed` | (Designer) | (Designer) |
| `runs:toast.resultsLoadFailed` | (Designer) | (Designer) |
| `runs:toast.loadFailed` | (Designer) | (Designer) |
| `runs:toast.attachmentDeleteFailed` | (Designer) | (Designer) |
| `runs:toast.assigneeUpdateFailed` | (Designer) | (Designer) |
| `runs:toast.assigneeBulkUpdateFailed` | (Designer) | (Designer) |
| `sessions:toast.loadFailed` | (Designer) | (Designer) |
| `milestones:toast.loadFailed` | (Designer) | (Designer) |
| `milestones:toast.completeFailed` | (Designer) | (Designer) |
| `projects:toast.membersLoadFailed` | (Designer) | (Designer) |
| `documentation:toast.loadFailed` | (Designer) | (Designer) |
| `testcases:toast.attachmentDeleteFailed` | (Designer) | (Designer) |
| `testcases:toast.generateSaveFailed` | (Designer) | (Designer) |

> **EN은 현 fallback 영문 문자열 보존 초안 제시. 최종 카피(EN/KO 둘 다)는 Designer가 `design-spec-f024`에서 확정**.

### 기존 재사용 키

- `common:unknownError` (이미 존재, EN "Unknown error" / KO "알 수 없는 오류")
- `common:toast.somethingWentWrong` (이미 존재)
- `common:toast.networkError` (이미 존재)
- `runs:toast.commentSaveFailed`, `runs:toast.commentDeleteFailed`, `runs:toast.statusUpdateFailed`, `runs:toast.resultSaveFailed`, `runs:toast.uploadFailed`, `runs:toast.screenshotUploadFailed`, `runs:toast.screenshotCaptureFailed`, `runs:toast.jiraCreateFailed`, `runs:toast.githubCreateFailed` (이미 존재, 참조)
- `milestones:toast.updateFailed` (이미 존재)
- `milestones:planDetail.toast.aiRisk.scanFailed` (이미 존재)
- `milestones:planDetail.toast.tc.addMultipleGeneric` (이미 존재)

---

## 11. 리스크 & 의사결정

### 11-1. class ErrorBoundary vs `react-error-boundary` 라이브러리

| 옵션 | 장점 | 단점 |
|------|------|------|
| **A (채택): 현행 class 유지** | 의존성 0, 이미 chunk-reload + Sentry 연동됨, 리스크 최소 | hook 조합 어색 — fallback 내부는 함수 컴포넌트로 분리하면 해결 |
| B: `react-error-boundary` 도입 | `useErrorHandler`, `reset` 훅 네이티브 지원 | 번들 +~3KB, 기존 chunk-reload 로직 재이식 필요 |

**결정: A**. BR-1 명시.

### 11-2. Sentry 중복 레이어링

`src/lib/sentry.ts`가 `withSentryErrorBoundary` HOC export하지만 **사용 금지**. custom ErrorBoundary가 `Sentry.captureException`만 직접 호출. BR-2.

### 11-3. I18nextProvider 배치

최상위 ErrorBoundary가 I18nextProvider 바깥에 있어 fallback에서 hook으로 `t()` 쓸 수 없음. **App.tsx 재배치 (§7)** 로 해결. 사이드이펙트: `I18nextProvider`보다 안쪽 컴포넌트만 ErrorBoundary 보호 가능 → i18n init 자체가 실패하는 초희귀 케이스는 fallback 미노출. 이 경우 브라우저 기본 에러 — 허용 범위.

### 11-4. `getApiErrorMessage`의 i18n화

singleton `i18n` import 방식 — hook 아닌 컨텍스트에서도 동작. 단 i18n이 init되기 전 호출되면 영문 fallback. App bootstrap 순서상 문제 없음.

### 11-5. 기존 T2(`showToast('error', ...)`) 버그 시그니처

`src/pages/run-detail/page.tsx`에만 10여 곳. 본 티켓에서 **건드리지 않음** (AC-9 + §9). 별도 티켓으로 `fix/toast-signature-uniform` 분리 제안.

---

## 12. Designer 개입 필요?

**필요.** 아래 항목이 Designer의 `design-spec-f024-error-boundary.md` 산출물이다.

### 12-1. Full-Page Fallback UI 카피 + 비주얼

- 현재 SVG 일러스트(빨간 X 표시가 찍힌 창문 아이콘) **교체 여부 결정** — 과하게 "망가진" 인상 vs 제품 친숙도.
- 제목 / 설명 / 버튼 라벨 (EN/KO 양쪽) 최종 결정. 위 §10 EN 초안은 참고용.
- Report ID 표기 포맷 (`Report ID: abc123…` vs `Ref: abc123` vs 풀 ID). 접두어 / 마침표 / 폰트 스타일.
- "Send an error report" 링크를 **mailto 유지 / 제거 / 인앱 리포트 모달로 교체**(모달은 §9 Out of Scope이므로 mailto 또는 제거만 선택 가능).
- dev 모드 `<details>` 스택 표시는 유지(개발 편의).

### 12-2. Section Fallback (카드형) 카피

- "This section failed to load." / 섹션 이름 있을 때 `"\"{{name}}\" failed to load."` — 섹션 이름 번역·굵게 처리 여부 확정.
- Retry 버튼 아이콘(`ri-refresh-line`) 유지 여부.

### 12-3. Toast 메시지 카피 테이블

§10 신규 키 각 줄 EN/KO 최종 카피. 톤앤매너:
- 과한 사과 X, 담백한 실패 고지 + 행동 유도(재시도/확인).
- 도메인 액션명 일관성 (예: "Failed to load <noun>" vs "<noun> couldn't load").
- `{{reason}}` 슬롯 유무 — 서버 메시지 노출 허용 여부(BR-5).

### 12-4. 토스트 매핑 표 (Designer 필수 산출물)

`getApiErrorMessage` 내부 분기(`PGRST116`, `23505`, HTTP 401/403/404 등) → 정확한 EN/KO 카피 매핑.

### 12-5. 접근성

- fallback Full-page가 `role="alert"`, `aria-live="assertive"`인데 **스크린리더 읽기 순서** 검토.
- 색 대비 — 빨간 계열 아이콘이 WCAG AA 충족하는지.

> Designer 명세가 Approved 되기 전에는 §10의 EN 초안을 임시 값으로 사용 가능하나, 실제 PR 머지 전에 Designer 서명 필수.

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 — AC-1~10 모두 grep/테스트/npm run 명령으로 검증 가능
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 — DB 변경 없음 명시
- [x] RLS 정책이 정의되었는가 — 해당 없음 명시
- [x] 플랜별 제한이 명시되었는가 — 없음 명시
- [x] RBAC 권한 매트릭스가 있는가 — 전 역할 공통 명시
- [x] 변경 파일 목록이 구체적인가 — §7 + §6-3 표 전체 경로 + 라인 번호 포함
- [x] 엣지 케이스가 식별되었는가 — §8 10개 이상
- [x] Out of Scope이 명시되었는가 — §9 11개 항목
- [x] i18n 키가 en/ko 둘 다 있는가 — §10 (EN 초안, KO는 Designer)
- [ ] 관련 디자인 명세가 Approved 상태인가 — **Designer 작업 대기 중**
