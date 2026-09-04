export const CALL_QUALITY_BAND_EXCELLENT_MIN = 85;
export const CALL_QUALITY_BAND_GOOD_MIN = 70;
export const CALL_QUALITY_BAND_NEEDS_IMPROVEMENT_MIN = 55;

export const CALL_QUALITY_SCORE_BANDS = ['excellent', 'good', 'needsImprovement', 'poor'] as const;
export type CallQualityScoreBand = (typeof CALL_QUALITY_SCORE_BANDS)[number];

/** Four-tier BitDrywall bands: Excellent 85+, Good 70–84, Needs improvement 55–69, Poor below 55. */
export function callQualityScoreBand(score: number): CallQualityScoreBand {
  if (score >= CALL_QUALITY_BAND_EXCELLENT_MIN) return 'excellent';
  if (score >= CALL_QUALITY_BAND_GOOD_MIN) return 'good';
  if (score >= CALL_QUALITY_BAND_NEEDS_IMPROVEMENT_MIN) return 'needsImprovement';
  return 'poor';
}

export function callQualityScoreBandLabel(band: CallQualityScoreBand): string {
  switch (band) {
    case 'excellent':
      return 'Excellent';
    case 'good':
      return 'Good';
    case 'needsImprovement':
      return 'Needs improvement';
    case 'poor':
      return 'Poor';
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

export function getScoreColorClasses(value: number): { text: string; bg: string; fill: string } {
  const clamped = Math.min(100, Math.max(0, value));
  const band = callQualityScoreBand(clamped);
  switch (band) {
    case 'excellent':
      return { text: 'text-green-600', bg: 'bg-green-500', fill: 'fill-green-600' };
    case 'good':
      return { text: 'text-emerald-600', bg: 'bg-emerald-500', fill: 'fill-emerald-600' };
    case 'needsImprovement':
      return { text: 'text-amber-600', bg: 'bg-amber-500', fill: 'fill-amber-600' };
    case 'poor':
      return { text: 'text-red-600', bg: 'bg-red-500', fill: 'fill-red-600' };
    default: {
      const _exhaustive: never = band;
      return _exhaustive;
    }
  }
}

/** Convert a 0–10 dimension score to 0–100 for color tiering. */
export function dimensionScoreToPercent(score: number): number {
  return Math.min(100, Math.max(0, score * 10));
}
