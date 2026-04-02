# Dev1 개발 지시서: Changelog & Roadmap 페이지 업데이트

> **작성일:** 2026-04-02
> **작성자:** PM Agent
> **담당:** Dev1 (local_6725ced1)
> **예상 소요:** 30분 ~ 1시간
> **우선순위:** ★★★ 긴급 (홈페이지 공개 정보가 실제와 불일치)

---

## 배경

최근 완료된 주요 기능 6건이 Changelog와 Roadmap에 반영되지 않았습니다.
- Dashboard Analytics & Activity Feed (완료됨, Roadmap에는 "Planned Q3 2026")
- 8페이지 Executive Report PDF Export (완전 누락)
- Lemon Squeezy 결제 연동 (완전 누락)
- Milestone Roll-up (완전 누락)
- Run Detail / Dashboard Export 개선 (완전 누락)

CEO 지시로 아래 2개 파일을 수정합니다.

---

## PART 1: Changelog 업데이트

**파일:** `src/pages/changelog/page.tsx`

### 변경 내용

`entries` 배열의 **맨 앞** (기존 "AI Test Case Generation" 항목 앞)에 아래 4개 항목을 추가합니다. 기존 항목은 그대로 유지합니다.

### 추가할 코드

`const entries = [` 바로 아래, 기존 첫 번째 항목(`{ date: 'Q2 2026', title: 'AI Test Case Generation' ...}`) 앞에 삽입:

```tsx
  {
    date: 'April 2026',
    title: 'Dashboard Analytics & Activity Feed',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Real-time project health dashboard with 8 analytics widgets and live activity feed. AI-powered insights via Edge Function.',
    bullets: [
      'Status Distribution, Pass Rate Trend, Execution Velocity, Priority Breakdown',
      'Flaky Test Detection, Milestone Tracker, Coverage Heatmap, AI Insights',
      'Real-time Activity Feed with filtering by action type',
      'Tier-gated: Free basic widgets · Starter 6 widgets · Professional+ all 8 + AI',
    ],
  },
  {
    date: 'April 2026',
    title: 'Executive Report PDF Export',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: '8-page A4 PDF report generated directly in browser via jsPDF. Includes Release Readiness Score, Quality Gates, and Coverage Heatmap.',
    bullets: [
      'Cover, KPI Summary, Test Trends, Run Details, Milestones, Coverage, Team, Recommendations',
      'Release Readiness Score with weighted formula (Pass Rate 40%, Coverage 20%, etc.)',
      'Quality Gates: Pass Rate ≥90%, Critical Failures = 0, Coverage ≥80%',
      'Korean font (NotoSansKR) support · Branded header/footer with page numbers',
    ],
  },
  {
    date: 'April 2026',
    title: 'Milestone Roll-up & Payment Integration',
    category: 'New Feature',
    categoryColor: 'bg-indigo-100 text-indigo-700',
    description: 'Parent-Sub milestone auto-aggregation with roll-up stats, and Lemon Squeezy payment integration for tier-based billing.',
    bullets: [
      'Parent milestone auto-calculates progress from all sub-milestones and direct test cases',
      'Auto status determination: all completed → completed, any past_due → past_due',
      'Auto date range: Parent start = min(sub.start), end = max(sub.end)',
      'Lemon Squeezy checkout with tier-based plans (Free / Starter / Professional / Enterprise S/M/L)',
    ],
  },
  {
    date: 'April 2026',
    title: 'Export & Reporting Improvements',
    category: 'Improvement',
    categoryColor: 'bg-emerald-100 text-emerald-700',
    description: 'Quality improvements across Run Detail Export and Dashboard Export. 10 fixes for data accuracy, layout consistency, and visual polish.',
    bullets: [
      'Run Detail Export: 4 quality fixes including data formatting and layout',
      'Dashboard Export: 6 bug fixes for chart rendering and data accuracy',
      'PDF visual alignment with designer mockups (18 items addressed)',
    ],
  },
```

### 주의사항
- "Export & Reporting Improvements" 항목의 `categoryColor`는 기존과 다른 `'bg-emerald-100 text-emerald-700'`입니다 (Improvement 태그를 시각적으로 구분).
- 기존 entries 배열의 나머지 항목(AI Test Case Generation ~ Testably Launch)은 **변경하지 않습니다**.

---

## PART 2: Roadmap 업데이트

**파일:** `src/pages/roadmap/page.tsx`

### 변경 개요

| 칼럼 | 현재 | 변경 후 |
|------|------|---------|
| **Completed** | 4개 항목 | 8개 항목 (+4 신규) |
| **In Progress** | AI Test Case Generation 1개 | 변경 없음 |
| **Planned** | Dashboard & Analytics, Test Case Versioning, Advanced Integrations 3개 | **전면 교체** → Status Unification, Runs/Results Redesign, Jira Workflow Improvement 3개 |
| **Considering** | 3개 항목 | 변경 없음 |

### 2-1. Completed 칼럼 — 4개 항목 추가

`columns` 배열의 첫 번째 객체(id: 'completed')의 `items` 배열 **맨 앞**에 아래 4개를 추가합니다. (최신순 정렬)

기존 `items: [` 바로 뒤, `{ title: 'Slack & Teams Integration' ...}` 앞에 삽입:

```tsx
      {
        title: 'Dashboard Analytics & Activity Feed',
        date: 'Q2 2026',
        desc: 'Real-time dashboard with 8 analytics widgets, activity feed, and AI insights.',
        icon: 'ri-bar-chart-2-line',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
      },
      {
        title: 'Executive Report PDF',
        date: 'Q2 2026',
        desc: '8-page A4 PDF with Release Readiness Score, Quality Gates, and Coverage Heatmap.',
        icon: 'ri-file-pdf-2-line',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
      },
      {
        title: 'Milestone Roll-up',
        date: 'Q2 2026',
        desc: 'Parent-Sub auto-aggregation with roll-up stats, auto status, and date calculation.',
        icon: 'ri-git-merge-line',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
      },
      {
        title: 'Payment Integration',
        date: 'Q2 2026',
        desc: 'Lemon Squeezy checkout with tier-based billing and subscription management.',
        icon: 'ri-bank-card-line',
        iconBg: 'bg-indigo-50',
        iconColor: 'text-indigo-600',
      },
```

### 2-2. Planned 칼럼 — items 전면 교체

`columns` 배열의 세 번째 객체(id: 'planned')의 `items` 배열을 아래로 **전체 교체**합니다.

기존 3개 항목(Dashboard & Analytics, Test Case Versioning, Advanced Integrations)을 삭제하고:

```tsx
    items: [
      {
        title: 'Status Unification',
        date: 'Q2 2026',
        desc: 'Unified status system across test cases, runs, and milestones. Resolves system-wide technical debt.',
        icon: 'ri-checkbox-multiple-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'Runs & Results Redesign',
        date: 'Q2–Q3 2026',
        desc: 'Complete redesign of Runs and Results pages for better workflow and usability.',
        icon: 'ri-layout-3-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'Jira Workflow Improvement',
        date: 'Q3 2026',
        desc: 'Enhanced Jira auto-create with improved field mapping and bi-directional sync.',
        icon: 'ri-links-line',
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
    ],
```

### 2-3. Considering 칼럼 — 1개 항목 추가

기존 3개(Mobile App, API v2, Test Automation SDK) 뒤에 아래 1개 추가:

```tsx
      {
        title: 'Test Case Versioning',
        date: 'TBD',
        desc: 'Version history, compare, and restore for compliance and audit.',
        icon: 'ri-git-branch-line',
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-500',
      },
```

> **이유:** Test Case Versioning은 기존 Planned에 있었으나, 당장 스프린트에 들어가지 않으므로 Considering으로 이동합니다.

### 주의사항
- In Progress 칼럼(AI Test Case Generation)은 **변경하지 않습니다**.
- Considering 칼럼의 기존 3개 항목(Mobile App, API v2 & Webhooks, Test Automation SDK)은 **유지**합니다.
- 칼럼 헤더의 count 뱃지는 `col.items.length`로 자동 계산되므로 별도 수정 불필요합니다.

---

## PART 3: 검증 체크리스트

수정 후 아래를 확인해 주세요:

- [ ] `npm run dev` → 빌드 에러 없음
- [ ] `/changelog` 접속 → April 2026 항목 4개가 최상단에 표시
- [ ] `/changelog` → "Improvement" 태그가 emerald 색상으로 표시
- [ ] `/changelog` → 기존 7개 항목 그대로 유지 (총 11개)
- [ ] `/roadmap` → Completed 칼럼: 8개 항목, 카운트 뱃지 "8" 표시
- [ ] `/roadmap` → Planned 칼럼: 3개 항목 (Status Unification, Runs & Results Redesign, Jira Workflow)
- [ ] `/roadmap` → Considering 칼럼: 4개 항목 (기존 3 + Test Case Versioning)
- [ ] `/roadmap` → In Progress 칼럼: 변경 없음 (AI Test Case Generation 1개)
- [ ] 반응형: 모바일 뷰에서 레이아웃 깨지지 않음

---

## 변경 파일 요약

| 파일 | 변경 유형 | 변경 범위 |
|------|-----------|-----------|
| `src/pages/changelog/page.tsx` | entries 배열 앞에 4개 항목 추가 | ~30줄 추가 |
| `src/pages/roadmap/page.tsx` | Completed items 4개 추가 + Planned items 전면 교체 + Considering 1개 추가 | ~50줄 변경 |
