# Dev Spec: i18n 커버리지 완성 — 영문 하드코딩 전역 제거 (1차: Milestone Overview + Issues 클러스터)

> **작성일:** 2026-04-21
> **작성자:** @planner
> **상태:** Draft → Review → Approved
> **관련 디자인:** 없음 (텍스트 교체만, UI 레이아웃 무변경)
> **feature_list.json:** f010 (P1)
> **영향 범위:** `src/pages/milestone-detail/`, `src/components/issues/`, `src/pages/run-detail/components/AIRunSummaryPanel.tsx`, `src/i18n/local/{en,ko}/`, `scripts/` (신규)

---

## 1. 개요

### 문제
현재 리포지토리에는 305개의 `.ts/.tsx` 소스 파일이 있지만 `useTranslation` / `i18next` / `i18n.t()` 중 하나라도 사용하는 파일은 **17개 (5.6%)** 에 불과하다. 나머지 ~261개 컴포넌트는 JSX 본문·`aria-label`·`title`·`placeholder`·`showToast()`에 영문 문자열을 직접 박아 놓았기 때문에, 언어 설정을 `ko`로 바꿔도 **대부분의 화면이 영어로 노출**된다. QA 리포트(`qa-report-milestone-overview-v2`, `qa-report-milestone-overview-redesign`)와 `Polish_Audit.md` 그리고 `progress.txt`에서 **M-2 / L-3 / L-5** 로 반복 지적된 이슈이며, KO 서비스 오픈 전 반드시 해소되어야 한다.

### 해결
1차 스코프를 **QA 리포트에서 명시 지적된 Milestone Overview 영역 + Issues 탭 클러스터**로 제한한다. 해당 클러스터의 모든 하드코딩 영문을 i18next 네임스페이스 키로 교체하고, 동시에 **재현 가능한 하드코딩 스캔 CLI** (`scripts/scan-i18n.ts`)를 커밋해 앞으로 각 PR의 리그레션을 막는다. plan-detail/page.tsx·run-detail/page.tsx (총 8,660줄)는 단일 Dev Spec 범위 초과로 **2차 (`dev-spec-i18n-coverage-phase2.md`) 로 이관**한다.

### 성공 지표
- `ko` 로케일로 **Milestone Detail (Overview / Activity / Issues 탭) + Plan Detail Issues 탭** 진입 시, 지정 셀렉터(`data-allow-en`) 외의 영문 텍스트 **0건** (E2E 스냅샷으로 자동 검증).
- `npm run scan:i18n` CLI가 1차 스코프 디렉터리(§4-1 A) 대상 **하드코딩 매치 0건** 반환.
- i18n 공백으로 인한 미번역 키 런타임 경고 (`i18next::translator` missingKey) **0건** (개발 콘솔 기준).

---

## 2. 유저 스토리

- As a **한국어 사용자 (KO)**, I want to see Milestone Overview와 Issues 탭의 모든 레이블·상태 뱃지·토스트가 한국어로 노출되기를 바란다, so that 다국어 서비스로 느껴지고 중요한 경고 메시지 (예: "Metadata unavailable", "Failed to refresh issues")를 오해 없이 이해할 수 있다.
- As a **개발자**, I want 재현 가능한 `npm run scan:i18n` 스캐너가 있기를 바란다, so that PR 리뷰 시 새로 들어온 하드코딩을 CI에서 잡아낼 수 있다.
- As a **PM**, I want 새 컴포넌트를 추가할 때 따를 수 있는 **네임스페이스 분류 룰과 키 네이밍 컨벤션**이 문서화되기를 바란다, so that 앞으로의 i18n 작업이 더 이상 즉흥적이지 않다.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1:** 1차 스코프 파일 목록(§7)에 속한 모든 파일에서 `>Plain English Text<` 형태의 하드코딩, `placeholder="…"`, `aria-label="…"`, `title="…"`, `showToast('…', …)`, `throw new Error('…')`(유저 가시 에러) 중 **고정된 영문 문자열이 남아있지 않다** (데이터 필드값 / 브랜드명 "Testably" / "Jira" / "GitHub" / "Claude" / Plan 이름 / 로케일 코드 "en", "ko" 제외).
- [ ] **AC-2:** 스코프 내 모든 컴포넌트가 `import { useTranslation } from 'react-i18next'` 또는 부모로부터 내려받은 `t` 함수를 통해 텍스트를 렌더한다. 컴포넌트 단위 React Testing Library 테스트에서 `i18n.changeLanguage('ko')` 호출 후 `screen.getByText(/Sub Milestones/i)` 가 **throw** 하고 `screen.getByText(/하위 마일스톤/i)` 가 **pass** 한다.
- [ ] **AC-3:** `src/i18n/local/en/` 하의 모든 네임스페이스 파일에 대해, 동일 키 트리가 `src/i18n/local/ko/` 에 존재한다 (누락된 키 0개). `scripts/scan-i18n.ts --check-parity` 실행 시 exit code 0.
- [ ] **AC-4:** `npm run scan:i18n` 실행 시 1차 스코프 디렉터리(§4-1 A)에서 **Regex 기반 영문 하드코딩 매치 0건**을 반환한다. 예외 허용 리스트(`.i18nignore`)는 브랜드명 / 단위(e.g. "TCs / day") / 아이콘 클래스 문자열에 한정.
- [ ] **AC-5:** 런타임 `i18next::translator` 의 `missingKey` 경고가 Milestone Detail + Issues 탭 E2E 진입 시 콘솔에 0건. Playwright `page.on('console')` 기반 검증 스펙 1개를 `e2e/i18n-coverage.spec.ts` 에 추가한다.
- [ ] **AC-6:** Plural / interpolation / relative-time 포맷이 `LastSyncedLabel` · `AiRiskAnalysisCard.relativeTime()` · `IssuesList` 의 `runs_plural / tcs_plural / last_synced_*` 키에서 **i18next 표준 `_one` / `_other` suffix** 로 정의된다. `t('runs', { count: 1 })` → "1 run" / "1개 실행", `{ count: 3 }` → "3 runs" / "3개 실행" 이 각 언어에서 올바르게 반환된다 (유닛 테스트 1건).
- [ ] **AC-7:** Relative time 키 ("just now", "5m ago", "2h ago", "3d ago")는 단일 키 `common.relativeTime.*` 로 통합되어 `AiRiskAnalysisCard`, `Activity24hFeed`, `LastSyncedLabel` 세 곳이 동일 헬퍼 `formatRelativeTime(iso, t)` 를 재사용한다. (라이브러리 i18next-http-backend / relative-time-format 추가 도입 **없음** — 런타임 풋프린트 유지)
- [ ] **AC-8:** fallback 동작: `en` 리소스에만 있고 `ko` 에 아직 없는 키를 `useTranslation('ns').t('missing')` 로 호출하면 **영문 원문이 반환**되며 (i18next fallbackLng='en' 이미 설정), `missingKey` 경고가 dev 콘솔에 출력된다. 키가 아예 없으면 키 문자열 자체가 반환된다 (fallback 미동작 케이스). 이 두 동작이 README 또는 `docs/i18n-guide.md` 에 1문단으로 문서화된다.
- [ ] **AC-9:** AI가 생성한 영문 문자열(예: Claude 응답에 들어온 observations/recommendations 본문)은 **번역 대상이 아니라** 응답 문자열을 그대로 렌더한다. 대신 **감싸는 레이블**("Summary" / "Observations" / "Recommendations")만 i18n 처리. 이 정책이 코드 주석(`AiRiskAnalysisCard.tsx` 상단)과 이 Dev Spec §11 에 명시된다.
- [ ] **AC-10:** 번역 키 추가 건수 ≤ 180개 (en + ko 합산 ≈ 360 신규 라인). 초과 시 추가 네임스페이스 도입 또는 2차 스코프로 분리.

---

## 4. 기능 상세

### 4-1. 범위 확정

**하드코딩 스캔 결과 (Grep `>[A-Z][a-z][a-zA-Z ]{2,}<` 기준, 2026-04-21):**

| 디렉터리 | 파일 수 | JSX 텍스트 hit | `aria-label`/`title`/`placeholder` hit | `showToast` hit | 1차 포함 여부 |
|---------|--------|---------------|---------------------------------------|-----------------|--------------|
| `src/pages/milestone-detail/` | 14 | 32 | 20 | 1 | **포함 (A)** |
| `src/components/issues/` | 5 | 8 | 5 | 3 | **포함 (A)** |
| `src/pages/run-detail/components/AIRunSummaryPanel.tsx` | 1 | 12 | 2 | 0 | **포함 (A)** |
| `src/pages/plan-detail/page.tsx` | 1 | 72 | 25+ | 37 | **제외 — 2차 (B)** |
| `src/pages/run-detail/page.tsx` | 1 | 94 | 30+ | 29 | **제외 — 2차 (B)** |
| 그 외 ~261 파일 | ~261 | 未계측 | 未계측 | 未계측 | **제외 — 3차+** |

**A. 1차 스코프 (이번 Dev Spec에서 교체):** 20개 파일
- `src/pages/milestone-detail/`: 14개 (page.tsx, OverviewTab.tsx, BurndownChart.tsx, KpiStrip.tsx, FailedBlockedCard.tsx, VelocitySparkline.tsx, TopFailTagsCard.tsx, ContributorsCard.tsx, Activity24hFeed.tsx, ExecutionSections.tsx, RiskSignalCard.tsx, AiRiskAnalysisCard.tsx, RiskInsightContainer.tsx, RollupBadge.tsx)
- `src/components/issues/`: 5개 (IssuesList.tsx, LastSyncedLabel.tsx, IssueAssignee.tsx, IssuePriorityBadge.tsx, IssueStatusBadge.tsx)
- `src/pages/run-detail/components/AIRunSummaryPanel.tsx`: 1개 (Claude 응답 주변 레이블만)

**B. 2차 스코프 (별도 Dev Spec로 이관):**
- `src/pages/plan-detail/page.tsx` (3,415줄)
- `src/pages/run-detail/page.tsx` (5,245줄)
→ 각 파일을 섹션 단위로 분할한 별도 Dev Spec에서 다룬다. 이번 스캐너에는 `.i18nignore` 등재하여 현 상태 유지 허용.

**C. 3차 스코프 (그 외 디렉터리, 전수 조사):**
- 이번 Dev Spec 완료 후, `scripts/scan-i18n.ts`를 모든 `src/` 하위에 돌려 전수 리스트를 출력 → 별도 Epic으로 분해.

### 4-2. 네임스페이스 배치 전략

기존 네임스페이스는 10개 (`common / projects / testcases / runs / sessions / milestones / documentation / settings / onboarding / environments`). **신규 네임스페이스를 추가하지 않고**, 기존에 편입한다. 이유: 네임스페이스가 많아질수록 `useTranslation('ns')` 호출 폭발 → 리팩토링 비용 증가.

**배치 룰:**

| 대상 | 편입 네임스페이스 | 키 프리픽스 |
|------|-----------------|-----------|
| Risk Signal / AI Risk Analysis 카드 | `milestones` (이미 존재, `aiRisk.*` / `riskSignal.*`) | `milestones.riskSignal.*`, `milestones.aiRisk.*` |
| KPI / Burndown / Velocity / TopFailTags / FailedBlocked / Contributors / Activity24hFeed / Execution sections | `milestones` (`detail.overview.*` 확장) | `milestones.detail.overview.{kpi,burndown,velocity,topFailTags,failedBlocked,contributors,activity,sections}.*` |
| RollupBadge | `milestones` (이미 존재, `rollupBadge*`) | `milestones.rollupBadge.*` |
| IssuesList / LastSyncedLabel / IssuePriorityBadge / IssueStatusBadge / IssueAssignee | **`common`** 하위 **`issues.*`** 서브트리 (여러 스코프에서 공유되므로) | `common.issues.*` |
| AIRunSummaryPanel 레이블 | `runs` (이미 존재, `aiSummary.*` 서브트리 신규) | `runs.aiSummary.*` |
| Relative time ("just now", "5m ago" 등) | **`common.time.*`** 신규 서브트리 | `common.time.justNow`, `common.time.minutesAgo_one`, `common.time.minutesAgo_other`, `common.time.hoursAgo_one`, `common.time.hoursAgo_other`, `common.time.daysAgo_one`, `common.time.daysAgo_other` |
| 토스트 공통 ("Failed to refresh", "Saved successfully") | `common.toast.*` 서브트리 신규 | `common.toast.refreshFailed` 등 |

### 4-3. 키 네이밍 컨벤션

기존 키는 두 가지 스타일이 혼재한다:
1. **flat camelCase** (common.ts, runs.ts): `createRun`, `noData`, `passRate`
2. **중첩 dot camelCase** (milestones.ts): `detail.overview.kpi.etaOnTrack`, `aiRisk.error.timeout`

신규 키는 **중첩 dot camelCase 한 가지로 통일**한다. 기존 flat 키는 이번 Dev Spec에서 리네임하지 않으며 (리그레션 리스크), 새 키만 컨벤션을 따른다.

**규칙:**
- 3-depth 이하: `<namespace>.<feature>.<element>` (예: `milestones.detail.overview.sections.subMilestones`)
- 4-depth 허용: 뱃지·에러 코드·상태 variant 구분이 필요할 때만 (예: `milestones.aiRisk.error.timeout`)
- 5-depth 이상 금지.
- **복수형 키**는 i18next 표준 suffix `_one` / `_other` 사용 (JSON ICU 형식은 미도입 — 런타임 풋프린트 유지).
- **Interpolation 변수**는 명시적으로 `{{camelCase}}` (예: `'ETA in {{days}} days'`) — 한국어에서도 동일 변수명 유지.
- **Placeholder 키**는 `.placeholder` 접미사 (예: `common.issues.searchPlaceholder`).
- **aria-label / title 전용 키**는 `.a11y.*` 서브트리 (예: `milestones.detail.overview.a11y.riskRegion`).

### 4-4. 복수형 / 변수 interpolation / 날짜·숫자 포맷

- **Plural:**
  ```ts
  // en
  'common.issues.runCount_one': '{{count}} run',
  'common.issues.runCount_other': '{{count}} runs',
  // ko
  'common.issues.runCount_one': '실행 {{count}}건',
  'common.issues.runCount_other': '실행 {{count}}건',
  ```
  `t('common:issues.runCount', { count: n })` 호출. i18next는 설정 없이 자동으로 `_one` / `_other` 해석.

- **Relative time:** `src/lib/issueMetadata.ts` 의 `formatRelativeTime(iso)` 를 `formatRelativeTime(iso, t)` 로 시그니처 변경하고, 반환 문자열을 아래 키 조합으로 생성한다:
  ```ts
  if (diffMin < 1) return t('common:time.justNow');
  if (diffMin < 60) return t('common:time.minutesAgo', { count: diffMin });
  if (diffHr  < 24) return t('common:time.hoursAgo',   { count: diffHr  });
  return t('common:time.daysAgo', { count: diffDay });
  ```
  `AiRiskAnalysisCard.tsx:12~23` 의 인라인 `relativeTime()` 과 `Activity24hFeed.tsx:17~24` 의 인라인 버전을 **삭제**하고 공통 헬퍼를 재사용. (AC-7)

- **날짜 포맷:** `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })` 호출이 6곳 이상 박혀 있다 (BurndownChart:36, ExecutionSections:188/278, IssuesList:320 …). 이를 `src/lib/dateFormat.ts` 헬퍼로 추출하고 **i18n.language 에 따라 로케일 문자열을 동적으로 전달** (`i18n.language === 'ko' ? 'ko-KR' : 'en-US'`). 헬퍼 내부에서 여전히 `Intl.DateTimeFormat` 사용 → 외부 의존성 추가 없음.

- **숫자 포맷:** Percentage / 소수점 / 카운트는 현재 JS 기본 `toFixed` / `Math.round` 그대로 유지 (locale-specific 천단위 구분자는 이번 스코프 외).

### 4-5. 스캔 스크립트

`scripts/scan-i18n.ts` 를 신규 작성한다 (Node + TypeScript, `ts-node` 실행). `package.json` 에 다음 3개 스크립트 추가:
```json
"scan:i18n":         "ts-node scripts/scan-i18n.ts",
"scan:i18n:check":   "ts-node scripts/scan-i18n.ts --fail-on-match",
"scan:i18n:parity":  "ts-node scripts/scan-i18n.ts --check-parity"
```

**기능:**
1. `--fail-on-match` 없이 실행 시: 1차 스코프 디렉터리(§4-1 A) 아래 모든 `.tsx`/`.ts` 파일에서 다음 패턴을 탐색하고 `file:line:snippet` 형식으로 콘솔 출력.
   - JSX 텍스트 노드: `>` 뒤 대문자로 시작하는 3글자 이상 ASCII 단어 (regex `>[A-Z][a-zA-Z ]{2,}<`)
   - `placeholder|aria-label|title|alt=` 속성에 영문 값
   - `showToast\(\s*['"]` 안의 영문
2. `--fail-on-match`: 매치가 1건이라도 있으면 exit 1 (CI에서 사용).
3. `--check-parity`: `src/i18n/local/en/**/*.ts` 와 `src/i18n/local/ko/**/*.ts` 의 키 트리를 비교, 한쪽에만 있으면 list + exit 1.
4. `.i18nignore` 파일(루트 위치) 읽어 예외 허용 (line 단위 glob + regex).

**예외 허용 리스트 (`.i18nignore` 초안):**
```
# 브랜드명 / 고유명사
>Testably<
>Jira<
>GitHub<
>Claude<
>Paddle<
>LemonSqueezy<

# 짧은 단위 / 기호 포함 문자열 (데이터 필드 출력)
>TCs<
>P[0-9]<

# 2차 스코프 (별도 Dev Spec에서 처리)
src/pages/plan-detail/page.tsx
src/pages/run-detail/page.tsx
```

### 4-6. 동작 흐름 (Flow)

**정상 흐름 (Happy Path) — 개발자 관점:**
1. 개발자가 `src/pages/milestone-detail/FailedBlockedCard.tsx` 를 연다.
2. 상단에 `const { t } = useTranslation('milestones');` 추가.
3. `Failed &amp; Blocked` → `t('detail.overview.failedBlocked.title')` 교체.
4. `src/i18n/local/en/milestones.ts` 의 `detail.overview` 트리에 `failedBlocked.title: 'Failed & Blocked'` 추가.
5. `src/i18n/local/ko/milestones.ts` 에 동일 키로 `failedBlocked.title: '실패 및 차단'` 추가.
6. `npm run scan:i18n` 실행 → 해당 파일 매치 0건 확인.
7. `npm run scan:i18n:parity` → en/ko 키 paritiy 0 diff 확인.
8. `npm run test` 스냅샷 테스트 통과.

**대안 흐름 (Alternative):**
- 동일 문자열("Failed & Blocked")이 다른 파일에도 쓰이는 경우: `common.ts` 로 승격하지 말고, **우선 해당 컴포넌트가 속한 네임스페이스에 별도 키로 추가**한다. (과도한 `common` 비대화 방지). 추후 3건 이상 재사용이 확인되면 리팩토링 티켓에서 승격.

**에러 흐름:**
- 개발자가 `t('missing.key')` 호출: i18next fallbackLng='en' 동작으로 `missing.key` 문자열 자체 반환 + dev 콘솔 `missingKey` 경고 출력. CI 단계에서 `--check-parity` 가 차단.
- AI 응답(Claude)이 영어로 observations 반환: 이는 **정상** (AC-9). 래핑 레이블만 i18n 처리되고 본문은 pass-through.

### 4-7. 권한 (RBAC)

| 역할 | 영향 |
|------|------|
| Owner / Admin / Manager / Tester / Viewer / Guest | 모두 동일하게 번역 결과만 받는다. **RBAC 변경 없음.** |

### 4-8. 플랜별 제한

| 플랜 | 제한 | 비고 |
|------|------|------|
| Free / Hobby / Starter / Pro / Enterprise | 모두 동일 | 번역 기능은 플랜 관계없이 제공 |

---

## 5. 데이터 설계

**변경 없음.** 이 Dev Spec은 순수 프론트엔드 리팩토링이다. DB 스키마 / RLS 정책 / API 엔드포인트 모두 무변경.

---

## 6. API 설계

**변경 없음.**

단, 기존 Edge Function 중 일부가 **유저 가시 에러 메시지를 영문 고정 문자열로 반환** 하는 건(예: `milestone-ai-risk` 의 `error: 'ai_timeout'`)은 현재처럼 **에러 코드만 반환**하고, 프론트가 `milestones.aiRisk.error.timeout` 로 번역하는 기존 패턴을 유지한다. (이미 `RiskInsightContainer.tsx:189-199` 에 동일 패턴 구현되어 있음 — 본 Dev Spec이 해당 fallback 문자열만 i18n 키로 교체.)

---

## 7. 영향 범위 (변경 파일 목록)

### 신규 파일

| 파일 | 역할 |
|------|------|
| `scripts/scan-i18n.ts` | 하드코딩 탐지 + en/ko parity 체크 CLI |
| `.i18nignore` | 스캐너 예외 허용 룰 |
| `src/lib/dateFormat.ts` | `formatShortDate(iso, locale)` 헬퍼 |
| `e2e/i18n-coverage.spec.ts` | Playwright로 `ko` 진입 시 `missingKey` 경고 0건 + 영문 텍스트 0건 검증 |
| `docs/i18n-guide.md` | (선택) 네이밍 컨벤션 / 네임스페이스 룰 / fallback 동작 문서 |

### 수정 파일

**Milestone Detail 클러스터 (14개):**
| 파일 | 주요 변경 |
|------|---------|
| `src/pages/milestone-detail/page.tsx` | `t()` 바인딩 + 토스트 메시지 1건 교체 |
| `src/pages/milestone-detail/OverviewTab.tsx` | `riskBullets` 4건 + 기타 라벨 교체 |
| `src/pages/milestone-detail/BurndownChart.tsx` | 'Burndown', 'Start running tests to see burndown', 'Ideal'/'Actual'/'Projected', range tab labels 'All' |
| `src/pages/milestone-detail/KpiStrip.tsx` | 'Remaining', 'Executed', 'Velocity', 'Pass Rate', '{n} total', 'of {n}', 'TCs / day', '{n} passed' (현재 일부는 i18n 적용되어 있음) |
| `src/pages/milestone-detail/FailedBlockedCard.tsx` | 'Failed & Blocked', 'View all →', 'No failed or blocked TCs 🎉', aria-label |
| `src/pages/milestone-detail/VelocitySparkline.tsx` | 'Velocity', 'no executions', '{avg} avg', aria-label, DAY_LABELS |
| `src/pages/milestone-detail/TopFailTagsCard.tsx` | 'Top-Fail Tags', 'of {n} fails', 'No tags on failed TCs', aria-label |
| `src/pages/milestone-detail/ContributorsCard.tsx` | 'Contributors — Top 5', 'No contributors yet', '{n} TCs', aria-label |
| `src/pages/milestone-detail/Activity24hFeed.tsx` | 'Last 24h', 'No activity in the last 24 hours', 'View all →', 'View full activity →', 'Someone', 'passed/failed/blocked/retested/noted' (6건), ' in ', `relativeTime()` 함수 제거 |
| `src/pages/milestone-detail/ExecutionSections.tsx` | 'Sub Milestones', 'Test Plans', 'Runs', 'Exploratory', 'Priority: ', 'Target {date}', 'passed/failed/blocked/untested' stat 라벨, 'Plan: ', 'Plan: (deleted)', 'Milestone-direct', 'Planned', 'Failed to load plans.', 'Note/Bug/Obs/Step' segment labels |
| `src/pages/milestone-detail/RiskSignalCard.tsx` | 'Risk Signal', 'Critical'/'At Risk'/'On track', 'Keep running tests to build risk signal.', aria-label |
| `src/pages/milestone-detail/AiRiskAnalysisCard.tsx` | 'AI Risk Analysis', 'Last analyzed {time}' (stale suffix ' (stale)' 포함), 'Refreshing'/'Refresh', 'Critical/At Risk/On track', 'Low confidence', 'Summary'/'Observations'/'Recommendations', aria-labels. `relativeTime()` 인라인 제거 → `formatRelativeTime` 재사용 |
| `src/pages/milestone-detail/RiskInsightContainer.tsx` | 모든 토스트·에러 배너·CTA·viewer message·quota banner 메시지 교체 (현재 ~15 메시지) |
| `src/pages/milestone-detail/RollupBadge.tsx` | 이미 i18n 적용됨 — 변경 없음 (스캐너 0건 확인용) |

**Issues 클러스터 (5개):**
| 파일 | 주요 변경 |
|------|---------|
| `src/components/issues/IssuesList.tsx` | 'Sources', 'All/Jira/GitHub', 'Total Issues'/'Jira'/'GitHub'/'Linked TCs'/'bug reports'/'issues'/'with issue', 'from {n} runs' (plural), 'Loading issues…', 'No issues linked yet.', '{n} TCs with linked issues.', 'Metadata unavailable', 'Please wait before refreshing again', 'Failed to refresh issues. Retry later.', 'Synced {n} issues', aria-label ('{source} issue {key}...') |
| `src/components/issues/LastSyncedLabel.tsx` | 'Last synced {time}', 'Not synced yet', 'Syncing…', 'Refresh now', aria-label |
| `src/components/issues/IssueAssignee.tsx` | 'Unassigned' (가정, 코드 확인 후 확정) |
| `src/components/issues/IssuePriorityBadge.tsx` | 'Critical/High/Medium/Low/Unknown' 또는 '—' fallback |
| `src/components/issues/IssueStatusBadge.tsx` | 'Open/In Progress/Done/Closed/Unknown' |

**Run Detail 컴포넌트 (1개):**
| 파일 | 주요 변경 |
|------|---------|
| `src/pages/run-detail/components/AIRunSummaryPanel.tsx` | 'AI Run Summary' 헤더 / 'Regenerate' / 'Analyzing…' / 섹션 레이블. **본문 요약 텍스트는 AC-9에 따라 번역 대상 아님** |

**i18n 리소스 (4개):**
| 파일 | 주요 변경 |
|------|---------|
| `src/i18n/local/en/milestones.ts` | `detail.overview.{failedBlocked,velocity,topFailTags,contributors,activity,sections}.*` 서브트리 확장 (~60 신규 키) |
| `src/i18n/local/ko/milestones.ts` | 위와 동일 트리 한국어 번역 |
| `src/i18n/local/en/common.ts` | `issues.*` 서브트리 + `time.*` relative-time 서브트리 + `toast.*` 서브트리 신규 (~50 신규 키) |
| `src/i18n/local/ko/common.ts` | 위와 동일 |
| `src/i18n/local/en/runs.ts` | `aiSummary.*` 서브트리 신규 (~12 키) |
| `src/i18n/local/ko/runs.ts` | 위와 동일 |

**기타 수정:**
| 파일 | 주요 변경 |
|------|---------|
| `src/lib/issueMetadata.ts` | `formatRelativeTime(iso: string)` → `formatRelativeTime(iso: string, t: TFunction)` 시그니처 변경. 호출처 2개소 (IssuesList, LastSyncedLabel) 시그니처 업데이트. |
| `package.json` | `scripts.scan:i18n` / `scan:i18n:check` / `scan:i18n:parity` 3개 추가 |
| `.github/workflows/ci.yml` (존재 시) | `scan:i18n:check` + `scan:i18n:parity` 단계 추가 — **선택 사항** |

**총 신규/수정 파일: 약 30개. 신규 번역 키 수: ~120 en + 120 ko = 240 라인 (AC-10 한도 180 키 내).**

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| `ko` 에 키 누락, `en` 에만 존재 | i18next fallback → 영문 렌더, dev 콘솔에 `missingKey` 경고, CI `parity` 단계 실패 |
| `en`·`ko` 둘 다 키 누락 | `t('foo.bar')` 가 `foo.bar` 문자열 반환 (대문자 아니므로 스캐너 fail-on-match 걸리지 않음). 런타임 `missingKey` 경고로 감지. |
| Interpolation 변수 미전달 (`t('ETA {{days}} days', {})`) | "ETA  days" 렌더 (공백 2개). TypeScript 타입 가드 없음 — 코드 리뷰로 차단. |
| Plural count=0 | i18next는 `_other` 로 해석 (영·한 모두 복수형 한 가지면 충분). `{count}건` 은 0일 때 "0건" — 자연스러움. |
| AI 응답이 KO 유저에게 영어로 반환 | AC-9: 의도된 동작. 래핑 레이블만 번역. (향후 LLM 프롬프트에 "respond in {lang}" 주입은 별도 티켓.) |
| `toLocaleDateString` 호출 시 i18n.language 가 변경 중 | `formatShortDate` 헬퍼가 `i18n.language` 를 매 호출 시 읽으므로 즉시 반영. 기존 메모이제이션 없음. |
| 네트워크 끊김으로 i18n 리소스 로드 실패 | 현 구조는 리소스를 **정적 번들**(`src/i18n/local/*.ts`)로 import — 네트워크 의존 없음. 이슈 발생 불가. |
| 빌드 사이즈 증가 | ~240 라인 추가 ≈ 8~12KB gzip. 허용 범위. |
| 동시 편집 (개발자 A·B 가 서로 다른 파일에서 동일 키 추가) | 키 prefix가 컴포넌트 scope 를 따르므로 충돌 드묾. 충돌 시 merge conflict로 즉시 감지. |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] **`src/pages/plan-detail/page.tsx`** (3,415줄, 72 JSX + 37 toast hit) — 2차 Dev Spec으로 분리.
- [ ] **`src/pages/run-detail/page.tsx`** (5,245줄, 94 JSX + 29 toast hit) — 2차 Dev Spec으로 분리.
- [ ] **그 외 ~245 미적용 파일** (projects list, settings, testcases, sessions, onboarding, admin, blog, pricing, legal 등) — 3차+ Epic.
- [ ] **백엔드 응답 메시지 번역** (Edge Function 에러 문자열, Supabase RLS violation 메시지, auth 에러) — 서버가 에러 **코드**만 반환하고 클라이언트가 번역하는 기존 패턴 유지. 서버 직접 번역은 별도 설계.
- [ ] **PDF / Excel Export 라벨 번역** — export 엔진(dev-task-dashboard-export-pdf-8page 기반)은 영문 고정. 다국어 export는 별도 티켓.
- [ ] **Landing / Blog / Pricing / Legal / About / Contact / Use Cases / Features / Compare / Changelog / Roadmap 페이지** — 마케팅 카피는 문구 자체가 카피라이팅 대상이므로 @marketer 와 별도 협업.
- [ ] **Date/Number locale 천단위 구분자**(`Intl.NumberFormat` 도입) — 이번엔 날짜만. 숫자는 별도.
- [ ] **RTL 언어 지원** — 현재는 KR/EN만, 향후 확장.
- [ ] **i18next-http-backend 도입 (런타임 리소스 로딩)** — 현 정적 번들 유지. 번들 사이즈가 문제 될 때 재검토.
- [ ] **기존 flat 키의 중첩 camelCase 리네임** — 리그레션 리스크 대비 이득 부족. 신규 키만 컨벤션 따름.
- [ ] **AI 응답 다국어 지원** (Claude 프롬프트에 locale 주입) — 별도 이슈 (f011 비용/모니터링 관련과 함께 논의).

---

## 10. i18n 키 (대표 샘플, 전량은 PR에서 확인)

### `common.time.*` (신규)
| 키 | EN | KO |
|----|----|----|
| `common.time.justNow` | "just now" | "방금 전" |
| `common.time.minutesAgo_one` | "{{count}}m ago" | "{{count}}분 전" |
| `common.time.minutesAgo_other` | "{{count}}m ago" | "{{count}}분 전" |
| `common.time.hoursAgo_one` | "{{count}}h ago" | "{{count}}시간 전" |
| `common.time.hoursAgo_other` | "{{count}}h ago" | "{{count}}시간 전" |
| `common.time.daysAgo_one` | "{{count}}d ago" | "{{count}}일 전" |
| `common.time.daysAgo_other` | "{{count}}d ago" | "{{count}}일 전" |

### `common.issues.*` (신규)
| 키 | EN | KO |
|----|----|----|
| `common.issues.sources` | "Sources" | "소스" |
| `common.issues.all` | "All" | "전체" |
| `common.issues.totalIssues` | "Total Issues" | "전체 이슈" |
| `common.issues.linkedTcs` | "Linked TCs" | "연결된 TC" |
| `common.issues.bugReports` | "bug reports" | "버그 리포트" |
| `common.issues.withIssue` | "with issue" | "이슈 연결됨" |
| `common.issues.fromRuns_one` | "from {{count}} run" | "실행 {{count}}건에서" |
| `common.issues.fromRuns_other` | "from {{count}} runs" | "실행 {{count}}건에서" |
| `common.issues.lastSynced` | "Last synced {{time}}" | "마지막 동기화 {{time}}" |
| `common.issues.notSyncedYet` | "Not synced yet" | "아직 동기화 안됨" |
| `common.issues.syncing` | "Syncing…" | "동기화 중…" |
| `common.issues.refreshNow` | "Refresh now" | "지금 새로고침" |
| `common.issues.loading` | "Loading issues…" | "이슈 불러오는 중…" |
| `common.issues.empty.title` | "No issues linked yet." | "연결된 이슈가 없습니다." |
| `common.issues.empty.hint` | "Issues appear here once you link Jira or GitHub issues from failed test results." | "실패한 테스트 결과에 Jira 또는 GitHub 이슈를 연결하면 여기에 표시됩니다." |
| `common.issues.metadataUnavailable` | "Metadata unavailable" | "메타데이터 불러올 수 없음" |
| `common.issues.debounceWait` | "Please wait before refreshing again" | "잠시 후 다시 새로고침해 주세요" |
| `common.issues.refreshFailed` | "Failed to refresh issues. Retry later." | "이슈 새로고침 실패. 잠시 후 다시 시도해 주세요." |
| `common.issues.syncedCount` | "Synced {{count}} issues" | "이슈 {{count}}건 동기화됨" |
| `common.issues.priority.critical` | "Critical" | "심각" |
| `common.issues.priority.high` | "High" | "높음" |
| `common.issues.priority.medium` | "Medium" | "보통" |
| `common.issues.priority.low` | "Low" | "낮음" |
| `common.issues.status.open` | "Open" | "열림" |
| `common.issues.status.inProgress` | "In Progress" | "진행 중" |
| `common.issues.status.done` | "Done" | "완료" |
| `common.issues.status.closed` | "Closed" | "닫힘" |
| `common.issues.unassigned` | "Unassigned" | "담당자 없음" |
| `common.issues.a11y.issueRow` | "{{source}} issue {{key}}, priority {{priority}}, status {{status}}" | "{{source}} 이슈 {{key}}, 우선순위 {{priority}}, 상태 {{status}}" |

### `milestones.detail.overview.failedBlocked.*` (기존 트리 확장)
| 키 | EN | KO |
|----|----|----|
| `...failedBlocked.title` | "Failed & Blocked" | "실패 및 차단" |
| `...failedBlocked.empty` | "No failed or blocked TCs 🎉" | "실패·차단된 TC 없음 🎉" |
| `...failedBlocked.viewAll` | "View all →" | "모두 보기 →" |
| `...failedBlocked.a11y.region` | "Failed and blocked test cases" | "실패·차단된 테스트 케이스" |

### `milestones.detail.overview.velocity.*` (기존 트리 확장)
| 키 | EN | KO |
|----|----|----|
| `...velocity.title` | "Velocity" | "속도" |
| `...velocity.noExecutions` | "no executions" | "실행 없음" |
| `...velocity.avgSuffix` | "{{avg}} avg" | "평균 {{avg}}" |
| `...velocity.a11y.region` | "Velocity last 7 days" | "최근 7일 속도" |

### `milestones.detail.overview.contributors.*`
| 키 | EN | KO |
|----|----|----|
| `...contributors.title` | "Contributors — Top 5" | "기여자 — 상위 5명" |
| `...contributors.empty` | "No contributors yet" | "아직 기여자가 없습니다" |
| `...contributors.countSuffix_one` | "{{count}} TC" | "{{count}}건" |
| `...contributors.countSuffix_other` | "{{count}} TCs" | "{{count}}건" |
| `...contributors.a11y.region` | "Top contributors" | "주요 기여자" |

### `milestones.detail.overview.activity.*`
| 키 | EN | KO |
|----|----|----|
| `...activity.last24h` | "Last 24h" | "최근 24시간" |
| `...activity.empty` | "No activity in the last 24 hours" | "최근 24시간 동안 활동 없음" |
| `...activity.viewAllShort` | "View all →" | "모두 보기 →" |
| `...activity.viewAllFull` | "View full activity →" | "전체 활동 보기 →" |
| `...activity.action.passed` | "passed" | "통과" |
| `...activity.action.failed` | "failed" | "실패" |
| `...activity.action.blocked` | "blocked" | "차단" |
| `...activity.action.retest` | "retested" | "재시도" |
| `...activity.action.default` | "noted" | "메모" |
| `...activity.someone` | "Someone" | "누군가" |
| `...activity.inRun` | "in {{runName}}" | "{{runName}}에서" |

### `milestones.detail.overview.sections.*` (기존 트리 확장)
| 키 | EN | KO |
|----|----|----|
| `...sections.testPlans` | "Test Plans" | "테스트 플랜" |
| `...sections.runs` | "Runs" | "실행" |
| `...sections.exploratory` | "Exploratory" | "탐색" |
| `...sections.loadFailed` | "Failed to load plans." | "플랜 불러오기 실패." |
| `...sections.runBadge.planned` | "Planned" | "계획된" |
| `...sections.runBadge.milestoneDirect` | "Milestone-direct" | "마일스톤 직접" |
| `...sections.runBadge.planLabel` | "Plan: {{name}}" | "플랜: {{name}}" |
| `...sections.runBadge.planDeleted` | "Plan: (deleted)" | "플랜: (삭제됨)" |
| `...sections.plan.priorityLabel` | "Priority: {{priority}}" | "우선순위: {{priority}}" |
| `...sections.plan.targetLabel` | "Target {{date}}" | "목표일 {{date}}" |
| `...sections.stat.passed` | "passed" | "통과" |
| `...sections.stat.failed` | "failed" | "실패" |
| `...sections.stat.blocked` | "blocked" | "차단" |
| `...sections.stat.untested` | "untested" | "미실행" |
| `...sections.session.segment.note` | "Note" | "메모" |
| `...sections.session.segment.bug` | "Bug" | "버그" |
| `...sections.session.segment.obs` | "Obs" | "관찰" |
| `...sections.session.segment.step` | "Step" | "스텝" |

### `milestones.detail.overview.topFailTags.*`
| 키 | EN | KO |
|----|----|----|
| `...topFailTags.title` | "Top-Fail Tags" | "자주 실패하는 태그" |
| `...topFailTags.suffix` | "of {{total}} fails" | "총 {{total}}건 실패 중" |
| `...topFailTags.empty` | "No tags on failed TCs" | "실패 TC에 태그 없음" |
| `...topFailTags.a11y.region` | "Top failing tags" | "자주 실패하는 태그" |

### `milestones.detail.overview.kpi.*` (이미 일부 존재, 누락 키 보충)
| 키 | EN | KO |
|----|----|----|
| `...kpi.remaining` | "Remaining" | "남음" |
| `...kpi.executed` | "Executed" | "실행됨" |
| `...kpi.velocity` | "Velocity" | "속도" |
| `...kpi.passRate` | "Pass Rate" | "통과율" |
| `...kpi.totalSuffix` | "{{n}} total" | "총 {{n}}건" |
| `...kpi.ofTotal` | "of {{n}}" | "{{n}} 중" |
| `...kpi.tcsPerDay` | "TCs / day" | "TC / 일" |
| `...kpi.passedSuffix_one` | "{{count}} passed" | "통과 {{count}}건" |
| `...kpi.passedSuffix_other` | "{{count}} passed" | "통과 {{count}}건" |

### `milestones.detail.overview.burndown.*`
| 키 | EN | KO |
|----|----|----|
| `...burndown.title` | "Burndown" | "번다운" |
| `...burndown.empty` | "Start running tests to see burndown" | "테스트 실행을 시작하면 번다운이 표시됩니다" |
| `...burndown.legend.ideal` | "Ideal" | "이상" |
| `...burndown.legend.actual` | "Actual" | "실제" |
| `...burndown.legend.projected` | "Projected" | "예상" |
| `...burndown.range.all` | "All" | "전체" |

### `common.toast.*` (신규 공통)
| 키 | EN | KO |
|----|----|----|
| `common.toast.saved` | "Settings saved" | "설정이 저장되었습니다" |
| `common.toast.saveFailed` | "Failed to save" | "저장 실패" |
| `common.toast.networkError` | "Network error. Please retry." | "네트워크 오류. 다시 시도해 주세요." |

---

## 11. 리스크

| 리스크 | 영향 | 완화 |
|-------|------|-----|
| **키 충돌** (동일 키가 여러 네임스페이스에 등장) | 미디엄 | 네임스페이스 prefix + `scan:i18n:parity` 로 빌드 단계 차단. 동일 영문 문자열이라도 **문맥이 다르면 별도 키**로 유지 (한국어 문맥 다름: "Failed" 는 상태라면 "실패", 동사라면 "실패함"). |
| **translation 누락 시 fallback** | 로우 | i18next fallbackLng='en' 이미 설정됨. ko 미번역 시 영어로 렌더 + dev 콘솔 경고. CI `parity` 체크로 머지 전 차단. |
| **AI 생성 영문 출력** (Claude observations) | 로우 | AC-9 정책: **응답 본문은 번역 대상 아님**. 래핑 레이블만 번역. 주석 + 이 Dev Spec §11 에 명시. (향후 프롬프트에 locale 힌트 주입은 별도 티켓 f013 제안.) |
| **기존 일부 컴포넌트가 이미 i18n 적용 — 중복 키 생성** | 로우 | `RollupBadge.tsx`, `KpiStrip.tsx`, `ExecutionSections.tsx` 는 일부 i18n 적용. 기존 키 우선 사용, 신규는 누락분만. 작업 전 `grep -rn "useTranslation" src/pages/milestone-detail/` 로 현황 재확인 필수. |
| **`formatRelativeTime` 시그니처 변경으로 호출부 깨짐** | 미디엄 | 호출처 grep (`grep -rn "formatRelativeTime" src/`) 로 모든 사용처 동시 업데이트. TypeScript 컴파일러가 놓치지 않게 함. 현재 호출처: `IssuesList.tsx:320`(간접), `LastSyncedLabel.tsx:15`. |
| **빌드 사이즈 증가** | 로우 | ~12KB gzip. 허용. 초과 시 `i18next-http-backend` 도입 재검토 (별도 티켓). |
| **번역 품질** | 미디엄 | 한국어 원어민 리뷰 1회 필수 (@marketer 또는 CEO 리뷰). QA 탭 용어 ("Burndown", "Retest" 등) 는 기존 서비스 번역어 일관성 확인 필요. |
| **E2E 테스트 flakiness** | 로우 | Playwright 스펙은 i18n 리소스가 정적이라 race condition 없음. missingKey 경고만 `console.warn` 으로 수집. |
| **2차 스코프 지연** | 미디엄 | plan-detail/run-detail 은 해당 스펙 머지 후 즉시 후속 Dev Spec 티켓 생성 (`f010-phase2`). P1 상태 이어서 유지. |

---

## 12. 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1~AC-10)
- [x] DB 스키마가 컬럼 타입/제약조건까지 명시되었는가 (N/A — 프론트 전용)
- [x] RLS 정책이 정의되었는가 (N/A)
- [x] 플랜별 제한이 명시되었는가 (§4-8: 모든 플랜 동일)
- [x] RBAC 권한 매트릭스가 있는가 (§4-7: 영향 없음)
- [x] 변경 파일 목록이 구체적인가 (§7, 30개 파일 실제 경로)
- [x] 엣지 케이스가 식별되었는가 (§8, 9건)
- [x] Out of Scope이 명시되었는가 (§9, 10건)
- [x] i18n 키가 en/ko 둘 다 있는가 (§10 대표 ~60건, 전량은 PR에서 확인)
- [ ] 관련 디자인 명세가 Approved 상태인가 — **N/A (UI 레이아웃 무변경, 텍스트 교체만)**

---

## 13. 후속 작업 (이 스펙 머지 후 즉시 생성할 티켓)

1. **`dev-spec-i18n-coverage-phase2-plan-detail.md`** — `src/pages/plan-detail/page.tsx` 를 섹션 단위(Settings / Criteria / TC List / Activity / Runs) 로 분할 후 개별 번역.
2. **`dev-spec-i18n-coverage-phase2-run-detail.md`** — `src/pages/run-detail/page.tsx` 동일 접근.
3. **`dev-spec-i18n-coverage-phase3-remaining.md`** — 스캐너 전수 리스트를 기반으로 디렉터리별 분할 Epic.
4. **(선택) `dev-spec-ai-locale-hint.md`** — Claude 프롬프트에 `user_locale` 힌트 주입해서 AI 응답 자체를 KO 로 받게 하는 실험.
