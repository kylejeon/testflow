/**
 * Excel/CSV Import Utility
 * .xlsx, .csv 파일을 파싱하여 TestCase 배열로 변환
 *
 * f033 (2026-04-21) — `xlsx` (SheetJS) → `exceljs` 교체.
 * `exceljs` is dynamically imported inside parseExcelImport to keep it out of
 * the initial bundle for the Test Cases page (heavy dep, ~900 kB min).
 *
 * Note: .xls (legacy BIFF) files are NOT supported by exceljs. The caller
 * (ExportImportModal) blocks .xls uploads before invoking this function.
 */
import { parseCSV } from './testRailExport';

export interface ImportedTestCase {
  title: string;
  description?: string;
  precondition?: string;
  folder?: string;
  priority: string;
  steps?: string;
  expected_result?: string;
  is_automated?: boolean;
  tags?: string;
  status?: string;
  custom_id?: string;
}

export interface ImportResult {
  success: boolean;
  data: ImportedTestCase[];
  errors: string[];
  warnings: string[];
  totalRows: number;
}

// Priority 매핑 (TestRail → Testably)
const priorityFromRaw = (raw: string): string => {
  const map: Record<string, string> = {
    Critical: 'critical', critical: 'critical', '4': 'critical',
    High: 'high', high: 'high', '3': 'high',
    Medium: 'medium', medium: 'medium', '2': 'medium',
    Low: 'low', low: 'low', '1': 'low',
  };
  return map[raw?.trim()] ?? 'medium';
};

// Steps 번호 포맷
const formatSteps = (raw: string): string => {
  if (!raw) return '';
  const lines = raw.split('\n').filter(l => l.trim());
  return lines.map((line, i) => `${i + 1}. ${line.replace(/^\d+\.\s*/, '').trim()}`).join('\n');
};

// 행 → TestCase 변환
function rowToTestCase(
  row: Record<string, string>,
  rowNum: number,
  warnings: string[],
): ImportedTestCase | null {
  const get = (...keys: string[]): string => {
    for (const k of keys) {
      const found = Object.keys(row).find(r => r.toLowerCase().trim() === k.toLowerCase());
      if (found && row[found]?.trim()) return row[found].trim();
    }
    return '';
  };

  const title = get('title', 'test case title', 'name', '제목');
  if (!title) {
    warnings.push(`행 ${rowNum}: Title이 비어 있어 건너뜁니다.`);
    return null;
  }

  return {
    title,
    description: get('section description', 'description', '설명') || undefined,
    precondition: get('preconditions', 'precondition', 'pre-conditions') || undefined,
    folder: get('section', 'suite', 'folder', '폴더') || undefined,
    priority: priorityFromRaw(get('priority', '우선순위')),
    steps: formatSteps(get('steps', 'test steps', 'step')) || undefined,
    expected_result: formatSteps(get('expected result', 'expected results', 'expected')) || undefined,
    is_automated: get('automation type', 'automated', 'type').toLowerCase().includes('auto'),
    tags: get('tags', 'references', 'labels', '태그') || undefined,
    status: 'untested',
    custom_id: get('id', 'case id', 'test case id') || undefined,
  };
}

/**
 * CSV 텍스트 파싱
 */
export function parseCSVImport(csvText: string): ImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const rows = parseCSV(csvText);
    if (rows.length === 0) {
      return { success: false, data: [], errors: ['CSV 파일이 비어 있습니다.'], warnings, totalRows: 0 };
    }

    const firstRow = rows[0];
    const hasTitle = Object.keys(firstRow).some(k => k.toLowerCase().includes('title'));
    if (!hasTitle) {
      errors.push('"Title" 컬럼이 없습니다. TestRail/Testably 형식의 CSV인지 확인해주세요.');
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
    return { success: false, data: [], errors: [`파싱 오류: ${err.message}`], warnings, totalRows: 0 };
  }
}

/**
 * Serialize an exceljs Cell.value (which can be string | number | boolean |
 * Date | RichText | Hyperlink | Formula | null | undefined) into a plain
 * string that downstream `rowToTestCase` can consume.
 *
 * Exposed for tests. Covers:
 *  - null / undefined  → ''
 *  - primitives        → String(v)
 *  - Date              → ISO string
 *  - RichText          → concatenated .richText[].text
 *  - Hyperlink         → .text (fallback to .hyperlink)
 *  - Formula           → serialize .result recursively
 */
export function serializeCellValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    // RichText: { richText: [{ text: '…' }, …] }
    if (Array.isArray(obj.richText)) {
      return (obj.richText as Array<{ text?: unknown }>)
        .map(r => (r && typeof r.text === 'string' ? r.text : ''))
        .join('');
    }
    // Formula result: { formula, result }
    if ('result' in obj) {
      return serializeCellValue(obj.result);
    }
    // Hyperlink / shared plain text: { text, hyperlink? }
    if ('text' in obj) {
      const t = obj.text;
      if (typeof t === 'string') return t;
      // text itself may be RichText
      return serializeCellValue(t);
    }
    // Error value: { error: '#REF!' }
    if ('error' in obj && typeof obj.error === 'string') {
      return obj.error;
    }
  }
  return String(v);
}

/**
 * Excel 파일(ArrayBuffer) 파싱 — exceljs 기반 (f033).
 *
 * `exceljs` is loaded lazily — heavy dep, only needed when a user actually
 * imports an .xlsx file. Caller must ensure the buffer is from a .xlsx
 * (OOXML) file — .xls (BIFF) is not supported by exceljs.
 */
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
    const cellCount = Math.max(headerRow.cellCount, headerRow.actualCellCount);
    for (let c = 1; c <= cellCount; c++) {
      const cell = headerRow.getCell(c);
      headers[c - 1] = serializeCellValue(cell.value).trim();
    }

    // 2행부터 데이터. eachRow는 `includeEmpty: false` 로 완전 빈 행은 스킵.
    const rows: Record<string, string>[] = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        if (!h) return;
        const v = row.getCell(idx + 1).value;
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
