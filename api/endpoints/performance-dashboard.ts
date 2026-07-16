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

/** One month row from GET /reports/performance/store-monthly-ytd */
export interface StoreMonthlyYtdMonthRow {
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  salesPerStore: Array<Record<string, unknown>>;
}

export interface StoreMonthlyYtdResponse {
  months: StoreMonthlyYtdMonthRow[];
}

export interface GetStoreMonthlyYtdParams {
  chartStoreId?: string;
  organisationId?: string;
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

/**
 * GET /reports/performance/store-monthly-ytd — YTD monthly sales per store.
 */
export async function getStoreMonthlyYtd(
  client: AxiosInstance,
  params?: GetStoreMonthlyYtdParams
): Promise<StoreMonthlyYtdResponse> {
  const search = new URLSearchParams();
  if (params?.chartStoreId) search.set('chartStoreId', params.chartStoreId);
  if (params?.organisationId) search.set('organisationId', params.organisationId);
  const qs = search.toString();
  const { data } = await client.get<StoreMonthlyYtdResponse>(
    `/reports/performance/store-monthly-ytd${qs ? `?${qs}` : ''}`
  );
  return data;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface BranchMonthlySalesPoint {
  month: string;
  monthIndex: number;
  year: number;
  totalRevenue: number;
}

/** Sum totalRevenue from salesPerStore rows for one month. */
export function aggregateStoreMonthlyRevenue(
  salesPerStore: Array<Record<string, unknown>>
): number {
  let total = 0;
  for (const row of salesPerStore) {
    const revenue = Number(row.totalRevenue);
    if (Number.isFinite(revenue)) total += revenue;
  }
  return total;
}

export function normalizeStoreMonthlyYtd(
  response: StoreMonthlyYtdResponse
): BranchMonthlySalesPoint[] {
  if (!Array.isArray(response.months)) return [];
  return response.months.map((row) => ({
    month: MONTH_NAMES[row.month] ?? `M${row.month + 1}`,
    monthIndex: row.month,
    year: row.year,
    totalRevenue: aggregateStoreMonthlyRevenue(row.salesPerStore ?? []),
  }));
}
