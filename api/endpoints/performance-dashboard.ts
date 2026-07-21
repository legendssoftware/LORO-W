import type { AxiosInstance } from 'axios';

export interface SalesPerStoreRow {
  storeId: string;
  storeName: string;
  countryCode?: string;
  transactionCount?: number;
  totalRevenue?: number;
  grossProfit?: number;
  grossProfitPercentage?: number;
  uniqueClients?: number;
  averageTransactionValue?: number;
}

export interface PerformanceMasterBranch {
  id: string;
  code?: string;
  name: string;
}

export interface PerformanceDashboardCharts {
  branchPerformance?: {
    data?: Array<{ store: string; totalRevenue?: number; label?: string }>;
  };
}

export interface PerformanceDashboardResponse {
  summary?: {
    totalRevenue?: number;
  };
  charts?: PerformanceDashboardCharts;
  salesPerStore?: SalesPerStoreRow[];
  masterData?: {
    branches?: PerformanceMasterBranch[];
  };
}

export interface GetPerformanceDashboardParams {
  startDate?: string;
  endDate?: string;
  allTime?: boolean;
  organisationId?: string;
  country?: string;
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

function unwrapDashboardPayload(raw: unknown): PerformanceDashboardResponse {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  if (obj.success === true && obj.data && typeof obj.data === 'object') {
    return normalizePerformanceDashboard(obj.data as PerformanceDashboardResponse);
  }
  return normalizePerformanceDashboard(raw as PerformanceDashboardResponse);
}

function normalizeSalesPerStore(raw: unknown): SalesPerStoreRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((store) => {
    const s = store as Record<string, unknown>;
    return {
      storeId: String(s.storeId ?? s.store ?? ''),
      storeName: String(s.storeName ?? s.store ?? ''),
      countryCode: s.countryCode != null ? String(s.countryCode) : undefined,
      transactionCount: Number(s.transactionCount) || 0,
      totalRevenue: Number(s.totalRevenue) || 0,
      grossProfit: Number(s.grossProfit ?? s.totalGP) || 0,
      grossProfitPercentage: Number(s.grossProfitPercentage ?? s.gpPercentage) || 0,
      uniqueClients: Number(s.uniqueClients ?? s.uniqueCustomers) || 0,
      averageTransactionValue:
        Number(s.averageTransactionValue ?? s.avgBasket) || 0,
    };
  });
}

export function normalizePerformanceDashboard(
  data: PerformanceDashboardResponse,
): PerformanceDashboardResponse {
  return {
    ...data,
    salesPerStore: normalizeSalesPerStore(data.salesPerStore),
    masterData: data.masterData
      ? {
          branches: Array.isArray(data.masterData.branches)
            ? data.masterData.branches.map((b) => ({
                id: String(b.id ?? ''),
                code: b.code != null ? String(b.code) : undefined,
                name: String(b.name ?? ''),
              }))
            : [],
        }
      : undefined,
  };
}

/**
 * GET /reports/performance/dashboard — branch-level revenue (salesPerStore).
 */
export async function getPerformanceDashboard(
  client: AxiosInstance,
  params?: GetPerformanceDashboardParams
): Promise<PerformanceDashboardResponse> {
  const search = new URLSearchParams();
  if (params?.startDate) search.set('startDate', params.startDate);
  if (params?.endDate) search.set('endDate', params.endDate);
  if (params?.allTime) search.set('allTime', 'true');
  if (params?.organisationId) search.set('organisationId', params.organisationId);
  if (params?.country) search.set('country', params.country);
  const qs = search.toString();
  const { data } = await client.get<unknown>(
    `/reports/performance/dashboard${qs ? `?${qs}` : ''}`,
    { timeout: 120_000 }
  );
  return unwrapDashboardPayload(data);
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
  const { data } = await client.get<StoreMonthlyYtdResponse | { data: StoreMonthlyYtdResponse }>(
    `/reports/performance/store-monthly-ytd${qs ? `?${qs}` : ''}`,
    { timeout: 120_000 }
  );
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data: StoreMonthlyYtdResponse }).data;
  }
  return data as StoreMonthlyYtdResponse;
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
