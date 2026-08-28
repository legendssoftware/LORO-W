import {
  getErpSalesCurrencyForCountry,
  normalizeCurrencyCode,
} from '@/lib/utils/erp-currency';
import {
  amountToZar,
  buildExchangeRateMap,
  convertAmount,
  type ExchangeRateMap,
  zarToAmount,
} from '@/lib/utils/zar-fx';
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

export type { ExchangeRateMap };
export { amountToZar, buildExchangeRateMap, convertAmount, zarToAmount };

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
