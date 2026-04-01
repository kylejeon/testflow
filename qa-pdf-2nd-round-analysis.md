# QA: 2차 PDF Export 비교 분석 — 디자인 목업 vs 실제 PDF 출력물

**분석일:** 2026-04-01
**새 PDF:** `connevosuitequalityreport20260401_2.pdf` (CEO 제공, 9페이지)
**디자인 목업:** `desi/dashboard-export-pdf-mockup.html` (8 Screens)
**코드:** `src/pages/project-detail/pdf/` 폴더
**분석자:** QA

---

## 요약

| 등급 | 건수 | 설명 |
|------|------|------|
| **P0 — 계산 버그/데이터 오류** | 4건 | Coverage 100% 표시, Automation Rate 0%, WoW Last Week 전부 0, Appendix Status 컬럼 오류 |
| **P1 — 미구현/누락 기능** | 6건 | Burndown 차트, Quality Gates 렌더링, 마일스톤 상세 정보, Coverage Gaps, Team Unknown, TOC 페이지 수 |
| **P2 — 스타일/레이아웃** | 6건 | KPI ▲/▼ 심볼 표시, 폰트 크기, Priority bar 텍스트 겹침, 차트 하단 여백, P2 섹션 제목, Viewer 0% 표시 |
| **합계** | **16건** | |

**1차 대비:** 22건 중 6건 수정됨, 16건 잔여 + 신규 발견 포함

---

## P0 — Critical (계산 버그/데이터 오류)

### P0-01. Coverage Rate 여전히 비정상 (100% 표시)

- **증상:** Cover 페이지 Score Breakdown의 Coverage가 100%로 표시. 이전 228%에서 100%로 개선(cap 적용)되었지만, **실제 프로젝트에서 모든 TC가 1회 이상 실행됐다고 보기 어려움**.
- **근본 원인:** `pdfDataPrep.ts` L275-282의 `calculateExecutionCompletion()`:
  ```typescript
  const uniqueTestedTCs = new Set(
    results.filter(r => r.status && r.status !== 'untested').map(r => r.test_case_id)
  ).size;
  return Math.min((uniqueTestedTCs / totalTCs) * 100, 100);
  ```
  이 함수는 **모든 Run의 결과를 합산**하여 고유 TC를 계산함. 즉, Run A에서 TC-1을 테스트하고 Run B에서도 TC-1을 테스트하면 1건으로 카운트됨 — 이것 자체는 맞음. 그러나 **문제는 `results`에 모든 Run의 결과가 포함**되어 40개 TC 중 40개가 모두 한 번씩이라도 실행되었다면 100%가 정상.
- **확인 필요:** CEO가 "여전히 비정상"이라고 했으므로, 실제로 미실행 TC가 있는지 DB 확인 필요:
  ```sql
  SELECT COUNT(*) as total_tcs,
    COUNT(DISTINCT CASE WHEN id IN (
      SELECT DISTINCT test_case_id FROM test_results WHERE status != 'untested'
    ) THEN id END) as tested_tcs
  FROM test_cases WHERE project_id = '<project_id>';
  ```
- **수정:** Coverage 계산에 **현재 활성 Run 기준**으로 한정하는 옵션 추가, 또는 **Cover 페이지의 Score Breakdown에서 Coverage는 `folderCoverage` 평균을 사용**하여 모듈별 미실행을 반영:
  ```typescript
  // pdfDataPrep.ts — calculateCoverageForScore() 추가
  function calculateCoverageForScore(folderCoverage: FolderCoverage[]): number {
    const totalTCs = folderCoverage.reduce((s, f) => s + f.totalTCs, 0);
    const testedTCs = folderCoverage.reduce((s, f) => s + f.tested, 0);
    return totalTCs > 0 ? (testedTCs / totalTCs) * 100 : 0;
  }
  ```

### P0-02. Automation Rate 여전히 0.0% (또는 N/A)

- **증상:** P2 Quality Scorecard의 Automation Rate가 0.0%로 표시. 목업은 62%.
- **근본 원인:** `pdfDataPrep.ts` L46-48:
  ```typescript
  const hasAutomationField = testCases.some(tc => tc.is_automated !== undefined && tc.is_automated !== null);
  const automatedCount = testCases.filter(tc => tc.is_automated === true).length;
  const automationRate = !hasAutomationField ? -1 : (automatedCount / testCaseCount) * 100;
  ```
  - `is_automated` 필드가 DB에 존재하지만 값이 모두 `null`이면 → `hasAutomationField = false` → `-1` → "N/A" 표시
  - `is_automated` 필드가 존재하고 모두 `false`이면 → `0%` 표시
- **수정:**
  1. **DB 확인:** `SELECT is_automated, COUNT(*) FROM test_cases WHERE project_id = '...' GROUP BY is_automated;`
  2. **코드 수정:** `is_automated` 컬럼이 실제 사용되지 않는다면, **N/A로 표시하되 목업처럼 "No data"가 아닌 명시적 안내** 추가
  3. `drawPage2Scorecard.ts` L63: `data.automationRate < 0 ? 'N/A' : ...` — 현재 로직은 OK이나, **P2의 KPI 카드에 `sub` 텍스트로 원인 설명** 추가:
     ```typescript
     { label: 'Automation Rate',
       value: data.automationRate < 0 ? 'N/A' : `${data.automationRate.toFixed(1)}%`,
       sub: data.automationRate < 0 ? 'is_automated 필드 미설정' : `${automatedCount} / ${totalTCs} TCs` }
     ```

### P0-03. WoW "Last Week" 값 전부 0

- **증상:** P3 Quality Trends의 Week-over-Week 테이블에서 "Last Week" 컬럼이 모든 행에서 0.
- **근본 원인:** `pdfDataPrep.ts` L316-348의 `prepareWeekComparison()`:
  ```typescript
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const lastWeek = results.filter(r => {
    const d = new Date(r.created_at);
    return d >= twoWeeksAgo && d < oneWeekAgo;
  });
  ```
  **로직 자체는 정확**하지만, 테스트 결과가 7~14일 전 기간에 실제로 존재하지 않으면 모두 0. 이것은 **데이터 문제**일 가능성이 높으나, `drawPage3Trends.ts` L99-106에서 이미 처리:
  ```typescript
  const hasLastWeekData = data.weekComparison.some(row => row.lastWeek !== 0);
  if (!hasLastWeekData) {
    pdf.text('No previous week data available for comparison.', ...);
  }
  ```
- **문제:** 이 fallback 메시지가 표시되고 있음에도 **테이블 자체도 여전히 그려짐** (L108-144에서 0 값으로 계속 출력).
- **수정:**
  1. `drawPage3Trends.ts` L100-106: fallback 메시지 표시 시 **테이블 렌더링을 skip**:
     ```typescript
     if (!hasLastWeekData) {
       pdf.text('No previous week data available for comparison.', margin + 2, y + 5);
       y += 12;
     } else {
       // 기존 L108-144 테이블 렌더링
       data.weekComparison.forEach((...) => { ... });
       y += 8;
     }
     ```
  2. 또는 "Last Week" 컬럼에 "—" 표시하여 데이터 없음 명시

### P0-04. Appendix Status 컬럼 — lifecycle_status 대신 test result status 표시

- **증상:** P8 TC Appendix의 Status 컬럼이 "Passed/Failed/Retest/Blocked" 등 테스트 실행 결과를 표시.
- **목업 사양:** Status 컬럼은 **lifecycle_status** (Active/Draft/Deprecated)를 표시해야 함.
- **근본 원인:** `drawPage8Appendix.ts` L131-133:
  ```typescript
  const latestResult = (tc.latestResult || 'untested').toLowerCase();
  const statusColor = statusColors[latestResult] || config.textLight;
  const statusLabel = latestResult.charAt(0).toUpperCase() + latestResult.slice(1);
  ```
  `tc.latestResult` (테스트 실행 결과)를 사용하고 있으나, 목업은 lifecycle_status를 의도.
- **수정:** `drawPage8Appendix.ts` L131-133 교체:
  ```typescript
  const lifecycle = (tc.lifecycle_status || 'active').toLowerCase();
  const lifecycleColors: Record<string, [number,number,number]> = {
    active: [16, 163, 127],   // green
    draft: [99, 102, 241],    // indigo
    deprecated: [148, 163, 184], // gray
  };
  const statusColor = lifecycleColors[lifecycle] || config.textLight;
  const statusLabel = lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1);
  ```
  - `pdfDataPrep.ts`에서 appendix TC 데이터에 `lifecycle_status` 포함 확인 필요

---

## P1 — Major (미구현/누락 기능)

### P1-01. Burndown 차트 — 여전히 placeholder 텍스트만 표시

- **증상:** P5 Milestone 페이지의 Burndown 영역에 "Burndown chart — tracking velocity data" 텍스트만 표시.
- **목업 사양:** SVG 기반 번다운 차트 — ideal line (dashed, gray) + actual line (solid, indigo) + fill area.
- **근본 원인:** `drawPage5Milestone.ts` L94-99: 실제 번다운 데이터를 계산/수집하는 로직 없음. Ideal line만 단순 대각선으로 그림.
- **수정:**
  1. `pdfDataPrep.ts`에 `prepareBurndownData(milestone, results)` 함수 추가:
     - 마일스톤 시작일~종료일 구간에서 일별 "남은 TC" 수 계산
     - Ideal: `totalTCs - (totalTCs / totalDays) * dayIndex` (선형 감소)
     - Actual: 실제 일별 완료 TC 누적 차감
  2. `drawPage5Milestone.ts` L94-99 교체:
     - Y축: 0 → totalTCs (4-5 grid lines)
     - X축: 시작일 → 종료일 (7일 간격 라벨)
     - Ideal line: `setLineDashPattern([3, 2], 0)`, color `[148, 163, 184]`
     - Actual line: solid, color `config.primaryColor`, width 1.5
     - Actual fill: 라인 아래 영역을 `primaryColor` opacity 0.2

### P1-02. Quality Gates 테이블 — 데이터는 있으나 렌더링 안될 가능성

- **증상:** P5에서 Quality Gates 테이블이 보이지 않거나 빈 상태.
- **근본 원인:** `drawPage5Milestone.ts` L106: `if (data.qualityGates.length > 0)` — 데이터 자체는 존재함 (`pdfDataPrep.ts` L113-144에 4개 gate 정의). 그러나 **L107: `if (y > 235) y = 235;`** — 마일스톤 카드와 번다운 차트가 y를 이미 235 이상으로 밀어내면, Quality Gates가 페이지 하단에 잘리거나 겹침.
- **수정:**
  1. Quality Gates가 페이지에 들어갈 공간이 없으면 (y > 230), **별도 여백 확보** 또는 **마일스톤 카드 크기 축소**
  2. `cardH = 50` → `cardH = 42`로 축소하여 여유 공간 확보
  3. 또는 `y > 235` 조건을 제거하고, quality gates를 항상 그리되 페이지 오버플로우 체크 추가

### P1-03. 마일스톤 카드 상세 정보 누락

- **증상:** P5에 마일스톤 카드 1개(1.0.0)만 표시. 카드 내에 Due date, Remaining TCs, Velocity, Est. Completion 정보가 보이지 않거나 빈 값.
- **코드 확인:** `drawPage5Milestone.ts` L62-67에서 이 정보들은 **실제로 구현되어 있음**:
  ```typescript
  pdf.text(`Due: ${m.dueDate}`, x + 4, cy + 25);
  pdf.text(`Remaining: ${m.remainingTCs} TCs`, x + 4, cy + 32);
  pdf.text(`Velocity: ${m.velocity.toFixed(1)} TC/day`, x + 4, cy + 39);
  pdf.text(`Est. Completion: ${m.estCompletion}`, x + 4, cy + 46);
  ```
- **가능한 원인:**
  - `m.dueDate`가 빈 문자열 (마일스톤에 `end_date` 미설정)
  - `m.velocity`가 0 (최근 7일간 결과 없음)
  - `m.estCompletion`이 빈 값
- **수정:** `pdfDataPrep.ts`의 `prepareMilestoneCard()` (L389-) 에서 fallback 값 추가:
  ```typescript
  dueDate: dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set',
  velocity: velocity || 0,
  estCompletion: velocity > 0 && remainingTCs > 0
    ? new Date(Date.now() + (remainingTCs / velocity) * 86400000).toLocaleDateString(...)
    : 'N/A',
  ```

### P1-04. Coverage Gaps 테이블 누락

- **증상:** P6 Risk Assessment에서 Coverage Gaps 섹션이 보이지 않음.
- **근본 원인:** `drawPage6Risk.ts` L139: `if (y < 250 && data.coverageGaps.length > 0)` — Top Failed TCs + Flaky TCs 테이블이 y를 250 이상으로 밀어내면 Coverage Gaps가 skip됨.
- **추가 원인:** `data.coverageGaps`가 비어있을 수 있음 — coverage gap 판단 기준이 `untested > 0`인 모듈만 포함하는데, P0-01에서 살펴본 것처럼 모든 TC가 실행된 상태라면 gap이 0.
- **수정:**
  1. Coverage Gaps 데이터가 비어있는 경우 → "All modules have been tested" 메시지 표시
  2. y 오버플로우 시 → Top Failed / Flaky 테이블 표시 건수를 줄여서 (5→3건) 공간 확보
  3. `drawPage6Risk.ts` L32, L93의 `slice(0, 10)`, `slice(0, 5)` → 동적으로 남은 공간에 따라 조절

### P1-05. Team Performance — "Unknown" 1명만 표시

- **증상:** P7에 Member가 "Unknown" 1명만 표시. Contribution Distribution도 Unknown 100%.
- **근본 원인:** `pdfDataPrep.ts` L502 (요약 기반): `const name = r.author || '알 수 없음';` → test_results 테이블의 `author` 필드가 대부분 null 또는 빈 문자열.
- **수정:**
  1. **test_results 데이터 확인:** `SELECT DISTINCT author FROM test_results LIMIT 10;`
  2. **프로필 조인:** author가 UUID라면 profiles 테이블 조인 필요:
     ```typescript
     // pdfDataPrep.ts - prepareTeamMembers()
     const { data: profiles } = await supabase.from('profiles').select('id, full_name');
     const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) ?? []);
     // author가 UUID면 profileMap.get(author) 사용
     const name = profileMap.get(r.author) || r.author || 'Unknown';
     ```
  3. **author가 아예 미저장:**  test_results에 author를 저장하는 로직 자체가 누락되었을 가능성 → 테스트 실행 시 현재 사용자 ID를 author로 저장하는 코드 확인

### P1-06. TOC 페이지 수 불일치 ("Page 1 of 9" vs 목업 "Page 1 of 8")

- **증상:** Cover 페이지에 "Page 1 of 9" 표시. TC가 40개로 Appendix가 2페이지에 걸침.
- **목업 사양:** TOC는 고정 8개 항목 (페이지 1~8).
- **근본 원인:** `generateExecutiveReport.ts` L52-57에서 `totalPages`를 appendix 추가 페이지 포함하여 계산. TOC 항목도 `drawPage1Cover.ts` L148-161에서 8개로 고정되어 있지만, footer의 "Page X of Y"에서 Y가 9로 표시.
- **수정:**
  1. **TOC 수정:** Appendix가 여러 페이지일 때 "8. Test Case Appendix ... 8-9" 형식으로 표시
  2. 또는 Appendix 페이지에 "Page 8a of 8", "Page 8b of 8" 표기
  3. 더 간단한 수정: footer의 totalPages를 **기본 8로 고정**하고 appendix 추가 페이지만 "Appendix (continued)" 표시

---

## P2 — Minor (스타일/레이아웃)

### P2-01. KPI 카드 delta에 ▲/▼ 심볼 미표시

- **증상:** Cover KPI 카드에서 delta가 "+95", "+20", "+2"처럼 **숫자만** 표시. ▲/▼ 기호가 보이지 않음.
- **코드 확인:** `drawPage1Cover.ts` L78-82에서 `▲`/`▼` 문자를 **실제로 사용**:
  ```typescript
  delta: `${data.passRateDelta >= 0 ? '▲' : '▼'} ${Math.abs(data.passRateDelta)}%`
  ```
- **근본 원인:** **폰트 인코딩 문제**. helvetica (WinAnsiEncoding)는 ▲(U+25B2) / ▼(U+25BC) 문자를 포함하지 않음. NotoSansKR 커스텀 폰트가 로드에 실패하면 helvetica fallback이 되어 심볼이 렌더링되지 않음.
- **수정 (2가지 옵션):**
  1. **Option A (즉시):** ▲/▼ 대신 ASCII 호환 문자 사용:
     ```typescript
     delta: `${data.passRateDelta >= 0 ? '+' : '-'} ${Math.abs(data.passRateDelta)}%`
     // 또는 화살표를 jsPDF 도형으로 직접 그리기
     ```
  2. **Option B (권장):** NotoSansKR 폰트 파일을 올바르게 재생성하여 유니코드 심볼 지원 확인. `generateExecutiveReport.ts`의 폰트 로드 로직에서 에러 핸들링 추가.

### P2-02. P2 섹션 제목 확인

- **증상:** P2 Quality Scorecard의 KPI 섹션 제목이 "Key Performance Indicators"인지 확인 필요.
- **코드 확인:** `drawPage2Scorecard.ts` L53: `drawSectionTitle(pdf, 'Key Performance Indicators', ...)` — **정확히 목업과 일치**. 이전 라운드에서 수정됨.
- **상태:** ✅ 수정 완료

### P2-03. Priority Distribution 바 — 텍스트 겹침

- **증상:** P2의 Medium 행에서 "29 (72.5%)" 텍스트가 바와 겹쳐 보임.
- **근본 원인:** `drawPage2Scorecard.ts` L99-110:
  ```typescript
  const barW = (pri.count / maxCount) * 120;
  // ...
  pdf.text(`${pri.count} (${pct}%)`, margin + 150, py + 4, { align: 'right' });
  ```
  바 너비가 120mm까지 확장되는데, 텍스트가 `margin + 150` 고정 위치에 right-align됨. **Medium이 최다(72.5%)이면 바가 120mm를 채우고 텍스트 영역과 겹침**.
- **수정:** 텍스트를 바 끝 우측에 배치하되 최소 gap 확보:
  ```typescript
  const textX = Math.max(margin + barW + 28, margin + 150);
  pdf.text(`${pri.count} (${pct}%)`, textX, py + 4, { align: 'right' });
  ```
  또는 **바 최대 너비를 100mm로 축소**하고 텍스트 영역 20mm 확보:
  ```typescript
  const barW = (pri.count / maxCount) * 100; // 120 → 100
  ```

### P2-04. P3 Execution Velocity 차트 하단 여백 부족

- **증상:** Execution Velocity 차트가 페이지 하단에 너무 가까움.
- **근본 원인:** `drawPage3Trends.ts` L151: `const velChartH = Math.min(50, 280 - y - 15);` — 동적 높이 계산이 15mm 여백만 확보. Footer 높이(36px ≈ 12mm) + 여유 → 최소 20mm 필요.
- **수정:** `280 - y - 15` → `275 - y - 20` 또는 `velChartH` 최대값을 45로 축소

### P2-05. Module Coverage — Viewer 행 Pass% "0%" 표시

- **증상:** P4 Module Coverage에서 Viewer 모듈의 Pass%가 "0%"이고 Coverage bar도 비어있음.
- **코드 확인:** `pdfDataPrep.ts` L382: `passRate: data.tested.size > 0 ? (data.passed / data.tested.size) * 100 : 0`
- **원인:** Viewer 모듈에 tested TC가 1건이라도 있지만 **모두 failed/blocked**인 경우 pass%가 0%은 정상. 그러나 tested=1이면 **Coverage bar는 `passRate` 기준으로 채워지므로 0%면 비어있는 것이 맞음**.
- **확인 필요:** CEO가 "Tested=1이면 pass%를 표시해야 한다"고 했는데, 실제로 Tested=1이고 Failed=1이면 Pass%=0%이 정확함. 이것은 **데이터 문제**일 수 있음.
- **수정 (선택적):** Coverage bar를 passRate가 아닌 **tested/total 비율**로 변경하려면:
  ```typescript
  const coveragePct = folder.totalTCs > 0 ? (folder.tested / folder.totalTCs) * 100 : 0;
  ```
  단, 이 경우 "Coverage" bar의 의미가 "테스트 커버리지"가 되어 "Pass Rate" bar와 다른 의미. 목업에서 Coverage 컬럼의 의도를 확인 필요.

### P2-06. P6 Top Failed TCs — Title 빈 행

- **증상:** Risk Assessment의 Top Failed TCs에서 일부 행의 Title이 비어있음.
- **근본 원인:** test_cases 테이블에서 해당 TC의 title 필드가 null/empty.
- **수정:** `drawPage6Risk.ts`에서 title 표시 시 fallback:
  ```typescript
  const title = tc.title || tc.customId || `TC-${tc.id.slice(0, 8)}`;
  ```

---

## 수정 우선순위 가이드

### 즉시 (30분 이내)
1. **P0-04** Appendix Status 컬럼: `latestResult` → `lifecycle_status` (5분)
2. **P2-01** KPI delta ▲/▼ → ASCII `+`/`-` 대체 (5분)
3. **P2-03** Priority bar 텍스트 겹침: 바 maxWidth 100mm (5분)
4. **P0-03** WoW Last Week 0일 때 테이블 skip 또는 "—" 표시 (10분)
5. **P2-04** Velocity 차트 하단 여백 20mm (3분)
6. **P2-06** Failed TC title fallback (3분)

### 이번 주
7. **P0-01** Coverage 계산 검증 + folderCoverage 평균 사용 검토 (1시간)
8. **P0-02** Automation Rate DB 확인 + fallback 개선 (30분)
9. **P1-05** Team "Unknown" → profiles 조인 (1시간)
10. **P1-06** TOC/Footer 페이지 번호 정리 (30분)
11. **P1-02** Quality Gates y 오버플로우 수정 (30분)
12. **P1-03** 마일스톤 카드 상세 정보 fallback (30분)
13. **P1-04** Coverage Gaps 렌더링 보장 (30분)

### 다음 주
14. **P1-01** Burndown 차트 실제 데이터 구현 (2~3시간)
15. **P2-01 Option B** NotoSansKR 폰트 재생성 (1시간)

---

## 참조 파일 목록

| 파일 | 핵심 이슈 |
|------|-----------|
| `pdfDataPrep.ts` L275-282 | Coverage 계산 |
| `pdfDataPrep.ts` L45-48 | Automation Rate |
| `pdfDataPrep.ts` L316-348 | WoW Last Week |
| `pdfDataPrep.ts` L389-408 | Milestone velocity/est.completion |
| `drawPage1Cover.ts` L78-82 | ▲/▼ 심볼 |
| `drawPage1Cover.ts` L140-162 | TOC |
| `drawPage2Scorecard.ts` L99-110 | Priority bar 텍스트 겹침 |
| `drawPage3Trends.ts` L99-106 | WoW fallback |
| `drawPage3Trends.ts` L151 | Velocity 차트 높이 |
| `drawPage4Execution.ts` L168 | Module passRate |
| `drawPage5Milestone.ts` L73-103 | Burndown placeholder |
| `drawPage5Milestone.ts` L106-107 | Quality Gates y 오버플로우 |
| `drawPage6Risk.ts` L139 | Coverage Gaps skip |
| `drawPage7Team.ts` | Unknown member |
| `drawPage8Appendix.ts` L131-133 | Status = latestResult 버그 |
