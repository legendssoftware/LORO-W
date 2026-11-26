import type { AxiosInstance } from 'axios';
import type { SiteOpportunityMode, SiteOpportunityResult, SiteOpportunitySettings } from '@/api/types/site-opportunity';

export interface SiteOpportunityQuery {
  mode?: SiteOpportunityMode;
  radiusMeters?: number;
  topN?: number;
  minBranchSeparationKm?: number;
  captureLowPct?: number;
  captureHighPct?: number;
  startDate?: string;
  endDate?: string;
}

/** GET /reports/site-opportunities — one engine for the map and the server. */
export async function getSiteOpportunities(
  client: AxiosInstance,
  params: SiteOpportunityQuery = {}
): Promise<SiteOpportunityResult> {
  const { data } = await client.get<SiteOpportunityResult>('/reports/site-opportunities', {
    params: {
      mode: params.mode,
      radiusMeters: params.radiusMeters,
      topN: params.topN,
      minBranchSeparationKm: params.minBranchSeparationKm,
      captureLowPct: params.captureLowPct,
      captureHighPct: params.captureHighPct,
      startDate: params.startDate,
      endDate: params.endDate,
    },
    timeout: 60_000,
  });
  return data;
}

export type { SiteOpportunitySettings };
