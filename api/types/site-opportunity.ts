/**
 * Site opportunity / visualiser types (client-side).
 * Server DTOs will be reintroduced when the reports API is rebuilt.
 */

export type HardwareBrandKey =
  | 'BUCO'
  | 'CASHBUILD'
  | 'BUILD IT'
  | 'BUILDERS'
  | 'POWERBUILD'
  | 'EST'
  | 'P&L HARDWARE'
  | 'OTHER';

export type SiteOpportunityMode = 'greenfield' | 'catchment' | 'both';

export interface GeoPoint {
  lat: number;
  lng: number;
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

export type CompetitorCategoryKey = 'retailer' | 'sd';

export interface CategoryCount {
  category: CompetitorCategoryKey;
  count: number;
  turnoverZAR: number;
}

export interface CaptureTimelinePoint {
  month: number;
  captureMidPct: number;
  revenueLowZAR: number;
  revenueMidZAR: number;
  revenueHighZAR: number;
}

export interface MapGeocodingSummary {
  clients?: Record<string, number>;
  competitors?: Record<string, number>;
  branches?: Record<string, number>;
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
  address: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  clientCount: number;
  competitorCount: number;
  competitorsMissingGeo: number;
  byBrand: BrandCount[];
  byCategory?: CategoryCount[];
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
  address: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  clientCount: number;
  competitorCount: number;
  competitorsMissingGeo: number;
  byBrand: BrandCount[];
  byCategory?: CategoryCount[];
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

export type SiteOpportunityZone = BranchCatchmentOpportunity | GreenfieldOpportunityZone;

export interface SiteOpportunityResult {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  dataQuality: DataQualitySummary;
  settings: SiteOpportunitySettings;
  warnings: string[];
  geocodingSummary?: MapGeocodingSummary | null;
}

export interface MapMarkerBuckets {
  branches: import('./map').MapMarkerBase[];
  competitors: import('./map').MapMarkerBase[];
  clients: import('./map').MapMarkerBase[];
}

export interface CapturePhasePoint {
  month: number;
  capturePct: number;
}

export interface TurnoverOverrideSettings {
  competitorTurnoverMultiplier?: number;
  branchTurnoverMultiplier?: number;
}
