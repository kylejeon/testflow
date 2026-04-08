/**
 * TestRail CSV/XLSX Export/Import Utility
 * TestRail 호환 포맷으로 테스트 케이스를 내보내고 가져오는 유틸리티
 */
import * as XLSX from 'xlsx';

export interface TestRailRow {
  'ID': string;
  'Title': string;
  'Section': string;
  'Section Description': string;
  'Preconditions': string;
  'Steps': string;
  'Expected Result': string;
  'Priority': string;
  'Type': string;
  'Automation Type': string;
  'Tags': string;
  'Estimate': string;
  'Mission': string;
  'Goals': string;
}

export interface TestCase {
  id: string;
  custom_id?: string;
  title: string;
  description?: string;
  precondition?: string;
  folder?: string;
  priority: string;
  is_automated?: boolean;
  steps?: string;
  expected_result?: string;
  tags?: string;
  assignee?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

// HTML 태그 제거 유틸리티
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

// Priority 매핑 (Testably -> TestRail)
const priorityToTestRail = (priority: string): string => {
  const map: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return map[priority?.toLowerCase()] || 'Medium';
};

// Priority 매핑 (TestRail -> Testably)
const priorityFromTestRail = (priority: string): string => {
  const map: Record<string, string> = {
    'Critical': 'critical',
    'High': 'high',
    'Medium': 'medium',
    'Low': 'low',
    '1': 'low',
    '2': 'medium',
    '3': 'high',
    '4': 'critical',
  };
  return map[priority] || 'medium';
};

// Steps 파싱: "1. step\n2. step" -> 각 줄 배열
const parseSteps = (stepsStr: string): string[] => {
  if (!stepsStr) return [];
  return stepsStr.split('\n').filter(s => s.trim()).map(s => s.replace(/^\d+\.\s*/, '').trim());
};

// Steps 배열 -> TestRail 포맷 (번호 포함 줄바꿈)
const stepsToTestRail = (stepsStr: string): string => {
  if (!stepsStr) return '';
  const cleaned = stripHtml(stepsStr);
  const lines = parseSteps(cleaned);
  return lines.map((l, i) => `${i + 1}. ${l}`).join('\n');
};

// CSV 셀 이스케이프
const escapeCSV = (value: string): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

// CSV 파싱 (RFC 4180 준수)
export const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '""';
        i++;
      } else {
        inQuotes = !inQuotes;
        current += char;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i++;
      lines.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  if (lines.length === 0) return [];

  const parseRow = (line: string): string[] => {
    const cells: string[] = [];
    let cell = '';
    let inQ = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const n = line[i + 1];
      if (c === '"') {
        if (inQ && n === '"') { cell += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cell);
        cell = '';
      } else {
        cell += c;
      }
    }
    cells.push(cell);
    return cells;
  };

  const headers = parseRow(lines[0]);
  const result: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const values = parseRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header.trim()] = values[idx] !== undefined ? values[idx].trim() : '';
    });
    result.push(row);
  }

  return result;
};

const ALL_EXPORT_HEADERS: (keyof TestRailRow)[] = [
  'ID', 'Title', 'Section', 'Section Description', 'Preconditions',
  'Steps', 'Expected Result', 'Priority', 'Type', 'Automation Type',
  'Tags', 'Estimate', 'Mission', 'Goals',
];

const resolveSafeName = (projectName: string): string => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const trimmed = (projectName || '').trim();
  return (!trimmed || uuidRegex.test(trimmed)) ? 'project' : trimmed;
};

const getColValue = (tc: TestCase, col: keyof TestRailRow): string => {
  switch (col) {
    case 'ID':                  return tc.custom_id || '';
    case 'Title':               return tc.title || '';
    case 'Section':             return tc.folder || '';
    case 'Section Description': return stripHtml(tc.description || '');
    case 'Preconditions':       return stripHtml(tc.precondition || '');
    case 'Steps':               return stepsToTestRail(tc.steps || '');
    case 'Expected Result':     return stepsToTestRail(tc.expected_result || '');
    case 'Priority':            return priorityToTestRail(tc.priority);
    case 'Type':                return 'Functional';
    case 'Automation Type':     return tc.is_automated ? 'Automated' : 'None';
    case 'Tags':                return tc.tags || '';
    default:                    return '';
  }
};

/**
 * TestRail CSV Export
 */
export const exportToTestRail = (
  testCases: TestCase[],
  projectName: string = 'Project',
  selectedColumns?: Set<string>
): void => {
  const safeName = resolveSafeName(projectName);
  const headers = selectedColumns
    ? ALL_EXPORT_HEADERS.filter(h => selectedColumns.has(h))
    : ALL_EXPORT_HEADERS;

  const rows = testCases.map(tc =>
    headers.map(col => escapeCSV(getColValue(tc, col)))
  );

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const safeProjectName = safeName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').trim() || 'project';
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `${safeProjectName}-${dateStr}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * XLSX Export (ExcelJS — supports wrap text, bold header, column widths)
 */
export const exportToXLSX = async (
  testCases: TestCase[],
  projectName: string = 'Project',
  selectedColumns?: Set<string>
): Promise<void> => {
  const ExcelJS = await import('exceljs');
  const safeName = resolveSafeName(projectName);
  const headers = selectedColumns
    ? ALL_EXPORT_HEADERS.filter(h => selectedColumns.has(h))
    : ALL_EXPORT_HEADERS;

  const dataRows = testCases.map(tc => headers.map(col => getColValue(tc, col)));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test Cases');

  // Column widths: fit to longest line in each column (capped at 80 chars)
  ws.columns = headers.map((h, ci) => {
    let max = h.length;
    dataRows.forEach(row => {
      const lines = (row[ci] || '').split('\n');
      const longest = Math.max(...lines.map(l => l.length));
      if (longest > max) max = longest;
    });
    return { header: h, key: String(ci), width: Math.min(Math.max(max + 2, 10), 80) };
  });

  // Style header row: bold, light background
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  headerRow.alignment = { vertical: 'middle' };
  headerRow.commit();

  // Add data rows with wrap text
  dataRows.forEach(row => {
    const added = ws.addRow(row);
    added.alignment = { wrapText: true, vertical: 'top' };
    added.commit();
  });

  // Download via blob
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeProjectName = safeName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').trim() || 'project';
  const dateStr = new Date().toISOString().slice(0, 10);
  link.download = `${safeProjectName}-${dateStr}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * TestRail CSV Import - CSV 텍스트를 TestCase 배열로 변환
 */
export const importFromTestRail = (csvText: string): {
  success: boolean;
  data: Partial<TestCase>[];
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const rows = parseCSV(csvText);

    if (rows.length === 0) {
      return { success: false, data: [], errors: ['CSV 파일이 비어 있습니다.'], warnings };
    }

    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    // 필수 컬럼 확인
    const hasTitle = keys.some(k => k.toLowerCase().includes('title'));
    if (!hasTitle) {
      errors.push('CSV 파일에 "Title" 컬럼이 없습니다. TestRail 포맷의 CSV 파일인지 확인해주세요.');
      return { success: false, data: [], errors, warnings };
    }

    const data: Partial<TestCase>[] = [];

    rows.forEach((row, index) => {
      const rowNum = index + 2; // 헤더 포함 행 번호

      // 컬럼명 유연하게 매핑
      const getField = (...candidates: string[]): string => {
        for (const candidate of candidates) {
          const key = Object.keys(row).find(k => k.toLowerCase() === candidate.toLowerCase());
          if (key && row[key]) return row[key];
        }
        return '';
      };

      const title = getField('Title', 'Test Case Title', 'Name');
      if (!title) {
        warnings.push(`행 ${rowNum}: Title이 비어 있어 건너뜁니다.`);
        return;
      }

      const stepsRaw = getField('Steps', 'Test Steps', 'Step');
      const expectedRaw = getField('Expected Result', 'Expected Results', 'Expected');
      const priorityRaw = getField('Priority');
      const sectionRaw = getField('Section', 'Suite', 'Folder', 'Section/Suite');
      const preconditionRaw = getField('Preconditions', 'Precondition', 'Pre-conditions');
      const descriptionRaw = getField('Section Description', 'Description', 'Details');
      const automationRaw = getField('Automation Type', 'Automated', 'Type');
      const referencesRaw = getField('Tags', 'References', 'Labels');
      const idRaw = getField('ID', 'Case ID', 'Test Case ID');

      // Steps를 번호 형식으로 변환
      const formatSteps = (raw: string): string => {
        if (!raw) return '';
        const lines = raw.split('\n').filter(l => l.trim());
        return lines.map((line, i) => `${i + 1}. ${line.replace(/^[\d]+\.\s*/, '').trim()}`).join('\n');
      };

      const testCase: Partial<TestCase> = {
        title: title.trim(),
        description: descriptionRaw || '',
        precondition: preconditionRaw || '',
        folder: sectionRaw || '',
        priority: priorityFromTestRail(priorityRaw),
        steps: formatSteps(stepsRaw),
        expected_result: formatSteps(expectedRaw),
        is_automated: automationRaw?.toLowerCase().includes('auto') || false,
        tags: referencesRaw || '',
        status: 'untested',
        ...(idRaw ? { custom_id: idRaw } : {}),
      };

      data.push(testCase);
    });

    if (data.length === 0) {
      return { success: false, data: [], errors: ['가져올 수 있는 테스트 케이스가 없습니다.'], warnings };
    }

    return { success: true, data, errors, warnings };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      errors: [`CSV 파싱 오류: ${err.message || '알 수 없는 오류'}`],
      warnings,
    };
  }
};
