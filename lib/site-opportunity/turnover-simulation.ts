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
  actualRevenueMonthLabel?: string | null;
  varianceZAR?: number | null;
  variancePct?: number | null;
  repsRequired?: number | null;
  repTargetMonthlyZAR?: number | null;
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
  { label: 'Month 1–5', month: 5 },
  { label: 'Month 6–12', month: 12 },
  { label: 'Month 24', month: 24 },
  { label: 'Mature (30)', month: 30 },
];

function interpolateTimelinePoint(
  timeline: CaptureTimelinePoint[],
  month: number,
): CaptureTimelinePoint | null {
  if (timeline.length === 0) return null;

  const exact = timeline.find((point) => point.month === month);
  if (exact) return exact;

  let lower = timeline[0]!;
  let upper = timeline[timeline.length - 1]!;

  for (const point of timeline) {
    if (point.month <= month) lower = point;
    if (point.month >= month) {
      upper = point;
      break;
    }
  }

  if (lower.month === upper.month) return lower;

  const span = upper.month - lower.month;
  const t = span > 0 ? (month - lower.month) / span : 0;
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    month,
    captureMidPct: lerp(lower.captureMidPct, upper.captureMidPct),
    revenueLowZAR: lerp(lower.revenueLowZAR, upper.revenueLowZAR),
    revenueMidZAR: lerp(lower.revenueMidZAR, upper.revenueMidZAR),
    revenueHighZAR: lerp(lower.revenueHighZAR, upper.revenueHighZAR),
  };
}

function timelinePointAtMonth(
  timeline: CaptureTimelinePoint[],
  month: number,
): CaptureTimelinePoint | null {
  return interpolateTimelinePoint(timeline, month);
}

function strongMonthlyZAR(lowMonthly: number, highMonthly: number): number {
  return lowMonthly + (highMonthly - lowMonthly) * 0.75;
}

export function buildTurnoverSimulation(
  zone: SiteOpportunityZone,
  options?: {
    actualRevenueZAR?: number | null;
    actualRevenueMonthLabel?: string | null;
    repTargetMonthlyZAR?: number;
  },
): TurnoverSimulation {
  const { potentialLowZAR, potentialHighZAR, captureTimeline } = zone;
  const actualMonthly = options?.actualRevenueZAR;
  const actualRevenueMonthLabel = options?.actualRevenueMonthLabel ?? null;
  const repTargetMonthlyZAR = options?.repTargetMonthlyZAR ?? 1_000_000;
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

  const actualLabel = actualRevenueMonthLabel
    ? `Actual ERP (${actualRevenueMonthLabel})`
    : 'Actual ERP (latest month)';

  const scenarios: TurnoverScenario[] = [
    {
      key: 'conservative',
      label: hasActual ? 'Conservative (pool low)' : 'Conservative',
      monthlyZAR: lowMonthly,
      annualZAR: lowMonthly * 12,
    },
    {
      key: 'expected',
      label: hasActual ? actualLabel : 'Expected',
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

  const repsRequired =
    repTargetMonthlyZAR > 0
      ? Math.ceil(simulatedMonthlyZAR / repTargetMonthlyZAR)
      : null;

  const productMix: ProductMixLine[] = PRODUCT_MIX_PCT.map(({ category, pct }) => ({
    category,
    pct,
    monthlyZAR: matureMidMonthlyZAR * (pct / 100),
  }));

  const month12Point = timelinePointAtMonth(captureTimeline, 12);
  const listSubtitleMonthlyZAR = month12Point?.revenueMidZAR ?? midMonthly;

  return {
    scenarios,
    milestones,
    productMix,
    matureMidMonthlyZAR,
    matureMidAnnualZAR: matureMidMonthlyZAR * 12,
    listSubtitleMonthlyZAR,
    simulatedMonthlyZAR,
    actualMonthlyZAR,
    actualRevenueMonthLabel,
    varianceZAR,
    variancePct,
    repsRequired,
    repTargetMonthlyZAR,
  };
}

/** Branch list / popup text: red when model exceeds actual ERP, green when at/above model. */
export function branchSimulationTextClass(
  simulation: Pick<TurnoverSimulation, 'actualMonthlyZAR' | 'simulatedMonthlyZAR'>,
): string {
  const actual = simulation.actualMonthlyZAR;
  const hasActual = actual != null && Number.isFinite(actual) && actual > 0;
  if (!hasActual) return 'text-foreground';
  return simulation.simulatedMonthlyZAR > actual
    ? 'text-red-600 font-semibold'
    : 'text-green-600 font-semibold';
}
