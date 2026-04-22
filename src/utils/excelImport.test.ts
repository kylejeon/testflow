/**
 * Tests for src/utils/excelImport.ts (f033 — exceljs migration).
 *
 * Covers:
 *  - serializeCellValue helper (null / primitives / Date / RichText /
 *    Hyperlink / Formula / Error)
 *  - parseExcelImport against a live exceljs-generated buffer
 *    (normal rows, empty cells, richText, Date, Korean / emoji, no Title
 *    column, empty sheet, no sheets)
 *
 * Related spec: docs/specs/dev-spec-f033-xlsx-to-exceljs.md §3 AC-4/AC-5,
 * §8 (edge cases).
 */
import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import { parseExcelImport, serializeCellValue } from './excelImport';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function buildXlsxBuffer(
  build: (ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook) => void,
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  build(ws, wb);
  // writeBuffer resolves to a Node Buffer (Uint8Array) in JSDOM. Copy its
  // bytes into a fresh standalone ArrayBuffer so exceljs's JSZip can load it.
  const out = (await wb.xlsx.writeBuffer()) as ArrayBuffer | Uint8Array;
  if (out instanceof ArrayBuffer) return out;
  const u8 = out as Uint8Array;
  const ab = new ArrayBuffer(u8.byteLength);
  new Uint8Array(ab).set(u8);
  return ab;
}

// ─── serializeCellValue ─────────────────────────────────────────────────────

describe('serializeCellValue', () => {
  it('returns empty string for null/undefined', () => {
    expect(serializeCellValue(null)).toBe('');
    expect(serializeCellValue(undefined)).toBe('');
  });

  it('passes strings through untouched', () => {
    expect(serializeCellValue('hello')).toBe('hello');
    expect(serializeCellValue('한글 이모지 🎉')).toBe('한글 이모지 🎉');
    expect(serializeCellValue('')).toBe('');
  });

  it('stringifies numbers and booleans', () => {
    expect(serializeCellValue(42)).toBe('42');
    expect(serializeCellValue(0)).toBe('0');
    expect(serializeCellValue(true)).toBe('true');
    expect(serializeCellValue(false)).toBe('false');
  });

  it('serialises Date as ISO string', () => {
    const d = new Date('2026-04-21T00:00:00.000Z');
    expect(serializeCellValue(d)).toBe('2026-04-21T00:00:00.000Z');
  });

  it('concatenates richText cells', () => {
    const v = { richText: [{ text: 'Hello ' }, { text: 'World' }] };
    expect(serializeCellValue(v)).toBe('Hello World');
  });

  it('extracts hyperlink .text', () => {
    const v = { text: 'Click me', hyperlink: 'https://example.com' };
    expect(serializeCellValue(v)).toBe('Click me');
  });

  it('unwraps formula .result recursively', () => {
    expect(serializeCellValue({ formula: 'A1+B1', result: 7 })).toBe('7');
    expect(
      serializeCellValue({
        formula: 'A1',
        result: { richText: [{ text: 'rich' }] },
      }),
    ).toBe('rich');
  });

  it('returns error strings for error cells', () => {
    expect(serializeCellValue({ error: '#REF!' })).toBe('#REF!');
  });
});

// ─── parseExcelImport ───────────────────────────────────────────────────────

describe('parseExcelImport', () => {
  it('parses a normal xlsx (Title header + two data rows)', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Section', 'Priority', 'Steps']);
      ws.addRow(['TC-1 login flow', 'Auth', 'High', '1. open page']);
      ws.addRow(['TC-2 logout',     'Auth', 'Medium', '1. click logout']);
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(true);
    expect(r.totalRows).toBe(2);
    expect(r.data).toHaveLength(2);
    expect(r.data[0].title).toBe('TC-1 login flow');
    expect(r.data[0].folder).toBe('Auth');
    expect(r.data[0].priority).toBe('high');
    expect(r.data[1].priority).toBe('medium');
  });

  it('handles empty cells (serialised to "")', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Section', 'Priority']);
      ws.addRow(['TC only title', null, null]);
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(true);
    expect(r.data).toHaveLength(1);
    expect(r.data[0].title).toBe('TC only title');
    expect(r.data[0].folder).toBeUndefined();
    // priority defaults to medium when blank
    expect(r.data[0].priority).toBe('medium');
  });

  it('handles Date cells without losing the row', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Tags']);
      const row = ws.addRow(['TC with date', new Date('2026-04-21T00:00:00Z')]);
      // force the Tags cell to a Date value (addRow may coerce otherwise)
      row.getCell(2).value = new Date('2026-04-21T00:00:00Z');
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(true);
    expect(r.data[0].title).toBe('TC with date');
    expect(r.data[0].tags).toContain('2026-04-21');
  });

  it('parses richText cells into plain text', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Section']);
      const row = ws.addRow([null, null]);
      row.getCell(1).value = { richText: [{ text: 'Rich ' }, { text: 'Title' }] };
      row.getCell(2).value = { richText: [{ text: 'Auth' }] };
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(true);
    expect(r.data[0].title).toBe('Rich Title');
    expect(r.data[0].folder).toBe('Auth');
  });

  it('preserves Korean + emoji payloads', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Section']);
      ws.addRow(['로그인 기능 🎉', '인증 모듈']);
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(true);
    expect(r.data[0].title).toBe('로그인 기능 🎉');
    expect(r.data[0].folder).toBe('인증 모듈');
  });

  it('fails when Title column is missing', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Name', 'Priority']);
      ws.addRow(['not a title', 'High']);
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('Title');
  });

  it('fails on a header-only sheet (no data rows)', async () => {
    const buf = await buildXlsxBuffer(ws => {
      ws.addRow(['Title', 'Priority']);
    });
    const r = await parseExcelImport(buf);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toContain('비어');
  });

  it('fails gracefully on a corrupted buffer', async () => {
    const corrupted = new TextEncoder().encode('not an xlsx file').buffer;
    const r = await parseExcelImport(corrupted);
    expect(r.success).toBe(false);
    expect(r.errors[0]).toMatch(/Excel 파싱 오류/);
  });
});
