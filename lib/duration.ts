/**
 * Parse duration strings from check-ins (e.g. "1h 30m", "90") into minutes.
 * Used for aggregating visit time per day in the payroll modal.
 */
export function parseDurationToMinutes(value: string | null | undefined): number {
  if (value == null || typeof value !== 'string') return 0;
  const s = value.trim();
  if (!s) return 0;

  // Format: "1h 30m" or "1h" or "45m"
  const hMatch = s.match(/(\d+)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  if (hMatch || mMatch) {
    const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
    const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
    return hours * 60 + mins;
  }

  // Plain number (assume minutes)
  const n = parseInt(s, 10);
  if (!Number.isNaN(n) && n >= 0) return n;

  return 0;
}

/**
 * Format minutes as "Xh Ym" for display (e.g. 90 -> "1h 30m").
 */
export function formatMinutesToDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
