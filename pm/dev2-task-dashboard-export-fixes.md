# Dev2 수정 지시서: Dashboard Export PDF + CSV 버그 수정

## 개요

Dashboard Export Report의 PDF와 CSV에서 6건의 이슈가 발견되었습니다.
**수정 대상 파일:** `src/pages/project-detail/page.tsx` (Export 함수 line 255~519)

**구현 순서:** Issue 2 → Issue 6 → Issue 3 → Issue 1 → Issue 5 → Issue 4

---

## Fix 1 (최우선): Run별 Pass/Fail 수치가 0으로 표시되는 문제

**영향:** PDF Page 2 + CSV Runs — 모든 Run의 Passed/Failed/Blocked/Retest가 0

**원인:** `allRunsRaw` 객체에 `passed`, `failed` 등의 프로퍼티가 없음. 이 데이터는 `rawTestResults`에서 run_id별로 집계해야 함.

### 수정 위치: handleExportPDF 함수 상단 (line 310 부근, try 블록 진입 직후)

**추가할 코드:**
```tsx
// Aggregate test results by run_id
const resultsByRun = new Map<string, {passed:number, failed:number, blocked:number, retest:number, untested:number}>();
allRunsRaw.forEach((run: any) => {
  resultsByRun.set(run.id, {passed:0, failed:0, blocked:0, retest:0, untested:0});
});
rawTestResults.forEach((r: any) => {
  const counts = resultsByRun.get(r.run_id);
  if (!counts) return;
  if (r.status === 'passed') counts.passed++;
  else if (r.status === 'failed') counts.failed++;
  else if (r.status === 'blocked') counts.blocked++;
  else if (r.status === 'retest') counts.retest++;
});
// Calculate untested per run
allRunsRaw.forEach((run: any) => {
  const counts = resultsByRun.get(run.id);
  if (!counts) return;
  const tcCount = run.test_case_count || run.total_cases || 0;
  const tested = counts.passed + counts.failed + counts.blocked + counts.retest;
  counts.untested = Math.max(0, tcCount - tested);
});
```

### PDF Page 2 수정 (line 389 부근)

**현재 코드:**
```tsx
const total = (run.passed || 0) + (run.failed || 0) + (run.blocked || 0) + (run.retest || 0) + (run.untested || 0);
const tested = total - (run.untested || 0);
const pr = tested > 0 ? Math.round(((run.passed || 0) / tested) * 100) : 0;
...
pdf.text(String(run.passed || 0), margin + 112, rowY + 6.5);
pdf.text(String(run.failed || 0), margin + 127, rowY + 6.5);
```

**변경 후:**
```tsx
const runCounts = resultsByRun.get(run.id) || {passed:0, failed:0, blocked:0, retest:0, untested:0};
const total = runCounts.passed + runCounts.failed + runCounts.blocked + runCounts.retest + runCounts.untested;
const tested = total - runCounts.untested;
const pr = tested > 0 ? Math.round((runCounts.passed / tested) * 100) : 0;
...
pdf.text(String(runCounts.passed), margin + 112, rowY + 6.5);
pdf.text(String(runCounts.failed), margin + 127, rowY + 6.5);
pdf.text(String(total), margin + 142, rowY + 6.5);
```

### CSV Runs 수정 (line 268 부근, handleExportRunsCSV 함수)

동일하게 `resultsByRun` 집계 로직 추가 후:

**현재 코드:**
```tsx
const total = (run.passed || 0) + ...
return [run.name, ..., run.passed || 0, run.failed || 0, ...];
```

**변경 후:**
```tsx
const runCounts = resultsByRun.get(run.id) || {passed:0, failed:0, blocked:0, retest:0, untested:0};
const total = runCounts.passed + runCounts.failed + runCounts.blocked + runCounts.retest + runCounts.untested;
const tested = total - runCounts.untested;
const passRate = tested > 0 ? Math.round((runCounts.passed / tested) * 100) : 0;
return [run.name, milestoneMap.get(run.milestone_id) || '', formatStatus(run.status || 'active'),
  total, runCounts.passed, runCounts.failed, runCounts.blocked, runCounts.retest, runCounts.untested,
  `${passRate}%`, new Date(run.created_at).toLocaleDateString()];
```

> **중요:** `handleExportRunsCSV`에서도 `rawTestResults`에 접근 가능한지 확인. 컴포넌트 레벨 state/변수라면 접근 가능.

---

## Fix 2: Active Runs 카운트 오류

**위치:** PDF Page 2 하단 (line 400 부근)

**현재 코드:**
```tsx
const activeRuns = allRunsRaw.filter((r: any) => r.status === 'active').length;
const completedRuns = allRunsRaw.filter((r: any) => r.status === 'completed').length;
```

**변경 후:**
```tsx
const activeRuns = allRunsRaw.filter((r: any) => ['active', 'in_progress', 'new'].includes(r.status)).length;
const completedRuns = allRunsRaw.filter((r: any) => r.status === 'completed').length;
```

---

## Fix 3: Status 포맷팅 (DB enum → 사용자 친화적 텍스트)

**위치:** handleExportPDF 함수 상단에 헬퍼 함수 추가

**추가할 코드:**
```tsx
const formatStatus = (s: string): string => {
  const map: Record<string, string> = {
    in_progress: 'In Progress',
    new: 'New',
    completed: 'Completed',
    active: 'Active',
    closed: 'Closed',
    draft: 'Draft',
    deprecated: 'Deprecated',
  };
  return map[s] || s.charAt(0).toUpperCase() + s.slice(1);
};
```

**PDF Page 2 적용 (line 393 부근):**
```tsx
// 현재: pdf.text(run.status || 'active', ...)
// 변경: 
pdf.text(formatStatus(run.status || 'active'), margin + 82, rowY + 6.5);
```

**CSV Runs에도 동일 적용.**

---

## Fix 4 (Critical): PDF 한글 깨짐 — NotoSansKR 폰트 임베드

### Step 1: 폰트 파일 준비

NotoSansKR-Regular.ttf와 NotoSansKR-Bold.ttf를 Base64로 변환하여 JS 모듈로 저장합니다.

```bash
# 1. 폰트 다운로드 (Google Fonts)
# https://fonts.google.com/noto/specimen/Noto+Sans+KR

# 2. Base64 변환
base64 -i NotoSansKR-Regular.ttf -o NotoSansKR-Regular.txt
base64 -i NotoSansKR-Bold.ttf -o NotoSansKR-Bold.txt

# 3. JS 모듈로 저장
# src/assets/fonts/NotoSansKR-Regular.ts
# src/assets/fonts/NotoSansKR-Bold.ts
```

**파일 구조:**
```tsx
// src/assets/fonts/NotoSansKR-Regular.ts
export const NotoSansKRRegular = 'AAEAAAARAQ...'; // Base64 문자열

// src/assets/fonts/NotoSansKR-Bold.ts
export const NotoSansKRBold = 'AAEAAAARAQ...'; // Base64 문자열
```

> **참고:** NotoSansKR 전체 폰트는 ~4MB입니다. 번들 사이즈가 우려되면 서브셋 폰트를 사용하거나, dynamic import로 PDF 생성 시에만 로드합니다.

### Step 2: PDF 생성 시 폰트 등록

**위치:** handleExportPDF 함수 상단, `const pdf = new jsPDF(...)` 직후

```tsx
const { default: jsPDF } = await import('jspdf');
const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

// 한글 폰트 임베드
const { NotoSansKRRegular } = await import('../../assets/fonts/NotoSansKR-Regular');
const { NotoSansKRBold } = await import('../../assets/fonts/NotoSansKR-Bold');

pdf.addFileToVFS('NotoSansKR-Regular.ttf', NotoSansKRRegular);
pdf.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
pdf.addFileToVFS('NotoSansKR-Bold.ttf', NotoSansKRBold);
pdf.addFont('NotoSansKR-Bold.ttf', 'NotoSansKR', 'bold');
```

### Step 3: 모든 setFont 호출 교체

**전체 파일에서 일괄 치환:**
```
setFont('helvetica', 'bold')   →  setFont('NotoSansKR', 'bold')
setFont('helvetica', 'normal') →  setFont('NotoSansKR', 'normal')
```

약 25곳 이상 존재합니다. 검색-치환으로 일괄 변경하세요.

### 대안: 폰트 파일 크기가 부담되는 경우

번들 사이즈 최적화를 위해 폰트를 CDN에서 런타임에 fetch하는 방법:

```tsx
// CDN에서 폰트를 ArrayBuffer로 로드
const fontRes = await fetch('https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-kr@5.0.0/files/noto-sans-kr-korean-400-normal.woff2');
const fontBuffer = await fontRes.arrayBuffer();
const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuffer)));
pdf.addFileToVFS('NotoSansKR.ttf', fontBase64);
pdf.addFont('NotoSansKR.ttf', 'NotoSansKR', 'normal');
```

> **PM 의견:** 로컬 Base64 임베드 방식을 우선 시도하고, 번들 사이즈 문제가 발생하면 CDN 방식으로 전환하세요.

---

## Fix 5: TC 제목 truncation 완화

**위치:** PDF Page 3 TC 테이블 (line 497 부근)

**현재 코드:**
```tsx
const title = tc.title.length > 50 ? tc.title.slice(0, 47) + '...' : tc.title;
```

**변경 후:** jsPDF의 `splitTextToSize`를 활용하여 줄바꿈 지원:
```tsx
const maxTitleW = 100; // mm
pdf.setFontSize(8);
const titleLines = pdf.splitTextToSize(tc.title || '', maxTitleW);
const lineHeight = 4; // mm per line
const rowHeight = Math.max(10, titleLines.length * lineHeight + 4);

// 행 배경
if (i % 2 === 1) { pdf.setFillColor(248, 250, 252); pdf.rect(margin, rowY, contentW, rowHeight, 'F'); }

// 제목 (여러 줄)
pdf.setFontSize(8); pdf.setFont('NotoSansKR', 'normal'); pdf.setTextColor(30, 41, 59);
pdf.text(titleLines, margin + 2, rowY + 5);

// 나머지 컬럼은 rowY + rowHeight/2 기준 중앙 정렬
```

> **주의:** 행 높이가 동적이 되므로 `rowY`를 누적 계산해야 합니다. 기존 `y + i * 10` 고정 방식에서 변경 필요.

---

## Fix 6: 내용 추가 (CEO 피드백)

### Page 1 추가 콘텐츠

**A. Milestone 진행 현황 (Project Info 섹션 아래에 추가)**

```tsx
// Milestone Progress 섹션
pdf.setFontSize(11); pdf.setFont('NotoSansKR', 'bold'); pdf.setTextColor(15, 23, 42);
pdf.text('Milestone Progress', margin, y); y += 6;

milestones.forEach((m: any, i: number) => {
  const mRuns = allRunsRaw.filter((r: any) => r.milestone_id === m.id);
  const mCompleted = mRuns.filter((r: any) => r.status === 'completed').length;
  const mTotal = mRuns.length;
  const pct = mTotal > 0 ? Math.round((mCompleted / mTotal) * 100) : 0;

  pdf.setFontSize(9); pdf.setFont('NotoSansKR', 'normal'); pdf.setTextColor(71, 85, 105);
  pdf.text(m.name, margin, y + 5);

  // Progress bar
  pdf.setFillColor(241, 245, 249); pdf.rect(margin + 40, y, contentW - 60, 6, 'F');
  if (pct > 0) { pdf.setFillColor(99, 102, 241); pdf.rect(margin + 40, y, (contentW - 60) * (pct / 100), 6, 'F'); }

  pdf.setFontSize(8); pdf.setFont('NotoSansKR', 'bold'); pdf.setTextColor(15, 23, 42);
  pdf.text(`${pct}%`, margin + contentW - 15, y + 5);
  y += 10;
});
```

### Page 2 추가 컬럼: Milestone + 미니 Pass Rate 바

Runs 테이블에 Milestone 컬럼 추가 (milestoneMap 활용, CSV에는 이미 있음).

### Page 3 추가 콘텐츠

**B. TC 목록 10개 → 20개 확장**
```tsx
// 현재: tcs.slice(0, 10)
// 변경:
tcs.slice(0, 20)
```

**C. 폴더별 TC 분포 (Priority Distribution 아래에 추가)**
```tsx
const folderCounts = new Map<string, number>();
tcs.forEach((tc: any) => {
  const folder = tc.folder || 'Uncategorized';
  folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
});
// folderCounts를 바 차트로 렌더링 (Priority Distribution과 동일 패턴)
```

---

## 변경 사항 요약 체크리스트

| # | 변경 | 파일 | 난이도 |
|---|------|------|--------|
| 1 | resultsByRun 집계 로직 추가 (PDF) | project-detail/page.tsx | ⭐⭐ |
| 2 | resultsByRun 집계 로직 추가 (CSV) | project-detail/page.tsx | ⭐ |
| 3 | Active Runs 필터 조건 수정 | project-detail/page.tsx | ⭐ |
| 4 | formatStatus 헬퍼 추가 + 적용 | project-detail/page.tsx | ⭐ |
| 5 | NotoSansKR 폰트 Base64 준비 | src/assets/fonts/ (신규) | ⭐⭐ |
| 6 | PDF에 한글 폰트 임베드 + setFont 교체 | project-detail/page.tsx | ⭐⭐ |
| 7 | TC 제목 truncation → splitTextToSize | project-detail/page.tsx | ⭐⭐ |
| 8 | Page 1 Milestone 진행 현황 추가 | project-detail/page.tsx | ⭐⭐ |
| 9 | Page 2 Milestone 컬럼 추가 | project-detail/page.tsx | ⭐ |
| 10 | Page 3 TC 20개 + 폴더 분포 추가 | project-detail/page.tsx | ⭐⭐ |

---

## 커밋 & 푸시

**Phase 1 (버그 수정):**
```bash
git add src/pages/project-detail/page.tsx
git commit -m "fix: dashboard export run results showing 0 and Korean font support

- Aggregate test_results by run_id for accurate pass/fail counts
- Fix active runs filter to include in_progress and new statuses
- Add formatStatus helper for user-friendly status labels
- Embed NotoSansKR font for Korean text support in PDF"
git push origin HEAD
```

**Phase 2 (내용 추가):**
```bash
git add src/pages/project-detail/page.tsx
git commit -m "feat: enrich dashboard export PDF with milestone progress and folder distribution

- Add milestone progress section to Page 1
- Add milestone column to Page 2 runs table
- Expand TC list to 20 items with folder distribution chart on Page 3
- Improve TC title display with multi-line support"
git push origin HEAD
```