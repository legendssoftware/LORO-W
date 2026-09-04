/** Human duration for call-quality KPIs (seconds in, short phrase out). */
export function formatCallSecondsPhrase(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const rounded = Math.round(seconds);
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return rest > 0 ? `${minutes}m ${rest}s` : `${minutes}m`;
}

export function formatCallQualityRate(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value}%`;
}

export function utcYmdToday(): string {
  return new Date().toISOString().slice(0, 10);
}
