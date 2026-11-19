/** Local calendar date in YYYY-MM-DD (browser timezone). */
export function getLocalTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDefaultTodayDateRange(): { startDate: string; endDate: string } {
  const today = getLocalTodayIsoDate();
  return { startDate: today, endDate: today };
}

export function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatLocalYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function resolveDashboardDateRange(filters: {
  dateRange?: { startDate?: string; endDate?: string };
}): { startDate: string; endDate: string } {
  const start = filters.dateRange?.startDate?.trim();
  const end = filters.dateRange?.endDate?.trim();
  if (start && end) return { startDate: start, endDate: end };
  return getDefaultTodayDateRange();
}

export function formatDateRangeLabel(startDate: string, endDate: string): string {
  const start = parseLocalYmd(startDate);
  const end = parseLocalYmd(endDate);
  const sameDay = startDate === endDate;
  const fmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  if (sameDay) return start.toLocaleDateString('en-ZA', fmt);
  return `${start.toLocaleDateString('en-ZA', fmt)} – ${end.toLocaleDateString('en-ZA', fmt)}`;
}

export function addLocalDays(ymd: string, days: number): string {
  const d = parseLocalYmd(ymd);
  d.setDate(d.getDate() + days);
  return formatLocalYmd(d);
}

export type PerformanceDatePresetId =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'last30'
  | 'thisMonth'
  | 'ytd';

export function getPerformanceDatePresets(): Array<{
  id: PerformanceDatePresetId;
  startDate: string;
  endDate: string;
}> {
  const today = getLocalTodayIsoDate();
  const todayDate = parseLocalYmd(today);
  const monthStart = formatLocalYmd(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const yearStart = formatLocalYmd(new Date(todayDate.getFullYear(), 0, 1));
  return [
    { id: 'today', startDate: today, endDate: today },
    { id: 'yesterday', startDate: addLocalDays(today, -1), endDate: addLocalDays(today, -1) },
    { id: 'last7', startDate: addLocalDays(today, -6), endDate: today },
    { id: 'last30', startDate: addLocalDays(today, -29), endDate: today },
    { id: 'thisMonth', startDate: monthStart, endDate: today },
    { id: 'ytd', startDate: yearStart, endDate: today },
  ];
}
