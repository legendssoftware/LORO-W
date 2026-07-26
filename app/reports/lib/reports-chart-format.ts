/**
 * Compact number / money labels for Overview charts.
 * Money uses `R` (not `ZAR`); large values use K / M.
 */

export function formatReportCompact(value: number): string {
  if (!Number.isFinite(value)) return '';
  const n = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const body =
      m >= 10 ? `${Math.round(m)}M` : `${m.toFixed(1).replace(/\.0$/, '')}M`;
    return `${sign}${body}`;
  }
  if (n >= 1_000) {
    const k = n / 1_000;
    const body =
      k >= 10 ? `${Math.round(k)}K` : `${k.toFixed(1).replace(/\.0$/, '')}K`;
    return `${sign}${body}`;
  }
  return `${sign}${Math.round(n).toLocaleString()}`;
}

/** Rand prefix + compact (e.g. R12.6M, R56K, R2012). */
export function formatReportMoney(value: number): string {
  if (!Number.isFinite(value)) return '';
  const compact = formatReportCompact(value);
  if (!compact) return '';
  if (compact.startsWith('-')) return `-R${compact.slice(1)}`;
  return `R${compact}`;
}

export type ReportsChartValueKind = 'count' | 'money' | 'hours' | 'duration';

export function formatReportChartValue(
  value: number,
  kind: ReportsChartValueKind = 'count'
): string {
  if (!Number.isFinite(value) || value === 0) return '';
  if (kind === 'money') return formatReportMoney(value);
  if (kind === 'duration') {
    const mins = Math.max(0, Math.round(value));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return formatReportCompact(value);
}

/** Default Y-axis title for report charts. */
export function reportsYAxisLabel(
  kind: ReportsChartValueKind = 'count',
  override?: string
): string {
  if (override?.trim()) return override.trim();
  switch (kind) {
    case 'money':
      return 'Revenue';
    case 'hours':
      return 'Hours';
    case 'duration':
      return 'Duration';
    case 'count':
      return 'Count';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Reserved left band so the Y title sits clear of tick values. */
export function reportsYAxisWidth(kind: ReportsChartValueKind = 'count'): number {
  switch (kind) {
    case 'money':
      return 78;
    case 'hours':
      return 64;
    case 'duration':
      return 72;
    case 'count':
      return 64;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

/** Shared plot margins — room for axis titles, ticks, and legend. */
export const REPORTS_CHART_MARGIN = {
  top: 24,
  right: 12,
  left: 4,
  bottom: 12,
} as const;

/** Y-axis title style — offset keeps the label clear of tick values. */
export function reportsYAxisLabelProps(value: string) {
  return {
    value,
    angle: -90 as const,
    position: 'insideLeft' as const,
    offset: 4,
    style: {
      textAnchor: 'middle' as const,
      fontSize: 11,
      fill: 'var(--muted-foreground)',
    },
  };
}

export type ReportsCategoryAxisLayout = {
  angle: number;
  textAnchor: 'end' | 'middle';
  height: number;
};

/**
 * Slant X labels when categories are many, or when labels are longer than 5
 * characters on a moderate axis. Few short categories stay horizontal.
 */
export function getReportsCategoryAxisLayout(
  labels: string[]
): ReportsCategoryAxisLayout {
  const count = labels.length;
  if (count === 0) {
    return { angle: 0, textAnchor: 'middle', height: 44 };
  }

  const longest = labels.reduce(
    (max, label) => Math.max(max, label.trim().length),
    0
  );
  const hasLongLabel = longest > 5;

  // Few categories: keep horizontal for display
  if (count <= 3) {
    return { angle: 0, textAnchor: 'middle', height: 44 };
  }

  // Many categories, or moderate count with long labels → slant
  const shouldSlant = count > 6 || (count >= 4 && hasLongLabel);

  if (!shouldSlant) {
    return { angle: 0, textAnchor: 'middle', height: 44 };
  }

  return {
    angle: -35,
    textAnchor: 'end',
    height: longest > 14 ? 84 : 68,
  };
}

/**
 * Display currency for reports UI / exports. ZAR → R; other codes pass through.
 */
export function formatReportCurrencyCode(
  currency?: string | null,
  fallback = 'R'
): string {
  const raw = currency?.trim();
  if (!raw) return fallback;
  if (raw.toUpperCase() === 'ZAR') return 'R';
  return raw;
}
