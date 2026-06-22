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

export function buildTurnoverSimulation(zone: SiteOpportunityZone): TurnoverSimulation {
  const { potentialLowZAR, potentialHighZAR, captureTimeline } = zone;
  const midAnnual = potentialMidZAR(potentialLowZAR, potentialHighZAR);

  const lowMonthly = potentialLowZAR / 12;
  const midMonthly = midAnnual / 12;
  const highMonthly = potentialHighZAR / 12;
  const strongMonthly = strongMonthlyZAR(lowMonthly, highMonthly);

  const scenarios: TurnoverScenario[] = [
    {
      key: 'conservative',
      label: 'Conservative',
      monthlyZAR: lowMonthly,
      annualZAR: potentialLowZAR,
    },
    {
      key: 'expected',
      label: 'Expected',
      monthlyZAR: midMonthly,
      annualZAR: midAnnual,
    },
    {
      key: 'strong',
      label: 'Strong execution',
      monthlyZAR: strongMonthly,
      annualZAR: strongMonthly * 12,
    },
    {
      key: 'marketLeader',
      label: 'Market leader',
      monthlyZAR: highMonthly,
      annualZAR: potentialHighZAR,
    },
  ];

  const milestones: TurnoverMilestone[] = MILESTONE_MONTHS.map(({ label, month }) => {
    const point = timelinePointAtMonth(captureTimeline, month);
    return {
      label,
      month,
      lowMonthlyZAR: (point?.revenueLowZAR ?? 0) / 12,
      midMonthlyZAR: (point?.revenueMidZAR ?? 0) / 12,
      highMonthlyZAR: (point?.revenueHighZAR ?? 0) / 12,
    };
  });

  const maturePoint =
    timelinePointAtMonth(captureTimeline, 30) ??
    captureTimeline[captureTimeline.length - 1];
  const matureMidMonthlyZAR =
    (maturePoint?.revenueMidZAR ?? midAnnual) / 12;

  const productMix: ProductMixLine[] = PRODUCT_MIX_PCT.map(({ category, pct }) => ({
    category,
    pct,
    monthlyZAR: matureMidMonthlyZAR * (pct / 100),
  }));

  const month6Point = timelinePointAtMonth(captureTimeline, 6);
  const listSubtitleMonthlyZAR =
    (month6Point?.revenueMidZAR ?? midAnnual) / 12;

  return {
    scenarios,
    milestones,
    productMix,
    matureMidMonthlyZAR,
    matureMidAnnualZAR: matureMidMonthlyZAR * 12,
    listSubtitleMonthlyZAR,
  };
}
