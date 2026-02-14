import type { AxiosInstance } from 'axios';
import type { CheckInsListResponse } from '@/api/types/reports';

export interface GetCheckInsParams {
  userUid?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * GET /check-ins - list check-ins with optional user and date range.
 */
export async function getCheckIns(
  client: AxiosInstance,
  params: GetCheckInsParams = {}
): Promise<CheckInsListResponse> {
  const search = new URLSearchParams();
  if (params.userUid) search.set('userUid', params.userUid);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  const qs = search.toString();
  const { data } = await client.get<CheckInsListResponse>(
    `/check-ins${qs ? `?${qs}` : ''}`
  );
  return data;
}
