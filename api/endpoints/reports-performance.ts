import type { AxiosInstance } from 'axios';
import type {
  ConsolidatedIncomeStatementData,
  PerformanceApiResponse,
  PerformanceDashboardData,
  PerformanceFilters,
  PerformanceMasterData,
  StoreMonthlyYtdResponse,
} from '@/api/types/reports-performance';
import { resolveDashboardDateRange } from '@/app/performance/lib/dates';
import {
  normalizeDashboardData,
  normalizeMasterData,
  unwrapPerformanceResponse,
} from '@/app/performance/lib/normalize';

const DASHBOARD_TIMEOUT_MS = 120_000;
const FILTERS_TIMEOUT_MS = 60_000;
const YTD_TIMEOUT_MS = 300_000;

export function buildPerformanceFilterParams(
  filters: PerformanceFilters,
  options?: { skipCache?: boolean; organisationId?: string; chartStoreId?: string }
): Record<string, string | number | undefined> {
  const { startDate, endDate } = resolveDashboardDateRange(filters);
  return {
    startDate,
    endDate,
    countries: filters.countries?.length ? filters.countries.join(',') : undefined,
    branchIds: filters.branchIds?.join(','),
    salesPersonIds: filters.salesPersonIds?.join(','),
    paymentMethodIds: filters.paymentMethodIds?.join(','),
    category: filters.product?.category,
    productIds: filters.product?.productIds?.join(','),
    minPrice: filters.priceRange?.min,
    maxPrice: filters.priceRange?.max,
    county: filters.location?.county,
    province: filters.location?.province,
    city: filters.location?.city,
    suburb: filters.location?.suburb,
    includeCustomerCategories: filters.includeCustomerCategories?.join(','),
    excludeCustomerCategories: filters.excludeCustomerCategories?.join(','),
    skipCache: options?.skipCache ? 'true' : undefined,
    organisationId: options?.organisationId,
    chartStoreId: options?.chartStoreId,
  };
}

export async function getPerformanceDashboard(
  client: AxiosInstance,
  filters: PerformanceFilters,
  options?: { skipCache?: boolean; organisationId?: string; signal?: AbortSignal }
): Promise<PerformanceDashboardData> {
  const { data } = await client.get<PerformanceApiResponse<Record<string, unknown>>>(
    '/reports/performance/dashboard',
    {
      params: buildPerformanceFilterParams(filters, {
        skipCache: options?.skipCache,
        organisationId: options?.organisationId,
      }),
      timeout: DASHBOARD_TIMEOUT_MS,
      signal: options?.signal,
    }
  );
  return normalizeDashboardData(unwrapPerformanceResponse(data));
}

export async function getPerformanceFilterMasterData(
  client: AxiosInstance,
  filters: PerformanceFilters,
  options?: { skipCache?: boolean; organisationId?: string }
): Promise<PerformanceMasterData> {
  const { data } = await client.get<PerformanceApiResponse<unknown>>(
    '/reports/performance/filters',
    {
      params: buildPerformanceFilterParams(filters, {
        skipCache: options?.skipCache,
        organisationId: options?.organisationId,
      }),
      timeout: FILTERS_TIMEOUT_MS,
    }
  );
  const master = normalizeMasterData(unwrapPerformanceResponse(data));
  if (!master) throw new Error('Failed to load performance filter master data');
  return master;
}

export async function getPerformanceStoreMonthlyYtd(
  client: AxiosInstance,
  filters: PerformanceFilters,
  options?: { chartStoreId?: string; organisationId?: string }
): Promise<StoreMonthlyYtdResponse> {
  const { data } = await client.get<PerformanceApiResponse<StoreMonthlyYtdResponse>>(
    '/reports/performance/store-monthly-ytd',
    {
      params: {
        ...buildPerformanceFilterParams(filters, {
          organisationId: options?.organisationId,
          chartStoreId: options?.chartStoreId,
        }),
        startDate: undefined,
        endDate: undefined,
      },
      timeout: YTD_TIMEOUT_MS,
    }
  );
  return unwrapPerformanceResponse(data);
}

export async function getConsolidatedIncomeStatement(
  client: AxiosInstance,
  filters: PerformanceFilters,
  options?: { organisationId?: string }
): Promise<ConsolidatedIncomeStatementData> {
  const { data } = await client.get<PerformanceApiResponse<ConsolidatedIncomeStatementData>>(
    '/reports/performance/consolidated-income-statement',
    {
      params: buildPerformanceFilterParams(filters, {
        organisationId: options?.organisationId,
      }),
      timeout: DASHBOARD_TIMEOUT_MS,
    }
  );
  return unwrapPerformanceResponse(data);
}
