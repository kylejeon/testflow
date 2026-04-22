# Design Spec: f025 — EmptyState Generalization + 6-Illustration Set

> **작성일:** 2026-04-21
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **Priority:** P1
> **Source:** Polish_Audit
> **관련 개발지시서:** (없음 — 이 티켓은 Design Spec이 주 산출물; Developer는 이 문서로 구현 착수)
> **Figma 링크:** — (placeholder icons 로 착수, Desi 납품 후 교체)

---

## 0. TL;DR (개발자/Desi 양쪽 3줄 요약)

1. **EmptyState 컴포넌트는 이미 존재** (`src/components/EmptyState.tsx`) — 이 스펙은 **그 컴포넌트를 일반화**하고 **5개 페이지에 일관 적용**하는 작업이다. (기존 `src/pages/projects/components/EmptyState.tsx`는 "랜딩 대시보드 첫 화면" 전용이라 **deprecate 하지 않고 rename**한다.)
2. **일러스트 3종은 이미 있음** (`TestCases`, `TestRuns`, `Requirements`). **3종 신규 필요** (`Milestones`, `Sessions`, `Fallback`). 총 6종 완성. Desi 납품 전까지 **Remix Icon placeholder** 로 구현.
3. **페이지 대상:** `project-testcases`, `project-runs`, `project-milestones`, `project-sessions`, `project-requirements`. (`testcases`/`runs`/`requirements`는 이미 EmptyState 쓰고 있어 **consistency 정비**만. `milestones`/`sessions`는 **신규 적용**.)

---

## 1. 현황 감사 (Audit) — 왜 이 티켓이 필요한가

| 페이지 | 현재 구현 | 문제 |
|---|---|---|
| `projects/ProjectsContent` | `pages/projects/components/EmptyState.tsx` (로컬) | 랜딩 전용·과도한 장식·3-step 설명 포함 → 재사용 불가. **그대로 유지 (OnboardingEmptyState로 rename 권장)** |
| `project-testcases` | `src/components/EmptyState` + `TestCasesIllustration` | 정상 — 기준 패턴 |
| `project-runs` | `src/components/EmptyState` + `TestRunsIllustration` | 정상 — 기준 패턴 |
| `project-requirements` | `src/components/EmptyState` + `RequirementsIllustration` | 정상 — **filtered variant 혼재** (아이콘 없이 title만 바뀜) |
| `project-milestones` | inline div + 🚩 emoji + `btn btn-primary` 레거시 클래스 (page.tsx:712~730) | **emoji 사용 금지 (UI_GUIDE §10 DON'T)** · 미등록 컴포넌트 |
| `project-sessions` | inline div + `ri-search-line` + filtered/empty 분기 섞임 (page.tsx:787~798) | EmptyState 미사용. 기준 패턴으로 교체 필요 |

**결론:** 이 티켓의 작업은 (a) EmptyState에 `size` / `tone` / `variant="filtered"` 지원 추가, (b) 신규 2개 일러스트(`Milestones`, `Sessions`) + 1개 fallback(`Nothing`) 발주, (c) `milestones` / `sessions` 페이지 마이그레이션.

---

## 2. EmptyState 컴포넌트 API (신규 v2)

### 2-1. TypeScript 시그니처

```tsx
// src/components/EmptyState.tsx (기존 파일 업그레이드)

export type EmptyStateSize = 'sm' | 'md' | 'lg';
export type EmptyStateTone = 'default' | 'subtle' | 'vivid';
export type EmptyStateVariant = 'empty' | 'filtered' | 'search';

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;        // optional — Remix Icon <i> 또는 lucide 아이콘 엘리먼트
  loading?: boolean;              // spinner + disabled
  disabled?: boolean;
  kbd?: string;                   // "⌘N" / "G then T" — 오른쪽에 kbd 배지 렌더
}

export interface EmptyStateProps {
  /** Illustration element — <TestCasesIllustration /> or <IconPlaceholder kind="..." /> */
  illustration?: React.ReactNode;

  /** Main heading (H3) — required */
  title: string;

  /** 1-2 line supporting copy */
  description?: string;

  /** Primary CTA — creates the resource */
  cta?: EmptyStateAction;

  /** Secondary CTA — alternative action (Import, Generate with AI) */
  secondaryCta?: EmptyStateAction;

  /** Layout size preset — default 'md' */
  size?: EmptyStateSize;           // sm (in-panel), md (page), lg (splash)

  /** Color intensity — default 'default' */
  tone?: EmptyStateTone;           // subtle=muted, default=indigo accent, vivid=gradient

  /** Semantic variant — affects headline color + illustration dim */
  variant?: EmptyStateVariant;     // empty (nothing created), filtered (has data but 0 match), search (0 hits)

  /** a11y — used when illustration is purely decorative */
  illustrationAlt?: string;

  /** Extra class on outer wrapper */
  className?: string;

  /** data-testid */
  testId?: string;
}
```

### 2-2. Props 별 동작

| Prop | 'sm' | 'md' (default) | 'lg' |
|---|---|---|---|
| Outer padding | `py-10 px-6` | `py-16 px-8` | `py-24 px-10` |
| Illustration wrapper | `w-[160px] h-[100px]` | `w-[240px] h-[150px]` or `w-32 h-32` for icon | `w-[400px] h-[260px]` |
| Title | `text-base font-semibold` | `text-lg font-semibold` | `text-2xl font-bold` |
| Description max-w | `max-w-xs` | `max-w-sm` | `max-w-md` |
| Description size | `text-xs` | `text-sm` | `text-base` |
| CTA padding | `px-3.5 py-1.5 text-[13px]` | `px-4 py-2 text-sm` | `px-6 py-3 text-base` |
| CTA layout (sm viewport) | stacked `flex-col` | row→col `flex-wrap` | row |

| Prop | 'subtle' | 'default' | 'vivid' |
|---|---|---|---|
| Title color | `text-slate-700 dark:text-slate-300` | `text-slate-900 dark:text-white` | gradient `bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent` |
| Background | transparent | transparent | subtle radial `bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_60%)]` |
| Illustration opacity | `opacity-60` | `opacity-100` | `opacity-100` + `drop-shadow-[0_4px_20px_rgba(99,102,241,0.25)]` |

| Variant | 'empty' | 'filtered' | 'search' |
|---|---|---|---|
| Illustration | full | `opacity-70` + grayscale-ish | hidden (icon only: `ri-search-line` 40px) |
| Title default copy (if omitted) | — (required) | "No results match these filters" | "No matches for '{query}'" |
| Description | supplied | "Try clearing filters or adjusting your search." | — |
| CTA default | supplied | `{label: 'Clear filters', onClick: props.onClear}` | — |

### 2-3. 기존 `src/pages/projects/components/EmptyState.tsx` 와의 차이점

| 항목 | 기존 (projects 전용) | 신규 (공용) |
|---|---|---|
| 위치 | `src/pages/projects/components/EmptyState.tsx` | `src/components/EmptyState.tsx` (기존 파일 업그레이드) |
| 목적 | "프로젝트가 0개" — 온보딩 풀 경험 | 모든 빈 목록 상태 |
| 구성 | 아이콘 + 타이틀 + 3개 CTA + 3-step 설명 카드 | illustration + title + description + cta + secondaryCta |
| 아이콘 | 고정 gradient 타일 | prop 으로 주입 |
| 크기 | 고정 | `size` prop |
| i18n | 하드코드 영어 | 호출부에서 `t(...)` 주입 |
| 권장 조치 | **`OnboardingEmptyState.tsx` 로 rename** (그대로 유지) | 신규 공용 |

### 2-4. 구체 Tailwind 명세 (컨테이너)

```tsx
// size='md' variant='empty' tone='default' 기준 (baseline)
<section
  role="status"
  aria-live="polite"
  className={clsx(
    'flex flex-col items-center justify-center text-center',
    'py-16 px-8',
    tone === 'vivid' && 'bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_60%)]',
    className,
  )}
  data-testid={testId ?? 'empty-state'}
>
  {illustration && (
    <div
      aria-hidden={!illustrationAlt ? 'true' : undefined}
      role={illustrationAlt ? 'img' : undefined}
      aria-label={illustrationAlt}
      className={clsx(
        'mb-6 flex items-center justify-center shrink-0',
        // size preset
        size === 'sm' && 'w-[160px] h-[100px]',
        size === 'md' && 'w-[240px] h-[150px]',
        size === 'lg' && 'w-[400px] h-[260px]',
        // tone preset
        tone === 'subtle' && 'opacity-60',
        tone === 'vivid' && 'drop-shadow-[0_4px_20px_rgba(99,102,241,0.25)]',
        variant === 'filtered' && 'opacity-70 saturate-50',
      )}
    >
      {illustration}
    </div>
  )}

  <h3
    id={titleId}
    className={clsx(
      'font-semibold',
      size === 'sm' && 'text-base',
      size === 'md' && 'text-lg',
      size === 'lg' && 'text-2xl font-bold tracking-tight',
      tone === 'default' && 'text-slate-900 dark:text-white',
      tone === 'subtle'  && 'text-slate-700 dark:text-slate-300',
      tone === 'vivid'   && 'bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent',
    )}
  >
    {title}
  </h3>

  {description && (
    <p
      id={descId}
      className={clsx(
        'mt-1.5 leading-relaxed',
        size === 'sm' && 'text-xs max-w-xs',
        size === 'md' && 'text-sm max-w-sm',
        size === 'lg' && 'text-base max-w-md',
        'text-slate-500 dark:text-slate-400',
      )}
    >
      {description}
    </p>
  )}

  {(cta || secondaryCta) && (
    <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap justify-center">
      {/* Primary CTA */}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          disabled={cta.disabled || cta.loading}
          aria-describedby={descId}
          className={clsx(
            'group inline-flex items-center justify-center gap-2',
            'bg-indigo-500 hover:bg-indigo-400 text-white font-semibold rounded-full',
            'shadow-[0_0_20px_rgba(99,102,241,0.25)] hover:shadow-[0_0_28px_rgba(99,102,241,0.4)]',
            'active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900',
            'disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none',
            size === 'sm' && 'px-3.5 py-1.5 text-[13px]',
            size === 'md' && 'px-5 py-2.5 text-sm',
            size === 'lg' && 'px-7 py-3 text-base',
          )}
        >
          {cta.loading
            ? <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
            : cta.icon ?? null}
          <span>{cta.label}</span>
          {cta.kbd && <kbd className="ml-1 inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded bg-white/20 border border-white/30 text-[10px] font-mono">{cta.kbd}</kbd>}
        </button>
      )}

      {/* Secondary CTA — ghost */}
      {secondaryCta && (
        <button
          type="button"
          onClick={secondaryCta.onClick}
          disabled={secondaryCta.disabled || secondaryCta.loading}
          className={clsx(
            'inline-flex items-center justify-center gap-2',
            'rounded-full border font-semibold',
            'bg-white hover:bg-slate-50 border-slate-200 text-slate-700',
            'dark:bg-white/[0.03] dark:hover:bg-white/[0.06] dark:border-white/10 dark:hover:border-white/20 dark:text-slate-200',
            'active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
            'disabled:opacity-60 disabled:cursor-not-allowed',
            size === 'sm' && 'px-3.5 py-1.5 text-[13px]',
            size === 'md' && 'px-5 py-2.5 text-sm',
            size === 'lg' && 'px-7 py-3 text-base',
          )}
        >
          {secondaryCta.loading
            ? <i className="ri-loader-4-line animate-spin" aria-hidden="true" />
            : secondaryCta.icon ?? null}
          <span>{secondaryCta.label}</span>
        </button>
      )}
    </div>
  )}
</section>
```

> 주의: 현재 코드베이스의 앱 페이지는 **light-mode slate 기반** (UI_GUIDE.md의 다크 마케팅 페이지와 다름). 위 클래스는 light/dark 양쪽 모두 대응. `dark:` 클래스는 `<html class="dark">` 로직이 추후 켜져도 즉시 동작.

---

## 3. 5개 적용 페이지 상세 명세

### 3-1. Test Cases — `src/pages/project-testcases/components/TestCaseList.tsx`

| 항목 | 값 |
|---|---|
| 트리거 | `filteredTestCases.length === 0` **AND** `selectedFolder === 'all'` **AND** `searchQuery === ''` (= 진짜 빈 상태) |
| Illustration | `<TestCasesIllustration />` (기존) — 160×120 유지 or size='md' 기준 240×150 |
| Size / Tone / Variant | `size='md'` / `tone='default'` / `variant='empty'` |
| Title EN | `No test cases yet` |
| Title KO | `아직 테스트 케이스가 없어요` |
| Description EN | `Capture what your product should do. Test cases keep your team aligned on expected behavior.` (기존 유지) |
| Description KO | `프로덕트가 무엇을 해야 하는지 기록해 보세요. 테스트 케이스는 팀 전체의 기대치를 맞추는 기준이에요.` |
| Primary CTA label EN / KO | `Create test case` / `테스트 케이스 만들기` |
| Primary CTA icon | `<i className="ri-add-line" />` |
| Primary CTA kbd | `N` (UI_GUIDE 키보드 힌트) — optional |
| Secondary CTA | `Generate with AI` / `AI로 생성` (`ri-sparkling-2-line`) — `can('create_testcase')` 일 때만 |
| Tertiary (3rd) | — **노출 안 함** (CTA 3개는 복잡) |
| Plan / user 분기 | **없음** — 모든 사용자 공통. (단 `can('create_testcase')===false` 면 description 만 `"Ask an admin to add test cases."` 로 교체, CTA 숨김) |
| Filtered variant | `filteredTestCases.length === 0` **AND** (filter OR search 활성) → `variant='filtered'`, title=`'No test cases match these filters'`, description=`'Try a different folder, tag, or search term.'`, CTA=`{label:'Clear filters', onClick:...}` |

### 3-2. Runs — `src/pages/project-runs/page.tsx`

| 항목 | 값 |
|---|---|
| 트리거 | `getSortedRuns(getFilteredRuns()).length === 0` **AND** 필터 없음 |
| Illustration | `<TestRunsIllustration />` (기존) |
| Size / Tone | `size='md'` / `tone='default'` |
| Title EN / KO | `No runs yet` / `아직 실행이 없어요` |
| Description EN | `Kick off your first run to track which test cases pass, fail, or need attention.` (기존 유지) |
| Description KO | `첫 번째 실행을 시작해 보세요. 어떤 케이스가 통과하고, 실패하고, 추가 확인이 필요한지 한눈에 추적할 수 있어요.` |
| Primary CTA EN / KO | `Start a run` / `실행 시작하기` (`ri-play-circle-line`) |
| Secondary CTA | `Import results (CSV)` / `결과 가져오기 (CSV)` (`ri-upload-cloud-line`) — Phase 2, 당장은 생략 가능 |
| Filtered variant | active/tab 에서 0 건 → `variant='filtered'`, title=`'No runs in this view'`, CTA=`{label:'View all runs', onClick: () => setActiveTab('all')}` |
| Plan 분기 | Free: run 생성은 제한 없음. **제한 도달 시 EmptyState 대신 UpgradePrompt (§5-4 참조)** |

### 3-3. Milestones — `src/pages/project-milestones/page.tsx`

**현재 코드 (page.tsx 712~730) 를 교체.**

| 항목 | 값 |
|---|---|
| 트리거 | `milestones.length === 0` AND `selectedMilestoneId === null` |
| 위치 | 우측 메인 영역 (현재 🚩 emoji 들어가는 자리) |
| Illustration | `<MilestonesIllustration />` (**신규 — §4 일러스트 2 참조**) |
| Placeholder (납품 전) | `<IconPlaceholder kind="milestones" />` → `ri-flag-2-line` + `ri-sparkling-2-line` 반짝이 |
| Size / Tone | `size='lg'` (splash 느낌 — 큰 빈 캔버스 차지) / `tone='vivid'` |
| Title EN / KO | `Plan your first release` / `첫 번째 릴리즈를 계획해 보세요` |
| Description EN | `Milestones group runs and test cases into release targets — so you can see exactly what's ready to ship.` |
| Description KO | `마일스톤은 실행과 테스트 케이스를 릴리즈 단위로 묶어줘요. 지금 무엇이 배포 준비됐는지 한눈에 볼 수 있어요.` |
| Primary CTA EN / KO | `Create milestone` / `마일스톤 만들기` (`ri-flag-line`) |
| Secondary CTA | `See how milestones work` / `마일스톤 사용법 보기` (`ri-book-open-line`) → 외부 docs 링크 |
| Filtered variant | 사이드바 milestone filter 로 0건 → milestones 전체는 있으므로 `variant='filtered'` |
| Plan 분기 | Free: milestones 개수 제한(3개) — 도달 시 UpgradePrompt 교체 |

**Side note — "Select a milestone" 상태:** `milestones.length > 0` AND `selectedMilestoneId === null` 인 경우는 **EmptyState 아님**. 기존처럼 `<div>Select a milestone</div>` 유지. (이 스펙의 범위 밖.)

### 3-4. Sessions — `src/pages/project-sessions/page.tsx`

**현재 코드 (page.tsx 787~798) 를 교체.**

| 항목 | 값 |
|---|---|
| 트리거 | `filteredSessions.length === 0` AND 필터/검색 없음 AND `sessions.length === 0` |
| Illustration | `<SessionsIllustration />` (**신규 — §4 일러스트 4 참조**) |
| Placeholder (납품 전) | `<IconPlaceholder kind="sessions" />` → `ri-compass-3-line` + `ri-search-2-line` |
| Size / Tone | `size='md'` / `tone='default'` |
| Title EN / KO | `No discovery logs yet` / `아직 탐색 로그가 없어요` (기존 "discovery logs" 용어 유지) |
| Description EN | `Exploratory testing captures what automated scripts miss. Start a session to record findings as you go.` |
| Description KO | `탐색 테스트는 자동화 스크립트가 놓치는 부분을 기록해요. 세션을 시작하면 테스트 중 발견한 내용이 바로 저장됩니다.` |
| Primary CTA EN / KO | `Start discovery log` / `탐색 로그 시작하기` (`ri-compass-discover-line`) |
| Secondary CTA | `Learn about exploratory testing` / `탐색 테스트 알아보기` (`ri-book-open-line`) |
| Filtered variant | `searchQuery` 또는 `activeFilterCount > 0` 이면 `variant='filtered'`, title=`'No logs match your filters'`, CTA=`{label:'Clear filters', onClick: clearAllFilters}` |
| Plan 분기 | 없음 |

### 3-5. Requirements — `src/pages/project-requirements/page.tsx`

**기존 EmptyState 적용되어 있음. variant='filtered' 처리 정비만 필요.**

| 항목 | 값 |
|---|---|
| 트리거 | `filtered.length === 0 && requirements.length === 0` (= 진짜 빈 상태) |
| Illustration | `<RequirementsIllustration />` (기존) |
| Size / Tone | `size='md'` / `tone='default'` |
| Title EN / KO | `No requirements linked` / `연결된 요구사항이 없어요` (기존) |
| Description EN | `Connect requirements to test cases so nothing ships untested.` (기존) |
| Description KO | `요구사항을 테스트 케이스에 연결해서, 검증 없이 출시되는 항목이 없게 해요.` |
| Primary CTA EN / KO | `Add requirement` / `요구사항 추가` (기존) |
| Secondary CTA | `Import from Jira` / `Jira에서 가져오기` (`ri-download-cloud-line`) — 기존 Jira 연동 활용 |
| Filtered variant | `requirements.length > 0 && filtered.length === 0` → `variant='filtered'` |
| Plan 분기 | 없음 |

### 3-6. (참고) Fallback — 범용 "Nothing here yet"

**용도:** 404 페이지 / 권한 없음 / 개발 중인 섹션 / Error Boundary(읽기 전용) 등.

| 항목 | 값 |
|---|---|
| Illustration | `<NothingIllustration />` (**신규 — §4 일러스트 6 참조**) |
| Placeholder | `<IconPlaceholder kind="nothing" />` → `ri-inbox-line` |
| Size / Tone | `size='md'` / `tone='subtle'` |
| Title EN / KO | `Nothing here yet` / `아직 아무것도 없어요` |
| Description EN | optional — 상황별 주입 |
| CTA | optional |

---

## 4. 일러스트 6종 스펙 (Desi 브리프)

### 4-0. 공통 가이드

| 항목 | 값 |
|---|---|
| 포맷 | **SVG** (우선) — React 컴포넌트로 import. 파일 경로는 `src/components/illustrations/*.tsx` (기존 3종과 동일 패턴) |
| 대체 포맷 | WebP (raster 원본이 있을 때만) — `public/illustrations/empty-*.webp` |
| 크기 (viewBox) | `0 0 240 150` (기본) · 컴포넌트 props 로 `width`/`height` 주입 가능 |
| Size 치수 | sm 160×100 · md 240×150 · lg 400×260 — **SVG 는 viewBox 하나로 전부 스케일** |
| 색상 팔레트 (light) | Indigo `#6366f1` / Indigo-100 `#e0e7ff` / Indigo-50 `#eef2ff` / Violet `#8b5cf6` / Slate-400 `#94a3b8` / Slate-200 `#e2e8f0` / White `#ffffff` |
| 색상 팔레트 (dark) | **기존 컴포넌트는 light 고정 색을 써서 dark 모드에서 채도가 튐** → 신규 일러스트는 fill/stroke 에 `currentColor` 또는 CSS var 사용해서 상위에서 토큰으로 주입. 최소 fallback: `text-slate-400 dark:text-slate-500` 둘러싼 wrapper 가 조정 |
| 스타일 가이드 | **flat + thin line (2.5px stroke)** — 기존 3종 (`TestCases`, `TestRuns`, `Requirements`) 와 일관. **semi-isometric / line-art / 3D 금지** |
| 필/스트로크 규칙 | 메인 오브젝트: `fill="#eef2ff"` + `stroke="#6366f1" strokeWidth="2.5"`. 오버레이 오브젝트: `fill="#fff"` + `stroke="#6366f1" strokeWidth="2.5"`. 보조 선: `stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"` |
| 장식 모티프 | `ri-sparkling-2-line` 느낌의 4-point star (크기 6~10px) 1~2개 우측 상단에 배치 가능 — AI 네이티브 브랜드 강조 |
| 움직임 | 정적 SVG. 호버 애니메이션 없음. (단 loading 상태는 컴포넌트가 자체 spinner 로 대체) |
| a11y | `role="img"` + `aria-label` (prop 으로 주입). 순수 장식 시 `aria-hidden="true"` |
| 네이밍 | `{Kind}Illustration.tsx` — 기존 `TestCasesIllustration.tsx` 패턴 준수 |

### 4-1. `TestCasesIllustration.tsx` — **기존 유지**

| 항목 | 값 |
|---|---|
| 상태 | ✅ 이미 구현됨 (`src/components/illustrations/TestCasesIllustration.tsx`) |
| 컨셉 | 체크리스트 문서 + 돋보기 |
| Desi 작업 | **없음** (유지) |
| alt EN / KO | `Clipboard with checked items and a magnifying glass` / `체크된 항목이 있는 클립보드와 돋보기` |

### 4-2. `TestRunsIllustration.tsx` — **기존 유지**

| 항목 | 값 |
|---|---|
| 상태 | ✅ 이미 구현됨 |
| 컨셉 | 재생 버튼 + 체크마크 + dashed baseline (진행감) |
| Desi 작업 | **없음** |
| alt EN / KO | `Play button with a success check mark on a progress track` / `재생 버튼과 성공 체크마크, 진행 트랙` |

### 4-3. `MilestonesIllustration.tsx` — **신규 🆕**

| 항목 | 값 |
|---|---|
| 컨셉 | **언덕 위에 꽂힌 깃발 + 깃발 뒤로 반짝이는 별 2개 + 정상까지 이어지는 dashed path** — "정상을 향한 진행" |
| 주 요소 | Flag (indigo body, violet pole) · Hill/triangle base (slate-200 fill, indigo stroke) · 2 sparkle stars (indigo-400) · dashed path (slate-400) |
| 파일명 | `src/components/illustrations/MilestonesIllustration.tsx` |
| viewBox | `0 0 240 150` |
| Placeholder | `<IconPlaceholder kind="milestones" />` — §5 참조 |
| alt EN / KO | `A flag planted on a hill with a dashed path leading up and two sparkles` / `언덕 위에 꽂힌 깃발과 정상으로 향하는 점선 경로, 반짝이는 별 2개` |

### 4-4. `SessionsIllustration.tsx` — **신규 🆕**

| 항목 | 값 |
|---|---|
| 컨셉 | **나침반 + 돋보기 아이콘 조합 + 주변에 점으로 흩뿌린 "발견"의 흔적** — "탐색" 의미 |
| 주 요소 | Compass face (indigo-50 fill, indigo stroke, N 바늘은 violet) · Magnifying glass overlay (우하단) · 3~5개 dotted breadcrumb (slate-400) |
| 파일명 | `src/components/illustrations/SessionsIllustration.tsx` |
| viewBox | `0 0 240 150` |
| Placeholder | `<IconPlaceholder kind="sessions" />` |
| alt EN / KO | `A compass overlapping with a magnifying glass, surrounded by exploration dots` / `돋보기와 겹쳐진 나침반과 주변에 흩어진 탐색 흔적` |

### 4-5. `RequirementsIllustration.tsx` — **기존 유지**

| 항목 | 값 |
|---|---|
| 상태 | ✅ 이미 구현됨 |
| 컨셉 | 두 개의 문서 + 연결 화살표 (문서 → 테스트케이스) |
| Desi 작업 | **없음** |
| alt EN / KO | `Two documents connected by an arrow, symbolizing requirements linked to tests` / `화살표로 연결된 두 개의 문서 — 요구사항이 테스트에 연결된 모습` |

### 4-6. `NothingIllustration.tsx` — **신규 🆕 (범용 fallback)**

| 항목 | 값 |
|---|---|
| 컨셉 | **빈 상자 + 위로 떠오르는 별/반짝이 3개** — "아직 아무것도 없음, 하지만 좋은 일이 일어날 거예요" 느낌 |
| 주 요소 | Open box (slate-200 fill, indigo stroke) · 3 sparkles (indigo-400 · violet-400 · indigo-300, 크기 8/12/6px) rising above |
| 파일명 | `src/components/illustrations/NothingIllustration.tsx` |
| viewBox | `0 0 240 150` |
| 사용처 | Fallback EmptyState, 404 페이지, 권한 없음 등 |
| Placeholder | `<IconPlaceholder kind="nothing" />` → `ri-inbox-line` |
| alt EN / KO | `An empty open box with sparkles floating above it` / `반짝이가 떠오르는 빈 상자` |

### 4-7. 일러스트 납품 체크리스트 (Desi 용)

- [ ] 3개 신규 SVG 파일 (`Milestones`, `Sessions`, `Nothing`) — React 컴포넌트 형태 (기존 `TestCasesIllustration.tsx` 참조)
- [ ] 각 파일 `viewBox="0 0 240 150"` 통일
- [ ] fill/stroke 하드 hex 대신 **가능하면** `currentColor` 또는 CSS var 추천 (다크모드 대응) — 여의치 않으면 light/dark 2벌 제출
- [ ] 기존 3종과 스타일 일관 (flat + 2.5px stroke + indigo #6366f1 메인)
- [ ] 시각 무게중심이 좌측 60%, 우측 40% — 텍스트 여백 확보
- [ ] `<title>` 태그 포함 (a11y — React 컴포넌트에서 `<title>` 로 렌더)
- [ ] px-perfect export 불필요 — SVG 는 Tailwind 래퍼가 스케일

---

## 5. 일러스트 임시 Fallback — `IconPlaceholder` (Desi 납품 전)

### 5-1. 목적

Developer 가 Desi 일러스트 없이 **오늘 착수** 가능. 일러스트가 도착하면 1줄 교체 (`<IconPlaceholder kind="milestones" />` → `<MilestonesIllustration />`).

### 5-2. 컴포넌트 스펙

```tsx
// src/components/illustrations/IconPlaceholder.tsx (신규)

type IconPlaceholderKind = 'testcases' | 'runs' | 'milestones' | 'sessions' | 'requirements' | 'nothing';

const KIND_MAP: Record<IconPlaceholderKind, { bg: string; fg: string; primary: string; secondary?: string }> = {
  testcases:    { bg: 'bg-indigo-50 dark:bg-indigo-500/10', fg: 'text-indigo-500 dark:text-indigo-400', primary: 'ri-clipboard-line',       secondary: 'ri-sparkling-2-line' },
  runs:         { bg: 'bg-emerald-50 dark:bg-emerald-500/10', fg: 'text-emerald-500 dark:text-emerald-400', primary: 'ri-play-circle-line',    secondary: 'ri-check-line' },
  milestones:   { bg: 'bg-violet-50 dark:bg-violet-500/10', fg: 'text-violet-500 dark:text-violet-400', primary: 'ri-flag-2-line',         secondary: 'ri-sparkling-2-line' },
  sessions:     { bg: 'bg-cyan-50 dark:bg-cyan-500/10', fg: 'text-cyan-500 dark:text-cyan-400', primary: 'ri-compass-3-line',      secondary: 'ri-search-2-line' },
  requirements: { bg: 'bg-amber-50 dark:bg-amber-500/10', fg: 'text-amber-500 dark:text-amber-400', primary: 'ri-file-list-3-line',   secondary: 'ri-links-line' },
  nothing:      { bg: 'bg-slate-100 dark:bg-slate-500/10', fg: 'text-slate-400 dark:text-slate-500', primary: 'ri-inbox-line',          secondary: undefined },
};

export default function IconPlaceholder({ kind, className = '' }: { kind: IconPlaceholderKind; className?: string }) {
  const c = KIND_MAP[kind];
  return (
    <div
      aria-hidden="true"
      className={clsx(
        'relative w-24 h-24 rounded-2xl flex items-center justify-center',
        c.bg, className,
      )}
    >
      <i className={clsx(c.primary, c.fg, 'text-5xl')} />
      {c.secondary && (
        <i className={clsx(c.secondary, c.fg, 'absolute -top-2 -right-2 text-xl opacity-80')} />
      )}
    </div>
  );
}
```

### 5-3. 사용 예시

```tsx
// Before Desi delivery:
<EmptyState
  illustration={<IconPlaceholder kind="milestones" />}
  title={t('milestones.empty.title')}
  description={t('milestones.empty.description')}
  cta={{ label: t('milestones.empty.cta'), onClick: () => setShowNewMilestoneModal(true), icon: <i className="ri-flag-line" /> }}
/>

// After Desi delivery — 1줄 교체:
<EmptyState
  illustration={<MilestonesIllustration />}
  ...
/>
```

### 5-4. 6종 placeholder 매핑 요약

| Kind | Primary icon | Secondary icon | Tile bg | Icon color |
|---|---|---|---|---|
| `testcases` | `ri-clipboard-line` | `ri-sparkling-2-line` | indigo-50 | indigo-500 |
| `runs` | `ri-play-circle-line` | `ri-check-line` | emerald-50 | emerald-500 |
| `milestones` | `ri-flag-2-line` | `ri-sparkling-2-line` | violet-50 | violet-500 |
| `sessions` | `ri-compass-3-line` | `ri-search-2-line` | cyan-50 | cyan-500 |
| `requirements` | `ri-file-list-3-line` | `ri-links-line` | amber-50 | amber-500 |
| `nothing` | `ri-inbox-line` | — | slate-100 | slate-400 |

---

## 6. 상태별 화면 (Mandatory)

### 6-1. 정상 (데이터 없음)

→ EmptyState 풀 렌더. §3 명세대로.

### 6-2. 로딩 (데이터 fetch 중)

**EmptyState 렌더 금지.** 대신 페이지별 기존 Skeleton:
- TestCases: (페이지가 자체 skeleton 보유) — `loading` state 우선
- Runs: `<RunsListSkeleton count={5} />` (기존)
- Requirements: `<RequirementsListSkeleton rows={6} />` (기존)
- Milestones: `<PageLoader />` 또는 신규 skeleton — 이 스펙 범위 밖
- Sessions: `<PageLoader />` (기존)

```tsx
{loading ? <XxxSkeleton /> : items.length === 0 ? <EmptyState ... /> : <Table>...</Table>}
```

### 6-3. 에러 (fetch 실패)

**EmptyState 사용 금지.** f024 (Error Boundary) 에서 정의된 `<ErrorFallback />` 또는 inline `<ErrorBanner />`. 이 스펙 범위 밖.

### 6-4. 필터로 0건 (filtered)

**EmptyState + `variant='filtered'`** 사용. illustration 은 `opacity-70 saturate-50` 로 죽임. Primary CTA 는 `Clear filters`.

```tsx
<EmptyState
  variant="filtered"
  illustration={<TestCasesIllustration />}
  title={t('testcases.emptyFiltered.title')}           // "No test cases match these filters"
  description={t('testcases.emptyFiltered.description')} // "Try a different folder, tag, or search term."
  cta={{ label: t('common.clearFilters'), onClick: clearAllFilters, icon: <i className="ri-filter-off-line" /> }}
/>
```

### 6-5. 제한 도달 (Plan limit)

**EmptyState 사용 금지.** 별도 `<UpgradePrompt />` 컴포넌트 (이 스펙 범위 밖 — 추후 티켓). 현재는 생성 버튼 클릭 시 모달에서 에러 토스트로 안내.

**단** — 사용자가 프로젝트 생성을 시도했지만 Free plan limit 에 걸린 경우 Empty 상태 **하단에 배너** 추가는 허용:

```tsx
<EmptyState ... />
{onFreePlan && near_limit && (
  <div className="mt-6 mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-3">
    <i className="ri-error-warning-line text-base mt-0.5" />
    <div>
      <div className="font-semibold mb-0.5">{t('plan.limitNear.title')}</div>
      <div className="text-xs leading-relaxed">{t('plan.limitNear.description')}</div>
    </div>
  </div>
)}
```

### 6-6. 페이지별 상태 매트릭스 요약

| 페이지 | 정상 | 로딩 | 에러 | 필터 0건 | 제한 도달 |
|---|---|---|---|---|---|
| TestCases | EmptyState (TestCasesIll, md, default, empty) | existing skeleton | ErrorFallback (f024) | EmptyState (filtered) | UpgradePrompt (외부 티켓) |
| Runs | EmptyState (TestRunsIll, md, default, empty) | RunsListSkeleton | ErrorFallback | EmptyState (filtered) | UpgradePrompt |
| Milestones | EmptyState (MilestonesIll, **lg**, **vivid**, empty) | PageLoader | ErrorFallback | EmptyState (filtered) — side filter | UpgradePrompt |
| Sessions | EmptyState (SessionsIll, md, default, empty) | PageLoader | ErrorFallback | EmptyState (filtered) | — |
| Requirements | EmptyState (RequirementsIll, md, default, empty) | RequirementsListSkeleton | ErrorFallback | EmptyState (filtered) — 기존 구현 정비 | — |

---

## 7. 인터랙션

### 7-1. 기본

| 트리거 | 동작 | 애니메이션 |
|---|---|---|
| Mount | fade-in 240ms `animate-[fadeIn_0.24s_ease-out]` | 제공됨 |
| CTA hover | shadow 강화 `hover:shadow-[0_0_28px_rgba(99,102,241,0.4)]` + bg lighten | 150ms |
| CTA focus-visible | indigo ring-2 + offset-2 | instant |
| CTA active | `active:scale-[0.98]` | instant |
| CTA click (loading) | icon → spinner (`ri-loader-4-line animate-spin`) + text "Creating..." / "..." 토글 | — |
| Secondary CTA | 동일하되 outline |   |
| Keyboard: `Tab` | illustration → title (not tabbable) → CTA → secondary CTA 순서 |   |
| Keyboard: `Enter/Space` on CTA | click 실행 |   |

### 7-2. 키보드 단축키 힌트 (option)

- TestCases: primary CTA 에 `kbd="N"` (Cmd+K 의 "create test case" 는 이미 지원)
- Runs: primary CTA 에 `kbd="R"`
- Milestones: primary CTA 에 `kbd="M"` (G-chord: `G then M` 으로 navigate)
- Sessions / Requirements: kbd 힌트 없음 (아직 안 배정)

kbd 배지 렌더:
```tsx
<kbd className="ml-1 inline-flex items-center justify-center min-w-[24px] h-5 px-1.5 rounded bg-white/20 border border-white/30 text-[10px] font-mono">N</kbd>
```

### 7-3. 접근성 (a11y)

- 루트에 `role="status"` + `aria-live="polite"` — 데이터 fetch 후 0건이 될 때 스크린리더에 알림
- `<h3>` 가 첫 heading (페이지 내 다른 h3 와 충돌 주의 — 페이지 context 에 따라 `<h2>` 로 upgrade 가능하도록 `as` prop 추후 추가)
- `aria-describedby={descId}` — CTA 가 description 과 연결
- illustration: `aria-hidden="true"` (장식) 또는 `role="img" aria-label={illustrationAlt}` (의미 있을 때)
- `prefers-reduced-motion` — fade-in 과 shadow transition 은 motion-safe 래퍼:
  ```tsx
  className={clsx('motion-safe:animate-[fadeIn_0.24s_ease-out]', ...)}
  ```

---

## 8. 반응형

| Breakpoint | 변경점 |
|---|---|
| `xl` (≥1280px) | 기본 — illustration 240×150, 가운데 정렬, CTA 가로 배치 |
| `lg` (1024~1279px) | 동일 |
| `md` (768~1023px) | 동일. `size='lg'` 일 때만 illustration 320×208 로 축소 (`lg:w-[400px]` → `md:w-[320px]`) |
| `sm` (≤767px) | illustration 160×100 (자동 `w-[160px] h-[100px]` on `sm` breakpoint), CTA 세로 스택 (`flex-col` → 기본), 좌우 padding `px-6` |

### 8-1. 반응형 클래스 규칙

```tsx
// Illustration wrapper
className={clsx(
  'mb-6 flex items-center justify-center shrink-0',
  size === 'md' && 'w-[160px] h-[100px] sm:w-[240px] sm:h-[150px]',
  size === 'lg' && 'w-[240px] h-[150px] md:w-[320px] md:h-[208px] lg:w-[400px] lg:h-[260px]',
)}

// CTA container
<div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap justify-center">
```

### 8-2. ASCII 와이어프레임

**Desktop (md, lg 기준 — Milestones 페이지 splash size):**

```
┌──────────────────────────── Main Area ────────────────────────────┐
│                                                                    │
│                                                                    │
│                         ┌───────────────┐                           │
│                         │   🚩 Illust   │    240×150                 │
│                         │  (Milestones) │                           │
│                         └───────────────┘                           │
│                                                                    │
│                Plan your first release                              │
│                text-lg font-semibold                                │
│                                                                    │
│      Milestones group runs and test cases into release targets —   │
│      so you can see exactly what's ready to ship.                   │
│      text-sm text-slate-500 · max-w-sm                              │
│                                                                    │
│           [ 🚩 Create milestone ]   [ 📖 See how it works ]          │
│           (indigo-500 rounded-full)  (white/ghost rounded-full)      │
│                                                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

**Mobile (sm):**

```
┌────────────────┐
│                │
│   ┌────────┐   │
│   │ Illust │   │  160×100
│   └────────┘   │
│                │
│   Plan your    │
│   first...     │
│                │
│   Milestones   │
│   group runs…  │
│                │
│ [Create m...] │  full-width
│                │
│ [Learn more] │  full-width
│                │
└────────────────┘
```

---

## 9. 다크모드 색상 매핑

> **주의:** 현재 앱 UI (대시보드, 프로젝트 페이지) 는 **light-mode 기반** (slate-50/white). `UI_GUIDE.md` 는 **마케팅/랜딩용 dark 테마**. EmptyState 는 **양쪽 대응** 필요. 현재 리포지토리 검색 결과 `dark:` 클래스는 일부만 쓰임. 아래 매핑은 **둘 다 적용**. `<html class="dark">` 로직이 아직 없으면 light 만 유효 (no-op on dark).

### 9-1. EmptyState 루트

| 요소 | Light | Dark |
|---|---|---|
| 페이지 배경 (부모) | `bg-white` or `bg-slate-50` | `bg-slate-900` |
| Radial vivid bg | `bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.06),transparent_60%)]` | `bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.10),transparent_60%)]` |

### 9-2. 타이틀 / 설명

| 요소 | Light | Dark |
|---|---|---|
| Title (default tone) | `text-slate-900` | `text-white` |
| Title (subtle tone) | `text-slate-700` | `text-slate-300` |
| Title (vivid tone) | gradient indigo→violet (양쪽 동일) | gradient indigo→violet |
| Description | `text-slate-500` | `text-slate-400` |

### 9-3. CTA

| 요소 | Light | Dark |
|---|---|---|
| Primary bg | `bg-indigo-500 hover:bg-indigo-400` | `bg-indigo-500 hover:bg-indigo-400` (동일) |
| Primary text | `text-white` | `text-white` |
| Primary shadow (glow) | `shadow-[0_0_20px_rgba(99,102,241,0.25)]` | `shadow-[0_0_28px_rgba(99,102,241,0.35)]` |
| Secondary bg | `bg-white hover:bg-slate-50` | `bg-white/[0.03] hover:bg-white/[0.06]` |
| Secondary border | `border-slate-200 hover:border-slate-300` | `border-white/10 hover:border-white/20` |
| Secondary text | `text-slate-700` | `text-slate-200` |
| Focus ring offset | `ring-offset-white` | `ring-offset-slate-900` |

### 9-4. Filtered variant

| 요소 | Light | Dark |
|---|---|---|
| Illustration opacity | `opacity-70 saturate-50` | `opacity-60 saturate-50` |
| Title | `text-slate-600` | `text-slate-400` |

### 9-5. IconPlaceholder 타일

| Kind | Light bg / fg | Dark bg / fg |
|---|---|---|
| testcases | `bg-indigo-50 / text-indigo-500` | `bg-indigo-500/10 / text-indigo-400` |
| runs | `bg-emerald-50 / text-emerald-500` | `bg-emerald-500/10 / text-emerald-400` |
| milestones | `bg-violet-50 / text-violet-500` | `bg-violet-500/10 / text-violet-400` |
| sessions | `bg-cyan-50 / text-cyan-500` | `bg-cyan-500/10 / text-cyan-400` |
| requirements | `bg-amber-50 / text-amber-500` | `bg-amber-500/10 / text-amber-400` |
| nothing | `bg-slate-100 / text-slate-400` | `bg-slate-500/10 / text-slate-500` |

---

## 10. 기존 컴포넌트 재사용 목록

### 10-1. 재사용 (수정 없이)

| 컴포넌트 | 위치 | 용도 |
|---|---|---|
| `EmptyState` | `src/components/EmptyState.tsx` | **업그레이드 대상** — 본 스펙이 확장 API 정의 |
| `TestCasesIllustration` | `src/components/illustrations/TestCasesIllustration.tsx` | 유지 |
| `TestRunsIllustration` | `src/components/illustrations/TestRunsIllustration.tsx` | 유지 |
| `RequirementsIllustration` | `src/components/illustrations/RequirementsIllustration.tsx` | 유지 |
| `Toast` (`src/components/Toast.tsx`) | 기존 | — 본 스펙에서는 안 씀 |
| Remix Icon (`ri-*`) | CDN | CTA 아이콘 / placeholder 심볼 |

### 10-2. 신규 생성

| 파일 | 역할 | 분량 추정 |
|---|---|---|
| `src/components/illustrations/MilestonesIllustration.tsx` | SVG 일러스트 (Desi 납품 대기, 개발 시 placeholder 로 선 구현 가능) | ~20 줄 |
| `src/components/illustrations/SessionsIllustration.tsx` | SVG 일러스트 (동일) | ~20 줄 |
| `src/components/illustrations/NothingIllustration.tsx` | SVG 일러스트 (fallback) | ~15 줄 |
| `src/components/illustrations/IconPlaceholder.tsx` | Remix Icon 기반 임시 표시 (Desi 납품 후에도 fallback 용도로 유지 가능) | ~40 줄 |

### 10-3. 기존 EmptyState 정리

**`src/pages/projects/components/EmptyState.tsx` 를 `OnboardingEmptyState.tsx` 로 rename.**

이유:
- 이름 충돌 (`src/components/EmptyState.tsx` 와 혼동)
- 기능이 다름 (온보딩 3-step 포함, 랜딩 전용)
- 다른 페이지에서 쓰일 일 없음

**import 수정:** `src/pages/projects/components/ProjectsContent.tsx` 의 `import EmptyState from './EmptyState'` → `import OnboardingEmptyState from './OnboardingEmptyState'`

---

## 11. 토스트 메시지

**해당 없음** — EmptyState 의 CTA 는 모달을 열거나 페이지로 이동할 뿐, 직접 저장/삭제를 하지 않음. 토스트는 **CTA 가 연 모달 내부**에서 발생 (이 스펙 범위 밖).

---

## 12. i18n 키 구조

### 12-1. 결정: **페이지별 네임스페이스에 서브트리 추가** (`common.emptyState.*` 아님)

이유:
- 현재 i18n 파일 분리 컨벤션이 `en/testcases.ts`, `en/runs.ts`, `en/milestones.ts`, `en/sessions.ts` 기반
- `common.ts` 는 진짜 범용 (버튼 레이블, 상태 등) 전용
- `onboarding.ts` 에 이미 `emptySessions` / `emptyMilestones` 가 있으나 **온보딩 플로우 전용 (랜딩 대시보드)**. 페이지 내 EmptyState 와 분리.

### 12-2. 신규 키 리스트

**`src/i18n/local/en/testcases.ts`** (+ `ko/testcases.ts`):
```ts
empty: {
  title: 'No test cases yet',
  description: 'Capture what your product should do. Test cases keep your team aligned on expected behavior.',
  cta: 'Create test case',
  secondaryCta: 'Generate with AI',
  readonlyDescription: 'Ask an admin to add test cases.',
  illustrationAlt: 'Clipboard with checked items and a magnifying glass',
},
emptyFiltered: {
  title: 'No test cases match these filters',
  description: 'Try a different folder, tag, or search term.',
  clearCta: 'Clear filters',
},
```

**`src/i18n/local/en/runs.ts`** (+ `ko/runs.ts`):
```ts
empty: {
  title: 'No runs yet',
  description: 'Kick off your first run to track which test cases pass, fail, or need attention.',
  cta: 'Start a run',
  secondaryCta: 'Import results (CSV)',
  illustrationAlt: 'Play button with a success check mark on a progress track',
},
emptyFiltered: {
  title: 'No runs in this view',
  description: 'Try a different status tab or clear filters.',
  clearCta: 'View all runs',
},
```

**`src/i18n/local/en/milestones.ts`** (+ `ko/milestones.ts`):
```ts
empty: {
  title: 'Plan your first release',
  description: 'Milestones group runs and test cases into release targets — so you can see exactly what's ready to ship.',
  cta: 'Create milestone',
  secondaryCta: 'See how milestones work',
  illustrationAlt: 'A flag planted on a hill with a dashed path leading up and two sparkles',
},
emptyFiltered: {
  title: 'No milestones match this view',
  description: 'Adjust filters or clear them to see all milestones.',
  clearCta: 'Clear filters',
},
```

**`src/i18n/local/en/sessions.ts`** (+ `ko/sessions.ts`):
```ts
empty: {
  title: 'No discovery logs yet',
  description: 'Exploratory testing captures what automated scripts miss. Start a session to record findings as you go.',
  cta: 'Start discovery log',
  secondaryCta: 'Learn about exploratory testing',
  illustrationAlt: 'A compass overlapping with a magnifying glass, surrounded by exploration dots',
},
emptyFiltered: {
  title: 'No logs match your filters',
  description: 'Try adjusting your search or filters.',
  clearCta: 'Clear filters',
},
```

**`src/i18n/local/en/requirements.ts`** (신규 파일 or common에 추가) (+ `ko/requirements.ts`):
> 현재 `requirements.ts` 네임스페이스가 없음 — 페이지 텍스트가 하드코드된 상태. 옵션 A: 신규 파일 생성. 옵션 B: `common.ts` 하위에 `requirements` 서브트리. **권장: 옵션 A** (나머지 4개와 일관).

```ts
empty: {
  title: 'No requirements linked',
  description: 'Connect requirements to test cases so nothing ships untested.',
  cta: 'Add requirement',
  secondaryCta: 'Import from Jira',
  illustrationAlt: 'Two documents connected by an arrow',
},
emptyFiltered: {
  title: 'No requirements match the current filters',
  description: 'Try clearing filters or changing the search term.',
  clearCta: 'Clear filters',
},
```

**`src/i18n/local/en/common.ts`** (+ `ko/common.ts`) — fallback 용:
```ts
emptyState: {
  nothing: {
    title: 'Nothing here yet',
    illustrationAlt: 'An empty open box with sparkles floating above it',
  },
  clearFilters: 'Clear filters',    // 재사용
},
```

### 12-3. 신규 i18n 키 총 개수

| 파일 | 신규 키 (각 EN + KO = ×2) |
|---|---|
| `testcases.ts` | 2 서브트리 · 10 leaf keys |
| `runs.ts` | 2 서브트리 · 8 leaf keys |
| `milestones.ts` | 2 서브트리 · 8 leaf keys |
| `sessions.ts` | 2 서브트리 · 8 leaf keys |
| `requirements.ts` (신규 파일) | 2 서브트리 · 8 leaf keys + 네임스페이스 보일러플레이트 |
| `common.ts` | 1 서브트리 · 3 leaf keys |
| **총 leaf 키 (EN 기준)** | **45 keys** |
| **총 (EN + KO)** | **90 번역 엔트리** |

---

## 13. 사용 예제 (Developer 용 복붙 가능 snippet)

### 13-1. Test Cases (기존 정비)

```tsx
// src/pages/project-testcases/components/TestCaseList.tsx
import EmptyState from '../../../components/EmptyState';
import TestCasesIllustration from '../../../components/illustrations/TestCasesIllustration';
import { useTranslation } from 'react-i18next';

const { t } = useTranslation(['testcases', 'common']);
const hasFilters = searchQuery !== '' || selectedFolder !== 'all' || activeTagFilters.length > 0;

{filteredTestCases.length === 0 ? (
  hasFilters ? (
    <EmptyState
      variant="filtered"
      illustration={<TestCasesIllustration />}
      title={t('testcases:emptyFiltered.title')}
      description={t('testcases:emptyFiltered.description')}
      cta={{
        label: t('testcases:emptyFiltered.clearCta'),
        onClick: clearAllFilters,
        icon: <i className="ri-filter-off-line" />,
      }}
    />
  ) : (
    <EmptyState
      illustration={<TestCasesIllustration />}
      title={t('testcases:empty.title')}
      description={can('create_testcase')
        ? t('testcases:empty.description')
        : t('testcases:empty.readonlyDescription')
      }
      illustrationAlt={t('testcases:empty.illustrationAlt')}
      cta={can('create_testcase') ? {
        label: t('testcases:empty.cta'),
        onClick: openCreateModal,
        icon: <i className="ri-add-line" />,
        kbd: 'N',
      } : undefined}
      secondaryCta={can('create_testcase') ? {
        label: t('testcases:empty.secondaryCta'),
        onClick: () => setShowAIGenerateModal(true),
        icon: <i className="ri-sparkling-2-line" />,
      } : undefined}
    />
  )
) : (
  <Table>...</Table>
)}
```

### 13-2. Milestones (신규 적용 — emoji 제거)

```tsx
// src/pages/project-milestones/page.tsx (기존 712~730 교체)
import EmptyState from '../../components/EmptyState';
import IconPlaceholder from '../../components/illustrations/IconPlaceholder';
// 납품 후: import MilestonesIllustration from '../../components/illustrations/MilestonesIllustration';

) : (
  <div className="flex-1 flex items-center justify-center">
    <EmptyState
      size="lg"
      tone="vivid"
      illustration={<IconPlaceholder kind="milestones" />}
      /* 납품 후: illustration={<MilestonesIllustration />} */
      title={t('milestones:empty.title')}
      description={t('milestones:empty.description')}
      illustrationAlt={t('milestones:empty.illustrationAlt')}
      cta={{
        label: t('milestones:empty.cta'),
        onClick: () => setShowNewMilestoneModal(true),
        icon: <i className="ri-flag-line" />,
        kbd: 'M',
      }}
      secondaryCta={{
        label: t('milestones:empty.secondaryCta'),
        onClick: () => window.open('https://docs.testably.app/milestones', '_blank'),
        icon: <i className="ri-book-open-line" />,
      }}
    />
  </div>
)
```

### 13-3. Sessions (신규 적용)

```tsx
// src/pages/project-sessions/page.tsx (기존 787~798 교체)
const hasFilters = searchQuery !== '' || activeFilterCount > 0 || !!sidebarMilestoneFilter || !!sidebarTagFilter;

{loading ? (
  <PageLoader />
) : filteredSessions.length === 0 ? (
  <div className="flex-1 flex items-center justify-center">
    <EmptyState
      variant={hasFilters ? 'filtered' : 'empty'}
      illustration={<IconPlaceholder kind="sessions" />}
      /* 납품 후: illustration={<SessionsIllustration />} */
      title={hasFilters ? t('sessions:emptyFiltered.title') : t('sessions:empty.title')}
      description={hasFilters ? t('sessions:emptyFiltered.description') : t('sessions:empty.description')}
      illustrationAlt={hasFilters ? undefined : t('sessions:empty.illustrationAlt')}
      cta={hasFilters ? {
        label: t('sessions:emptyFiltered.clearCta'),
        onClick: clearAllFilters,
        icon: <i className="ri-filter-off-line" />,
      } : {
        label: t('sessions:empty.cta'),
        onClick: () => setShowAddSessionModal(true),
        icon: <i className="ri-compass-discover-line" />,
      }}
      secondaryCta={!hasFilters ? {
        label: t('sessions:empty.secondaryCta'),
        onClick: () => window.open('https://docs.testably.app/exploratory', '_blank'),
        icon: <i className="ri-book-open-line" />,
      } : undefined}
    />
  </div>
) : (
  <Table>...</Table>
)}
```

---

## 14. 디자인 개발 착수 전 체크리스트

- [x] 모든 상태가 정의되었는가 (정상 §3 / 빈 상태 §6-1 / 로딩 §6-2 / 에러 §6-3 / 필터 0건 §6-4 / 제한 도달 §6-5)
- [x] Tailwind 클래스가 구체적으로 명시되었는가 (§2-4)
- [x] 다크모드 색상 매핑이 있는가 (§9)
- [x] 기존 컴포넌트 재사용 목록이 있는가 (§10)
- [x] 인터랙션 (클릭, 호버, 키보드)이 정의되었는가 (§7)
- [x] 반응형 브레이크포인트별 변경점이 있는가 (§8)
- [x] 토스트 메시지가 en/ko 모두 있는가 (§11 — 해당 없음 명시)
- [x] i18n 키 구조가 정의되었는가 (§12)
- [x] 일러스트 브리프가 Desi 가 바로 작업할 수 있을 만큼 구체적인가 (§4)
- [x] 일러스트 납품 전 placeholder 대체재가 있는가 (§5)

---

## 15. Out of scope (다음 티켓으로)

- `UpgradePrompt` 컴포넌트 (제한 도달 시 — 별도 티켓)
- Error Boundary 통합 (f024 에서 처리)
- Skeleton 컴포넌트 표준화 (별도 티켓)
- 3rd / 4th CTA 지원 (`tertiaryCta`) — 현재 range 밖
- `<h2>` / `<h3>` level 토글 (`as` prop) — 현재 `<h3>` 고정
- Animation library 교체 — 현재 Tailwind keyframe + motion-safe 로 충분
