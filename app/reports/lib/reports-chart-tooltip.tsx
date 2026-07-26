'use client';

import type { ReactNode } from 'react';
import {
  formatReportChartValue,
  type ReportsChartValueKind,
} from '@/app/reports/lib/reports-chart-format';

type TooltipItem = {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  payload?: Record<string, unknown>;
};

/**
 * Full tooltip row for shadcn ChartTooltipContent `formatter`.
 * When a formatter is set, it replaces the default row — so we must
 * return color swatch + label + spaced amount ourselves.
 */
export function reportsTooltipRow(
  value: unknown,
  name: unknown,
  item: TooltipItem,
  opts?: {
    valueKind?: ReportsChartValueKind;
    formatValue?: (n: number) => string;
    /** Prefer config / payload label over raw series key. */
    label?: string;
  }
): ReactNode {
  const n = Number(value);
  const formatted =
    opts?.formatValue?.(n) ??
    (formatReportChartValue(n, opts?.valueKind ?? 'count') ||
      (Number.isFinite(n) ? String(n) : String(value ?? '')));

  const payload = item.payload;
  const fromPayload =
    typeof payload?.label === 'string'
      ? payload.label
      : typeof payload?.name === 'string' &&
          payload.name !== 'sales' &&
          !/^s\d+$/.test(payload.name)
        ? payload.name
        : undefined;

  const label =
    opts?.label?.trim() ||
    fromPayload ||
    (typeof name === 'string' ? name : String(name ?? ''));

  const color =
    (typeof payload?.fill === 'string' ? payload.fill : undefined) ||
    item.color ||
    'var(--muted-foreground)';

  return (
    <>
      <div
        className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
        style={{ backgroundColor: color }}
      />
      <div className="flex min-w-0 flex-1 items-center justify-between gap-4 leading-none">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono font-medium tabular-nums">
          {formatted}
        </span>
      </div>
    </>
  );
}

/** ChartTooltipContent-compatible formatter bound to a value kind. */
export function reportsChartTooltipFormatter(
  valueKind: ReportsChartValueKind = 'count',
  resolveLabel?: (name: string, item: TooltipItem) => string | undefined
) {
  return (
    value: unknown,
    name: unknown,
    item: TooltipItem
  ): ReactNode => {
    const key = String(name ?? item.dataKey ?? '');
    const label = resolveLabel?.(key, item);
    return reportsTooltipRow(value, name, item, { valueKind, label });
  };
}
