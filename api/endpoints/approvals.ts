import type { AxiosInstance } from 'axios';
import type { ApprovalsListResponse } from '@/api/types/reports';

export interface GetApprovalsParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  createdFrom?: string;
  createdTo?: string;
}

/**
 * GET /approvals - list approvals with date range and filters.
 */
export async function getApprovals(
  client: AxiosInstance,
  params: GetApprovalsParams = {}
): Promise<ApprovalsListResponse> {
  const search = new URLSearchParams();
  if (params.page != null) search.set('page', String(params.page));
  if (params.limit != null) search.set('limit', String(params.limit));
  if (params.status) search.set('status', params.status);
  if (params.type) search.set('type', params.type);
  if (params.createdFrom) search.set('createdFrom', params.createdFrom);
  if (params.createdTo) search.set('createdTo', params.createdTo);
  const qs = search.toString();
  const { data } = await client.get<ApprovalsListResponse>(
    `/approvals${qs ? `?${qs}` : ''}`
  );
  return data;
}
