import type { PolicyWindowParams } from '@/api/types/performance-policy';
import { formatUtcYmd, utcDateFromYmd } from '@/lib/utils/overview-daily-summary';

/** Server limit for a custom policy window. */
export const POLICY_MAX_CUSTOM_DAYS = 92;
const MS_PER_DAY = 86_400_000;

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** `yyyy-MM` when `from`..`to` is exactly one whole calendar month, otherwise null. */
export function calendarMonthOfRange(from: string, to: string): string | null {
  if (from.slice(8, 10) !== '01' || from.slice(0, 7) !== to.slice(0, 7)) return null;
  const [year, month] = from.split('-').map(Number);
  return Number(to.slice(8, 10)) === lastDayOfMonth(year, month - 1) ? from.slice(0, 7) : null;
}

/**
 * The window to send to the server. The current month is open-ended, so its `to` is clamped to today
 * (a future `to` is rejected); a whole past month is sent as `month` so a finalised snapshot can be served.
 */
export function toPolicyWindow(from: string, to: string, today: Date = new Date()): PolicyWindowParams {
  const todayYmd = formatUtcYmd(today);
  const month = calendarMonthOfRange(from, to);
  if (month && month <= todayYmd.slice(0, 7)) return { month };
  return { from, to: to > todayYmd ? todayYmd : to };
}

/** True when the range spans more days than the server accepts. */
export function isPolicyRangeTooLong(from: string, to: string): boolean {
  const days = Math.round((utcDateFromYmd(to).getTime() - utcDateFromYmd(from).getTime()) / MS_PER_DAY) + 1;
  return days > POLICY_MAX_CUSTOM_DAYS;
}

/** A window is closed (final) once its last day is before today. */
export function isPolicyWindowClosed(to: string, today: Date = new Date()): boolean {
  return to < formatUtcYmd(today);
}

/** Previous calendar month relative to `reference`. */
export function previousMonthRange(reference: Date = new Date()): { start: Date; end: Date } {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth() - 1;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), lastDayOfMonth(start.getUTCFullYear(), start.getUTCMonth())));
  return { start, end };
}
