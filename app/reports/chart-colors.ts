/**
 * Shared chart color and formatters for reports (visits and attendance).
 * Four distinct HSL colors for bars and pie chart segments.
 */
const CHART_COLORS = [
  'hsl(0 84.2% 60.2%)',
  'hsl(24.6 95% 53.1%)',
  'hsl(142.1 70.6% 45.3%)',
  'hsl(160.1 84.1% 39.4%)',
  'hsl(188.7 94.5% 42.7%)',
  'hsl(198.6 88.7% 48.4%)',
  'hsl(258.3 89.5% 66.3%)',
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Format numeric values for pie chart centers: use "1k", "18k" for thousands
 * so large numbers fit on the page. Optional suffix (e.g. "h" for hours).
 */
export function formatCompactValue(value: number, suffix?: string): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1000) {
    const k = value / 1000;
    const rounded = Math.round(k * 10) / 10;
    const str = rounded % 1 === 0 ? String(Math.round(rounded)) : String(rounded);
    return `${sign}${str}k${suffix ?? ''}`;
  }
  const numStr = abs % 1 === 0 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
  return `${sign}${numStr}${suffix ?? ''}`;
}
