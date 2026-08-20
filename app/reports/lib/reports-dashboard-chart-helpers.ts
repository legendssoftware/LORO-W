import type { ChartConfig } from '@/components/ui/chart';
import type { ReportDonutSlice } from '@/components/charts/report-donut-chart';
import type { TeamTargetMember } from '@/api/endpoints/erp-team-targets';
import { ATT_CHART_HSL } from '@/lib/chart-colors';
import { takeTopNWithOther } from '@/lib/utils/chart-series';
import { humanizeReportLabel } from '@/lib/utils/report-labels';
import {
  getCountryFlag,
  normalizeCountryToken,
} from '@/lib/utils/country-flags';
import {
  getUtcMonthRange,
  utcDateFromYmd,
} from '@/lib/utils/overview-daily-summary';
import {
  EXPECTED_HOURS_PER_DAY,
  workingDaysInPeriod,
} from '@/app/staff/lib/staff-report-constants';
import { parseDurationToMinutes } from '@/lib/duration';
import type {
  RepJourneyProminentLocation,
  RepJourneyRange,
  RepJourneySummary,
} from '@/api/types/tracking';

const DONUT_PALETTE = [
  ATT_CHART_HSL.c1,
  ATT_CHART_HSL.c2,
  ATT_CHART_HSL.c5,
  ATT_CHART_HSL.c4,
  ATT_CHART_HSL.c3,
] as const;

export const REPORTS_CHART_GREEN = ATT_CHART_HSL.c1;
export const REPORTS_CHART_BLUE = ATT_CHART_HSL.c2;
export const REPORTS_CHART_RED = ATT_CHART_HSL.c5;
export const REPORTS_CHART_AMBER = ATT_CHART_HSL.c3;

export function toDonutSlices(
  series:
    | Array<{ name?: string | null; value: number }>
    | undefined
    | null,
  palette: readonly string[] = DONUT_PALETTE
): { slices: ReportDonutSlice[]; config: ChartConfig; total: number } {
  const rows = (series ?? [])
    .map((r) => ({
      name: humanizeReportLabel(r?.name) || 'Unknown',
      value: Number.isFinite(r.value) ? r.value : 0,
    }))
    .filter((r) => r.value > 0);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const slices: ReportDonutSlice[] = rows.map((r, i) => {
    const id = `s${i}`;
    return {
      id,
      label: r.name,
      value: r.value,
      fill: palette[i % palette.length],
    };
  });

  const config: ChartConfig = {};
  for (const slice of slices) {
    config[slice.id] = { label: slice.label, color: slice.fill };
  }

  return { slices, config, total };
}

export function toNamedBars(
  series:
    | Array<{ name?: string | null; value: number }>
    | undefined
    | null,
  topN = 8
): Array<{ name: string; value: number }> {
  return takeTopNWithOther(
    (series ?? []).map((r) => ({
      name: humanizeReportLabel(r?.name) || 'Unknown',
      value: r.value,
    })),
    topN
  );
}

export function engagementTotals(
  users: Array<{ callCount?: number; visitCount?: number; leadCount?: number }>
): { name: string; calls: number; visits: number; leads: number }[] {
  const calls = users.reduce((s, u) => s + (u.callCount ?? 0), 0);
  const visits = users.reduce((s, u) => s + (u.visitCount ?? 0), 0);
  const leads = users.reduce((s, u) => s + (u.leadCount ?? 0), 0);
  return [{ name: 'Team', calls, visits, leads }];
}

/** Axis / legend label with country flag emoji. */
export function countryFlagLabel(country: string): string {
  const token = normalizeCountryToken(country) ?? country;
  const { flag } = getCountryFlag(token);
  return `${flag} ${country}`;
}

export type UserSalesTargetBar = {
  name: string;
  revenue: number;
  target: number;
  progress: number;
};

/** Top users by revenue with sales target progress for Productivity section. */
export function teamMemberSalesBars(
  members: TeamTargetMember[] | undefined | null,
  topN = 8
): UserSalesTargetBar[] {
  const rows = (members ?? [])
    .map((m) => {
      const target = Number(m.targets?.sales?.target ?? 0) || 0;
      const revenue =
        Number(m.sales?.totalRevenue ?? m.targets?.sales?.current ?? 0) || 0;
      const progressRaw = Number(m.targets?.sales?.progress);
      const progress = Number.isFinite(progressRaw)
        ? Math.round(Math.min(100, Math.max(0, progressRaw)))
        : target > 0
          ? Math.round(Math.min(100, Math.max(0, (revenue / target) * 100)))
          : 0;
      const name =
        m.fullName?.trim() ||
        m.email?.trim() ||
        (m.userId != null ? `User ${m.userId}` : 'Unknown');
      return { name, revenue: Math.round(revenue), target: Math.round(target), progress };
    })
    .filter((r) => r.target > 0 || r.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue || b.progress - a.progress);

  return rows.slice(0, topN);
}

/**
 * Last `count` calendar months ending at `endYmd` (inclusive), oldest → newest.
 * Each entry is a UTC month range suitable for GET /erp/stores/sales.
 */
export function trailingMonthRanges(
  endYmd: string,
  count = 6
): Array<{ key: string; label: string; startDate: string; endDate: string }> {
  const end = utcDateFromYmd(endYmd);
  const out: Array<{
    key: string;
    label: string;
    startDate: string;
    endDate: string;
  }> = [];

  for (let i = count - 1; i >= 0; i--) {
    const ref = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - i, 1)
    );
    const { from, to } = getUtcMonthRange(ref);
    const label = ref.toLocaleString('en-ZA', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });
    out.push({
      key: from.slice(0, 7),
      label,
      startDate: from,
      endDate: to,
    });
  }
  return out;
}

/** Expected hours for a UTC YMD range using weekday × 8h (staff pattern). */
export function expectedHoursForUtcRange(fromYmd: string, toYmd: string): number {
  const start = utcDateFromYmd(fromYmd);
  const end = utcDateFromYmd(toYmd);
  const localStart = new Date(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );
  const localEnd = new Date(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  );
  return workingDaysInPeriod(localStart, localEnd) * EXPECTED_HOURS_PER_DAY;
}

export function hoursVsTargetDonut(
  workedHours: number,
  targetHours: number
): { slices: ReportDonutSlice[]; config: ChartConfig; total: number; progress: number } {
  const worked = Math.max(0, Math.round(workedHours * 10) / 10);
  const target = Math.max(0, Math.round(targetHours));
  const remaining = Math.max(0, Math.round((target - worked) * 10) / 10);
  const progress =
    target > 0 ? Math.round(Math.min(100, Math.max(0, (worked / target) * 100))) : 0;

  const series =
    target > 0
      ? [
          { name: 'Hours worked', value: worked },
          { name: 'Remaining to target', value: remaining },
        ]
      : [{ name: 'Hours worked', value: worked }];

  return {
    ...toDonutSlices(series, [REPORTS_CHART_GREEN, REPORTS_CHART_AMBER]),
    progress,
  };
}

export type StoreSalesMonthSlice = {
  label: string;
  salesPerStore: Array<{
    storeId?: string;
    storeName?: string;
    totalRevenue?: number;
  }>;
};

export type BranchSalesTrendResult = {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string }>;
};

/**
 * Pivot trailing monthly store sales into a multi-series trend for top branches.
 * Series keys are stable (`b0`…); labels prefer ERP storeName (alias-style).
 */
export function branchSalesTrendFromMonthly(
  months: StoreSalesMonthSlice[],
  topN = 5
): BranchSalesTrendResult {
  const totals = new Map<string, { label: string; total: number }>();

  for (const month of months) {
    for (const row of month.salesPerStore) {
      const id = (row.storeId ?? row.storeName ?? '').trim();
      if (!id) continue;
      const label =
        row.storeName?.trim() || row.storeId?.trim() || 'Unknown';
      const revenue = Number(row.totalRevenue ?? 0) || 0;
      const prev = totals.get(id);
      if (prev) {
        prev.total += revenue;
      } else {
        totals.set(id, { label, total: revenue });
      }
    }
  }

  const top = [...totals.entries()]
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN);

  if (top.length === 0) {
    return { data: [], series: [] };
  }

  const series = top.map(([id, v], i) => ({
    key: `b${i}`,
    label: v.label,
    storeId: id,
  }));

  const data = months.map((month) => {
    const point: Record<string, string | number> = { name: month.label };
    const byStore = new Map<string, number>();
    for (const row of month.salesPerStore) {
      const id = (row.storeId ?? row.storeName ?? '').trim();
      if (!id) continue;
      byStore.set(
        id,
        (byStore.get(id) ?? 0) + (Number(row.totalRevenue ?? 0) || 0)
      );
    }
    for (const s of series) {
      point[s.key] = Math.round(byStore.get(s.storeId) ?? 0);
    }
    return point;
  });

  return {
    data,
    series: series.map(({ key, label }) => ({ key, label })),
  };
}

export type AvgVisitDurationByUserRow = {
  name: string;
  value: number;
  visitCount: number;
};

/**
 * Average visit duration (minutes) per user from check-in list.
 * Only visits with a parseable duration contribute to the average.
 */
export function avgVisitDurationByUser(
  checkIns: Array<{
    duration?: string | null;
    owner?: {
      uid?: number;
      name?: string;
      surname?: string;
      email?: string;
    } | null;
  }> | null | undefined,
  topN = 10
): AvgVisitDurationByUserRow[] {
  const byUser = new Map<
    string,
    { name: string; totalMinutes: number; count: number }
  >();

  for (const c of checkIns ?? []) {
    const mins = parseDurationToMinutes(c.duration);
    if (mins <= 0) continue;
    const owner = c.owner;
    const fullName = [owner?.name, owner?.surname]
      .filter(Boolean)
      .join(' ')
      .trim();
    const name =
      fullName ||
      owner?.email?.trim() ||
      (owner?.uid != null ? `User ${owner.uid}` : 'Unknown');
    const key =
      owner?.uid != null
        ? `uid:${owner.uid}`
        : `name:${name.toLowerCase()}`;
    const prev = byUser.get(key) ?? { name, totalMinutes: 0, count: 0 };
    prev.totalMinutes += mins;
    prev.count += 1;
    byUser.set(key, prev);
  }

  return [...byUser.values()]
    .map((row) => ({
      name: row.name,
      value: Math.round(row.totalMinutes / row.count),
      visitCount: row.count,
    }))
    .sort((a, b) => b.value - a.value || b.visitCount - a.visitCount)
    .slice(0, topN);
}

/** Map a UTC calendar YMD span to the closest GPS journey range. */
export function reportsDateSpanToJourneyRange(
  fromYmd: string,
  toYmd: string
): Exclude<RepJourneyRange, 'hour' | 'today'> {
  const start = utcDateFromYmd(fromYmd);
  const end = utcDateFromYmd(toYmd);
  const startMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate()
  );
  const endMs = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate()
  );
  const spanDays = Math.max(0, Math.round((endMs - startMs) / 86_400_000)) + 1;
  return spanDays <= 1 ? 'day' : 'week';
}

/**
 * Avg drive distance bars (km): per-day is primary, with week/month context.
 * Day avg uses the rolling-day window total; week/month use total÷days.
 */
export function journeyDistanceBars(
  summary: RepJourneySummary | null | undefined
): Array<{ name: string; value: number }> {
  if (!summary) return [];
  return [
    {
      name: 'Per day',
      value: roundKm(summary.periodAverages.day.averageDistanceKm),
    },
    {
      name: 'Per week',
      value: roundKm(summary.periodAverages.week.averageDistanceKm),
    },
    {
      name: 'Per month',
      value: roundKm(summary.periodAverages.month.averageDistanceKm),
    },
  ].filter((row) => row.value > 0);
}

/** Common visited places ranked by time spent (minutes). */
export function journeyPlacesBars(
  locations: RepJourneyProminentLocation[] | null | undefined,
  limit = 8
): Array<{ name: string; value: number }> {
  return [...(locations ?? [])]
    .filter((loc) => (loc.timeSpentMinutes ?? 0) > 0)
    .sort((a, b) => b.timeSpentMinutes - a.timeSpentMinutes)
    .slice(0, limit)
    .map((loc) => ({
      name: truncatePlaceLabel(loc.address),
      value: Math.round(loc.timeSpentMinutes),
    }));
}

/** Travel vs stop duration bars (minutes). */
export function journeyDurationBars(
  summary: RepJourneySummary | null | undefined
): Array<{ name: string; value: number }> {
  if (!summary) return [];
  return [
    {
      name: 'Travel',
      value: Math.max(0, Math.round(summary.totalTravelMinutes)),
    },
    {
      name: 'Stop',
      value: Math.max(0, Math.round(summary.totalStopMinutes)),
    },
  ].filter((row) => row.value > 0);
}

function roundKm(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 10) / 10;
}

function truncatePlaceLabel(address: string, maxLen = 28): string {
  const trimmed = address.trim() || 'Unknown';
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
