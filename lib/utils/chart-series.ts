/**
 * Limit categorical chart data to the top N rows by value and bucket the rest as "Other".
 */

/** Coerce API/JSON values to a finite number (avoids string `+` concatenation bugs). */
export function finiteSeriesValue(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function takeTopNWithOther(
  rows: { name: string; value: unknown }[],
  n: number,
  otherLabel = 'Other'
): { name: string; value: number }[] {
  const normalized = rows.map((r) => ({
    name: r.name,
    value: finiteSeriesValue(r.value),
  }));
  if (normalized.length <= n) return normalized;
  const sorted = [...normalized].sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, n).map((r) => ({ name: r.name, value: r.value }));
  const restSum = sorted.slice(n).reduce((s, r) => s + r.value, 0);
  if (restSum <= 0) return head;
  return [...head, { name: otherLabel, value: restSum }];
}

/** Default headroom above the tallest bar (pipeline value axis). */
const PIPELINE_AXIS_PADDING = 500;

/**
 * Builds a fixed Y domain and tick list for pipeline currency bars:
 * max bar + padding, rounded up to a whole step so ticks are readable (e.g. 15k, 30k, 45k, 60k).
 */
export function buildPipelineValueAxis(
  maxBarValue: number,
  padding = PIPELINE_AXIS_PADDING
): { domainMax: number; ticks: number[] } {
  const maxVal = Math.max(0, finiteSeriesValue(maxBarValue));
  const rawMax = maxVal + padding;

  if (maxVal === 0) {
    return { domainMax: 1, ticks: [0, 1] };
  }

  let step: number;
  if (rawMax <= 2500) step = 500;
  else if (rawMax <= 10000) step = 2000;
  else if (rawMax <= 75000) step = 15000;
  else if (rawMax <= 500000) step = 50000;
  else {
    const pow = 10 ** Math.ceil(Math.log10(rawMax));
    step = pow / 5;
  }

  const domainMax = Math.ceil(rawMax / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= domainMax + 1e-9; t += step) {
    ticks.push(Math.round(t));
  }
  return { domainMax, ticks };
}

/** Y-axis tick labels: whole numbers, compact thousands (e.g. 15k, 60k). */
export function formatAxisTickThousands(v: number): string {
  if (!Number.isFinite(v)) return '';
  const n = Math.round(v);
  if (n === 0) return '0';
  if (n < 1000) return String(n);
  const k = n / 1000;
  if (Number.isInteger(k)) return `${k}k`;
  return `${Math.round(k)}k`;
}
