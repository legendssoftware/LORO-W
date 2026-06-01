import type { MapMarkerBase } from '@/api/types/map';

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

export interface SiteOpportunitySettings {
  radiusMeters: number;
  topN: number;
  minBranchSeparationKm: number;
  captureLowPct: number;
  captureHighPct: number;
}

export const DEFAULT_SITE_OPPORTUNITY_SETTINGS: SiteOpportunitySettings = {
  radiusMeters: 5000,
  topN: 10,
  minBranchSeparationKm: 10,
  captureLowPct: 0.15,
  captureHighPct: 0.3,
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
  /** When ERP branch revenue is available */
  actualRevenueZAR?: number | null;
  revenueGapZAR?: number | null;
}

export interface GreenfieldOpportunityZone {
  kind: 'greenfield';
  id: string;
  rank: number;
  label: string;
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
}

export type SiteOpportunityZone =
  | BranchCatchmentOpportunity
  | GreenfieldOpportunityZone;

export interface SiteOpportunityResult {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  dataQuality: DataQualitySummary;
  settings: SiteOpportunitySettings;
}

export interface MapMarkerBuckets {
  branches: MapMarkerBase[];
  competitors: MapMarkerBase[];
  clients: MapMarkerBase[];
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
