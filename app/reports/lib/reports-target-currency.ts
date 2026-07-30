import {
  getErpSalesCurrencyForCountry,
  normalizeCurrencyCode,
} from '@/lib/utils/erp-currency';
import {
  calcTargetProgress,
  calcOverallAchievementWithEngagement,
  resolveCallsLeadsCellProgress,
} from '@/lib/utils/target-progress';
import type {
  ReportsTargetMetricCell,
  ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';

export type ReportsTargetsCurrencyView = 'set' | 'branch' | 'zar';

export type ExchangeRateMap = Map<string, number>;

export function buildExchangeRateMap(
  rates: Array<{ code: string; rate: number }> | null | undefined
): ExchangeRateMap {
  const map = new Map<string, number>();
  for (const row of rates ?? []) {
    const code = normalizeCurrencyCode(row.code);
    if (Number.isFinite(row.rate) && row.rate > 0) {
      map.set(code, row.rate);
    }
  }
  return map;
}

/** Resolve forex lookup code for an ISO currency (ZAR passthrough). */
function forexCodeForCurrency(isoCode: string): string {
  const code = normalizeCurrencyCode(isoCode);
  if (code === 'ZAR') return 'ZAR';
  return code;
}

/**
 * Convert amount to ZAR using tblforex_history semantics: amountZAR = amount / rate.
 */
export function amountToZar(
  amount: number,
  fromCurrency: string,
  rates: ExchangeRateMap
): number {
  if (!Number.isFinite(amount)) return 0;
  const from = forexCodeForCurrency(fromCurrency);
  if (from === 'ZAR') return amount;
  const rate = rates.get(from);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return amount;
  return amount / rate;
}

/**
 * Convert ZAR amount to target ISO currency: amount = zar * rate.
 */
export function zarToAmount(
  zar: number,
  toCurrency: string,
  rates: ExchangeRateMap
): number {
  if (!Number.isFinite(zar)) return 0;
  const to = forexCodeForCurrency(toCurrency);
  if (to === 'ZAR') return zar;
  const rate = rates.get(to);
  if (rate == null || !Number.isFinite(rate) || rate <= 0) return zar;
  return zar * rate;
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: ExchangeRateMap
): number {
  const from = normalizeCurrencyCode(fromCurrency);
  const to = normalizeCurrencyCode(toCurrency);
  if (from === to) return amount;
  const zar = amountToZar(amount, from, rates);
  return zarToAmount(zar, to, rates);
}

export function resolveRowSetCurrency(row: ReportsTargetRow): string {
  return normalizeCurrencyCode(row.setCurrency ?? row.sales.currency ?? 'ZAR');
}

export function resolveRowErpCurrency(row: ReportsTargetRow): string {
  if (row.erpCurrency) return normalizeCurrencyCode(row.erpCurrency);
  return getErpSalesCurrencyForCountry(row.branchCountryCode);
}

export function resolveDisplayCurrency(
  view: ReportsTargetsCurrencyView,
  row: ReportsTargetRow
): string {
  switch (view) {
    case 'set':
      return resolveRowSetCurrency(row);
    case 'branch':
      return resolveRowErpCurrency(row);
    case 'zar':
      return 'ZAR';
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

function rebuildAchievement(
  row: ReportsTargetRow
): Pick<
  ReportsTargetRow,
  'calls' | 'leads' | 'sales' | 'hours' | 'achievement' | 'engagementMet'
> {
  const resolved = resolveCallsLeadsCellProgress({
    actualCalls: row.calls.current,
    actualLeads: row.leads.current,
    targetCalls: row.calls.target,
    targetLeads: row.leads.target,
  });
  const calls = { ...row.calls, progress: resolved.callsProgress };
  const leads = { ...row.leads, progress: resolved.leadsProgress };
  const achievement = calcOverallAchievementWithEngagement({
    calls,
    leads,
    sales: row.sales,
    hours: row.hours,
  });
  return {
    calls,
    leads,
    sales: row.sales,
    hours: row.hours,
    achievement,
    engagementMet: resolved.engagementMet,
  };
}

/**
 * Apply currency view to sales amounts (target + ERP current) and recompute achievement.
 */
export function applyCurrencyViewToRow(
  row: ReportsTargetRow,
  view: ReportsTargetsCurrencyView,
  rates: ExchangeRateMap
): ReportsTargetRow {
  const setCurrency = resolveRowSetCurrency(row);
  const erpCurrency = resolveRowErpCurrency(row);

  let sales: ReportsTargetMetricCell;

  switch (view) {
    case 'set': {
      if (setCurrency === erpCurrency) {
        sales = { ...row.sales, currency: setCurrency };
      } else {
        const current = convertAmount(row.sales.current, erpCurrency, setCurrency, rates);
        const target = row.sales.target;
        sales = {
          current,
          target,
          progress: calcTargetProgress(current, target),
          currency: setCurrency,
        };
      }
      break;
    }
    case 'branch': {
      const current = row.sales.current;
      const target = convertAmount(row.sales.target, setCurrency, erpCurrency, rates);
      sales = {
        current,
        target,
        progress: calcTargetProgress(current, target),
        currency: erpCurrency,
      };
      break;
    }
    case 'zar': {
      const current = amountToZar(row.sales.current, erpCurrency, rates);
      const target = amountToZar(row.sales.target, setCurrency, rates);
      sales = {
        current,
        target,
        progress: calcTargetProgress(current, target),
        currency: 'ZAR',
      };
      break;
    }
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  const next = { ...row, sales };
  return { ...next, ...rebuildAchievement(next) };
}

export function currencyViewNeedsRates(
  rows: ReportsTargetRow[],
  view: ReportsTargetsCurrencyView
): boolean {
  if (view === 'zar') return rows.some((r) => r.sales.target > 0 || r.sales.current > 0);
  if (view === 'branch') return rows.some((r) => r.sales.target > 0 || r.sales.current > 0);
  return rows.some((r) => {
    if (r.sales.target <= 0 && r.sales.current <= 0) return false;
    return resolveRowSetCurrency(r) !== resolveRowErpCurrency(r);
  });
}

export function salesColumnLabel(view: ReportsTargetsCurrencyView): string {
  switch (view) {
    case 'set':
      return 'Sales';
    case 'branch':
      return 'Sales (branch)';
    case 'zar':
      return 'Sales (ZAR)';
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
