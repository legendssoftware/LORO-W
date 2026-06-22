import type { MapMarkerBase } from '@/api/types/map';
import type { DataQualitySummary, MapMarkerBuckets } from '@/api/types/site-opportunity';
import { isValidMapCoord, markerToPoint } from './geo';

export function splitMapMarkers(markers: MapMarkerBase[]): MapMarkerBuckets {
	const branches: MapMarkerBase[] = [];
	const competitors: MapMarkerBase[] = [];
	const clients: MapMarkerBase[] = [];

	for (const m of markers) {
		const mt = String(m.markerType ?? '');
		if (mt === 'branch') branches.push(m);
		else if (mt === 'competitor') competitors.push(m);
		else if (mt === 'client') clients.push(m);
	}

	return { branches, competitors, clients };
}

export function summarizeDataQuality(buckets: MapMarkerBuckets): DataQualitySummary {
	const countWithCoords = (list: MapMarkerBase[]) =>
		list.filter((m) => markerToPoint(m) != null).length;

	const competitorsWithCoords = countWithCoords(buckets.competitors);
	const clientsWithCoords = countWithCoords(buckets.clients);
	const branchesWithCoords = countWithCoords(buckets.branches);

	const pct = (n: number, total: number) =>
		total > 0 ? Math.round((n / total) * 100) : 100;

	return {
		totalCompetitors: buckets.competitors.length,
		competitorsWithCoords,
		totalClients: buckets.clients.length,
		clientsWithCoords,
		totalBranches: buckets.branches.length,
		branchesWithCoords,
		competitorCoveragePct: pct(competitorsWithCoords, buckets.competitors.length),
		clientCoveragePct: pct(clientsWithCoords, buckets.clients.length),
	};
}

/** Client demand weight — contract/hardware categories score higher when present. */
export function clientDemandWeight(marker: MapMarkerBase): number {
	const category = String(marker.category ?? marker.businessType ?? '').toLowerCase();
	const industry = String(marker.industry ?? '').toLowerCase();
	if (category.includes('hardware') || industry.includes('hardware')) return 1.5;
	if (category === '004' || category.includes('contract')) return 1.2;
	return 1;
}

export function geolocatedMarkers(
	markers: MapMarkerBase[],
): Array<MapMarkerBase & { lat: number; lng: number }> {
	return markers.flatMap((m) => {
		if (!isValidMapCoord(m.latitude, m.longitude)) return [];
		return [{ ...m, lat: Number(m.latitude), lng: Number(m.longitude) }];
	});
}
