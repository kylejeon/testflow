# Dev1 CSS Pixel-Perfect 수정 지시서

**작성일:** 2026-04-01
**작성자:** QA (목업 HTML CSS 직접 추출)
**목적:** 텍스트 설명이 아닌, 목업 HTML의 인라인/클래스 CSS 값과 현재 구현 Tailwind 클래스를 1:1 비교해 **코드 레벨**로 수정 지시
**포맷:** `파일 / 위치 / 현재 / 목업 CSS 원본 / 수정`

---

## 0. 공통 위젯 카드 기반 (모든 위젯 해당)

목업 글로벌 CSS:
```css
.wg-body { padding: 16px 20px; }  /* py-4 px-5 */
.wg-title i { font-size: 16px; }
```

| # | 파일 | 위치 | 현재 | 목업 CSS 원본 | 수정 |
|---|------|------|------|--------------|------|
| C-01 | 모든 위젯 | wg-body wrapper | `className="p-4"` (16px 전방향) | `padding: 16px 20px` | `p-4` → `px-5 py-4` |
| C-02 | 모든 위젯 | 헤더 아이콘 크기 | 클래스 없음 (기본 크기 사용) | `font-size: 16px` | 각 아이콘에 `text-[16px]` 추가 |

---

## 1. PassRateTrend.tsx

### KPI 카드 (L45–58)

목업 CSS:
```css
.kpi { background: #F8FAFC; border-radius: 8px; padding: 14px 16px; }
.kpi-label { font-size: 11px; font-weight: 500; color: #64748B;
             text-transform: uppercase; letter-spacing: .05em; margin-bottom: 6px; }
.kpi-val { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
.kpi-delta { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; }
```

---

**파일:** `widgets/PassRateTrend.tsx`
**위치:** L45 — `<div className="bg-gray-50 rounded-lg p-3.5">`

```
현재: p-3.5                           → padding: 14px (전방향)
목업: padding: 14px 16px              → 상하 14px, 좌우 16px
수정: p-3.5 → px-4 py-3.5
```

---

**파일:** `widgets/PassRateTrend.tsx`
**위치:** L47 — `<div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">`

```
현재: tracking-wide                   → letter-spacing: 0.025em
목업: letter-spacing: .05em
수정: tracking-wide → tracking-[.05em]
```

---

### Chart (L242–258)

목업 CSS:
```css
.chart-area { height: 220px; }
/* Line: stroke="#6366F1", strokeWidth=2.5, dot r=3.5 */
/* Bars: fill="#E2E8F0", opacity=0.5 */
```

**파일:** `widgets/PassRateTrend.tsx`
**위치:** L252–256 — Bar/Line 속성

```
현재: Bar fill="#E2E8F0" opacity={0.6}   dot={{ r: 3, fill:'#6366F1' }}
목업: fill="#E2E8F0" opacity=0.5,        circle r=3.5
수정:
  <Bar ... opacity={0.5} ... />
  <Line ... dot={{ r: 3.5, fill: '#6366F1' }} strokeWidth={2.5} ... />
```

---

## 2. MilestoneTracker.tsx

목업 CSS:
```css
.ms-cards { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; }
.ms-card { min-width: 200px; border: 1px solid #E2E8F0; border-radius: 8px;
           padding: 14px 16px; flex-shrink: 0; }
.ms-name { font-size: 14px; font-weight: 600; color: #0F172A; margin-bottom: 10px; }
.ms-bar { height: 4px; }
.ms-meta { font-size: 12px; font-weight: 500; color: #64748B; }
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L172 — `<i className="ri-flag-2-line text-indigo-500" />`

```
현재: ri-flag-2-line text-indigo-500
목업: ri-flag-2-fill  color: var(--warning) = #F59E0B
수정: ri-flag-2-line → ri-flag-2-fill, text-indigo-500 → text-amber-500
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L178 — `<div className="p-4">`

```
현재: p-4                             → padding: 16px 전방향
목업: .wg-body { padding: 16px 20px }
수정: p-4 → px-5 py-4
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L180 — `<div className="flex gap-3 overflow-x-auto pb-2 mb-4">`

```
현재: gap-3 (12px) ✅ | pb-2 (8px)
목업: gap: 12px ✅     | padding-bottom: 4px
수정: pb-2 → pb-1
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L182 — `<div className="min-w-[190px] border border-gray-200 rounded-lg p-3.5 flex-shrink-0">`

```
현재: min-w-[190px]  p-3.5 (14px 전방향)
목업: min-width: 200px  padding: 14px 16px
수정: min-w-[190px] → min-w-[200px]
      p-3.5 → px-4 py-3.5
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L194 — `<div className="text-[13px] font-semibold text-gray-900 mb-2.5 leading-tight line-clamp-2">`

```
현재: text-[13px]  mb-2.5 (10px)
목업: .ms-name { font-size: 14px; margin-bottom: 10px; }   → mb 10px ✅
수정: text-[13px] → text-[14px]
      (mb-2.5 = 10px ✅ 유지)
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L203 — `<div className="text-[11px] font-medium ...">` (ms-meta)

```
현재: text-[11px]
목업: .ms-meta { font-size: 12px; font-weight: 500; color: #64748B; }
수정: text-[11px] → text-[12px]
```

---

**파일:** `widgets/MilestoneTracker.tsx`
**위치:** L226 — AreaChart margin

```
현재: margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
목업: burndown 영역 padding: 좌 Y축 레이블 공간 필요
수정: margin={{ top: 8, right: 12, bottom: 4, left: -10 }}
```

---

## 3. ExecutionSummary.tsx (→ "Run Status")

목업 CSS:
```css
/* 3-col summary */
/* padding: 10px; background: #F8FAFC; border-radius: 8px; */
/* value: font-size: 16px; font-weight: 700; */
/* label: font-size: 11px; color: #64748B; */

/* Stacked bar */
.sbar { height: 8px; border-radius: 9999px; }
.sbar-legend { gap: 12px; margin-top: 8px; }
.sbar-legend-item { font-size: 11px; color: #64748B; gap: 4px; }
.sbar-legend-dot { width: 6px; height: 6px; border-radius: 50%; }

/* Run card */
.run-card { gap: 10px; padding: 8px 0; border-bottom: 1px solid #F1F5F9; }
.mini-donut { width: 28px; height: 28px; }
.mini-donut-inner { width: 18px; height: 18px; }
.run-name { font-size: 13px; font-weight: 500; color: #0F172A; }
.run-sub { font-size: 11px; color: #94A3B8; }
.run-count { font-size: 11px; color: #64748B; }
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L196 — `<div className="p-4 flex flex-col gap-4 flex-1">`

```
현재: p-4 (16px 전방향)
목업: .wg-body { padding: 16px 20px }
수정: p-4 → px-5 py-4
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L198–209 — 3-col summary 셀

```
현재: gap-2 (8px) ✅ | 셀 p-3 (12px) | value text-xl (20px)
목업: gap: 8px ✅     | padding: 10px  | font-size: 16px
수정:
  <div className={`${s.bg} rounded-lg p-3 text-center`}>  →  p-3 → p-2.5
  <div className={`text-xl font-bold ${s.color}`}>         →  text-xl → text-[16px]
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L44–51 — StackedBar legend (StatusDot + text)

```
현재: gap-3 mt-1.5     legend dot: w-2 h-2
목업: gap: 12px         legend dot: width: 6px; height: 6px  ✅ (w-1.5 h-1.5)
      margin-top: 8px
수정:
  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
  → gap-3 → gap-3 ✅ (12px 맞음)
  → mt-1.5 → mt-2 (8px)
  legend dot: w-2 h-2 = 8px → w-1.5 h-1.5 (6px)
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L223 — Run card container

```
현재: className="flex items-center gap-2.5 py-1"
      gap-2.5 (10px) ✅ | py-1 (4px 상하)
목업: gap: 10px ✅      | padding: 8px 0
수정: py-1 → py-2
      border-b border-gray-100 추가 (마지막 제외)
→ className="flex items-center gap-2.5 py-2 border-b border-gray-100 last:border-b-0"
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L231 — Run name

```
현재: text-[12px] font-medium
목업: .run-name { font-size: 13px; font-weight: 500; }
수정: text-[12px] → text-[13px]
```

---

**파일:** `widgets/ExecutionSummary.tsx`
**위치:** L244–248 — Footer "View all runs" 링크

```
현재: text-[12px] font-semibold text-indigo-500 flex items-center gap-1
목업: text-align: center; font-size: 12px; font-weight: 600; color: #6366F1  (centered)
수정: 링크를 가운데 정렬로:
  <Link ... className="text-[12px] font-semibold text-indigo-500 text-center block py-2">
    View all runs →
  </Link>
```

---

## 4. TeamPerformance.tsx

목업 CSS:
```css
.wg-title i { color: var(--violet) = #8B5CF6 }  /* 현재: text-indigo-500 */

/* Table */
.tbl thead th { background: #F8FAFC; padding: 10px 14px; font-size: 12px; font-weight: 600;
                color: #64748B; text-transform: uppercase; letter-spacing: .03em;
                border-bottom: 1px solid #E2E8F0; }
.tbl tbody td { padding: 10px 14px; font-size: 13px; color: #334155; border-bottom: 1px solid #F1F5F9; }
.tbl tbody tr:hover { background: #F8FAFC; }

/* H-bar chart section */
/* padding: 16px 20px */
.hbar-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
.hbar-label { font-size: 12px; font-weight: 500; color: #334155; width: 70px; }
.hbar-track { height: 24px; background: #F1F5F9; border-radius: 6px; }
.hbar-count { font-size: 12px; font-weight: 600; color: #334155; width: 40px; text-align: right; }
.spark { height: 20px; gap: 2px; }
.spark-bar { width: 5px; border-radius: 2px; background: #6366F1; }
```

---

**파일:** `widgets/TeamPerformance.tsx`
**위치:** L113 — `<i className="ri-team-line text-indigo-500" />`

```
현재: ri-team-line  text-indigo-500 (#6366F1)
목업: ri-team-fill  color: var(--violet) = #8B5CF6
수정: ri-team-line → ri-team-fill
      text-indigo-500 → text-violet-500
```

---

**파일:** `widgets/TeamPerformance.tsx`
**위치:** L122 — body wrapper `<div className="p-5">`

```
현재: p-5 (20px 전방향)
목업: table 섹션은 padding: 0 (테이블 자체 셀 padding으로 처리)
      hbar 섹션은 padding: 16px 20px
수정: p-5 → p-0 (Recharts를 사용하므로 차트만 padding 조정)
      → BarChart 상하좌우 margin: top:16, right:20, bottom:0, left:0 으로 대신 처리
      실질적으로: <div className="px-5 py-4"> 로 변경 후 BarChart margin 제거
```

---

**파일:** `widgets/TeamPerformance.tsx`
**위치:** L133–135 — BarChart YAxis

```
현재: YAxis width={90} tick={{ fontSize: 12, fill: '#374151' }}
목업: .hbar-label { width: 70px; font-size: 12px; color: #334155; }
수정: width={90} → width={70}
      fill: '#374151' → fill: '#334155'
```

---

**파일:** `widgets/TeamPerformance.tsx`
**위치:** L158–169 — rankings list (Top performers table)

```
현재: space-y-2, text-[12px], gap-3
목업: 별도 테이블 형식 없음 (hbar chart로 대체)
      현재 구현의 rankings list는 목업에 없는 추가 기능이나, 있으면 좋음 → 유지
      다만 간격: space-y-2 → space-y-1.5 (목업의 hbar-row margin-bottom: 10px에 근사)
```

---

## 5. FlakyDetector.tsx

목업 CSS:
```css
.wg-title i { color: var(--danger) = #EF4444 }   /* 현재: text-amber-500 */
/* 헤더명: "Flaky TC Detection" */

/* Table body: padding: 0 */
/* seq-dots: display: flex; gap: 3px; align-items: center; */
/* seq-dot: width: 8px; height: 8px; border-radius: 50%; */
/* seq-pass: background: #16A34A */
/* seq-fail: background: transparent; border: 1.5px solid #DC2626 */
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L132 — `<i className="ri-bug-line text-amber-500" />`

```
현재: ri-bug-line  text-amber-500 (#F59E0B)
목업: ri-bug-fill  color: var(--danger) = #EF4444
수정: ri-bug-line → ri-bug-fill
      text-amber-500 → text-red-500
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L133 — 위젯 제목 텍스트

```
현재: "Flaky TC Detector"
목업: "Flaky TC Detection"
수정: Detector → Detection
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L31 — SequenceDots gap

```
현재: className="flex items-center gap-1"   (gap: 4px)
목업: .seq-dots { gap: 3px; }
수정: gap-1 → gap-[3px]
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L33 — seq-dot size

```
현재: w-2 h-2   (8px ✅)
목업: width: 8px; height: 8px  ✅ 이미 맞음
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L143 — body padding

```
현재: className="p-4"   (16px 전방향)
목업: .wg-body { padding: 0 } — 테이블 직접 렌더링
      (현재 카드 레이아웃 사용 → 목업과 구조 다름, 현재 p-4 유지하되 헤더/행 간격 축소)
수정: p-4 → px-4 py-3 (간격 약간 줄임)
```

---

**파일:** `widgets/FlakyDetector.tsx`
**위치:** L165 — row card

```
현재: p-2.5 rounded-lg border border-gray-100
목업: tbl tbody td { padding: 10px 14px; border-bottom: 1px solid #F1F5F9; }
수정: p-2.5 → px-[14px] py-[10px]
      border border-gray-100 → border-b border-gray-100 rounded-none
      (rounded-lg 제거, border 방향 변경)
→ className="flex items-center gap-3 px-3.5 py-2.5 border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
```

---

## 6. CoverageHeatmap.tsx

목업 CSS:
```css
/* treemap height: 210px ✅ */
.tm-cell { border-radius: 3px; padding: 4px; }    /* 현재 Recharts CustomContent rx=4 ✅ */
.tm-cell-name { font-size: 12px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,.2); }
.tm-cell-count { font-size: 10px; opacity: .8; }

/* legend: 목업에 12×12px 정사각형, gap: 12px, font-size: 11px */
```

---

**파일:** `widgets/CoverageHeatmap.tsx`
**위치:** L37–43 — 셀 이름 text 속성

```
현재: fontSize={11} fontWeight={600} style={{ textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
목업: font-size: 12px; font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,.2)
수정: fontSize={11} → fontSize={12}
      rgba(0,0,0,0.4) → rgba(0,0,0,0.2)
```

---

**파일:** `widgets/CoverageHeatmap.tsx`
**위치:** L42–50 — TC 수 / passRate 하단 text

```
현재:
  width > 100: `${item?.size ?? 0} TC · ${passRate}%`  fontSize={10} ✅
  width ≤ 100: `${passRate}%`  fontSize={9}
목업: .tm-cell-count { font-size: 10px; opacity: .8; }  — 항상 표시
수정: 두 번째 text 속성에 opacity 추가:
  fill="rgba(255,255,255,0.8)"  (현재 rgba(255,255,255,0.9))
  → fill="rgba(255,255,255,0.8)"
```

---

**파일:** `widgets/CoverageHeatmap.tsx`
**위치:** L173–187 — color legend

```
현재: gap-2 (8px)     legend dot: w-2.5 h-2.5 rounded-sm
목업: gap: 12px        legend: width: 12px; height: 12px; border-radius: 2px
수정:
  gap-2 → gap-3
  w-2.5 h-2.5 → w-3 h-3 (12px)
  rounded-sm → rounded-[2px]
```

---

## 7. TCQualityAnalysis.tsx

목업 CSS:
```css
/* 헤더 배지 */
/* font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; */

/* Area chart container */
/* height: 110px; background: #F8FAFC; border-radius: 8px; margin-bottom: 16px; */

/* 3-col grid: gap: 12px */

/* Priority label */
/* font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 8px; */

/* Priority donut */
/* width: 80px; height: 80px; outer r=40, inner r=25 */
/* .donut-inner { width: 50px; height: 50px; font-size: 14px; font-weight: 700; } */

/* Lifecycle bars */
/* bar height: 6px ✅ */
/* bar label: font-size: 11px; color: #475569; margin-bottom: 3px; */

/* Gauge label */
/* font-size: 11px; font-weight: 600; color: #64748B; margin-bottom: 8px; */
/* gauge value: font-size: 18px; font-weight: 700; */
/* sub text: font-size: 10px; color: #64748B; margin-top: 16px; */
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L239 — 헤더 배지

```
현재: text-[12px] font-semibold px-2.5 py-0.5 rounded-full
      font-semibold = font-weight: 600
목업: font-weight: 700; padding: 2px 10px;
      py-0.5 = 2px ✅  px-2.5 = 10px ✅
수정: font-semibold → font-bold (700)
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L248–256 — Area chart

```
현재: ResponsiveContainer height={100}
목업: height: 110px
수정: height={100} → height={110}
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L260 — 3-col grid

```
현재: className="grid grid-cols-3 gap-3"   (gap: 12px ✅)
목업: grid-template-columns: 1fr 1fr 1fr; gap: 12px ✅
수정: 이미 일치 — 변경 없음
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L265–283 — Priority Donut (Recharts PieChart)

```
현재: ResponsiveContainer width={80} height={80}
      innerRadius={20} outerRadius={38}   → pixel 단위: inner≈25px, outer≈47.5px
목업: .donut { width: 80px; height: 80px; }
      outer = 40px radius (80÷2), inner = 25px radius (50÷2)
수정: outerRadius={38} → outerRadius={40}
      innerRadius={20} → innerRadius={25}
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L99 — AutomationGauge 값 표시

```
현재: text-[17px] font-bold leading-none
목업: .gauge-val { font-size: 18px; font-weight: 700; bottom: 2px; }
수정: text-[17px] → text-[18px]
      bottom-0 → style={{ bottom: '2px' }}
```

---

**파일:** `widgets/TCQualityAnalysis.tsx`
**위치:** L103–105 — AutomationGauge 하단 서브텍스트

```
현재: text-[10px] text-gray-500 mt-1.5
목업: font-size: 10px; color: #64748B; margin-top: 16px  (gauge-label이 bottom:-10px 위치)
수정: mt-1.5 → mt-4
```

---

## 8. ActivityFeedTab.tsx

### FilterChips (L250–265)

목업 CSS:
```css
.filter-chips { display: flex; gap: 6px; padding: 0 20px 10px; flex-wrap: wrap; }
.chip { font-size: 12px; font-weight: 500; color: #6366F1;
        background: #EEF2FF; padding: 4px 10px; border-radius: 9999px; gap: 4px; }
.chip i { font-size: 12px; cursor: pointer; }
.chip-clear { font-size: 12px; font-weight: 600; color: #EF4444; }
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L251 — FilterChips wrapper

```
현재: className="flex items-center gap-2 px-5 py-2 flex-wrap border-b border-gray-100"
      gap-2 (8px)  py-2 (8px 상하)  border-b 있음
목업: padding: 0 20px 10px; gap: 6px; border 없음
수정:
  gap-2 → gap-1.5
  px-5 py-2 → px-5 pb-2.5 pt-0
  border-b border-gray-100 제거
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L253 — chip span

```
현재: bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-medium border border-indigo-100
      py-1 = 4px ✅  px-2.5 = 10px ✅  text-xs = 12px ✅  font-medium = 500 ✅
      border border-indigo-100 — 목업에 없음
목업: background: #EEF2FF; padding: 4px 10px; border-radius: 9999px (border 없음)
수정: border border-indigo-100 제거
→ className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-full text-xs font-medium"
  (gap-1 = 4px ✅)
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L261 — "초기화" 버튼

```
현재: text-xs text-gray-400 hover:text-gray-600
목업: .chip-clear { font-size: 12px; font-weight: 600; color: #EF4444; }
수정: text-xs text-gray-400 → text-[12px] font-semibold text-red-500 hover:text-red-700
```

---

### AIDailySummary (L167–202)

목업 CSS:
```css
.ai-summary { margin: 12px 20px; border-radius: 12px; padding: 18px 22px;
              background: linear-gradient(135deg, #F5F3FF, #EEF2FF);
              border: 1px solid #DDD6FE; }
.ai-summary-head { gap: 10px; margin-bottom: 12px; }
.ai-summary-head .ai-icon { font-size: 20px; }  /* 🤖 이모지 */
.ai-summary-head .ai-title { font-size: 15px; font-weight: 600; color: #0F172A; flex: 1; }
.ai-summary-body { font-size: 14px; color: #334155; line-height: 1.65; margin-bottom: 10px; }
.ai-summary-points li { font-size: 13px; color: #334155; margin-bottom: 4px; line-height: 1.5; }
.ai-summary-time { font-size: 11px; color: #94A3B8; text-align: right; }
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L168 — AIDailySummary 외부 wrapper

```
현재: mx-5 mt-3 mb-1 rounded-xl
목업: margin: 12px 20px; border-radius: 12px → rounded-xl = 12px ✅
      mx-5 = 20px ✅, mt-3 = 12px ✅, mb-1 = 4px (목업엔 없음)
수정: mb-1 제거 (필요시 mb-3으로)
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L171 — header button (px-4 py-3)

```
현재: px-4 py-3      (16px 12px)
목업: padding: 18px 22px (전체 카드의 padding)
수정: 헤더 버튼과 바디 분리 대신, 전체 padding 통일:
  wrapper에 px-[22px] py-[18px] 적용:
  → className="mx-5 mt-3 mb-2 rounded-xl overflow-hidden border border-violet-200" (padding 없음)
    헤더: className="w-full flex items-center justify-between px-[22px] pt-[18px] pb-3 cursor-pointer"
    바디: className="px-[22px] pb-[18px]"
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L174–179 — AI icon + title + Pro+ badge

```
현재: icon w-6 h-6 rounded-full bg-violet-500 (filled circle), title text-[13px] text-violet-800
목업: ai-icon font-size: 20px (🤖 이모지), ai-title font-size: 15px; font-weight: 600; color: #0F172A
수정:
  <div className="w-6 h-6 ..."> → <span className="text-[20px] leading-none">🤖</span>
  title: text-[13px] text-violet-800 → text-[15px] font-semibold text-gray-900
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L187–188 — summary body text

```
현재: text-[13px] text-violet-900 leading-relaxed   (leading-relaxed = 1.625)
목업: font-size: 14px; color: #334155; line-height: 1.65
수정: text-[13px] → text-[14px]
      text-violet-900 → text-gray-700 (color: #334155 ≈ gray-700)
      leading-relaxed → leading-[1.65]
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L191 — bullet points

```
현재: text-[12px] text-violet-800
목업: .ai-summary-points li { font-size: 13px; color: #334155; margin-bottom: 4px; line-height: 1.5; }
수정: text-[12px] → text-[13px]
      text-violet-800 → text-gray-700
      space-y-1 → space-y-1 (margin-bottom: 4px = space-y-1 ✅)
      add: leading-[1.5]
```

---

### FeedItem (L94–124)

목업 CSS:
```css
.feed-item { display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #F1F5F9; }
.feed-icon { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; }
.feed-icon i { font-size: 16px; }
.feed-main { font-size: 13px; color: #334155; line-height: 1.5; }
.feed-main strong { color: #0F172A; }
.feed-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
.feed-time { font-size: 11px; color: #94A3B8; }
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L94 — FeedItem wrapper

```
현재: px-4 py-3 gap-3      (16px 12px, gap 12px)
목업: padding: 12px 16px; gap: 12px   ✅ 일치
수정: 없음 ✅
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L99 — feed-icon 내 아이콘

```
현재: text-[14px]
목업: .feed-icon i { font-size: 16px; }
수정: text-[14px] → text-[16px]
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L103 — feed-main text

```
현재: text-[13px] text-gray-700 leading-relaxed   (1.625)
목업: font-size: 13px; color: #334155; line-height: 1.5  ✅ size/color
      line-height: 1.5 vs 1.625 ❌
수정: leading-relaxed → leading-[1.5]
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L108–110 — comment 블록

```
현재: mt-1 text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded border-l-2 border-gray-300
목업: .feed-note { font-size: 12px; color: #475569; margin-top: 4px; padding: 6px 10px;
                   background: #F8FAFC; border-radius: 6px; border-left: 2px solid #CBD5E1; }
수정:
  mt-1 → mt-1 (4px ✅)
  text-xs = 12px ✅
  px-2 py-1 = 8px 4px → px-2.5 py-1.5 (10px 6px)
  bg-gray-50 → bg-gray-50 ✅ (#F8FAFC ✅)
  rounded → rounded-md (6px)
  border-gray-300 → border-gray-200 (#CBD5E1에 가까움)
```

---

**파일:** `ActivityFeedTab.tsx`
**위치:** L112 — feed-sub / run name

```
현재: text-[11px] text-gray-400 mt-0.5
목업: .feed-sub { font-size: 12px; color: #94A3B8; margin-top: 2px; }
수정: text-[11px] → text-[12px]
      mt-0.5 (2px) ✅
```

---

## 9. TierGate.tsx

목업 CSS:
```css
.blur-content { filter: blur(5px); pointer-events: none; opacity: .6; }
.blur-lock { position: absolute; inset: 0; display: flex; flex-direction: column;
             align-items: center; justify-content: center; z-index: 10; gap: 8px; }
.blur-lock i { font-size: 32px; color: #8B5CF6; }
.blur-lock p { font-size: 14px; font-weight: 500; color: #334155; text-align: center; }
.blur-lock a { font-size: 13px; font-weight: 600; color: #6366F1; }
/* 주: blur-lock에 background 없음. 오버레이 배경 없이 콘텐츠 위에 아이콘만 */
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L19 — blur-content

```
현재: filter blur-[4px] pointer-events-none select-none opacity-50
목업: filter: blur(5px);  opacity: .6
수정: blur-[4px] → blur-[5px]
      opacity-50 → opacity-60
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L22 — overlay wrapper

```
현재: bg-white/60 backdrop-blur-sm
목업: 오버레이 배경 없음 (.blur-lock에 background 미지정)
수정: bg-white/60 backdrop-blur-sm 제거
→ className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-2"
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L23–25 — lock icon container + icon

```
현재: w-10 h-10 rounded-full bg-violet-100 안에 ri-lock-2-line text-xl text-violet-600
목업: 아이콘 직접 표시 (container 없음), ri-lock-fill, font-size: 32px, color: #8B5CF6
수정:
  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
    <i className="ri-lock-2-line text-xl text-violet-600" />
  </div>
→ 아래로 교체:
  <i className="ri-lock-fill text-[32px] text-violet-500" />
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L22 — gap

```
현재: gap-2.5 (10px)
목업: gap: 8px
수정: gap-2.5 → gap-2
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L26–29 — 텍스트 (featureName + 설명)

```
현재: text-[13px] font-semibold text-gray-800  /  text-[12px] text-gray-500
목업: .blur-lock p { font-size: 14px; font-weight: 500; color: #334155; text-align: center; }
수정:
  featureName: text-[13px] font-semibold → text-[14px] font-medium text-gray-700
  subtitle: text-[12px] text-gray-500 ✅ 유지
```

---

**파일:** `widgets/TierGate.tsx`
**위치:** L32–37 — 업그레이드 링크/버튼

```
현재: <a href="/settings" className="mt-1 px-4 py-1.5 text-[12px] font-semibold text-white bg-indigo-500 rounded-lg ...">
      (버튼 스타일)
목업: .blur-lock a { font-size: 13px; font-weight: 600; color: #6366F1; }
      (일반 텍스트 링크)
수정: 버튼 스타일 제거, 단순 링크로:
<a href="/settings" className="text-[13px] font-semibold text-indigo-500 hover:text-indigo-700 mt-1">
  업그레이드 →
</a>
```

---

## 수정 체크리스트

```
공통
[ ] C-01: 모든 위젯 body p-4 → px-5 py-4 (PassRateTrend는 p-5 유지)
[ ] C-02: 헤더 아이콘 text-[16px] 명시

PassRateTrend
[ ] P-01: KPI p-3.5 → px-4 py-3.5
[ ] P-02: tracking-wide → tracking-[.05em]
[ ] P-03: Bar opacity 0.6→0.5, Line dot r 3→3.5, strokeWidth 2→2.5

MilestoneTracker
[ ] M-01: 아이콘 ri-flag-2-fill text-amber-500
[ ] M-02: body p-4 → px-5 py-4
[ ] M-03: cards pb-2 → pb-1
[ ] M-04: card min-w-[190px] → min-w-[200px], p-3.5 → px-4 py-3.5
[ ] M-05: ms-name text-[13px] → text-[14px]
[ ] M-06: ms-meta text-[11px] → text-[12px]

ExecutionSummary
[ ] E-01: body p-4 → px-5 py-4
[ ] E-02: summary cell p-3 → p-2.5
[ ] E-03: summary value text-xl → text-[16px]
[ ] E-04: legend dot w-2 h-2 → w-1.5 h-1.5, mt-1.5 → mt-2
[ ] E-05: run card py-1 → py-2, border-b border-gray-100 last:border-b-0 추가
[ ] E-06: run name text-[12px] → text-[13px]
[ ] E-07: footer link text-center block py-2

TeamPerformance
[ ] T-01: 아이콘 ri-team-fill text-violet-500
[ ] T-02: YAxis width 90 → 70, fill '#374151' → '#334155'
[ ] T-03: rankings list space-y-2 → space-y-1.5

FlakyDetector
[ ] F-01: 아이콘 ri-bug-fill text-red-500
[ ] F-02: 위젯명 "Detector" → "Detection"
[ ] F-03: SequenceDots gap-1 → gap-[3px]
[ ] F-04: row card → border-b 스타일로 전환

CoverageHeatmap
[ ] CV-01: 셀 이름 fontSize 11 → 12, textShadow opacity .4 → .2
[ ] CV-02: TC count text rgba .9 → .8
[ ] CV-03: legend gap-2 → gap-3, dot w-2.5 h-2.5 → w-3 h-3, rounded-sm → rounded-[2px]

TCQualityAnalysis
[ ] Q-01: 헤더 배지 font-semibold → font-bold
[ ] Q-02: AreaChart height 100 → 110
[ ] Q-03: PieChart outerRadius 38→40, innerRadius 20→25
[ ] Q-04: gauge value text-[17px] → text-[18px], bottom-0 → style bottom:2px
[ ] Q-05: gauge sub text mt-1.5 → mt-4

ActivityFeedTab
[ ] A-01: FilterChips gap-2 → gap-1.5, py-2 → pb-2.5 pt-0, border-b 제거
[ ] A-02: chip border 제거, gap-1 ✅
[ ] A-03: "초기화" → text-[12px] font-semibold text-red-500
[ ] A-04: AIDailySummary inner padding → px-[22px] py-[18px]
[ ] A-05: AI icon 🤖 text-[20px], title text-[15px] text-gray-900
[ ] A-06: summary body text-[14px] text-gray-700 leading-[1.65]
[ ] A-07: points text-[13px] text-gray-700 leading-[1.5]
[ ] A-08: feed icon text-[14px] → text-[16px]
[ ] A-09: feed-main leading-relaxed → leading-[1.5]
[ ] A-10: comment px-2 py-1 → px-2.5 py-1.5, rounded → rounded-md
[ ] A-11: feed-sub text-[11px] → text-[12px]

TierGate
[ ] G-01: blur-[4px] → blur-[5px], opacity-50 → opacity-60
[ ] G-02: bg-white/60 backdrop-blur-sm 제거
[ ] G-03: 아이콘 → ri-lock-fill text-[32px] text-violet-500 (container 제거)
[ ] G-04: gap-2.5 → gap-2
[ ] G-05: featureName text-[14px] font-medium text-gray-700
[ ] G-06: 업그레이드 → 텍스트 링크 스타일
```

---

**총 수정 항목:** 40건
**분석 기준:** 목업 HTML CSS 인라인 값 직접 추출
**완료 후 QA 확인 요청 부탁드립니다.**
