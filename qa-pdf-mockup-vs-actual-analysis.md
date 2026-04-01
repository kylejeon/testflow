# QA 분석 보고서: PDF Export — 디자인 목업 vs 실제 출력물 비교

**보고일**: 2026-04-01
**보고자**: QA Engineer
**대상 코드**: `src/pages/project-detail/pdf/` 전체
**코드베이스**: `/Users/yonghyuk/testflow` (claude 브랜치)

---

## 요약

디자인 목업 HTML과 실제 PDF 출력물을 비교 분석한 결과, **P0 계산 버그 4건**, **P1 누락 기능 4건**, **P2 디자인 불일치 12건**을 확인했습니다.

가장 심각한 문제는 `pdfDataPrep.ts`의 `calculateExecutionCompletion()` 함수가 고유 TC 수가 아닌 전체 test_result 행 수를 세어 Coverage/Execution Completion이 100%를 초과하는 버그입니다.

---

## P0: 계산 로직 버그 (즉시 수정)

### BUG-01: Coverage / Execution Completion > 100% (228%, 227.5%)

**파일**: `pdfDataPrep.ts` L268-271
**현상**: P1 Coverage가 228%, P2 Execution Completion이 227.5%로 표시
**근본 원인**: `calculateExecutionCompletion()`이 전체 `test_result` 행 수를 세는데, 하나의 TC가 여러 Run에서 실행되면 중복 카운트됨

```typescript
// 현재 코드 (L268-271)
function calculateExecutionCompletion(dist, totalTCs) {
  const tested = dist.passed + dist.failed + dist.blocked + dist.retest;
  return totalTCs > 0 ? (tested / totalTCs) * 100 : 0;
  // tested = 전체 result 행 수 (중복 포함) → 30 TC에 68 results = 226.7%
}
```

**수정**:
```typescript
function calculateExecutionCompletion(
  dist: ReturnType<typeof getStatusDistribution>,
  totalTCs: number,
  results: any[]  // rawTestResults 추가 파라미터
): number {
  // 고유 TC 수 기준으로 계산
  const uniqueTestedTCs = new Set(
    results
      .filter(r => r.status && r.status !== 'untested')
      .map(r => r.test_case_id)
  ).size;
  return totalTCs > 0 ? Math.min((uniqueTestedTCs / totalTCs) * 100, 100) : 0;
}
```

**호출부 수정** (L29):
```typescript
const executionComplete = calculateExecutionCompletion(statusCounts, testCaseCount, rawTestResults);
```

**영향 범위**: P1 Score Breakdown "Coverage (20%)", P2 "Execution Completion" KPI, P5 Quality Gates "Coverage >= 80%" 판정, Release Score 계산 전체

---

### BUG-02: coverageRate = executionComplete (동일 버그 전파)

**파일**: `pdfDataPrep.ts` L99
**현상**: `coverageRate`가 `executionComplete`와 동일한 값(228%) 사용

```typescript
// 현재 코드 (L99)
const coverageRate = executionComplete;
```

BUG-01 수정 시 자동으로 해결되지만, `coverageRate`의 정의가 "실행 완료율"과 동일한 게 맞는지 검토 필요.
목업에서 Coverage는 "테스트된 TC 비율"이므로 BUG-01 수정으로 충분.

---

### BUG-03: Module Coverage 바가 모두 100%

**파일**: `drawPage4Execution.ts` L168, L189
**현상**: P4 Module Coverage 테이블의 Coverage Bar가 모든 모듈에서 100%
**근본 원인**: Coverage Bar가 `coveragePct = tested / totalTCs * 100` (해당 모듈의 "한 번이라도 테스트된 TC 비율")을 표시함. 모든 TC가 한 번이라도 실행되었으면 100%.

**목업과의 차이**: 목업의 Coverage Bar는 **Pass Rate** 값을 시각화함 (Authentication 95.2%, Payment 84.2% 등). 코드의 Coverage bar는 "테스트 여부"만 반영.

**수정** (`drawPage4Execution.ts` L168):
```typescript
// 현재
const coveragePct = folder.totalTCs > 0 ? (folder.tested / folder.totalTCs) * 100 : 0;

// 수정: Pass Rate를 bar에 반영 (목업 일치)
const coveragePct = folder.passRate;
```

또는 더 정확하게, bar의 의미를 "모듈 커버리지 = 테스트된 비율 × 통과율"로 변경:
```typescript
const testedPct = folder.totalTCs > 0 ? (folder.tested / folder.totalTCs) * 100 : 0;
const coveragePct = testedPct * (folder.passRate / 100);
```

**권장**: 목업과 일치시키려면 `folder.passRate` 사용. bar 옆의 퍼센트 라벨도 동일하게 수정 (L197).

---

### BUG-04: Automation Rate 0.0%

**파일**: `pdfDataPrep.ts` L40-41
**현상**: P2 Automation Rate가 0.0%
**근본 원인**: `testCases.filter(tc => tc.is_automated).length` — TC 테이블에 `is_automated` 필드가 없거나 모두 `false`/`null`

```typescript
const automatedCount = testCases.filter((tc: any) => tc.is_automated).length;
```

**확인 필요**: Supabase `test_cases` 테이블에 `is_automated` 컬럼이 실제로 존재하는지 확인. 없으면 다른 기준(tags, prefix 등)으로 판별하는 로직 필요.

**임시 수정**: 컬럼이 없으면 0%를 표시하되, KPI 카드에 "N/A" 또는 "Not tracked" 표시:
```typescript
const automatedCount = testCases.filter((tc: any) => tc.is_automated === true).length;
const automationRate = testCaseCount > 0 && testCases.some((tc: any) => 'is_automated' in tc)
  ? (automatedCount / testCaseCount) * 100
  : -1; // -1 = not available
```

---

## P1: 누락 기능 (이번 주 내 구현)

### MISS-01: P3 Pass Rate 차트 — 보조 Execution Count 라인 + 우측 Y축 누락

**파일**: `drawPage3Trends.ts` L40-66
**현상**: 차트에 Pass Rate 라인만 있고, 목업의 점선 Execution Count 보조 라인과 우측 Y축이 없음

**구현 필요**:
```typescript
// Pass Rate 라인 이후에 추가 (L54 뒤)
// Secondary: Execution Count (dashed gray line)
const maxExec = Math.max(...dailyData.map(d => d.execCount), 1);
if (dailyData.length > 1) {
  pdf.setDrawColor(100, 116, 139); // gray
  pdf.setLineWidth(0.4);
  pdf.setLineDashPattern([2, 1], 0);
  let prevX2 = 0, prevY2 = 0;
  dailyData.forEach((day, i) => {
    const x = chartX + (i / Math.max(dailyData.length - 1, 1)) * chartW;
    const dy = chartY + chartH - (day.execCount / maxExec) * chartH;
    if (i > 0) pdf.line(prevX2, prevY2, x, dy);
    prevX2 = x; prevY2 = dy;
  });
  pdf.setLineDashPattern([], 0);

  // Right Y-axis labels
  pdf.setFontSize(7);
  pdf.setTextColor(100, 116, 139);
  [0, maxExec/2, maxExec].forEach((val, i) => {
    const gy = chartY + chartH - (val / maxExec) * chartH;
    pdf.text(String(Math.round(val)), chartX + chartW + 2, gy + 1);
  });
}
```

**범례 추가** (L67 뒤):
```typescript
pdf.setFontSize(7);
pdf.setTextColor(100, 116, 139);
pdf.text('── Pass Rate    ···· Execution Count', chartX + chartW / 2, chartY + chartH + 10, { align: 'center' });
```

---

### MISS-02: P5 Burndown 차트 — 플레이스홀더만 표시

**파일**: `pdfDataPrep.ts` L242, `drawPage5Milestone.ts` L73-101
**현상**: Burndown 차트에 "Burndown chart — tracking velocity data" 텍스트만 표시
**근본 원인**: `burndownData: []` 하드코딩 (L242)

**구현 필요** (`pdfDataPrep.ts`에 함수 추가):
```typescript
function prepareBurndownData(
  milestoneCard: MilestoneCard,
  allRunsRaw: any[],
  rawTestResults: any[],
): BurndownPoint[] {
  if (!milestoneCard || milestoneCard.status === 'Completed') return [];

  const mRuns = allRunsRaw.filter(r => r.milestone_id === milestoneCard.id);
  const mRunIds = new Set(mRuns.map(r => r.id));
  const totalTCs = mRuns.reduce((sum, r) => sum + (r.test_case_ids?.length || 0), 0);
  if (totalTCs === 0) return [];

  // Group results by date
  const dateMap = new Map<string, number>();
  rawTestResults
    .filter(r => mRunIds.has(r.run_id) && r.status !== 'untested')
    .forEach(r => {
      const key = new Date(r.created_at).toISOString().split('T')[0];
      dateMap.set(key, (dateMap.get(key) || 0) + 1);
    });

  // Build cumulative burndown
  const sortedDates = [...dateMap.keys()].sort();
  let cumulative = 0;
  const points: BurndownPoint[] = [];
  sortedDates.forEach(date => {
    cumulative += dateMap.get(date)!;
    points.push({ date, remaining: Math.max(totalTCs - cumulative, 0), isActual: true, isIdeal: false });
  });

  return points;
}
```

**drawPage5Milestone.ts L94-99 교체** (플레이스홀더 → 실제 차트):
```typescript
// Actual burndown line
if (data.burndownData.length > 1) {
  const maxR = data.burndownData[0].remaining;
  pdf.setDrawColor(...config.primaryColor);
  pdf.setLineWidth(0.7);
  let pX = 0, pY2 = 0;
  data.burndownData.forEach((pt, i) => {
    const x = margin + (i / Math.max(data.burndownData.length - 1, 1)) * burnW;
    const dy = y + (1 - pt.remaining / Math.max(maxR, 1)) * burnH;
    if (i > 0) pdf.line(pX, pY2, x, dy);
    pdf.setFillColor(...config.primaryColor);
    pdf.circle(x, dy, 0.8, 'F');
    pX = x; pY2 = dy;
  });
}
```

---

### MISS-03: P5 Quality Gates 테이블 렌더링 확인

**파일**: `drawPage5Milestone.ts` L105-171
**현상**: CEO 보고에서 Quality Gates 테이블 누락
**코드 분석**: 코드 자체는 존재함. `if (y < 265)` 가드가 있어 상단 콘텐츠가 길면 잘릴 수 있음.

**확인 사항**:
1. `tierLevel >= 3`일 때 Burndown 플레이스홀더가 공간을 차지하여 Quality Gates가 밀려남
2. milestoneCards가 4개(2×2)면 y ≈ 139 + 60(번다운) + 8 = 207 → Quality Gates 렌더링 가능
3. 하지만 1개 milestone + burndown이면 y ≈ 83 + 60 + 8 = 151 → 충분히 가능

**수정 (안전장치)**: Quality Gates가 반드시 렌더링되도록 `y < 265` 조건 완화 또는 페이지 오버플로 시 다음 페이지 이동:
```typescript
// L106 수정
if (data.qualityGates.length > 0) {
  if (y > 235) {
    // Not enough space — force render at minimum position
    y = 235;
  }
  drawSectionTitle(pdf, 'Quality Gates', margin, y, config);
  // ...
}
```

---

### MISS-04: P6 Coverage Gaps 테이블 렌더링 확인

**파일**: `drawPage6Risk.ts` L138-196
**현상**: CEO 보고에서 Coverage Gaps 테이블 누락
**코드 분석**: `if (y < 250 && data.coverageGaps.length > 0)` 가드. Failed TCs (10행) + Flaky TCs (5행)가 많으면 y > 250이 될 수 있음.

**계산**: Failed 10행 × 8mm = 80mm, Flaky 5행 × 10mm = 50mm → 18 + 5 + 80 + 8 + 5 + 50 + 8 = 174mm. y ≈ 174 → y < 250 → 렌더링 가능.

**하지만** coverageGaps가 비어있을 수 있음. BUG-03에서 모든 TC가 tested면 untested = 0 → `folderCoverage.filter(f => f.untested > 0)` = 빈 배열 → Coverage Gaps 미표시.

**수정**: BUG-01/BUG-03 수정 후 자동 해결될 가능성 높음. 추가로, untested가 0이어도 pass rate가 낮은 모듈을 "Low Pass Rate" 경고로 표시하는 것을 고려.

---

## P2: 디자인 불일치 (Sprint 내 수정)

### STYLE-01: P1 KPI Delta에 ▲/▼ 기호 미표시

**파일**: `drawPage1Cover.ts` L78-83
**현상**: Delta 값이 "+91", "+20" 등 숫자만 표시되고 ▲/▼ 삼각형 기호가 렌더링되지 않음
**근본 원인**: Helvetica 폰트(WinAnsiEncoding)가 ▲(U+25B2)/▼(U+25BC) 문자를 지원하지 않음. NotoSansKR 폰트 파일이 손상되어 helvetica로 폴백됨.

**수정 (2가지 중 택 1)**:

Option A — 폰트 파일 재생성 (영구 해결):
```bash
# Google Fonts에서 NotoSansKR TTF 다운로드 → base64 인코딩
curl -o NotoSansKR-Regular.ttf "https://fonts.google.com/..."
base64 NotoSansKR-Regular.ttf > encoded.txt
# → src/assets/fonts/NotoSansKR-Regular.ts 에 적용
```

Option B — ASCII 대체 문자 사용:
```typescript
// drawPage1Cover.ts L78 등
delta: `${data.passRateDelta >= 0 ? '+' : '-'} ${Math.abs(data.passRateDelta)}%`,
// ▲/▼ 대신 +/- 또는 ↑/↓(역시 WinAnsi 미지원) 사용
// 또는 jsPDF의 triangle 그리기로 대체:
function drawDeltaArrow(pdf, x, y, up: boolean, color: [number,number,number]) {
  pdf.setFillColor(...color);
  if (up) {
    pdf.triangle(x, y, x + 2, y - 3, x + 4, y, 'F');
  } else {
    pdf.triangle(x, y - 3, x + 2, y, x + 4, y - 3, 'F');
  }
}
```

**권장**: Option A가 한국어 지원 + 특수문자 해결 모두 가능. 현재 폰트 파일 재생성은 별도 이슈(이전 QA 보고서 참조)로 진행 중이므로, 즉시 Option B를 적용하고 폰트 수정 후 Option A로 전환.

---

### STYLE-02: P2 섹션 제목 불일치

**파일**: `drawPage2Scorecard.ts` L53
**현상**: "Key Metrics" | **목업**: "Key Performance Indicators"

**수정**:
```typescript
drawSectionTitle(pdf, 'Key Performance Indicators', margin, y, config);
```

---

### STYLE-03: P2 KPI 카드 Target 달성 표시 누락

**파일**: `drawPage2Scorecard.ts` L59-66
**현상**: KPI 카드에 "Target: 90%" 텍스트만 있고 ✅/⚠️ 달성 여부 표시 없음
**목업**: "Target: 90% ✅", "Target: 95% ⚠️" 형태

**수정**: KPI sub 텍스트에 달성 여부 기호 추가:
```typescript
const kpiItems = [
  {
    label: 'Overall Pass Rate',
    value: `${data.passRate.toFixed(1)}%`,
    sub: `Target: 90% ${data.passRate >= 90 ? '(Met)' : '(Below)'}`,
    // ✅/⚠️는 helvetica에서 렌더링 불가 → 텍스트 또는 원형 아이콘으로 대체
    targetMet: data.passRate >= 90,
    ...
  },
  {
    label: 'Execution Completion',
    value: `${data.executionComplete.toFixed(1)}%`,
    sub: `Target: 95% ${data.executionComplete >= 95 ? '(Met)' : '(Below)'}`,
    targetMet: data.executionComplete >= 95,
    ...
  },
];
```

달성 여부를 원형 아이콘으로 그리기:
```typescript
// drawKpiCard 함수 내부 또는 호출 후
if (card.targetMet !== undefined) {
  const iconColor = card.targetMet ? config.successColor : config.warningColor;
  pdf.setFillColor(...iconColor);
  pdf.circle(x + kpiW - 5, cy + kpiH - 5, 2, 'F');
  pdf.setFont(font, 'bold');
  pdf.setFontSize(6);
  pdf.setTextColor(255, 255, 255);
  pdf.text(card.targetMet ? 'O' : '!', x + kpiW - 5, cy + kpiH - 4, { align: 'center' });
}
```

---

### STYLE-04: P4 Run Status에 색상 원(●) 누락

**파일**: `drawPage4Execution.ts` L107-109
**현상**: Status 텍스트만 색상으로 표시, 목업의 "● Active" 형태의 원형 마커 없음

**수정** (L107-109 교체):
```typescript
// Status cell with dot
const statusColor = statusColors[(run.status || 'active').toLowerCase()] || config.textLight;
const isActive = ['active', 'in_progress', 'new'].includes((run.status || '').toLowerCase());
if (isActive) {
  pdf.setFillColor(...statusColor);
  pdf.circle(cx + 3, rowY + 4.5, 1.2, 'F');
  pdf.setTextColor(...statusColor);
  pdf.setFont(font, 'bold');
  pdf.text(String(run.status || '-'), cx + 6, rowY + 5.5);
} else {
  pdf.setTextColor(...statusColor);
  pdf.setFont(font, 'bold');
  pdf.text(String(run.status || '-'), cx + 1.5, rowY + 5.5);
}
cx += colWidths[3];
```

---

### STYLE-05: P6 TC ID가 UUID 형식으로 표시

**파일**: `drawPage6Risk.ts` L45, L52-53
**현상**: TC ID가 "54190c7d-e" (잘린 UUID) | **목업**: "TC-0147" 형식

**근본 원인**: `failedTCs[].id`가 Supabase UUID. 목업의 "TC-XXXX"는 디자인 예시이며, 실제 데이터는 UUID.

**수정 옵션**:

Option A — TC 테이블에 `sequence_number` 컬럼이 있으면 사용:
```typescript
// pdfDataPrep.ts prepareTopFailedTCs 내부
id: tc?.sequence_number ? `TC-${String(tc.sequence_number).padStart(4, '0')}` : tcId.slice(0, 8),
```

Option B — UUID를 짧게 표시 (8자):
```typescript
// drawPage6Risk.ts L45
const idText = tc.id.length > 8 ? tc.id.slice(0, 8) + '...' : tc.id;
// → "54190c7d..."
```

Option C — 행 번호 기반 ID 생성:
```typescript
const idText = `TC-${String(i + 1).padStart(4, '0')}`;
```

**권장**: Option A (sequence_number가 있으면) 또는 Option B (현실적 대안)

---

### STYLE-06: P7 Member 이름이 "Unknown"

**파일**: `pdfDataPrep.ts` L490-491
**현상**: P7 Team Performance에 모든 멤버가 "Unknown"
**근본 원인**: `test_results.author` 필드가 비어있거나 null

```typescript
const author = String(r.author || 'Unknown');
```

**수정**: author가 없으면 profile에서 매핑 시도:
```typescript
// preparePdfData 함수 초반에 프로필 조회 추가
const { data: profiles } = await supabase
  .from('profiles')
  .select('id, full_name');
const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Unknown']));

// prepareTeamMembers 수정
function prepareTeamMembers(results: any[], profileMap: Map<string, string>): TeamMember[] {
  // ...
  const author = r.author || profileMap.get(r.user_id) || 'Unknown';
  // ...
}
```

---

### STYLE-07: P3 WoW Last Week 값이 모두 0

**파일**: `pdfDataPrep.ts` L305-337
**현상**: Week-over-Week 테이블의 Last Week 컬럼이 모두 0
**근본 원인**: 데이터 문제. `twoWeeksAgo ~ oneWeekAgo` 기간에 test_result가 없음.

**코드 자체는 정상**. 데이터가 최근 1주일에만 집중되어 있으면 자연스러운 결과.
**개선**: Last Week가 모두 0이면 "No previous week data" 메시지를 테이블에 표시:
```typescript
const hasLastWeekData = metrics.some(m => m.lastWeek > 0);
if (!hasLastWeekData) {
  // WoW 테이블 하단에 안내 메시지 추가
  pdf.setFont(font, 'normal');
  pdf.setFontSize(7);
  pdf.setTextColor(...config.textLight);
  pdf.text('* No data from previous week for comparison', margin, y + 5);
}
```

---

### STYLE-08: P2 Project Information — 2열 테이블 vs 박스 형태

**파일**: `drawPage2Scorecard.ts` L114-144
**현상**: 목업은 2열 key-value 테이블 | PDF는 라운드 박스 안에 2열 레이아웃
**분석**: 현재 구현이 목업보다 시각적으로 나은 형태. **수정 불필요** — 디자인 개선으로 볼 수 있음. CEO 확인 후 결정.

---

### STYLE-09: P5 Milestone 카드 상세 정보 — Velocity/Est. Completion 누락

**파일**: `drawPage5Milestone.ts` L56-68
**현상**: 카드에 Due date, Remaining, Velocity, Est. Completion 모두 표시됨
**분석**: 코드 확인 결과 상세 정보가 **코드에는 포함**되어 있음(L62-67). CEO가 1개 카드만 봤을 때 내용이 작아서 놓쳤을 가능성.

**확인 필요**: 실제 렌더링에서 폰트 크기(8pt)가 너무 작아 보이지 않는지 확인. 폰트 사이즈 9pt로 올리는 것 고려.

---

### STYLE-10: P8 페이지 번호 오류 — "Page 8 of 8" (실제 9페이지)

**파일**: `generateExecutiveReport.ts` L52-55
**현상**: TC Appendix가 2페이지로 넘치지만 "Page 8 of 8"로 표시
**근본 원인**: `totalPages`가 TC 수와 무관하게 고정(8 또는 6). Appendix가 자동 페이지 분할될 때 totalPages 미갱신.

**수정**: drawPage8Appendix에서 pageBreak 시 totalPages를 미리 계산:
```typescript
// generateExecutiveReport.ts L52-55 수정
// TC Appendix 행 수로 추가 페이지 계산
const tcRows = data.testCases?.length || 0;
const tcRowsPerPage = 25; // 대략적 값
const appendixPages = Math.max(1, Math.ceil(tcRows / tcRowsPerPage));
let totalPages = tierLevel < 3 ? 5 + appendixPages : 7 + appendixPages;
```

---

### STYLE-11: P6 Flaky Score에 ⚠️ 아이콘 vs "(Medium)" 텍스트

**파일**: `drawPage6Risk.ts` L133
**현상**: Score 컬럼에 "67% (Medium)" | 목업: "67% ⚠️"
**근본 원인**: ⚠️ 이모지는 helvetica에서 렌더링 불가

**수정**: `(frequency)` 텍스트는 유지하되, 경고 삼각형을 jsPDF로 그리기:
```typescript
// L133 이후
if (tc.flakyScore >= 50) {
  const warnX = flcx + 1.5 + pdf.getTextWidth(`${tc.flakyScore}% (${tc.frequency})`) + 3;
  pdf.setFillColor(...config.warningColor);
  pdf.triangle(warnX, rowY + 2, warnX + 1.5, rowY + 6, warnX + 3, rowY + 2, 'F');
  pdf.setFontSize(5);
  pdf.setTextColor(255, 255, 255);
  pdf.text('!', warnX + 1.5, rowY + 5, { align: 'center' });
}
```

---

### STYLE-12: P8 TC Appendix Status 컬럼 — lifecycle 상태 vs 실행 결과 상태

**파일**: `drawPage8Appendix.ts` L124-131
**현상**: Status 컬럼이 lifecycle_status (Active/Draft/Deprecated)를 표시 | **목업**: test result status (Passed/Failed/Blocked/Untested) 표시
**근본 원인**: Appendix가 `tc.lifecycle_status`를 사용하지만, 목업은 각 TC의 최신 실행 결과를 표시

**수정**: pdfDataPrep에서 testCases에 최신 결과 상태를 미리 매핑:
```typescript
// pdfDataPrep.ts - testCases에 latestResult 추가
testCases.forEach((tc: any) => {
  tc.latestResult = latestByTC.get(tc.id) || 'untested';
});
```

```typescript
// drawPage8Appendix.ts L124-131 수정
const resultStatusColors: Record<string, [number,number,number]> = {
  passed: [16, 163, 127],
  failed: [239, 68, 68],
  blocked: [249, 115, 22],
  retest: [234, 179, 8],
  untested: [148, 163, 184],
};
const resultStatus = tc.latestResult || 'untested';
const statusColor = resultStatusColors[resultStatus] || config.textLight;
const statusLabel = resultStatus.charAt(0).toUpperCase() + resultStatus.slice(1);
```

---

### STYLE-13: P1 TOC 페이지 번호 — tier < 3일 때 P6/P7 스킵 미반영

**파일**: `drawPage1Cover.ts` L144-161
**현상**: TOC에 항상 8개 항목이 고정 표시. tier < 3이면 Risk Assessment(P6)과 Team Performance(P7)이 생략되지만 TOC에는 남아있음.

**수정**:
```typescript
const tocItems = tierLevel >= 3
  ? ['Executive Summary', 'Quality Scorecard', 'Quality Trends', 'Test Execution Detail',
     'Milestone & Release Readiness', 'Risk Assessment', 'Team Performance', 'Test Case Appendix']
  : ['Executive Summary', 'Quality Scorecard', 'Quality Trends', 'Test Execution Detail',
     'Milestone & Release Readiness', 'Test Case Appendix'];
```

---

## 수정 우선순위 요약

| # | ID | 심각도 | 파일 | 설명 |
|---|-----|--------|------|------|
| 1 | BUG-01 | **P0** | pdfDataPrep.ts L268-271 | Execution Completion > 100% (고유 TC 카운트) |
| 2 | BUG-02 | **P0** | pdfDataPrep.ts L99 | coverageRate = executionComplete (동일 버그) |
| 3 | BUG-03 | **P0** | drawPage4Execution.ts L168 | Module Coverage bar 100% (passRate 사용해야) |
| 4 | BUG-04 | **P0** | pdfDataPrep.ts L40-41 | Automation Rate 0% (is_automated 필드 확인) |
| 5 | MISS-01 | **P1** | drawPage3Trends.ts L40-66 | 보조 Execution Count 라인 + 우측 Y축 |
| 6 | MISS-02 | **P1** | pdfDataPrep.ts L242, drawPage5 | Burndown 차트 실제 데이터 구현 |
| 7 | MISS-03 | **P1** | drawPage5Milestone.ts L105 | Quality Gates 렌더링 보장 |
| 8 | MISS-04 | **P1** | drawPage6Risk.ts L138 | Coverage Gaps (BUG-01 수정 후 자동 해결 가능) |
| 9 | STYLE-01 | **P2** | drawPage1Cover.ts L78 | ▲/▼ 기호 → 삼각형 그리기 대체 |
| 10 | STYLE-02 | **P2** | drawPage2Scorecard.ts L53 | "Key Metrics" → "Key Performance Indicators" |
| 11 | STYLE-03 | **P2** | drawPage2Scorecard.ts L59-66 | Target 달성 표시 (✅/⚠️) 추가 |
| 12 | STYLE-04 | **P2** | drawPage4Execution.ts L107 | Status 원(●) 마커 추가 |
| 13 | STYLE-05 | **P2** | drawPage6Risk.ts L45 | TC ID 형식 (UUID → 짧은 형식) |
| 14 | STYLE-06 | **P2** | pdfDataPrep.ts L490 | Member "Unknown" → profile 매핑 |
| 15 | STYLE-07 | **P2** | drawPage3Trends.ts | WoW Last Week 0일 때 안내 메시지 |
| 16 | STYLE-10 | **P2** | generateExecutiveReport.ts L52 | 총 페이지 수 동적 계산 |
| 17 | STYLE-11 | **P2** | drawPage6Risk.ts L133 | Flaky ⚠️ → 삼각형 아이콘 |
| 18 | STYLE-12 | **P2** | drawPage1Cover.ts L144 | TOC tier별 항목 조정 |

---

## 검증 체크리스트

- [ ] Coverage / Execution Completion이 0~100% 범위 내인지 확인
- [ ] Module Coverage bar가 passRate를 반영하는지 확인
- [ ] P3 차트에 보조 라인 + 우측 Y축 표시되는지 확인
- [ ] P5 Burndown에 실제 데이터 포인트 표시되는지 확인
- [ ] P5 Quality Gates 테이블이 항상 렌더링되는지 확인
- [ ] P6 Coverage Gaps 테이블이 표시되는지 확인
- [ ] Delta 화살표(▲/▼)가 PDF에 렌더링되는지 확인
- [ ] Member 이름이 실제 이름으로 표시되는지 확인
- [ ] TC ID가 읽기 좋은 형식인지 확인
- [ ] 총 페이지 수가 정확한지 확인
- [ ] Free/Starter/Professional 각 tier에서 정상 동작 확인
