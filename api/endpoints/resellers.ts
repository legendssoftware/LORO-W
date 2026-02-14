import type { AxiosInstance } from 'axios';
import type { ResellersListResponse } from '@/api/types/reports';

export interface GetResellersParams {
  page?: number;
  limit?: number;
  search?: string;
}

/**
 * GET /resellers - list resellers.
 */
export async function getResellers(
  client: AxiosInstance,
  params: GetResellersParams = {}
): Promise<ResellersListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  const { data } = await client.get<ResellersListResponse>(
    `/resellers${qs ? `?${qs}` : ''}`
  );
  return data;
}
