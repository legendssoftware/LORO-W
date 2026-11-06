/**
 * Report export utilities: Excel (xlsx) and PDF (jspdf-autotable).
 * CSV lives in csv-export so list pages do not load these libraries.
 * Used by the reports page Export dropdown for Attendance and Metrics exports.
 */

import { neutralizeSpreadsheetCell } from '@/lib/utils/csv-export';

const EXCEL_COLUMN_WIDTH = 18;

export type ExportToExcelOptions = {
  /** Bold the first header row (best-effort; depends on SheetJS build). */
  boldHeader?: boolean;
  /** Worksheet tab name (defaults to "Report"). */
  sheetName?: string;
  /** Freeze the header row when scrolling. */
  freezeHeader?: boolean;
};

/**
 * Export table data to Excel (.xlsx) using SheetJS.
 * All columns use equal width for consistent layout.
 */
export function exportToExcel(
  headers: string[],
  rows: string[][],
  filename: string,
  options?: ExportToExcelOptions,
): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx');
  const base = filename.replace(/\.xlsx?$/i, '');
  const name = `${base}.xlsx`;
  const safeHeaders = headers.map(neutralizeSpreadsheetCell);
  const safeRows = rows.map((row) => row.map(neutralizeSpreadsheetCell));
  const wsData = [safeHeaders, ...safeRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const columnCount = safeHeaders.length;
  ws['!cols'] = Array.from({ length: columnCount }, () => ({ wch: EXCEL_COLUMN_WIDTH }));

  if (options?.boldHeader) {
    for (let c = 0; c < columnCount; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c });
      const cell = ws[cellRef];
      if (cell) {
        cell.s = { font: { bold: true } };
      }
    }
  }

  if (options?.freezeHeader) {
    ws['!views'] = [{ state: 'frozen', ySplit: 1, activeCell: 'A2' }];
  }

  const wb = XLSX.utils.book_new();
  const sheetName = options?.sheetName?.trim() || 'Report';
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, name);
}

const PDF_MARGIN = 20;

/**
 * Export table data to PDF using jspdf and jspdf-autotable.
 * Always landscape; equal column widths spread across full page width.
 * TODO: Embed Urbanist via doc.addFileToVFS + doc.addFont (base64 TTF in web/public/fonts or loaded at build time), then set styles: { font: 'Urbanist' } and headStyles.font for brand consistency.
 */
export function exportToPdf(headers: string[], rows: string[][], filename: string): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { jsPDF } = require('jspdf');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { autoTable } = require('jspdf-autotable');
  const base = filename.replace(/\.pdf$/i, '');
  const name = `${base}.pdf`;
  const doc = new jsPDF({ orientation: 'l', unit: 'pt' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - PDF_MARGIN * 2;
  const columnCount = headers.length;
  const columnWidth = columnCount > 0 ? tableWidth / columnCount : tableWidth;
  const columnStyles: Record<number, { cellWidth: number }> = {};
  for (let i = 0; i < columnCount; i++) {
    columnStyles[i] = { cellWidth: columnWidth };
  }
  autoTable(doc, {
    head: [headers],
    body: rows,
    theme: 'plain',
    margin: PDF_MARGIN,
    tableWidth,
    columnStyles,
    headStyles: {
      fillColor: [242, 242, 242],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });
  doc.save(name);
}
