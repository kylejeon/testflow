# Design Spec: f001 + f002 — Environment AI Insights (Real Claude) + Chip Workflows

> **작성일:** 2026-04-24
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-f001-f002-env-ai-insights.md`
> **관련 리서치:** `docs/research/env-ai-insights-research.md`
> **선례 디자인:** `docs/specs/design-spec-milestone-overview-v3.md` (AI Risk hybrid card 패턴)
> **영향 파일:**
> - `src/components/EnvironmentAIInsights.tsx` — AI 결과 렌더 + trigger button (확장)
> - `src/components/IssueCreateInlineModal.tsx` — 신규 (f002-a)
> - `src/pages/plan-detail/page.tsx` — highlightedEnv state + heatmap column highlight CSS + modal wiring + runs scroll target
> - `src/i18n/local/{en,ko}/environments.ts` + `projects.ts` — 신규 키
>
> **Figma:** (N/A — ASCII 와이어 확정)

---

## 0. 디자인 DNA — 이 문서의 스코프

Testably 앱 내부(`src/pages/plan-detail/`)는 **화이트 배경 + violet(`#7C3AED`) 액센트** 라이트 모드다. 랜딩(`docs/UI_GUIDE.md`의 슬레이트-900 + 인디고)과는 다른 **앱 전용 시각 체계**를 사용하며, 기존 `EnvironmentAIInsights.tsx`가 해당 체계를 이미 정의하고 있다:

- **사이드바 카드 배경** — `linear-gradient(180deg, #F5F3FF 0%, #EEF2FF 100%)` (violet-50 → indigo-50)
- **보더** — `#DDD6FE` (violet-200)
- **AI 액센트 컬러** — `#7C3AED` (violet-600)
- **내부 카드** — `#fff / 1px solid #EDE9FE`
- **아이콘** — `ri-magic-line` / `ri-sparkling-2-line` (Remix Icon)

본 디자인 명세는 이 기존 체계를 **확장**한다. 새로운 컬러/컴포넌트 체계를 도입하지 않는다 — **AC-G9 회귀 방지** 원칙.

---

## 1. 레이아웃

### 1-1. plan-detail `environments` 탭 전체 구조 (변경 없음)

```
┌─ ProjectHeader (기존) ────────────────────────────────────────────┐
├─ Plan summary head (기존) ────────────────────────────────────────┤
├─ Tab strip: Test Cases · Runs · Activity · Issues · Environments │
└─ Environments tab content (2-column grid) ────────────────────────┘
  ┌─ col 1: Heatmap card (fluid, min 680px) ──┐ ┌─ col 2: AI sidebar ┐
  │                                            │ │  320px (sticky)    │
  │   [HL pill ─ when highlightedEnv set]      │ │                    │
  │                                            │ │  (본 스펙의 모든    │
  │   [Heatmap table]                          │ │   시각 변경은       │
  │                                            │ │   여기 + 히트맵     │
  └────────────────────────────────────────────┘ │   column highlight │
  ┌─ legend strip (grid col 1/-1) ─────────────┐ │   에만 적용)       │
  └────────────────────────────────────────────┘ └────────────────────┘
```

기준 너비:

| 영역 | 너비 |
|---|---|
| Heatmap 카드 | fluid (min 680px) |
| AI 사이드바 | 320px (desktop) / 100% (mobile) |
| 인라인 Issue 모달 (§3-3) | 520px fixed |
| 히트맵 column 최소폭 | 72px (기존) |

### 1-2. AI 사이드바 세로 섹션 스택 (핵심 레이아웃)

```
┌───────────────────────────────────────────────┐ .ai-sidebar
│ ✨ AI INSIGHTS  ·  N patterns  [  Cached  ]   │  ← head row
│                                              │
│ ┌─ Trigger row ────────────────────────────┐ │  NEW (AC-G6, G7)
│ │ [ ✨ Regenerate with AI · 1 credit  → ]   │ │    height 32
│ │ 29 credits left · Starter                │ │    secondary line
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌─ (A) AI Headline block ─────────────────┐ │  NEW (AC-G2)
│ │ "Safari 17 fails 63% of critical TCs   │ │   violet gradient
│ │  — investigate before release."        │ │   max 120 chars
│ │ · 78% confidence   AI · 12m ago        │ │   meta footer
│ └────────────────────────────────────────┘ │
│                                              │
│ ┌─ Critical card ────────────────────────┐  │  기존 (AC-G3)
│ │ CRITICAL                                │  │   detail 부분
│ │ Safari 17 · 37% pass rate               │  │   AI reason으로
│ │ Critical_reason (AI) 또는 rule detail    │  │   치환
│ │ [ Create issue ] [ Filter Safari 17 ]  │  │   → onCreateIssue
│ └────────────────────────────────────────┘  │      onHighlightEnv
│                                              │
│ ┌─ Coverage Gap card ────────────────────┐  │  기존 (AC-G4)
│ │ COVERAGE GAP                            │  │
│ │ TC-142: Payment checkout...             │  │
│ │ coverage_gap_reason (AI) 또는 rule       │  │
│ │ [ Assign run ]                          │  │   → onAssignRun
│ └────────────────────────────────────────┘  │
│                                              │
│ ┌─ Baseline card (기존, 변화 없음) ─────────┐ │
│ └────────────────────────────────────────┘  │
│                                              │
│ ┌─ (B) Recommendations card ────────────┐   │  NEW (AC-G5)
│ │ RECOMMENDATIONS                        │   │    max 4 bullets
│ │ 1. Assign a run targeting Safari 17…   │   │
│ │ 2. Schedule TC-142 on Chrome/Firefox…  │   │
│ │ 3. …                                   │   │
│ └────────────────────────────────────────┘   │
│                                              │
│ ┌─ Quick stats card (기존) ──────────────┐   │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**섹션 스택 순서 (위→아래):**
1. head row (section title + pattern count + Cached badge) ─ 기존 + Cached 추가
2. **Trigger row (신규)** — AITriggerButton + secondary meta line
3. **AI Headline block (신규)** — `aiInsight !== null && !tooLittleData` 일 때만
4. Critical card — 기존, detail이 AI로 증강
5. Coverage Gap card — 기존, detail이 AI로 증강
6. Baseline card — 기존 (AI로 치환되지 않음)
7. **Recommendations card (신규)** — `aiInsight?.recommendations.length > 0` 일 때만
8. Quick stats card — 기존

### 1-3. 사이드바 여백/간격 토큰

| 토큰 | 값 | 용도 |
|---|---|---|
| `--ai-gap-section` | 10px | 섹션 카드 간격 (기존 유지) |
| `--ai-gap-head-trigger` | 8px | head row ↔ trigger row |
| `--ai-gap-trigger-content` | 12px | trigger ↔ AI headline |
| `--ai-card-pad` | 10px 11px | 내부 카드 패딩 (기존) |
| `--ai-card-radius` | 8px | 내부 카드 (기존) |
| `--ai-sidebar-radius` | 10px | 사이드바 컨테이너 (기존) |
| `--ai-sidebar-pad` | 12px | 사이드바 컨테이너 (기존) |

---

## 2. 컴포넌트 명세

### 2-1. `AITriggerButton` (재사용)

기존 `src/components/AITriggerButton.tsx`의 `ghost` variant 사용. 신규 prop 추가.

```ts
interface AITriggerButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'ghost' | 'empty-state';
  label?: string;
  creditCount?: number | null;  // 오른쪽 뱃지 숫자 (remaining)
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  // ── 신규 추가 (AC-G6, G7) ─────────────────────────────────
  disabled?: boolean;           // tier 미충족 / credit 0 / isGenerating
  loading?: boolean;            // isGenerating → spinner 아이콘
  disabledReason?: 'tier' | 'credits' | 'no-data' | null;
  disabledTooltip?: string;     // title/aria-describedby
  creditCost?: number;          // "1 credit" 표기 (뱃지 옆)
}
```

| State | 아이콘 | 라벨 | 색상 | onClick |
|---|---|---|---|---|
| 기본 (idle) | `ri-sparkling-2-line` | "Regenerate with AI · 1 credit" | text-indigo-600, bg white hover indigo-50 | `handleAnalyze(false)` |
| 로딩 | `ri-loader-4-line animate-spin` | "Analyzing environments…" | disabled 유지 | (없음) |
| disabled: tier | `ri-lock-line` (신규) | "Regenerate with AI" | opacity-50, cursor-not-allowed | `navigate('/settings?tab=billing')` |
| disabled: credits | `ri-error-warning-line` | "Regenerate with AI" | opacity-50 | `navigate('/settings?tab=ai-usage')` |
| disabled: no-data | 기본 | 기본 | opacity-50 | — (no-op) |

**Tailwind 클래스 (ghost size=sm 기본):**
```
inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium
disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
```

**Credit 뱃지 (오른쪽):**
```
ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded text-xs font-semibold
```

### 2-2. `EnvironmentAIInsights` — Props 확장 (AC-G1)

```ts
interface EnvironmentAIInsightsProps {
  // 기존
  matrix: HeatmapMatrix | null;

  // ── AI 데이터 (신규) ───────────────────────────────────────
  aiInsight?: EnvAiInsightsResult | null;
  isGenerating?: boolean;
  onRegenerate?: (force: boolean) => void;
  canUseAi?: boolean;
  tierOk?: boolean;
  creditCost?: number;              // 기본 1
  remainingCredits?: number | null; // -1 = unlimited, null = loading
  monthlyLimit?: number | null;
  requiresTierName?: string;        // "Starter"
  aiError?: 'ai_timeout' | 'upstream_rate_limit' | 'monthly_limit_reached'
          | 'ai_parse_failed' | 'network' | 'tier_too_low' | 'forbidden'
          | 'internal' | null;
  // ── chip 콜백 (신규) ───────────────────────────────────────
  onHighlightEnv?: (label: string) => void;
  onCreateIssue?: (pre: IssueCreatePrefill) => void;
  onAssignRun?: () => void;
  highlightedEnv?: string | null;    // chip active 상태 판정
}

interface IssueCreatePrefill {
  title: string;
  description: string;
  source: 'ai' | 'rule';
}
```

**렌더 분기 테이블 (AC-G2~G10):**

| 상태 | head row | Trigger | Headline | Critical.detail | CoverageGap.detail | Recommendations card |
|---|---|---|---|---|---|---|
| 최초(AI null, !isGenerating) | 기본 | 정상 enabled | 숨김 | rule-based | rule-based | 숨김 |
| Free/Hobby 유저 | 기본 | disabled(tier) | 숨김 | rule-based | rule-based | 숨김 |
| Credit 0 | 기본 | disabled(credits) | 숨김 | rule-based | rule-based | 숨김 |
| Generating | 기본 + `Cached` 숨김 | loading | dim 50% skel | dim 50% skel | dim 50% skel | 숨김 |
| AI 성공 (fresh) | 기본 | enabled | **표시** | **AI reason** | **AI reason** | **표시** |
| AI 성공 (cache hit) | `Cached · 12m ago` | enabled | **표시** | **AI reason** | **AI reason** | **표시** |
| too_little_data 응답 | 기본 | enabled | `AI_INFO_BANNER` | rule-based | rule-based | 숨김 |
| AI 에러 | 기본 | enabled | `AI_ERROR_BANNER` | rule-based (fallback) | rule-based | 숨김 |

### 2-3. 신규 서브컴포넌트

#### (A) `AIHeadlineBlock` — AC-G2, G8

```
┌─────────────────────────────────────────────────┐
│ ✨ Safari 17 fails 63% of critical TCs —       │  ← headline
│    investigate before release.                  │    font-semibold
│                                                  │
│ 78% confidence · Low                AI · 12m ago │  ← meta
└─────────────────────────────────────────────────┘
```

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `background: linear-gradient(135deg, #F5F3FF 0%, #FAF5FF 100%); border: 1px solid #DDD6FE; border-radius: 8px; padding: 10px 11px;` |
| Sparkle 아이콘 | `ri-sparkling-2-line` · 14px · `#7C3AED` · flex-shrink-0 |
| Headline 텍스트 | `fontSize: 13px; fontWeight: 600; lineHeight: 1.4; color: #4C1D95;` · max 3 lines + ellipsis |
| 신뢰도 뱃지 | `fontSize: 10px; color: #7C3AED; background: #fff; border: 1px solid #DDD6FE; padding: 1px 6px; border-radius: 999px;` |
| Low confidence 뱃지 (confidence < 40) | 동일 + `color: #B45309; background: #FFFBEB; border-color: #FDE68A;` |
| "AI · {time ago}" | `fontSize: 10px; color: #A78BFA; margin-left: auto;` |

#### (B) `RecommendationsCard` — AC-G5

```
┌───────────────────────────────────────────┐
│ RECOMMENDATIONS                            │  ← tag (uppercase, violet)
│                                            │
│ ① Assign a run targeting Safari 17…       │  ← circled number
│ ② Schedule TC-142 on Chrome/Firefox…      │
│ ③ …                                        │
└───────────────────────────────────────────┘
```

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `AI_CARD_STYLE` 재사용 (`#fff / 1px solid #EDE9FE / radius 8 / pad 10/11`) |
| TAG | `TAG_BASE` + `background: #F5F3FF; color: #7C3AED;` |
| 번호 배지 | `inline-flex w-4 h-4 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold items-center justify-center` |
| 항목 텍스트 | `fontSize: 11.5px; color: var(--text); line-height: 1.45;` |
| 항목 간격 | `gap: 6px` (flex column) |
| TC ID / env 이름 강조 (text 내부) | `<code className="font-mono text-[10.5px] bg-violet-50 text-violet-700 px-1 py-[1px] rounded">TC-142</code>` |

#### (C) `AIInfoBanner` — too_little_data (AC-G10)

```
┌───────────────────────────────────────────┐
│ ℹ️ Not enough data yet                    │
│ Run at least 5 test results to get        │
│ AI insights. No credit consumed.          │
└───────────────────────────────────────────┘
```

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 10px 11px;` |
| 아이콘 | `ri-information-line` · 14px · `#1D4ED8` |
| 텍스트 | `fontSize: 11.5px; color: #1E40AF; line-height: 1.45;` |
| "No credit consumed" 꼬리표 | `fontSize: 10px; color: #3B82F6; font-style: italic;` |

#### (D) `AIErrorBanner` (inline retry)

```
┌───────────────────────────────────────────┐
│ ⚠️ AI analysis failed                      │
│ Try again in a moment.       [ Retry ]    │
│ No credit was used.                       │
└───────────────────────────────────────────┘
```

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 10px 11px;` |
| 아이콘 | `ri-alert-line` · 14px · `#B91C1C` |
| 텍스트 | `fontSize: 11.5px; color: #991B1B;` |
| Retry 버튼 | `text-xs font-semibold text-violet-700 hover:text-violet-800 underline` |
| "No credit used" 꼬리표 | `fontSize: 10px; color: #DC2626; font-style: italic;` |

에러 코드별 문구 매핑:

| `aiError` | EN | KO |
|---|---|---|
| `ai_timeout` | "AI analysis timed out. Try again." | "AI 분석 시간이 초과되었습니다. 다시 시도해주세요." |
| `upstream_rate_limit` | "Claude is rate-limited. Retry in {sec}s." | "Claude가 일시적으로 제한되었습니다. {sec}초 후 재시도." |
| `ai_parse_failed` | "AI returned invalid data. Try again." | "AI가 잘못된 데이터를 반환했습니다. 다시 시도해주세요." |
| `network` | "Network error. Check your connection." | "네트워크 오류. 연결을 확인해주세요." |
| `internal` | "AI analysis failed. Try again." | "AI 분석에 실패했습니다. 다시 시도해주세요." |

### 2-4. `IssueCreateInlineModal` (신규, AC-H)

```
┌──────── Create issue from AI insight ─ ✕ ────────┐
│                                                   │
│   ┌─ Tab strip ─────────────────────────────┐    │
│   │ [ 🔷 Jira ]   [ 🐙 GitHub ]              │    │
│   └─────────────────────────────────────────┘    │
│                                                   │
│   Destination                                     │
│   ┌── [Project: TESTABLY ─────────── ▾] ──┐      │
│   └──────────────────────────────────────┘      │
│                                                   │
│   Title *                                         │
│   ┌─────────────────────────────────────────┐    │
│   │ Safari 17 fails 63% of critical TCs...   │    │
│   └─────────────────────────────────────────┘    │
│                                                   │
│   Description                                     │
│   ┌─────────────────────────────────────────┐    │
│   │ Safari 17 shows 37% pass rate across     │    │
│   │ 11 executed TCs, the lowest among 5…     │    │
│   │                                          │    │
│   │ Recommendations:                         │    │
│   │ - Assign a run targeting Safari 17...    │    │
│   │ - Schedule TC-142 on Chrome/Firefox...   │    │
│   │                                          │    │
│   │ —                                        │    │
│   │ Generated by Testably AI                 │    │
│   └─────────────────────────────────────────┘    │
│                                                   │
│   Labels (optional)                               │
│   ┌ testably ✕ │ env-coverage ✕ │ + ────────┐    │
│   └──────────────────────────────────────────┘    │
│                                                   │
│   Priority      [ High ▾]   (Jira 탭만)            │
│                                                   │
│   ┌─ Error banner (표시 시) ─────────────────┐    │
│   │ ⚠️ Failed to create issue: {error}        │    │
│   └─────────────────────────────────────────┘    │
│                                                   │
│                    [ Cancel ]    [ Create issue ] │
└───────────────────────────────────────────────────┘
```

**크기 & 컨테이너:**

| 요소 | 값 |
|---|---|
| 오버레이 (`ModalShell` 재사용) | `fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center` |
| 다이얼로그 | `w-full max-w-[520px] bg-white rounded-2xl shadow-[0_25px_60px_0_rgba(0,0,0,0.2)]` |
| 다이얼로그 헤더 | `px-6 py-4 border-b border-gray-200 flex items-center justify-between` |
| 헤더 제목 | `text-base font-semibold text-gray-900` |
| 닫기 버튼 | `text-gray-400 hover:text-gray-600 ri-close-line text-xl` |
| 바디 | `px-6 py-4 space-y-4` |
| 푸터 | `px-6 py-4 border-t border-gray-200 flex justify-end gap-2 bg-gray-50 rounded-b-2xl` |

**탭 스트립 (AC-H3):**

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `flex gap-1 p-1 bg-gray-100 rounded-lg` |
| 탭 (active) | `flex-1 px-3 py-1.5 text-sm font-medium bg-white text-gray-900 rounded-md shadow-sm` |
| 탭 (inactive) | `flex-1 px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700` |
| Jira 아이콘 | `ri-stack-line` · 14px · `#0052CC` (active) / `#9CA3AF` (inactive) |
| GitHub 아이콘 | `ri-github-fill` · 14px · `#111827` / `#9CA3AF` |

**Input/Select/Textarea 스타일 (앱 통일):**

| 요소 | 클래스 |
|---|---|
| Label | `block text-xs font-medium text-gray-700 mb-1` |
| 필수 표시 `*` | `text-red-500 ml-0.5` |
| Input | `w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 transition-colors` |
| Textarea | 위 + `rows={7} resize-y min-h-[140px] font-mono text-[12.5px] leading-relaxed` |
| Select | 위 + 오른쪽 chevron 아이콘 |
| Tag chip | `inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 text-xs rounded-full border border-violet-200` |
| Tag chip 삭제 버튼 | `ri-close-line text-xs ml-0.5 hover:text-violet-900` |

**버튼 (푸터):**

| 버튼 | 클래스 |
|---|---|
| Cancel | `px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors` |
| Create issue | `px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 active:bg-violet-800 rounded-lg shadow-[0_2px_8px_rgba(124,58,237,0.25)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed` |
| Create issue (submitting) | 위 + 아이콘 `ri-loader-4-line animate-spin mr-1.5` + 텍스트 "Creating…" |

**Empty state — Jira/GitHub 둘 다 미연결 (AC-H3):**

```
┌──────── Create issue from AI insight ─ ✕ ────────┐
│                                                   │
│   ┌───────────────────────────────────────────┐   │
│   │         🔗 (48px gray-300)                │   │
│   │                                            │   │
│   │   Connect an issue tracker first           │   │
│   │                                            │   │
│   │   Testably needs a Jira or GitHub          │   │
│   │   connection to create issues from         │   │
│   │   AI insights.                             │   │
│   │                                            │   │
│   │       [ → Open Settings ]                  │   │
│   │                                            │   │
│   └───────────────────────────────────────────┘   │
│                                                   │
└───────────────────────────────────────────────────┘
```

| 요소 | 클래스 |
|---|---|
| 컨테이너 | `py-12 text-center` |
| 아이콘 | `ri-links-line text-5xl text-gray-300` |
| 제목 | `text-sm font-semibold text-gray-900 mt-4` |
| 설명 | `text-xs text-gray-500 mt-2 max-w-xs mx-auto leading-relaxed` |
| CTA | `mt-6 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg` + `ri-arrow-right-line` |

---

## 3. 인터랙션

### 3-1. f001 Regenerate 버튼

| 트리거 | 동작 | 애니메이션 | AC |
|---|---|---|---|
| 버튼 클릭 (enabled) | `onRegenerate(false)` → `isGenerating=true` → 호출 후 해제 | fade 150ms | AC-F / AC-G7 |
| 버튼 클릭 (disabled: tier) | `navigate('/settings?tab=billing')` | — | AF-1 |
| 버튼 클릭 (disabled: credits) | `navigate('/settings?tab=ai-usage')` | — | AF-2 |
| 버튼 호버 (enabled) | bg indigo-50 | 120ms colors | — |
| 버튼 호버 (disabled) | tooltip 노출 (`title` + aria) | 200ms | AC-G6 |
| Focus-visible | 2px violet-500 ring + ring-offset-2 | — | A11y |
| AI 생성 성공 | toast `heatmap.ai.toast.generated` / `regenerated` | — | AC-F5 |
| AI 생성 에러 | 에러 배너 inline 표시 + 토스트 | — | AC-F7 |

### 3-2. f002-a Create Issue 칩

| 트리거 | 동작 | AC |
|---|---|---|
| Critical card "Create issue" 칩 클릭 | `onCreateIssue({title, description, source})` → 모달 오픈 | AC-H1/H2 |
| 모달 Jira/GitHub 탭 전환 | state만 전환, 입력값 유지 | AC-H3 |
| Create 버튼 클릭 | `invokeEdge('create-jira-issue' or 'create-github-issue')` | AC-H6 |
| 생성 성공 | 모달 닫기 + toast "Issue created · View" | AC-H7 |
| 생성 실패 | 모달 내 error banner, 모달 유지 | AC-H8 |
| ESC 키 | 모달 닫기 | AC-H9 |
| 오버레이 클릭 | 모달 닫기 | AC-H9 |
| 닫기 버튼 | 모달 닫기 | AC-H9 |
| Label 태그 Enter | 새 태그 추가 | — |
| Label 태그 Backspace (빈 input) | 마지막 태그 삭제 | — |

### 3-3. f002-b Filter 칩 ↔ Heatmap Column Highlight

| 트리거 | 동작 | AC |
|---|---|---|
| Critical card "Filter {env}" 칩 클릭 | `onHighlightEnv(label)` → `setHighlightedEnv(prev => prev === label ? null : label)` | AC-I1/I2 |
| 동일 칩 재클릭 | toggle off → highlightedEnv = null | BR-7 |
| 다른 env 칩 클릭 (switch) | 새 env로 교체 (toggle 아닌 replace) | §8 |
| Heatmap 상단 Clear pill 클릭 | `setHighlightedEnv(null)` | AC-I5 |

**칩 active 상태 스타일:**

| 상태 | 배경 | 보더 | 텍스트 | 라벨 포맷 |
|---|---|---|---|---|
| 기본 | `#fff` | `1px solid #DDD6FE` | `#7C3AED` | "Filter Safari 17" |
| Hover | `#F5F3FF` | 동일 | 동일 | 동일 |
| **Active (this env filtered)** | `#7C3AED` | `1px solid #6D28D9` | `#fff` | "Safari 17 ✕" |
| Active hover | `#6D28D9` | 동일 | 동일 | 동일 |

**Heatmap column highlight 상세 (AC-I3, I4):**

| 요소 | 정상 | `highlightedEnv === col.env.name` | 다른 column |
|---|---|---|---|
| column header (OS group cell) | 기본 | `outline: 2px solid #7C3AED; outline-offset: -2px;` | `opacity: 0.45` |
| column header (browser cell) | 기본 | 위와 동일 outline | `opacity: 0.45` |
| 해당 column의 모든 heatmap cells | 기본 | 동일 outline | `opacity: 0.45` |
| 애니메이션 | — | 200ms ease-in | 200ms ease-in |

**Heatmap 상단 안내 pill (AC-I5):**

```
┌ Showing Safari 17 · Clear ┐
└───────────────────────────┘
```

| 요소 | 클래스 |
|---|---|
| 컨테이너 | `inline-flex items-center gap-2 px-3 py-1 bg-violet-100 border border-violet-300 text-violet-800 text-xs font-medium rounded-full mb-2` |
| "Showing {env}" | `flex items-center gap-1` |
| 점선 구분자 (`·`) | `text-violet-400` |
| Clear 버튼 | `text-violet-700 hover:text-violet-900 font-semibold underline cursor-pointer` |
| 위치 | 히트맵 카드 **내부** 상단 첫 번째 자식 (sticky header 위) |

### 3-4. f002-c Assign Run 칩

| 트리거 | 동작 | AC |
|---|---|---|
| Coverage Gap "Assign run" 칩 클릭 | `onAssignRun()` | AC-J1 |
| plan-detail 내 runs 탭 아님 | `setActiveTab('runs')` 후 `requestAnimationFrame` 으로 scrollIntoView | — |
| plan-detail 내 runs 탭 맞음 | `document.getElementById('plan-runs-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })` | AC-J2 |
| DOM id 없음 | 에러 토스트 `plan.env.ai.runsSectionNotFound` | AC-J4 |
| 스크롤 후 | toast (info, 6s) `plan.env.ai.assignRunToast` | AC-J3 |
| 스크롤 후 (선택) | runs 섹션에 violet outline 펄스 2초 애니메이션 | (optional polish) |

**Runs 섹션 pulse 애니메이션 (optional polish):**

```css
@keyframes violet-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
  50%      { box-shadow: 0 0 0 4px rgba(124,58,237,0.25); }
}
.runs-section-highlight { animation: violet-pulse 2s ease-in-out 1; }
```

JS: scroll 완료 후 `className += ' runs-section-highlight'` 후 2.1초 후 제거.

### 3-5. 키보드 / a11y 매트릭스

| 동작 | 단축키 / 조작 |
|---|---|
| Trigger 버튼 포커스 | `Tab` 로 탐색, `Enter` / `Space` 로 호출 |
| 모달 열기 | 칩에 `role="button" tabIndex=0` + Enter/Space 핸들러 |
| 모달 ESC | `ModalShell` 내장 동작 |
| 모달 내 Tab 순환 | 기본 Tab 순서 (native) — focus trap은 OOS (ModalShell에 미구현) |
| 칩 좌우 화살표 (optional) | 칩 그룹에 `role="group"`, 각 칩 `tabIndex=0`. 좌우 화살표는 네이티브 tab order로 충분 |
| 스크린리더 announce (AI 생성) | AI headline block `aria-live="polite"`, 생성 중 `aria-busy="true"` |
| 스크린리더 announce (칩 active) | "Filter Safari 17, pressed" — `aria-pressed={highlightedEnv === label}` |
| 스크린리더 (modal) | `role="dialog" aria-modal="true" aria-labelledby="issue-modal-title"` |

---

## 4. 시각 토큰 (색/폰트/간격)

### 4-1. 컬러 팔레트 (기존 확장)

| 역할 | hex | 용도 |
|---|---|---|
| **AI Primary** | `#7C3AED` | violet-600 — AI 액센트, 섹션 타이틀, 칩 텍스트 |
| **AI Primary Dark** | `#6D28D9` | violet-700 — 활성/호버 |
| **AI Primary Deep** | `#4C1D95` | violet-900 — headline 텍스트 |
| **AI Border** | `#DDD6FE` | violet-200 — 사이드바 보더, 내부 카드 보더(강조) |
| **AI Border Soft** | `#EDE9FE` | violet-100 — 내부 카드 보더(기본) |
| **AI Tint 1** | `#F5F3FF` | violet-50 — 배경 상단 |
| **AI Tint 2** | `#EEF2FF` | indigo-50 — 배경 하단 |
| **AI Tint 3** | `#FAF5FF` | headline 카드 보조 배경 |
| **AI Muted** | `#A78BFA` | violet-400 — meta 텍스트 (relative time) |
| Info | `#1E40AF / #EFF6FF / #BFDBFE` | info banner (too_little_data) |
| Error | `#991B1B / #FEF2F2 / #FECACA` | error banner |
| Warn (low confidence) | `#B45309 / #FFFBEB / #FDE68A` | 뱃지 |

### 4-2. 타이포 스케일

| 역할 | size/weight/color |
|---|---|
| 사이드바 section head | `11px / 700 / #7C3AED / uppercase / letter-spacing 0.05em` |
| Cached badge | `9.5px / 500 / #7C3AED` |
| Trigger 버튼 | `12px / 500 / #4F46E5` (indigo-600) |
| Trigger 서브 meta | `10.5px / 400 / #9CA3AF` — "29 credits left · Starter" |
| AI headline | `13px / 600 / #4C1D95 / line-height 1.4` |
| AI headline meta (confidence) | `10px / 500 / #7C3AED` |
| AI headline meta (time) | `10px / 400 / #A78BFA` |
| Card TAG | `9.5px / 700 / uppercase / letter-spacing 0.04em` (기존 유지) |
| Card H4 | `12.5px / 600 / var(--text)` (기존 유지) |
| Card P | `11px / 400 / var(--text-muted) / line-height 1.45` (기존 유지) |
| Recommendation item | `11.5px / 400 / var(--text) / line-height 1.45` |
| Recommendation 번호 | `10px / 600 / #6D28D9` |
| Chip | `10.5px / 500` (기존) |
| Modal header | `16px / 600 / #111827` |
| Modal label | `12px / 500 / #374151` |
| Modal input text | `14px / 400 / #111827` |
| Modal textarea | `12.5px / 400 / monospace / line-height 1.5` |

### 4-3. 간격 / 반경 / 그림자

| 토큰 | 값 |
|---|---|
| 모달 radius | `16px` (rounded-2xl) |
| 카드 radius | `8px` (기존) |
| 칩/뱃지 radius | `10~999px` (pill) |
| 사이드바 pad | `12px` (기존) |
| 카드 pad | `10px 11px` (기존) |
| 모달 pad | `px-6 py-4` |
| 모달 그림자 | `0 25px 60px rgba(0,0,0,0.2)` |
| 버튼 glow (violet) | `0 2px 8px rgba(124,58,237,0.25)` |
| AI headline gradient | `linear-gradient(135deg, #F5F3FF 0%, #FAF5FF 100%)` |
| Focus ring | `2px solid #8B5CF6; outline-offset: 2px;` |

### 4-4. 아이콘 매핑 (Remix Icon — app 내부는 `ri-*` 사용)

| 용도 | 아이콘 |
|---|---|
| AI 섹션 타이틀 | `ri-magic-line` (기존) |
| Sparkle/trigger | `ri-sparkling-2-line` |
| Loading | `ri-loader-4-line animate-spin` |
| Cached 뱃지 | `ri-time-line` 14px (신규, 선택) |
| Error | `ri-alert-line` |
| Info | `ri-information-line` |
| Tier lock | `ri-lock-line` |
| Close modal | `ri-close-line` |
| Jira 탭 | `ri-stack-line` (대체: 프로젝트 favicon URL 있으면 `<img>`) |
| GitHub 탭 | `ri-github-fill` |
| Empty tracker | `ri-links-line` |
| Filter clear | `ri-close-circle-line` |
| Scroll CTA | `ri-arrow-down-line` |
| Settings link | `ri-arrow-right-line` |

---

## 5. 상태별 화면

### 5-1. 정상 (rule-based only — 최초 진입)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│                                              │
│ ┌ ✨ Regenerate with AI · 1 credit  ┐  [30]  │
│ │ 29 credits left · Starter         │        │
│                                              │
│ ┌ CRITICAL ─────────────────────────┐       │
│ │ Safari 17 · 37% pass rate         │       │
│ │ Rule-based detail                  │       │
│ │ [Create issue] [Filter Safari 17]  │       │
│ └───────────────────────────────────┘       │
│ … (기존 카드 유지)                            │
└──────────────────────────────────────────────┘
```

Cached 뱃지 **없음**, AI headline block **없음**, Recommendations **없음**.

### 5-2. AI 생성 중 (loading) — AC-G7

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│                                              │
│ [ ⟳ Analyzing environments… ]                │  disabled
│                                              │
│ ┌ dim 50% opacity ───────────────────┐       │
│ │ (기존 rule-based 카드 유지, 흐리게)   │       │
│ │ aria-busy="true"                    │       │
│ └─────────────────────────────────────┘       │
└───────────────────────────────────────────────┘
```

- Trigger 버튼: `disabled: true, loading: true`
- rule-based 카드 스택: `opacity: 0.5, transition: opacity 200ms`
- Min 500ms lock (milestone-risk 패턴 상속 — UX jitter 방지)

### 5-3. AI 성공 (fresh)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│                                              │
│ [ ✨ Regenerate with AI · 1 credit ]   [29]  │
│                                              │
│ ┌ ✨ AI Headline ─────────────────────┐      │
│ │ Safari 17 fails 63% of critical TCs │      │
│ │ — investigate before release.        │      │
│ │ · 78% confidence           AI · now │      │
│ └─────────────────────────────────────┘      │
│                                              │
│ ┌ CRITICAL ──────────────────────────┐       │
│ │ Safari 17 · 37% pass rate           │       │
│ │ Safari 17 shows 37% pass rate       │ ← AI │
│ │ across 11 executed TCs, the lowest… │       │
│ │ [Create issue] [Filter Safari 17]   │       │
│ └────────────────────────────────────┘       │
│ ┌ COVERAGE GAP ──────────────────────┐       │
│ │ TC-142: Payment checkout            │       │
│ │ Untested in 4 of 5 envs. Critical…  │ ← AI │
│ │ [Assign run]                        │       │
│ └────────────────────────────────────┘       │
│ ┌ BASELINE (rule-based) ─────────────┐       │
│ └────────────────────────────────────┘       │
│ ┌ RECOMMENDATIONS ───────────────────┐       │
│ │ ① Assign a run targeting Safari 17… │       │
│ │ ② Schedule TC-142 on Chrome/Firefox │       │
│ └────────────────────────────────────┘       │
│ ┌ QUICK STATS (rule-based) ──────────┐       │
│ └────────────────────────────────────┘       │
└───────────────────────────────────────────────┘
```

### 5-4. AI 성공 (cache hit) — 시각 차이점

- head row 오른쪽에 `Cached · 12m ago` 뱃지 추가:
  ```
  ✨ AI INSIGHTS   2 patterns   [Cached · 12m ago]
  ```
  스타일: `text-[9.5px] text-violet-600 bg-white border border-violet-200 px-1.5 py-0.5 rounded-full flex items-center gap-1` + `ri-time-line` 10px.
- AI headline block meta도 `AI · 12m ago` (relative time from generated_at).
- credit 뱃지는 현재 remaining 값 유지.

### 5-5. too_little_data (AC-G10)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│ [ ✨ Regenerate with AI · 1 credit ]   [29]  │
│                                              │
│ ┌ ℹ️ Not enough data yet ─────────────┐     │
│ │ Run at least 5 test results to get   │     │
│ │ AI insights. No credit consumed.     │     │
│ └─────────────────────────────────────┘      │
│                                              │
│ ┌ (rule-based 카드 스택 그대로) ────────┐     │
│ └─────────────────────────────────────┘      │
└───────────────────────────────────────────────┘
```

AI headline/Recommendations **숨김**, rule-based 전부 표시, credit 차감 0.

### 5-6. AI 에러 (fallback graceful)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│ [ ✨ Regenerate with AI · 1 credit ]   [29]  │
│                                              │
│ ┌ ⚠️ AI analysis failed ─────────────┐       │
│ │ Try again in a moment.    [Retry]   │       │
│ │ No credit was used.                 │       │
│ └────────────────────────────────────┘       │
│                                              │
│ ┌ (rule-based 카드 스택 그대로) ────────┐    │
│ └──────────────────────────────────────┘    │
└───────────────────────────────────────────────┘
```

### 5-7. Free/Hobby tier (disabled)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│                                              │
│ [ 🔒 Regenerate with AI ]   Upgrade to Starter │  ← disabled
│   title="Requires Starter plan"               │     +underline
│                                              │
│ ┌ (rule-based 카드 스택 그대로) ────────┐    │
│ └──────────────────────────────────────┘    │
└───────────────────────────────────────────────┘
```

- Trigger disabled opacity-50 + 오른쪽에 `<Link className="text-xs text-violet-700 hover:text-violet-900 underline ml-2" to="/settings?tab=billing">Upgrade to Starter</Link>`

### 5-8. Credit 0 (Starter이지만 한도 소진)

```
┌───────────────────────────────────────────────┐
│ ✨ AI INSIGHTS              2 patterns        │
│                                              │
│ [ ⚠️ No AI credits left ]                     │  ← disabled
│   0 of 30 credits left · resets May 1         │
│                                              │
│ ┌ (rule-based 카드 스택 그대로) ────────┐    │
│ └──────────────────────────────────────┘    │
└───────────────────────────────────────────────┘
```

- Credit 뱃지는 `bg-red-100 text-red-700` 로 전환.
- 서브 메타 라인 "reset May 1" → `getMonthlyResetDate()` fallback 포맷.
- 클릭 시 `/settings?tab=ai-usage` 이동.

### 5-9. IssueCreateInlineModal 상태 매트릭스

| 상태 | 포맷 |
|---|---|
| 초기 (Jira 연결됨, 기본 탭 Jira) | §2-4 상단 와이어 |
| Jira 없고 GitHub 만 | 기본 탭 GitHub |
| 둘 다 없음 | §2-4 하단 empty state |
| Project picker 로딩 | `<Skeleton className="h-9 w-full" />` |
| Title 비움 (submit 시도) | Title input border `border-red-500`, `<p className="text-xs text-red-500 mt-1">Title is required</p>` |
| Submitting | Create 버튼 `disabled + loader icon + "Creating…"`, 다른 필드 `disabled opacity-50` |
| 성공 | 모달 닫기 + sonner toast (success) |
| 실패 | 모달 body 최하단에 error banner (red) + 모달 유지 |
| 네트워크 끊김 | 실패와 동일 처리 + "Network error" 문구 |

---

## 6. 반응형

### 6-1. 브레이크포인트별 레이아웃

| 브레이크포인트 | 레이아웃 |
|---|---|
| **≥ 1280px (xl)** | 히트맵 + 사이드바 2-col grid (1fr : 320px) |
| **1024–1279px (lg)** | 동일 2-col, 사이드바 280px로 축소 |
| **768–1023px (md)** | 1-col stack: 히트맵 위 / 사이드바 아래, 사이드바 `collapsed by default` |
| **< 768px (sm)** | 1-col stack + **"Tap to expand AI insights" 접이식 버튼** |

### 6-2. Mobile collapsed state (< 768px)

```
┌──────────────────────────────────────┐
│ Heatmap (스크롤)                      │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ ✨ Tap to expand AI insights         │  ← 버튼 (탭 하면 expand)
│                               2 ∧    │
└──────────────────────────────────────┘
```

| 요소 | 스타일 |
|---|---|
| 컨테이너 | `w-full px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-lg flex items-center justify-between` |
| 아이콘 | `ri-magic-line text-violet-600` |
| 라벨 | `text-sm font-medium text-violet-800 flex-1 ml-2` |
| 뱃지 + chevron | `flex items-center gap-2` — pattern count + `ri-arrow-down-s-line` 또는 `-up-` |
| 탭/터치 | `role="button" aria-expanded={isOpen}` |

### 6-3. 모달 반응형

| 브레이크포인트 | 모달 동작 |
|---|---|
| ≥ 640px | max-w-[520px], 가운데 정렬 |
| < 640px | `max-w-full mx-2` fullscreen-like, `max-h-[90vh] overflow-y-auto` |
| Textarea rows | ≥ 640px: `rows={7}`, < 640px: `rows={5}` |

### 6-4. Heatmap column highlight (모바일)

- opacity dim은 유지
- outline border는 `outline-offset: 0` (모바일에서 잘림 방지)
- Clear pill은 히트맵 상단 sticky로 유지 (스크롤해도 보이도록)

---

## 7. 다크모드

현재 `plan-detail` 전체가 라이트 모드 전용이다 (기존 코드가 `#fff` 하드코딩). 본 스펙 범위에서 다크모드는 **스코프 외 (OOS)**로 다룬다. 단, 향후 다크 모드 도입 시 참고할 매핑을 명시:

| 요소 | Light | Dark (future) |
|---|---|---|
| AI sidebar bg | `linear-gradient(#F5F3FF→#EEF2FF)` | `linear-gradient(#2E1065→#1E1B4B)` |
| 내부 카드 | `#fff / 1px solid #EDE9FE` | `#1E1B4B / 1px solid #4C1D95` |
| 텍스트 primary | `#4C1D95` | `#C4B5FD` |
| Headline gradient | `#F5F3FF → #FAF5FF` | `#2E1065 → #3B0764` |
| Modal bg | `#fff` | `#0F172A` |
| Modal input | `border-gray-300 bg-white` | `border-white/10 bg-white/5` |
| Error banner | `#FEF2F2 / #FECACA` | `#450A0A / rgba(248,113,113,0.3)` |

---

## 8. 엣지 케이스

| 케이스 | 처리 |
|---|---|
| `aiInsight.headline === null && too_little_data === false` (AI JSON 이상) | headline block 자체를 숨기고 rule-based로 fallback. 콘솔 warn. |
| `recommendations.length === 0` but AI 성공 | Recommendations card 자체를 숨김 (렌더 조건 AC-G5) |
| `confidence === null` | 신뢰도 뱃지 숨김 |
| `confidence < 40` | Low confidence 뱃지 표시 (AC-G8) |
| headline 120자 초과 | CSS `text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;` → 3줄 초과 시 잘림 |
| critical_reason 500자 초과 | Dev Spec §AC-C17에서 이미 서버단 clamp. 프론트 추가 보호 없이 렌더 |
| 동일 env 이름이 browser_name + env.name 에 모두 있을 때 | AC-I3 의 OR 비교 로직이 양쪽 커버. 시각상 두 column 다 outline되면 의도에 부합 |
| 모바일에서 highlighted column이 가로 스크롤 밖 | `scrollIntoView({ inline: 'center' })` 를 `onHighlightEnv` 후 실행하여 해당 column을 센터로 이동 |
| IssueCreateInlineModal 열린 상태에서 부모 unmount (네비게이션) | ModalShell이 body scroll lock을 복원. 모달 state는 parent에서 관리하므로 자동 닫힘 |
| `aiInsight` 캐시 구조가 구버전 (headline undefined) | headline block 숨김, rule-based만 표시. Force refresh 권장 안내 없음 (자연 복구) |
| `remainingCredits === -1` (unlimited) | 뱃지 숫자 자리에 `∞` 표시, `text-violet-600` 유지 |
| 매우 빠른 연속 클릭 (double click) | 첫 클릭으로 `isGenerating=true` → 즉시 disabled 상태로 전환되어 두 번째는 no-op |
| Chip click (keyboard) | `Enter`/`Space` 둘 다 트리거, 기존 Chip 컴포넌트 onKeyDown 핸들러 유지 |
| 모달 열린 채로 Tab Escape → 페이지 언포커스 | ModalShell의 ESC는 document-level — 페이지 포커스와 무관하게 동작 |

---

## 9. 기존 컴포넌트 재사용 목록

### 재사용 (수정 없이)

| 컴포넌트 | 위치 | 용도 |
|---|---|---|
| `ModalShell` | `src/components/ModalShell.tsx` | IssueCreateInlineModal 래퍼 |
| `Toast` (sonner) | `src/components/Toast.tsx` | 성공/에러/info 토스트 |
| `Skeleton` | `src/components/Skeleton.tsx` | Modal 내 프로젝트 피커 로딩 |
| `formatRelativeTime` | `src/lib/formatRelativeTime.ts` | "12m ago" |

### 수정 (props 확장)

| 컴포넌트 | 변경 | AC |
|---|---|---|
| `AITriggerButton` | `disabled`, `loading`, `disabledReason`, `disabledTooltip`, `creditCost` prop 추가 | AC-G6/G7 |
| `EnvironmentAIInsights` | props 대폭 확장 (§2-2), AI 렌더 분기 추가 | AC-G1~G10 |
| `plan-detail/page.tsx` | `highlightedEnv` state, heatmap column outline CSS, modal 오픈 핸들러, runs id 추가 | AC-H/I/J |

### 신규 생성

| 컴포넌트 | 역할 |
|---|---|
| `AIHeadlineBlock` | EnvironmentAIInsights 내부 subcomponent |
| `RecommendationsCard` | 위 동일 |
| `AIInfoBanner` | 위 동일 (too_little_data) |
| `AIErrorBanner` | 위 동일 (AI 실패 fallback) |
| `IssueCreateInlineModal` | f002-a 인라인 모달 (plan-detail 전용) |

---

## 10. 토스트 메시지 (EN/KO 통합표)

| 이벤트 | EN | KO | 타입 |
|---|---|---|---|
| f001 AI 생성 성공 (첫 생성) | "AI insights generated" | "AI 인사이트가 생성되었습니다" | success |
| f001 AI 재생성 성공 | "AI insights refreshed" | "AI 인사이트가 갱신되었습니다" | success |
| f001 Cache hit | (토스트 없음 — head row 뱃지만) | (동일) | — |
| f001 too_little_data | (토스트 없음 — inline banner만) | (동일) | — |
| f001 tier_too_low 클릭 | "Starter plan required for AI insights" | "AI 인사이트는 Starter 플랜 이상에서 사용 가능합니다" | info |
| f001 monthly_limit_reached | "Monthly AI credit limit reached" | "이번 달 AI 크레딧 한도에 도달했습니다" | error |
| f001 ai_timeout | "AI analysis timed out. Try again." | "AI 분석 시간이 초과되었습니다. 다시 시도해주세요." | error |
| f001 network error | "Network error. Check your connection." | "네트워크 오류. 연결을 확인해주세요." | error |
| f002-a 이슈 생성 성공 | "Issue created" (optional link: "View issue") | "이슈가 생성되었습니다" ("보기") | success |
| f002-a 이슈 생성 실패 | "Failed to create issue: {detail}" | "이슈 생성 실패: {detail}" | error (inline banner) |
| f002-b Filter on | (토스트 없음 — heatmap visual만) | (동일) | — |
| f002-b Filter off (Clear) | (토스트 없음) | (동일) | — |
| f002-c Assign run 성공 (scroll + 안내) | "Add a run targeting \"{tc}\" to close the coverage gap." | "\"{tc}\" 커버리지를 채울 수 있도록 실행을 추가해주세요." | info (duration 6000ms) |
| f002-c runs 섹션 없음 | "Runs section not found — navigate to the Runs tab." | "실행 섹션을 찾을 수 없습니다 — Runs 탭으로 이동해주세요." | error |

---

## 11. Dev Spec AC ↔ 디자인 매핑 (1:1)

| AC | 디자인 섹션 |
|---|---|
| AC-G1 props 확장 | §2-2 |
| AC-G2 AI headline | §2-3 (A) + §5-3 |
| AC-G3 Critical AI reason | §2-2 렌더 분기 표 + §5-3 |
| AC-G4 Coverage gap AI reason | §2-2 렌더 분기 표 + §5-3 |
| AC-G5 RecommendationsCard | §2-3 (B) + §5-3 |
| AC-G6 Trigger disabled states | §2-1 State 표 + §5-7 / §5-8 |
| AC-G7 Loading state | §2-1 + §5-2 |
| AC-G8 Low confidence 뱃지 | §2-3 (A) headline meta |
| AC-G9 최초 rule-based only 회귀 방지 | §2-2 최초 row + §5-1 |
| AC-G10 too_little_data info banner | §2-3 (C) + §5-5 |
| AC-H1 Create issue chip onClick | §3-2 |
| AC-H2 IssueCreateInlineModal open | §2-4 |
| AC-H3 Jira/GitHub 탭 + empty state | §2-4 탭 + empty state |
| AC-H4 Title pre-fill | §2-4 input + §3-2 |
| AC-H5 Description pre-fill | §2-4 textarea + §3-2 |
| AC-H6 Edge function 호출 | §3-2 |
| AC-H7 성공 토스트 + 링크 | §10 |
| AC-H8 실패 인라인 에러 banner | §5-9 + §2-4 |
| AC-H9 ESC/overlay/X 닫기 | §3-2 + ModalShell 기본 동작 |
| AC-H10 Submitting disabled | §5-9 Submitting row |
| AC-I1 Filter chip onClick | §3-3 |
| AC-I2 highlightedEnv toggle | §3-3 BR-7 |
| AC-I3 column outline CSS | §3-3 "Heatmap column highlight" 표 |
| AC-I4 dim other columns | §3-3 표 |
| AC-I5 Showing pill + Clear | §3-3 "Heatmap 상단 안내 pill" |
| AC-I6 highlightedEnv null 회귀 | §3-3 표 "정상" 행 |
| AC-I7 browser_name 매칭 | §8 엣지 케이스 |
| AC-J1 Assign run chip onClick | §3-4 |
| AC-J2 scrollIntoView | §3-4 표 |
| AC-J3 info 토스트 6s | §10 + §3-4 |
| AC-J4 Runs 없음 에러 토스트 | §10 + §3-4 |
| AC-K1/K2 i18n 키 | §10 |

---

## 12. 구현 가이드 (developer notes)

### 12-1. 파일 수정 체크리스트

1. `src/components/AITriggerButton.tsx`
   - Props 확장 (§2-1). 기존 variant는 그대로 유지.
   - `disabled` 일 때 `aria-disabled`, `title`, 클릭 시 navigate 동작.
2. `src/components/EnvironmentAIInsights.tsx`
   - Props 확장 → render 분기 (§2-2 표) 엄수.
   - 내부 subcomponent 4개 추가: `AIHeadlineBlock`, `RecommendationsCard`, `AIInfoBanner`, `AIErrorBanner`.
   - `Chip` 컴포넌트에 `active` prop 추가 (§3-3 스타일 표).
   - `aria-live="polite"` + `aria-busy` 래핑.
3. `src/components/IssueCreateInlineModal.tsx` (신규)
   - `ModalShell` 재사용, `max-w-[520px]`.
   - props: `open, onClose, prefill: {title, description}, projectId, aiSource, onSuccess`.
   - Jira/GitHub 탭 state `useState<'jira'|'github'>`.
   - Jira: `jira_settings` fetch → projects dropdown → `invokeEdge('create-jira-issue', ...)`.
   - GitHub: `github_settings` fetch → repo dropdown → `invokeEdge('create-github-issue', ...)`.
4. `src/pages/plan-detail/page.tsx`
   - `const [highlightedEnv, setHighlightedEnv] = useState<string|null>(null);`
   - `const [issueModal, setIssueModal] = useState<null | IssueCreatePrefill>(null);`
   - `useEnvAiInsights(planId, locale)` 훅 호출.
   - EnvironmentAIInsights에 props 주입.
   - Heatmap cell render에 `col.env.name === highlightedEnv || col.browserLabel === highlightedEnv` 분기 CSS.
   - Heatmap 카드 내부 상단 `{highlightedEnv && <ShowingPill />}` 렌더.
   - Runs 섹션 wrapper에 `id="plan-runs-section"`.
   - `onAssignRun` 핸들러: tab 전환 → `requestAnimationFrame` → scrollIntoView → toast.
5. `src/i18n/local/en|ko/environments.ts` — `heatmap.ai.*` 확장 (Dev Spec §10)
6. `src/i18n/local/en|ko/projects.ts` — `plan.env.ai.*` 신규 네임스페이스

### 12-2. CSS 구현 힌트 (highlight outline)

현재 heatmap은 inline style로 구현되어 있어 외부 CSS에 의존하지 않는다. 권장 방식:

```tsx
const isHighlightedCol = highlightedEnv &&
  (col.env.name === highlightedEnv || col.browserLabel === highlightedEnv);
const isDimmedCol = highlightedEnv && !isHighlightedCol;

const cellStyle = {
  ...baseCellStyle,
  outline: isHighlightedCol ? '2px solid #7C3AED' : undefined,
  outlineOffset: isHighlightedCol ? '-2px' : undefined,
  opacity: isDimmedCol ? 0.45 : 1,
  transition: 'opacity 200ms ease-in, outline 200ms ease-in',
};
```

(OS group header `<th colSpan>`, browser header `<th>`, 그리고 각 `<td>` 셀 세 군데 모두에 적용해야 column 전체가 하이라이트된다.)

### 12-3. 토스트 중복 제거 (dedupe)

`milestone-risk-predictor` 선례와 동일한 10초 dedupe 패턴 적용 (`RiskInsightContainer.tsx`의 `toastDedupeRef`). `useEnvAiInsights` 훅 내부에서 관리.

### 12-4. 애니메이션 타이밍

| 이벤트 | 지속 시간 |
|---|---|
| Trigger 호버 | 120ms colors |
| Modal 열기/닫기 | 200ms (ModalShell 내장) |
| AI headline fade-in (최초 생성) | 300ms `fade-in + translateY(4px → 0)` |
| AI dim 전환 (로딩 시작/끝) | 200ms opacity |
| Heatmap column outline 전환 | 200ms |
| Runs section pulse | 2000ms (1회) |

### 12-5. 성능

- Heatmap column highlight는 React re-render 유발 — `highlightedEnv` 변경 시 전체 matrix 재계산 방지 위해 `useMemo` 의존 배열에 추가하지 않고 **inline style만 업데이트**.
- AI headline/recommendations는 short string이라 성능 이슈 없음.
- Modal은 `open` 일 때만 마운트 (`{issueModal && <IssueCreateInlineModal .../>}`).

---

## 13. 디자인 개발 착수 전 체크리스트

- [x] 모든 상태 정의됨 (정상 / 빈/rule-only / 로딩 / 에러 / 제한(tier) / 제한(credits) / too_little_data / cache hit) — §5-1~5-9
- [x] Tailwind 클래스 구체적 명시 (§2-4 모달, §2-1 버튼, §3-3 칩/pill)
- [x] 인라인 style 기반 기존 컴포넌트 확장도 구체적 hex 명시 (§4-1)
- [x] 기존 컴포넌트 재사용 목록 (§9)
- [x] 인터랙션 (클릭/호버/키보드/스크린리더) (§3-1~3-5)
- [x] 반응형 브레이크포인트별 변경점 (§6)
- [x] 다크모드는 OOS 명시 + 향후 매핑 참고 (§7)
- [x] 토스트 메시지 EN/KO (§10)
- [x] Dev Spec AC와 1:1 매핑 (§11)
- [x] 구현 가이드 + CSS 힌트 + 애니메이션 타이밍 (§12)
