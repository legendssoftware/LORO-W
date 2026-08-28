/**
 * Report export utilities: CSV (native), Excel (xlsx), PDF (jspdf-autotable).
 * Used by the reports page Export dropdown for Attendance and Metrics exports.
 */

const UTF8_BOM = '\uFEFF';

/**
 * Escape a cell value for CSV (quotes and double-quotes).
 */
function escapeCsvCell(value: string): string {
    if (/[",\r\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
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
 * Trigger download of a Blob with the given filename.
 */
export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Export table data to CSV with UTF-8 BOM. Uses Blob + createObjectURL + <a download>.
 */
export function exportToCsv(
    headers: string[],
    rows: string[][],
    filename: string
): void {
    const base = filename.replace(/\.csv$/i, '');
    const name = `${base}.csv`;
    const content = buildCsvContent(headers, rows);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, name);
}

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
    options?: ExportToExcelOptions
): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const base = filename.replace(/\.xlsx?$/i, '');
    const name = `${base}.xlsx`;
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const columnCount = headers.length;
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
export function exportToPdf(
    headers: string[],
    rows: string[][],
    filename: string
): void {
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
