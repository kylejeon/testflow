# PM 검토: Dashboard Export (PDF + CSV) 품질 리뷰

## 검토 대상
- **PDF:** `connevo-suite-report-2026-03-31.pdf` (31KB, 3페이지)
- **CSV (Runs):** `connevo-suite-runs-2026-03-31.csv` (628B, 7 Runs)
- **CSV (TCs):** `connevo-suite-testcases-2026-03-31.csv` (3.5KB, 40 TCs)

---

## 이슈 총 6건 (Critical 1, High 2, Medium 3)

### Issue 1: 한글 깨짐 (PDF)
**심각도: 🔴 Critical**

**원인 확정:** jsPDF에서 `pdf.setFont('helvetica', ...)` 만 사용 중. Helvetica는 Latin 문자만 지원하며, 한글(CJK) 글리프가 없어 인코딩 깨짐 발생.

**영향 범위:**
- Page 2: Run 이름 "테스트" → 깨짐
- Page 3: 한글 TC 제목 전체 깨짐 (40개 중 약 25개가 한글)

**해결 방법:** jsPDF에 한글 지원 폰트를 임베드해야 합니다. 두 가지 방안:

| 방안 | 장점 | 단점 |
|------|------|------|
| **A. NotoSansKR 폰트 임베드** | 완벽한 한글 지원, 폰트 품질 좋음 | 폰트 파일 ~4MB 추가 (Base64 변환 필요) |
| **B. html2canvas + jsPDF 방식 전환** | 폰트 문제 자동 해결 (브라우저 렌더링), 디자인 자유도 높음 | 기존 코드 대폭 변경 필요 |

**PM 권장: 방안 A (NotoSansKR 임베드)** — 기존 jsPDF 직접 호출 코드 구조를 유지하면서 폰트만 추가. 구현 단계:
1. NotoSansKR-Regular.ttf + NotoSansKR-Bold.ttf를 Base64로 변환
2. `src/assets/fonts/` 디렉토리에 JS 모듈로 저장
3. PDF 생성 시 `pdf.addFileToVFS()` + `pdf.addFont()` 호출
4. 모든 `setFont('helvetica', ...)` → `setFont('NotoSansKR', ...)` 변경

---

### Issue 2: Run별 Pass/Fail 수치 모두 0 (PDF + CSV)
**심각도: 🔴 High**

**원인 확정:** `allRunsRaw` 객체에 `passed`, `failed`, `blocked`, `retest`, `untested` 프로퍼티가 존재하지 않음. test_runs 테이블에는 이 컬럼이 없고, 결과 수치는 `test_results` 테이블에서 run_id별로 집계해야 함.

**현재 코드 문제 (PDF line 389, CSV line 268):**
```tsx
const total = (run.passed || 0) + (run.failed || 0) + ...  // 전부 0
```

**실제 데이터 흐름:** `queryFns.ts`에서 `test_results`를 조회하고 run별로 집계하는 로직이 있지만 (line 207~222), 그 결과가 `allRunsRaw`에 머지되지 않고 있음.

**해결 방법:** Export 함수 내에서 `rawTestResults`를 run_id별로 집계하여 사용:
```tsx
const resultsByRun = new Map<string, {passed:number, failed:number, blocked:number, retest:number}>();
rawTestResults.forEach((r: any) => {
  const counts = resultsByRun.get(r.run_id) || {passed:0, failed:0, blocked:0, retest:0};
  if (r.status === 'passed') counts.passed++;
  else if (r.status === 'failed') counts.failed++;
  else if (r.status === 'blocked') counts.blocked++;
  else if (r.status === 'retest') counts.retest++;
  resultsByRun.set(r.run_id, counts);
});
```

---

### Issue 3: Status DB enum 그대로 표시
**심각도: 🟡 Medium**

**현재:** "in_progress", "new", "completed" 표시
**기대:** "In Progress", "New", "Completed"

**해결:** 간단한 매핑 함수 추가:
```tsx
const formatStatus = (s: string) => {
  const map: Record<string,string> = {
    in_progress: 'In Progress', new: 'New', completed: 'Completed',
    active: 'Active', closed: 'Closed',
  };
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
};
```

---

### Issue 4: PDF 내용 부족
**심각도: 🟡 Medium**

CEO 피드백: "내용이 너무 부족해 보인다." 현재 3페이지 구성에서 각 페이지의 정보 밀도가 낮음.

**Page별 추가 콘텐츠 제안:**

| Page | 현재 내용 | 추가할 내용 |
|------|----------|------------|
| Page 1 (Summary) | 4개 수치 박스 + Pass Rate 바 + Project Info | ✚ 멤버/담당자 목록, ✚ Milestone 진행 현황 카드 (각 milestone별 completion %), ✚ 최근 7일 활동 요약 (new results count) |
| Page 2 (Runs) | Run 테이블 + 요약 1줄 | ✚ 각 Run에 Passed/Failed/Blocked/Retest 실제 수치 (Issue 2 해결 후), ✚ Milestone 컬럼 추가, ✚ Run별 미니 진행률 바, ✚ Active vs Completed 비율 차트 |
| Page 3 (TCs) | Priority 바 + Lifecycle 카드 + 최근 10개 TC | ✚ TC 목록 10개→20개 확장, ✚ 폴더별 TC 분포, ✚ Assignee별 TC 분포 |

---

### Issue 5: TC 제목 truncation (PDF Page 3)
**심각도: 🟡 Medium**

**현재:** `tc.title.length > 50 ? tc.title.slice(0, 47) + '...' : tc.title` — 50자에서 잘림

**개선:** PDF는 인쇄용 문서이므로 가능한 전체 제목 표시가 바람직. 방안:
- Title 컬럼 너비를 넓히고 truncation 한도를 80자로 확장
- 또는 행 높이를 동적으로 조절하여 줄바꿈 허용 (jsPDF `splitTextToSize` 활용)

---

### Issue 6: Active Runs 카운트 오류 (PDF Page 2)
**심각도: 🟡 Medium**

**현재:** "Active: 0, Completed: 2" 표시. 하지만 실제로는 in_progress 3개 + new 2개 = Active 5개.

**원인:** `allRunsRaw.filter((r: any) => r.status === 'active')` — DB에는 "active" 대신 "in_progress"와 "new"가 사용됨.

**해결:**
```tsx
const activeRuns = allRunsRaw.filter((r: any) =>
  ['active', 'in_progress', 'new'].includes(r.status)
).length;
```

---

## CSV 별도 이슈

### CSV Runs: Pass/Fail 모두 0
Issue 2와 동일 원인. 동일 해결 방법 적용.

### CSV TCs: 정상 ✅
40개 TC 전체 포함, 한글 정상 (UTF-8 BOM 없이도 정상 표시), 컬럼 적절.

---

## 수정 우선순위

| 순서 | 이슈 | 심각도 | 예상 시간 |
|------|------|--------|----------|
| 1 | Issue 2: Run Pass/Fail 0 (PDF+CSV) | High | 20분 |
| 2 | Issue 1: 한글 깨짐 (PDF) | Critical | 45분 |
| 3 | Issue 6: Active Runs 카운트 | Medium | 5분 |
| 4 | Issue 3: Status 포맷팅 | Medium | 5분 |
| 5 | Issue 5: TC 제목 truncation | Medium | 10분 |
| 6 | Issue 4: 내용 추가 | Medium | 60분 |

**총 예상 시간: ~145분 (약 2.5시간)**

**Desi 디자인 목업 필요 여부:** 필요 없음 — 기존 PDF 구조 내 데이터/폰트 수정이 대부분. Issue 4 (내용 추가)만 레이아웃 조정이 필요하나, jsPDF 코드 레벨에서 충분히 처리 가능.