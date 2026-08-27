import type { MapMarkerBase } from '@/api/types/map';
import type { SiteOpportunitySettings } from '@/api/types/site-opportunity';

export interface FloorSizeCapacityCapResult {
	potentialLowZAR: number;
	potentialHighZAR: number;
	floorSizeSqm: number | null;
	capacityCeilingZAR: number | null;
}

function parseFloorSizeSqm(marker: MapMarkerBase): number | null {
	const raw = marker.floorSizeSqm;
	if (raw == null) return null;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) return null;
	return n;
}

/** Cap catchment potential by branch retail floor capacity (sqm × revenue rate). */
export function applyFloorSizeCapacityCap(
	marker: MapMarkerBase,
	marketPotentialLowZAR: number,
	marketPotentialHighZAR: number,
	settings: SiteOpportunitySettings,
): FloorSizeCapacityCapResult {
	const floorSizeSqm = parseFloorSizeSqm(marker);
	const rate = settings.revenuePerSqmMonthlyZAR;

	if (floorSizeSqm == null || rate == null || !Number.isFinite(rate) || rate <= 0) {
		return {
			potentialLowZAR: marketPotentialLowZAR,
			potentialHighZAR: marketPotentialHighZAR,
			floorSizeSqm: null,
			capacityCeilingZAR: null,
		};
	}

	const capacityCeilingZAR = floorSizeSqm * rate;

	return {
		potentialLowZAR: Math.min(marketPotentialLowZAR, capacityCeilingZAR),
		potentialHighZAR: Math.min(marketPotentialHighZAR, capacityCeilingZAR),
		floorSizeSqm,
		capacityCeilingZAR,
	};
}
