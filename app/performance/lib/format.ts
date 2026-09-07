export const PERFORMANCE_GP_MARGIN_THRESHOLD = 30;

export function formatPerformanceMoney(value: number, symbol = 'R'): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return value < 0 ? `(-${symbol}${formatted})` : `${symbol}${formatted}`;
}

export function formatPerformancePercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value).toFixed(1);
  return value < 0 ? `(-${abs}%)` : `${abs}%`;
}

export function formatPerformanceInteger(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString('en-ZA');
}

export function performanceAmountClassName(value: number): string {
  if (!Number.isFinite(value)) return 'text-muted-foreground';
  return value < 0
    ? 'font-semibold text-red-600 dark:text-red-400'
    : 'font-semibold text-green-600 dark:text-green-400';
}

export function performanceGpPercentClassName(value: number): string {
  if (!Number.isFinite(value)) return 'text-muted-foreground';
  return value < PERFORMANCE_GP_MARGIN_THRESHOLD
    ? 'font-semibold text-red-600 dark:text-red-400'
    : 'font-semibold text-green-600 dark:text-green-400';
}
