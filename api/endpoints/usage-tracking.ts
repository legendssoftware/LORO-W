import type { AxiosInstance } from 'axios';

export interface UsageAnalyticsResponse {
  message?: string;
  data?: {
    overview?: { totalRequests: number; errorRate: number };
    trends?: Array<{ date: string; requests: number }>;
    topEndpoints?: Array<{ endpoint: string; requests: number }>;
    licenseUsage?: { totalQuotaConsumed: number; featureBreakdown?: Record<string, number> };
  };
}

export interface UsageSummariesResponse {
  message?: string;
  data?: Array<{
    endpoint?: string;
    totalRequests?: number;
    periodStart?: string;
  }>;
}

export interface LicenseUsageResponse {
  message?: string;
  data?: {
    organisationId: number;
    organisationRef: string;
    totalRequests: number;
    errorRate: number;
    licenseUsage?: { totalQuotaConsumed: number; featureBreakdown?: Record<string, number> };
    period?: { startDate: string; endDate: string };
  };
}

export async function getUsageAnalytics(
  client: AxiosInstance,
  startDate: string,
  endDate: string
): Promise<UsageAnalyticsResponse> {
  const { data } = await client.get<UsageAnalyticsResponse>('/usage-tracking/analytics', {
    params: { startDate, endDate },
  });
  return data ?? {};
}

export async function getUsageSummaries(
  client: AxiosInstance,
  startDate: string,
  endDate: string
): Promise<UsageSummariesResponse> {
  const { data } = await client.get<UsageSummariesResponse>('/usage-tracking/summaries', {
    params: { period: 'daily', startDate, endDate },
  });
  return data ?? {};
}

export async function getLicenseUsage(
  client: AxiosInstance,
  orgId: number | string,
  startDate: string,
  endDate: string
): Promise<LicenseUsageResponse> {
  const { data } = await client.get<LicenseUsageResponse>(
    `/usage-tracking/license-usage/${encodeURIComponent(String(orgId))}`,
    { params: { startDate, endDate } }
  );
  return data ?? {};
}
