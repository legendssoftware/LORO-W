import { getDate, getDaysInMonth } from 'date-fns';

/** Expected monthly hours (used for progress and charts). */
export const EXPECTED_MONTHLY_HOURS = 180;

/** Expected hours per weekday (Mon–Fri) for five-day work week calculations. */
export const EXPECTED_HOURS_PER_DAY = 8;

/** Hours behind expected at which to show the "Running behind" badge on user cards. */
export const HOURS_BEHIND_BADGE_THRESHOLD = 20;

/** Expected monthly hours for a five-day work week: weekdays in month × EXPECTED_HOURS_PER_DAY. month is 1–12. */
export function getExpectedMonthlyHoursWeekdaysOnly(year: number, month: number): number {
  return workingDaysInMonth(year, month) * EXPECTED_HOURS_PER_DAY;
}

/** Count weekdays (Mon–Fri) in a calendar month. month is 1–12. */
export function workingDaysInMonth(year: number, month: number): number {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Count weekdays from the 1st of the month through asOfDate (inclusive). */
function weekdaysFromMonthStartThrough(asOfDate: Date): number {
  const year = asOfDate.getFullYear();
  const month = asOfDate.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  let count = 0;
  const d = new Date(start);
  while (d <= asOfDate) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/** Prorated expected hours by date: (weekdays so far / weekdays in month) × expected monthly (five-day week). Use for staff cards so weekend workers are not marked behind. */
export function getExpectedHoursByDateWeekdaysOnly(asOfDate: Date): number {
  const year = asOfDate.getFullYear();
  const month = asOfDate.getMonth() + 1;
  const total = workingDaysInMonth(year, month);
  if (total === 0) return 0;
  const soFar = weekdaysFromMonthStartThrough(asOfDate);
  const expectedMonthly = getExpectedMonthlyHoursWeekdaysOnly(year, month);
  return Math.round((soFar / total) * expectedMonthly);
}

/** Prorated expected hours by date: (day of month / days in month) × EXPECTED_MONTHLY_HOURS. */
export function getExpectedHoursByDate(asOfDate: Date): number {
  const day = getDate(asOfDate);
  const daysInMonth = getDaysInMonth(asOfDate);
  return Math.round((day / daysInMonth) * EXPECTED_MONTHLY_HOURS);
}

/** Count weekdays (Mon–Fri) between start and end (inclusive). */
export function workingDaysInPeriod(start: Date, end: Date): number {
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const day = d.getDay();
    if (day >= 1 && day <= 5) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

/**
 * Prorated expected hours by asOfDate within a payroll period.
 * Uses (weekdays from period start through asOfDate / total weekdays in period) × EXPECTED_MONTHLY_HOURS (180).
 * asOfDate is clamped to [periodStart, periodEnd].
 */
export function getExpectedPayrollHoursByDate(
  periodStart: Date,
  periodEnd: Date,
  asOfDate: Date
): number {
  const start = new Date(periodStart.getFullYear(), periodStart.getMonth(), periodStart.getDate());
  const end = new Date(periodEnd.getFullYear(), periodEnd.getMonth(), periodEnd.getDate());
  const clamped = asOfDate < start ? start : asOfDate > end ? end : new Date(asOfDate.getFullYear(), asOfDate.getMonth(), asOfDate.getDate());
  const total = workingDaysInPeriod(start, end);
  if (total === 0) return 0;
  const soFar = workingDaysInPeriod(start, clamped);
  const targetHours = EXPECTED_MONTHLY_HOURS;
  return Math.round((soFar / total) * targetHours);
}
