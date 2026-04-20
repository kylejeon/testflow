/**
 * Excel/CSV Import Utility
 * .xlsx, .xls, .csv 파일을 파싱하여 TestCase 배열로 변환
 */
// `xlsx` is dynamically imported inside parseExcelImport to keep it out of the
// initial bundle for the Test Cases page.
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
 * Excel 파일(ArrayBuffer) 파싱
 * `xlsx` is loaded lazily — it is a heavy dep (~400 kB minified) and only
 * needed when a user actually imports an .xlsx/.xls file.
 */
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

    if (rows.length === 0) {
      return { success: false, data: [], errors: ['Excel 시트가 비어 있습니다.'], warnings, totalRows: 0 };
    }

    // 헤더 확인
    const firstRow = rows[0];
    const hasTitle = Object.keys(firstRow).some(k => k.toLowerCase().includes('title'));
    if (!hasTitle) {
      errors.push('"Title" 컬럼이 없습니다. TestRail/Testably 형식의 Excel인지 확인해주세요.');
      return { success: false, data: [], errors, warnings, totalRows: 0 };
    }

    // 값을 모두 string으로 변환
    const stringRows: Record<string, string>[] = rows.map(r =>
      Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '')]))
    );

    const data: ImportedTestCase[] = [];
    stringRows.forEach((row, idx) => {
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
