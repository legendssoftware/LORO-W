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

/** Short label e.g. "26 Jan to 25 Feb" for dashboard. */
export function formatPayrollPeriodLabel(now: Date = new Date()): string {
  const { start, end } = getPayrollPeriodRange(now);
  const fmt = (d: Date) => `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
  return `${fmt(start)} to ${fmt(end)}`;
}
