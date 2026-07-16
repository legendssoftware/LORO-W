export type HardwareBrandKey =
  | 'BUCO'
  | 'CASHBUILD'
  | 'BUILD IT'
  | 'POWERBUILD'
  | 'EST'
  | 'P&L HARDWARE'
  | 'OTHER';

export type SiteOpportunityMode = 'greenfield' | 'catchment' | 'both';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapMarkerBuckets {
  branches: import('@/api/types/map').MapMarkerBase[];
  competitors: import('@/api/types/map').MapMarkerBase[];
  clients: import('@/api/types/map').MapMarkerBase[];
}

export interface SiteOpportunitySettings {
  radiusMeters: number;
  topN: number;
  minBranchSeparationKm: number;
  captureLowPct: number;
  captureHighPct: number;
}

export const DEFAULT_SITE_OPPORTUNITY_SETTINGS: SiteOpportunitySettings = {
  radiusMeters: 5000,
  topN: 5,
  minBranchSeparationKm: 10,
  captureLowPct: 0.2,
  captureHighPct: 0.2,
};

export interface BrandCount {
  brand: HardwareBrandKey;
  count: number;
  turnoverZAR: number;
}

export interface DataQualitySummary {
  totalCompetitors: number;
  competitorsWithCoords: number;
  totalClients: number;
  clientsWithCoords: number;
  totalBranches: number;
  branchesWithCoords: number;
  competitorCoveragePct: number;
  clientCoveragePct: number;
}

export interface BranchCatchmentOpportunity {
  kind: 'catchment';
  id: string;
  rank: number;
  branchId: string | number;
  branchName: string;
  /** Branch postal address or reverse-geocoded centroid. */
  address: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  clientCount: number;
  competitorCount: number;
  competitorsMissingGeo: number;
  byBrand: BrandCount[];
  addressablePoolZAR: number;
  potentialLowZAR: number;
  potentialHighZAR: number;
  opportunityScore: number;
  actualRevenueZAR?: number | null;
  revenueGapZAR?: number | null;
  captureTimeline: CaptureTimelinePoint[];
  monthsToTargetMid: number | null;
}

export interface GreenfieldOpportunityZone {
  kind: 'greenfield';
  id: string;
  rank: number;
  label: string;
  /** Google reverse-geocoded street address for the cluster centroid. */
  address: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  clientCount: number;
  competitorCount: number;
  competitorsMissingGeo: number;
  byBrand: BrandCount[];
  addressablePoolZAR: number;
  potentialLowZAR: number;
  potentialHighZAR: number;
  nearestBranchKm: number | null;
  opportunityScore: number;
  clientDemandScore: number;
  whiteSpaceScore: number;
  captureTimeline: CaptureTimelinePoint[];
  monthsToTargetMid: number | null;
}

export interface MapGeocodingSummary {
  clients?: Record<string, number>;
  competitors?: Record<string, number>;
  branches?: Record<string, number>;
}

export type SiteOpportunityZone =
  | BranchCatchmentOpportunity
  | GreenfieldOpportunityZone;

export interface SiteOpportunityResult {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  dataQuality: DataQualitySummary;
  settings: SiteOpportunitySettings;
  warnings: string[];
  geocodingSummary?: MapGeocodingSummary | null;
}

export interface CapturePhasePoint {
  phase: string;
  monthStart: number;
  monthEnd: number;
  captureLowPct: number;
  captureHighPct: number;
  captureMidPct: number;
}

export interface CaptureTimelinePoint {
  month: number;
  revenueLowZAR: number;
  revenueMidZAR: number;
  revenueHighZAR: number;
  captureMidPct: number;
}
