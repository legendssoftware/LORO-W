import type { CapturePhasePoint, CaptureTimelinePoint } from './types';

export const MARKET_CAPTURE_PHASES: CapturePhasePoint[] = [
  {
    phase: 'Launch',
    monthStart: 0,
    monthEnd: 3,
    captureLowPct: 0.1,
    captureHighPct: 0.2,
    captureMidPct: 0.15,
  },
  {
    phase: 'Entry',
    monthStart: 3,
    monthEnd: 6,
    captureLowPct: 0.2,
    captureHighPct: 0.35,
    captureMidPct: 0.275,
  },
  {
    phase: 'Growth',
    monthStart: 6,
    monthEnd: 12,
    captureLowPct: 0.35,
    captureHighPct: 0.55,
    captureMidPct: 0.45,
  },
  {
    phase: 'Expansion',
    monthStart: 12,
    monthEnd: 18,
    captureLowPct: 0.5,
    captureHighPct: 0.7,
    captureMidPct: 0.6,
  },
  {
    phase: 'Dominance',
    monthStart: 18,
    monthEnd: 30,
    captureLowPct: 0.6,
    captureHighPct: 0.8,
    captureMidPct: 0.7,
  },
];

function captureMidAtMonth(month: number): number {
  for (const p of MARKET_CAPTURE_PHASES) {
    if (month >= p.monthStart && month < p.monthEnd) return p.captureMidPct;
  }
  const last = MARKET_CAPTURE_PHASES[MARKET_CAPTURE_PHASES.length - 1];
  return last?.captureMidPct ?? 0.7;
}

/** Monthly projected revenue curve from potential band and capture phases. */
export function buildCaptureTimeline(
  potentialLowZAR: number,
  potentialHighZAR: number,
  maxMonths = 30
): CaptureTimelinePoint[] {
  const potentialMidZAR = (potentialLowZAR + potentialHighZAR) / 2;
  const points: CaptureTimelinePoint[] = [];
  for (let month = 0; month <= maxMonths; month += 3) {
    const captureMidPct = captureMidAtMonth(month);
    points.push({
      month,
      captureMidPct,
      revenueLowZAR: potentialLowZAR * captureMidPct,
      revenueMidZAR: potentialMidZAR * captureMidPct,
      revenueHighZAR: potentialHighZAR * captureMidPct,
    });
  }
  return points;
}
