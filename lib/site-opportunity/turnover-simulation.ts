import type { CaptureTimelinePoint, SiteOpportunityZone } from '@/api/types/site-opportunity';
import { potentialMidZAR } from '@/lib/site-opportunity/format-potential';

export type TurnoverScenarioKey =
  | 'conservative'
  | 'expected'
  | 'strong'
  | 'marketLeader';

export interface TurnoverScenario {
  key: TurnoverScenarioKey;
  label: string;
  monthlyZAR: number;
  annualZAR: number;
}

export interface TurnoverMilestone {
  label: string;
  month: number;
  lowMonthlyZAR: number;
  midMonthlyZAR: number;
  highMonthlyZAR: number;
}

export interface ProductMixLine {
  category: string;
  pct: number;
  monthlyZAR: number;
}

export interface TurnoverSimulation {
  scenarios: TurnoverScenario[];
  milestones: TurnoverMilestone[];
  productMix: ProductMixLine[];
  matureMidMonthlyZAR: number;
  matureMidAnnualZAR: number;
  listSubtitleMonthlyZAR: number;
  /** Model mature mid monthly — never overridden by ERP actual. */
  simulatedMonthlyZAR: number;
  actualMonthlyZAR?: number | null;
  varianceZAR?: number | null;
  variancePct?: number | null;
}

/** BitDrywall product mix (memo reference) applied to projected mid mature monthly revenue. */
export const PRODUCT_MIX_PCT: readonly { category: string; pct: number }[] = [
  { category: 'Gypsum boards', pct: 35 },
  { category: 'Ceiling systems', pct: 20 },
  { category: 'Drywall steel', pct: 15 },
  { category: 'Insulation', pct: 10 },
  { category: 'Adhesives & chemicals (FuseChem)', pct: 10 },
  { category: 'Doors, accessories & others', pct: 10 },
];

const MILESTONE_MONTHS: readonly { label: string; month: number }[] = [
  { label: 'Month 1–3', month: 3 },
  { label: 'Month 6', month: 6 },
  { label: 'Month 12', month: 12 },
  { label: 'Month 24', month: 24 },
  { label: 'Mature (30)', month: 30 },
];

function timelinePointAtMonth(
  timeline: CaptureTimelinePoint[],
  month: number,
): CaptureTimelinePoint | null {
  if (timeline.length === 0) return null;
  let closest = timeline[0]!;
  for (const point of timeline) {
    if (point.month <= month) closest = point;
    else break;
  }
  return closest;
}

function strongMonthlyZAR(lowMonthly: number, highMonthly: number): number {
  return lowMonthly + (highMonthly - lowMonthly) * 0.75;
}

export function buildTurnoverSimulation(
  zone: SiteOpportunityZone,
  options?: { actualRevenueZAR?: number | null }
): TurnoverSimulation {
  const { potentialLowZAR, potentialHighZAR, captureTimeline } = zone;
  const actualMonthly = options?.actualRevenueZAR;
  const hasActual =
    actualMonthly != null && Number.isFinite(actualMonthly) && actualMonthly > 0;

  const midMonthly = hasActual
    ? actualMonthly
    : potentialMidZAR(potentialLowZAR, potentialHighZAR);

  const lowMonthly = hasActual
    ? Math.min(actualMonthly, potentialLowZAR)
    : potentialLowZAR;
  const highMonthly = hasActual
    ? Math.max(actualMonthly, potentialHighZAR)
    : potentialHighZAR;
  const strongMonthly = strongMonthlyZAR(lowMonthly, highMonthly);

  const scenarios: TurnoverScenario[] = [
    {
      key: 'conservative',
      label: hasActual ? 'Conservative (pool low)' : 'Conservative',
      monthlyZAR: lowMonthly,
      annualZAR: lowMonthly * 12,
    },
    {
      key: 'expected',
      label: hasActual ? 'Actual ERP (monthly avg)' : 'Expected',
      monthlyZAR: midMonthly,
      annualZAR: midMonthly * 12,
    },
    {
      key: 'strong',
      label: 'Strong execution',
      monthlyZAR: strongMonthly,
      annualZAR: strongMonthly * 12,
    },
    {
      key: 'marketLeader',
      label: hasActual ? 'Pool high potential' : 'Market leader',
      monthlyZAR: highMonthly,
      annualZAR: highMonthly * 12,
    },
  ];

  const milestones: TurnoverMilestone[] = MILESTONE_MONTHS.map(({ label, month }) => {
    const point = timelinePointAtMonth(captureTimeline, month);
    return {
      label,
      month,
      lowMonthlyZAR: point?.revenueLowZAR ?? 0,
      midMonthlyZAR: point?.revenueMidZAR ?? 0,
      highMonthlyZAR: point?.revenueHighZAR ?? 0,
    };
  });

  const maturePoint =
    timelinePointAtMonth(captureTimeline, 30) ??
    captureTimeline[captureTimeline.length - 1];
  const simulatedMonthlyZAR =
    maturePoint?.revenueMidZAR ?? potentialMidZAR(potentialLowZAR, potentialHighZAR);
  const matureMidMonthlyZAR = simulatedMonthlyZAR;

  const actualMonthlyZAR = hasActual ? actualMonthly : null;
  const varianceZAR =
    hasActual && actualMonthly != null
      ? actualMonthly - simulatedMonthlyZAR
      : null;
  const variancePct =
    hasActual &&
    actualMonthly != null &&
    simulatedMonthlyZAR > 0
      ? ((actualMonthly / simulatedMonthlyZAR) - 1) * 100
      : null;

  const productMix: ProductMixLine[] = PRODUCT_MIX_PCT.map(({ category, pct }) => ({
    category,
    pct,
    monthlyZAR: matureMidMonthlyZAR * (pct / 100),
  }));

  const month6Point = timelinePointAtMonth(captureTimeline, 6);
  const listSubtitleMonthlyZAR = month6Point?.revenueMidZAR ?? midMonthly;

  return {
    scenarios,
    milestones,
    productMix,
    matureMidMonthlyZAR,
    matureMidAnnualZAR: matureMidMonthlyZAR * 12,
    listSubtitleMonthlyZAR,
    simulatedMonthlyZAR,
    actualMonthlyZAR,
    varianceZAR,
    variancePct,
  };
}
