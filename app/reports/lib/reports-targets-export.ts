/**
 * Export Reports Targets table rows to CSV / Excel.
 * Column order aligned with ReportsTargetsTable headers.
 */

import type { ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import { formatReportCurrencyCode } from '@/app/reports/lib/reports-chart-format';
import { summarizeTargetWarnings } from '@/lib/target-warnings-summary';
import { exportToCsv, exportToExcel } from '@/lib/utils/report-export';

export const REPORTS_TARGETS_EXPORT_HEADERS = [
  'User',
  'Email',
  'Branch',
  'Period',
  'Calls (current)',
  'Calls (target)',
  'Calls %',
  'Leads (current)',
  'Leads (target)',
  'Leads %',
  'Sales (current)',
  'Sales (target)',
  'Sales currency',
  'Sales %',
  'Hours (current)',
  'Hours (target)',
  'Hours %',
  'Productivity %',
  'Achievement %',
  'Engagement met',
  'Warning level',
  'Warnings acknowledged',
  'Warnings issued',
] as const;

function roundNum(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return String(Math.round(value));
}

/**
 * Build a single export row; column order matches REPORTS_TARGETS_EXPORT_HEADERS.
 */
export function reportsTargetRowToExportRow(row: ReportsTargetRow): string[] {
  const warnings = summarizeTargetWarnings(row.targetWarnings);
  const warningLevel =
    warnings.currentLevel === 1 ||
    warnings.currentLevel === 2 ||
    warnings.currentLevel === 3
      ? String(warnings.currentLevel)
      : '';

  return [
    row.name?.trim() || '-',
    row.email?.trim() || '-',
    row.branch?.trim() || '-',
    row.periodLabel?.trim() || '-',
    roundNum(row.calls.current),
    roundNum(row.calls.target),
    roundNum(row.engagementMet ? 100 : row.calls.progress),
    roundNum(row.leads.current),
    roundNum(row.leads.target),
    roundNum(row.engagementMet ? 100 : row.leads.progress),
    roundNum(row.sales.current),
    roundNum(row.sales.target),
    formatReportCurrencyCode(row.sales.currency, ''),
    roundNum(row.sales.progress),
    roundNum(row.hours.current),
    roundNum(row.hours.target),
    roundNum(row.hours.progress),
    row.productivity.score != null ? roundNum(row.productivity.score) : '',
    roundNum(row.achievement),
    row.engagementMet ? 'Yes' : 'No',
    warningLevel,
    String(warnings.totalAcknowledged),
    String(warnings.totalIssued),
  ];
}

/**
 * Export targets table rows to CSV or Excel.
 * Uses the list in given order (typically the filtered/sorted visible page).
 */
export function exportReportsTargets(
  rows: ReportsTargetRow[],
  exportFormat: 'csv' | 'excel',
  baseName: string
): void {
  const headers = [...REPORTS_TARGETS_EXPORT_HEADERS];
  const body = rows.map(reportsTargetRowToExportRow);
  if (exportFormat === 'csv') exportToCsv(headers, body, baseName);
  else exportToExcel(headers, body, baseName);
}
