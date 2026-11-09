/**
 * Export Reports Targets table rows to CSV / Excel.
 */

import type { ReportsTargetRow } from '@/app/reports/lib/reports-target-row';
import { formatReportCurrencyCode } from '@/app/reports/lib/reports-chart-format';
import type { ReportsTargetsCurrencyView } from '@/app/reports/lib/reports-target-currency';
import { exportToCsv } from '@/lib/utils/csv-export';

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

function quotationsExportHeaderLabels(view: ReportsTargetsCurrencyView): {
  current: string;
  target: string;
} {
  switch (view) {
    case 'zar':
      return {
        current: 'Quotations (current) R',
        target: 'Quotations (target) R',
      };
    case 'branch':
      return {
        current: 'Quotations (current, branch)',
        target: 'Quotations (target, branch)',
      };
    case 'set':
      return {
        current: 'Quotations (current, set)',
        target: 'Quotations (target, set)',
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
  const quotationsHeaders = quotationsExportHeaderLabels(currencyView);
  return [
    'User',
    'Branch',
    'Period',
    'All Activity (current)',
    'All Activity (target)',
    'All Activity %',
    'Telephone',
    'WhatsApp',
    'Email',
    'Landline',
    'Visits (current)',
    'Visits (target)',
    'Visits %',
    'Leads (current)',
    'Leads (target)',
    'Leads %',
    'Quotations (count)',
    quotationsHeaders.current,
    quotationsHeaders.target,
    'Quotations %',
    salesHeaders.current,
    salesHeaders.target,
    'Sales %',
    'Hours (current)',
    'Hours (target)',
    'Hours %',
    'Distance (km)',
    'Check-ins (travel)',
    'Petrol claims (count)',
    'Petrol claims (amount)',
    'Fuel allowance',
    'Fuel %',
    'Productivity %',
    'Achievement %',
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
  const includeSalesCurrencyPrefix = currencyView !== 'zar';
  const activity = row.activity ?? {
    all: 0,
    telephone: 0,
    whatsapp: 0,
    email: 0,
    landline: 0,
    other: 0,
  };

  return [
    row.name?.trim() || '-',
    row.branch?.trim() || '-',
    row.periodLabel?.trim() || '-',
    formatExportCount(row.calls.current),
    formatExportCount(row.calls.target),
    formatExportPercent(row.calls.progress),
    formatExportCount(activity.telephone),
    formatExportCount(activity.whatsapp),
    formatExportCount(activity.email),
    formatExportCount(activity.landline),
    formatExportCount(row.visits.current),
    formatExportCount(row.visits.target),
    formatExportPercent(row.visits.progress),
    formatExportCount(row.leads.current),
    formatExportCount(row.leads.target),
    formatExportPercent(row.leads.progress),
    formatExportCount(row.quotations.current),
    formatExportMoney(
      row.quotations.amountCurrent ?? 0,
      row.quotations.currency,
      includeSalesCurrencyPrefix
    ),
    formatExportMoney(row.quotations.target, row.quotations.currency, includeSalesCurrencyPrefix),
    formatExportPercent(row.quotations.progress),
    formatExportMoney(row.sales.current, row.sales.currency, includeSalesCurrencyPrefix),
    formatExportMoney(row.sales.target, row.sales.currency, includeSalesCurrencyPrefix),
    formatExportPercent(row.sales.progress),
    formatExportCount(row.hours.current),
    formatExportCount(row.hours.target),
    formatExportPercent(row.hours.progress),
    Number.isFinite(row.travel?.distanceKm) ? String(row.travel.distanceKm) : '0',
    formatExportCount(row.travel?.visitCount ?? 0),
    formatExportCount(row.travel?.petrolClaimCount ?? 0),
    formatExportMoney(
      row.travel?.petrolClaimAmount ?? 0,
      row.quotations.currency,
      includeSalesCurrencyPrefix
    ),
    formatExportMoney(
      row.travel?.fuelAllowance ?? 0,
      row.quotations.currency,
      includeSalesCurrencyPrefix
    ),
    formatExportPercent(row.travel?.progress ?? 0),
    row.productivity.score != null ? formatExportPercent(row.productivity.score) : '',
    formatExportPercent(row.achievement),
    CURRENCY_VIEW_LABEL[currencyView],
  ];
}

/**
 * Export targets table rows to CSV or Excel.
 * Uses the list in given order (typically the filtered/sorted visible page).
 */
export function exportReportsTargets(
  rows: ReportsTargetRow[],
  exportFormat: 'csv' | 'excel' | 'pdf',
  baseName: string,
  currencyView: ReportsTargetsCurrencyView = 'set',
  heading?: string
): void {
  const headers = buildReportsTargetsExportHeaders(currencyView);
  const body = rows.map((row) => reportsTargetRowToExportRow(row, currencyView));
  if (exportFormat === 'csv') {
    exportToCsv(headers, body, baseName);
    return;
  }
  if (exportFormat === 'pdf') {
    const period = rows[0]?.periodLabel?.trim();
    const title = heading?.trim() || (period ? `Activity report · ${period}` : 'Activity report');
    void import('@/lib/utils/report-export').then(({ exportToPdf }) => {
      exportToPdf(headers, body, baseName, title);
    });
    return;
  }
  void import('@/lib/utils/report-export').then(({ exportToExcel }) => {
    exportToExcel(headers, body, baseName, {
      boldHeader: true,
      sheetName: 'Targets',
      freezeHeader: true,
    });
  });
}
