import type { VisitListItem } from '@/api/types/visits';
import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

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

/** First and last UTC calendar day of the month containing `reference`. */
export function utcWholeMonthRange(reference?: Date): { start: Date; end: Date } {
  const { from, to } = getUtcMonthRange(reference ?? utcToday());
  return { start: utcDateFromYmd(from), end: utcDateFromYmd(to) };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function ymdFromUtcNoon(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function utcNoonFromYmd(ymd: string): Date {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Previous Monday through Saturday as UTC calendar dates (YMD from Africa/Johannesburg).
 * Matches the Monday weekly travel email window.
 */
export function previousMondayToSaturdayUtcRange(
  now: Date = new Date(),
  timezone = 'Africa/Johannesburg'
): { start: Date; end: Date; fromYmd: string; toYmd: string } {
  const todayYmd = formatInTimeZone(now, timezone, 'yyyy-MM-dd');
  const todayNoon = utcNoonFromYmd(todayYmd);
  const dow = todayNoon.getUTCDay();
  const daysSinceMonday = (dow + 6) % 7;
  const thisMonday = addDays(todayNoon, -daysSinceMonday);
  const lastMonday = addDays(thisMonday, -7);
  const lastSaturday = addDays(lastMonday, 5);
  const fromYmd = ymdFromUtcNoon(lastMonday);
  const toYmd = ymdFromUtcNoon(lastSaturday);
  return {
    fromYmd,
    toYmd,
    start: utcDateFromYmd(fromYmd),
    end: utcDateFromYmd(toYmd),
  };
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
 * Reference day for Targets “below threshold” table: the inclusive range end (UTC),
 * capped at today so future picker values never request tomorrow’s data.
 * Single-day selections resolve to that day.
 */
export function getThresholdReferenceUtcDay(
  rangeStart: Date,
  rangeEnd: Date
): Date {
  const { start, end } = orderUtcCalendarRange(rangeStart, rangeEnd);
  const endYmd = formatUtcYmd(end);
  const todayYmd = formatUtcYmd(utcToday());
  if (endYmd > todayYmd) return utcToday();
  return end;
}

/** Inclusive UTC picker range with end capped at today — used for Targets tab API params. */
export function resolveTargetsUtcCalendarRange(rangeStart: Date, rangeEnd: Date): {
  start: Date;
  end: Date;
  fromYmd: string;
  toYmd: string;
  referenceDayYmd: string;
  isSingleDay: boolean;
} {
  const { start, end } = orderUtcCalendarRange(rangeStart, rangeEnd);
  const today = utcToday();
  const cappedEnd = formatUtcYmd(end) > formatUtcYmd(today) ? today : end;
  const fromYmd = formatUtcYmd(start);
  const toYmd = formatUtcYmd(cappedEnd);
  return {
    start,
    end: cappedEnd,
    fromYmd,
    toYmd,
    referenceDayYmd: formatUtcYmd(getThresholdReferenceUtcDay(start, cappedEnd)),
    isSingleDay: fromYmd === toYmd,
  };
}

/** Matches server `leadOwnerDisplayName` join for merging GET /leads/report `byUser` keys. */
export function normalizeOwnerDisplayLabel(name: string, surname: string): string {
  return [name, surname].filter(Boolean).join(' ').trim();
}

/** Non-physical check-ins per owner uid (matches sub-threshold “Calls” column). */
export function countCallsByOwnerUid(checkIns: VisitListItem[]): Map<number, number> {
  const m = new Map<number, number>();
  for (const c of checkIns) {
    const uid = c.owner?.uid;
    if (uid == null || !Number.isFinite(Number(uid))) continue;
    const method = (c.methodOfContact ?? '').trim().toUpperCase();
    if (method === 'PHYSICAL') continue;
    const n = Number(uid);
    m.set(n, (m.get(n) ?? 0) + 1);
  }
  return m;
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
