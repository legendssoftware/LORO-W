import { getDate, getDaysInMonth } from 'date-fns';

/** Expected monthly hours (used for progress and charts). */
export const EXPECTED_MONTHLY_HOURS = 180;

/** Prorated expected hours by date: (day of month / days in month) × EXPECTED_MONTHLY_HOURS. */
export function getExpectedHoursByDate(asOfDate: Date): number {
  const day = getDate(asOfDate);
  const daysInMonth = getDaysInMonth(asOfDate);
  return Math.round((day / daysInMonth) * EXPECTED_MONTHLY_HOURS);
}
