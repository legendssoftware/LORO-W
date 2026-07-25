import type { AxiosInstance } from 'axios';

export interface ErpUserCommissionCategoryRow {
  name: string;
  commissionPercent: number;
  totalSales: number;
  totalCommission: number;
}

export interface ErpUserProductCommissionRow {
  itemCode: string;
  itemName: string;
  unitsSold: number;
  commissionPercent: number;
  totalSales: number;
  totalCommission: number;
}

export interface ErpUserCommissionsByCategoryResponse {
  success: boolean;
  data: ErpUserCommissionCategoryRow[];
  message?: string;
  error?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  userId?: number;
  orgId?: number | string;
}

export interface ErpUserProductCommissionsResponse {
  success: boolean;
  data: ErpUserProductCommissionRow[];
  message?: string;
  error?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  userId?: number;
  orgId?: number | string;
}

/**
 * GET /erp/user/:userId/commissions-by-category — commission groups for a teammate.
 */
export async function getUserCommissionsByCategory(
  client: AxiosInstance,
  userId: number
): Promise<ErpUserCommissionsByCategoryResponse> {
  const { data } = await client.get<ErpUserCommissionsByCategoryResponse>(
    `/erp/user/${userId}/commissions-by-category`
  );
  return data;
}

/**
 * GET /erp/user/:userId/commissions — per-product sales + commission for a teammate.
 */
export async function getUserProductCommissions(
  client: AxiosInstance,
  userId: number
): Promise<ErpUserProductCommissionsResponse> {
  const { data } = await client.get<ErpUserProductCommissionsResponse>(
    `/erp/user/${userId}/commissions`
  );
  return data;
}
