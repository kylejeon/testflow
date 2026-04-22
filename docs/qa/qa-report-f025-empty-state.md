# QA Report: f025 EmptyState v2 + 5 페이지 적용
> 검수일: 2026-04-21
> 디자인 명세: docs/specs/design-spec-f025-empty-state.md

## 요약
- 총 검수 항목: 42개
- 통과: 39개
- 실패: 0개
- 경고(Minor): 2개
- Nit: 1개

---

## Critical (반드시 수정)
없음.

---

## Major (수정 강력 권장)
없음.

---

## Minor (수정 권장)

| # | 항목 | 기대 동작 | 실제 동작 | 파일:라인 |
|---|------|---------|---------|---------|
| 1 | `descId` 불안정 ID | 컴포넌트 마운트마다 고정 ID 사용 — `aria-describedby` 연결이 리렌더마다 깨질 수 있음 | `Math.random()` 로 매 렌더마다 새로운 ID 생성 → 리렌더 시 CTA의 `aria-describedby` 참조와 `<p id>` 불일치 발생 가능 | `src/components/EmptyState.tsx:97` |
| 2 | kbd 힌트 미구현 | Design Spec §7-2: TestCases CTA `kbd="N"`, Runs CTA `kbd="R"`, Milestones CTA `kbd="M"` | 3개 페이지 모두 `kbd` prop 전달 없음. (Spec에서 "optional" 명시 있으나 §7-2에서 구체적으로 배정됨) | `TestCaseList.tsx:2874`, `project-runs/page.tsx:2351`, `project-milestones/page.tsx:721` |

---

## Nit

| # | 항목 | 내용 | 파일:라인 |
|---|------|------|---------|
| 1 | i18n leaf 수 차이 | Design Spec §12-3에서 "총 45 keys (EN 기준)" 명시. 실제 구현은 44 leaf (testcases.empty에 `readonlyDescription` 1개 추가 vs milestones/sessions/requirements에 `secondaryCta` 키 없음 보정). 개발자 보고 "43 leaf" 와도 다름. 기능에는 영향 없으나 수량 불일치 문서화 필요 | i18n/local/en/*.ts 전체 |

---

## Passed

### EmptyState v2 API
- [x] AC-1: `EmptyStateSize`, `EmptyStateTone`, `EmptyStateVariant` 타입 export — `src/components/EmptyState.tsx:5-7`
- [x] AC-2: `EmptyStateAction` 인터페이스 export (label, onClick, icon, loading, disabled, kbd) — `:9-17`
- [x] AC-3: `EmptyStateProps` 인터페이스 export (illustration, title, description, cta, secondaryCta, size, tone, variant, illustrationAlt, className, testId) — `:19-60`
- [x] AC-4: v1 backward-compat props (icon, action, secondaryAction) deprecated 유지 — `:53-59`, `:88-95`
- [x] AC-5: `role="status"` + `aria-live="polite"` 루트 요소 — `:101-102`
- [x] AC-6: `data-testid` prop 지원 — `:103`
- [x] AC-7: `motion-safe:animate-[fadeIn_0.24s_ease-out]` fade-in 적용 — `:105`
- [x] AC-8: size별 padding 정확 (sm: py-10 px-6, md: py-16 px-8, lg: py-24 px-10) — `:106-108`
- [x] AC-9: tone='vivid' radial gradient bg (light + dark 양쪽) — `:109-111`
- [x] AC-10: illustration wrapper 반응형 사이즈 (md: 160×100 → sm:240×150, lg: 240×150 → md:320×208 → lg:400×260) — `:121-124`
- [x] AC-11: tone별 illustration opacity (subtle:opacity-60, vivid:drop-shadow) — `:125-126`
- [x] AC-12: variant='filtered' illustration opacity-70 saturate-50 dark:opacity-60 — `:127`
- [x] AC-13: title tone별 색상 (default: slate-900/white, subtle: slate-700/slate-300, vivid: gradient indigo→violet) — `:135-147`
- [x] AC-14: variant='filtered' + tone='default' → title text-slate-600 dark:text-slate-400 — `:144`
- [x] AC-15: description 사이즈별 max-w + text-size 정확 — `:155-158`
- [x] AC-16: Primary CTA indigo-500 rounded-full + glow shadow + focus ring + disabled — `:173-178`
- [x] AC-17: CTA size별 padding 정확 (sm: px-3.5 py-1.5 text-[13px], md: px-5 py-2.5 text-sm, lg: px-7 py-3 text-base) — `:179-181`
- [x] AC-18: CTA loading → ri-loader-4-line spinner 표시 — `:184-186`
- [x] AC-19: kbd 배지 렌더 (bg-white/20, border-white/30, text-[10px] font-mono) — `:190-194`
- [x] AC-20: Secondary CTA ghost style (dark mode 포함) — `:198-213`
- [x] AC-21: CTA container flex-col→sm:flex-row 반응형 — `:165`

### IllustrationPlaceholder
- [x] AC-22: 파일명 `IllustrationPlaceholder.tsx` (Design Spec §5-2에서 `IconPlaceholder` 로 명명했으나 rename은 호환 변경 — 기능 동일)
- [x] AC-23: 6 kind 모두 구현 (testcases/runs/milestones/sessions/requirements/nothing) — `:26-62`
- [x] AC-24: 6종 Remix Icon 사용 (Lucide 없음) — 확인
- [x] AC-25: kind별 bg/fg 컬러 Design Spec §5-4 매핑 정확 — `:26-62`
- [x] AC-26: `aria-hidden="true"` (장식 역할 올바름) — `:76`
- [x] AC-27: secondary icon -top-2 -right-2 offset — `:81-85`

### 신규 일러스트 3종 (스캐폴드 검증)
- [x] AC-28: `MilestonesIllustration.tsx` — viewBox="0 0 240 150", role="img", aria-label, `<title>` 조건부 렌더 — `:14-88`
- [x] AC-29: MilestonesIllustration 컨셉 반영 — 언덕(Hill), 깃발(Flag pole + Flag), dashed path, sparkle 2개 존재 — `:26-76`
- [x] AC-30: `SessionsIllustration.tsx` — viewBox="0 0 240 150", role="img", aria-label, `<title>` 조건부 렌더 — `:14-63`
- [x] AC-31: SessionsIllustration 컨셉 반영 — 나침반 face, needle, magnifying glass overlay, breadcrumb dots — `:27-60`
- [x] AC-32: `NothingIllustration.tsx` — viewBox="0 0 240 150", role="img", aria-label, `<title>` 조건부 렌더 — `:14-64`
- [x] AC-33: NothingIllustration 컨셉 반영 — open box, sparkle 3개 (indigo/violet/indigo-300) — `:27-62`
- [x] AC-34: 3종 모두 flat + 2.5px stroke + indigo #6366f1 primary 팔레트 준수 — 확인

### 5 페이지 적용
- [x] AC-35: TestCaseList — `filteredTestCases.length === 0` 분기, hasFilters → variant='filtered', 아니면 empty. canCreate RBAC 분기 정상 — `TestCaseList.tsx:2844-2913`
- [x] AC-36: project-runs — empty/filtered 양쪽 구현, TestRunsIllustration 사용 — `project-runs/page.tsx:2329-2366`
- [x] AC-37: project-milestones — `milestones.length === 0` 분기, size='lg', tone='vivid', IllustrationPlaceholder kind="milestones" — `project-milestones/page.tsx:716-739`
- [x] AC-38: project-sessions — empty/filtered 분기, IllustrationPlaceholder kind="sessions", secondaryCta 포함 — `project-sessions/page.tsx:796-835`
- [x] AC-39: project-requirements — empty/filtered 분기 정비, RequirementsIllustration 유지, secondaryCta(Jira) 포함 — `project-requirements/page.tsx:373-406`

### Rename 안정성
- [x] AC-40: `OnboardingEmptyState.tsx` git mv 완료 — `src/pages/projects/components/OnboardingEmptyState.tsx` 존재
- [x] AC-41: ProjectsContent.tsx import `OnboardingEmptyState` 정상 — `ProjectsContent.tsx:11`
- [x] AC-42: 구 경로 `pages/projects/components/EmptyState` import 잔존 없음 — grep 확인

### i18n
- [x] AC-43: requirements 네임스페이스 신규 파일 생성 및 index.ts 등록 — `src/i18n/local/index.ts:11,23,37,50`
- [x] AC-44: EN↔KO parity 0 diff — `scan:i18n:parity` PASS
- [x] AC-45: 하드코딩 0건 — `scan:i18n:check` PASS
- [x] AC-46: 5개 페이지 모두 `t('namespace:key')` 패턴 사용

---

## 코드 품질

| 항목 | 결과 |
|------|------|
| `npx tsc --noEmit` | PASS (0 에러) |
| `npm run scan:i18n:check` | PASS (0 매치) |
| `npm run scan:i18n:parity` | PASS (0 diff) |
| `npm run test -- --run` | PASS (143/143) |
| `npm run build` | PASS |
| ESLint | 스크립트 미설정 (기존 프로젝트 동일) |
| Lucide import 신규 추가 | 없음 (Remix Icon만 사용) |

---

## 보안 리뷰

- XSS: `dangerouslySetInnerHTML` 사용 없음. illustration/title/description 모두 React children/string으로 렌더.
- 인증 우회: EmptyState는 순수 UI 컴포넌트 — DB 접근 없음.
- 민감 정보: 없음. secondaryCta의 `window.open('https://docs.testably.app/...')` 는 외부 공개 docs URL.

---

## 상세 이슈 설명

### Minor-1: `descId` 불안정 ID (`src/components/EmptyState.tsx:97`)

```ts
const descId = description ? `empty-state-desc-${Math.random().toString(36).slice(2, 8)}` : undefined;
```

React의 렌더 사이클에서 `Math.random()` 은 컴포넌트가 리렌더될 때마다 새 값을 생성한다. `<p id={descId}>` 와 `<button aria-describedby={descId}>` 는 같은 렌더 내에서는 일치하지만, Concurrent Mode나 StrictMode의 double-invoke 환경에서는 잠재적으로 불일치가 발생할 수 있다. `useId()` (React 18+) 또는 `useRef(Math.random()...)` 로 고정해야 한다.

### Minor-2: kbd 힌트 미구현 (3개 페이지)

Design Spec §7-2에서 TestCases에 `kbd="N"`, Runs에 `kbd="R"`, Milestones에 `kbd="M"` 을 명시. 3개 페이지 모두 EmptyState CTA에 `kbd` prop 미전달. EmptyState 컴포넌트 자체에는 kbd 렌더 로직이 정상 구현되어 있으므로, 호출부에서 prop 추가만 하면 된다.

---

## 결론

**릴리즈 가능** — Blocker 0, Major 0.

Minor-1 (`descId` 불안정)은 접근성 품질 이슈이나 현재 앱의 StrictMode 여부에 따라 실제 증상 발생 빈도가 다르므로 다음 스프린트에서 수정 권장. Minor-2 (kbd 힌트)는 기능 누락이지만 Design Spec에서 "optional" 분류이므로 즉시 릴리즈 블로킹 아님.
