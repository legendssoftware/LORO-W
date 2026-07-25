import type { AxiosInstance } from 'axios';
import type { ProfileSalesApiResponse, ProfileSalesResult } from './erp-profile-sales';

/**
 * GET /erp/user/:userId/sales — Pastel turnover for a teammate / staff member
 * (same aggregation as GET /erp/profile/sales, for that user's target period).
 */
export async function getUserSales(
  client: AxiosInstance,
  userId: number
): Promise<ProfileSalesApiResponse> {
  const { data } = await client.get<ProfileSalesApiResponse>(`/erp/user/${userId}/sales`);
  return data;
}

/** Normalize envelope → revenue payload (or null when not configured / empty). */
export function profileSalesFromResponse(
  res: ProfileSalesApiResponse
): ProfileSalesResult {
  if (!res.success || res.data == null) return null;
  return {
    ...res.data,
    periodStartDate: res.periodStartDate,
    periodEndDate: res.periodEndDate,
  };
}
