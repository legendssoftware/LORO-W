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
function downloadBlob(blob: Blob, filename: string): void {
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

/**
 * Export table data to Excel (.xlsx) using SheetJS.
 */
export function exportToExcel(
    headers: string[],
    rows: string[][],
    filename: string
): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const XLSX = require('xlsx');
    const base = filename.replace(/\.xlsx?$/i, '');
    const name = `${base}.xlsx`;
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, name);
}

/**
 * Export table data to PDF using jspdf and jspdf-autotable.
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
    const doc = new jsPDF();
    autoTable(doc, {
        head: [headers],
        body: rows,
    });
    doc.save(name);
}
