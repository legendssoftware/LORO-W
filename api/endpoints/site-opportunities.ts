import type { AxiosInstance } from 'axios';
import type {
  SiteOpportunityMode,
  SiteOpportunityResult,
  SiteOpportunitySettings,
} from '@/api/types/site-opportunity';

export interface GetSiteOpportunitiesParams {
  orgId?: number;
  branchId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
  region?: string;
  businessType?: string;
  mode?: SiteOpportunityMode;
  settings?: Partial<SiteOpportunitySettings>;
}

function isSiteOpportunityResult(value: unknown): value is SiteOpportunityResult {
  return (
    typeof value === 'object' &&
    value != null &&
    'catchments' in value &&
    'greenfield' in value &&
    'dataQuality' in value &&
    'warnings' in value
  );
}

/**
 * GET /reports/site-opportunities — server-computed suggested areas for map visualiser.
 */
export async function getSiteOpportunities(
  client: AxiosInstance,
  params?: GetSiteOpportunitiesParams
): Promise<SiteOpportunityResult> {
  const search = new URLSearchParams();
  if (params?.orgId != null) search.set('orgId', String(params.orgId));
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  if (params?.userId != null) search.set('userId', String(params.userId));
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.allTime === true) search.set('allTime', 'true');
  if (params?.region) search.set('region', params.region);
  if (params?.businessType) search.set('businessType', params.businessType);
  if (params?.mode) search.set('mode', params.mode);
  if (params?.settings?.radiusMeters != null) {
    search.set('radiusMeters', String(params.settings.radiusMeters));
  }
  if (params?.settings?.topN != null) {
    search.set('topN', String(params.settings.topN));
  }
  if (params?.settings?.minBranchSeparationKm != null) {
    search.set('minBranchSeparationKm', String(params.settings.minBranchSeparationKm));
  }
  if (params?.settings?.captureLowPct != null) {
    search.set('captureLowPct', String(params.settings.captureLowPct));
  }
  if (params?.settings?.captureHighPct != null) {
    search.set('captureHighPct', String(params.settings.captureHighPct));
  }
  const qs = search.toString();
  const { data } = await client.get<
    SiteOpportunityResult | { data: SiteOpportunityResult }
  >(`/reports/site-opportunities${qs ? `?${qs}` : ''}`);
  if (isSiteOpportunityResult(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isSiteOpportunityResult((data as { data: SiteOpportunityResult }).data)
  ) {
    return (data as { data: SiteOpportunityResult }).data;
  }
  throw new Error('Invalid site opportunities response');
}
