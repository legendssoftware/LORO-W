import type { AxiosInstance } from 'axios';

/** ERP aggregation for the logged-in user (matches mobile ProfileSalesData). */
export interface ProfileSalesData {
  totalRevenue: number;
  transactionCount: number;
  uniqueCustomers: number;
  salesCode: string;
  salesName: string;
}

/** Server response for GET /erp/profile/sales */
export interface ProfileSalesApiResponse {
  success: boolean;
  data: ProfileSalesData | null;
  message?: string;
  error?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  userId?: number | number[];
  orgId?: number;
}

export type ProfileSalesResult = (ProfileSalesData & {
  periodStartDate?: string;
  periodEndDate?: string;
}) | null;

/**
 * GET /erp/profile/sales — revenue for the user's target period / rep code (same as APK).
 */
export async function getProfileSales(client: AxiosInstance): Promise<ProfileSalesApiResponse> {
  const { data } = await client.get<ProfileSalesApiResponse>('/erp/profile/sales');
  return data;
}
