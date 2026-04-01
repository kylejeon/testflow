# Dev2: PDF Export 2차 수정 지시 — QA 분석 결과

**발행일:** 2026-04-01
**전체 분석 보고서:** `qa-pdf-2nd-round-analysis.md` (프로젝트 루트)
**총 16건 (P0: 4, P1: 6, P2: 6)**

---

## 🔴 즉시 수정 (Sprint 1 — 30분 이내)

### 1. [P0-04] Appendix Status 컬럼 버그 (5분)
**파일:** `drawPage8Appendix.ts` L131-133

**현재 (버그):**
```typescript
const latestResult = (tc.latestResult || 'untested').toLowerCase();
const statusColor = statusColors[latestResult] || config.textLight;
const statusLabel = latestResult.charAt(0).toUpperCase() + latestResult.slice(1);
```

**수정:**
```typescript
const lifecycle = (tc.lifecycle_status || 'active').toLowerCase();
const lifecycleColors: Record<string, [number,number,number]> = {
  active: [16, 163, 127],
  draft: [99, 102, 241],
  deprecated: [148, 163, 184],
};
const statusColor: [number,number,number] = lifecycleColors[lifecycle] || config.textLight;
const statusLabel = lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1);
```

pdfDataPrep.ts에서 appendix TC에 `lifecycle_status` 필드가 포함되는지 확인. select에 없으면 추가.

### 2. [P2-01] KPI delta ▲/▼ 심볼 미표시 (5분)
**파일:** `drawPage1Cover.ts` L78-82

**원인:** helvetica 폰트가 ▲(U+25B2)/▼(U+25BC) 유니코드 미지원.

**즉시 수정 (ASCII 대체):**
```typescript
// L78:
delta: `${data.passRateDelta >= 0 ? '+' : '-'} ${Math.abs(data.passRateDelta).toFixed(1)}%`
// L79:
delta: `+ ${data.executedDelta}`
// L81:
delta: data.failedDelta >= 0 ? `- ${data.failedDelta}` : `+ ${Math.abs(data.failedDelta)}`
// L82:
delta: data.blockedDelta >= 0 ? `- ${data.blockedDelta}` : `+ ${Math.abs(data.blockedDelta)}`
```

drawPage3Trends.ts L119도 동일하게 수정:
```typescript
const changeSymbol = row.change > 0 ? '+' : row.change < 0 ? '-' : '—';
```

**향후:** NotoSansKR 폰트를 올바르게 재생성하여 유니코드 심볼 복원.

### 3. [P2-03] Priority Distribution 바 텍스트 겹침 (5분)
**파일:** `drawPage2Scorecard.ts` L99

**현재:**
```typescript
const barW = (pri.count / maxCount) * 120;
```

**수정 — 바 최대 너비를 100mm로 축소:**
```typescript
const barW = (pri.count / maxCount) * 100;
```

### 4. [P0-03] WoW "Last Week" 전부 0일 때 처리 (10분)
**파일:** `drawPage3Trends.ts` L99-144

**현재:** fallback 메시지 표시 후 테이블도 0 값으로 계속 렌더링됨.

**수정:** L100-106을 else 블록으로 감싸기:
```typescript
if (!hasLastWeekData) {
  pdf.setFont(font, 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...config.textLight);
  pdf.text('No previous week data available for comparison.', margin + 2, y + 5);
  y += 12;
} else {
  data.weekComparison.forEach((row, rowIndex) => {
    // ... 기존 L108-144 코드 전체를 여기로 이동
  });
  y += 8;
}
```

### 5. [P2-04] Velocity 차트 하단 여백 (3분)
**파일:** `drawPage3Trends.ts` L151

**현재:** `const velChartH = Math.min(50, 280 - y - 15);`
**수정:** `const velChartH = Math.min(45, 275 - y - 20);`

### 6. [P2-06] Failed TC title fallback (3분)
**파일:** `drawPage6Risk.ts` — Top Failed TCs 테이블에서 title 표시 부분

**수정:** title이 비어있을 때 fallback:
```typescript
const title = tc.title || tc.customId || `TC-${String(tc.id).slice(0, 8)}`;
```

---

## 🟡 이번 주 (Sprint 2)

### 7. [P0-01] Coverage 계산 검증 (1시간)
**파일:** `pdfDataPrep.ts`

**작업:**
1. DB에서 실제 데이터 확인:
   ```sql
   SELECT COUNT(*) as total, COUNT(DISTINCT CASE WHEN id IN (
     SELECT DISTINCT test_case_id FROM test_results WHERE status != 'untested'
   ) THEN id END) as tested FROM test_cases WHERE project_id = '<id>';
   ```
2. 만약 실제로 100%가 맞다면 CEO에게 확인
3. Cover의 Score Breakdown Coverage를 folderCoverage 평균으로 변경 검토:
   ```typescript
   const avgCoverage = folderCoverage.reduce((s, f) => s + (f.tested / f.totalTCs), 0) / folderCoverage.length * 100;
   ```

### 8. [P0-02] Automation Rate 확인 (30분)
**파일:** `pdfDataPrep.ts` L45-48

**작업:**
1. DB 확인: `SELECT is_automated, COUNT(*) FROM test_cases WHERE project_id = '...' GROUP BY is_automated;`
2. 모두 null이면 → "N/A" 표시 유지, sub 텍스트에 원인 설명 추가
3. test_cases 생성 시 is_automated 기본값 설정 검토

### 9. [P1-05] Team "Unknown" 해결 (1시간)
**파일:** `pdfDataPrep.ts` — prepareTeamMembers()

**작업:**
1. `SELECT DISTINCT author FROM test_results WHERE run_id IN (...) LIMIT 10;` 으로 author 형식 확인
2. author가 UUID라면 profiles 테이블 조인:
   ```typescript
   const { data: profiles } = await supabase.from('profiles').select('id, full_name');
   const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? []);
   const name = profileMap.get(r.author) || r.author || 'Unknown';
   ```
3. author가 아예 null이면 → 테스트 실행 시 author 저장 로직 확인

### 10. [P1-06] TOC/Footer 페이지 번호 (30분)
**파일:** `drawPage1Cover.ts` L148-161, `generateExecutiveReport.ts`

**작업:**
- TOC에서 appendix 항목을 "8. Test Case Appendix ... 8" 대신 "8-N" 형식으로 표시 (N = appendix 총 페이지)
- 또는 Footer의 "Page X of Y" 에서 Y를 기본 8페이지로 고정

### 11. [P1-02] Quality Gates y 오버플로우 (30분)
**파일:** `drawPage5Milestone.ts`

**작업:**
- `cardH = 50` → `cardH = 42`로 축소
- 또는 마일스톤 카드가 2행(4개)이면 Quality Gates가 들어갈 y 공간이 부족 → 카드 수를 2개로 제한하거나 카드 높이 축소

### 12. [P1-03] 마일스톤 카드 상세 정보 fallback (30분)
**파일:** `pdfDataPrep.ts` — prepareMilestoneCard()

**작업:**
- `dueDate` null 시 → "Not set"
- `velocity` 0 시 → "0.0 TC/day"
- `estCompletion` 계산 불가 시 → "N/A"

### 13. [P1-04] Coverage Gaps 보장 (30분)
**파일:** `drawPage6Risk.ts` L139

**작업:**
- 현재 `if (y < 250 && data.coverageGaps.length > 0)` — y가 250 넘으면 skip됨
- Top Failed/Flaky 표시 건수를 동적으로 줄여서 Coverage Gaps 공간 확보
- gap이 비어있으면 "All modules tested" 메시지 표시

---

## 🟢 다음 주 (Sprint 3)

### 14. [P1-01] Burndown 차트 실제 데이터 구현 (2-3시간)
**파일:** `pdfDataPrep.ts` + `drawPage5Milestone.ts` L73-103

**작업:**
1. `prepareBurndownData(milestone, results)` 함수 추가
   - 마일스톤 시작일~종료일 구간, 일별 "남은 TC" 계산
   - Ideal: 선형 감소 (totalTCs → 0)
   - Actual: 일별 완료 TC 누적 차감
2. Burndown 차트 렌더링:
   - Y축: 0 → totalTCs
   - Ideal: dashed gray line
   - Actual: solid indigo line with fill

---