import type { VisitListItem } from '@/api/types/visits';

export type OverviewTimeframe = 'day' | 'month';

export function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function utcToday(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** UTC midnight date from `yyyy-MM-dd`. */
export function utcDateFromYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => parseInt(x, 10));
  return new Date(Date.UTC(y, m - 1, d));
}

export function orderUtcCalendarRange(
  start: Date,
  end: Date
): { start: Date; end: Date } {
  const a = formatUtcYmd(start);
  const b = formatUtcYmd(end);
  return a <= b ? { start, end } : { start: end, end: start };
}

export function getUtcMonthRange(ref: Date): { from: string; to: string } {
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const end = new Date(Date.UTC(y, m, lastDay));
  return { from: formatUtcYmd(start), to: formatUtcYmd(end) };
}

/** UTC calendar: first day of the month through today (UTC), inclusive. */
export function utcMonthStartThroughToday(reference?: Date): {
  start: Date;
  end: Date;
} {
  const ref = reference ?? utcToday();
  const y = ref.getUTCFullYear();
  const m = ref.getUTCMonth();
  const monthStart = new Date(Date.UTC(y, m, 1));
  return orderUtcCalendarRange(monthStart, utcToday());
}

/**
 * ISO bounds for GET /check-ins when `start`/`end` are UTC calendar dates stored like
 * Overview / Visits pickers: `new Date(Date.UTC(y, m, d))` from wall-clock Y/M/D.
 */
export function utcRangeIsoFromUtcCalendarStoredRange(
  start: Date,
  end: Date
): { startDate: string; endDate: string } {
  const startMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    0,
    0,
    0,
    0
  );
  const endMs = Date.UTC(
    end.getUTCFullYear(),
    end.getUTCMonth(),
    end.getUTCDate(),
    23,
    59,
    59,
    999
  );
  return {
    startDate: new Date(startMs).toISOString(),
    endDate: new Date(endMs).toISOString(),
  };
}

/** Wall-calendar label in UTC (matches Overview day display intent). */
export function formatUtcCalendarLabel(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Single day from date picker: same as Overview `ReportsOverviewFiltersBar`. */
export function utcCalendarDateFromLocalPickerDate(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Reference day for Targets “below threshold” table: today (UTC) if it lies in the
 * selected inclusive range, otherwise the range start.
 */
export function getThresholdReferenceUtcDay(
  rangeStart: Date,
  rangeEnd: Date
): Date {
  const fromYmd = formatUtcYmd(rangeStart);
  const toYmd = formatUtcYmd(rangeEnd);
  const ty = formatUtcYmd(utcToday());
  if (ty >= fromYmd && ty <= toYmd) return utcToday();
  return rangeStart;
}

/** Matches server `leadOwnerDisplayName` join for merging GET /leads/report `byUser` keys. */
export function normalizeOwnerDisplayLabel(name: string, surname: string): string {
  return [name, surname].filter(Boolean).join(' ').trim();
}

/**
 * Count check-ins per owner uid (all contact methods). Rows without owner.uid are skipped.
 */
export function countVisitsByOwnerUid(checkIns: VisitListItem[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of checkIns) {
    const uid = c.owner?.uid;
    if (uid == null || !Number.isFinite(Number(uid))) continue;
    const n = Number(uid);
    m.set(n, (m.get(n) ?? 0) + 1);
  }
  return m;
}

/**
 * Map from GET /leads/report `byUser` (keys are owner display names, not uids — duplicate names can collide).
 */
export function mapLeadsByUserFromReport(
  byUser: { name: string; value: number }[] | undefined
): Map<string, number> {
  const m = new Map<string, number>();
  for (const row of byUser ?? []) {
    m.set(row.name.trim(), row.value);
  }
  return m;
}
