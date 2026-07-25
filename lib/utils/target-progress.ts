/**
 * Target progress helpers aligned with server `getUserTarget` pct():
 * progress = min(100, round((current / target) * 100)) when target > 0, else 0.
 */

export function targetNum(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Matches server `pct(current, target)` in user.service getUserTarget. */
export function calcTargetProgress(current: unknown, target: unknown): number {
  const t = targetNum(target);
  if (t <= 0) return 0;
  const c = targetNum(current);
  return Math.min(100, Math.round((c / t) * 100));
}

/**
 * Equal average of progress for metrics that have target > 0.
 * Returns 0 when no active metrics.
 */
export function calcOverallAchievement(
  metrics: ReadonlyArray<{ current: unknown; target: unknown; progress?: number | null }>
): number {
  const active = metrics.filter((m) => targetNum(m.target) > 0);
  if (active.length === 0) return 0;
  const sum = active.reduce((acc, m) => {
    if (typeof m.progress === 'number' && Number.isFinite(m.progress)) {
      return acc + Math.min(100, Math.max(0, Math.round(m.progress)));
    }
    return acc + calcTargetProgress(m.current, m.target);
  }, 0);
  return Math.min(100, Math.round(sum / active.length));
}
