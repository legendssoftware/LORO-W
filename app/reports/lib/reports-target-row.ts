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
  getErpSalesCurrencyForCountry,
  normalizeErpCountryCode,
} from '@/lib/utils/erp-currency';
import {
  calcOverallAchievementWithEngagement,
  calcTargetProgress,
  resolveCallsLeadsCellProgress,
  targetNum,
} from '@/lib/utils/target-progress';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';
import {
  TARGET_WORKING_DAYS_PER_MONTH,
  workingDaysInclusiveYmd,
} from '@/lib/utils/target-working-days';

export interface ReportsTargetMetricCell {
  current: number;
  target: number;
  progress: number;
  currency?: string | null;
  /** Monetary total for count-based metrics (e.g. quotation value in range). */
  amountCurrent?: number | null;
}

/** Average daily productivity score (0–100) for the selected date range. */
export interface ReportsTargetProductivityCell {
  /** Averaged score across days with a score; null when unavailable. */
  score: number | null;
  isLoading?: boolean;
}

/** Field travel for the selected date filter (distance, visits, petrol vs fuel). */
export interface ReportsTargetTravelCell {
  distanceKm: number;
  visitCount: number;
  petrolClaimCount: number;
  petrolClaimAmount: number;
  fuelAllowance: number;
  progress: number;
}

export function emptyTravelCell(
  visitCount = 0
): ReportsTargetTravelCell {
  return {
    distanceKm: 0,
    visitCount,
    petrolClaimCount: 0,
    petrolClaimAmount: 0,
    fuelAllowance: 0,
    progress: 0,
  };
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
  visits: ReportsTargetMetricCell;
  leads: ReportsTargetMetricCell;
  quotations: ReportsTargetMetricCell;
  sales: ReportsTargetMetricCell;
  hours: ReportsTargetMetricCell;
  /** True while ERP sales for this row is queued / in flight. */
  salesLoading?: boolean;
  /** Target-based productivity (0–100); null when no range / no samples. */
  productivity: ReportsTargetProductivityCell;
  /** Distance + petrol claims vs HR fuel allowance for the selected range. */
  travel: ReportsTargetTravelCell;
  achievement: number;
  /** Calls+leads engagement gate met (combined / full-either rule). */
  engagementMet: boolean;
  targetWarnings: TargetWarningsPayload | null;
  periodLabel?: string | null;
  /** ISO/date string from user target period — used for date-range overlap filter. */
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  /** HR-set target currency (userTarget.targetCurrency). */
  setCurrency?: string | null;
  /** Branch ERP country code (SA, BOT, ZW, …). */
  branchCountryCode?: string | null;
  /** Native ERP sales currency for the branch (ZW → USD). */
  erpCurrency?: string | null;
}

function resolveBranchCountryCode(
  user: {
    branch?: { country?: string | null; uid?: number | null } | null;
    branchUid?: unknown;
  },
  branchCountryByUid?: Map<number, string>
): string | null {
  const fromUser = user.branch?.country?.trim();
  if (fromUser) return normalizeErpCountryCode(fromUser);
  const uid =
    user.branch?.uid != null
      ? Number(user.branch.uid)
      : user.branchUid != null
        ? Number(user.branchUid)
        : null;
  if (uid != null && branchCountryByUid?.has(uid)) {
    return branchCountryByUid.get(uid) ?? null;
  }
  return null;
}

export function branchCountryMapFromList(
  branches: Array<{ uid: number; country?: string | null }>
): Map<number, string> {
  const map = new Map<number, string>();
  for (const b of branches) {
    if (b.country?.trim()) {
      map.set(b.uid, normalizeErpCountryCode(b.country));
    }
  }
  return map;
}

function attachCurrencyMetadata(
  row: ReportsTargetRow,
  params: {
    setCurrency?: string | null;
    branchCountryCode?: string | null;
  }
): ReportsTargetRow {
  const branchCountryCode = params.branchCountryCode ?? null;
  const setCurrency = params.setCurrency ?? row.sales.currency ?? null;
  const erpCurrency = branchCountryCode
    ? getErpSalesCurrencyForCountry(branchCountryCode)
    : null;
  return {
    ...row,
    setCurrency,
    branchCountryCode,
    erpCurrency,
  };
}

function quotationsMetricFromList(
  countCurrent: unknown,
  amountCurrent: unknown,
  amountTarget: unknown,
  currency?: string | null
): ReportsTargetMetricCell {
  const count = targetNum(countCurrent);
  const amount = targetNum(amountCurrent);
  const target = targetNum(amountTarget);
  return {
    current: count,
    target,
    amountCurrent: amount,
    progress: calcTargetProgress(amount, target),
    ...(currency != null ? { currency } : {}),
  };
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

function quotationsFromPersonal(
  metric: UserTargetMetricProgress | undefined,
  currencyFallback?: string | null
): ReportsTargetMetricCell {
  const amount = targetNum(metric?.current);
  const target = targetNum(metric?.target);
  const currency = metric?.currency ?? currencyFallback ?? null;
  return {
    current: 0,
    target,
    amountCurrent: amount,
    progress: calcTargetProgress(amount, target),
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

/** Apply combined calls+leads engagement progress to both cells. */
function withEngagementAwareCallsLeads(
  calls: ReportsTargetMetricCell,
  leads: ReportsTargetMetricCell
): { calls: ReportsTargetMetricCell; leads: ReportsTargetMetricCell; engagementMet: boolean } {
  const resolved = resolveCallsLeadsCellProgress({
    actualCalls: calls.current,
    actualLeads: leads.current,
    targetCalls: calls.target,
    targetLeads: leads.target,
  });
  return {
    calls: { ...calls, progress: resolved.callsProgress },
    leads: { ...leads, progress: resolved.leadsProgress },
    engagementMet: resolved.engagementMet,
  };
}

/** Human-readable period for table/dialog (e.g. "May 1, 2026 – Jun 30, 2026"). */
export function formatPeriodLabel(
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
        timeZone: 'UTC',
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

/**
 * When the toolbar date filter is active, show that range on the row.
 * When all-time, keep the target period label (or "All time").
 */
export function applyFilterPeriodLabel(
  row: ReportsTargetRow,
  rangeFromYmd: string | null,
  rangeToYmd: string | null
): ReportsTargetRow {
  if (rangeFromYmd && rangeToYmd) {
    return {
      ...row,
      periodLabel: formatPeriodLabel(rangeFromYmd, rangeToYmd),
    };
  }
  return {
    ...row,
    periodLabel: row.periodLabel ?? 'All time',
  };
}

function achievementFromCells(
  calls: ReportsTargetMetricCell,
  leads: ReportsTargetMetricCell,
  sales: ReportsTargetMetricCell,
  hours: ReportsTargetMetricCell
): number {
  return calcOverallAchievementWithEngagement({ calls, leads, sales, hours });
}

function buildRowMetrics(
  callsIn: ReportsTargetMetricCell,
  leadsIn: ReportsTargetMetricCell,
  visits: ReportsTargetMetricCell,
  quotations: ReportsTargetMetricCell,
  sales: ReportsTargetMetricCell,
  hours: ReportsTargetMetricCell
): {
  calls: ReportsTargetMetricCell;
  visits: ReportsTargetMetricCell;
  leads: ReportsTargetMetricCell;
  quotations: ReportsTargetMetricCell;
  sales: ReportsTargetMetricCell;
  hours: ReportsTargetMetricCell;
  achievement: number;
  engagementMet: boolean;
} {
  const { calls, leads, engagementMet } = withEngagementAwareCallsLeads(
    callsIn,
    leadsIn
  );
  return {
    calls,
    visits,
    leads,
    quotations,
    sales,
    hours,
    achievement: achievementFromCells(calls, leads, sales, hours),
    engagementMet,
  };
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

export type EngagementRangeParams = {
  from: string;
  to: string;
  branchId?: number;
};

/** Resolve [from, to] for engagement-range in all-time mode (target period, end capped at today). */
export function resolveTargetPeriodEngagementParams(
  sources: Array<{
    periodStartDate?: string | Date | null;
    periodEndDate?: string | Date | null;
  }>,
  opts?: { branchId?: number; today?: Date }
): EngagementRangeParams | null {
  const todayYmd = formatUtcYmd(opts?.today ?? utcToday());
  for (const source of sources) {
    if (!source.periodStartDate || !source.periodEndDate) continue;
    const from = formatPeriodYmd(String(source.periodStartDate));
    const endRaw = formatPeriodYmd(String(source.periodEndDate));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
      continue;
    }
    const to = endRaw > todayYmd ? todayYmd : endRaw;
    if (from > to) continue;
    return {
      from,
      to,
      ...(opts?.branchId != null ? { branchId: opts.branchId } : {}),
    };
  }
  return null;
}

/**
 * Prorate a period (monthly) calls/leads target onto the selected filter range.
 * Daily rate = periodTarget ÷ 20 working days (so 1200 → 60/day).
 * Range target = daily rate × Mon–Fri days in the overlap with the period.
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

  const dailyRate = periodTarget / TARGET_WORKING_DAYS_PER_MONTH;

  const pStart = params.periodStartDate
    ? formatPeriodYmd(params.periodStartDate)
    : params.rangeFromYmd;
  const pEnd = params.periodEndDate
    ? formatPeriodYmd(params.periodEndDate)
    : params.rangeToYmd;

  const overlapStart =
    params.rangeFromYmd > pStart ? params.rangeFromYmd : pStart;
  const overlapEnd = params.rangeToYmd < pEnd ? params.rangeToYmd : pEnd;
  if (overlapStart > overlapEnd) return 0;

  const overlapWorkingDays = workingDaysInclusiveYmd(overlapStart, overlapEnd);
  if (overlapWorkingDays <= 0) {
    // Weekend-only / empty working-day overlap: still show one day of quota when
    // the filter is a single calendar day (matches shift-day display of 60).
    const calendarDays = inclusiveDayCount(overlapStart, overlapEnd);
    return calendarDays === 1 ? Math.round(dailyRate) : 0;
  }

  return Math.max(0, Math.round(dailyRate * overlapWorkingDays));
}

/** Build a row from GET /user list item + nested userTarget. */
export function rowFromUserListItem(
  user: UserListItem,
  branchCountryByUid?: Map<number, string>
): ReportsTargetRow {
  const ut = (user.userTarget ?? null) as UserTargetListFields | null;
  const currency = ut?.targetCurrency ?? null;
  const branchCountryCode = resolveBranchCountryCode(user, branchCountryByUid);
  const metrics = buildRowMetrics(
    metricFromList(ut?.currentCalls, ut?.targetCalls),
    metricFromList(ut?.currentNewLeads, ut?.targetNewLeads),
    metricFromList(ut?.currentCheckIns, ut?.targetCheckIns),
    quotationsMetricFromList(
      0,
      ut?.currentQuotationsAmount,
      ut?.targetQuotationsAmount,
      currency
    ),
    metricFromList(ut?.currentSalesAmount, ut?.targetSalesAmount, currency),
    metricFromList(ut?.currentHoursWorked, ut?.targetHoursWorked)
  );
  const ref = user.clerkUserId?.trim() || String(user.uid);
  const name = [user.name, user.surname].filter(Boolean).join(' ').trim() || user.email;
  const branchLabel = getBranchDisplayLabel(user.branch) || null;

  return attachCurrencyMetadata(
    {
      key: ref,
      userId: user.uid,
      ref,
      name,
      email: user.email,
      photoURL: user.photoURL ?? user.avatar ?? null,
      branch: branchLabel,
      ...metrics,
      productivity: { score: null },
      travel: emptyTravelCell(targetNum(ut?.currentCheckIns)),
      targetWarnings: null,
      periodLabel: formatPeriodLabel(ut?.periodStartDate, ut?.periodEndDate),
      periodStartDate: ut?.periodStartDate ?? null,
      periodEndDate: ut?.periodEndDate ?? null,
    },
    { setCurrency: currency, branchCountryCode }
  );
}

export type EngagementOverlay = {
  callCount: number;
  leadCount: number;
  visitCount: number;
  quotationCount: number;
  quotationAmount: number;
};

export type TravelOverlay = {
  distanceKm: number;
  petrolClaimCount: number;
  petrolClaimAmount: number;
  fuelAllowance: number;
};

const EMPTY_ENGAGEMENT_OVERLAY: EngagementOverlay = {
  callCount: 0,
  leadCount: 0,
  visitCount: 0,
  quotationCount: 0,
  quotationAmount: 0,
};

/** Apply engagement + hours overlays and period label to a list-derived row. */
export function overlayTargetRowFilters(
  row: ReportsTargetRow,
  opts: {
    rangeParams?: { from: string; to: string } | null;
    engagement?: EngagementOverlay | null;
    engagementReady?: boolean;
    /** Full range overlay (date filter) vs quotation count/amount only (all-time). */
    engagementMode?: 'full' | 'quotationsOnly';
    /** Range passed to engagement-range (date filter or target period in all-time). */
    engagementRangeParams?: EngagementRangeParams | null;
    hoursWorked?: number;
    hoursOverlayReady?: boolean;
    travel?: TravelOverlay | null;
    travelReady?: boolean;
  }
): ReportsTargetRow {
  let next = row;
  const engagementRange =
    opts.engagementRangeParams ??
    (opts.rangeParams
      ? {
          from: opts.rangeParams.from,
          to: opts.rangeParams.to,
        }
      : null);
  if (opts.engagementReady && engagementRange) {
    const engagement = opts.engagement ?? EMPTY_ENGAGEMENT_OVERLAY;
    if (opts.engagementMode === 'quotationsOnly') {
      next = applyQuotationsEngagementToRow(next, engagement);
    } else if (opts.rangeParams) {
      next = applyEngagementToRow(
        next,
        engagement,
        opts.rangeParams.from,
        opts.rangeParams.to
      );
    }
  }
  if (opts.hoursOverlayReady && opts.hoursWorked != null) {
    next = applyHoursToRow(
      next,
      opts.hoursWorked,
      opts.rangeParams?.from ?? null,
      opts.rangeParams?.to ?? null
    );
  }
  if (opts.travelReady) {
    next = applyTravelToRow(
      next,
      opts.travel,
      opts.rangeParams?.from ?? engagementRange?.from ?? null,
      opts.rangeParams?.to ?? engagementRange?.to ?? null
    );
  }
  return applyFilterPeriodLabel(
    next,
    opts.rangeParams?.from ?? null,
    opts.rangeParams?.to ?? null
  );
}

/** Build a fully overlaid row from GET /user list item (engagement / hours when ready). */
export function targetRowFromUserListItem(
  user: UserListItem,
  opts: {
    branchCountryByUid?: Map<number, string>;
    rangeParams?: { from: string; to: string } | null;
    engagementByUid?: Map<number, EngagementOverlay>;
    engagementReady?: boolean;
    engagementMode?: 'full' | 'quotationsOnly';
    engagementRangeParams?: EngagementRangeParams | null;
    hoursByUid?: Map<number, number>;
    hoursOverlayReady?: boolean;
    travelByUid?: Map<number, TravelOverlay>;
    travelReady?: boolean;
  }
): ReportsTargetRow {
  const row = rowFromUserListItem(user, opts.branchCountryByUid);
  const engagement = opts.engagementByUid?.get(row.userId) ?? EMPTY_ENGAGEMENT_OVERLAY;
  const hoursWorked = opts.hoursByUid?.get(row.userId);
  return overlayTargetRowFilters(row, {
    rangeParams: opts.rangeParams,
    engagement,
    engagementReady: opts.engagementReady,
    engagementMode: opts.engagementMode,
    engagementRangeParams: opts.engagementRangeParams,
    hoursWorked,
    hoursOverlayReady: opts.hoursOverlayReady,
    travel: opts.travelByUid?.get(row.userId) ?? null,
    travelReady: opts.travelReady,
  });
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
  branchCountryCode?: string | null;
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null;
}): ReportsTargetRow | null {
  const personal = personalTargetsFromDashboard(params.dashboard);
  if (!personal) return null;

  const currency =
    (typeof personal.targetCurrency === 'string' ? personal.targetCurrency : null) ??
    personal.sales?.currency ??
    null;
  const calls = metricFromPersonal(personal.calls);
  const visits = metricFromPersonal(personal.checkIns);
  const leads = metricFromPersonal(personal.newLeads);
  const quotations = quotationsFromPersonal(personal.quotations, currency);
  const sales = metricFromPersonal(personal.sales, currency);
  const hours = metricFromPersonal(personal.hours);
  const metrics = buildRowMetrics(calls, leads, visits, quotations, sales, hours);
  const warnings =
    personal.targetWarnings && typeof personal.targetWarnings === 'object'
      ? personal.targetWarnings
      : null;

  return attachCurrencyMetadata(
    {
      key: params.ref,
      userId: params.userId,
      ref: params.ref,
      name: params.name,
      email: params.email,
      photoURL: params.photoURL ?? null,
      branch: params.branch ?? null,
      ...metrics,
      productivity: { score: null },
      travel: emptyTravelCell(visits.current),
      targetWarnings: warnings,
      periodLabel: formatPeriodLabel(
        personal.periodStartDate as string | Date | null | undefined,
        personal.periodEndDate as string | Date | null | undefined
      ),
      periodStartDate: toPeriodDateString(personal.periodStartDate),
      periodEndDate: toPeriodDateString(personal.periodEndDate),
    },
    { setCurrency: currency, branchCountryCode: params.branchCountryCode ?? null }
  );
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
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null,
  options?: { preserveRangeMetrics?: boolean }
): ReportsTargetRow {
  const personal = personalTargetsFromDashboard(dashboard);
  if (!personal) return row;

  const currency =
    (typeof personal.targetCurrency === 'string' ? personal.targetCurrency : null) ??
    personal.sales?.currency ??
    row.sales.currency ??
    null;
  const preserve = options?.preserveRangeMetrics === true;
  const calls = preserve ? row.calls : metricFromPersonal(personal.calls);
  const visits = preserve ? row.visits : metricFromPersonal(personal.checkIns);
  const leads = preserve ? row.leads : metricFromPersonal(personal.newLeads);
  const quotations = preserve
    ? row.quotations
    : quotationsFromPersonal(personal.quotations, currency);
  const sales = metricFromPersonal(personal.sales, currency);
  const hours = metricFromPersonal(personal.hours);
  const metrics = buildRowMetrics(calls, leads, visits, quotations, sales, hours);
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

  return attachCurrencyMetadata(
    {
      ...row,
      ...metrics,
      targetWarnings: warnings,
      periodLabel:
        formatPeriodLabel(
          personal.periodStartDate as string | Date | null | undefined,
          personal.periodEndDate as string | Date | null | undefined
        ) ?? row.periodLabel,
      periodStartDate: periodStart ?? row.periodStartDate ?? null,
      periodEndDate: periodEnd ?? row.periodEndDate ?? null,
    },
    {
      setCurrency: currency ?? row.setCurrency ?? null,
      branchCountryCode: row.branchCountryCode ?? null,
    }
  );
}

/**
 * Overlay live ERP turnover onto Sales (from GET /erp/profile/sales or
 * GET /erp/user/:userId/sales). CRM `currentSalesAmount` is often 0 / stale.
 */
export function applyErpSalesToRow(
  row: ReportsTargetRow,
  totalRevenue: number | null | undefined
): ReportsTargetRow {
  if (totalRevenue == null || !Number.isFinite(totalRevenue)) return row;
  const current = Math.max(0, totalRevenue);
  const sales: ReportsTargetMetricCell = {
    ...row.sales,
    current,
    progress: calcTargetProgress(current, row.sales.target),
  };
  const metrics = buildRowMetrics(row.calls, row.leads, row.visits, row.quotations, sales, row.hours);
  return {
    ...row,
    ...metrics,
  };
}

/**
 * Overlay range engagement counts onto Calls/Visits/Leads (Sales/Hours/Quotations current unchanged).
 * Targets for calls/leads/visits/quotations are prorated to the selected date range.
 */
/** Total check-ins in range (all contact methods) — matches GET /check-ins list / Visits page. */
export function totalEngagementCheckIns(engagement: {
  callCount: number;
  visitCount?: number;
}): number {
  return (engagement.callCount ?? 0) + (engagement.visitCount ?? 0);
}

export function applyEngagementToRow(
  row: ReportsTargetRow,
  engagement:
    | {
        callCount: number;
        leadCount: number;
        visitCount?: number;
        quotationCount?: number;
        quotationAmount?: number;
      }
    | undefined,
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
  const visitTarget = prorateTargetForRange({
    periodTarget: row.visits.target,
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
  const quotationsTarget = prorateTargetForRange({
    periodTarget: row.quotations.target,
    periodStartDate: row.periodStartDate,
    periodEndDate: row.periodEndDate,
    rangeFromYmd,
    rangeToYmd,
  });

  const callCount = engagement.callCount ?? 0;
  const visitCount = engagement.visitCount ?? 0;
  const quotationCount = engagement.quotationCount ?? 0;
  const quotationAmount = engagement.quotationAmount ?? 0;

  const calls: ReportsTargetMetricCell = {
    current: callCount,
    target: callTarget,
    progress: calcTargetProgress(callCount, callTarget),
  };
  const visits: ReportsTargetMetricCell = {
    current: visitCount,
    target: visitTarget,
    progress: calcTargetProgress(visitCount, visitTarget),
  };
  const leads: ReportsTargetMetricCell = {
    current: engagement.leadCount,
    target: leadTarget,
    progress: calcTargetProgress(engagement.leadCount, leadTarget),
  };
  const quotations: ReportsTargetMetricCell = {
    ...row.quotations,
    current: quotationCount,
    amountCurrent: quotationAmount,
    target: quotationsTarget,
    progress: calcTargetProgress(quotationAmount, quotationsTarget),
  };

  const metrics = buildRowMetrics(calls, leads, visits, quotations, row.sales, row.hours);
  return {
    ...row,
    ...metrics,
  };
}

/** Overlay LORO quotation count + amount from engagement-range without changing calls/visits/leads. */
export function applyQuotationsEngagementToRow(
  row: ReportsTargetRow,
  engagement:
    | {
        quotationCount?: number;
        quotationAmount?: number;
      }
    | undefined
): ReportsTargetRow {
  if (!engagement) return row;

  const quotationCount = engagement.quotationCount ?? 0;
  const quotationAmount = engagement.quotationAmount ?? 0;
  const quotations: ReportsTargetMetricCell = {
    ...row.quotations,
    current: quotationCount,
    amountCurrent: quotationAmount,
    progress: calcTargetProgress(quotationAmount, row.quotations.target),
  };
  const metrics = buildRowMetrics(
    row.calls,
    row.leads,
    row.visits,
    quotations,
    row.sales,
    row.hours
  );
  return {
    ...row,
    ...metrics,
  };
}

/**
 * Overlay average daily productivity score onto the Productivity cell.
 * Pass `isLoading: true` while the query is in flight.
 */
export function applyProductivityToRow(
  row: ReportsTargetRow,
  score: number | null | undefined,
  options?: { isLoading?: boolean }
): ReportsTargetRow {
  return {
    ...row,
    productivity: {
      score:
        score == null || !Number.isFinite(score)
          ? null
          : Math.min(100, Math.max(0, Math.round(score))),
      isLoading: options?.isLoading === true,
    },
  };
}

/**
 * Average scored days from GET /user/:ref/daily-productivity.
 * Returns null when there are no scored days.
 */
export function averageProductivityScore(
  days: Array<{ score: number | null }> | null | undefined
): number | null {
  if (!days?.length) return null;
  const scored = days.filter(
    (d) => d.score != null && Number.isFinite(d.score)
  );
  if (scored.length === 0) return null;
  const sum = scored.reduce((acc, d) => acc + (d.score as number), 0);
  return Math.round(sum / scored.length);
}

/**
 * Overlay attendance hours onto the Hours cell.
 * When rangeFromYmd/rangeToYmd are set, the hours target is prorated like calls/leads.
 * `hoursWorked` should come from GET /att/report (range) or payroll-hours (period).
 */
/**
 * Overlay travel-range distance + petrol claims onto the Travel cell.
 * Fuel allowance is prorated to the selected date range like other monthly targets.
 */
export function applyTravelToRow(
  row: ReportsTargetRow,
  travel: TravelOverlay | null | undefined,
  rangeFromYmd?: string | null,
  rangeToYmd?: string | null
): ReportsTargetRow {
  const distanceKm = Math.max(0, travel?.distanceKm ?? 0);
  const petrolClaimCount = Math.max(0, travel?.petrolClaimCount ?? 0);
  const petrolClaimAmount = Math.max(0, travel?.petrolClaimAmount ?? 0);
  const periodFuel = Math.max(0, travel?.fuelAllowance ?? 0);
  const fuelAllowance =
    rangeFromYmd && rangeToYmd
      ? prorateTargetForRange({
          periodTarget: periodFuel,
          periodStartDate: row.periodStartDate,
          periodEndDate: row.periodEndDate,
          rangeFromYmd,
          rangeToYmd,
        })
      : periodFuel;

  return {
    ...row,
    travel: {
      distanceKm: Math.round(distanceKm * 10) / 10,
      visitCount: row.visits.current,
      petrolClaimCount: Math.round(petrolClaimCount),
      petrolClaimAmount: Math.round(petrolClaimAmount),
      fuelAllowance,
      progress: calcTargetProgress(petrolClaimAmount, fuelAllowance),
    },
  };
}

export function applyHoursToRow(
  row: ReportsTargetRow,
  hoursWorked: number | undefined,
  rangeFromYmd?: string | null,
  rangeToYmd?: string | null
): ReportsTargetRow {
  if (hoursWorked == null || !Number.isFinite(hoursWorked)) return row;

  const current = Math.round(Math.max(0, hoursWorked) * 10) / 10;
  const target =
    rangeFromYmd && rangeToYmd
      ? prorateTargetForRange({
          periodTarget: row.hours.target,
          periodStartDate: row.periodStartDate,
          periodEndDate: row.periodEndDate,
          rangeFromYmd,
          rangeToYmd,
        })
      : row.hours.target;

  const hours: ReportsTargetMetricCell = {
    current,
    target,
    progress: calcTargetProgress(current, target),
  };

  const metrics = buildRowMetrics(row.calls, row.leads, row.visits, row.quotations, row.sales, hours);
  return {
    ...row,
    ...metrics,
  };
}
