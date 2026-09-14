const HOURLY_SALES_START_HOUR = 7;
const HOURLY_SALES_END_HOUR = 17;

/** X-axis labels every 4 hours across 07:00–17:00. */
export const HOURLY_SALES_X_TICKS = ['7am', '11am', '3pm', '5pm'] as const;

export type HourlySalesChartPoint = {
  name: string;
  value: number | null;
};

/** Formats a 0–23 hour as `7am` / `12pm`. */
function hourLabel(hour: number): string {
  if (hour === 0) return '12am';
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return '12pm';
  return `${hour - 12}pm`;
}

/** Parses labels like `7am` / `3pm` to a 0–23 hour, or null if invalid. */
function parseHourLabel(label: string): number | null {
  const match = label.trim().toLowerCase().match(/^(\d{1,2})\s*(am|pm)$/);
  if (!match) return null;
  const hour12 = Number(match[1]);
  const period = match[2];
  if (!Number.isFinite(hour12) || hour12 < 1 || hour12 > 12) return null;
  if (hour12 === 12) return period === 'am' ? 0 : 12;
  return period === 'pm' ? hour12 + 12 : hour12;
}

/**
 * Pads hourly sales to a fixed 07:00–17:00 domain.
 * Hours after the last known point stay `null` so the line does not drop to R0.
 */
export function padHourlySalesDomain(
  data: { label?: string; value: number }[]
): HourlySalesChartPoint[] {
  if (data.length === 0) return [];

  const byHour = new Map<number, number>();
  let lastPresentHour = HOURLY_SALES_START_HOUR - 1;
  for (const point of data) {
    const hour = parseHourLabel(point.label || '');
    if (hour == null) continue;
    byHour.set(hour, point.value);
    if (hour > lastPresentHour) lastPresentHour = hour;
  }

  if (byHour.size === 0) {
    return data.map((d) => ({ name: d.label || '', value: d.value }));
  }

  const points: HourlySalesChartPoint[] = [];
  for (let hour = HOURLY_SALES_START_HOUR; hour <= HOURLY_SALES_END_HOUR; hour++) {
    const existing = byHour.get(hour);
    if (existing != null) {
      points.push({ name: hourLabel(hour), value: existing });
    } else if (hour <= lastPresentHour) {
      points.push({ name: hourLabel(hour), value: 0 });
    } else {
      points.push({ name: hourLabel(hour), value: null });
    }
  }
  return points;
}
