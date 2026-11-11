import type { AxiosInstance } from 'axios';
import type {
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
