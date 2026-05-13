# Design Spec: SEO Competitor Full-Coverage Pages

> **작성일:** 2026-05-13
> **작성자:** @designer
> **상태:** Draft → Review → Approved
> **관련 개발지시서:** `docs/specs/dev-spec-seo-competitor-pages.md`
> **관련 리서치:** `docs/research/seo-competitor-strategy-brief.md`, `docs/research/competitor-*.md` × 10
> **타깃 산출:** 45개 신규 마케팅 페이지 (alternative 10 + vs-매트릭스 15 + 블로그 11 + 인덱스 1 + 기존 확장 8)
> **본 명세의 범위:** 페이지 유형별 레이아웃 / 신규 컴포넌트 / 시각 톤 / 반응형 / CTA / a11y. 카피 자체는 마케터 산출물 참조.

---

## 0. 디자인 결정의 큰 그림

본 작업은 **UI 가이드의 마케팅 톤 (Dark slate-900 캔버스 + 흰 콘텐츠 섹션 + indigo 액센트)** 을 그대로 따른다. 기존 `/compare/:competitor` 페이지가 이미 이 패턴을 70% 정도 구현하고 있으므로, 본 spec 의 핵심은:

1. **재사용 우선** — 기존 비교 표, 키 디퍼런스 카드, FAQ, CTA 섹션을 그대로 또는 변형으로 사용
2. **신규 컴포넌트 4종** — Alternative 페이지 / vs-매트릭스 페이지에서 필요한 만큼만 신규
3. **레이아웃 일관성** — `max-w-4xl mx-auto` 기준 너비, `py-20 px-4` 섹션 패딩, indigo-500 액센트
4. **콘텐츠 차별화** — H1/intro 문구는 데이터 파일에서 주입 (UI 컴포넌트는 동일, 데이터로 변주)

### 디자인 원칙 (Testably UX 4종)

| 원칙 | 본 spec 에서의 적용 |
|------|-------------------|
| **Speed First** | 모든 페이지 첫 화면에 CTA 노출. 비교 표는 `overflow-x-auto` 로 모바일에서도 즉시 스캔 가능 |
| **Keyboard First** | 마케팅 페이지는 키보드 단축키 적용 대상 아님. 단, anchor 점프 (`#features`, `#pricing`) 는 `<a>` 로 제공 |
| **Distraction-free** | 모달/팝업 없음. 일러스트 없음. 콘텐츠 중심 |
| **Consistent** | 기존 `/compare/testrail` 의 시각 톤과 100% 일치. 신규 페이지가 별개 사이트처럼 보이지 않도록 |

---

## 1. 페이지 유형별 레이아웃 명세

### 1.1 `/alternatives/{slug}` — Alternative 페이지 (M2 산출, 10개)

#### 1.1.1 페이지 전체 구조 (ASCII 와이어프레임)

```
┌─────────────────────────────── MarketingHeader (기존) ───┐
│                                                          │
├─ SECTION A: Hero (bg-slate-900) ────────────────── h:88vh┤
│                                                          │
│   [tiny pill: "Alternative · Indigo-400"]                │
│                                                          │
│   <H1> The Best TestRail Alternative for 2026 </H1>      │
│        (text-4xl md:text-6xl font-extrabold white)       │
│                                                          │
│   <subhead> 2~3 sentences slate-400 max-w-2xl </subhead> │
│                                                          │
│   ┌──── Pricing Savings Callout (indigo glass) ────┐     │
│   │  Save $3,420/yr vs TestRail's per-seat pricing │     │
│   └────────────────────────────────────────────────┘     │
│                                                          │
│   [ Start free trial ]  [ Compare pricing → ]            │
│   (indigo-500 glow)     (ghost border-white/10)          │
│                                                          │
├─ SECTION B: "Why developers leave {X}" (bg-white) ───────┤
│                                                          │
│   <H2 center> Why Teams Are Leaving TestRail </H2>       │
│   <sub center> The 4 pain points that drive switches</sub>│
│                                                          │
│   ┌── KeyDifferenceCard ──┐  ┌── KeyDifferenceCard ──┐   │
│   │ 01 · Per-seat pricing  │  │ 02 · Legacy UI         │   │
│   │ explodes at scale      │  │ slows your team        │   │
│   │ (body, slate-600)      │  │                        │   │
│   └────────────────────────┘  └────────────────────────┘   │
│   ┌── KeyDifferenceCard ──┐  ┌── KeyDifferenceCard ──┐   │
│   │ 03 · No AI features    │  │ 04 · Migration trap    │   │
│   └────────────────────────┘  └────────────────────────┘   │
│                                                          │
├─ SECTION C: "Why Testably wins" (bg-slate-900) ──────────┤
│                                                          │
│   Same KeyDifferenceCard grid but dark variant,          │
│   indigo numbers (01 · 02 · 03 · 04)                     │
│                                                          │
├─ SECTION D: Feature Comparison Table (bg-white) ─────────┤
│                                                          │
│   <H2 center> Feature Comparison </H2>                   │
│   <sub center> Testably vs TestRail, side by side </sub> │
│                                                          │
│   ┌── ComparisonTable (재사용, 2-col) ──────────────┐    │
│   │ Feature              │ Testably ✓  │ TestRail ✗ │    │
│   │ ──────────────────── │ ─────────── │ ───────── │    │
│   │ Free plan            │     ✓       │     ✗      │    │
│   │ Per-seat pricing     │     Flat    │     $36/u  │    │
│   │ ...                  │             │            │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
├─ SECTION E: Pricing Comparison (bg-gray-50) ─────────────┤
│                                                          │
│   Same as /compare/{slug} pricing table 패턴 재사용      │
│                                                          │
├─ SECTION F: Migration Guide (bg-white) ──────────────────┤
│                                                          │
│   <H2 center> Switch in Under 30 Minutes </H2>           │
│                                                          │
│   ┌────────────────────────────────────────────────┐    │
│   │  01 → Export your TestRail CSV                  │    │
│   │  02 → Upload to Testably (auto-mapped fields)   │    │
│   │  03 → Verify counts, kick off your first run    │    │
│   └────────────────────────────────────────────────┘    │
│                                                          │
│   Field Mapping Table (optional, collapsible)            │
│                                                          │
├─ SECTION G: FAQ (bg-white) ──────────────────────────────┤
│                                                          │
│   <FaqSection> (기존 패턴, JSON-LD FAQPage 함께 출력)    │
│                                                          │
├─ SECTION H: Bottom CTA (bg-slate-900) ───────────────────┤
│                                                          │
│   <H2 white> Ready to leave TestRail? </H2>              │
│   [ Get started free ]  [ See all alternatives → ]       │
│                                                          │
└─ MarketingFooter (기존) ─────────────────────────────────┘
```

#### 1.1.2 기준 너비 / 간격

| 요소 | 값 | 근거 |
|------|----|----|
| 메인 컨테이너 | `max-w-4xl mx-auto px-4` | 기존 `/compare/:competitor` 와 동일 |
| Hero 컨테이너 | `max-w-4xl mx-auto text-center` | 좁고 중앙 정렬, 가독성 우선 |
| 섹션 패딩 | `py-20 px-4` | 기존 패턴 |
| Hero 패딩 | `py-32 px-4` (lg), `pt-32 pb-20` (mobile) | 기존 인덱스 패턴 |
| 카드 간 gap | `gap-6` (md:grid-cols-2) | KeyDifference 그리드 |
| 최소 모바일 너비 | 360px | iPhone SE 기준 |

#### 1.1.3 섹션별 컴포넌트 + 데이터 바인딩

| 섹션 | 컴포넌트 | 데이터 소스 (CompetitorData) |
|------|---------|------------------------------|
| A. Hero | `<AlternativeHero>` (신규) | `alternativePageData.h1`, `subhead`, `savingsCallout` |
| B. Why Leave | `<KeyDifferenceCard variant="light">` × N (신규, 다크/라이트 토글) | `alternativePageData.whyLeave[]` |
| C. Why Testably | `<KeyDifferenceCard variant="dark">` × N | `alternativePageData.whySwitch[]` |
| D. Feature Table | `<ComparisonTable variant="two-col">` (기존 패턴 컴포넌트화) | `features[]` |
| E. Pricing Table | 동일 (variant="two-col") | `pricingRows[]` |
| F. Migration | `<MigrationGuide>` (신규) | `migrationGuide.steps[]`, `fieldMapping[]` |
| G. FAQ | `<FaqSection>` (신규, JSON-LD 함께 렌더) | `alternativePageData.faqs ?? faqs` |
| H. Bottom CTA | `<BottomCTA>` (기존 패턴 컴포넌트화) | `ctaText`, `ctaSubtext` |

---

### 1.2 `/compare/{a}-vs-{b}` — vs-매트릭스 페이지 (M3 산출, 15개)

#### 1.2.1 톤 차이 (alternative 와의 핵심 차이)

- **중립 시작 → Testably 우위로 클로징**: 처음에는 A vs B 를 공정하게 비교하다가 마지막 섹션에서 "둘 다 한계 → Testably 가 제3의 답" 으로 마무리
- **Testably 자기참조 모드를 두 단계로 분리**: Hero/매트릭스에서는 Testably 가 비교 대상의 "third option" 으로 살짝 노출, 결론 섹션에서 본격 추천
- **사용자 의도 (commercial-investigation)** 와 일치: "지금 A 와 B 중에 고민 중" 인 유저에게 "둘 다 보고 마지막에 우리 옵션도 봐달라" 는 매너 있는 톤

#### 1.2.2 페이지 전체 구조

```
┌─ MarketingHeader ─────────────────────────────────────────┐
│                                                            │
├─ SECTION A: VsHero (bg-slate-900) ─── h:72vh ─────────────┤
│                                                            │
│   [tiny pill: "Tool Comparison · Indigo-400"]              │
│                                                            │
│   <H1> TestRail vs Zephyr Scale (2026) </H1>               │
│        (text-4xl md:text-6xl)                              │
│                                                            │
│   <subhead> Pricing, features, and the alternative         │
│              most teams pick instead. </subhead>           │
│                                                            │
│   ┌──── Versus Cards (2-col grid, gap-4) ────────────┐    │
│   │  ┌─ A Card ────────┐    ┌─ B Card ────────┐      │    │
│   │  │ [icon] TestRail │    │ [icon] Zephyr   │      │    │
│   │  │ from $36/u/mo   │    │ from $10/u/mo   │      │    │
│   │  │ Established     │    │ Jira-native     │      │    │
│   │  │ Per-seat trap   │    │ Jira lock-in    │      │    │
│   │  └─────────────────┘    └─────────────────┘      │    │
│   │              (with center "vs" badge in between) │    │
│   └─────────────────────────────────────────────────┘    │
│                                                            │
│   <intro paragraph slate-400 max-w-2xl center>             │
│      vsMatrixData.introBody, 200+ words for SEO            │
│                                                            │
├─ SECTION B: 3-way Feature Matrix (bg-white) ──────────────┤
│                                                            │
│   <H2> At a Glance: Feature Comparison </H2>               │
│                                                            │
│   ┌─ <ComparisonTable variant="three-col"> ─────────┐     │
│   │ Feature       │ Testably │ TestRail │ Zephyr    │     │
│   │ ──────────────│──────────│──────────│───────────│     │
│   │ Free plan     │    ✓     │    ✗     │    ✗      │     │
│   │ Per-seat      │   Flat   │  $36/u   │  $10/u    │     │
│   │ ...           │          │          │           │     │
│   └─────────────────────────────────────────────────┘     │
│   (Testably 컬럼 indigo-50/30 배경, ✓ indigo-500)         │
│                                                            │
├─ SECTION C: 3-way Pricing Matrix (bg-gray-50) ────────────┤
│                                                            │
│   Same table layout, pricingMatrix data                    │
│   Each cell: price (bold) + detail (gray-500 xs)           │
│                                                            │
├─ SECTION D: "Both Have Limitations" (bg-white) ───────────┤
│                                                            │
│   <H2 center> Both TestRail and Zephyr Have Real Gaps </H2>│
│                                                            │
│   ┌── LimitationCard A ────┐  ┌── LimitationCard B ────┐ │
│   │ [TestRail logo small]   │  │ [Zephyr logo small]    │ │
│   │ Per-seat fees climb     │  │ No standalone option   │ │
│   │ Body (slate-600 ...)    │  │ Body                   │ │
│   └─────────────────────────┘  └────────────────────────┘ │
│   ... (bothLimitations array drives count)                 │
│                                                            │
├─ SECTION E: "Why Testably Wins" (bg-slate-900) ───────────┤
│                                                            │
│   <H2 white center> Why Teams Skip Both and Pick           │
│                     Testably </H2>                         │
│                                                            │
│   3~5 KeyDifferenceCard (dark variant), indigo 01·02·03   │
│   from vsMatrixData.testablyWins[]                         │
│                                                            │
│   [ Compare Testably to TestRail → ]                       │
│   [ Compare Testably to Zephyr → ]                         │
│   (small ghost buttons linking to /compare/{a}, /compare/{b}) │
│                                                            │
├─ SECTION F: FAQ (bg-white) ───────────────────────────────┤
│                                                            │
│   <FaqSection> with vsMatrixData.faqs                      │
│                                                            │
├─ SECTION G: Bottom CTA (gradient indigo→violet) ──────────┤
│                                                            │
│   <H2 white> Don't pick between two compromises </H2>      │
│   [ Start Testably free → ]                                │
│                                                            │
└─ MarketingFooter ─────────────────────────────────────────┘
```

#### 1.2.3 VsHero 양측 카드 (Hero 핵심 시각 요소)

```
┌─── Versus Cards layout ──────────────────────────────────┐
│                                                           │
│  ┌─ Left Card (A) ─────┐    ┌─ Right Card (B) ─────┐    │
│  │                      │    │                      │    │
│  │   [icon 48px circle] │    │   [icon 48px circle] │    │
│  │   ri-flask-line      │    │   ri-scales-3-line   │    │
│  │   (bg-white/[0.06])  │    │   (bg-white/[0.06])  │    │
│  │                      │    │                      │    │
│  │   TestRail           │    │   Zephyr Scale       │    │
│  │   text-xl font-bold  │    │   text-xl font-bold  │    │
│  │   text-white         │    │   text-white         │    │
│  │                      │    │                      │    │
│  │   $36/user/month     │    │   $10/user/month     │    │
│  │   text-slate-400 sm  │    │   text-slate-400 sm  │    │
│  │                      │    │                      │    │
│  │   • Established      │    │   • Jira-native      │    │
│  │   • Per-seat fees    │    │   • Jira required    │    │
│  │   (text-slate-300 xs)│    │                      │    │
│  └──────────────────────┘    └──────────────────────┘    │
│                                                           │
│            ┌── "vs" badge between cards ──┐              │
│            │  (absolute pos, indigo-500)  │              │
│            │  w-12 h-12 rounded-full      │              │
│            └──────────────────────────────┘              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|---------|
| Card 컨테이너 | `bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm` |
| 그리드 | `grid grid-cols-1 md:grid-cols-2 gap-4 relative max-w-2xl mx-auto` |
| "vs" badge | `absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.5)] z-10` (md: visible, sm: hidden 또는 cards 사이 인라인 표시) |
| Icon circle | `w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center mb-4` |
| Name | `text-xl font-bold text-white mb-1` |
| Pricing label | `text-sm text-slate-400 mb-3` |
| Bullet | `text-xs text-slate-300 flex items-start gap-1.5` + `<i class="ri-circle-fill text-indigo-400 text-[6px] mt-1.5">` |

---

### 1.3 `/blog/{slug}-alternatives-2026` — 블로그 (M4 산출, 11편)

#### 1.3.1 결정: 기존 `choosing-test-management-tool` 패턴 미러

본 spec 에서는 **블로그 컴포넌트를 신규로 만들지 않는다**. 기존 `src/pages/blog/choosing-test-management-tool/page.tsx` 의 JSX 구조를 그대로 카피하여 11편 페이지를 생성. 카피와 데이터(toolSummary, criteria 배열)만 새로 작성.

**사유:**
- 블로그 패턴은 이미 2개 페이지(`choosing-test-management-tool`, `playwright-reporter-ci-integration`)에서 검증됨
- 디자인 일관성: 11편이 동일 톤이면 사이트 전반의 SEO 신호가 강화됨
- 개발 부담 최소화: 신규 컴포넌트 0개

#### 1.3.2 페이지 구조 (기존 패턴 그대로)

```
┌─ MarketingHeader ─────────────────────────────────────────┐
│                                                            │
├─ SECTION A: Hero (bg-slate-900) ──────────────────────────┤
│   [breadcrumb: ← Back to blog]                             │
│   [tag pills: "Alternatives · 2026 · 8 min read"]          │
│   <H1> Best TestRail Alternatives in 2026: 5 Tools         │
│        Compared </H1>                                      │
│   <publish date: 2026-05-XX · author>                      │
├─ SECTION B: Table of Contents (sticky on lg) ─────────────┤
├─ SECTION C: Intro paragraph (bg-white, 2-3 paragraphs) ───┤
├─ SECTION D: Ranking List ─────────────────────────────────┤
│   ┌── Ranked Card 1 (Testably, 강조) ───────────────────┐ │
│   │  #1  Testably                           [icon]      │ │
│   │  Best for: Modern QA teams                          │ │
│   │  Pricing: Free / $19+                               │ │
│   │  Pros: …                                            │ │
│   │  Cons: …                                            │ │
│   │  [Try free →]                                       │ │
│   └─────────────────────────────────────────────────────┘ │
│   ┌── Ranked Card 2 (경쟁사) ────────────────────────────┐ │
│   │  #2  TestRail (the one this article is about)       │ │
│   │  ...                                                │ │
│   └─────────────────────────────────────────────────────┘ │
│   (반복, 5 ranked cards)                                  │
├─ SECTION E: Comparison Summary Table ─────────────────────┤
│   기존 toolSummary table 패턴 재사용                       │
├─ SECTION F: Conclusion + CTA ─────────────────────────────┤
│   <H2> Bottom line </H2>                                   │
│   <Why Testably is #1>                                     │
│   [ Start Testably free → ]                                │
├─ SECTION G: Related Reads (선택, 3개 카드) ────────────────┤
└─ MarketingFooter ─────────────────────────────────────────┘
```

#### 1.3.3 `best-test-management-tools-2026` (종합 랭킹 1편)의 차이

- Ranked Card 가 5 → 10 (모든 경쟁사 + Testably)
- 인트로가 "single-vendor 비교"가 아닌 "전체 시장 개관" 톤
- TOC 가 더 길고 sticky 우선순위 높음 (스크롤 분량 ↑)
- 끝에 "Choose by use case" 의사결정 가이드 섹션 1개 추가:
  - "Best for budget" → Testably
  - "Best for Jira-first teams" → Zephyr
  - "Best for open source" → Kiwi TCMS
  - 등 6개 한 줄 추천

---

### 1.4 기존 `/compare/{slug}` 확장 (7개 신규 + 3개 보강)

#### 1.4.1 결정: 페이지 컴포넌트 변경 없음

기존 `src/pages/compare/page.tsx` 의 JSX 와 시각 톤은 **0건 변경**. 데이터 파일(`src/data/competitors/<slug>.ts`)만 신규 7개 추가하면 자동으로 동일 디자인의 페이지가 7개 더 생성된다.

#### 1.4.2 기존 페이지에 옵셔널 섹션 추가 (alternativePageData 활용 X)

`/compare/{slug}` 페이지는 **기존 그대로 유지**. `alternativePageData`, `migrationGuide` 신규 필드는 `/alternatives/{slug}` 페이지에서만 사용한다.

> **이유:** `/compare` 와 `/alternatives` 의 콘텐츠가 완전히 같으면 Google duplicate content 패널티 가능. 두 URL 의 H1/intro/구조를 명확히 다르게 유지하여 검색 의도별로 분리한다.
>   - `/compare/{slug}` = "Testably vs {X}" (1:1 비교 톤)
>   - `/alternatives/{slug}` = "{X} 대신 어떤 도구를 골라야 하나" (탐색 톤)

#### 1.4.3 `/compare` 인덱스 페이지 확장

- 카드 3개 → 10개 (3-column grid, 4번째 row 부터 자연스럽게 wrap)
- Feature matrix 4-col (Testably + 3) → **6-col 압축** (Testably + Top 5 경쟁사: TestRail, Zephyr, Qase, Xray, PractiTest). 가로 스크롤 허용.
- 신규 섹션: "Compare any two tools" — vs-매트릭스 15개의 링크 그리드 (3x5)

```
┌── 신규 섹션: Cross-comparison links ────────────────────┐
│  <H2> Compare any two tools head-to-head </H2>           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  TestRail vs Zephyr  |  TestRail vs Qase        │    │
│  │  TestRail vs Xray    |  TestRail vs PractiTest  │    │
│  │  Zephyr vs Qase      |  ... (15 links total)    │    │
│  └─────────────────────────────────────────────────┘    │
│  Each link → /compare/{a}-vs-{b}                         │
└──────────────────────────────────────────────────────────┘
```

---

### 1.5 `/alternatives` 인덱스 페이지 (M2 산출, 1개)

`/compare` 인덱스 패턴 미러. 단 톤이 다르다.

| 요소 | `/compare` | `/alternatives` |
|------|-----------|-----------------|
| H1 | "Testably vs. The Rest" | "Looking for an Alternative to Your QA Tool?" |
| Pill | "Alternatives" | "Switch Made Easy" |
| 카드 톤 | "Testably vs. TestRail" | "Switch from TestRail → Testably" |
| Feature matrix | 6-col | 동일 (또는 생략 — `/compare` 에 더 적합) |
| 추가 섹션 | Cross-comparison 링크 | "Migration in 30 minutes" 설명 1개 |

---

## 2. 컴포넌트 재사용 매트릭스

### 2.1 재사용 / 변형 / 신규 분류

| 컴포넌트 | `/alternatives/{slug}` | `/compare/{a}-vs-{b}` | 블로그 11편 | 기존 `/compare/{slug}` |
|---------|----------------------|----------------------|------------|----------------------|
| `MarketingLayout` | 재사용 | 재사용 | 재사용(부분) | 재사용 (현재 그대로) |
| `MarketingHeader` | 재사용 | 재사용 | 재사용 | 재사용 |
| `MarketingFooter` | 재사용 | 재사용 | 재사용 | 재사용 |
| `MarketingCTA` (기본 풋터) | 재사용 (showCTA prop) | 재사용 | 재사용 | 재사용 |
| `SEOHead` | 재사용 (5/13 absolute URL 픽스 반영됨) | 재사용 | 재사용 | 재사용 |
| Hero 카드 | **신규** `<AlternativeHero>` | **신규** `<VsHero>` | 재사용 (블로그 hero) | 기존 유지 |
| 비교 표 (2-col) | **컴포넌트화 재사용** `<ComparisonTable>` | — | — | 기존 JSX 그대로 |
| 비교 표 (3-col) | — | **변형** `<ComparisonTable variant="three-col">` | — | — |
| KeyDifferenceCard | **신규** light/dark variant | **신규** 동일 변형 | — | 기존 키 디퍼런스 카드 JSX 그대로 |
| FAQ 섹션 | **신규** `<FaqSection>` (JSON-LD 함께) | 재사용 | — | 기존 JSX → 점진적으로 `<FaqSection>` 이관 |
| Migration Guide | **신규** `<MigrationGuide>` | — | — | — |
| 풋터 CTA | 재사용 (기존 `/compare` 의 Bottom CTA JSX) | 재사용 | 재사용 | 기존 그대로 |
| Cross-comparison 링크 그리드 | — | — | — | **신규 (인덱스 전용)** `<MatrixLinkGrid>` |
| 블로그 RankedCard | — | — | **신규** `<RankedToolCard>` | — |
| TOC sticky | — | — | 재사용 (기존 패턴) | — |

### 2.2 컴포넌트 컴포넌트화 우선순위

신규 페이지를 만들면서, 기존 `/compare/page.tsx` 의 인라인 JSX 중 **재사용 빈도가 높은 4개**를 별도 컴포넌트로 추출하여 `src/components/marketing/comparison/` 에 둔다.

```
src/components/marketing/
├── comparison/
│   ├── ComparisonTable.tsx          ← 2-col + 3-col variant
│   ├── KeyDifferenceCard.tsx        ← light + dark variant
│   ├── FaqSection.tsx               ← JSON-LD 자동 출력
│   ├── BottomCTASection.tsx         ← dark variant (slate-900)
│   ├── AlternativeHero.tsx          ← /alternatives 전용
│   ├── VsHero.tsx                   ← /compare/{a}-vs-{b} 전용
│   ├── MigrationGuide.tsx           ← /alternatives 전용
│   ├── RankedToolCard.tsx           ← 블로그 ranking 카드
│   └── MatrixLinkGrid.tsx           ← /compare 인덱스 cross-link
```

### 2.3 신규 컴포넌트 명세 (Props · Variants · State)

#### `<AlternativeHero>`

```typescript
interface AlternativeHeroProps {
  /** "Alternatives · 2026" 같은 pill 라벨. 기본값 "Alternative" */
  pillLabel?: string;
  /** Pill 좌측 Remix Icon 클래스. 기본 "ri-arrow-left-right-line" */
  pillIcon?: string;
  /** H1 텍스트 (alternativePageData.h1) */
  h1: string;
  /** Subhead 텍스트 (alternativePageData.subhead) */
  subhead: string;
  /** 가격 절감 callout. 없으면 영역 자체 숨김 */
  savingsCallout?: string;
  /** CTA 1차 텍스트 (보통 "Start free trial") */
  ctaPrimary: { label: string; href: string };
  /** CTA 2차 텍스트 (보통 "Compare pricing") */
  ctaSecondary?: { label: string; to: string };
}
```

| 상태 | 시각 변화 |
|------|---------|
| 기본 | indigo glow shadow on primary CTA |
| Hover (CTA 1차) | `bg-indigo-400` + shadow 강화 |
| Hover (CTA 2차) | `border-white/20 text-white` |
| Focus (a11y) | `ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900` |

#### `<VsHero>`

```typescript
interface VsHeroProps {
  pillLabel?: string;  // "Tool Comparison"
  h1: string;          // "TestRail vs Zephyr (2026)"
  subhead: string;
  intro: string;       // 200+ word paragraph (max-w-2xl, text-slate-400)
  competitorA: {
    name: string;
    iconClass: string;        // ri-flask-line 등
    iconColor?: string;       // bg tint
    priceLabel: string;       // "from $36/user/month"
    bullets: string[];        // 2~3 핵심 특징/단점 단문
  };
  competitorB: { /* same */ };
}
```

| 상태 | 시각 변화 |
|------|---------|
| 기본 | 양측 카드 동일 weight |
| Mobile (<768px) | "vs" badge 가 카드 사이 인라인 row 로 이동 (absolute 해제) |

#### `<KeyDifferenceCard>`

```typescript
interface KeyDifferenceCardProps {
  number?: string;           // "01" — 없으면 미표시
  title: string;
  body: string;
  /** light: 흰 배경 섹션용. dark: slate-900 섹션용 */
  variant: 'light' | 'dark';
  /** 액센트 아이콘 (선택, Remix Icon 클래스) */
  iconClass?: string;
}
```

| Variant | 컨테이너 | 텍스트 | 번호 |
|---------|---------|-------|------|
| light | `bg-white rounded-2xl border border-gray-200 p-6 shadow-sm` | `text-slate-900` H3 + `text-slate-600` body | `text-indigo-500 font-bold text-sm` |
| dark | `bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 backdrop-blur-sm` | `text-white` H3 + `text-slate-300` body | `text-indigo-400 font-bold text-sm` |

| 상태 | 시각 변화 |
|------|---------|
| Hover | `border-indigo-500/20 -translate-y-0.5` (트랜지션 0.3s) |
| Focus | `ring-2 ring-indigo-400 ring-offset-2` |

#### `<ComparisonTable>`

```typescript
interface ComparisonTableProps {
  variant: 'two-col' | 'three-col';
  /** 헤더 라벨 */
  headers: {
    feature: string;                     // "Feature"
    testably: string;                    // "Testably"
    competitor?: string;                 // 2-col: 경쟁사명
    competitorA?: string;                // 3-col: A 이름
    competitorB?: string;                // 3-col: B 이름
  };
  /** 행 데이터. 값은 boolean (true→✓, false→✗) 또는 string (그대로 표시) */
  rows: Array<
    | { feature: string; testably: boolean | string; competitor: boolean | string }
    | { feature: string; testably: boolean | string; a: boolean | string; b: boolean | string }
  >;
  /** Testably 컬럼 강조 여부. 기본 true */
  highlightTestably?: boolean;
  /** 푸터 캡션. 예: "Last updated: May 2026" */
  caption?: string;
}
```

| 요소 | Tailwind (2-col) | Tailwind (3-col) |
|------|-----------------|------------------|
| 컨테이너 | `overflow-x-auto rounded-2xl border border-gray-200 shadow-sm` | 동일 |
| `<table>` | `w-full text-sm` | `w-full text-sm` (min-w-[720px] for 3-col) |
| `<thead>` 행 | `bg-gray-50 border-b border-gray-200` | 동일 |
| Feature 헤더 | `text-left px-6 py-4 text-sm font-semibold text-gray-500 uppercase tracking-wide w-1/2` | `w-1/4` |
| Testably 헤더 | `px-6 py-4 text-center text-sm font-semibold text-indigo-700 uppercase tracking-wide` | 동일 + `bg-indigo-50/40` |
| 경쟁사 헤더 | `px-6 py-4 text-center text-sm font-semibold text-gray-500 uppercase tracking-wide` | 동일 |
| 짝수 행 | `bg-white` | 동일 |
| 홀수 행 | `bg-gray-50/50` | 동일 |
| Testably 컬럼 셀 | (강조 시) `bg-indigo-50/30` | 동일 |
| ✓ 아이콘 (Testably) | `<i class="ri-check-line text-indigo-500 text-lg">` | 동일 |
| ✓ 아이콘 (경쟁사) | `<i class="ri-check-line text-gray-400 text-base">` | 동일 |
| ✗ 아이콘 | `<i class="ri-close-line text-gray-300 text-base">` | 동일 |
| 문자열 셀 | `<span class="text-xs font-medium text-gray-600">{value}</span>` | 동일 |
| Caption | `text-center text-gray-400 text-xs mt-4` | 동일 |

#### `<MigrationGuide>`

```typescript
interface MigrationGuideProps {
  title: string;                        // "Switch from TestRail in Under 30 Minutes"
  steps: Array<{ num: number; title: string; body: string }>;
  importFormats: string[];              // ["CSV", "TestRail API"]
  fieldMapping?: Array<{
    from: string;
    to: string;
    note?: string;
  }>;
}
```

```
┌─ Steps row (3 cards horizontal on lg, stacked on sm) ─┐
│  ┌─ 01 ─────┐   ┌─ 02 ─────┐   ┌─ 03 ─────┐         │
│  │ icon     │ → │ icon     │ → │ icon     │         │
│  │ Title    │   │ Title    │   │ Title    │         │
│  │ body sm  │   │ body sm  │   │ body sm  │         │
│  └──────────┘   └──────────┘   └──────────┘         │
│                                                       │
│  ┌─ Field Mapping (collapsible <details>) ─────────┐ │
│  │ TestRail field    →    Testably field      Note │ │
│  │ ─────────────────────────────────────────────── │ │
│  │ Section            →    Folder                   │ │
│  │ Type               →    Type (Functional/...)    │ │
│  │ ...                                              │ │
│  └──────────────────────────────────────────────── │ │
└──────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|---------|
| Step 카드 | `bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex-1` |
| Step 번호 | `text-indigo-500 font-extrabold text-2xl mb-2` |
| Step 화살표 | `<i class="ri-arrow-right-line text-gray-300 text-2xl">` (hidden on sm) |
| Field mapping `<details>` | `mt-8 bg-gray-50 rounded-2xl border border-gray-200 p-6` |
| Summary | `cursor-pointer font-semibold text-slate-700 flex items-center gap-2` |

#### `<FaqSection>`

```typescript
interface FaqSectionProps {
  faqs: Array<{ question: string; answer: string }>;
  /** Section heading. 기본 "Frequently Asked Questions" */
  heading?: string;
  /** Schema.org FAQPage JSON-LD 자동 주입 여부. 기본 true */
  injectStructuredData?: boolean;
}
```

| 요소 | Tailwind |
|------|---------|
| 컨테이너 | `max-w-3xl mx-auto` |
| H2 | `text-3xl font-bold text-gray-900 text-center mb-12` |
| 각 FAQ 행 | `border-b border-gray-200 pb-6` |
| Question | `text-base font-semibold text-gray-900 mb-2` |
| Answer | `text-gray-600 text-sm leading-relaxed` |

JSON-LD 는 `useEffect` 로 `<script type="application/ld+json">` 을 head 에 주입 (기존 `/compare/page.tsx` 패턴 그대로).

#### `<MatrixLinkGrid>` (compare 인덱스 신규 섹션)

```typescript
interface MatrixLinkGridProps {
  /** vs-매트릭스 슬러그 배열 */
  matchups: Array<{ a: string; b: string; aName: string; bName: string }>;
}
```

```
┌─── Grid 5x3 on lg, 2-col on md, 1-col on sm ────────┐
│  ┌─ Link Tile ──────────────────────────────────┐  │
│  │  [aIcon] TestRail  vs  Zephyr  [bIcon]   →  │  │
│  │  text-sm font-medium                          │  │
│  └───────────────────────────────────────────────┘  │
│  (15 tiles total, gap-3)                            │
└──────────────────────────────────────────────────────┘
```

| 요소 | Tailwind |
|------|---------|
| Grid | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3` |
| Link Tile | `flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-indigo-200 hover:shadow-sm transition-all` |
| Tool name | `text-sm font-medium text-gray-700` |
| "vs" separator | `text-xs text-gray-400` |
| Arrow icon | `<i class="ri-arrow-right-s-line text-indigo-500">` |

#### `<RankedToolCard>` (블로그)

```typescript
interface RankedToolCardProps {
  rank: number;
  tool: {
    name: string;
    logo?: string;
    bestFor: string;
    pricing: string;
    pros: string[];
    cons: string[];
    cta?: { label: string; href: string };
    /** Testably 인 경우 강조 */
    isTestably?: boolean;
  };
}
```

| variant | 컨테이너 |
|---------|---------|
| 기본 | `bg-white rounded-2xl border border-gray-200 p-6 lg:p-8` |
| Testably (#1) | 위 + `border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-md` + 우상단 "Editor's Pick" badge |

---

## 3. 상태별 화면

### 3.1 정상 상태

위 1-2 섹션 그대로.

### 3.2 빈 상태 (Empty State)

본 페이지들은 **모두 정적 데이터** 이므로 "데이터 없음" 상태가 발생하지 않는다. 단 다음 케이스를 처리:

| 케이스 | 화면 처리 |
|--------|---------|
| `alternativePageData` 미정의 슬러그를 `/alternatives/{slug}` 로 접근 | NotFound (3.4 참조) |
| `migrationGuide` 미정의 | 섹션 F (Migration) 자체를 렌더 안 함 (graceful) |
| `faqs` 빈 배열 | 섹션 G (FAQ) 자체를 렌더 안 함 |
| `savingsCallout` 빈 문자열 | Hero 의 callout 카드 영역 자체를 숨김 |
| 비교 표 rows 가 5개 미만 | 그대로 렌더 (5행 미만이어도 디자인 깨지지 않음) |

### 3.3 로딩 상태 (Loading State)

본 페이지들은 **모두 prerender 된 정적 HTML** → 초기 로딩은 즉시. SPA 라우팅 시 데이터 import 가 동기 → loading state 별도 필요 없음.

단, 페이지 전환 직후 Fragment hydration 단계 (~50ms) 에서 깜빡임 방지를 위해 `MarketingLayout` 의 `className` prop 으로 `min-h-screen` 강제.

### 3.4 에러 상태 — NotFound

```
┌── NotFound 화면 (기존 패턴 그대로) ───────────────────┐
│                                                       │
│   min-h-screen flex items-center justify-center       │
│   bg-gray-50                                          │
│                                                       │
│   <H1> Page not found </H1>                          │
│   text-3xl font-bold text-gray-900                    │
│                                                       │
│   <p> This comparison page doesn't exist yet. </p>    │
│   text-gray-500                                       │
│                                                       │
│   [ ← Back to home ]   [ See all alternatives ]      │
│   indigo-600 link      indigo-600 link               │
│                                                       │
│   <meta name="robots" content="noindex"> 주입         │
│                                                       │
└───────────────────────────────────────────────────────┘
```

| 케이스 | 페이지 컴포넌트 처리 |
|--------|-------------------|
| `/compare/foo` (등록 안 된 슬러그) | `COMPETITORS[foo] === undefined` → NotFound + `noindex` |
| `/alternatives/foo` | 동일 |
| `/compare/foo-vs-bar` (vs-매트릭스 미등록) | `vsMatrixData['foo-vs-bar'] === undefined` → NotFound |
| `/compare/zephyr-vs-testrail` (잘못된 정렬 순) | `<Navigate to="/compare/testrail-vs-zephyr" replace />` (301 의미) |
| `/alternatives/{slug}` 인데 `alternativePageData` 없음 | NotFound (graceful 차단 — 데이터 미준비 페이지 노출 방지) |

> **a11y:** NotFound 페이지의 `<h1>` 은 항상 페이지에 존재해야 한다 (screen reader 신호 + 검색엔진 신호).

### 3.5 제한 도달 (Plan Limit)

본 작업은 **마케팅 페이지** → 플랜 제한 무관. **N/A**.

---

## 4. 인터랙션

### 4.1 기본 인터랙션

| 트리거 | 동작 | 애니메이션 |
|--------|------|----------|
| CTA 클릭 ("Start free trial") | `https://app.testably.io/signup` 새 탭 또는 same-tab (기존 패턴 follow) | active:scale-[0.98] |
| 보조 CTA ("Compare pricing") 클릭 | `<Link to="/pricing">` 내부 라우팅 | - |
| KeyDifferenceCard 호버 | `-translate-y-0.5 border-indigo-500/20` | 300ms cubic-bezier(0.16, 1, 0.3, 1) |
| Migration Guide field mapping `<details>` 클릭 | 펼침/접힘 | 브라우저 기본 |
| FAQ 아이템 (현재는 펼침 없음, 전체 노출) | - | - |
| 비교 표 모바일 가로 스크롤 | `overflow-x-auto` 자연 스크롤 | - |
| Cross-comparison 링크 호버 | `border-indigo-200 shadow-sm` | 200ms |
| Versus 카드 호버 | (현재는 호버 효과 없음 — 단순 표시) | - |
| `/alternatives` 인덱스 카드 호버 | `-translate-y-1 hover:border-indigo-200 hover:shadow-lg` | 500ms cubic-bezier(0.16, 1, 0.3, 1) (기존 패턴) |

### 4.2 키보드 단축키

| 단축키 | 동작 | 조건 |
|--------|------|------|
| `Tab` | 포커스 이동 (Header → Hero CTA → secondary → 본문 링크 순) | 모든 페이지 |
| `Enter` | 포커스된 링크/버튼 활성화 | 표준 |
| `Esc` | (현재는 모달 없음 → 동작 없음) | — |

> 마케팅 페이지는 product 페이지가 아니므로 Cmd+K / G-chord 등 product 단축키 대상 아님.

### 4.3 토스트 메시지

본 페이지에서 **토스트 발생 시나리오 없음**. 모든 CTA 는 외부 URL 또는 내부 라우팅으로 즉시 이동. 폼/모달 인터랙션 없음.

> **단 예외:** 향후 "Subscribe to QA newsletter" 같은 모듈을 추가하면 별도 spec.

---

## 5. 반응형 (모바일 우선)

### 5.1 브레이크포인트별 변경점

| 브레이크포인트 | 너비 | 변경점 |
|--------------|------|--------|
| `sm` | < 640px | 모든 grid → 1-col, Hero H1 `text-4xl`, CTA 버튼 stack (column), 비교 표 가로 스크롤, "vs" badge 인라인 |
| `md` | 640~767px | KeyDifference 2-col, Migration steps 그대로 stack, vs-매트릭스 표 가로 스크롤 유지 |
| `md+` | 768~1023px | KeyDifference 2-col, Versus 카드 2-col, Migration steps 3-col |
| `lg` | 1024~1279px | 모든 grid 기본 (KD 2-col, 인덱스 카드 3-col, Cross-link 3-col) |
| `xl` | ≥ 1280px | Hero H1 `text-6xl`, max-w-4xl/5xl 컨테이너 그대로 |

### 5.2 페이지 유형별 모바일 (<640px) 특이사항

#### `/alternatives/{slug}` 모바일

```
┌──────────────────────────────┐
│  [pill]                       │
│                              │
│  H1 (text-4xl, 좌측 정렬)     │
│                              │
│  Subhead (text-base)         │
│                              │
│  ┌─ Savings callout ──────┐  │
│  │ full width             │  │
│  └────────────────────────┘  │
│                              │
│  [ Start free (full width) ] │
│  [ Compare pricing (full)  ] │
│                              │
│  ─────── Section B ────────  │
│  KD card 1 (full width)      │
│  KD card 2                   │
│  KD card 3                   │
│  KD card 4                   │
│                              │
│  ─── Comparison Table ────   │
│  ← (가로 스크롤) →            │
│  [Feature | Testably | TR]   │
└──────────────────────────────┘
```

#### `/compare/{a}-vs-{b}` 모바일 — Versus 카드 처리

```
┌──────────────────────────────┐
│  [pill]  H1                  │
│  Subhead                     │
│                              │
│  ┌─ Card A ─────────────────┐│
│  │  TestRail                ││
│  │  ...                     ││
│  └──────────────────────────┘│
│                              │
│       ┌── "vs" badge ──┐     │
│       │ (인라인 row)    │     │
│       └─────────────────┘     │
│                              │
│  ┌─ Card B ─────────────────┐│
│  │  Zephyr                  ││
│  │  ...                     ││
│  └──────────────────────────┘│
│                              │
│  Intro paragraph             │
│                              │
│  3-way table 가로 스크롤     │
└──────────────────────────────┘
```

- `<VsHero>` 의 "vs" badge: `md:absolute md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2` → `sm:static sm:my-3 sm:mx-auto`

#### 비교 표 모바일 처리 결정

**옵션 A (선택):** `overflow-x-auto` 가로 스크롤
- **사유:** 카드 변환은 3-way (Testably/A/B) 의 시각적 비교 가치를 해친다. 가로 스크롤이 비교 표의 본질을 보존.
- 모바일에서 첫 컬럼 (Feature) 만 `sticky left-0 bg-white z-10` 으로 고정. 사용자가 가로 스크롤하면서도 어떤 feature 인지 알 수 있음.

```css
/* Sticky first column on mobile */
@media (max-width: 767px) {
  table th:first-child,
  table td:first-child {
    position: sticky;
    left: 0;
    background: var(--row-bg, #fff);
    z-index: 1;
  }
}
```

**옵션 B (탈락):** 카드 변환
- 모바일에서 각 행을 카드로 변환 (Testably / A / B 가 한 카드 안에 stack)
- 탈락 사유: scan 시간 증가, A vs B 동시 비교 어려움. SEO 시그널 약화 (`<table>` semantic 손실).

---

## 6. 다크모드 색상 매핑

본 페이지들은 **마케팅 페이지 → 다크/라이트 토글 없음**. 단, 섹션 안에서 **slate-900 다크 캔버스 섹션** 과 **흰 콘텐츠 섹션** 이 교차하므로 양쪽 톤 모두 명시.

### 6.1 Light 섹션 (bg-white / bg-gray-50)

| 요소 | Tailwind |
|------|---------|
| 페이지 배경 | `bg-white` |
| 보조 섹션 배경 | `bg-gray-50` |
| 카드 배경 | `bg-white` |
| 카드 보더 | `border-gray-200` |
| H1 / H2 | `text-gray-900` |
| Body 텍스트 | `text-gray-600` |
| 보조 텍스트 (캡션 등) | `text-gray-400` |
| Primary CTA | `bg-indigo-500 text-white hover:bg-indigo-400` |
| Ghost 버튼 | `border-gray-300 text-gray-700 hover:border-gray-400` |
| 강조 (Testably 컬럼) | `bg-indigo-50/40 text-indigo-700` |

### 6.2 Dark 섹션 (bg-slate-900)

| 요소 | Tailwind |
|------|---------|
| 섹션 배경 | `bg-slate-900` (또는 `bg-gray-900`) |
| 카드 배경 | `bg-white/[0.04] backdrop-blur-sm` |
| 카드 보더 | `border-white/[0.08]` |
| 카드 호버 보더 | `hover:border-indigo-500/20` |
| H1 / H2 | `text-white` |
| Body 텍스트 | `text-slate-300` |
| 보조 텍스트 | `text-slate-400` |
| Primary CTA | `bg-indigo-500 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:bg-indigo-400 hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]` |
| Ghost 버튼 | `border-white/10 text-white/80 hover:border-white/20 hover:text-white` |
| Pill (Hero) | `bg-white/[0.06] border-white/[0.08] text-indigo-300/90` |

### 6.3 섹션 교차 패턴 (alternative 페이지 기준)

```
Hero       (slate-900)
↓
Why Leave  (white)
↓
Why Switch (slate-900)        ← 다크 다시 등장으로 시각 리듬
↓
Feature    (white)
↓
Pricing    (gray-50)
↓
Migration  (white)
↓
FAQ        (white)
↓
Bottom CTA (slate-900)        ← 닫힘
```

---

## 7. 기존 컴포넌트 재사용 목록

### 7.1 재사용 (수정 없이)

| 컴포넌트 | 위치 | 용도 | 본 작업에서의 변경 |
|---------|------|------|------------------|
| `MarketingLayout` | `src/components/marketing/MarketingLayout.tsx` | 페이지 래퍼 (Head + Header + Main + CTA + Footer) | 변경 없음 |
| `MarketingHeader` | 동일 | 상단 GNB | 변경 없음 |
| `MarketingFooter` | 동일 | 푸터 | 변경 없음 |
| `MarketingCTA` | 동일 | 기본 풋터 CTA (indigo→violet 그라데이션) | 변경 없음. 일부 페이지에서 `showCTA={false}` 로 끄고 자체 Bottom CTA 사용 |
| `SEOHead` | `src/components/SEOHead.tsx` | 메타 태그 출력 | 변경 없음 (5/13 absolute URL 픽스 반영됨) |
| Remix Icon (`<i class="ri-*">`) | CDN | 아이콘 | 변경 없음 |

### 7.2 기존 JSX → 컴포넌트화 (M2 시작 전 리팩토링 권장)

| 기존 JSX 위치 | 컴포넌트화 결과 | 변경 정도 |
|---------------|---------------|----------|
| `src/pages/compare/page.tsx` Feature Table 섹션 | `<ComparisonTable variant="two-col">` | 추출만, 시각 변경 0 |
| `src/pages/compare/page.tsx` Pricing Table 섹션 | 동일 컴포넌트 (pricingRows 데이터) | 동일 |
| `src/pages/compare/page.tsx` Key Differences 섹션 | `<KeyDifferenceCard variant="light">` × N | 추출만 |
| `src/pages/compare/page.tsx` FAQ 섹션 | `<FaqSection>` (JSON-LD 함께 처리) | JSON-LD 로직도 같이 이관 |
| `src/pages/compare/page.tsx` Bottom CTA (slate-900) | `<BottomCTASection variant="dark">` | 추출만 |

> **결정 사유:** 컴포넌트화는 신규 페이지 5개+에서 동일 JSX 가 반복되는 것을 막기 위한 사전 정리. 기능 변경 없이 분리만 한다. 기존 `/compare/{slug}` 페이지의 시각은 **0건 변경**.

### 7.3 신규 생성 (앞 §2.2 와 동일)

| 컴포넌트 | 사용처 |
|---------|-------|
| `<AlternativeHero>` | `/alternatives/{slug}` Hero |
| `<VsHero>` | `/compare/{a}-vs-{b}` Hero |
| `<MigrationGuide>` | `/alternatives/{slug}` Section F |
| `<MatrixLinkGrid>` | `/compare` 인덱스 새 섹션 |
| `<RankedToolCard>` | 블로그 11편 |

위 5개 외에 §7.2 의 5개 컴포넌트화 산출물 합쳐서 총 10개 컴포넌트가 `src/components/marketing/comparison/` 에 자리.

---

## 8. 콘텐츠 고유성 전략 (60%+ 고유 H1/intro)

### 8.1 H1 패턴 다양화 (10개 alternative 페이지)

데이터 파일(`competitor-{slug}.ts` 의 `alternativePageData.h1`) 에 다음 3가지 패턴 중 하나를 슬러그별로 분산:

| 패턴 | 예시 | 적용 슬러그 |
|------|------|----------|
| "The Best {X} Alternative for 2026" | "The Best TestRail Alternative for 2026" | testrail, zephyr, qase, xray |
| "{X} Too Expensive? Try Testably" | "TestPad Too Expensive? Try Testably" | testpad, practitest |
| "Why Teams Switch from {X} to Testably" | "Why Teams Switch from BrowserStack TM to Testably" | browserstack-tm, testmonitor |
| "{X} vs Testably: A Better Free Alternative" | "Kiwi TCMS vs Testably: A Better Free Alternative" | kiwi-tcms, testiny |

> **마케터 owner:** 정확한 H1 카피는 마케터가 `docs/marketing/alternative-copy-{slug}.md` 에 작성. 본 spec 은 **패턴 다양화 규칙만 제시**.

### 8.2 H1 패턴 다양화 (15개 vs-매트릭스 페이지)

| 패턴 | 예시 |
|------|------|
| "{A} vs {B} (2026): Complete Comparison" | "TestRail vs Zephyr (2026): Complete Comparison" |
| "{A} or {B}? Why Neither Is the Best Choice" | "Qase or Xray? Why Neither Is the Best Choice" |
| "{A} vs {B}: Pricing, Features, and a Better Alternative" | "PractiTest vs TestPad: Pricing, Features, and a Better Alternative" |

분배: 15개 페이지에 3-2-3-2-3-2 또는 5-5-5 균형. 마케터 카피 작성 시 적용.

### 8.3 Intro paragraph 고유성

- 각 페이지의 intro 첫 단락 (Hero subhead + 본문 첫 paragraph) 은 **해당 경쟁사의 user pain point** 를 직접 인용 (Phase 1 리서치 `docs/research/competitor-{slug}.md` §3 / §5 출처)
- 예: TestRail 페이지는 "$36/seat hurts at scale", Zephyr 페이지는 "Jira lock-in", Xray 페이지는 "Cloud vs Server confusion" 등
- 비교 표 자체는 공통 구조이지만 surrounding paragraph (표 위 1단락, 표 아래 1단락) 가 페이지별 고유 → 5-gram 중복 30% 이하 자동 달성

### 8.4 데이터 패턴 (비교 표는 공통 구조, 데이터는 경쟁사별 고유)

| 페이지 요소 | 공통 (재사용) | 페이지별 고유 (데이터로 변주) |
|-----------|--------------|---------------------------|
| 페이지 레이아웃 | ✅ | ❌ |
| 섹션 순서 | ✅ | ❌ |
| 비교 표 컬럼 구조 | ✅ | ❌ |
| H1 / 서브헤딩 | ❌ | ✅ |
| Intro paragraph (200+ words) | ❌ | ✅ |
| whyLeave / whySwitch body | ❌ | ✅ |
| 비교 표 rows (feature, pricing) | ❌ | ✅ |
| migrationGuide steps | ❌ | ✅ |
| FAQ | ❌ | ✅ |
| CTA 카피 | 일부 공통 | 일부 고유 |

→ **UI 레이아웃은 100% 공통, 콘텐츠는 100% 고유**. SEO 패널티 없음.

---

## 9. CTA 배치 전략

### 9.1 페이지당 CTA 위치 (4곳 표준)

| 위치 | 1차 CTA | 2차 CTA |
|------|--------|---------|
| Hero (Section A) | "Start free trial" → app signup | "Compare pricing" → /pricing |
| 중간 (Section C/E 끝) | 인라인 "Try Testably free →" 링크 (text-indigo-500 underline) | — |
| Bottom CTA (Section H) | "Get started free" → app signup | "See all alternatives" → /alternatives |
| 푸터 (MarketingCTA 또는 BottomCTASection) | 자체 풋터 CTA | — |

### 9.2 CTA 톤 별 텍스트 매트릭스

| 페이지 유형 | Hero 1차 | Hero 2차 | Bottom CTA 1차 | Bottom CTA 2차 |
|-----------|---------|---------|---------------|---------------|
| `/alternatives/{slug}` | Start free trial | Compare pricing | Get started free | See all alternatives |
| `/compare/{a}-vs-{b}` | Try Testably free | View Testably pricing | Start free, no card | Compare Testably to {A} (link) |
| 블로그 (alternatives-2026) | (Hero 내 CTA 없음 — content 우선) | — | Try Testably free | Read more on the blog |
| 블로그 (best-test-management-tools-2026) | — | — | Try the #1 pick free | — |
| `/compare` 인덱스 (확장) | Get Started Free | — | Get Started Free | View Pricing |
| `/alternatives` 인덱스 (신규) | Get Started Free | — | Get Started Free | See cross-comparisons |

### 9.3 CTA 시각 톤

| 위치 | 톤 | Tailwind |
|------|----|---------|
| Hero (slate-900) | indigo glow primary | `bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-8 py-4 rounded-full shadow-[0_0_30px_rgba(99,102,241,0.25)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] active:scale-[0.98] transition-all` |
| Hero secondary | ghost dark | `border border-white/10 text-white/80 hover:border-white/20 hover:text-white font-semibold px-8 py-4 rounded-full backdrop-blur-sm` |
| 중간 인라인 | text link | `text-indigo-600 font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all` + `<i class="ri-arrow-right-line">` |
| Bottom CTA primary | indigo glow | 동일 hero pattern |
| Bottom CTA secondary | ghost dark | 동일 hero secondary |
| MarketingCTA (indigo→violet 그라데이션 섹션) | 흰 버튼 on 그라데이션 | `bg-white text-indigo-600 rounded-xl font-bold px-8 py-3.5 hover:bg-gray-50 hover:scale-[1.02]` (기존 그대로) |

### 9.4 페이지별 `showCTA` prop 결정

| 페이지 | `MarketingCTA` (기본 풋터) 사용 |
|--------|------------------------------|
| `/alternatives/{slug}` | ❌ (`showCTA={false}`) — 자체 Bottom CTA 사용 |
| `/compare/{a}-vs-{b}` | ❌ — 자체 Bottom CTA |
| `/alternatives` 인덱스 | ✅ |
| `/compare` 인덱스 | ✅ |
| 블로그 11편 | 기존 패턴 따름 (대부분 ❌, 자체 CTA) |

> **사유:** 페이지 본문이 길고 톤이 진지한 비교 페이지에서 갑자기 그라데이션 CTA 가 등장하면 시각적 단절. 자체 슬레이트 풋터 CTA 가 더 일관적.

---

## 10. 접근성 (a11y)

### 10.1 일반 원칙

- 모든 인터랙티브 요소에 `:focus-visible` 스타일 명시: `ring-2 ring-indigo-400 ring-offset-2 ring-offset-white` (light) 또는 `ring-offset-slate-900` (dark)
- 모든 아이콘은 의미적 컨텍스트 있을 때만 사용. 순수 장식 아이콘은 `aria-hidden="true"` (Remix Icon `<i>` 는 기본 inline element 이므로 명시 필요)
- 색상 대비:
  - 흰 배경 + `text-gray-600` → 7.0:1 (AAA)
  - 흰 배경 + `text-gray-400` → 3.4:1 (AA Large only) → 캡션/보조 텍스트만 허용
  - slate-900 + `text-slate-400` → 4.7:1 (AA Normal pass)
  - slate-900 + `text-slate-300` → 7.5:1 (AAA)
  - indigo-500 위 `text-white` → 5.6:1 (AA pass)

### 10.2 비교 표 a11y

- `<table>` semantic 사용 (CSS grid 등으로 대체 금지)
- `<thead>` + `<th scope="col">` 으로 컬럼 헤더 명시
- 첫 컬럼 셀 (`Feature`) 은 `<th scope="row">` 권장
- ✓ / ✗ 아이콘만 있는 셀은 sr-only 텍스트 보강:
  ```html
  <td><i class="ri-check-line text-indigo-500" aria-hidden="true"></i><span class="sr-only">Yes</span></td>
  <td><i class="ri-close-line text-gray-300" aria-hidden="true"></i><span class="sr-only">No</span></td>
  ```
- 표 캡션 (Last updated 등) 은 `<caption>` 으로 표 내부에 두거나, 표 외부 텍스트로 둘 다 가능. 외부 텍스트 선호 (기존 패턴).

### 10.3 Hero / Versus 카드 a11y

- Hero pill (e.g. "Alternative"): 단순 시각 요소이지만 의미 있으면 `role="img" aria-label="..."` 보다는 그대로 텍스트 노출 권장 (sr 가 읽음)
- "vs" badge: 시각 장식이지만 의미 있음 → `aria-label="versus"` 또는 `<span class="sr-only">versus</span>` 추가
- 양측 카드 (`competitorA`, `competitorB`): `<article>` 또는 `<section>` semantic 권장. 카드 안의 H3 (제품명) 으로 시멘틱 구조.

### 10.4 FAQ a11y

현재 패턴은 모든 답변이 펼쳐진 상태(`<h3>` + `<p>` flat list). 접근성 양호.

향후 `<details>/<summary>` 로 접고 펼치는 패턴 도입 시: `<summary>` 가 자동으로 button role + aria-expanded 제공. 기본 마커 (`▶`) 제거하려면 `summary::-webkit-details-marker { display: none }` + 커스텀 chevron.

### 10.5 키보드 네비게이션 검증

| 페이지 | Tab 순서 검증 |
|--------|------------|
| `/alternatives/{slug}` | Header 링크들 → Hero CTA 1차 → 2차 → KD 카드 (포커스 불가능, 정보 카드) → Migration `<details>` → FAQ 링크들 (있다면) → Bottom CTA 1차 → 2차 → Footer |
| `/compare/{a}-vs-{b}` | Header → Hero CTA → "vs" 카드 (정보 카드, 포커스 불가) → 3-way 표 (스크롤 가능 영역) → bothLimitations 카드 → Bottom CTA → Footer |

### 10.6 Skip link

기존 `MarketingHeader` 에 skip link 가 없으면 추가 권장: `<a href="#main-content" class="sr-only focus:not-sr-only ...">Skip to main content</a>` (별도 spec).

---

## 11. 마일스톤별 디자인 산출

dev spec 의 M1~M5 와 본 design spec 의 매핑:

| 마일스톤 | dev spec 요구 | design spec 의존도 | 본 spec 에서의 산출 |
|---------|-------------|------------------|------------------|
| M1 — 데이터 모델 + 신규 데이터 | 타입 확장, 데이터 파일 작성 | **불필요** | 본 spec 작성으로 영향 없음 |
| M2 — `/alternatives/:competitor` | 페이지 컴포넌트, 라우트 추가 | **Critical** | §1.1 + §2.3 신규 컴포넌트 (`<AlternativeHero>`, `<KeyDifferenceCard>`, `<MigrationGuide>`, `<FaqSection>`, `<ComparisonTable>`) |
| M3 — vs-매트릭스 15개 | 페이지 컴포넌트, 분기 로직 | **Critical** | §1.2 + §2.3 신규 컴포넌트 (`<VsHero>`, `<ComparisonTable variant="three-col">`) |
| M4 — 블로그 11편 | 11개 페이지 | **Light** | §1.3 + `<RankedToolCard>` 1개. 나머지 기존 블로그 패턴 재사용 |
| M5 — sitemap 자동화 | 빌드 스크립트 | **불필요** | 영향 없음 |

### 11.1 M2 디자인 차폐 (가장 핵심)

> M2 시작 전에 본 spec §1.1, §2.3 (`AlternativeHero`, `KeyDifferenceCard`, `MigrationGuide`, `FaqSection`, `ComparisonTable`) 명세가 Approved 되어 있어야 한다.

### 11.2 M3 디자인 차폐

> M3 시작 전에 §1.2, §2.3 (`VsHero`, `ComparisonTable variant="three-col"`) 명세가 Approved 되어 있어야 한다.
> M3 의 알파벳 정렬 redirect 로직은 dev spec 4-1-1 참조 (디자인 결정 사항 없음, 라우팅 로직).

### 11.3 M4 디자인 차폐 (가벼움)

> §1.3 의 결정 — 기존 블로그 패턴 미러 — 으로 인해 디자인 부담 거의 없음. `<RankedToolCard>` 만 신규.

### 11.4 병렬 가능성

- M1 (데이터) + 본 design spec 작성: 병렬 가능 (서로 다른 파일)
- M2 + M3: 라우트는 독립이지만 둘 다 `<ComparisonTable>` 의존 → M2 우선, M3 가 M2 의 컴포넌트 재사용
- M4 + M5: 병렬 가능

---

## 12. 토스트 메시지

본 페이지들은 **토스트 발생 시나리오 없음** (§4.3). 따라서 i18n 키 신규 추가 없음.

향후 newsletter subscribe 등 추가 시 별도 spec.

---

## 13. 검증 체크리스트 (Phase 4 개발자 핸드오프 직전)

### 13.1 본 design spec 자체 검증

- [x] 페이지 유형별 ASCII 와이어프레임이 모든 섹션을 포함 (`/alternatives`, `/compare/{a}-vs-{b}`, 블로그, 인덱스 4종)
- [x] 신규 컴포넌트 5종 (`AlternativeHero`, `VsHero`, `KeyDifferenceCard`, `MigrationGuide`, `FaqSection`) + 컴포넌트화 산출 5종 (`ComparisonTable`, `BottomCTASection`, `MatrixLinkGrid`, `RankedToolCard`, ...) 의 props/variants/state 명시
- [x] Tailwind 클래스가 구체적으로 명시됨 (추측 표기 없음)
- [x] 모든 상태 정의 (정상, NotFound, alternativePageData 미정의 graceful 처리)
- [x] 반응형 브레이크포인트 5단계 변경점 명시 (sm/md/lg/xl)
- [x] 다크/라이트 섹션 색상 매핑 (§6)
- [x] 인터랙션 (호버, 포커스, 클릭) + 키보드 네비 검증 (§4, §10.5)
- [x] CTA 배치 4곳 + 텍스트 매트릭스 (§9)
- [x] a11y: 비교 표 `<th scope>`, ✓/✗ 아이콘 sr-only, focus-visible (§10)
- [x] 콘텐츠 고유성 60%+ 전략 (§8)
- [x] 컴포넌트 재사용 매트릭스 (§2.1)
- [x] 기존 `/compare/{slug}` 페이지 변경 없음 — 점진적 컴포넌트화는 시각 변경 0건 (§7.2)
- [x] 마일스톤 매핑 (§11)
- [x] 토스트 / i18n 키 영향 없음 (§12)

### 13.2 dev spec 수용 기준과의 매핑

| dev spec AC | design spec 커버리지 |
|------------|-------------------|
| AC-1 (compare 10개 200 OK) | §1.4 — 기존 페이지 시각 변경 없음, 데이터만 추가 |
| AC-2 (alternatives 10개 200 OK) | §1.1, §1.5 |
| AC-3 (vs-매트릭스 15개) | §1.2 |
| AC-4 (블로그 11편) | §1.3 |
| AC-5 (잘못된 슬러그 NotFound + noindex) | §3.4 |
| AC-6~AC-8 (데이터 타입) | dev spec §5 직접 — design 영향 없음 |
| AC-9~AC-11 (SEO 메타, JSON-LD) | §10.2 (표 semantic), `<FaqSection>` JSON-LD 출력 |
| AC-12, AC-13 (sitemap, prerender) | design 영향 없음 |
| AC-14~AC-16 (콘텐츠 고유성) | §8 |
| AC-17~AC-19 (빌드, Lighthouse) | §10 a11y 가 Lighthouse SEO/Accessibility 점수에 기여 |

---

## 14. Out of Scope (본 design spec 에서 다루지 않는 것)

- **카피 작성** — 본 spec 은 레이아웃과 컴포넌트 명세. 실제 텍스트(H1, intro, FAQ 내용 등)는 마케터가 `docs/marketing/*` 에 작성
- **일러스트레이션 / 이미지** — 본 spec 은 텍스트와 아이콘만 사용. 향후 product 스크린샷 임베드 시 별도 spec
- **다크모드 토글** — 마케팅 페이지는 다크/라이트 토글 없음 (섹션 안에서 교차)
- **i18n (한국어 디자인)** — dev spec OOS 와 일치. 영어 전용
- **A/B 테스트 인프라** — Hero H1 변형 테스트 등 향후 도입
- **`<details>/<summary>` 기반 FAQ 펼침/접힘** — 현재 flat list. 향후 페이지 길이 늘면 도입 고려
- **블로그 RankedToolCard 외 신규 컴포넌트** — 블로그는 기존 패턴 100% 재사용
- **mobile 카드 변환 비교 표** — 가로 스크롤 채택 (§5.2 옵션 A)
- **product screenshot 임베드** — 본 spec 에서는 텍스트 중심. 추후 enhancement
- **Lottie / Framer Motion 애니메이션** — 호버 transition (CSS) 만 사용

---

## 15. 참고 자산 (Visual Reference)

- 기존 `/compare/testrail` 페이지 — `src/pages/compare/page.tsx` (Hero, 비교 표, FAQ, CTA 톤 기준)
- 기존 `/compare` 인덱스 — `src/pages/compare/index.tsx` (인덱스 카드, feature matrix, Bottom CTA 톤)
- 기존 블로그 — `src/pages/blog/choosing-test-management-tool/page.tsx` (블로그 패턴 + BlogPosting JSON-LD)
- 기존 블로그 (최신) — `src/pages/blog/playwright-reporter-ci-integration/page.tsx` (TOC sticky + 코드 블록 등 최신 패턴)
- UI Guide — `docs/UI_GUIDE.md` (색상, 폰트, 간격 기준)
- SEOHead — `src/components/SEOHead.tsx` (canonical absolute URL — 5/13 픽스 반영됨, 변경 불필요)

---

## 디자인 개발 착수 전 체크리스트

> 아래 항목을 모두 통과해야 Phase 4 (개발) M2 / M3 진행 가능. M1 / M4 / M5 는 본 spec 의존도 낮음.

- [x] 모든 상태 정의 (정상, NotFound, graceful 차단 — §3)
- [x] Tailwind 클래스 구체 명시 (추측 표기 없음 — §2.3, §6)
- [x] 다크 / 라이트 섹션 색상 매핑 (§6)
- [x] 기존 컴포넌트 재사용 목록 (§7)
- [x] 인터랙션 (호버, 포커스, 키보드) — §4, §10.5
- [x] 반응형 브레이크포인트별 변경점 (§5)
- [x] 토스트 메시지 / i18n 영향도 — 없음 (§12)
- [x] dev spec 수용 기준 (AC-1 ~ AC-19) 매핑 (§13.2)
- [x] 콘텐츠 고유성 60%+ 전략 (§8)
- [x] CTA 배치 전략 (§9)
- [x] a11y (비교 표 semantic, ✓/✗ sr-only, focus ring) — §10
- [x] 마일스톤별 디자인 산출 매핑 (§11)
- [x] Out of Scope 명시 (§14)
- [ ] (Phase 4 시작 전) 마케터 카피 11편 + 25개 페이지 카피 준비 — 본 spec 책임 아님, 의존 사항

---

**문서 끝.**
