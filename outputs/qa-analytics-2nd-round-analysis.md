# QA: Analytics 위젯 2차 CSS 비교 분석 — Dev1 수정 지시서

- **목업**: `dashboard-analytics-activity-feed-mockup.html`
- **대상 소스**: `/src/pages/project-detail/widgets/` + `ActivityFeedTab.tsx`
- **분석일**: 2026-04-01
- **라운드**: 2차 (Dev1 40개 수정 후 잔존 이슈)
- **담당**: QA → Dev1 수정 지시

---

## 총괄 요약

| 구분 | 건수 |
|------|------|
| 아이콘 `-line` → `-fill` 교체 | 7건 |
| 본문 패딩 불일치 | 4건 |
| 색상 미세 불일치 | 4건 |
| 기타 스타일 | 3건 |
| ActivityFeed 이벤트 아이콘 (6종) | 6건 (아이콘 항목에 포함) |
| **합계** | **24건** |

---

## 목업 글로벌 CSS 기준값 (참조)

```css
.wg-body   { padding: 16px 20px }          /* py-4 px-5 */
.wg-head   { padding: 14px 20px }          /* py-3.5 px-5 */
.kpi       { padding: 14px 16px; background: #F8FAFC }
.sbar-legend-dot { width: 6px; height: 6px; border-radius: 50% }
.seq-dot   { width: 8px; height: 8px }
.seq-dots  { gap: 3px }
.chip      { color: #6366F1; background: #EEF2FF; padding: 4px 10px }
--g700     = #334155  (slate-700, ≠ Tailwind gray-700 #374151)
--primary  = #6366F1  (indigo-500)
```

---

## 위젯별 수정 지시

---

### 1. MilestoneTracker.tsx

**이슈 수: 1건**

#### Fix M-1 — 번다운 차트 범례 글꼴/색상
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| Legend wrapperStyle | `fontSize: '11px', color: '#6B7280'` | `fontSize: '10px', color: '#94A3B8'` |

```tsx
// 현재
wrapperStyle={{ fontSize: '11px', color: '#6B7280' }}

// 수정
wrapperStyle={{ fontSize: '10px', color: '#94A3B8' }}
```

---

### 2. ExecutionSummary.tsx

**이슈 수: 4건**

#### Fix E-1 — 헤더 아이콘 `-line` → `-fill`
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| 헤더 아이콘 | `ri-play-circle-line` | `ri-play-circle-fill` |

```tsx
// 현재
<i className="ri-play-circle-line text-emerald-500" />

// 수정
<i className="ri-play-circle-fill text-emerald-500" />
```

#### Fix E-2 — Run 요약 셀 배경색 통일
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| passed 셀 bg | `bg-emerald-50` | `bg-gray-50` (#F8FAFC) |
| failed 셀 bg | `bg-red-50` (추정) | `bg-gray-50` |
| skipped 셀 bg | `bg-amber-50` | `bg-gray-50` |

```tsx
// 현재 (각 상태별로 다른 bg)
className="... bg-emerald-50 ..."
className="... bg-indigo-50 ..."
className="... bg-amber-50 ..."

// 수정 — 모두 동일한 bg-gray-50으로 교체
className="... bg-gray-50 ..."
```

#### Fix E-3 — sbar-legend 도트 크기
| 항목 | 현재 | 목업 스펙 (`.sbar-legend-dot`) |
|------|------|------|
| 범례 도트 | `w-2 h-2` (8px) | `w-1.5 h-1.5` (6px) |

```tsx
// 현재
<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />

// 수정
<span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
```

#### Fix E-4 — Run 이름 텍스트 색상
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| run name | `text-gray-800` (#1F2937) | `text-gray-900` (#111827) |

```tsx
// 현재
className="... text-gray-800 ..."

// 수정
className="... text-gray-900 ..."
```

---

### 3. PassRateTrend.tsx

**이슈 수: 2건**

#### Fix P-1 — 본문 패딩
| 항목 | 현재 | 목업 스펙 (`.wg-body`) |
|------|------|------|
| body wrapper padding | `p-5` (20px all) | `px-5 py-4` (20px / 16px) |

```tsx
// 현재
<div className="p-5 space-y-4">

// 수정
<div className="px-5 py-4 space-y-4">
```

#### Fix P-2 — KPI 델타 gap
| 항목 | 현재 | 목업 스펙 (`.kpi-delta`) |
|------|------|------|
| delta row gap | `gap-1` (4px) | `gap-[3px]` (3px) |

```tsx
// 현재
<div className="flex items-center gap-1 ...">

// 수정
<div className="flex items-center gap-[3px] ...">
```

---

### 4. TeamPerformance.tsx

**이슈 수: 1건**

#### Fix T-1 — 본문 패딩
| 항목 | 현재 | 목업 스펙 (`.wg-body`) |
|------|------|------|
| body wrapper padding | `p-5` (20px all) | `px-5 py-4` (20px / 16px) |

```tsx
// 현재
<div className="p-5">

// 수정
<div className="px-5 py-4">
```

---

### 5. CoverageHeatmap.tsx

**이슈 수: 2건**

#### Fix C-1 — 헤더 아이콘 `-line` → `-fill`
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| 헤더 아이콘 | `ri-layout-grid-2-line text-indigo-500` | `ri-layout-grid-fill text-indigo-500` |

```tsx
// 현재
<i className="ri-layout-grid-2-line text-indigo-500" />

// 수정
<i className="ri-layout-grid-fill text-indigo-500" />
```

#### Fix C-2 — 본문 패딩
| 항목 | 현재 | 목업 스펙 (`.wg-body`) |
|------|------|------|
| body wrapper padding | `p-4` (16px all) | `px-5 py-4` (20px / 16px) |

```tsx
// 현재
<div className="p-4">

// 수정
<div className="px-5 py-4">
```

---

### 6. TCQualityAnalysis.tsx

**이슈 수: 2건**

#### Fix Q-1 — 헤더 아이콘 `-line` → `-fill`
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| 헤더 아이콘 | `ri-test-tube-line text-emerald-500` | `ri-test-tube-fill text-emerald-500` |

```tsx
// 현재
<i className="ri-test-tube-line text-emerald-500" />

// 수정
<i className="ri-test-tube-fill text-emerald-500" />
```

#### Fix Q-2 — 본문 패딩
| 항목 | 현재 | 목업 스펙 (`.wg-body`) |
|------|------|------|
| body wrapper padding | `p-4` (16px all) | `px-5 py-4` (20px / 16px) |

```tsx
// 현재
<div className="p-4 space-y-4">

// 수정
<div className="px-5 py-4 space-y-4">
```

---

### 7. FlakyDetector.tsx

**이슈 수: 1건**

#### Fix F-1 — 본문 이중 좌우 패딩 제거
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| body wrapper | `px-4 py-3` (좌우 16px + 행 `px-3.5` 14px = **30px** 누적) | wg-body 패딩 없음 + 행 패딩 14px = **14px** |

**원인**: 목업의 `.wg-body`는 FlakyDetector에서 패딩 없이 테이블 행 직접 렌더링. 현재 코드는 외부 `px-4`와 행 `px-3.5`가 중첩되어 좌우 여백이 30px로 과다함.

```tsx
// 현재
<div className="px-4 py-3 ...">

// 수정 — 수평 패딩 제거, 수직만 유지
<div className="px-0 py-3 ...">
// 또는
<div className="py-3 ...">
```

---

### 8. TierGate.tsx

**이슈 수: 1건**

#### Fix G-1 — 기능명 텍스트 색상
| 항목 | 현재 | 목업 스펙 (`.blur-lock p`) |
|------|------|------|
| featureName color | `text-gray-700` (#374151) | `#334155` (slate-700, CSS var `--g700`) |

**참고**: Tailwind `gray-700` (#374151)은 목업의 `--g700` (#334155, slate-700)과 다름.

```tsx
// 현재
<p className="text-[14px] font-medium text-gray-700 text-center">

// 수정
<p className="text-[14px] font-medium text-[#334155] text-center">
```

---

### 9. ActivityFeedTab.tsx

**이슈 수: 10건**

#### Fix A-1 — FilterChip 텍스트 색상
| 항목 | 현재 | 목업 스펙 (`.chip`) |
|------|------|------|
| active chip color | `text-indigo-600` (#4F46E5) | `text-indigo-500` (#6366F1, `var(--primary)`) |

```tsx
// 현재
className="... text-indigo-600 bg-indigo-50 ..."

// 수정
className="... text-indigo-500 bg-indigo-50 ..."
```

#### Fix A-2 — AI Summary 하단 마진
| 항목 | 현재 | 목업 스펙 (`.ai-summary: margin 12px 20px`) |
|------|------|------|
| AI summary container margin-bottom | `mb-2` (8px) | `mb-3` (12px) |

```tsx
// 현재
<div className="mx-5 mt-3 mb-2 ...">

// 수정
<div className="mx-5 mt-3 mb-3 ...">
```

#### Fix A-3 — FeedItem 본문 텍스트 색상
| 항목 | 현재 | 목업 스펙 |
|------|------|----------|
| feed 주요 텍스트 | `text-gray-700` (#374151) | `text-[#334155]` (slate-700) |

적용 위치: FeedItem의 `action` 텍스트, `targetName` 스팬, AIDailySummary의 본문 텍스트

```tsx
// 현재 (여러 곳)
className="... text-gray-700 ..."

// 수정
className="... text-[#334155] ..."
```

#### Fix A-4 — 날짜 구분선 배경 제거
| 항목 | 현재 | 목업 스펙 (`.date-div`) |
|------|------|------|
| 날짜 구분 배경 | `bg-gray-50/80` | 배경색 없음 (transparent) |

```tsx
// 현재
<div className="... bg-gray-50/80 ...">

// 수정 — bg 클래스 제거
<div className="... ...">
```

#### Fix A-5 ~ A-10 — EVENT_CONFIG 아이콘 6종 `-line` → `-fill`

**목업 기준**: 모든 이벤트 타입 아이콘이 `-fill` variant 사용

| Fix | 이벤트 타입 | 현재 아이콘 | 수정 아이콘 |
|-----|------------|------------|------------|
| A-5 | `test_result_retest` | `ri-refresh-line` | `ri-refresh-fill` |
| A-6 | `tc_created` | `ri-file-add-line` | `ri-file-add-fill` |
| A-7 | `tc_updated` | `ri-edit-2-line` | `ri-edit-fill` |
| A-8 | `tc_comment_added` | `ri-chat-1-line` | `ri-chat-3-fill` |
| A-9 | `member_joined` | `ri-user-add-line` | `ri-user-add-fill` |
| A-10 | `member_role_changed` | `ri-shield-user-line` | `ri-shield-user-fill` |

```tsx
// 현재 EVENT_CONFIG
const EVENT_CONFIG = {
  test_result_retest:  { icon: 'ri-refresh-line',      ... },
  tc_created:          { icon: 'ri-file-add-line',      ... },
  tc_updated:          { icon: 'ri-edit-2-line',        ... },
  tc_comment_added:    { icon: 'ri-chat-1-line',        ... },
  member_joined:       { icon: 'ri-user-add-line',      ... },
  member_role_changed: { icon: 'ri-shield-user-line',   ... },
  // (나머지는 이미 -fill 사용 중)
};

// 수정
const EVENT_CONFIG = {
  test_result_retest:  { icon: 'ri-refresh-fill',      ... },
  tc_created:          { icon: 'ri-file-add-fill',      ... },
  tc_updated:          { icon: 'ri-edit-fill',          ... },
  tc_comment_added:    { icon: 'ri-chat-3-fill',        ... },
  member_joined:       { icon: 'ri-user-add-fill',      ... },
  member_role_changed: { icon: 'ri-shield-user-fill',   ... },
};
```

---

## 우선순위 정리

| 우선순위 | Fix ID | 파일 | 내용 |
|---------|--------|------|------|
| P0 즉시 | A-5 ~ A-10 | ActivityFeedTab | 이벤트 아이콘 6종 `-fill` 교체 |
| P0 즉시 | E-1 | ExecutionSummary | 헤더 아이콘 `-fill` |
| P0 즉시 | C-1 | CoverageHeatmap | 헤더 아이콘 `-fill` |
| P0 즉시 | Q-1 | TCQualityAnalysis | 헤더 아이콘 `-fill` |
| P1 고 | E-2 | ExecutionSummary | Run 셀 배경색 통일 `bg-gray-50` |
| P1 고 | P-1 / T-1 / C-2 / Q-2 | 다수 | body `p-5`/`p-4` → `px-5 py-4` |
| P1 고 | F-1 | FlakyDetector | 이중 좌우 패딩 제거 |
| P2 중 | A-1 | ActivityFeedTab | chip `text-indigo-600` → `text-indigo-500` |
| P2 중 | A-3 / G-1 | ActivityFeedTab, TierGate | `text-gray-700` → `text-[#334155]` |
| P3 낮 | M-1 | MilestoneTracker | 번다운 범례 font-size/color |
| P3 낮 | E-3 / E-4 | ExecutionSummary | 범례 도트 6px, run name gray-900 |
| P3 낮 | P-2 | PassRateTrend | KPI delta `gap-[3px]` |
| P3 낮 | A-2 / A-4 | ActivityFeedTab | AI summary `mb-3`, 날짜구분선 bg 제거 |

**총 24건 — 전량 Dev1 수정 후 재확인 요망**
