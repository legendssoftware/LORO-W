import type { AxiosInstance } from 'axios';

export interface BranchPerformanceRow {
  store: string;
  totalRevenue?: number;
  transactionCount?: number;
  label?: string;
}

export interface PerformanceDashboardCharts {
  branchPerformance?: {
    data?: BranchPerformanceRow[];
  };
}

export interface PerformanceDashboardResponse {
  summary?: {
    totalRevenue?: number;
  };
  charts?: PerformanceDashboardCharts;
}

export interface GetPerformanceDashboardParams {
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
}

/**
 * GET /reports/performance/dashboard — branch-level revenue for ERP compare.
 */
export async function getPerformanceDashboard(
  client: AxiosInstance,
  params?: GetPerformanceDashboardParams
): Promise<PerformanceDashboardResponse> {
  const search = new URLSearchParams();
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.allTime) search.set('allTime', 'true');
  const qs = search.toString();
  const { data } = await client.get<PerformanceDashboardResponse>(
    `/reports/performance/dashboard${qs ? `?${qs}` : ''}`
  );
  return data;
}
