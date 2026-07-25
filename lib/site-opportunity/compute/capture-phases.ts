import type {
	CapturePhasePoint,
	CaptureTimelinePoint,
} from '@/api/types/site-opportunity';

export type { CapturePhasePoint };

/**
 * BitDrywall maturity curve — progress toward mature potential (pool × 15–30%).
 * Phase % of potential maps to consultant market-share bands (Start-up 2–4% → Leader 15–20%).
 */
export const MARKET_CAPTURE_PHASES: CapturePhasePoint[] = [
	{
		phase: 'Start-up',
		monthStart: 0,
		monthEnd: 6,
		captureLowPct: 0.13,
		captureHighPct: 0.27,
		captureMidPct: 0.2,
	},
	{
		phase: 'Growth',
		monthStart: 6,
		monthEnd: 13,
		captureLowPct: 0.4,
		captureHighPct: 0.67,
		captureMidPct: 0.53,
	},
	{
		phase: 'Expansion',
		monthStart: 13,
		monthEnd: 19,
		captureLowPct: 0.67,
		captureHighPct: 0.87,
		captureMidPct: 0.77,
	},
	{
		phase: 'Mature',
		monthStart: 19,
		monthEnd: 25,
		captureLowPct: 0.87,
		captureHighPct: 1,
		captureMidPct: 0.93,
	},
	{
		phase: 'Market Leader',
		monthStart: 25,
		monthEnd: 37,
		captureLowPct: 1,
		captureHighPct: 1.33,
		captureMidPct: 1.17,
	},
];

/** Mature market share of local pool by competitive intensity. */
export function matureShareByCompetition(competitorCount: number): {
	label: string;
	lowPct: number;
	highPct: number;
} {
	if (competitorCount >= 5) {
		return { label: 'Highly competitive', lowPct: 0.1, highPct: 0.12 };
	}
	if (competitorCount >= 3) {
		return { label: 'Normal market', lowPct: 0.13, highPct: 0.15 };
	}
	if (competitorCount >= 1) {
		return { label: 'Weak competition', lowPct: 0.16, highPct: 0.18 };
	}
	return { label: 'Dominant specialist opportunity', lowPct: 0.18, highPct: 0.22 };
}

function captureBandAtMonth(month: number): {
	low: number;
	mid: number;
	high: number;
} {
	for (const p of MARKET_CAPTURE_PHASES) {
		if (month >= p.monthStart && month < p.monthEnd) {
			return {
				low: p.captureLowPct,
				mid: p.captureMidPct,
				high: p.captureHighPct,
			};
		}
	}
	const last = MARKET_CAPTURE_PHASES[MARKET_CAPTURE_PHASES.length - 1];
	return {
		low: last?.captureLowPct ?? 1,
		mid: last?.captureMidPct ?? 1.17,
		high: last?.captureHighPct ?? 1.33,
	};
}

/** Projected revenue curve from potential band and maturity phases. */
export function buildCaptureTimeline(
	potentialLowZAR: number,
	potentialHighZAR: number,
	maxMonths = 36,
): CaptureTimelinePoint[] {
	const potentialMidZAR = (potentialLowZAR + potentialHighZAR) / 2;
	const points: CaptureTimelinePoint[] = [];
	for (let month = 0; month <= maxMonths; month += 3) {
		const band = captureBandAtMonth(month);
		points.push({
			month,
			captureMidPct: band.mid,
			revenueLowZAR: potentialLowZAR * band.low,
			revenueMidZAR: potentialMidZAR * band.mid,
			revenueHighZAR: potentialHighZAR * band.high,
		});
	}
	return points;
}

/** First month when mid-scenario revenue reaches mature mid potential (~93%). */
export function monthsToTargetMid(
	potentialLowZAR: number,
	potentialHighZAR: number,
	targetFraction = 0.93,
): number | null {
	const potentialMidZAR = (potentialLowZAR + potentialHighZAR) / 2;
	const target = potentialMidZAR * targetFraction;
	const timeline = buildCaptureTimeline(potentialLowZAR, potentialHighZAR);
	for (const point of timeline) {
		if (point.revenueMidZAR >= target) return point.month;
	}
	return null;
}
