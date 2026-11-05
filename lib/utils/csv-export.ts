import { downloadBlob } from '@/lib/utils/download-file';

const UTF8_BOM = '\uFEFF';

/** Spreadsheet apps treat these leading characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Prefix formula-like cells so Excel and Sheets store them as text.
 */
export function neutralizeSpreadsheetCell(value: string): string {
  if (FORMULA_PREFIX.test(value)) return `'${value}`;
  return value;
}

/**
 * Escape a cell value for CSV (quotes and double-quotes).
 */
function escapeCsvCell(value: string): string {
  const safe = neutralizeSpreadsheetCell(value);
  if (/[",\r\n]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Build CSV string from headers and rows, with UTF-8 BOM for Excel compatibility.
 */
function buildCsvContent(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  return UTF8_BOM + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Export table data to CSV with UTF-8 BOM. Uses Blob + createObjectURL + <a download>.
 */
export function exportToCsv(headers: string[], rows: string[][], filename: string): void {
  const base = filename.replace(/\.csv$/i, '');
  const name = `${base}.csv`;
  const content = buildCsvContent(headers, rows);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, name);
}
