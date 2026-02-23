/**
 * Shared chart color and formatters for reports (visits and attendance).
 * Single orange used for all bars and pie slices.
 */
export const REPORTS_CHART_COLOR = '#F27A2F';

export function getChartColor(_index: number): string {
  return REPORTS_CHART_COLOR;
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
