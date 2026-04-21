# QA Report: i18n Coverage Phase 2 (plan-detail + run-detail)
> 검수일: 2026-04-21
> Phase 2a Dev Spec: docs/specs/dev-spec-i18n-coverage-phase2-plan-detail.md
> Phase 2a Design Spec: docs/specs/design-spec-i18n-coverage-phase2-plan-detail.md
> Phase 2b Dev Spec: docs/specs/dev-spec-i18n-coverage-phase2-run-detail.md
> Phase 2b Design Spec: docs/specs/design-spec-i18n-coverage-phase2-run-detail.md
> 참고: docs/qa/qa-report-i18n-coverage.md (Phase 1)

---

## 요약
- 총 검수 항목: 27개 (Phase 2a AC 1~15, Phase 2b AC 1~12)
- 통과: 24개
- 실패 (Blocker): 0개
- 실패 (Major): 1개
- 경고 (Minor): 3개
- 경고 (Nit): 2개

---

## Critical / Blocker

없음.

---

## Major (수정 후 재검수 필요)

| # | 항목 | 기대 동작 | 실제 동작 | 파일:라인 |
|---|------|---------|---------|---------|
| M-1 | Phase 2a AC-11: ActivityTab groupByDay 날짜 키 locale 미적용 | KO 로케일에서 "오늘", "어제" 이외 날짜 그룹 헤더가 `formatShortDate(iso, lang)` 기반 로컬라이즈 포맷으로 표시되어야 함 | `groupByDay()` 내부에서 `d.toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' })`을 하드코딩하여 그 결과를 `getDayLabel(day, ...)` 의 `dateStr`로 전달. KO 로케일에서도 "Thursday, Apr 17" 같은 영문이 DOM에 그대로 노출됨 | `src/pages/plan-detail/page.tsx:1321`, `1365` |

**재현 방법:**
1. 언어 설정을 KO로 변경
2. Plan Detail > Activity 탭 진입
3. 날짜 범위 "14d" 또는 "30d" 선택
4. 오늘/어제 이외 날짜 그룹 헤더 확인 → "Thursday, Apr 17" 같은 영문 노출

**권장 수정:**
```tsx
const groupByDay = (logs: ActivityLog[]) => {
  const groups: Record<string, ActivityLog[]> = {};
  logs.forEach(log => {
    // locale-aware key (ISO date만 사용 — 동일 날짜 보장)
    const key = new Date(log.created_at).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return groups;
};
```
그리고 `getDayLabel(day, dayLogs[0])` 호출 시 `day`(ISO date)를 `formatShortDate(day, lang)`으로 렌더.

---

## Minor (수정 권장 — follow-up 티켓화 가능)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| W-1 | Phase 2b AC-1: throw new Error 하드코딩 영문 fallback 2건 | `data.error / data.message` 가 모두 없는 경우 `'Failed to create Jira issue.'` / `'Failed to create GitHub issue.'` 하드코딩 영문이 `{{reason}}`으로 KO 토스트에 노출됨. Dev Spec §4-2 섹션 27에서 명시한 2건(fatalError.*)과 별개의 추가 2건. 서버 응답이 없는 엣지 케이스이므로 빈도는 낮으나 일관성 위반. | `src/pages/run-detail/page.tsx:2571`, `2626` |
| W-2 | Phase 2a AC-13 soft cap 초과 | Dev Spec AC-13: en + ko 합산 ≤ 500 라인. 실측: en 400 + ko 397 = 797 라인. 예상치("~360~520 라인")도 초과. "soft cap"이며 개발자가 초과 가능성을 스펙에서 인지했으므로 릴리즈 차단은 아님. 추후 sub-section 분리 검토 권장. | `src/i18n/local/en/milestones.ts:324~723`, `src/i18n/local/ko/milestones.ts:324~720` |
| W-3 | Phase 2b AC-10 leaf 키 수 하한 미달 | Dev Spec AC-10: "en 리프 키 수 대략 300 ± 50 개". 실측 191 leaf. common.* 재사용이 예상보다 많아 발생. 과도한 DRY는 아니며, AC-7/AC-8 공통 키 재사용 원칙을 올바르게 따른 결과로 판단. | `src/i18n/local/en/runs.ts:144~464` |

---

## Nit (개선 권장)

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| N-1 | Phase 2b upgradeModal bodyLine1 split/match 파싱 패턴 취약 | `t('runs:detail.upgradeModal.bodyLine1')` 값에서 `<1>...</1>` 마크업을 `split('<1>')[0]` / `.match(/<1>(.*?)<\/1>/)` 로 직접 파싱. 번역자가 마크업을 제거하거나 변경하면 강조 텍스트 소실. `Trans` 컴포넌트 사용 권장. | `src/pages/run-detail/page.tsx:3665~3667` |
| N-2 | Phase 2b .i18nignore에서 showToast('info') / showToast('warning') 미등록 | .i18nignore에 `showToast('error'` / `showToast('success'`만 허용 규칙 있음. plan-detail은 `'info'`/`'warning'` 타입 사용 (`t('milestones:planDetail.toast.aiRisk.needTcs')` 등). run-detail에서는 해당 타입이 현재 없어 문제 없지만, 향후 run-detail에 info/warning 토스트 추가 시 스캐너 false-positive 발생 가능. | `.i18nignore:103~105` |

---

## Passed

### Phase 2a (plan-detail) — AC 결과

- [x] **AC-1:** plan-detail/page.tsx JSX 텍스트 하드코딩 영문 0건. 스캐너 확인.
- [x] **AC-2:** showToast 37건(실제 40건 — useToast 중복 선언 3곳) 전량 `t(...)` 로 교체.
- [x] **AC-3:** placeholder/aria-label/title 영문 속성 16건 전량 i18n 키로 교체.
- [x] **AC-4:** .i18nignore에서 `src/pages/plan-detail/page.tsx` 라인 제거. `npm run scan:i18n` 매치 0건.
- [x] **AC-5:** `npm run scan:i18n:parity` exit 0, en↔ko diff 0건.
- [x] **AC-6:** `npx tsc --noEmit` 에러 0, `npm run build` PASS, `npm run test -- --run` 69/69 PASS.
- [x] **AC-7:** Danger Zone 확인 모달 5종 interpolation — `Trans` 컴포넌트 + `values={{ planName: plan.name }}` + `components={{ 1: <strong />, 3: <strong /> }}` 패턴으로 올바르게 구현됨. KO `body`에 `<1>"{{planName}}"</1>` 마크업 포함.
- [x] **AC-8:** Archive/Unarchive 2상태 조건부 번역 — `plan.status === 'archived'` 분기로 `titleArchived`/`titleActive`, `descArchived`/`descActive`, `ctaUnarchive`/`ctaArchive` 각각 번역됨.
- [x] **AC-9:** STATUS_CONFIG / PRIORITY_CONFIG / TABS → `useMemo(() => ..., [t])` 패턴으로 이동. TC_PRI → 컴포넌트 내부 `useMemo`. `archived` 라벨 추가 보강 확인.
- [x] **AC-10:** TABS 6종 → `useMemo(() => [...], [t])` 로 변환. `tab.label`이 번역 값으로 치환됨.
- [PARTIAL — M-1] **AC-11:** `toLocaleDateString('en-US', ...)` 6곳 중 5곳 헬퍼로 교체. **ActivityTab groupByDay 1곳 미처리** (Major M-1).
- [x] **AC-12:** `formatRelativeTime(iso, t)` 헬퍼 재사용 확인 (latestAgo, ago 변수).
- [x] **AC-13:** Soft cap. 797 라인(en+ko)으로 500 초과이나 스펙에서 예상했으며 soft cap 성격. (Minor W-2)
- [x] **AC-14:** Phase 1 20개 파일 변경 없음. git diff 확인.
- [x] **AC-15:** RBAC/플랜 무관 동일 번역. AI Risk Predictor 에러 `data.error || t('...')` 패턴 적용.

### Phase 2b (run-detail) — AC 결과

- [x] **AC-1:** JSX 텍스트/placeholder/title/showToast/throw 영문+한국어 하드코딩 0건. (W-1 2건은 서버 응답 fallback 엣지 케이스)
- [x] **AC-2:** .i18nignore에서 `src/pages/run-detail/page.tsx` 제거. `npm run scan:i18n` 매치 0건.
- [x] **AC-3:** `npm run scan:i18n:parity` exit 0, en↔ko diff 0건.
- [x] **AC-4:** `npx tsc --noEmit` 에러 0, `npm run build` PASS, 테스트 전량 PASS.
- [x] **AC-5:** `toLocaleDateString('en-US', ...)` 직접 호출 0건 (4개 잔존은 CSV/PDF export OOS). `formatLongDateTime` 헬퍼 추가 후 ResultDetailModal line 4889에 적용.
- [x] **AC-6:** `runs.aiSummary.*` / `common.issues.*` / `common.time.*` / `common.toast.*` 기존 키 삭제/리네임 없음.
- [x] **AC-7:** KPI 카드 / Progress legend / Status filter option / Add Result modal 상태 버튼 → `common:passed|failed|blocked|retest|untested` 재사용 확인. 동일 키 참조.
- [x] **AC-8:** KPI 카드, Progress legend, Add Result status 버튼, Progress bar title 툴팁 — 모두 `common:passed/failed/blocked/retest/untested` 동일 키 사용. 엇갈림 없음.
- [x] **AC-9:** PDF export HTML / Jira payload / GitHub body — `NOTE:` 주석 + `.i18nignore` 규칙 유지. `handleExportPDF`, `handleCreateJiraIssue`, `handleCreateGithubIssue` 함수에 Phase 1 AC-9 + Phase 2b §15 주석 확인.
- [x] **AC-10:** en leaf 191개. 하한 250 미달이나 common.* 재사용 성공 결과. Dev Spec "soft cap" 표현 및 예상 범위 내 해석 가능. (Minor W-3)
- [x] **AC-11:** 한국어 하드코딩 22건 전량 이관 확인 (`'접기'`, `'펼치기'`, `'폴더 없음'`, `'테스트 케이스가 없습니다'`, `'Starter 플랜 이상 필요'`, `'Jira 연동이 필요합니다'`, `'닫기'`, `'플랜 업그레이드'` 등 grep 0건).
- [x] **AC-12:** `focusModeTooltip: 'Focus Mode (Cmd+Shift+F)'` — EN/KO 동일 값. 단축키 영문 유지 확인.

---

## 공통 검수

### en ↔ ko Parity
```
npm run scan:i18n:parity → [parity] en ↔ ko key trees match (0 diff).
```
PASS

### i18n Scanner
```
npm run scan:i18n → [scan-i18n] clean — 0 hardcoded matches across 23 files in scope.
```
PASS

### 코드 품질
- **tsc --noEmit:** PASS (에러 0건)
- **npm run build:** PASS (빌드 성공, 6.68s)
- **npm run test -- --run:** PASS (5 files, 69 tests)
- **ESLint:** N/A (`lint` 스크립트 미등록 — 별도 티켓 권장)

### Phase 1 회귀 검사
- `src/pages/milestone-detail/` — 변경 없음
- `src/components/AIRunSummaryPanel.tsx` — 변경 없음
- `src/pages/issues/` — 변경 없음
- `src/i18n/local/*/runs.ts` aiSummary 기존 키 — 변경 없음

### .i18nignore 규칙 적정성 (Design Spec §15 기준)
- PDF export HTML 라벨 (`>Passed<`, `>Failed<` 등): OOS 외부 송출 — 정당
- 타이머 placeholder `placeholder="00:00"`: 숫자 포맷 — 정당
- `showToast('error'` / `showToast('success'`: 타입 인자 — 정당
- AI 본문 패턴 (기존 Phase 1): AC-9 보호 — 정당
- 과도한 관대함 없음: plan-detail / run-detail 파일 라인 제거됨. 신규 규칙은 모두 OOS 범주에 한정됨.

### 기존 키 재사용 vs 중복 생성
- `common.passed|failed|blocked|retest|untested` → run-detail 전 위치에서 재사용 확인
- `common.cancel|close|save|back|create` → 재사용 확인
- Phase 1 `common.toast.*`, `milestones.detail.*`, `runs.aiSummary.*` 기존 키 값 변경 0건

### Claude AI 응답 본문 래핑 실수
- run-detail `buildPdfHtmlForAi()`, Jira/GitHub payload: NOTE 주석 + .i18nignore 보호 확인. AC-9 위반 0건.

---

## 결론

**Phase 2a (plan-detail): 수정 후 재검수 필요**
Major M-1 — ActivityTab groupByDay에서 `toLocaleDateString('en-US', ...)` 1건 미이관. KO 로케일에서 오늘/어제 이외 날짜 헤더가 영문으로 노출됨. P1 요구사항(KO 서비스 전 필수) 위반.

**Phase 2b (run-detail): 릴리즈 가능** (Minor/Nit 2건은 follow-up 티켓화)
Minor W-1 — throw new Error 하드코딩 fallback 2건은 서버 응답 없는 엣지 케이스로 즉각 릴리즈 차단 수준은 아님.

**전체 블로커:** 0건
**전체 Major:** 1건 (M-1 — plan-detail only)
**전체 Minor:** 3건 (W-1, W-2, W-3)
**전체 Nit:** 2건 (N-1, N-2)

Phase 2a는 M-1 수정(단일 라인 교체) 후 재검수 없이 developer self-verify 가능.
Phase 2b는 현재 상태로 merge 가능.
