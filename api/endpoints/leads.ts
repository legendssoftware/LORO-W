import type { AxiosInstance } from 'axios';
import type { LeadsListResponse } from '@/api/types/reports';

export interface GetLeadsParams {
  page?: number;
  limit?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  temperature?: string;
  source?: string;
  search?: string;
}

/**
 * GET /leads - list leads with date range and filters.
 */
export async function getLeads(
  client: AxiosInstance,
  params: GetLeadsParams = {}
): Promise<LeadsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  if (params.temperature) search.set('temperature', params.temperature);
  if (params.source) search.set('source', params.source);
  if (params.search) search.set('search', params.search);
  const qs = search.toString();
  const { data } = await client.get<LeadsListResponse>(`/leads${qs ? `?${qs}` : ''}`);
  return data;
}
