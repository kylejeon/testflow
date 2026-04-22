# Dev Spec: f033 — xlsx (SheetJS) → exceljs 마이그레이션

> **작성일:** 2026-04-21
> **작성자:** PM (@planner)
> **상태:** Draft → **Approved (for dev)**
> **관련 디자인:** 없음 (서버/유틸 레벨 라이브러리 교체 — UI 변화 없음)
> **Feature ID:** f033
> **Priority:** P1 (CEO: P2 → P1 승격)
> **Impact / Effort:** medium / medium
> **Tracking:** `feature_list.json` f033

---

## 1. 개요

- **문제:** `xlsx` (SheetJS CE) 0.18.5 패키지가 **Prototype Pollution (GHSA-4r6h-8v6p-xvw6)** + **ReDoS (GHSA-5pgg-2g8v-p4x9)** CVE를 보유. SheetJS가 npm 공식 배포를 중단했기 때문에 `npm audit fix`로 해결 불가.
- **해결:** 이미 `package.json`에 포함된 `exceljs@^4.4.0`으로 Excel 읽기/쓰기 사용처를 전수 교체하고, `xlsx` 의존성을 완전히 제거한다.
- **성공 지표:**
  - `npm audit` 결과에서 xlsx 관련 CVE(GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9) **0건**.
  - TC Import/Export, TestRail Export, Run XLSX Export 기능에 회귀 0건.
  - 번들 사이즈 **순감소** (exceljs는 이미 로딩 중, xlsx ~429KB 제거).

---

## 2. 유저 스토리

- As a **QA Manager**, I want the app to be **free of known-exploit libraries**, so that my organization's security review passes and I don't get flagged by Dependabot.
- As a **Tester**, I want to **continue importing/exporting .xlsx test cases without any visible change**, so that my existing workflow and files keep working.
- As a **Engineering Lead**, I want **bundle size not to regress**, so that the testcases / run-detail pages stay fast.

---

## 3. 수용 기준 (Acceptance Criteria)

- [ ] **AC-1 (의존성 제거):** `package.json` `dependencies`에서 `"xlsx"` 키가 제거되고 `package-lock.json`이 재생성된다. `npm ls xlsx` → `(empty)`.
- [ ] **AC-2 (CVE 해결):** `npm audit --omit=dev`가 **GHSA-4r6h-8v6p-xvw6** 및 **GHSA-5pgg-2g8v-p4x9**를 더 이상 보고하지 않는다. 남은 high/critical 0건 (xlsx 외 기존 경고는 변경 없음).
- [ ] **AC-3 (코드 clean):** `grep -rn "from 'xlsx'" src/` 및 `grep -rn "import('xlsx')" src/` 결과 **0건**. 주석/문자열 내의 단어 `xlsx`(파일 확장자 표기 등)만 허용.
- [ ] **AC-4 (Import 스모크 — CSV):** 기존 TestRail 포맷 CSV를 TC Import 모달로 업로드 → 기존과 동일하게 preview 행이 파싱되고 import 성공 토스트 노출. (`parseCSVImport` 경로는 xlsx 의존 없음 — 회귀만 확인)
- [ ] **AC-5 (Import 스모크 — XLSX):** 이전 버전(xlsx 라이브러리로 내보낸) .xlsx 파일 + 신버전(exceljs로 내보낸) .xlsx 파일을 각각 업로드 → 둘 다 `parseExcelImport` 경로로 정상 파싱. 한글/이모지/줄바꿈이 들어간 셀도 깨짐 없이 preview에 표시된다.
- [ ] **AC-6 (Export 스모크 — TC XLSX):** Project Test Cases → Export → .xlsx 선택 → 다운로드 → Excel / Numbers / LibreOffice에서 열었을 때 헤더 볼드 + 회색 배경, 열 너비, wrap text, 한글/이모지가 유지된다.
- [ ] **AC-7 (Export 스모크 — Run XLSX):** `run-detail` 및 `project-runs`의 per-run Export XLSX → 다운로드 → 열었을 때 동일 레이아웃, Issues 컬럼 포함 9/11개 컬럼 유지.
- [ ] **AC-8 (TestRail Export 회귀 없음):** `exportToXLSX` / `exportToTestRail`(CSV)가 기존 TestRail CSV import로 역테스트(round-trip) 시 행 수 일치, 주요 컬럼 값 동일.
- [ ] **AC-9 (빌드 / 타입 / 테스트 / i18n / CI):** 아래 모두 PASS —
  - `npx tsc --noEmit`
  - `npm run test -- --run`
  - `npm run scan:i18n:check`
  - `npm run scan:i18n:parity`
  - `npm run build`
  - `.github/workflows/ci.yml` 녹색
- [ ] **AC-10 (code-splitting 유지):** exceljs는 반드시 **동적 import** (`await import('exceljs')`)로만 호출돼 Test Cases / Runs 페이지 초기 청크에 포함되지 않는다. `dist/assets/*.js` 내 `exceljs`는 별도 청크에만 등장.

---

## 4. 기능 상세

### 4-1. 동작 흐름

본 작업은 백엔드/라이브러리 교체로 **유저 플로우 변화 없음**. 기존 4개 사용처가 동일 UX를 유지해야 한다.

**[Happy Path A — TC Import]**
1. 유저가 Test Cases → Export/Import 모달 → .xlsx 파일 드롭.
2. `ExportImportModal.handleFileSelect`가 `FileReader.readAsArrayBuffer`로 버퍼 생성 → `parseExcelImport(buffer)` 호출.
3. `parseExcelImport` 내부에서 `await import('exceljs')` → `new Workbook()` → `workbook.xlsx.load(buffer)` → 첫 번째 워크시트 → 행 순회 → `Record<string,string>` 배열 생성 → `rowToTestCase` 기존 로직 재사용.
4. preview 테이블에 행 표시 → 유저가 Import Confirm.

**[Happy Path B — TC XLSX Export]**
1. 유저가 Export 모달에서 xlsx 선택 + 컬럼 선택.
2. `exportToXLSX(testCases, projectName, selectedColumns)` 호출 (이미 exceljs 사용 — 변경 없음).

**[Happy Path C — Run XLSX Export (run-detail / project-runs)]**
1. 유저가 Run → Export → XLSX 선택.
2. 이미 `await import('exceljs')` 사용 중 — 변경 없음.

**[Alternative Flow — CSV 경로]**
- CSV import/export는 자체 파서(`parseCSV` / `parseCSVImport`)가 사용되며 xlsx에 의존하지 않는다. **변경 없음.**

**[Error Flow]**
- 시트 없음 → `"Excel 파일에 시트가 없습니다."` (기존 메시지 유지).
- 손상된 파일 → exceljs는 `workbook.xlsx.load`에서 throw → 기존 catch 구문에서 `"Excel 파싱 오류: …"` 노출 (메시지 문구 유지).
- Title 컬럼 없음 → 기존 경고 유지.

### 4-2. 비즈니스 규칙 / 기술 규칙

| 규칙 ID | 규칙 | 비고 |
|---------|------|------|
| BR-1 | 외부 라이브러리 2개 병존 금지 (xlsx 완전 제거) | 번들/보안 |
| BR-2 | exceljs 호출은 100% 동적 import | 초기 청크 비대 방지 |
| BR-3 | 기존 파싱된 행 스키마(`Record<string,string>`)와 출력 메시지 문구는 유지 | UI/번역 변경 금지 |
| BR-4 | 이전 xlsx로 내보낸 .xlsx 파일도 **역호환 읽기**가 가능해야 함 | .xlsx는 표준 OOXML 포맷이라 exceljs로 호환 가능 |
| BR-5 | `.xls` (구 BIFF) 파일은 **지원 중단** — exceljs는 .xls 쓰기/읽기를 지원하지 않음. | 아래 4-3 참조 |

### 4-3. .xls (구 BIFF) 지원 처리

- xlsx(SheetJS)는 `.xls` (BIFF8)도 읽을 수 있었지만, **exceljs는 .xls를 지원하지 않는다** ([공식 README](https://github.com/exceljs/exceljs#readme)).
- 현재 업로드 UI는 `.csv, .xlsx, .xls` accept 중. 대응책:
  - **Option A (채택):** `.xls` accept 유지하되, 업로드 시 확장자가 `.xls`면 **명시적 에러 메시지** 노출: `"Legacy .xls files are no longer supported. Please re-save as .xlsx in Excel and try again."` / `"구 버전 .xls 파일은 지원되지 않습니다. Excel에서 .xlsx로 저장 후 다시 시도해주세요."`
  - 근거: (1) .xls는 2007년 이전 포맷 — 실제 사용자 유입 거의 없음, (2) 보안 이슈가 있는 xlsx를 유지하는 비용이 더 큼.
- `ExportImportModal.tsx` `handleFileSelect` / `handleDrop`에서 확장자 분기 시 `.xls` → 에러 텍스트로 라우팅. `<input accept>` 는 `.csv,.xlsx` 로 축소.

### 4-4. RBAC (변경 없음)

이 작업은 라이브러리 교체이므로 기존 Export/Import 기능의 권한 매트릭스를 **그대로 상속**한다.

| 역할 | 조회 | Import | Export |
|------|------|--------|--------|
| Owner | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ |
| Manager | ✓ | ✓ | ✓ |
| Tester | ✓ | ✗ (설정에 따름) | ✓ |
| Viewer | ✓ | ✗ | ✓ |
| Guest | ✗ | ✗ | ✗ |

### 4-5. 플랜별 제한 (변경 없음)

기존 Export/Import 플랜 정책을 **상속**. 본 작업은 어떤 플랜 제한도 **추가하지 않는다**.

---

## 5. 데이터 설계

DB 스키마 변경 **없음**. 마이그레이션 파일 생성 금지.

---

## 6. API 설계

Edge Function / Supabase RPC **변경 없음**.

### 6-1. 라이브러리 API 매핑 (xlsx → exceljs)

| 용도 | xlsx (SheetJS) 기존 | exceljs 교체 | 비고 |
|------|---------------------|--------------|------|
| 동적 로드 | `const XLSX = await import('xlsx')` | `const ExcelJS = await import('exceljs')` | 동일 패턴 유지 |
| 버퍼에서 읽기 | `XLSX.read(buffer, { type: 'array' })` | `const wb = new ExcelJS.Workbook(); await wb.xlsx.load(buffer)` | **ArrayBuffer** 그대로 `load()`에 전달 가능 |
| 시트 이름 목록 | `workbook.SheetNames[0]` | `wb.worksheets[0]?.name` 또는 `wb.worksheets[0]` 직접 사용 | `worksheets[]` 배열 |
| 시트 객체 얻기 | `workbook.Sheets[sheetName]` | `const ws = wb.getWorksheet(sheetName) ?? wb.worksheets[0]` | |
| 시트 → JSON | `XLSX.utils.sheet_to_json(sheet, { defval: '' })` | 수동 변환 (아래 6-2 스니펫) | exceljs엔 직행 헬퍼 없음 — `eachRow` 순회 |
| 워크북 생성 | n/a (본 코드는 exceljs 이미 사용) | `new ExcelJS.Workbook()` | 변경 없음 |
| 워크시트 추가 | n/a | `wb.addWorksheet('Name')` | 변경 없음 |
| 쓰기 출력 | n/a | `await wb.xlsx.writeBuffer()` → `Blob` | 변경 없음 |

### 6-2. 코드 스니펫: `parseExcelImport` 교체

**Before — `src/utils/excelImport.ts:125-171`** (현재, xlsx 기반)
```typescript
export async function parseExcelImport(buffer: ArrayBuffer): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { success: false, data: [], errors: ['Excel 파일에 시트가 없습니다.'], warnings, totalRows: 0 };
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    // …
  }
}
```

**After — exceljs 기반**
```typescript
export async function parseExcelImport(buffer: ArrayBuffer): Promise<ImportResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);

    const ws = wb.worksheets[0];
    if (!ws) {
      return { success: false, data: [], errors: ['Excel 파일에 시트가 없습니다.'], warnings, totalRows: 0 };
    }

    // 1행 = 헤더
    const headerRow = ws.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value ?? '').trim();
    });

    // 2행부터 데이터
    const rows: Record<string, string>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        const v = row.getCell(idx + 1).value;
        // exceljs Cell.value는 string | number | boolean | Date | RichText | Formula | Hyperlink 등
        obj[h] = serializeCellValue(v);
      });
      rows.push(obj);
    });

    if (rows.length === 0) {
      return { success: false, data: [], errors: ['Excel 시트가 비어 있습니다.'], warnings, totalRows: 0 };
    }

    // 헤더 Title 확인 — 기존 로직 그대로
    const hasTitle = headers.some(k => k.toLowerCase().includes('title'));
    if (!hasTitle) {
      errors.push('"Title" 컬럼이 없습니다. TestRail/Testably 형식의 Excel인지 확인해주세요.');
      return { success: false, data: [], errors, warnings, totalRows: 0 };
    }

    const data: ImportedTestCase[] = [];
    rows.forEach((row, idx) => {
      const tc = rowToTestCase(row, idx + 2, warnings);
      if (tc) data.push(tc);
    });

    if (data.length === 0) {
      return { success: false, data: [], errors: ['가져올 수 있는 테스트 케이스가 없습니다.'], warnings, totalRows: rows.length };
    }

    return { success: true, data, errors, warnings, totalRows: rows.length };
  } catch (err: any) {
    return { success: false, data: [], errors: [`Excel 파싱 오류: ${err.message}`], warnings, totalRows: 0 };
  }
}

// Helper — 파일 최상단이나 utility로 추출
function serializeCellValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  // RichText: { richText: [{ text: '…' }, …] }
  if (typeof v === 'object' && 'richText' in (v as any)) {
    return (v as any).richText.map((r: any) => r.text).join('');
  }
  // Hyperlink: { text, hyperlink }
  if (typeof v === 'object' && 'text' in (v as any)) {
    return String((v as any).text);
  }
  // Formula result: { formula, result }
  if (typeof v === 'object' && 'result' in (v as any)) {
    return serializeCellValue((v as any).result);
  }
  return String(v);
}
```

### 6-3. 코드 스니펫: `ExportModal` 타입 (수정 불필요)

- `src/components/ExportModal.tsx:4` `export type ExportFormat = 'pdf' | 'csv' | 'xlsx'` → 문자열 리터럴이라 **라이브러리 이름이 아님**. `xlsx` 문자열은 그대로 유지.
- `src/components/ExportModal.tsx:69` `{ id: 'xlsx', icon: 'ri-file-excel-2-line', … label: 'Excel' }` → 식별자 문자열, 변경 없음.

### 6-4. CSV 경로

- CSV Export/Import는 **이미 xlsx와 무관**하다 (`parseCSV` + `exportToTestRail` 자체 구현). 본 작업에서 손대지 않는다.

---

## 7. 영향 범위 (변경 파일 목록)

### 수정 파일 (5개)

| 파일 | 라인 | 변경 내용 |
|------|------|---------|
| `src/utils/excelImport.ts` | L5 (주석), L122-171 | 동적 import `xlsx` → `exceljs`. `XLSX.read` → `wb.xlsx.load`. `sheet_to_json` → `eachRow` 수동 직렬화. `serializeCellValue` 헬퍼 추가. 주석에서 "`xlsx` is dynamically imported…" 문구 수정. |
| `src/pages/project-testcases/components/ExportImportModal.tsx` | L354, L378-379, L777 | `.xls` 확장자 업로드 시 명시적 에러 (`"Legacy .xls files are no longer supported…"`). `<input accept>` 에서 `.xls` 제거. 파일 픽커 타겟 축소. |
| `package.json` | L27 (`"xlsx": "^0.18.5"`) | `dependencies`에서 xlsx 라인 삭제. |
| `package-lock.json` | 자동 재생성 | `npm install` 후 xlsx 관련 9000+줄 제거. |
| `src/locales/en.json` / `src/locales/ko.json` | 신규 키 2개 | `import.error.xls_unsupported` 키 추가 (아래 섹션 10). |

### 신규 파일 (0개)

없음.

### 변경하지 않는 파일 (xlsx 문자열은 있지만 라이브러리 import 아님)

- `src/components/ExportModal.tsx` — `xlsx`는 `ExportFormat` 리터럴.
- `src/pages/project-runs/page.tsx` — `await import('exceljs')` 이미 사용 중, xlsx 패키지 import 0개. `.xlsx` 파일 확장자 문자열만 존재.
- `src/pages/run-detail/page.tsx` — 동일, 이미 exceljs 사용.
- `src/utils/testRailExport.ts` — 이미 exceljs 사용 중. 주석에 "XLSX export uses ExcelJS" 문구 존재 — **사실 그대로라 변경 불필요**.

### grep 확인 결과 (정확한 비 이관 타겟)

실제 `xlsx` 패키지 import는 **src 전체에서 단 1개** (`src/utils/excelImport.ts:130`).

---

## 8. 엣지 케이스

| 케이스 | 예상 동작 |
|--------|---------|
| 이전 xlsx 라이브러리로 export된 .xlsx 파일 import | exceljs `xlsx.load()`는 OOXML 표준 준수 → **정상 파싱** (회귀 없음) |
| 빈 시트만 있는 워크북 | `ws.eachRow`가 한 번도 안 돌아감 → `rows.length === 0` → 기존 "Excel 시트가 비어 있습니다." 에러 유지 |
| 시트 0개 | `wb.worksheets[0]` undefined → "Excel 파일에 시트가 없습니다." |
| 헤더만 있는 시트 | 데이터 0행 → 기존 "가져올 수 있는 테스트 케이스가 없습니다." |
| RichText 셀 (포맷팅 있는 셀) | `serializeCellValue`가 `richText[].text`를 모두 concat → 일반 텍스트로 보존 |
| 숫자 ID 셀 (`123`) | `typeof v === 'number'` → `String(v)` 변환, 기존 TestRail import/export 정상 |
| 날짜 셀 (`Date`) | `v.toISOString()` → 기존 테스트 케이스에는 날짜 컬럼이 쓰이지 않아 영향 없음 |
| Formula 셀 (`=A1+B1`) | `v.result` 재귀 직렬화 |
| `.xls` 업로드 시도 | 명시적 에러 토스트 + accept에서 제거되어 드롭 시에도 차단 |
| 손상된 xlsx | `wb.xlsx.load()` throw → catch → `"Excel 파싱 오류: …"` |
| 대용량 파일 (10k+ 행) | exceljs가 xlsx보다 느릴 수 있으나 동일 동적 import 라 UX 동일. **수동 스모크에서 5k행 파일 확인 필요**. |
| 한글/이모지 셀 | exceljs UTF-8 기본 지원 → 깨짐 없음 (수동 확인 필수) |
| 병합 셀 (merged cells) | `eachRow`에서 merge 영역 첫 셀만 값 보유, 나머지는 빈칸 — 기존 xlsx도 `sheet_to_json`이 동일 동작이라 **회귀 없음** |
| 동적 청크 스플릿 | `vite build` 결과 `dist/assets/exceljs-*.js` 별도 청크로만 존재 확인 |

---

## 9. Out of Scope (이번에 안 하는 것)

- [ ] PDF 내보내기 교체 — jspdf 계속 사용, 본 작업 범위 아님.
- [ ] CSV 파서 리팩토링 — `parseCSV` 자체 구현 유지.
- [ ] xlsx 기반 테스트 픽스처 (있다면) 형식 변경 — .xlsx는 표준 바이너리라 파일 자체는 그대로 유지.
- [ ] Excel 파일 내 **이미지 / 차트** 추출 — 현재도 미지원, 이번에도 미지원.
- [ ] `.xls` 구 포맷 지원 부활 — 본 작업에서 의도적으로 제거.
- [ ] Export 모달의 "Excel" 라벨 / 아이콘 변경 — UI 그대로.
- [ ] 번들 사이즈 최적화(exceljs tree-shake) — 별도 티켓.
- [ ] `_context/`, `legal/`, `pending-production-sql.sql` 등 프로덕션 런타임 밖 파일 정리.

---

## 10. i18n 키

`.xls` 구 포맷 차단 메시지 + 기존 에러 문구는 `src/utils/excelImport.ts` 내 하드코딩 한국어/영어 혼합 상태(기존). **본 작업은 기존 문구 스타일을 유지**하되, 신규 `.xls` 에러 메시지는 i18n 키로 추가해 향후 런타임 번역이 일관되도록 한다.

| 키 | EN | KO |
|----|----|----|
| `import.error.xls_unsupported` | "Legacy .xls files are no longer supported. Please re-save as .xlsx in Excel and try again." | "구 버전 .xls 파일은 더 이상 지원되지 않습니다. Excel에서 .xlsx로 저장한 뒤 다시 시도해주세요." |
| `import.error.xlsx_parse_failed` (선택, 기존 `Excel 파싱 오류` 대체 후보) | "Failed to parse Excel file: {{message}}" | "엑셀 파일 파싱 오류: {{message}}" |

> 신규 키 2개만 `src/locales/en.json` / `src/locales/ko.json`에 추가. 기존 하드코딩 문구는 본 스펙 범위에서 변경하지 않는다 (별도 i18n coverage 스펙에서 처리).

---

## 11. 리스크 & 완화책

| 리스크 | 영향 | 완화책 |
|--------|------|--------|
| exceljs가 xlsx(SheetJS)와 미묘하게 다른 셀 타입 처리로 한글/병합 셀/수식 결과 손실 | 중 | `serializeCellValue` 가 richText / hyperlink / formula.result / Date 케이스를 모두 커버. 수동 스모크 필수. |
| 이전 사용자가 xlsx로 내보낸 .xlsx를 새 버전 import 시 실패 | 중 | OOXML 표준 준수로 이론상 호환. QA가 **이전 버전 dist에서 export한 파일을 새 코드로 import** 하는 회귀 테스트 1회 필수. AC-5에 명시. |
| 번들 사이즈 증가 | 낮 | exceljs는 이미 executive report / run 페이지에서 로딩 중 (`~937KB min`). xlsx(~429KB)는 순감소. 단, **초기 청크에 안 들어가도록 동적 import만 사용**해야 함 (AC-10). |
| `.xls` 업로더가 에러 토스트 후 상태 초기화 안 되어 UI 고장 | 낮 | 기존 `setImportErrors` 경로로 처리. 수동 확인. |
| exceljs가 Node.js Buffer를 기대하는데 ArrayBuffer를 넘김 | 낮 | exceljs 4.4.0은 브라우저 ArrayBuffer를 직접 허용 (`wb.xlsx.load(data: ArrayBuffer \| Buffer)`) — 타입 확인됨. |
| package-lock.json 재생성 시 관련없는 패키지 버전 변동 | 중 | `npm install` 전용, `--package-lock-only` 플래그 검토. 불필요한 업데이트가 감지되면 revert. |

---

## 12. 구현 작업 순서 (Developer 가이드)

1. `src/utils/excelImport.ts` — `parseExcelImport` 함수 본문 교체 + `serializeCellValue` 헬퍼 추가.
2. `src/pages/project-testcases/components/ExportImportModal.tsx` — `.xls` 차단 로직 추가 (`handleFileSelect`, `handleDrop`, `<input accept>` 속성).
3. `src/locales/en.json` / `src/locales/ko.json` — i18n 키 2개 추가.
4. `package.json` — `"xlsx": "^0.18.5"` 라인 삭제.
5. `rm package-lock.json && npm install` (또는 `npm uninstall xlsx`) 후 `npm ls xlsx` → empty 확인.
6. 로컬 스모크:
   - `npm run build && npm run preview` → Test Cases 페이지 → Export .xlsx → 파일 열기 확인.
   - Export한 파일을 다시 Import → preview 정상 확인.
   - 이전 버전 .xlsx 샘플 (있다면) Import 확인.
   - Run Detail → Export XLSX → 열기 확인.
   - `.xls` 파일 업로드 시 에러 확인.
7. `npx tsc --noEmit`, `npm run test -- --run`, `npm run scan:i18n:check`, `npm run scan:i18n:parity`, `npm run build` 전부 PASS.
8. CI 통과 후 claude 브랜치로 PR.

---

## 13. Designer 개입 필요?

**불필요. Developer 직접 구현.**

- 서버/유틸 레벨 라이브러리 교체로 UI 변화 없음.
- 신규 i18n 키 2개는 기존 에러 토스트 컴포넌트를 그대로 사용하므로 디자인 명세 불필요.

---

## 개발 착수 전 체크리스트

- [x] 수용 기준이 전부 테스트 가능한 문장인가 (AC-1 ~ AC-10)
- [x] DB 스키마 변경 없음 — N/A 명시
- [x] RLS 변경 없음 — N/A 명시
- [x] 플랜별 제한 변경 없음 — 상속 명시
- [x] RBAC 권한 매트릭스 — 기존 상속 명시
- [x] 변경 파일 목록이 실제 경로 + 라인으로 구체적 (5개 파일)
- [x] 엣지 케이스 식별 (13개)
- [x] Out of Scope 명시 (8개)
- [x] i18n 키 en/ko 둘 다 명시 (2개)
- [x] 디자인 명세 불필요 사유 명시
- [x] 리스크 & 완화책 포함
- [x] 구현 작업 순서 문서화
