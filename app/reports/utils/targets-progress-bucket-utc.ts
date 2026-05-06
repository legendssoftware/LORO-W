import type { OverviewTimeframe } from '@/app/reports/utils/overview-daily-summary';
import type { VisitListItem } from '@/api/types/visits';

const HOUR_BUCKET_KEY = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})$/;
const DAY_BUCKET_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Inclusive UTC millisecond bounds for a targets-progress aggregate bucket `key`
 * (matches `buildBuckets` in server `targets-progress.service.ts`).
 */
export function utcInclusiveRangeMsFromProgressBucketKey(
  key: string,
  timeframe: OverviewTimeframe
): { startMs: number; endMs: number } | null {
  if (timeframe === 'day') {
    const m = key.match(HOUR_BUCKET_KEY);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const h = Number(m[4]);
    if (
      !Number.isFinite(y) ||
      !Number.isFinite(mo) ||
      !Number.isFinite(d) ||
      !Number.isFinite(h)
    )
      return null;
    if (h < 0 || h > 23) return null;
    return {
      startMs: Date.UTC(y, mo, d, h, 0, 0, 0),
      endMs: Date.UTC(y, mo, d, h, 59, 59, 999),
    };
  }
  const m = key.match(DAY_BUCKET_KEY);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d))
    return null;
  return {
    startMs: Date.UTC(y, mo, d, 0, 0, 0, 0),
    endMs: Date.UTC(y, mo, d, 23, 59, 59, 999),
  };
}

/** Count check-ins (all contact methods) whose checkInTime falls in [startMs, endMs] inclusive. */
export function countCheckInsInUtcMsWindow(
  checkIns: VisitListItem[],
  startMs: number,
  endMs: number
): number {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return 0;
  let n = 0;
  for (const c of checkIns) {
    const t = new Date(c.checkInTime).getTime();
    if (!Number.isFinite(t)) continue;
    if (t >= startMs && t <= endMs) n += 1;
  }
  return n;
}

export function countCheckInsInProgressBucket(
  checkIns: VisitListItem[],
  bucketKey: string,
  timeframe: OverviewTimeframe
): number {
  const range = utcInclusiveRangeMsFromProgressBucketKey(bucketKey, timeframe);
  if (!range) return 0;
  return countCheckInsInUtcMsWindow(
    checkIns,
    range.startMs,
    range.endMs
  );
}
