import {
  getErpSalesCurrencyForCountry,
  normalizeCurrencyCode,
} from '@/lib/utils/erp-currency';
import {
  calcTargetProgress,
  calcOverallAchievementWithEngagement,
  resolveCallsLeadsCellProgress,
  targetNum,
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
 * Apply currency view to sales and quotations amounts and recompute achievement.
 */
export function applyCurrencyViewToRow(
  row: ReportsTargetRow,
  view: ReportsTargetsCurrencyView,
  rates: ExchangeRateMap
): ReportsTargetRow {
  const setCurrency = resolveRowSetCurrency(row);
  const erpCurrency = resolveRowErpCurrency(row);

  function convertMonetaryCell(
    cell: ReportsTargetMetricCell,
    erpCurrent: number,
    setTarget: number
  ): ReportsTargetMetricCell {
    switch (view) {
      case 'set': {
        if (setCurrency === erpCurrency) {
          return { ...cell, current: erpCurrent, target: setTarget, currency: setCurrency };
        }
        const current = convertAmount(erpCurrent, erpCurrency, setCurrency, rates);
        return {
          current,
          target: setTarget,
          progress: calcTargetProgress(current, setTarget),
          currency: setCurrency,
        };
      }
      case 'branch': {
        const target = convertAmount(setTarget, setCurrency, erpCurrency, rates);
        return {
          current: erpCurrent,
          target,
          progress: calcTargetProgress(erpCurrent, target),
          currency: erpCurrency,
        };
      }
      case 'zar': {
        const current = amountToZar(erpCurrent, erpCurrency, rates);
        const target = amountToZar(setTarget, setCurrency, rates);
        return {
          current,
          target,
          progress: calcTargetProgress(current, target),
          currency: 'ZAR',
        };
      }
      default: {
        const _exhaustive: never = view;
        return _exhaustive;
      }
    }
  }

  const sales = convertMonetaryCell(row.sales, row.sales.current, row.sales.target);

  let quotations: ReportsTargetMetricCell;
  const qCount = row.quotations.current;
  const qAmount = targetNum(row.quotations.amountCurrent);
  const qTarget = row.quotations.target;
  switch (view) {
    case 'set':
      quotations = {
        ...row.quotations,
        current: qCount,
        amountCurrent: qAmount,
        target: qTarget,
        progress: calcTargetProgress(qAmount, qTarget),
        currency: setCurrency,
      };
      break;
    case 'branch': {
      const amount = convertAmount(qAmount, setCurrency, erpCurrency, rates);
      const target = convertAmount(qTarget, setCurrency, erpCurrency, rates);
      quotations = {
        current: qCount,
        amountCurrent: amount,
        target,
        progress: calcTargetProgress(amount, target),
        currency: erpCurrency,
      };
      break;
    }
    case 'zar': {
      const amount = amountToZar(qAmount, setCurrency, rates);
      const target = amountToZar(qTarget, setCurrency, rates);
      quotations = {
        current: qCount,
        amountCurrent: amount,
        target,
        progress: calcTargetProgress(amount, target),
        currency: 'ZAR',
      };
      break;
    }
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  const next = { ...row, sales, quotations };
  return { ...next, ...rebuildAchievement(next) };
}

export function currencyViewNeedsRates(
  rows: ReportsTargetRow[],
  view: ReportsTargetsCurrencyView
): boolean {
  const hasMonetary = (r: ReportsTargetRow) =>
    r.sales.target > 0 ||
    r.sales.current > 0 ||
    r.quotations.target > 0 ||
    (r.quotations.amountCurrent ?? 0) > 0;
  if (view === 'zar') return rows.some(hasMonetary);
  if (view === 'branch') return rows.some(hasMonetary);
  return rows.some((r) => {
    if (!hasMonetary(r)) return false;
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

export function quotationsColumnLabel(view: ReportsTargetsCurrencyView): string {
  switch (view) {
    case 'set':
      return 'Quotations';
    case 'branch':
      return 'Quotations (branch)';
    case 'zar':
      return 'Quotations (ZAR)';
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
