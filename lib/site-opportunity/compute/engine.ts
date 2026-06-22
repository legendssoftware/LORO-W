import type { MapConfigType, MapMarkerBase } from '@/api/types/map';
import type {
	BranchCatchmentOpportunity,
	GreenfieldOpportunityZone,
	GeoPoint,
	SiteOpportunityMode,
	SiteOpportunityResult,
	SiteOpportunitySettings,
} from '@/api/types/site-opportunity';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from '@/api/types/site-opportunity';
import { countByBrand, sumAddressablePool } from './brands';
import {
	buildCaptureTimeline,
	monthsToTargetMid,
} from './capture-phases';
import {
	clientDemandWeight,
	geolocatedMarkers,
	splitMapMarkers,
	summarizeDataQuality,
} from './data-quality';
import {
	buildSpatialIndex,
	haversineMeters,
	kmFromMeters,
	markerToPoint,
	nearestDistanceMeters,
	pointsInRadiusIndexed,
	type SpatialPointIndex,
} from './geo';
import { buildSiteOpportunityWarnings } from './warnings';
import type { MapGeocodingSummary } from '@/api/types/site-opportunity';

export { DEFAULT_SITE_OPPORTUNITY_SETTINGS };

const SPATIAL_CELL_DEG = 0.05;
/** Competitors within this distance are grouped into one cluster. */
const CLUSTER_LINK_METERS = 3500;
const MIN_CLUSTER_MEMBERS = 2;
/** Grid steps for candidate sites within a competitor cluster bbox. */
const CANDIDATE_GRID_STEPS = 3;
/** Merge candidate points closer than this (meters). */
const CANDIDATE_DEDUPE_METERS = 250;

export interface GreenfieldGridStats {
	bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
	coarseStep: number;
	fineStep: number;
	estimatedCoarseCells: number;
	capped: boolean;
}

export type SiteOpportunityProgressFn = (message: string) => void;

type GeolocatedMapMarker = ReturnType<typeof geolocatedMarkers>[number];
type GeolocatedSpatialIndex = SpatialPointIndex<GeolocatedMapMarker>;

function branchDisplayName(marker: MapMarkerBase): string {
	const alias = typeof marker.alias === 'string' ? marker.alias.trim() : '';
	if (alias) return alias;
	return String(marker.name ?? marker.id ?? 'Branch');
}

function zoneCaptureFields(potentialLowZAR: number, potentialHighZAR: number) {
	const captureTimeline = buildCaptureTimeline(potentialLowZAR, potentialHighZAR);
	return {
		captureTimeline,
		monthsToTargetMid: monthsToTargetMid(potentialLowZAR, potentialHighZAR),
	};
}

function compareCatchments(
	a: BranchCatchmentOpportunity,
	b: BranchCatchmentOpportunity,
): number {
	const gapA = a.revenueGapZAR;
	const gapB = b.revenueGapZAR;
	if (gapA != null && gapB != null && gapA !== gapB) return gapB - gapA;
	if (gapA != null && gapB == null) return -1;
	if (gapA == null && gapB != null) return 1;
	return b.addressablePoolZAR - a.addressablePoolZAR;
}

function compareGreenfield(
	a: GreenfieldOpportunityZone,
	b: GreenfieldOpportunityZone,
): number {
	if (b.opportunityScore !== a.opportunityScore) {
		return b.opportunityScore - a.opportunityScore;
	}
	if (b.addressablePoolZAR !== a.addressablePoolZAR) {
		return b.addressablePoolZAR - a.addressablePoolZAR;
	}
	if (b.clientCount !== a.clientCount) return b.clientCount - a.clientCount;
	const kmA = a.nearestBranchKm ?? 0;
	const kmB = b.nearestBranchKm ?? 0;
	return kmB - kmA;
}

function dedupeCandidates(candidates: GeoPoint[], minSepMeters: number): GeoPoint[] {
	const kept: GeoPoint[] = [];
	for (const c of candidates) {
		const tooClose = kept.some(
			(k) => haversineMeters(k, c) < minSepMeters,
		);
		if (!tooClose) kept.push(c);
	}
	return kept;
}

/** Candidate sites: cluster members, centroid, and grid over bbox (not centroid-only). */
function generateClusterCandidates(members: GeolocatedMapMarker[]): GeoPoint[] {
	const candidates: GeoPoint[] = members.map((m) => ({ lat: m.lat, lng: m.lng }));
	candidates.push(clusterCentroid(members));

	const lats = members.map((m) => m.lat);
	const lngs = members.map((m) => m.lng);
	const minLat = Math.min(...lats);
	const maxLat = Math.max(...lats);
	const minLng = Math.min(...lngs);
	const maxLng = Math.max(...lngs);
	const latSpan = maxLat - minLat;
	const lngSpan = maxLng - minLng;

	for (let i = 0; i <= CANDIDATE_GRID_STEPS; i++) {
		for (let j = 0; j <= CANDIDATE_GRID_STEPS; j++) {
			candidates.push({
				lat: minLat + latSpan * (i / CANDIDATE_GRID_STEPS || 0),
				lng: minLng + lngSpan * (j / CANDIDATE_GRID_STEPS || 0),
			});
		}
	}

	return dedupeCandidates(candidates, CANDIDATE_DEDUPE_METERS);
}

function compositeGreenfieldScore(
	cell: ScoredCluster,
	nearestBranchKm: number | null,
	settings: SiteOpportunitySettings,
): number {
	const demandBoost = 1 + Math.min(0.35, cell.clientDemand * 0.05);
	const whitespace =
		nearestBranchKm != null
			? 0.65 +
				0.35 *
					Math.min(1.5, nearestBranchKm / settings.minBranchSeparationKm)
			: 1;
	return cell.pool * demandBoost * whitespace;
}

export function computeBranchCatchments(
	branches: MapMarkerBase[],
	competitors: MapMarkerBase[],
	clients: MapMarkerBase[],
	settings: SiteOpportunitySettings,
	branchRevenueById?: Map<string, number>,
): BranchCatchmentOpportunity[] {
	const geoCompetitors = geolocatedMarkers(competitors);
	const geoClients = geolocatedMarkers(clients);
	const totalCompetitors = competitors.length;
	const clientIndex = buildSpatialIndex(geoClients, SPATIAL_CELL_DEG);
	const competitorIndex = buildSpatialIndex(geoCompetitors, SPATIAL_CELL_DEG);

	const results: BranchCatchmentOpportunity[] = [];

	for (const branch of branches) {
		const center = markerToPoint(branch);
		if (!center) continue;

		const inRadiusCompetitors = pointsInRadiusIndexed(
			center,
			competitorIndex,
			settings.radiusMeters,
		);
		const inRadiusClients = pointsInRadiusIndexed(
			center,
			clientIndex,
			settings.radiusMeters,
		);
		const byBrand = countByBrand(inRadiusCompetitors);
		const addressablePoolZAR = sumAddressablePool(inRadiusCompetitors);
		const potentialLowZAR = addressablePoolZAR * settings.captureLowPct;
		const potentialHighZAR = addressablePoolZAR * settings.captureHighPct;
		const branchId = branch.id;
		const branchKey = String(branchId);
		const actualRevenueZAR = branchRevenueById?.get(branchKey) ?? null;
		const revenueGapZAR =
			actualRevenueZAR != null ? potentialHighZAR - actualRevenueZAR : null;

		results.push({
			kind: 'catchment',
			id: `catchment-${branchKey}`,
			rank: 0,
			branchId,
			branchName: branchDisplayName(branch),
			lat: center.lat,
			lng: center.lng,
			radiusMeters: settings.radiusMeters,
			clientCount: inRadiusClients.length,
			competitorCount: inRadiusCompetitors.length,
			competitorsMissingGeo: Math.max(0, totalCompetitors - geoCompetitors.length),
			byBrand,
			addressablePoolZAR,
			potentialLowZAR,
			potentialHighZAR,
			opportunityScore: revenueGapZAR ?? addressablePoolZAR,
			actualRevenueZAR,
			revenueGapZAR,
			...zoneCaptureFields(potentialLowZAR, potentialHighZAR),
		});
	}

	return results.sort(compareCatchments).map((r, i) => ({ ...r, rank: i + 1 }));
}

interface ScoredCluster {
	lat: number;
	lng: number;
	clientDemand: number;
	clientCount: number;
	competitorCount: number;
	clusterMemberCount: number;
	pool: number;
	byBrand: ReturnType<typeof countByBrand>;
}

function clusterCentroid(members: GeolocatedMapMarker[]): GeoPoint {
	const lat = members.reduce((s, m) => s + m.lat, 0) / members.length;
	const lng = members.reduce((s, m) => s + m.lng, 0) / members.length;
	return { lat, lng };
}

/** Group nearby competitors; only clusters with ≥2 members are returned. */
function clusterCompetitors(
	geoCompetitors: GeolocatedMapMarker[],
	linkMeters: number,
): GeolocatedMapMarker[][] {
	const n = geoCompetitors.length;
	if (n === 0) return [];

	const parent = Array.from({ length: n }, (_, i) => i);
	const indexByRef = new Map<GeolocatedMapMarker, number>();
	for (let i = 0; i < n; i++) {
		indexByRef.set(geoCompetitors[i]!, i);
	}

	function find(i: number): number {
		if (parent[i] !== i) parent[i] = find(parent[i]!);
		return parent[i]!;
	}

	function union(a: number, b: number): void {
		const ra = find(a);
		const rb = find(b);
		if (ra !== rb) parent[ra] = rb;
	}

	const competitorIndex = buildSpatialIndex(geoCompetitors, SPATIAL_CELL_DEG);
	for (let i = 0; i < n; i++) {
		const pi = geoCompetitors[i]!;
		const neighbors = pointsInRadiusIndexed(
			{ lat: pi.lat, lng: pi.lng },
			competitorIndex,
			linkMeters,
		);
		for (const neighbor of neighbors) {
			const j = indexByRef.get(neighbor);
			if (j == null || j <= i) continue;
			union(i, j);
		}
	}

	const groups = new Map<number, GeolocatedMapMarker[]>();
	for (let i = 0; i < n; i++) {
		const root = find(i);
		const list = groups.get(root) ?? [];
		list.push(geoCompetitors[i]!);
		groups.set(root, list);
	}

	return [...groups.values()].filter((g) => g.length >= MIN_CLUSTER_MEMBERS);
}

function scoreClusterCenter(
	center: GeoPoint,
	clusterMemberCount: number,
	geoClients: GeolocatedMapMarker[],
	clientIndex: GeolocatedSpatialIndex,
	competitorIndex: GeolocatedSpatialIndex,
	settings: SiteOpportunitySettings,
): ScoredCluster | null {
	const nearClients = pointsInRadiusIndexed(center, clientIndex, settings.radiusMeters);
	const nearCompetitors = pointsInRadiusIndexed(
		center,
		competitorIndex,
		settings.radiusMeters,
	);
	if (nearCompetitors.length < MIN_CLUSTER_MEMBERS) return null;

	return {
		lat: center.lat,
		lng: center.lng,
		clientDemand: nearClients.reduce((s, c) => s + clientDemandWeight(c), 0),
		clientCount: nearClients.length,
		competitorCount: nearCompetitors.length,
		clusterMemberCount,
		pool: sumAddressablePool(nearCompetitors),
		byBrand: countByBrand(nearCompetitors),
	};
}

export function estimateGreenfieldGridStats(
	competitorCount: number,
	mapConfig?: MapConfigType,
): GreenfieldGridStats {
	const orgRegion = mapConfig?.orgRegions?.[0];
	const center = mapConfig?.defaultCenter ?? orgRegion?.center;
	const bounds = center
		? {
				minLat: center.lat - 1,
				maxLat: center.lat + 1,
				minLng: center.lng - 1,
				maxLng: center.lng + 1,
			}
		: { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };

	return {
		bounds,
		coarseStep: 0,
		fineStep: 0,
		estimatedCoarseCells: Math.max(0, Math.floor(competitorCount / MIN_CLUSTER_MEMBERS)),
		capped: false,
	};
}

export function computeGreenfieldZones(
	branches: MapMarkerBase[],
	competitors: MapMarkerBase[],
	clients: MapMarkerBase[],
	settings: SiteOpportunitySettings,
	_mapConfig?: MapConfigType,
	onProgress?: SiteOpportunityProgressFn,
): GreenfieldOpportunityZone[] {
	const geoCompetitors = geolocatedMarkers(competitors);
	const geoClients = geolocatedMarkers(clients);
	const geoBranches = geolocatedMarkers(branches);
	const branchPoints = geoBranches.map((b) => ({ lat: b.lat, lng: b.lng }));
	const totalCompetitors = competitors.length;
	const clientIndex = buildSpatialIndex(geoClients, SPATIAL_CELL_DEG);
	const competitorIndex = buildSpatialIndex(geoCompetitors, SPATIAL_CELL_DEG);

	const clusters = clusterCompetitors(geoCompetitors, CLUSTER_LINK_METERS);
	if (onProgress) {
		onProgress(
			`Greenfield: ${clusters.length} competitor clusters from ${geoCompetitors.length} geolocated stores`,
		);
	}

	const minSepM = settings.minBranchSeparationKm * 1000;
	const scored: Array<
		GreenfieldOpportunityZone & { _nearestM: number | null }
	> = [];

	for (const members of clusters) {
		const candidates = generateClusterCandidates(members);
		let best:
			| {
					cell: ScoredCluster;
					nearestM: number | null;
					nearestBranchKm: number | null;
					score: number;
			  }
			| null = null;

		for (const center of candidates) {
			const cell = scoreClusterCenter(
				center,
				members.length,
				geoClients,
				clientIndex,
				competitorIndex,
				settings,
			);
			if (!cell || cell.pool <= 0) continue;

			const nearestM = nearestDistanceMeters(center, branchPoints);
			const nearestBranchKm = kmFromMeters(nearestM);
			if (nearestM != null && nearestM < minSepM * 0.5) continue;
			if (
				nearestBranchKm != null &&
				nearestBranchKm < settings.minBranchSeparationKm
			) {
				continue;
			}

			const score = compositeGreenfieldScore(cell, nearestBranchKm, settings);
			if (!best || score > best.score) {
				best = { cell, nearestM, nearestBranchKm, score };
			}
		}

		if (!best) continue;

		const { cell, nearestM, nearestBranchKm, score } = best;
		const potentialLowZAR = cell.pool * settings.captureLowPct;
		const potentialHighZAR = cell.pool * settings.captureHighPct;

		scored.push({
			kind: 'greenfield',
			id: `greenfield-${cell.lat.toFixed(3)}-${cell.lng.toFixed(3)}`,
			rank: 0,
			label: '',
			address: null,
			lat: cell.lat,
			lng: cell.lng,
			radiusMeters: settings.radiusMeters,
			clientCount: cell.clientCount,
			competitorCount: cell.competitorCount,
			competitorsMissingGeo: Math.max(0, totalCompetitors - geoCompetitors.length),
			byBrand: cell.byBrand,
			addressablePoolZAR: cell.pool,
			potentialLowZAR,
			potentialHighZAR,
			nearestBranchKm,
			opportunityScore: score,
			clientDemandScore: cell.clientDemand,
			whiteSpaceScore:
				nearestBranchKm != null
					? cell.pool *
						Math.min(1.5, nearestBranchKm / settings.minBranchSeparationKm)
					: cell.pool,
			_nearestM: nearestM,
			...zoneCaptureFields(potentialLowZAR, potentialHighZAR),
		});
	}

	return scored
		.sort(compareGreenfield)
		.slice(0, settings.topN)
		.map(({ _nearestM: _, ...z }, i) => ({
			...z,
			rank: i + 1,
			label: `Location ${i + 1}`,
		}));
}

export function computeSiteOpportunities(
	markers: MapMarkerBase[],
	options?: {
		mode?: SiteOpportunityMode;
		settings?: Partial<SiteOpportunitySettings>;
		mapConfig?: MapConfigType;
		branchRevenueById?: Map<string, number>;
		geocodingSummary?: MapGeocodingSummary | null;
		onProgress?: SiteOpportunityProgressFn;
	},
): SiteOpportunityResult {
	const settings: SiteOpportunitySettings = {
		...DEFAULT_SITE_OPPORTUNITY_SETTINGS,
		...options?.settings,
	};
	const mode = options?.mode ?? 'both';
	const buckets = splitMapMarkers(markers);
	const dataQuality = summarizeDataQuality(buckets);
	const warnings = buildSiteOpportunityWarnings(
		dataQuality,
		options?.geocodingSummary,
	);

	const catchments =
		mode === 'greenfield'
			? []
			: computeBranchCatchments(
					buckets.branches,
					buckets.competitors,
					buckets.clients,
					settings,
					options?.branchRevenueById,
				);

	const greenfield =
		mode === 'catchment'
			? []
			: computeGreenfieldZones(
					buckets.branches,
					buckets.competitors,
					buckets.clients,
					settings,
					options?.mapConfig,
					options?.onProgress,
				);

	return {
		catchments,
		greenfield,
		dataQuality,
		settings,
		warnings,
		geocodingSummary: options?.geocodingSummary ?? null,
	};
}

/** Merge duplicate greenfield cells that are very close — keep highest addressable pool. */
export function dedupeNearbyGreenfield(
	zones: GreenfieldOpportunityZone[],
	minSepMeters = 8000,
): GreenfieldOpportunityZone[] {
	const sorted = [...zones].sort(compareGreenfield);
	const kept: GreenfieldOpportunityZone[] = [];
	for (const z of sorted) {
		const closeIdx = kept.findIndex(
			(k) =>
				haversineMeters({ lat: k.lat, lng: k.lng }, { lat: z.lat, lng: z.lng }) <
				minSepMeters,
		);
		if (closeIdx < 0) {
			kept.push(z);
			continue;
		}
		if (z.addressablePoolZAR > kept[closeIdx]!.addressablePoolZAR) {
			kept[closeIdx] = z;
		}
	}
	return kept.map((zone, i) => ({ ...zone, rank: i + 1 }));
}
