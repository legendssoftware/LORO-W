/** Fixed HSL palette for Reports charts (Attendance, Visits). */
export const REPORT_CHART_HSL = {
  c1: 'hsl(0 72.2% 50.6%)',
  c2: 'hsl(20.5 90.2% 48.2%)',
  c3: 'hsl(142.1 76.2% 36.3%)',
  c4: 'hsl(200.4 98% 39.4%)',
  c5: 'hsl(346.8 77.2% 49.8%)',
} as const;

/** @deprecated Use REPORT_CHART_HSL — kept for existing imports. */
export const ATT_CHART_HSL = REPORT_CHART_HSL;
