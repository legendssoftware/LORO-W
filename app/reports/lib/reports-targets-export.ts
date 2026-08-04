/**
 * Export Reports Targets table rows to CSV / Excel.
 */

import type { ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import { formatReportCurrencyCode } from '@/app/reports/lib/reports-chart-format';
import type { ReportsTargetsCurrencyView } from '@/app/reports/lib/reports-target-currency';
import { summarizeTargetWarnings } from '@/lib/target-warnings-summary';
import { exportToCsv, exportToExcel } from '@/lib/utils/report-export';

const CURRENCY_VIEW_LABEL: Record<ReportsTargetsCurrencyView, string> = {
  set: 'Target (set)',
  branch: 'Branch (ERP)',
  zar: 'ZAR (consolidated)',
};

function salesExportHeaderLabels(view: ReportsTargetsCurrencyView): {
  current: string;
  target: string;
} {
  switch (view) {
    case 'zar':
      return {
        current: 'Sales (current) R',
        target: 'Sales (target) R',
      };
    case 'branch':
      return {
        current: 'Sales (current, branch)',
        target: 'Sales (target, branch)',
      };
    case 'set':
      return {
        current: 'Sales (current, set)',
        target: 'Sales (target, set)',
      };
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

/** Build export column headers for the active currency view. */
export function buildReportsTargetsExportHeaders(
  currencyView: ReportsTargetsCurrencyView = 'set'
): string[] {
  const salesHeaders = salesExportHeaderLabels(currencyView);
  return [
    'User',
    'Branch',
    'Period',
    'Calls (current)',
    'Calls (target)',
    'Calls %',
    'Leads (current)',
    'Leads (target)',
    'Leads %',
    salesHeaders.current,
    salesHeaders.target,
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
    'Currency view',
  ];
}

export function formatExportCount(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString();
}

export function formatExportPercent(value: number): string {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function formatExportMoney(
  value: number,
  currency?: string | null,
  /** When false (ZAR consolidated view), omit per-cell currency prefix. */
  includeCurrencyPrefix = true
): string {
  if (!Number.isFinite(value)) return includeCurrencyPrefix ? `${formatReportCurrencyCode(currency)} 0` : '0';
  const amount = Math.round(value).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  });
  if (!includeCurrencyPrefix) return amount;
  const code = formatReportCurrencyCode(currency);
  return `${code} ${amount}`;
}

/**
 * Build a single export row; column order matches buildReportsTargetsExportHeaders.
 */
export function reportsTargetRowToExportRow(
  row: ReportsTargetRow,
  currencyView: ReportsTargetsCurrencyView = 'set'
): string[] {
  const warnings = summarizeTargetWarnings(row.targetWarnings);
  const warningLevel =
    warnings.currentLevel === 1 ||
    warnings.currentLevel === 2 ||
    warnings.currentLevel === 3
      ? String(warnings.currentLevel)
      : '';

  const includeSalesCurrencyPrefix = currencyView !== 'zar';

  return [
    row.name?.trim() || '-',
    row.branch?.trim() || '-',
    row.periodLabel?.trim() || '-',
    formatExportCount(row.calls.current),
    formatExportCount(row.calls.target),
    formatExportPercent(row.engagementMet ? 100 : row.calls.progress),
    formatExportCount(row.leads.current),
    formatExportCount(row.leads.target),
    formatExportPercent(row.engagementMet ? 100 : row.leads.progress),
    formatExportMoney(row.sales.current, row.sales.currency, includeSalesCurrencyPrefix),
    formatExportMoney(row.sales.target, row.sales.currency, includeSalesCurrencyPrefix),
    formatExportPercent(row.sales.progress),
    formatExportCount(row.hours.current),
    formatExportCount(row.hours.target),
    formatExportPercent(row.hours.progress),
    row.productivity.score != null ? formatExportPercent(row.productivity.score) : '',
    formatExportPercent(row.achievement),
    row.engagementMet ? 'Yes' : 'No',
    warningLevel,
    formatExportCount(warnings.totalAcknowledged),
    formatExportCount(warnings.totalIssued),
    CURRENCY_VIEW_LABEL[currencyView],
  ];
}

/**
 * Export targets table rows to CSV or Excel.
 * Uses the list in given order (typically the filtered/sorted visible page).
 */
export function exportReportsTargets(
  rows: ReportsTargetRow[],
  exportFormat: 'csv' | 'excel',
  baseName: string,
  currencyView: ReportsTargetsCurrencyView = 'set'
): void {
  const headers = buildReportsTargetsExportHeaders(currencyView);
  const body = rows.map((row) => reportsTargetRowToExportRow(row, currencyView));
  if (exportFormat === 'csv') exportToCsv(headers, body, baseName);
  else {
    exportToExcel(headers, body, baseName, {
      boldHeader: true,
      sheetName: 'Targets',
      freezeHeader: true,
    });
  }
}
