/** Three-tier score colors: red (0–39), amber (40–69), green (70–100). */
export function getScoreColorClasses(value: number): { text: string; bg: string; fill: string } {
  const clamped = Math.min(100, Math.max(0, value));
  if (clamped >= 70) {
    return { text: 'text-green-600', bg: 'bg-green-500', fill: 'fill-green-600' };
  }
  if (clamped >= 40) {
    return { text: 'text-amber-600', bg: 'bg-amber-500', fill: 'fill-amber-600' };
  }
  return { text: 'text-red-600', bg: 'bg-red-500', fill: 'fill-red-600' };
}

/** Convert a 0–10 dimension score to 0–100 for color tiering. */
export function dimensionScoreToPercent(score: number): number {
  return Math.min(100, Math.max(0, score * 10));
}
