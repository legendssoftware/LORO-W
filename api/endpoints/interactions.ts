import type { AxiosInstance } from 'axios';
import type { InteractionsListResponse } from '@/api/types/reports';

export interface GetInteractionsParams {
  page?: number;
  limit?: number;
  createdFrom?: string;
  createdTo?: string;
  type?: string;
}

/**
 * GET /interactions - list interactions with optional date range.
 */
export async function getInteractions(
  client: AxiosInstance,
  params: GetInteractionsParams = {}
): Promise<InteractionsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.createdFrom) search.set('startDate', params.createdFrom);
  if (params.createdTo) search.set('endDate', params.createdTo);
  if (params.type) search.set('type', params.type);
  const qs = search.toString();
  const { data } = await client.get<InteractionsListResponse>(
    `/interactions${qs ? `?${qs}` : ''}`
  );
  return data;
}
