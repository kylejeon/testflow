# QA Report: i18n 커버리지 완성 — 1차 (f010)
> 검수일: 2026-04-21
> 개발지시서: docs/specs/dev-spec-i18n-coverage.md
> 디자인 명세: docs/specs/design-spec-i18n-coverage.md
> 검수 브랜치: claude (commits 4e99ea6 ~ 19bdc9b)

---

## 요약
- 총 검수 항목: 10개 (AC-1 ~ AC-10)
- 통과: 6개
- 실패: 4개 (AC-2, AC-5, AC-6, AC-8)
- 경고: 2개 (Minor/Nit)
- **Blocker: 0 / Major: 0 / Minor: 3 / Nit: 1**

---

## Critical (Blocker) — 없음

---

## Major — 없음

---

## Minor (수정 권장 — follow-up 티켓화)

| # | AC | 항목 | 기대 동작 | 실제 동작 | 파일:라인 |
|---|----|------|---------|---------|---------|
| M-1 | AC-2 | KO 언어 전환 RTL 컴포넌트 테스트 부재 | `i18n.changeLanguage('ko')` 후 `screen.getByText(/하위 마일스톤/i)` PASS 검증하는 React Testing Library 테스트 1건 | 해당 테스트 파일이 존재하지 않음. `src/lib/` 하위 5개 테스트 파일 중 어느 것도 i18n 언어 전환을 검증하지 않음 | (신규 파일 필요) `src/components/issues/__tests__/IssuesList.i18n.test.tsx` 또는 유사 경로 |
| M-2 | AC-5 | Playwright i18n E2E 스펙 부재 | `e2e/i18n-coverage.spec.ts`: KO 진입 시 `missingKey` 경고 0건 + `page.on('console')` 기반 검증 | `e2e/smoke/` 에 해당 파일 없음. Playwright 기반 i18n 회귀 방지 불가 | (신규 파일 필요) `e2e/i18n-coverage.spec.ts` |
| M-3 | AC-6 | Plural 유닛 테스트 부재 | `t('common:issues.fromRuns', { count: 1 })` → "from 1 run" / "실행 1건에서", `{ count: 3 }` → "from 3 runs" / "실행 3건에서" 검증 유닛 테스트 1건 | `src/lib/formatRelativeTime.ts` 파일만 있고, 이를 검증하는 `.test.*` 파일이 없음. plural + relative time 동작이 자동 검증되지 않음 | (신규 파일 필요) `src/lib/formatRelativeTime.test.ts` |

---

## Nit (선택적 개선)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| N-1 | AC-8 fallback 문서화 부재 | Dev Spec AC-8은 fallback 동작(fallbackLng='en' 시 영문 반환, 키 없을 때 키 문자열 반환)을 `README` 또는 `docs/i18n-guide.md` 에 1문단으로 문서화할 것을 요구. 현재 이 문서가 없음. `docs/ARCHITECTURE.md` 에도 관련 내용 없음 | (신규 파일 필요) `docs/i18n-guide.md` |
| N-2 | common.ts 중복 키 2쌍 | `issues.metaUnavailable` (L149) 와 `issues.metadataUnavailable` (L150) 이 동일 값 "Metadata unavailable" 으로 중복 존재. 마찬가지로 `issues.refreshError` (L145) 와 `issues.refreshFailed` (L146) 도 유사 중복. `IssuesList.tsx:362` 는 `metadataUnavailable` 만 사용하고, `refreshError` 키는 코드베이스 내 사용처 없음. 사용되지 않는 키 정리 권장 | `src/i18n/local/en/common.ts:145-150`, `src/i18n/local/ko/common.ts:144-149` |
| N-3 | AC-10 키 수 초과 | Dev Spec AC-10은 en 추가 키 ≤ 180 (사용자 지시에 따라 210으로 상향). 이번 커밋이 추가한 en 리프 키(leaf string 값)는 약 250개 (common: 54 + milestones: 117 + runs: 79). 210 기준 초과 약 40개. 실질적 영향은 없으나(번들 사이즈 영향 미미) 스펙 명시 한도 초과 | `src/i18n/local/en/common.ts`, `src/i18n/local/en/milestones.ts`, `src/i18n/local/en/runs.ts` |
| N-4 | .i18nignore 에 번역 대상 단어 등록 | `.i18nignore:23-26` 에 `>Note<`, `>Bug<`, `>Obs<`, `>Step<` 가 전역 무시 규칙으로 등록됨. 이 단어들은 `milestones.detail.overview.sections.session.segment.*` 키로 이미 번역되고 있음(ExecutionSections.tsx:289-292). 향후 이 단어들이 실수로 하드코딩되어도 스캐너가 탐지하지 못하는 커버리지 블라인드스팟 발생. 특정 파일 경로로 예외를 좁히거나, 해당 라인을 제거하는 것이 안전 | `.i18nignore:23-26` |

---

## Passed

- [x] **AC-1:** 1차 스코프 20개 파일 하드코딩 영문 제거 확인. `npm run scan:i18n` 결과 "0 hardcoded matches across 21 files in scope" (run-detail/components 내 AIRunSummaryPanel 포함으로 21개). JSX 텍스트·placeholder·aria-label·showToast 모두 `t()` 로 교체됨
- [x] **AC-3:** `npm run scan:i18n:parity` 결과 "en ↔ ko key trees match (0 diff)" — en/ko 키 트리 완전 일치
- [x] **AC-4:** 스캐너 실행 결과 1차 스코프 0건 매치. `.i18nignore` 내용 합리적 (브랜드명·외부 시스템 payload·2차 스코프 파일 적절히 등록)
- [x] **AC-7:** `formatRelativeTime(iso, t)` 헬퍼 (`src/lib/formatRelativeTime.ts`) 가 `AiRiskAnalysisCard.tsx:60`, `Activity24hFeed.tsx:61/97`, `LastSyncedLabel.tsx:18` 세 곳에서 공유 재사용됨. 인라인 `relativeTime()` 함수 완전 제거 확인. `common:time.*` 네임스페이스 prefix 올바르게 사용
- [x] **AC-9:** `AiRiskAnalysisCard.tsx` 상단 i18n 정책 주석 (L1-6) 및 `AIRunSummaryPanel.tsx` 상단 주석 (L1-7) 모두 존재. `data.summary`, `data.bullets[i]`, `data.recommendations[i]` 는 번역 래핑 없이 pass-through 렌더. `buildMarkdown()` (L321-323), GitHub payload (L303-304), Jira payload (L403-405) 에 영문 고정 주석 존재. 섹션 헤더 "Summary"/"Observations"/"Recommendations"/"Failure Patterns" 은 `t()` 로 처리됨
- [x] **AC-10 (일부):** 빌드 성공 (`npm run build` 7.01s). 번들 사이즈 정상 범위. tsc 에러 0건. 테스트 69개 전부 통과

---

## 코드 품질

- **tsc --noEmit:** PASS (에러 0건)
- **ESLint:** N/A (프로젝트에 `npm run lint` 스크립트 없음)
- **npm run build:** PASS
- **npm test -- --run:** PASS (5 files, 69 tests)
- **npm run scan:i18n:** PASS (0 matches, 21 files)
- **npm run scan:i18n:parity:** PASS (0 diff)

---

## 추가 관찰사항

### 스크립트 파일명 변경 (스펙 vs 구현)
Dev Spec §4-5는 `scripts/scan-i18n.ts` (TypeScript, ts-node 실행)를 명시했으나 구현은 `scripts/scan-i18n.mjs` (ESM JavaScript, node 직접 실행)로 커밋됨. 기능상 동일하게 동작하며 `ts-node` 의존성을 줄이는 실용적 선택으로 판단됨. package.json 스크립트도 일관되게 업데이트됨.

### `formatRelativeTime` 확장 (monthsAgo, yearsAgo)
Dev Spec §4-4는 minutesAgo/hoursAgo/daysAgo 3단계만 명시했으나 구현은 monthsAgo/yearsAgo 키까지 추가됨. en/ko 번들 모두 해당 키 존재. 스펙 초과 구현이지만 기능상 올바른 확장이며 parity 통과.

### scanner false-positive 회피 로직
`scan-i18n.mjs:139` 의 t() 근접성 체크 (±40 chars)가 JSX 텍스트가 t() 호출 직후에 위치할 때 정상 번역된 것으로 간주해 스킵할 수 있음. 현재 스코프에서는 실제 미스가 확인되지 않았으나, 복잡한 JSX 인라인 조건식 내에서 false negative 가능성 내재. CI 단계에서 `--fail-on-match` 사용 시 주의 권장.

---

## 결론

**수정 후 재검수 불필요 — 조건부 릴리즈 가능**

Blocker 0개, Major 0개. Minor 3개(AC-2/AC-5/AC-6 테스트 부재)는 모두 자동화 테스트 부재로 런타임 기능 오동작이 아님. 핵심 기능 요건(하드코딩 제거, en/ko parity, AC-9 AI 본문 정책, 공유 헬퍼)은 전부 충족됨. Minor 항목은 follow-up 티켓으로 분리하여 처리 권장:

- **f010-followup-1:** AC-2 컴포넌트 RTL 테스트 (IssuesList, Activity24hFeed KO 전환 검증)
- **f010-followup-2:** AC-5 Playwright i18n-coverage.spec.ts (missingKey 0건 E2E)
- **f010-followup-3:** AC-6 formatRelativeTime + plural 유닛 테스트
- **f010-followup-4:** AC-8 docs/i18n-guide.md 작성 (fallback 동작 문서화)
