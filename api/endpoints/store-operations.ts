import type { AxiosInstance } from 'axios';
import type {
  StockTakeManagement,
  StockTakeManagementQuery,
  StoreOperationsDashboard,
  StoreOperationsDashboardQuery,
} from '@/api/types/store-operations';

/**
 * GET /store-operations/dashboard — elevated roles only.
 * @param client Authenticated axios instance
 * @param query Date, country, and region filters
 */
export async function getStoreOperationsDashboard(
  client: AxiosInstance,
  query: StoreOperationsDashboardQuery = {},
): Promise<StoreOperationsDashboard> {
  const { data } = await client.get<StoreOperationsDashboard>('/store-operations/dashboard', {
    params: {
      ...(query.date ? { date: query.date } : {}),
      ...(query.country ? { country: query.country } : {}),
      ...(query.region ? { region: query.region } : {}),
    },
  });
  return data;
}

/**
 * GET /store-operations/stock-take/management — elevated roles only. Read-only.
 * @param client Authenticated axios instance
 * @param query Date and optional cycle
 */
export async function getStockTakeManagement(
  client: AxiosInstance,
  query: StockTakeManagementQuery = {},
): Promise<StockTakeManagement> {
  const { data } = await client.get<StockTakeManagement>('/store-operations/stock-take/management', {
    params: {
      ...(query.date ? { date: query.date } : {}),
      ...(query.cycle ? { cycle: query.cycle } : {}),
    },
  });
  return data;
}
