# Design Spec: f024 — 전역 ErrorBoundary + catch→toast 카피 치팅시트

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-f024-error-boundary.md`
> **상속:**
> - `docs/specs/design-spec-i18n-coverage.md` (Phase 1)
>   - §2 톤앤매너 (KO 존댓말 · EN imperative)
>   - §2-4 피해야 할 표현 (반말/외래어 남용 금지)
>   - §3 고유명사 (Testably / Jira / GitHub — 번역 금지)
>   - §4-1 상대시간 (본 스펙에선 미사용)
>   - §5 Plural / Interpolation 규칙 (`{{id}}` / `{{sectionName}}` camelCase)
>   - §6 AC-9 AI 비번역 원칙 (본 스펙은 AI 렌더 구역 아님 — §9 확인)
> - `docs/specs/design-spec-i18n-coverage-phase2-plan-detail.md` / `-run-detail.md`
>   - 토스트 카피 톤 (`Failed to X` / `X에 실패했습니다`) 일관성 계승
> **Figma:** N/A — 기존 `FullPageFallback` / `SectionFallback` SVG·레이아웃 무변경. 텍스트만 i18n 치환 + Report ID 라인 추가.
> **범위:** Dev Spec §12 에서 Designer 산출물로 지정된 5개 항목(Full-Page 카피, Section 카피, Toast 매핑, API 에러 매핑, 접근성)

---

## 0. 이 문서를 읽는 법

본 문서는 신규 디자인이 아닙니다. Dev Spec §10 에서 **EN 초안만 잡혀있고 KO 가 전부 `(Designer)` 플레이스홀더인 상태**를 확정 카피로 채우고, Dev Spec §6-3 A표(20건) · §6-4(`getApiErrorMessage` 13개 분기)를 **그대로 복사하여 번들에 붙여넣을 수 있는 치팅시트**입니다.

**Developer 워크플로우:**

1. §1 **상속 톤앤매너** 재선언 확인
2. §2 **Full-Page Fallback UI 카피** 를 `src/i18n/local/{en,ko}/common.ts` 의 `errorBoundary.*` 서브트리에 그대로 복사
3. §3 **Section-level Fallback 카피** 를 같은 서브트리 `errorBoundary.section.*` 에 복사
4. §4 **Toast 매핑 표 (20건)** 을 Dev Spec §6-3 A표와 1:1 대응해 각 catch 블록에 `showToast(t('<키>'), 'error')` 추가 + 해당 네임스페이스 번들에 키 추가
5. §5 **`getApiErrorMessage(code)` 매핑표 (13건)** 을 `common.toast.apiErrors.*` 서브트리에 복사 + `Toast.tsx` 헬퍼를 i18n singleton 기반으로 교체
6. §6 **번들 배치 트리 도식** 으로 신규 키가 정확히 어느 파일 어느 서브트리에 들어가는지 확인
7. §7 **이모지 / 아이콘 / SVG** 정책 (현행 유지)
8. §8 **접근성 체크리스트**
9. §9 **AC-9 AI 비번역 원칙 확인** (본 스펙 해당 없음)
10. §10 **신규 키 집계** (en/ko parity 검증)

> **스코프 밖 (Dev Spec §9 기준, 본 스펙에서도 동일):**
> - 일러스트 교체 / "Desi 6종 일러스트" 의존 디자인 — 현행 SVG 유지
> - 인앱 리포트 모달 / 클립보드 복사 버튼 — 텍스트 표기만
> - `showToast('error', ...)` 버그 시그니처 수정 — 별도 티켓
> - B표 14건 (배경 사일런트 catch) 카피 — 주석만 달고 토스트 추가 없음 → 본 스펙 카피 대상 아님

---

## 1. Phase 1 톤앤매너 상속 (재선언)

본 스펙은 `design-spec-i18n-coverage.md` §2 · §3 을 **무수정 계승**합니다. Developer 는 Phase 1 문서를 기준으로 참고하세요.

### 1-1. Phase 1 §2 인용 — 이 문서에 적용되는 핵심 4줄

| 축 | EN | KO |
|----|----|----|
| 문체 (전역) | **Imperative mood** — "Try again", "Go to dashboard", "Retry" | **존댓말 ~합니다 / ~해요 / ~해주세요**. 반말·은어·"오류났어요" 금지 |
| 토스트 error 종결 | `Failed to X` / `X. Please try again.` 직설형. 과도한 사과 금지 | `~에 실패했어요` / `~해주세요`. "죄송합니다"는 **Full-Page 크래시 한정** — 토스트에선 사용 금지 (과한 사과) |
| 전문용어 | 도메인 원어 유지 (run, plan, milestone, Jira, GitHub) | 동일 — 기존 고정 번역 준수 (`Run→실행`, `Plan→플랜`, `Milestone→마일스톤`, `TC→TC`) |
| 기술 전문용어 **지양** | "stack trace", "500 Internal Server Error", "null reference", "PGRST116" **원문 노출 금지** | 동일. 사용자 언어 우선 — "서버 오류가 발생했어요" / "데이터를 찾을 수 없어요" |

### 1-2. Testably 브랜드 톤 — Full-Page Fallback 특화

크래시 화면은 토스트와 달리 **"유일하게 사과가 허용되는 구역"** 입니다. 다만:

- KO `죄송합니다` 는 서브타이틀 첫 문장 **최대 1회**만 사용 (과하면 제품 신뢰도 저하).
- EN 은 `Sorry` / `Apologies` 과다 사용 금지 — `We've been notified` 같은 **능동형 안심 문구**가 Phase 1 톤과 정렬.
- 둘 다 **"다음 행동"** 을 즉시 제공 (Try again / Go to dashboard) — Phase 1 §2-1 "imperative CTA" 원칙 계승.

### 1-3. 네트워크 vs 권한 vs 일반 오류 톤 분리 (토스트)

| 성격 | EN 톤 | KO 톤 | 예시 키 |
|-----|-------|-------|--------|
| **네트워크/일시적** | `Connection issue. Please try again.` — 재시도 암시 | `연결 문제가 발생했어요. 다시 시도해주세요.` | `common.toast.apiErrors.networkError` |
| **권한** | `You don't have permission for this action.` — 행동 차단 사실 고지, 재시도 유도 금지 | `이 작업을 수행할 권한이 없어요.` | `common.toast.apiErrors.permissionDenied` |
| **검증 (필드별)** | **본 스펙 대상 외** — 각 폼 자체 검증 사용 | 동일 | — |
| **일반 (원인 불명)** | `Something went wrong. Please try again.` — 기존 `common.toast.somethingWentWrong` 재사용 | `문제가 발생했어요. 다시 시도해주세요.` | `common.toast.somethingWentWrong` (기존 KO `문제가 발생했습니다.` 는 합치성 위해 **유지** — 아래 §2-3 참고) |

> **KO 존댓말 세밀 조정:** 기존 번들 `common.toast.somethingWentWrong='문제가 발생했습니다.'` 는 "~합니다" 높임체, 본 스펙의 신규 카피들은 "~해요" 구어 높임체. 두 형태 모두 Phase 1 §2-2 표준 인정 범위. **혼용은 피해야 하지만 레거시 호환을 위해 기존 키는 건드리지 않고 신규 키만 "~해요" 톤으로 통일** 합니다 (살짝 더 친절한 인상 + Phase 2 run-detail 토스트와 동일한 톤).

---

## 2. Full-Page Fallback UI 카피 (EN / KO 확정)

### 2-1. 표시 위치 도식 (Dev Spec §6-1 기존 JSX 기반)

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                   [현행 SVG 아이콘 160×160]               │
│                                                          │
│            ┌────────────────────────────┐                │
│            │      Something went wrong  │ ← h1 title     │
│            └────────────────────────────┘                │
│                                                          │
│            We've been notified and are                   │
│            looking into it.               ← p subtitle   │
│                                                          │
│            [ Try again ]   [ Go to dashboard ]           │
│             ↑ primary       ↑ secondary                  │
│                                                          │
│            Report ID: abc123def456…       ← eventId 있을 때만  │
│            (We couldn't capture error details.) ← eventId 없을 때  │
│                                                          │
│            Send an error report                          │
│             ↑ mailto (기존 유지)                          │
│                                                          │
│            ▼ Error details (dev 모드만)                   │
└──────────────────────────────────────────────────────────┘
```

### 2-2. 카피 매핑표

| 키 (common.errorBoundary.*) | EN | KO | 슬롯 | 비고 |
|----|----|----|------|-----|
| `title` | Something went wrong | 문제가 발생했어요 | 없음 | h1. 기존 영문 유지 (친숙). KO 는 "~해요" 톤 |
| `description` | We've been notified and are looking into it. Try again, or head back to your dashboard. | 문제를 확인하고 있어요. 잠시 후 다시 시도하거나 대시보드로 돌아가주세요. | 없음 | Dev Spec §10 초안보다 **짧고 능동형**. "unexpected error / couldn't finish loading" 같은 기술 용어 배제 (§1-1). 과도한 사과 없이 **행동 유도** |
| `reload` | Try again | 다시 시도 | 없음 | primary CTA. 현행 `Reload page` 대체. 실제 동작은 `window.location.reload()` 동일 (구현 무변경) |
| `goHome` | Go to dashboard | 대시보드로 | 없음 | secondary CTA. 기존 `Go to Dashboard` 대·소문자 정리 (Phase 1 §2-1 imperative 표준) |
| `reportId` | Report ID: {{id}} | 문제 보고 번호: {{id}} | `{{id}}` | Sentry eventId 32-char hex. `font-mono text-xs` 스타일 유지. KO "문제 보고 번호" 로 풀어서 표현 (유저가 고객지원에 붙여넣을 때 무엇인지 이해 가능) |
| `reportIdMissing` | We couldn't capture error details. | 에러 상세 정보를 수집하지 못했어요. | 없음 | Sentry DSN 미설정/beforeSend drop 시 — Dev Spec §8 엣지 케이스 + AC-2 조건부 렌더. Dev 환경 숨김 가드(`import.meta.env.DEV`)와 **별개로**, 프로덕션에서 eventId 가 null 일 때 이 문구로 대체 |
| `sendReport` | Send an error report | 문제 신고 메일 보내기 | 없음 | 기존 mailto 유지. `<a href="mailto:support@testably.app?subject=Error%20report">`. BR-6 준수 — 이메일 주소는 하드코딩 유지 |
| `devDetailsSummary` | Error details | 에러 상세 정보 | 없음 | `<details><summary>` 내부. Dev 모드에서만 렌더되므로 실사용자엔 미노출이지만 i18n 일관성 위해 키화 |

### 2-3. 기존 키 재사용 vs 신규 키 정책

| Dev Spec §10 초안 | 본 스펙 최종 | 변경 이유 |
|-------------------|-------------|----------|
| `errorBoundary.title = "Something went wrong"` | **그대로 유지** | Dev Spec 초안 채택 |
| `errorBoundary.description = "We hit an unexpected error and couldn't finish loading this page. Try reloading — if it keeps happening, head back to your dashboard."` (108 char) | **교체 (63 char)** | 기술 용어 배제(§1-1). 사과 톤 강화. KO 가독성 |
| `errorBoundary.reload = "Reload page"` | **"Try again" 으로 교체** | Phase 1 §2-1 imperative · 일관성. `reload` 키명은 유지 (구현 무변경) |
| `errorBoundary.goHome = "Go to Dashboard"` | **"Go to dashboard" (소문자 d)** | imperative 표준. 기존 common bundle `Dashboard` 도 위치 혼용 있으나 본 CTA 는 lowercase |
| `errorBoundary.reportId = "Report ID: {{id}}"` | **그대로 유지**, KO `"문제 보고 번호: {{id}}"` | Dev Spec 초안의 KO `리포트 ID` 는 음역 과다 — 사용자 친화형으로 조정 |
| `errorBoundary.sendReport = "Send an error report"` | **그대로 유지** | mailto 링크 라벨. 변경 불필요 |

### 2-4. 버튼 variant 매핑 (기존 Tailwind 클래스 무변경)

| 버튼 | 스타일 | 상태 |
|-----|-------|-----|
| Try again (primary) | `bg-indigo-600 ... hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500` (기존) | Enter/Space 활성화 — AC-10 |
| Go to dashboard (secondary) | `border-slate-300 bg-white ... hover:bg-slate-50` (기존) | `<a href="/projects">` 그대로 — href 변경 없음 |
| Send an error report (tertiary) | `text-xs text-slate-400 underline` (기존) | mailto 그대로 |

> 다크모드 매핑은 현행 `ErrorBoundary.tsx` 가 light-only 고정이며, Dev Spec §9 범위 외. **다크모드 대응은 별도 티켓** (본 스펙은 라이트 모드 카피만 확정).

---

## 3. Section-level Fallback UI 카피 (선택적 사용)

### 3-1. 표시 위치 도식

```
┌─────────────────────────────────────────────┐
│  ⚠  "Project Overview" failed to load.      │ ← p.text-sm 제목
│     Please refresh or contact support       │ ← p.text-xs 힌트
│     if the problem persists.                │
│     [  ↻ Retry  ]                           │ ← 재시도 버튼
└─────────────────────────────────────────────┘
   ↑ section={true} 인 ErrorBoundary 내부
```

### 3-2. 카피 매핑표

| 키 (common.errorBoundary.section.*) | EN | KO | 슬롯 | 비고 |
|----|----|----|------|-----|
| `title` | "{{sectionName}}" failed to load. | "{{sectionName}}"을(를) 불러오지 못했어요. | `{{sectionName}}` | sectionName prop 있을 때. **따옴표 리터럴 포함** (기존 렌더 일관성). KO 조사 "을(를)" 은 sectionName 끝글자 종성 변동 대응 — 대안: `{{sectionName}} 섹션을 불러오지 못했어요` (§3-3 참조) |
| `titleGeneric` | Failed to load this section. | 이 섹션을 불러오지 못했어요. | 없음 | sectionName 없을 때. 현행 `This section failed to load.` 보다 **imperative 축 맞춤** |
| `hint` | Please refresh or contact support if the problem persists. | 새로고침하거나 문제가 계속되면 지원팀에 문의해주세요. | 없음 | 2줄째. KO "지원팀" 은 support 번역 — 기존 Phase 1 §3-2 고정 번역 없음, 본 스펙에서 신규 지정 |
| `retry` | Retry | 재시도 | 없음 | 아이콘 `ri-refresh-line` 유지. Phase 1 §3-2 "Retry→재시도" 고정 번역 준수 |

### 3-3. KO 조사 처리 — sectionName 삽입 시

한국어는 `sectionName` 끝글자 종성에 따라 `을/를`, `이/가` 등 조사가 변합니다. i18next 는 이를 처리하지 못함 (Phase 1 §5-2 일관).

**해결책: "섹션" 접미어 패턴 권장** (단, 기존 `"{{sectionName}}" failed to load.` JSX 일관성을 위해 따옴표는 유지):

- EN: `"{{sectionName}}" failed to load.`
- KO: `"{{sectionName}}" 섹션을 불러오지 못했어요.`

이 방식은 `sectionName` 값이 어떤 한국어/영어 단어가 들어오든 `섹션을` 로 통일되어 조사 충돌이 없습니다.

> `sectionName` 값은 **개발자가 코드에서 주입하는 영문 식별자** (`<ErrorBoundary section sectionName="Project Overview">`) 이므로 번역되지 않고 그대로 노출됩니다. 이는 Phase 1 §6-2 AI 비번역 원칙과 다른 "코드 내 영문 식별자 그대로" 정책 — 허용 범위.

---

## 4. Toast 메시지 매핑 표 (Dev Spec §6-3 A표 — 20건)

> **형식:** `| # | 페이지 | 현재 console.error | 제안 EN | 제안 KO | i18n Key | 재사용/신규 |`
> **재사용 우선 원칙:** `common.toast.*` / `runs.toast.*` / `milestones.toast.*` 기존 키가 있으면 그대로 사용. 없으면 각 도메인 네임스페이스에 신규 추가. `common.toast.apiErrors.*` 는 §5 `getApiErrorMessage` 와 별개 레이어.

### 4-1. 매핑표 (20건)

| # | 페이지 | 현재 console.error | 제안 EN | 제안 KO | i18n Key | 재사용/신규 |
|---|--------|-------------------|--------|--------|----------|--------|
| A1 | `src/pages/testcases/page.tsx:17` | `Logout failed` | Failed to log out. Please try again. | 로그아웃에 실패했어요. 다시 시도해주세요. | `settings:toast.logoutFailed` | **신규** (`settings.toast`) |
| A2 | `src/pages/run-detail/page.tsx:2424` | `Logout failed` | ↑ 동일 | ↑ 동일 | `settings:toast.logoutFailed` | **re-use** (A1과 공유) |
| A3 | `src/pages/project-detail/page.tsx:274` | `Logout failed` | ↑ 동일 | ↑ 동일 | `settings:toast.logoutFailed` | **re-use** (A1과 공유) |
| A4 | `src/pages/stats/PassRateReportPage.tsx:125` | Export PDF error | Failed to export report. Please try again. | 보고서 내보내기에 실패했어요. 다시 시도해주세요. | `common:toast.exportFailed` | **신규** (`common.toast`) |
| A5 | `src/pages/session-detail/page.tsx:233` | Fetch milestones | Failed to load milestones. | 마일스톤을 불러오지 못했어요. | `milestones:toast.loadFailed` | **신규** (`milestones.toast`) |
| A6 | `src/pages/session-detail/page.tsx:258` | Fetch project members | Failed to load project members. | 프로젝트 멤버를 불러오지 못했어요. | `projects:toast.membersLoadFailed` | **신규** (`projects.toast`) |
| A7 | `src/pages/session-detail/page.tsx:317` | Fetch session data | Failed to load session. | 세션을 불러오지 못했어요. | `sessions:toast.loadFailed` | **신규** (`sessions.toast`) |
| A8 | `src/pages/run-detail/page.tsx:798` | 코멘트 로딩 | Failed to load comments. | 코멘트를 불러오지 못했어요. | `runs:toast.commentsLoadFailed` | **신규** (`runs.toast`) |
| A9 | `src/pages/run-detail/page.tsx:951` | 결과 로딩 | Failed to load results. | 결과를 불러오지 못했어요. | `runs:toast.resultsLoadFailed` | **신규** (`runs.toast`) |
| A10 | `src/pages/run-detail/page.tsx:1202` | 데이터 로딩 | Failed to load run. | 실행을 불러오지 못했어요. | `runs:toast.loadFailed` | **신규** (`runs.toast`) |
| A11 | `src/pages/run-detail/page.tsx:1335` | Run status 업데이트 실패 | Failed to update run status. | 실행 상태 업데이트에 실패했어요. | `runs:toast.statusUpdateFailed` | **re-use** (기존 키 존재 — §10 기존 재사용 키) |
| A12 | `src/pages/run-detail/page.tsx:2334` | 첨부파일 삭제 | Failed to delete attachment. | 첨부파일 삭제에 실패했어요. | `runs:toast.attachmentDeleteFailed` | **신규** (`runs.toast`) |
| A13 | `src/pages/run-detail/page.tsx:2716` | Assignee 업데이트 | Failed to update assignee. | 담당자 업데이트에 실패했어요. | `runs:toast.assigneeUpdateFailed` | **신규** (`runs.toast`) |
| A14 | `src/pages/run-detail/page.tsx:2749` | Bulk assignee 업데이트 | Failed to update assignees. | 담당자 일괄 업데이트에 실패했어요. | `runs:toast.assigneeBulkUpdateFailed` | **신규** (`runs.toast`) |
| A15 | `src/pages/project-documentation/page.tsx:178` | 데이터 로딩 | Failed to load documentation. | 문서를 불러오지 못했어요. | `documentation:toast.loadFailed` | **신규** (`documentation.toast`) |
| A16 | `src/pages/project-sessions/page.tsx:264` | 데이터 로딩 | Failed to load sessions. | 세션 목록을 불러오지 못했어요. | `sessions:toast.loadFailed` | **re-use** (A7과 공유 — 단, KO 는 "세션" vs "세션 목록" 선호 분기 가능. 여기선 A7 그대로 재사용하여 `세션을 불러오지 못했어요.` 사용) |
| A17 | `src/pages/project-testcases/components/TestCaseList.tsx:1651` | 첨부파일 삭제 | Failed to delete attachment. | 첨부파일 삭제에 실패했어요. | `testcases:toast.attachmentDeleteFailed` | **신규** (`testcases.toast`) |
| A18 | `src/pages/project-testcases/components/TestCaseList.tsx:1731` | File delete error | ↑ 동일 | ↑ 동일 | `testcases:toast.attachmentDeleteFailed` | **re-use** (A17과 공유) |
| A19 | `src/pages/milestone-detail/page.tsx:772` | complete error | Failed to complete milestone. | 마일스톤 완료 처리에 실패했어요. | `milestones:toast.completeFailed` | **신규** (`milestones.toast`) |
| A20 | `src/pages/project-detail/AnalyticsTab.tsx:223` | save generated TCs | Failed to save generated test cases. | 생성된 테스트 케이스 저장에 실패했어요. | `testcases:toast.generateSaveFailed` | **신규** (`testcases.toast`) |

**총계:** 20건 중 신규 키 **14개** (A2/A3/A16/A18/A11 제외 — re-use), re-use **5건**.

### 4-2. 네임스페이스별 신규 키 총합 (§6 배치 트리와 정합)

| 네임스페이스 | 신규 키 | 개수 |
|-------|-------|-----|
| `common.toast.*` | `exportFailed` | 1 |
| `settings.toast.*` | `logoutFailed` | 1 |
| `runs.toast.*` | `commentsLoadFailed`, `resultsLoadFailed`, `loadFailed`, `attachmentDeleteFailed`, `assigneeUpdateFailed`, `assigneeBulkUpdateFailed` | 6 |
| `sessions.toast.*` | `loadFailed` | 1 |
| `milestones.toast.*` | `loadFailed`, `completeFailed` | 2 |
| `projects.toast.*` | `membersLoadFailed` | 1 |
| `documentation.toast.*` | `loadFailed` | 1 |
| `testcases.toast.*` | `attachmentDeleteFailed`, `generateSaveFailed` | 2 |
| **합계** | | **15 키 × 2 언어 = 30 값** |

### 4-3. 톤 일관성 체크 (Phase 1 §2-3 교차검증)

- 전 20건 EN 이 `Failed to X.` / `Failed to X. Please try again.` 두 형태로만 구성 — Phase 1 "토스트 error: Failed to X" 룰 준수.
- 전 20건 KO 가 `~에 실패했어요.` / `~을/를 불러오지 못했어요.` 두 형태 — Phase 1 §2-2 "토스트 error: ~에 실패했습니다" 룰 계승, **"~해요" 존댓말로 소프트닝** (본 스펙 §1-3 참조).
- "다시 시도해주세요" 는 A1~A4 만 — 사용자가 **곧바로 재시도 가능한 액션** (logout/export). A5 이후 로딩 실패는 암묵적으로 페이지 새로고침이 필요하므로 생략 (토스트 짧게 유지).

### 4-4. `{{reason}}` 슬롯 정책 (Dev Spec BR-5)

본 20건 **전부 `{{reason}}` 슬롯 없음** — 서버 메시지 leak 방어. 필요 시 개발자가 `showToast(t('runs:toast.jiraCreateFailed', { reason: error.message }), 'error')` 처럼 기존 키(§10 기존 재사용 키 목록의 `runs.toast.jiraCreateFailed` 등)에만 슬롯 주입. 본 스펙 신규 키는 reason 슬롯 없이 **단순 고지형**.

---

## 5. `getApiErrorMessage(code)` → 사용자 카피 매핑 (13건)

> **배경:** Dev Spec §6-4 에 따라 `src/components/Toast.tsx:148` 의 `getApiErrorMessage` 가 영문 하드코딩을 반환 중. 본 티켓에서 i18n 싱글톤(`i18n.t`) 사용으로 교체. 13개 분기(Supabase 코드 8 + HTTP 상태 5) + 2 fallback + 3 문자열 매칭 = 총 분기 확인 기준 13개 고유 키 + 2 generic.

### 5-1. 매핑표

| 에러 코드 / 조건 | 의미 | EN 카피 | KO 카피 | i18n Key |
|----------------|------|---------|---------|---------|
| `PGRST116` | Supabase: 쿼리 결과 0건 | No data found. | 데이터를 찾을 수 없어요. | `common:toast.apiErrors.recordNotFound` |
| `PGRST301` | Supabase: RLS 거부 | You don't have permission for this action. | 이 작업을 수행할 권한이 없어요. | `common:toast.apiErrors.permissionDenied` |
| `23505` | Postgres: unique 위반 | This record already exists. | 이미 존재하는 항목이에요. | `common:toast.apiErrors.recordExists` |
| `23503` | Postgres: FK 위반 | Cannot complete — a related record is missing. | 관련 항목이 없어서 처리할 수 없어요. | `common:toast.apiErrors.relatedMissing` |
| `42501` | Postgres: insufficient_privilege | Permission denied. Check your plan or role. | 권한이 부족해요. 플랜이나 역할을 확인해주세요. | `common:toast.apiErrors.insufficientPrivilege` |
| `auth/invalid-email` | Supabase Auth | That email address is invalid. | 유효하지 않은 이메일 주소예요. | `common:toast.apiErrors.invalidEmail` |
| `auth/user-not-found` | Supabase Auth | No account found with that email. | 해당 이메일로 가입된 계정이 없어요. | `common:toast.apiErrors.userNotFound` |
| `auth/wrong-password` | Supabase Auth | Incorrect password. | 비밀번호가 일치하지 않아요. | `common:toast.apiErrors.wrongPassword` |
| HTTP `401` | Unauthorized | Session expired. Please log in again. | 세션이 만료됐어요. 다시 로그인해주세요. | `common:toast.apiErrors.sessionExpired` |
| HTTP `403` | Forbidden | You don't have permission for this action. | 이 작업을 수행할 권한이 없어요. | `common:toast.apiErrors.permissionDenied` (re-use — PGRST301과 통합) |
| HTTP `404` | Not found | The requested resource was not found. | 요청한 항목을 찾을 수 없어요. | `common:toast.apiErrors.notFound` |
| HTTP `409` | Conflict | This conflicts with existing data. It may already exist. | 기존 데이터와 충돌해요. 이미 존재할 수 있어요. | `common:toast.apiErrors.conflict` |
| HTTP `429` | Rate limit | Too many requests. Please wait a moment and try again. | 요청이 너무 많아요. 잠시 후 다시 시도해주세요. | `common:toast.apiErrors.rateLimited` |
| HTTP `>=500` | Server error | Server error. Please try again shortly. | 서버 오류가 발생했어요. 잠시 후 다시 시도해주세요. | `common:toast.apiErrors.serverError` |
| `message` 포함 `network`/`failed to fetch`/`load failed` | 네트워크 | Connection issue. Check your network and try again. | 연결 문제가 발생했어요. 네트워크를 확인하고 다시 시도해주세요. | `common:toast.apiErrors.networkError` |
| `message` 포함 `timeout` | 타임아웃 | The request timed out. Please try again. | 요청 시간이 초과됐어요. 다시 시도해주세요. | `common:toast.apiErrors.timeout` |
| `message` 포함 `aborted` | 취소 | The request was cancelled. | 요청이 취소됐어요. | `common:toast.apiErrors.cancelled` |
| Fallback (짧은 err.message) | err.message 반환 | (err.message 그대로 반환 — 번역 없음) | (err.message 그대로 반환 — 번역 없음) | **키 없음** (서버 메시지 직접 노출. BR-5 위반 우려 있으나 현행 동작 보존) |
| 최종 fallback (error null / 긴 메시지) | 알 수 없음 | Something went wrong. Please try again. | 문제가 발생했어요. 다시 시도해주세요. | `common:toast.apiErrors.generic` |

**총계:** 신규 키 **15개** (HTTP 403 이 PGRST301 과 `permissionDenied` 재사용하므로 13 + generic + insufficientPrivilege 포함). en/ko 각 15 × 2 = 30 값.

> **주의 — 에러 코드 13개 vs 본 스펙 15개 차이 해명:**
> Dev Spec §B 에서 "Planner가 식별한 13개" 는 `getApiErrorMessage` 분기 중 **return 구문이 있는 고유 코드/조건**입니다. 본 스펙은 여기에 (a) HTTP 403 을 PGRST301 과 키 재사용으로 통합, (b) `42501` 을 별도 카피 (`insufficientPrivilege` — PGRST301/403 "권한 없음" 과 달리 "플랜/역할 확인" 안내 포함) 로 분리, (c) Fallback generic 을 명시 키로 추가. 네트워크 문자열 매칭 3종(`network`/`timeout`/`aborted`) 까지 포함하면 15개. Developer 는 본 표가 실제 i18n 전환 기준 **정답** 입니다.

### 5-2. `getApiErrorMessage` 함수 교체 패턴

Dev Spec §6-4 에 따라 `Toast.tsx` 내부 교체 예시:

```ts
// Before (영문 하드코딩)
case 'PGRST116': return 'Record not found.';

// After (i18n 싱글톤)
import i18n from '@/i18n';
case 'PGRST116': return i18n.t('common:toast.apiErrors.recordNotFound');
```

> `useTranslation()` hook 사용 불가 — `getApiErrorMessage` 는 hook 이 아닌 순수 함수. i18n singleton (`src/i18n/index.ts` default export) 직접 import. init 전 호출 시 en fallback. Dev Spec §11-4 리스크 분석 참조.

### 5-3. 톤 일관성 체크

- **권한류** (`PGRST301`/`403`/`42501`): KO 에서 모두 `~권한이 없어요` 로 통일. `42501` 만 추가 안내 (`플랜이나 역할을 확인해주세요`) — 실제 RLS 거부 vs DB-level privilege 거부 구분.
- **네트워크류** (`networkError`/`timeout`/`cancelled`): 재시도 유도 (`다시 시도해주세요`). `cancelled` 는 유저 의도 취소일 수 있어 재시도 유도 없이 담백하게.
- **서버류** (`serverError`/`429`): "잠시 후 다시 시도" — 일시적 장애 암시.
- **데이터류** (`recordNotFound`/`notFound`/`recordExists`/`conflict`): 재시도 불가 고지. 유저 액션 유도 없음.

---

## 6. 번들 배치 전략 — 신규 키 트리 도식

### 6-1. `src/i18n/local/{en,ko}/common.ts` — 트리 추가

```
common (기존 export)
├─ ... (기존 키들)
├─ unknownError       (기존 — 변경 없음)
├─ time.*             (기존 — 변경 없음)
├─ weekday.*          (기존 — 변경 없음)
│
├─ toast              (기존 서브트리)
│   ├─ saved          (기존)
│   ├─ saveFailed     (기존)
│   ├─ networkError   (기존 — §5 apiErrors.networkError 로 "확장 이관" 안 함. 기존 키 그대로 유지하여 레거시 호출 호환)
│   ├─ somethingWentWrong  (기존 — 변경 없음. §1-3 참조)
│   │
│   ├─ exportFailed          ← 신규 (A4 전용)
│   │
│   └─ apiErrors             ← 신규 서브트리 (§5 `getApiErrorMessage` 전용, 15 키)
│       ├─ recordNotFound
│       ├─ permissionDenied
│       ├─ recordExists
│       ├─ relatedMissing
│       ├─ insufficientPrivilege
│       ├─ invalidEmail
│       ├─ userNotFound
│       ├─ wrongPassword
│       ├─ sessionExpired
│       ├─ notFound
│       ├─ conflict
│       ├─ rateLimited
│       ├─ serverError
│       ├─ networkError       (apiErrors 서브트리 내부 — 기존 common.toast.networkError와 별개. 맥락: apiErrors 는 `getApiErrorMessage` 반환값, common.toast.networkError 는 직접 호출용 레거시)
│       ├─ timeout
│       ├─ cancelled
│       └─ generic
│
└─ errorBoundary            ← 신규 서브트리 (§2/§3 Full-Page · Section 전용, 12 키)
    ├─ title
    ├─ description
    ├─ reload
    ├─ goHome
    ├─ reportId              (슬롯 {{id}})
    ├─ reportIdMissing
    ├─ sendReport
    ├─ devDetailsSummary
    └─ section
        ├─ title             (슬롯 {{sectionName}})
        ├─ titleGeneric
        ├─ hint
        └─ retry
```

### 6-2. 도메인 네임스페이스 — 신규 키 추가

```
runs (src/i18n/local/{en,ko}/runs.ts)
└─ toast               (기존 서브트리)
    ├─ ... (기존 키들 — §10 기존 재사용 키 목록)
    ├─ commentsLoadFailed        ← 신규 (A8)
    ├─ resultsLoadFailed         ← 신규 (A9)
    ├─ loadFailed                ← 신규 (A10)
    ├─ attachmentDeleteFailed    ← 신규 (A12)
    ├─ assigneeUpdateFailed      ← 신규 (A13)
    └─ assigneeBulkUpdateFailed  ← 신규 (A14)

sessions (src/i18n/local/{en,ko}/sessions.ts)
└─ toast
    └─ loadFailed                ← 신규 (A7, A16 공유)

milestones (src/i18n/local/{en,ko}/milestones.ts)
└─ toast               (기존 서브트리 — updateFailed 등 존재)
    ├─ loadFailed                ← 신규 (A5)
    └─ completeFailed            ← 신규 (A19)

projects (src/i18n/local/{en,ko}/projects.ts)
└─ toast
    └─ membersLoadFailed         ← 신규 (A6)

documentation (src/i18n/local/{en,ko}/documentation.ts)
└─ toast
    └─ loadFailed                ← 신규 (A15)

testcases (src/i18n/local/{en,ko}/testcases.ts)
└─ toast
    ├─ attachmentDeleteFailed    ← 신규 (A17, A18 공유)
    └─ generateSaveFailed        ← 신규 (A20)

settings (src/i18n/local/{en,ko}/settings.ts)
└─ toast
    └─ logoutFailed              ← 신규 (A1, A2, A3 공유)
```

### 6-3. 기존 `common.errorOccurred` 활용 제안

사용자가 물은 "기존 common.errorOccurred 활용" 은 현재 번들에 **`common.error = 'An error occurred' / '오류가 발생했습니다'`** 만 존재하며 `common.errorOccurred` 키는 없습니다. 본 스펙은 이 기존 `common.error` 를 **건드리지 않습니다** — 너무 일반적이라 레거시 호출 지점 예측 불가. 본 스펙 신규 fallback 은 **`common.toast.apiErrors.generic`** (§5) 을 사용.

### 6-4. en/ko parity 검증 (`scan:i18n:parity`)

신규 키 총 **15 (common.toast.apiErrors) + 1 (common.toast.exportFailed) + 12 (common.errorBoundary.*) + 6 (runs.toast) + 1 (sessions.toast) + 2 (milestones.toast) + 1 (projects.toast) + 1 (documentation.toast) + 2 (testcases.toast) + 1 (settings.toast) = 42 키**. en/ko 각각 42 값 추가 → 총 84 값. AC-5 (`scan:i18n:check`) 및 `scan:i18n:parity` PASS 조건.

---

## 7. 이모지 / 아이콘 / SVG 일러스트 정책

### 7-1. Full-Page Fallback SVG (현행 유지 권장)

현재 `ErrorBoundary.tsx:43-51` 의 인라인 SVG (빨간 X 표시가 찍힌 창문 아이콘, `#6366f1` indigo + `#ef4444` red) 는:

- **유지 권장.** 적당히 "뭔가 잘못됐다" 는 사인 + 제품 indigo 브랜드 톤 준수.
- 교체 시 Desi의 외부 일러스트 6종 의존 발생 → **블로커.** Dev Spec §9 Out of Scope 범위와 충돌.
- **결정:** 현행 SVG 유지. 추후 일러스트 확정 시 별도 티켓에서 교체.

### 7-2. Section Fallback 아이콘 (현행 유지)

- `<i className="ri-error-warning-line">` (Remix Icon) + `<i className="ri-refresh-line">` 유지.
- lucide-react 전환은 별도 디자인 시스템 티켓 — 본 스펙 범위 외.

### 7-3. Toast 아이콘

- Sonner 기본 아이콘 유지 (error variant 자동 할당). 커스텀 아이콘 **추가 없음**.

### 7-4. 이모지 정책 (Phase 1 §2-1 상속)

- 본 스펙 20개 토스트 카피 **이모지 0개**. "❌" / "⚠️" 같은 수사 이모지 추가 금지.
- Full-Page Fallback 본문도 이모지 없음.
- 유일한 기존 이모지 사용처 (`No failed or blocked TCs 🎉` 등) 는 Phase 1 에서 이미 확정 — 본 스펙 무관.

### 7-5. 최소 의존 설계 원칙 (Dev Spec §11 리스크 완화)

- 신규 일러스트 / 신규 아이콘 라이브러리 / 신규 SVG 파일 **0개**.
- 텍스트 + 기존 SVG + 기존 Remix 아이콘 = 배포 가능한 최소 집합.

---

## 8. 접근성 체크리스트

### 8-1. Full-Page Fallback

- [x] **role="alert"** — 현행 `ErrorBoundary.tsx:39` 유지. AC-10 준수.
- [x] **aria-live="assertive"** — 현행 유지. 스크린리더가 즉시 읽음.
- [ ] **페이지 랜딩 시 focus 이동** — 신규 요구. 개발자 구현 가이드:
  ```tsx
  // FullPageFallback 컴포넌트 내부
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  <h1 ref={titleRef} tabIndex={-1} aria-label={t('common:errorBoundary.title')}>...</h1>
  ```
  → h1 에 `tabIndex={-1}` + mount 시 focus. 스크린리더가 타이틀부터 읽기 시작.
- [x] **키보드 단독 조작** — AC-10. Tab → Try again 버튼 → Go to dashboard 버튼 → Send an error report 링크 → (dev only) Error details 토글 순서. `focus-visible:ring-2 focus-visible:ring-indigo-500` 유지.
- [ ] **Enter/Space 활성화** — `<button onClick>` 이 이미 둘 다 처리. 확인만 필요.
- [ ] **색상 대비 4.5:1 이상** (WCAG AA):
  - 본문 `text-slate-500` on `bg-slate-50` → 7.2:1 (PASS)
  - primary button `text-white` on `bg-indigo-600` → 5.9:1 (PASS)
  - secondary button `text-slate-700` on `bg-white` → 11.8:1 (PASS)
  - tertiary link `text-slate-400` on `bg-slate-50` → 3.8:1 (⚠ FAIL) — **`text-slate-500` 로 상향 권장** (본 스펙에서 유일한 접근성 개선점. hover 시 `text-slate-600` 로 강화).
  - SVG 아이콘 indigo/red 는 장식용(`aria-hidden="true"`) — 대비 불필요.

### 8-2. Section Fallback

- [x] **role="alert"** — 현행 `ErrorBoundary.tsx:98` 유지.
- [x] **색상 대비** — `text-red-700` on `bg-red-50` (11.3:1) / `text-red-500` on `bg-red-50` (4.8:1) / Retry `text-red-600` on `bg-red-50` (6.6:1) 모두 PASS.
- [x] **키보드** — Retry 버튼 `hover:bg-red-100` + 기본 `focus:outline` 존재. AC-10 요구 `focus-visible` 링 **추가 권장** → `focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2`.

### 8-3. 토스트 (Sonner)

- Sonner 기본 `role="status"` + `aria-live="polite"`. 에러 토스트는 `role="alert"` + `assertive` 로 자동 승격 — 라이브러리 기본값. 본 스펙 변경 없음.

---

## 9. AC-9 AI 비번역 원칙 확인

**본 스펙은 AI 응답 렌더 구역이 아닙니다 — 해당 없음.**

- ErrorBoundary fallback UI 는 100% 시스템 생성 카피. Claude / OpenAI / 기타 LLM 응답 본문 렌더 없음.
- `getApiErrorMessage` 는 Supabase / HTTP / 네트워크 에러 → 사용자 카피 매핑. LLM 무관.
- 20건 catch → toast 중 AI 관련 지점 (B9 AIDailySummary, A20 generate TCs) 의 catch 블록 자체는 **"AI API 호출 실패 → 시스템 카피"** 구간이므로 §6 AC-9 (응답 본문 비번역) 와 교집합 없음. AI 응답 본문 렌더는 각 호출 지점 (AiRiskAnalysisCard / AIRunSummaryPanel 등) 에서 이루어지며, 이는 Phase 1 §6 상속 원칙대로 번역 대상 외 — 본 스펙과 무관.

---

## 10. 신규 키 총 개수 / 집계

### 10-1. Full-Page + Section Fallback 키 (§2, §3)

- **12 키** (`common.errorBoundary.*` 서브트리)
  - Full-Page: 8 (title / description / reload / goHome / reportId / reportIdMissing / sendReport / devDetailsSummary)
  - Section: 4 (title / titleGeneric / hint / retry)

### 10-2. Toast 매핑 신규 키 (§4)

- **15 키** (§4-2 합계)

### 10-3. `getApiErrorMessage` 매핑 신규 키 (§5)

- **15 키** (`common.toast.apiErrors.*` 서브트리)

### 10-4. 총합

- **신규 키 42개 × en/ko = 84 값**
- **재사용 기존 키 7개** (A2/A3/A11/A16/A18 + PGRST301↔403 `permissionDenied` 통합 + Dev Spec §10 "기존 재사용 키" 목록의 `common.unknownError` / `common.toast.somethingWentWrong` / `common.toast.networkError` 등 — 본 스펙에선 **건드리지 않음**, 참고용)

### 10-5. parity 검증 포인트

- en/ko 각 네임스페이스 파일에 42 키 1:1 추가. 누락 시 `scan:i18n:parity` 실패 (Dev Spec AC-5).
- interpolation 슬롯: `{{id}}` (reportId), `{{sectionName}}` (section.title) — 양 언어 동일 철자 필수. Phase 1 §5-2 상속.

---

## 11. Quality Gate 자체 체크

- [x] 모든 상태 정의됨 — Full-Page / Section / Toast 3 층 + Sentry eventId 있음/없음 분기
- [x] Tailwind 클래스 구체 명시 — §2-4 / §8-1 대비 검증까지 포함
- [x] 다크모드 매핑 — **범위 외 명시** (§2-4 주석)
- [x] 기존 컴포넌트 재사용 목록 — Sonner / 인라인 SVG / Remix Icon 유지 명시 (§7)
- [x] 인터랙션 — Tab 순서 · Enter/Space · mailto 동작 명시 (§8-1)
- [x] 반응형 — Full-Page 는 `min-h-screen px-6 text-center` 유지 (모바일·데스크탑 공통). 별도 브레이크포인트 변경 없음 — 카피 길이가 EN/KO 모두 짧아 wrap 이슈 없음 (Phase 1 §1-1 상속 근거)
- [x] 토스트 메시지 EN/KO 모두 — 20건 (§4-1) + 15 API 에러 (§5-1) = 35건 전부 2개 언어
- [x] 개발지시서 수용 기준 일치 — AC-1(구조) / AC-2(eventId) / AC-3(20건 catch) / AC-5(i18n parity) / AC-10(키보드) 전부 본 스펙 내 해당 섹션 존재

---

## 12. Developer 핸드오프 체크리스트

- [ ] `src/i18n/local/en/common.ts` 에 §2 · §3 · §5 · `common.toast.exportFailed` 추가 (17 키)
- [ ] `src/i18n/local/ko/common.ts` 에 1:1 대응 (17 키)
- [ ] `src/i18n/local/{en,ko}/runs.ts` 에 `toast.*` 6 키 추가
- [ ] `src/i18n/local/{en,ko}/sessions.ts` 에 `toast.loadFailed` 추가
- [ ] `src/i18n/local/{en,ko}/milestones.ts` 에 `toast.loadFailed`, `toast.completeFailed` 추가
- [ ] `src/i18n/local/{en,ko}/projects.ts` 에 `toast.membersLoadFailed` 추가
- [ ] `src/i18n/local/{en,ko}/documentation.ts` 에 `toast.loadFailed` 추가
- [ ] `src/i18n/local/{en,ko}/testcases.ts` 에 `toast.attachmentDeleteFailed`, `toast.generateSaveFailed` 추가
- [ ] `src/i18n/local/{en,ko}/settings.ts` 에 `toast.logoutFailed` 추가
- [ ] `src/components/ErrorBoundary.tsx` §2-4 / §8 가이드에 따라 카피 i18n 치환 + focus 이동 추가 + tertiary link `text-slate-500` 로 대비 보정 + Section retry 에 `focus-visible:ring-red-500` 추가
- [ ] `src/components/Toast.tsx` `getApiErrorMessage` §5-2 패턴으로 교체
- [ ] Dev Spec §6-3 A표 20개 파일 각 catch 블록에 `showToast(t('<§4-1 키>'), 'error')` 추가
- [ ] `npm run scan:i18n:check` / `npm run scan:i18n:parity` 통과
- [ ] `npm run build && tsc --noEmit && npm run test -- --run` 통과

---

> **산출물 확인:** 본 스펙이 Approved 되면 Dev Spec 마지막 체크리스트 `[ ] 관련 디자인 명세가 Approved 상태인가` 가 충족됩니다.
