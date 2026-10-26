import { startOfDay, endOfDay } from 'date-fns';

/**
 * Rolling payroll cycle 26th–25th (aligned with server AttendanceService.getPayrollPeriod):
 * through the 25th → previous month 26 to current month 25;
 * from the 26th onward → current month 26 to next month 25.
 */
export function getPayrollPeriodRange(now: Date = new Date()): { start: Date; end: Date } {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  if (d <= 25) {
    return {
      start: startOfDay(new Date(y, m - 1, 26)),
      end: endOfDay(new Date(y, m, 25)),
    };
  }
  return {
    start: startOfDay(new Date(y, m, 26)),
    end: endOfDay(new Date(y, m + 1, 25)),
  };
}

/** Closed cycles the attendance modal can step back from the current one. */
export const MAX_PAYROLL_PERIOD_LOOKBACK = 24;

/**
 * The 26th that starts the payroll cycle `offsetCycles` away from `now`.
 * `0` is the current cycle; `-1` is the previous closed cycle.
 */
export function getPayrollPeriodAnchor(now: Date = new Date(), offsetCycles = 0): Date {
  const { start } = getPayrollPeriodRange(now);
  return startOfDay(new Date(start.getFullYear(), start.getMonth() + offsetCycles, 26));
}

/** Short label e.g. "26 Jan to 25 Feb" for dashboard. */
export function formatPayrollPeriodLabel(now: Date = new Date()): string {
  const { start, end } = getPayrollPeriodRange(now);
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  return `${fmt(start)} to ${fmt(end)}`;
}

/** Cycle label with year, e.g. "26 Sep – 25 Oct 2026" or "26 Dec 2025 – 25 Jan 2026". */
export function formatPayrollCycleLabel(start: Date, end: Date): string {
  const monthShort = (d: Date) => d.toLocaleString('default', { month: 'short' });
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()} ${monthShort(start)} – ${end.getDate()} ${monthShort(end)} ${end.getFullYear()}`;
  }
  return `${start.getDate()} ${monthShort(start)} ${start.getFullYear()} – ${end.getDate()} ${monthShort(end)} ${end.getFullYear()}`;
}
