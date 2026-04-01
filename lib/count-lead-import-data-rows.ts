import * as XLSX from 'xlsx';

/** Data rows above this count use the long-running import UX (modal closes immediately). */
export const LARGE_IMPORT_ROW_THRESHOLD = 50;

function countCsvDataRows(text: string): number {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) return 0;
  return lines.length - 1;
}

function countXlsxDataRows(buffer: ArrayBuffer): number {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstName = workbook.SheetNames[0];
  if (!firstName) return 0;
  const sheet = workbook.Sheets[firstName];
  if (!sheet) return 0;
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  if (rows.length <= 1) return 0;
  let count = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const hasValue = row.some(
      (cell) => cell !== '' && cell != null && String(cell).trim() !== ''
    );
    if (hasValue) count++;
  }
  return count;
}

/**
 * Counts data rows in a lead import file (excluding header row).
 * Supports CSV and .xlsx (first worksheet only).
 */
export async function countLeadImportDataRows(file: File): Promise<number> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return countCsvDataRows(text);
  }
  if (name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    return countXlsxDataRows(buffer);
  }
  return 0;
}
