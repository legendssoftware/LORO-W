import type { AxiosInstance } from 'axios';
import type { PayslipsListResponse } from '@/api/types/reports';

export interface GetPayslipsParams {
  page?: number;
  limit?: number;
  periodFrom?: string;
  periodTo?: string;
}

/**
 * GET /payslips - list payslips with optional filters.
 */
export async function getPayslips(
  client: AxiosInstance,
  params: GetPayslipsParams = {}
): Promise<PayslipsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.periodFrom) search.set('periodFrom', params.periodFrom);
  if (params.periodTo) search.set('periodTo', params.periodTo);
  const qs = search.toString();
  const { data } = await client.get<PayslipsListResponse>(
    `/payslips${qs ? `?${qs}` : ''}`
  );
  return data;
}
