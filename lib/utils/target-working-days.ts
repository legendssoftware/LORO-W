/**
 * Standard working-day denominator for monthly call/lead targets.
 * Matches server `TARGET_WORKING_DAYS_PER_MONTH` (60/day × 20 = 1200/month).
 */
export const TARGET_WORKING_DAYS_PER_MONTH = 20;

/** Inclusive Mon–Fri count between two yyyy-MM-dd strings (UTC date parts). */
export function workingDaysInclusiveYmd(startYmd: string, endYmd: string): number {
  const a = Date.parse(`${startYmd.slice(0, 10)}T00:00:00.000Z`);
  const b = Date.parse(`${endYmd.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  let count = 0;
  const cur = new Date(a);
  const last = new Date(b);
  while (cur.getTime() <= last.getTime()) {
    const dow = cur.getUTCDay();
    if (dow >= 1 && dow <= 5) count++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count;
}
