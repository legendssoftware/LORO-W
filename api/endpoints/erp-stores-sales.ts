import type { AxiosInstance } from 'axios';
import type { MasterBranchRow, SalesPerStoreRow } from '@/lib/utils/sales-per-store-match';

export interface StoreSalesRow extends SalesPerStoreRow {
  transactionCount?: number;
  uniqueCustomers?: number;
}

export interface StoresSalesApiResponse {
  success: boolean;
  startDate: string;
  endDate: string;
  salesPerStore: StoreSalesRow[];
  masterData?: {
    branches?: MasterBranchRow[];
  };
  errors?: Array<{ countryCode: string; message: string }>;
  orgId?: string;
  error?: string;
}

export interface GetStoresSalesParams {
  startDate?: string;
  endDate?: string;
  /** Comma-separated codes or ALL. Defaults to ALL for multi-country branches. */
  countries?: string;
}

/**
 * GET /erp/stores/sales — per-store Pastel revenue for simulation actuals.
 */
export async function getStoresSales(
  client: AxiosInstance,
  params?: GetStoresSalesParams,
): Promise<StoresSalesApiResponse> {
  const { data } = await client.get<StoresSalesApiResponse>('/erp/stores/sales', {
    params: {
      startDate: params?.startDate,
      endDate: params?.endDate,
      countries: params?.countries ?? 'ALL',
    },
  });
  return data;
}
