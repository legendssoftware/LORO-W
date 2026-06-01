import type { MapMarkerBase } from '@/api/types/map';
import type { MapConfigType } from '@/api/types/map';
import { countByBrand, sumAddressablePool } from './brands';
import {
  clientDemandWeight,
  geolocatedMarkers,
  splitMapMarkers,
  summarizeDataQuality,
} from './data-quality';
import {
  haversineMeters,
  kmFromMeters,
  markerToPoint,
  nearestDistanceMeters,
  pointsInRadius,
} from './geo';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityMode,
  SiteOpportunityResult,
  SiteOpportunitySettings,
} from './types';
import { DEFAULT_SITE_OPPORTUNITY_SETTINGS } from './types';

export { DEFAULT_SITE_OPPORTUNITY_SETTINGS };

function branchDisplayName(marker: MapMarkerBase): string {
  const alias = typeof marker.alias === 'string' ? marker.alias.trim() : '';
  if (alias) return alias;
  return String(marker.name ?? marker.id ?? 'Branch');
}

function gridLabel(lat: number, lng: number): string {
  return `Area ${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
}

function computeCatchmentScore(
  pool: number,
  clientCount: number,
  competitorCount: number
): number {
  if (pool <= 0 && clientCount === 0) return 0;
  const demand = Math.log1p(clientCount) * 100_000;
  const supply = pool * 0.4;
  const density = Math.min(competitorCount, 20) * 50_000;
  return demand + supply + density;
}

function computeGreenfieldScore(
  clientDemand: number,
  pool: number,
  nearestBranchKm: number | null,
  minBranchSeparationKm: number
): number {
  let penalty = 0;
  if (nearestBranchKm != null && nearestBranchKm < minBranchSeparationKm) {
    penalty =
      ((minBranchSeparationKm - nearestBranchKm) / minBranchSeparationKm) *
      pool *
      0.5;
  }
  return clientDemand * 80_000 + pool * 0.35 - penalty;
}

export function computeBranchCatchments(
  branches: MapMarkerBase[],
  competitors: MapMarkerBase[],
  clients: MapMarkerBase[],
  settings: SiteOpportunitySettings,
  branchRevenueById?: Map<string, number>
): BranchCatchmentOpportunity[] {
  const geoCompetitors = geolocatedMarkers(competitors);
  const geoClients = geolocatedMarkers(clients);
  const totalCompetitors = competitors.length;

  const results: BranchCatchmentOpportunity[] = [];

  for (const branch of branches) {
    const center = markerToPoint(branch);
    if (!center) continue;

    const inRadiusCompetitors = pointsInRadius(center, geoCompetitors, settings.radiusMeters);
    const inRadiusClients = pointsInRadius(center, geoClients, settings.radiusMeters);
    const byBrand = countByBrand(inRadiusCompetitors);
    const addressablePoolZAR = sumAddressablePool(inRadiusCompetitors);
    const potentialLowZAR = addressablePoolZAR * settings.captureLowPct;
    const potentialHighZAR = addressablePoolZAR * settings.captureHighPct;
    const branchId = branch.id;
    const branchKey = String(branchId);
    const actualRevenueZAR = branchRevenueById?.get(branchKey) ?? null;

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
      opportunityScore: computeCatchmentScore(
        addressablePoolZAR,
        inRadiusClients.length,
        inRadiusCompetitors.length
      ),
      actualRevenueZAR,
      revenueGapZAR:
        actualRevenueZAR != null ? potentialHighZAR - actualRevenueZAR : null,
    });
  }

  return results
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .map((r, i) => ({ ...r, rank: i + 1 }));
}

interface GridCell {
  lat: number;
  lng: number;
  clientDemand: number;
  clientCount: number;
  competitors: MapMarkerBase[];
  competitorCount: number;
  pool: number;
  byBrand: ReturnType<typeof countByBrand>;
}

function buildGridBounds(
  markers: Array<{ lat: number; lng: number }>,
  mapConfig?: MapConfigType
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  if (markers.length > 0) {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;
    for (const m of markers) {
      minLat = Math.min(minLat, m.lat);
      maxLat = Math.max(maxLat, m.lat);
      minLng = Math.min(minLng, m.lng);
      maxLng = Math.max(maxLng, m.lng);
    }
    const pad = 0.05;
    return {
      minLat: minLat - pad,
      maxLat: maxLat + pad,
      minLng: minLng - pad,
      maxLng: maxLng + pad,
    };
  }

  const region = mapConfig?.orgRegions?.[0];
  if (region?.center) {
    const { lat, lng } = region.center;
    return {
      minLat: lat - 1.5,
      maxLat: lat + 1.5,
      minLng: lng - 1.5,
      maxLng: lng + 1.5,
    };
  }

  return { minLat: -35, maxLat: -22, minLng: 16, maxLng: 33 };
}

export function computeGreenfieldZones(
  branches: MapMarkerBase[],
  competitors: MapMarkerBase[],
  clients: MapMarkerBase[],
  settings: SiteOpportunitySettings,
  mapConfig?: MapConfigType
): GreenfieldOpportunityZone[] {
  const geoCompetitors = geolocatedMarkers(competitors);
  const geoClients = geolocatedMarkers(clients);
  const geoBranches = geolocatedMarkers(branches);
  const branchPoints = geoBranches.map((b) => ({ lat: b.lat, lng: b.lng }));
  const totalCompetitors = competitors.length;

  const allPoints = [
    ...geoClients.map((c) => ({ lat: c.lat, lng: c.lng })),
    ...geoCompetitors.map((c) => ({ lat: c.lat, lng: c.lng })),
    ...branchPoints,
  ];

  const bounds = buildGridBounds(allPoints, mapConfig);
  const step = 0.05;
  const cells: GridCell[] = [];

  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += step) {
    for (let lng = bounds.minLng; lng <= bounds.maxLng; lng += step) {
      const center = { lat, lng };
      const nearClients = pointsInRadius(center, geoClients, settings.radiusMeters);
      const nearCompetitors = pointsInRadius(
        center,
        geoCompetitors,
        settings.radiusMeters
      );
      if (nearClients.length === 0 && nearCompetitors.length === 0) continue;

      const clientDemand = nearClients.reduce(
        (s, c) => s + clientDemandWeight(c),
        0
      );
      const pool = sumAddressablePool(nearCompetitors);

      cells.push({
        lat,
        lng,
        clientDemand,
        clientCount: nearClients.length,
        competitors: nearCompetitors,
        competitorCount: nearCompetitors.length,
        pool,
        byBrand: countByBrand(nearCompetitors),
      });
    }
  }

  const minSepM = settings.minBranchSeparationKm * 1000;

  const scored = cells.map((cell) => {
    const center = { lat: cell.lat, lng: cell.lng };
    const nearestM = nearestDistanceMeters(center, branchPoints);
    const nearestBranchKm = kmFromMeters(nearestM);
    const whiteSpaceScore = computeGreenfieldScore(
      cell.clientDemand,
      cell.pool,
      nearestBranchKm,
      settings.minBranchSeparationKm
    );
    const potentialLowZAR = cell.pool * settings.captureLowPct;
    const potentialHighZAR = cell.pool * settings.captureHighPct;

    return {
      kind: 'greenfield' as const,
      id: `greenfield-${cell.lat.toFixed(3)}-${cell.lng.toFixed(3)}`,
      rank: 0,
      label: gridLabel(cell.lat, cell.lng),
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
      opportunityScore: whiteSpaceScore,
      clientDemandScore: cell.clientDemand,
      whiteSpaceScore,
      _nearestM: nearestM,
    };
  });

  const filtered = scored.filter((z) => {
    if (z.opportunityScore <= 0) return false;
    if (z._nearestM != null && z._nearestM < minSepM * 0.5) return false;
    return z.clientCount >= 1 || z.competitorCount >= 2;
  });

  return filtered
    .sort((a, b) => b.opportunityScore - a.opportunityScore)
    .slice(0, settings.topN)
    .map(({ _nearestM: _, ...z }, i) => ({ ...z, rank: i + 1 }));
}

export function computeSiteOpportunities(
  markers: MapMarkerBase[],
  options?: {
    mode?: SiteOpportunityMode;
    settings?: Partial<SiteOpportunitySettings>;
    mapConfig?: MapConfigType;
    branchRevenueById?: Map<string, number>;
  }
): SiteOpportunityResult {
  const settings: SiteOpportunitySettings = {
    ...DEFAULT_SITE_OPPORTUNITY_SETTINGS,
    ...options?.settings,
  };
  const mode = options?.mode ?? 'both';
  const buckets = splitMapMarkers(markers);
  const dataQuality = summarizeDataQuality(buckets);

  const catchments =
    mode === 'greenfield'
      ? []
      : computeBranchCatchments(
          buckets.branches,
          buckets.competitors,
          buckets.clients,
          settings,
          options?.branchRevenueById
        );

  const greenfield =
    mode === 'catchment'
      ? []
      : computeGreenfieldZones(
          buckets.branches,
          buckets.competitors,
          buckets.clients,
          settings,
          options?.mapConfig
        );

  return {
    catchments,
    greenfield,
    dataQuality,
    settings,
  };
}

/** Merge duplicate greenfield cells that are very close — keep highest score. */
export function dedupeNearbyGreenfield(
  zones: GreenfieldOpportunityZone[],
  minSepMeters = 8000
): GreenfieldOpportunityZone[] {
  const kept: GreenfieldOpportunityZone[] = [];
  for (const z of zones) {
    const tooClose = kept.some(
      (k) =>
        haversineMeters({ lat: k.lat, lng: k.lng }, { lat: z.lat, lng: z.lng }) <
        minSepMeters
    );
    if (!tooClose) kept.push(z);
  }
  return kept.map((z, i) => ({ ...z, rank: i + 1 }));
}
