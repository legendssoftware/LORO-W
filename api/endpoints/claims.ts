import type { AxiosInstance } from 'axios';
import type { ClaimsListResponse } from '@/api/types/reports';

export interface GetClaimsParams {
  page?: number;
  limit?: number;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
}

/**
 * GET /claims - list claims with optional filters.
 * Date params (createdFrom, createdTo) applied when backend supports them.
 */
export async function getClaims(
  client: AxiosInstance,
  params: GetClaimsParams = {}
): Promise<ClaimsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.createdFrom) search.set('createdFrom', params.createdFrom);
  if (params.createdTo) search.set('createdTo', params.createdTo);
  const qs = search.toString();
  const { data } = await client.get<ClaimsListResponse>(`/claims${qs ? `?${qs}` : ''}`);
  return data;
}
