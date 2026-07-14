import type { AxiosInstance } from 'axios';
import type {
  DataQualitySummary,
  SiteOpportunityMode,
  SiteOpportunityResult,
  SiteOpportunitySettings,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import { debugApi } from '@/lib/api-debug';

export interface GetSiteOpportunitiesParams {
  orgId?: number;
  branchId?: number;
  userId?: number;
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
  region?: string;
  country?: string;
  province?: string;
  businessType?: string;
  mode?: SiteOpportunityMode;
  settings?: Partial<SiteOpportunitySettings>;
}

export interface SiteOpportunityBrief {
  summary: string;
  strengths: string[];
  risks: string[];
  recommendation: 'strong' | 'moderate' | 'weak';
  suggestedNextSteps: string[];
  estimatedRampMonths: number;
}

export interface SiteOpportunityBriefPayload {
  mode?: string;
  zone: SiteOpportunityZone;
  dataQuality?: DataQualitySummary;
  warnings?: string[];
  orgBrandName?: string;
}

/** Server-side geo engine can exceed the default 20s axios timeout. */
export const SITE_OPPORTUNITIES_LONG_TIMEOUT_MS = 120_000;

export type GetSiteOpportunitiesOptions = {
  signal?: AbortSignal;
};

function appendMapScopeParams(
  search: URLSearchParams,
  params?: Pick<
    GetSiteOpportunitiesParams,
    'orgId' | 'branchId' | 'userId' | 'startDate' | 'endDate' | 'allTime'
  >
): void {
  if (params?.orgId != null) search.set('orgId', String(params.orgId));
  if (params?.branchId != null) search.set('branchId', String(params.branchId));
  if (params?.userId != null) search.set('userId', String(params.userId));
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.allTime === true) search.set('allTime', 'true');
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
  params?: GetSiteOpportunitiesParams,
  options?: GetSiteOpportunitiesOptions
): Promise<SiteOpportunityResult> {
  const search = new URLSearchParams();
  appendMapScopeParams(search, params);
  if (params?.country) search.set('country', params.country);
  if (params?.province) search.set('province', params.province);
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
  const path = `/reports/site-opportunities${qs ? `?${qs}` : ''}`;
  const startedAt = Date.now();
  debugApi('site-opportunities:start', {
    path,
    mode: params?.mode ?? null,
    allTime: params?.allTime ?? null,
    country: params?.country ?? null,
    province: params?.province ?? null,
    region: params?.region ?? null,
    businessType: params?.businessType ?? null,
  });

  try {
    const { data } = await client.get<
      SiteOpportunityResult | { data: SiteOpportunityResult }
    >(path, {
      timeout: SITE_OPPORTUNITIES_LONG_TIMEOUT_MS,
      signal: options?.signal,
    });

    let result: SiteOpportunityResult;
    if (isSiteOpportunityResult(data)) {
      result = data;
    } else if (
      data &&
      typeof data === 'object' &&
      'data' in data &&
      isSiteOpportunityResult((data as { data: SiteOpportunityResult }).data)
    ) {
      result = (data as { data: SiteOpportunityResult }).data;
    } else {
      throw new Error('Invalid site opportunities response');
    }

    debugApi('site-opportunities:ok', {
      durationMs: Date.now() - startedAt,
      catchments: result.catchments.length,
      greenfield: result.greenfield.length,
      warnings: result.warnings.length,
    });
    return result;
  } catch (err) {
    debugApi('site-opportunities:error', {
      durationMs: Date.now() - startedAt,
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

/** GET /reports/site-opportunities/branch-revenue — ERP revenue by branch id for client-side compute. */
export async function getSiteOpportunityBranchRevenue(
  client: AxiosInstance,
  params?: Pick<
    GetSiteOpportunitiesParams,
    'orgId' | 'branchId' | 'userId' | 'startDate' | 'endDate' | 'allTime'
  >,
  options?: GetSiteOpportunitiesOptions
): Promise<Record<string, number>> {
  const search = new URLSearchParams();
  appendMapScopeParams(search, params);
  const qs = search.toString();
  const { data } = await client.get<
    Record<string, number> | { branchRevenueById: Record<string, number> }
  >(`/reports/site-opportunities/branch-revenue${qs ? `?${qs}` : ''}`, {
    timeout: SITE_OPPORTUNITIES_LONG_TIMEOUT_MS,
    signal: options?.signal,
  });
  if (data && typeof data === 'object' && 'branchRevenueById' in data) {
    return (data as { branchRevenueById: Record<string, number> }).branchRevenueById;
  }
  return (data ?? {}) as Record<string, number>;
}

/** GET /reports/site-opportunities/reverse-geocode — lazy address for a greenfield pin. */
export async function reverseGeocodeSiteOpportunity(
  client: AxiosInstance,
  lat: number,
  lng: number,
  options?: GetSiteOpportunitiesOptions
): Promise<string | null> {
  const search = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
  });
  const { data } = await client.get<
    string | { address: string | null }
  >(`/reports/site-opportunities/reverse-geocode?${search.toString()}`, {
    signal: options?.signal,
  });
  if (typeof data === 'string') return data;
  if (data && typeof data === 'object' && 'address' in data) {
    return (data as { address: string | null }).address;
  }
  return null;
}

/** POST /reports/site-opportunities/brief — Gemini narrative for a zone. */
export async function postSiteOpportunityBrief(
  client: AxiosInstance,
  payload: SiteOpportunityBriefPayload,
  options?: GetSiteOpportunitiesOptions
): Promise<SiteOpportunityBrief> {
  const { data } = await client.post<SiteOpportunityBrief>(
    '/reports/site-opportunities/brief',
    payload,
    { signal: options?.signal, timeout: 60_000 }
  );
  return data;
}
