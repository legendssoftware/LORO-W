import type {
  TargetWarningsPayload,
  UserListItem,
  UserTargetDashboardShape,
  UserTargetListFields,
  UserTargetMetricProgress,
  UserTargetPersonalTargets,
} from '@/api/endpoints/user';
import { getBranchDisplayLabel } from '@/api/types/branch';
import {
  calcOverallAchievement,
  calcTargetProgress,
  targetNum,
} from '@/lib/utils/target-progress';
import { formatUtcYmd } from '@/lib/utils/overview-daily-summary';

export interface ReportsTargetMetricCell {
  current: number;
  target: number;
  progress: number;
  currency?: string | null;
}

export interface ReportsTargetRow {
  key: string;
  userId: number;
  ref: string;
  name: string;
  email: string;
  photoURL?: string | null;
  branch?: string | null;
  calls: ReportsTargetMetricCell;
  leads: ReportsTargetMetricCell;
  sales: ReportsTargetMetricCell;
  hours: ReportsTargetMetricCell;
  achievement: number;
  targetWarnings: TargetWarningsPayload | null;
  periodLabel?: string | null;
  /** ISO/date string from user target period — used for date-range overlap filter. */
  periodStartDate?: string | null;
  periodEndDate?: string | null;
}

function metricFromList(
  current: unknown,
  target: unknown,
  currency?: string | null
): ReportsTargetMetricCell {
  const c = targetNum(current);
  const t = targetNum(target);
  return {
    current: c,
    target: t,
    progress: calcTargetProgress(c, t),
    ...(currency != null ? { currency } : {}),
  };
}

function metricFromPersonal(
  metric: UserTargetMetricProgress | undefined,
  currencyFallback?: string | null
): ReportsTargetMetricCell {
  const current = targetNum(metric?.current);
  const target = targetNum(metric?.target);
  const progress =
    typeof metric?.progress === 'number' && Number.isFinite(metric.progress)
      ? Math.min(100, Math.max(0, Math.round(metric.progress)))
      : calcTargetProgress(current, target);
  const currency = metric?.currency ?? currencyFallback ?? null;
  return {
    current,
    target,
    progress,
    ...(currency != null ? { currency } : {}),
  };
}

function formatPeriodLabel(
  start: string | Date | null | undefined,
  end: string | Date | null | undefined
): string | null {
  if (!start && !end) return null;
  const fmt = (v: string | Date) => {
    try {
      const d = typeof v === 'string' ? new Date(v) : v;
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(v);
    }
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  if (end) return `Until ${fmt(end)}`;
  return null;
}

function achievementFromCells(
  calls: ReportsTargetMetricCell,
  leads: ReportsTargetMetricCell,
  sales: ReportsTargetMetricCell,
  hours: ReportsTargetMetricCell
): number {
  return calcOverallAchievement([calls, leads, sales, hours]);
}

/** Inclusive calendar-day count between two yyyy-MM-dd (or ISO) strings. */
function inclusiveDayCount(startYmd: string, endYmd: string): number {
  const a = Date.parse(`${startYmd.slice(0, 10)}T00:00:00.000Z`);
  const b = Date.parse(`${endYmd.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1;
  return Math.max(1, Math.floor((b - a) / 86_400_000) + 1);
}

function formatPeriodYmd(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return formatUtcYmd(d);
}

/**
 * Prorate a period target across the selected filter range (calendar days).
 * Used so Calls/Leads show daily (or range) quotas when the date filter is set.
 */
export function prorateTargetForRange(params: {
  periodTarget: number;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  rangeFromYmd: string;
  rangeToYmd: string;
}): number {
  const periodTarget = Math.max(0, params.periodTarget);
  if (periodTarget <= 0) return 0;

  const pStart = params.periodStartDate
    ? formatPeriodYmd(params.periodStartDate)
    : params.rangeFromYmd;
  const pEnd = params.periodEndDate
    ? formatPeriodYmd(params.periodEndDate)
    : params.rangeToYmd;
  const periodDays = inclusiveDayCount(pStart, pEnd);

  const overlapStart =
    params.rangeFromYmd > pStart ? params.rangeFromYmd : pStart;
  const overlapEnd = params.rangeToYmd < pEnd ? params.rangeToYmd : pEnd;
  if (overlapStart > overlapEnd) return 0;

  const overlapDays = inclusiveDayCount(overlapStart, overlapEnd);
  return Math.max(0, Math.round((periodTarget / periodDays) * overlapDays));
}

/** Build a row from GET /user list item + nested userTarget. */
export function rowFromUserListItem(user: UserListItem): ReportsTargetRow {
  const ut = (user.userTarget ?? null) as UserTargetListFields | null;
  const currency = ut?.targetCurrency ?? null;
  const calls = metricFromList(ut?.currentCalls, ut?.targetCalls);
  const leads = metricFromList(ut?.currentNewLeads, ut?.targetNewLeads);
  const sales = metricFromList(ut?.currentSalesAmount, ut?.targetSalesAmount, currency);
  const hours = metricFromList(ut?.currentHoursWorked, ut?.targetHoursWorked);
  const ref = user.clerkUserId?.trim() || String(user.uid);
  const name = [user.name, user.surname].filter(Boolean).join(' ').trim() || user.email;
  const branchLabel = getBranchDisplayLabel(user.branch) || null;

  return {
    key: ref,
    userId: user.uid,
    ref,
    name,
    email: user.email,
    photoURL: user.photoURL ?? user.avatar ?? null,
    branch: branchLabel,
    calls,
    leads,
    sales,
    hours,
    achievement: achievementFromCells(calls, leads, sales, hours),
    targetWarnings: null,
    periodLabel: formatPeriodLabel(ut?.periodStartDate, ut?.periodEndDate),
    periodStartDate: ut?.periodStartDate ?? null,
    periodEndDate: ut?.periodEndDate ?? null,
  };
}

function personalTargetsFromDashboard(
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null
): UserTargetPersonalTargets | null {
  if (!dashboard || typeof dashboard !== 'object') return null;
  const personal = (dashboard as UserTargetDashboardShape).personalTargets;
  if (personal && typeof personal === 'object') return personal;
  if ('calls' in dashboard || 'sales' in dashboard || 'targetWarnings' in dashboard) {
    return dashboard as UserTargetPersonalTargets;
  }
  return null;
}

/** Build a row from GET /user/:ref/target for the signed-in user (self scope). */
export function rowFromPersonalTarget(params: {
  userId: number;
  ref: string;
  name: string;
  email: string;
  photoURL?: string | null;
  branch?: string | null;
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null;
}): ReportsTargetRow | null {
  const personal = personalTargetsFromDashboard(params.dashboard);
  if (!personal) return null;

  const currency =
    (typeof personal.targetCurrency === 'string' ? personal.targetCurrency : null) ??
    personal.sales?.currency ??
    null;
  const calls = metricFromPersonal(personal.calls);
  const leads = metricFromPersonal(personal.newLeads);
  const sales = metricFromPersonal(personal.sales, currency);
  const hours = metricFromPersonal(personal.hours);
  const warnings =
    personal.targetWarnings && typeof personal.targetWarnings === 'object'
      ? personal.targetWarnings
      : null;

  return {
    key: params.ref,
    userId: params.userId,
    ref: params.ref,
    name: params.name,
    email: params.email,
    photoURL: params.photoURL ?? null,
    branch: params.branch ?? null,
    calls,
    leads,
    sales,
    hours,
    achievement: achievementFromCells(calls, leads, sales, hours),
    targetWarnings: warnings,
    periodLabel: formatPeriodLabel(
      personal.periodStartDate as string | Date | null | undefined,
      personal.periodEndDate as string | Date | null | undefined
    ),
    periodStartDate: toPeriodDateString(personal.periodStartDate),
    periodEndDate: toPeriodDateString(personal.periodEndDate),
  };
}

function toPeriodDateString(
  value: string | Date | null | undefined
): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return value.toISOString();
  } catch {
    return null;
  }
}

/** True when the row's target period overlaps [rangeStart, rangeEnd] (inclusive UTC days). */
export function rowPeriodOverlapsRange(
  row: ReportsTargetRow,
  rangeStart: Date,
  rangeEnd: Date
): boolean {
  const startYmd = row.periodStartDate
    ? formatPeriodYmd(row.periodStartDate)
    : null;
  const endYmd = row.periodEndDate ? formatPeriodYmd(row.periodEndDate) : null;
  if (!startYmd && !endYmd) return true;

  const filterStart = formatUtcYmd(rangeStart);
  const filterEnd = formatUtcYmd(rangeEnd);
  const periodStart = startYmd ?? endYmd!;
  const periodEnd = endYmd ?? startYmd!;
  return periodStart <= filterEnd && periodEnd >= filterStart;
}

/** Merge warning + preferred progress from GET /user/:ref/target onto a list-derived row. */
export function enrichRowWithTargetDashboard(
  row: ReportsTargetRow,
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null
): ReportsTargetRow {
  const personal = personalTargetsFromDashboard(dashboard);
  if (!personal) return row;

  const currency =
    (typeof personal.targetCurrency === 'string' ? personal.targetCurrency : null) ??
    personal.sales?.currency ??
    row.sales.currency ??
    null;
  const calls = metricFromPersonal(personal.calls);
  const leads = metricFromPersonal(personal.newLeads);
  const sales = metricFromPersonal(personal.sales, currency);
  const hours = metricFromPersonal(personal.hours);
  const warnings =
    personal.targetWarnings && typeof personal.targetWarnings === 'object'
      ? personal.targetWarnings
      : row.targetWarnings;
  const periodStart = toPeriodDateString(
    personal.periodStartDate as string | Date | null | undefined
  );
  const periodEnd = toPeriodDateString(
    personal.periodEndDate as string | Date | null | undefined
  );

  return {
    ...row,
    calls,
    leads,
    sales,
    hours,
    achievement: achievementFromCells(calls, leads, sales, hours),
    targetWarnings: warnings,
    periodLabel:
      formatPeriodLabel(
        personal.periodStartDate as string | Date | null | undefined,
        personal.periodEndDate as string | Date | null | undefined
      ) ?? row.periodLabel,
    periodStartDate: periodStart ?? row.periodStartDate ?? null,
    periodEndDate: periodEnd ?? row.periodEndDate ?? null,
  };
}

/**
 * Overlay range engagement counts onto Calls/Leads (Sales/Hours unchanged).
 * Targets for calls/leads are prorated to the selected date range.
 */
export function applyEngagementToRow(
  row: ReportsTargetRow,
  engagement: { callCount: number; leadCount: number } | undefined,
  rangeFromYmd: string,
  rangeToYmd: string
): ReportsTargetRow {
  if (!engagement) return row;

  const callTarget = prorateTargetForRange({
    periodTarget: row.calls.target,
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    rangeFromYmd,
    rangeToYmd,
  });
  const leadTarget = prorateTargetForRange({
    periodTarget: row.leads.target,
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    rangeFromYmd,
    rangeToYmd,
  });

  const calls: ReportsTargetMetricCell = {
    current: engagement.callCount,
    target: callTarget,
    progress: calcTargetProgress(engagement.callCount, callTarget),
  };
  const leads: ReportsTargetMetricCell = {
    current: engagement.leadCount,
    target: leadTarget,
    progress: calcTargetProgress(engagement.leadCount, leadTarget),
  };

  return {
    ...row,
    calls,
    leads,
    achievement: achievementFromCells(calls, leads, row.sales, row.hours),
  };
}
